"use client";
import React, { useState, useEffect } from "react";

// Refactorizat: logica pentru produse folosește doar array de obiecte simple
const InvoiceForm = () => {
  const [clientType, setClientType] = useState<'fizica' | 'companie'>('fizica');
  const [defaultTva, setDefaultTva] = useState(19);
  const [invoice, setInvoice] = useState<any>({
    client: {},
    products: [],
    notes: "",
    paymentMethod: "",
    deliveryType: "",
    courierCost: 0,
    orderNumber: "",
    orderDate: new Date().toISOString().slice(0, 10),
    tva: 19,
  });

  // Încarcă TVA configurat din admin
  useEffect(() => {
    fetch('/admin/api/pagini?pagina=cos')
      .then(res => res.json())
      .then(data => {
        if (data && data.tva !== undefined) {
          const tvaVal = Number(data.tva);
          setDefaultTva(tvaVal);
          setInvoice((prev: any) => ({ ...prev, tva: tvaVal }));
        }
      })
      .catch(() => {});
  }, []);

  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const isStockError = saveMsg && saveMsg.toLowerCase().includes("stoc insuficient");
  const [newProduct, setNewProduct] = useState<any>({ name: '', quantity: 1, price: 0, discountPrice: undefined, discountPercent: undefined, weight: undefined, deliveryTerm: '' });
  const [editIdx, setEditIdx] = useState<number|null>(null);
  const [editProduct, setEditProduct] = useState<any|null>(null);
  const handleProductChange = (field: string, value: any) => {
    setNewProduct((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleAddProduct = () => {
    if (!newProduct.name || !newProduct.quantity || !newProduct.price) return;
    setInvoice((prev: any) => ({ ...prev, products: [...prev.products, { ...newProduct }] }));
    setNewProduct({ name: '', quantity: 1, price: 0, discountPrice: undefined, discountPercent: undefined, weight: undefined, deliveryTerm: '' });
  };

  const handleEditClick = (idx: number) => {
    setEditIdx(idx);
    setEditProduct({ ...invoice.products[idx] });
  };

  const handleEditChange = (field: string, value: any) => {
    setEditProduct((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleEditSave = (idx: number) => {
    if (!editProduct) return;
    setInvoice((prev: any) => ({
      ...prev,
      products: prev.products.map((p: any, i: number) => i === idx ? { ...editProduct } : p)
    }));
    setEditIdx(null);
    setEditProduct(null);
  };

  const handleDeleteProduct = (idx: number) => {
    setInvoice((prev: any) => ({ ...prev, products: prev.products.filter((_: any, i: number) => i !== idx) }));
  };

  const handleChange = (section: string, field: string, value: any) => {
    setInvoice((prev: any) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
  };

  const handleGeneratePDF = async () => {
      console.log('Invoice pentru PDF:', invoice);
    setSaveMsg("");
    try {
      // Mapping produse cu discount corect pentru PDF
      const mappedProducts = invoice.products.map((prod: any) => {
        let discount = 0;
        let discountType = '';
        let discountPercent = undefined;
        if (typeof prod.discountPercent === 'number' && prod.discountPercent > 0) {
          discountPercent = prod.discountPercent;
          discount = prod.discountPercent;
          discountType = 'percent';
        } else if (typeof prod.discountPrice === 'number' && prod.discountPrice < prod.price) {
          discount = prod.price - prod.discountPrice;
          discountType = 'fixed';
        }
        return {
          name: prod.name,
          quantity: prod.quantity,
          price: prod.price,
          discount,
          discountType,
          discountPercent,
          weight: prod.weight,
          deliveryTerm: prod.deliveryTerm,
          tva: typeof invoice.tva === 'number' && !isNaN(invoice.tva) ? invoice.tva : defaultTva,
          deliveryType: invoice.deliveryType,
        };
      });
      const courierCostFinal = typeof invoice.courierCost === 'number' && !isNaN(invoice.courierCost) ? invoice.courierCost : 0;
      const paymentMethodFinal = invoice.paymentMethod && invoice.paymentMethod !== '' ? invoice.paymentMethod : '-';
      const res = await fetch("/api/generate-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: {
          client: invoice.client,
          products: mappedProducts,
          notes: invoice.notes,
          id: invoice.orderNumber,
          number: invoice.orderNumber,
          date: invoice.orderDate,
          courierCost: courierCostFinal,
          paymentMethod: paymentMethodFinal,
          deliveryType: invoice.deliveryType,
          tva: invoice.tva,
        } }),
      });
      if (!res.ok) {
        setSaveMsg("Eroare la generarea PDF-ului");
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      // Eliminat referință comanda manuală
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
      setSaveMsg("PDF generat cu succes!");
    } catch (err: any) {
      setSaveMsg("Eroare la generarea PDF-ului: " + err.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveMsg("");
    let finished = false;
    console.log('Submit comandă:', { client: invoice.client, products: invoice.products, totalCuTVA });
    // Validare câmpuri obligatorii
    // ... aici logica de submit, fără JSX ...
    try {
      const paymentMethodToSend = invoice.paymentMethod || "Transfer bancar";
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userEmail: invoice.client.email,
          items: invoice.products,
          total: totalCuTVA,
          // Eliminat status manual_comanda
          courierCost: invoice.courierCost ?? 0,
          paymentMethod: paymentMethodToSend,
          deliveryType: invoice.deliveryType || "standard"
        }),
        signal: controller.signal
      });
      clearTimeout(timeout);
      const data = await res.json();
      console.log('Răspuns API /api/orders:', data);
      if (data.success) {
        setSaveMsg("Comanda a fost salvată cu succes!");
        if (invoice.paymentMethod === "card online") {
          setTimeout(() => {
            const orderId = data.order?.id ?? '';
            const amount = totalCuTVA.toFixed(2);
            const email = invoice.client.email || '';
            // Salvează datele comenzii în localStorage pentru plata-card
            if (typeof window !== "undefined" && orderId) {
              window.localStorage.setItem(`order_${orderId}`,
                JSON.stringify({
                  orderId,
                  amount,
                  email,
                  items: invoice.products,
                  client: invoice.client,
                  paymentMethod: invoice.paymentMethod,
                  deliveryType: invoice.deliveryType,
                  courierCost: invoice.courierCost
                })
              );
            }
            window.location.href = `/plata-card?orderId=${orderId}&amount=${amount}&email=${encodeURIComponent(email)}`;
          }, 1200);
        } else {
          setTimeout(() => {
            // Eliminat redirect către lista comenzi manuale
          }, 1200);
        }
      } else {
        setSaveMsg("Eroare la salvare: " + (data.error || "necunoscută"));
      }
    } catch (err: any) {
      setSaveMsg("Eroare la salvare: " + err.message);
      console.log('Eroare la submit:', err);
    }
    setSaving(false);
  };

  // --- SUMAR COȘ ---
  // Subtotal preț de vânzare
  const subtotalPretVanzare = invoice.products.reduce((acc: number, prod: any) => acc + (prod.price ?? 0) * (prod.quantity ?? 1), 0);
  // Subtotal după reduceri
  const subtotalDupaReduceri = invoice.products.reduce((acc: number, prod: any) => {
    const pretDiscount = prod.discountPrice !== undefined ? prod.discountPrice : prod.price;
    return acc + (pretDiscount ?? 0) * (prod.quantity ?? 1);
  }, 0);
  // Reducere totală pe produse
  const reducereTotala = subtotalPretVanzare - subtotalDupaReduceri;
  // Cost curier
  const costCurier = invoice.courierCost ?? 0;
  // Metodă de plată
  const metodaPlata = invoice.paymentMethod || "Transfer bancar";
  // Total fără TVA
  const totalFaraTVA = subtotalDupaReduceri + costCurier;
  // TVA din formular (default din admin)
  const tvaPercent = invoice.tva ?? defaultTva;
  const tva = Math.round(totalFaraTVA * tvaPercent / 100 * 100) / 100;
  // Total cu TVA
  const totalCuTVA = Math.round((totalFaraTVA + tva) * 100) / 100;

  return (
    <>
      <h1 className="text-3xl font-bold mb-6">Formular comandă</h1>
      <div className="mb-4 flex gap-8">
        <div>
          <label className="block text-sm font-semibold mb-1">Număr comandă</label>
          <input className="input" type="text" value={invoice.orderNumber} onChange={e => setInvoice((prev: any) => ({ ...prev, orderNumber: e.target.value }))} placeholder="Număr comandă" />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1">Data comandă</label>
          <input className="input" type="date" value={invoice.orderDate} onChange={e => setInvoice((prev: any) => ({ ...prev, orderDate: e.target.value }))} />
        </div>
      </div>
      <form onSubmit={handleSubmit}>
        {/* DATE FURNIZOR & CLIENT ÎN GRID */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Furnizor stânga */}
          <div className="p-4 bg-gray-50 rounded border border-gray-200">
            <div className="mb-2 font-bold text-lg">Date furnizor</div>
            <input className="input mb-2" placeholder="Nume furnizor" value={invoice.supplier?.name || ''} onChange={e => setInvoice((prev: any) => ({ ...prev, supplier: { ...prev.supplier, name: e.target.value } }))} />
            <input className="input mb-2" placeholder="CUI" value={invoice.supplier?.cui || ''} onChange={e => setInvoice((prev: any) => ({ ...prev, supplier: { ...prev.supplier, cui: e.target.value } }))} />
            <input className="input mb-2" placeholder="Nr. Reg. Comerț" value={invoice.supplier?.reg || ''} onChange={e => setInvoice((prev: any) => ({ ...prev, supplier: { ...prev.supplier, reg: e.target.value } }))} />
            <input className="input mb-2" placeholder="Adresă" value={invoice.supplier?.address || ''} onChange={e => setInvoice((prev: any) => ({ ...prev, supplier: { ...prev.supplier, address: e.target.value } }))} />
            <input className="input mb-2" placeholder="Cod poștal" value={invoice.supplier?.postalCode || ''} onChange={e => setInvoice((prev: any) => ({ ...prev, supplier: { ...prev.supplier, postalCode: e.target.value } }))} />
            <input className="input mb-2" placeholder="Cont IBAN" value={invoice.supplier?.iban || ''} onChange={e => setInvoice((prev: any) => ({ ...prev, supplier: { ...prev.supplier, iban: e.target.value } }))} />
            <input className="input mb-2" placeholder="Banca" value={invoice.supplier?.bank || ''} onChange={e => setInvoice((prev: any) => ({ ...prev, supplier: { ...prev.supplier, bank: e.target.value } }))} />
            <input className="input mb-2" placeholder="Telefon" value={invoice.supplier?.phone || ''} onChange={e => setInvoice((prev: any) => ({ ...prev, supplier: { ...prev.supplier, phone: e.target.value } }))} />
            <input className="input mb-2" placeholder="Email" value={invoice.supplier?.email || ''} onChange={e => setInvoice((prev: any) => ({ ...prev, supplier: { ...prev.supplier, email: e.target.value } }))} />
          </div>
          {/* Client dreapta */}
          <div className="p-4 bg-gray-50 rounded border border-gray-200">
            <div className="mb-2 font-bold text-lg">Date client</div>
            <div className="flex gap-6 mb-4">
              <label className="flex items-center gap-2">
                <input type="radio" name="clientType" value="fizica" checked={clientType === 'fizica'} onChange={() => setClientType('fizica')} />
                Persoană fizică
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="clientType" value="companie" checked={clientType === 'companie'} onChange={() => setClientType('companie')} />
                Companie
              </label>
            </div>
            <input className="input mb-2" placeholder="Nume" value={invoice.client.name || ''} onChange={e => handleChange('client', 'name', e.target.value)} />
            <input className="input mb-2" placeholder="CUI" value={invoice.client.cui || ''} onChange={e => handleChange('client', 'cui', e.target.value)} />
            <input className="input mb-2" placeholder="Nr. Reg. Comerț" value={invoice.client.reg || ''} onChange={e => handleChange('client', 'reg', e.target.value)} />
            <input className="input mb-2" placeholder="Cont IBAN" value={invoice.client.iban || ''} onChange={e => handleChange('client', 'iban', e.target.value)} />
            <input className="input mb-2" placeholder="Banca" value={invoice.client.bank || ''} onChange={e => handleChange('client', 'bank', e.target.value)} />
            <input className="input mb-2" placeholder="Adresă" value={invoice.client.address || ''} onChange={e => handleChange('client', 'address', e.target.value)} />
            <input className="input mb-2" placeholder="Cod poștal" value={invoice.client.postalCode || ''} onChange={e => handleChange('client', 'postalCode', e.target.value)} />
            <input className="input mb-2" placeholder="Telefon" value={invoice.client.phone || ''} onChange={e => handleChange('client', 'phone', e.target.value)} />
            <input className="input mb-2" placeholder="Email" value={invoice.client.email || ''} onChange={e => handleChange('client', 'email', e.target.value)} />
          </div>
        </div>
      {/* Produse/Servicii */}
      <div className="mb-6">
        <table className="w-full border rounded mb-2">
          <thead className="bg-gray-100">
            <tr>
              <th>Nr. crt.</th>
              <th>Produs</th>
              <th>Cantitate</th>
              <th>Preț de vânzare</th>
              <th>Preț cu discount</th>
              <th>Discount aplicat</th>
              <th>Subtotal</th>
              <th>Greutate (kg)</th>
              <th>Termen livrare</th>
              <th>Opțiuni</th>
            </tr>
          </thead>
          <tbody>
            {invoice.products.map((prod: any, idx: number) => (
              <tr key={prod.id || idx}>
                <td>{idx + 1}</td>
                {editIdx === idx ? (
                  <>
                    <td><input className="input" value={editProduct?.name ?? ''} onChange={e => handleEditChange('name', e.target.value)} /></td>
                    <td><input className="input" type="number" min={1} value={editProduct?.quantity ?? 1} onChange={e => handleEditChange('quantity', Number(e.target.value))} /></td>
                    <td><input className="input" type="number" min={0} step="0.01" value={editProduct?.price ?? 0} onChange={e => handleEditChange('price', Number(e.target.value))} /></td>
                    <td><input className="input" type="number" min={0} step="0.01" value={editProduct?.discountPrice ?? ''} onChange={e => handleEditChange('discountPrice', e.target.value ? Number(e.target.value) : undefined)} /></td>
                    <td><input className="input" type="number" min={0} max={100} step="0.01" value={editProduct?.discountPercent ?? ''} onChange={e => handleEditChange('discountPercent', e.target.value ? Number(e.target.value) : undefined)} /></td>
                    <td>{editProduct?.subtotal ?? (editProduct?.price ?? 0) * (editProduct?.quantity ?? 1)}</td>
                    <td><input className="input" type="number" min={0} step="0.01" value={editProduct?.weight ?? ''} onChange={e => handleEditChange('weight', e.target.value ? Number(e.target.value) : undefined)} /></td>
                    <td><input className="input" value={editProduct?.deliveryTerm ?? ''} onChange={e => handleEditChange('deliveryTerm', e.target.value)} /></td>
                    <td>
                      <button type="button" className="px-2 py-1 bg-green-600 text-white rounded mr-2" onClick={() => handleEditSave(idx)}>Salvează</button>
                      <button type="button" className="px-2 py-1 bg-gray-400 text-white rounded" onClick={() => { setEditIdx(null); setEditProduct(null); }}>Anulează</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td>{prod.name}</td>
                    <td>{prod.quantity}</td>
                    <td>{prod.price}</td>
                    <td>{prod.discountPrice ?? '-'}</td>
                    <td>{prod.discountPercent ?? '-'}</td>
                    <td>{((prod.discountPrice !== undefined ? prod.discountPrice : prod.price) * prod.quantity).toFixed(2)}</td>
                    <td>{prod.weight ?? '-'}</td>
                    <td>{prod.deliveryTerm ?? '-'}</td>
                    <td>
                      <button type="button" className="px-4 py-2 bg-yellow-500 text-white font-bold rounded shadow mr-3 flex items-center gap-2" onClick={() => handleEditClick(idx)}>
                        <span>✏️</span> Editează
                      </button>
                      <button type="button" className="px-4 py-2 bg-red-600 text-white font-bold rounded shadow flex items-center gap-2" onClick={() => handleDeleteProduct(idx)}>
                        <span>🗑️</span> Șterge
                      </button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* SUMAR COȘ */}
      {/* SUMAR COȘ + CARD EDITABIL */}
      <div className="mb-8 mt-2 flex flex-row gap-8 justify-end">
        {/* Card editabil stânga */}
        <div className="p-4 bg-gray-50 rounded shadow max-w-xs w-full" style={{border: "1px solid #e5e7eb", minWidth: '240px'}}>
          <div className="mb-2 font-bold">Setări comandă</div>
          <div className="mb-3">
            <label className="block mb-1 font-semibold">Cost curier</label>
            <input className="input" type="number" min={0} step="0.01" value={invoice.courierCost ?? ''} onChange={e => setInvoice((prev: any) => ({...prev, courierCost: Number(e.target.value)}))} />
          </div>
          <div className="mb-3">
            <label className="block mb-1 font-semibold">Tip curier</label>
            <select className="input" value={invoice.deliveryType || ''} onChange={e => setInvoice((prev: any) => ({...prev, deliveryType: e.target.value}))}>
              <option value="standard">Standard</option>
              <option value="rapid">Rapid</option>
              <option value="">Fără curier</option>
            </select>
          </div>
          <div className="mb-3">
            <label className="block mb-1 font-semibold">Metodă de plată</label>
            <select className="input" value={invoice.paymentMethod || ''} onChange={e => setInvoice((prev: any) => ({...prev, paymentMethod: e.target.value}))}>
              <option value="transfer bancar">Transfer bancar</option>
              <option value="card online">Card online</option>
              <option value="ramburs la curier">Ramburs la curier</option>
              <option value="plata in rate">Plata în rate</option>
            </select>
          </div>
          <div className="mb-3">
            <label className="block mb-1 font-semibold">TVA (%)</label>
            <input
              className="input"
              type="number"
              min={0}
              max={100}
              step="0.01"
              value={typeof invoice.tva === 'number' && !isNaN(invoice.tva) ? invoice.tva : defaultTva}
              onChange={e => {
                const val = Number(e.target.value);
                setInvoice((prev: any) => ({
                  ...prev,
                  tva: !isNaN(val) && val > 0 ? val : defaultTva
                }));
              }}
            />
          </div>
        </div>
        {/* Sumar comandă dreapta */}
        <div className="p-4 bg-white rounded shadow max-w-xl w-full" style={{border: "1px solid #e5e7eb", minWidth: '320px'}}>
          <div className="mb-1 font-bold">Sumar comandă</div>
          <div className="grid grid-cols-1 gap-1 text-base">
            <div><span className="font-semibold">Subtotal preț de vânzare:</span> <span>{subtotalPretVanzare.toFixed(2)} lei</span></div>
            <div className="text-green-700"><span className="font-semibold">Subtotal după reduceri:</span> <span>{subtotalDupaReduceri.toFixed(2)} lei</span></div>
            <div className="text-green-700"><span className="font-semibold">Reducere totală pe produse:</span> <span>-{reducereTotala.toFixed(2)} lei</span></div>
            <div><span className="font-semibold">Cost curier:</span> <span>{costCurier.toFixed(2)} lei {costCurier === 0 ? "(gratuit)" : ""} {invoice.deliveryType ? `(${invoice.deliveryType === 'standard' ? 'Standard' : invoice.deliveryType === 'rapid' ? 'Rapid' : 'Fără curier'})` : ''}</span></div>
            <div><span className="font-semibold">Metodă de plată:</span> <span>{metodaPlata}</span></div>
            <div className="text-blue-700"><span className="font-semibold">Total fără TVA:</span> <span>{totalFaraTVA.toFixed(2)} lei</span></div>
            <div className="text-blue-700"><span className="font-semibold">TVA ({invoice.tva ?? defaultTva}%):</span> <span>{tva.toFixed(2)} lei</span></div>
            <div className="text-black text-xl font-bold mt-2"><span>Total de plată (cu TVA):</span> <span>{totalCuTVA.toFixed(2)} lei</span></div>
          </div>
        </div>
      </div>
      {/* Formular adăugare produs */}
      <div className="mb-6 p-4 bg-gray-50 rounded">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-2">
          <div>
            <label className="block mb-1 font-semibold">Denumire produs</label>
            <input className="input" value={newProduct.name} onChange={e => handleProductChange('name', e.target.value)} />
          </div>
          <div>
            <label className="block mb-1 font-semibold">Cantitate</label>
            <input className="input" type="number" min={1} value={newProduct.quantity} onChange={e => handleProductChange('quantity', Number(e.target.value))} />
          </div>
          <div>
            <label className="block mb-1 font-semibold">Preț vânzare</label>
            <input className="input" type="number" min={0} step="0.01" value={newProduct.price} onChange={e => handleProductChange('price', Number(e.target.value))} />
          </div>
          <div>
            <label className="block mb-1 font-semibold">Preț cu discount</label>
            <input className="input" type="number" min={0} step="0.01" value={newProduct.discountPrice ?? ''} onChange={e => handleProductChange('discountPrice', e.target.value ? Number(e.target.value) : undefined)} />
          </div>
          <div>
            <label className="block mb-1 font-semibold">Discount (%)</label>
            <input className="input" type="number" min={0} max={100} step="0.01" value={newProduct.discountPercent ?? ''} onChange={e => handleProductChange('discountPercent', e.target.value ? Number(e.target.value) : undefined)} />
          </div>
          <div>
            <label className="block mb-1 font-semibold">Greutate (kg)</label>
            <input className="input" type="number" min={0} step="0.01" value={newProduct.weight ?? ''} onChange={e => handleProductChange('weight', e.target.value ? Number(e.target.value) : undefined)} />
          </div>
          <div>
            <label className="block mb-1 font-semibold">Termen livrare</label>
            <input className="input" value={newProduct.deliveryTerm} onChange={e => handleProductChange('deliveryTerm', e.target.value)} />
          </div>
        </div>
        <button type="button" className="px-4 py-2 bg-blue-600 text-white rounded" onClick={handleAddProduct}>Adaugă produs</button>
      </div>
      {/* Observații */}
      <div className="mb-6">
        <label>Observații</label>
        <textarea className="input w-full" value={invoice.notes} onChange={e => setInvoice((v: any) => ({...v, notes: e.target.value}))} />
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded" disabled={saving}>{saving ? "Se salvează..." : "Salvează"}</button>
        <button type="button" className="px-4 py-2 bg-blue-600 text-white rounded" onClick={handleGeneratePDF}>Generează PDF</button>
      </div>
      <div className="mt-6 text-center">
        {/* Eliminat link către lista comenzi manuale */}
      </div>
      {saveMsg && (
        <div className={`mt-2 text-center text-sm ${isStockError ? 'bg-red-100 text-red-700 border border-red-300 rounded px-4 py-2' : 'text-green-700'}`}>
          {saveMsg}
        </div>
      )}
      <style jsx>{`
        .input {
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          padding: 0.5rem;
          width: 100%;
          font-size: 1rem;
        }
        label {
          display: block;
          font-size: 0.95rem;
          color: #374151;
          margin-bottom: 0.1rem;
        }
        th, td {
          padding: 0.4rem 0.5rem;
          text-align: left;
        }
      `}</style>
    </form>
    </>
  );
};

export default InvoiceForm;
