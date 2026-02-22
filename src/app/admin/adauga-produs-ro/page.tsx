"use client";
import React, { useState, useEffect } from "react";
import Toast from "@/components/Toast";
import Link from "next/link";

interface Product {
  id: number;
  name: string;
  productCode: string;
  price: number;
  listPrice?: number;
  purchasePrice?: number;
  manufacturer?: string;
  stock: number;
  onDemand?: boolean;
  image?: string;
  type?: string;
  domain?: string;
  currency?: string;
  discount?: number;
  discountType?: string;
  description?: string;
  specs?: string[];
  advantages?: string[];
  pdfUrl?: string;
  safetySheetUrl?: string;
  deliveryTime?: string;
}

export default function AdaugaProdusRO() {
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [loading, setLoading] = useState(false);
  const [formErr, setFormErr] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [uploading, setUploading] = useState<{ image?: boolean; pdfUrl?: boolean; safetySheetUrl?: boolean }>({});
  
  // Categorii din API
  const [domains, setDomains] = useState<{ id: number; name: string }[]>([]);
  const [types, setTypes] = useState<{ id: number; name: string }[]>([]);
  const [manufacturers, setManufacturers] = useState<{ id: number; name: string }[]>([]);

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, []);

  const loadProducts = () => {
    fetch("/admin/api/products", { credentials: "include" })
      .then(res => res.ok ? res.json() : [])
      .then(data => { if (Array.isArray(data)) setProducts(data); })
      .catch(() => {});
  };

  const loadCategories = () => {
    fetch("/admin/api/product-categories")
      .then(res => res.ok ? res.json() : { domains: [], types: [], manufacturers: [] })
      .then(data => {
        setDomains(Array.isArray(data.domains) ? data.domains : []);
        setTypes(Array.isArray(data.types) ? data.types : []);
        setManufacturers(Array.isArray(data.manufacturers) ? data.manufacturers : []);
      })
      .catch(() => {});
  };

  const [form, setForm] = useState({
    name: "",
    productCode: "",
    price: "",
    listPrice: "",
    purchasePrice: "",
    stock: "",
    onDemand: false,
    image: "",
    type: "",
    domain: "",
    currency: "RON",
    discount: "",
    discountType: "percent",
    manufacturer: "",
    description: "",
    specs: "",
    advantages: "",
    pdfUrl: "",
    safetySheetUrl: "",
    deliveryTime: "",
  });

  function showToast(message: string, type: 'success' | 'error' = 'success') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setForm(f => {
      const newForm = { ...f, [name]: type === 'checkbox' ? checked : value };
      
      // Auto-calculate sale price when listPrice or discount changes
      if (name === 'listPrice' || name === 'discount') {
        const listPrice = parseFloat(name === 'listPrice' ? value : f.listPrice) || 0;
        const discount = parseFloat(name === 'discount' ? value : f.discount) || 0;
        
        if (listPrice > 0 && discount >= 0 && discount <= 100) {
          const calculatedPrice = listPrice * (1 - discount / 100);
          // Round to 2 decimals
          newForm.price = (Math.round(calculatedPrice * 100) / 100).toString();
        }
      }
      
      return newForm;
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: 'image' | 'pdfUrl' | 'safetySheetUrl') => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(u => ({ ...u, [fieldName]: true }));
    
    try {
      const formData = new FormData();
      formData.append("file", file);
      
      const res = await fetch("/admin/api/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Eroare la upload");
      }
      
      setForm(f => ({ ...f, [fieldName]: data.url }));
      showToast("Fișier încărcat cu succes!", "success");
    } catch (err: any) {
      showToast(err.message || "Eroare la încărcarea fișierului", "error");
    } finally {
      setUploading(u => ({ ...u, [fieldName]: false }));
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setForm({
      name: product.name,
      productCode: product.productCode || "",
      price: String(product.price),
      listPrice: product.listPrice ? String(product.listPrice) : "",
      purchasePrice: product.purchasePrice ? String(product.purchasePrice) : "",
      stock: String(product.stock || 0),
      onDemand: product.onDemand || false,
      image: product.image || "",
      type: product.type || "",
      domain: product.domain || "",
      currency: product.currency || "RON",
      discount: product.discount ? String(product.discount) : "",
      discountType: product.discountType || "percent",
      manufacturer: product.manufacturer || "",
      description: product.description || "",
      specs: Array.isArray(product.specs) ? product.specs.join("\n") : "",
      advantages: Array.isArray(product.advantages) ? product.advantages.join("\n") : "",
      pdfUrl: product.pdfUrl || "",
      safetySheetUrl: product.safetySheetUrl || "",
      deliveryTime: product.deliveryTime || "",
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/admin/api/products?id=${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Eroare la ștergere");
      showToast("Produs șters cu succes!", "success");
      setDeleteConfirm(null);
      loadProducts();
    } catch (err: any) {
      showToast(err.message || "Eroare la ștergere!", "error");
    }
  };

  const resetForm = () => {
    setEditingProduct(null);
    setShowForm(false);
    setForm({
      name: "", productCode: "", price: "", listPrice: "", purchasePrice: "",
      stock: "", onDemand: false, image: "", type: "", domain: "",
      currency: "RON", discount: "", discountType: "percent", manufacturer: "",
      description: "", specs: "", advantages: "", pdfUrl: "", safetySheetUrl: "", deliveryTime: "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErr("");
    setLoading(true);

    if (!form.name.trim()) {
      setFormErr("Completează numele produsului!");
      setLoading(false);
      return;
    }
    if (!form.productCode.trim()) {
      setFormErr("Completează codul produsului!");
      setLoading(false);
      return;
    }
    if (!form.price || Number(form.price) <= 0) {
      setFormErr("Completează prețul de vânzare!");
      setLoading(false);
      return;
    }

    try {
      const body = {
        ...(editingProduct && { id: editingProduct.id }),
        name: form.name,
        productCode: form.productCode,
        price: Number(form.price),
        listPrice: form.listPrice ? Number(form.listPrice) : undefined,
        purchasePrice: form.purchasePrice ? Number(form.purchasePrice) : undefined,
        stock: Number(form.stock) || 0,
        onDemand: form.onDemand,
        image: form.image,
        type: form.type,
        domain: form.domain,
        currency: form.currency,
        discount: form.discount ? Number(form.discount) : undefined,
        discountType: form.discount ? form.discountType : undefined,
        manufacturer: form.manufacturer || undefined,
        description: form.description,
        specs: form.specs.trim() ? form.specs.split(/\r?\n/).map(s => s.trim()).filter(Boolean) : [],
        advantages: form.advantages.trim() ? form.advantages.split(/\r?\n/).map(s => s.trim()).filter(Boolean) : [],
        pdfUrl: form.pdfUrl || undefined,
        safetySheetUrl: form.safetySheetUrl || undefined,
        deliveryTime: form.deliveryTime || undefined,
      };

      const res = await fetch("/admin/api/products", {
        method: editingProduct ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error(editingProduct ? "Eroare la actualizare produs" : "Eroare la adăugare produs");

      showToast(editingProduct ? "Produs actualizat cu succes!" : "Produs adăugat cu succes!", "success");
      loadProducts();
      resetForm();
    } catch (err: any) {
      showToast(err.message || "Eroare la salvare!", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      {toast && <Toast message={toast.message} type={toast.type} />}
      
      {/* Header cu buton adăugare */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-blue-700">Produse (Română)</h2>
        <button 
          onClick={() => { if (showForm) resetForm(); else setShowForm(true); }}
          className={`${showForm ? 'bg-gray-500 hover:bg-gray-600' : 'bg-teal-600 hover:bg-teal-700'} text-white font-bold py-2 px-6 rounded-lg shadow transition`}
        >
          {showForm ? '✕ Închide formularul' : '➕ Adaugă produs nou'}
        </button>
      </div>

      {/* Formular de adăugare/editare */}
      {showForm && (
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <h3 className="text-xl font-bold mb-4 text-blue-700 text-center">
            {editingProduct ? `Editează: ${editingProduct.name}` : 'Adaugă produs nou'}
          </h3>
          {formErr && <div className="text-red-600 mb-4 text-center font-semibold">{formErr}</div>}
          
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block font-semibold mb-1">Nume produs *</label>
              <input name="name" type="text" required placeholder="Nume produs" value={form.name} onChange={handleChange} className="w-full border rounded-lg px-4 py-2 focus:outline-blue-500" />
            </div>
            <div>
              <label className="block font-semibold mb-1">Cod produs *</label>
              <input name="productCode" type="text" required placeholder="Cod produs" value={form.productCode || ""} onChange={handleChange} className="w-full border rounded-lg px-4 py-2 focus:outline-blue-500" />
            </div>
            <div>
              <label className="block font-semibold mb-1">Preț vânzare *</label>
              <input name="price" type="number" step="0.01" required min="0" placeholder="Preț vânzare" value={form.price} onChange={handleChange} className="w-full border rounded-lg px-4 py-2 focus:outline-blue-500" />
            </div>
            <div>
              <label className="block font-semibold mb-1">Preț de listă</label>
              <input name="listPrice" type="number" step="0.01" min="0" placeholder="Preț de listă (opțional)" value={form.listPrice} onChange={handleChange} className="w-full border rounded-lg px-4 py-2 focus:outline-blue-500" />
            </div>
            <div>
              <label className="block font-semibold mb-1">Preț de intrare</label>
              <input name="purchasePrice" type="number" step="0.01" min="0" placeholder="Preț achiziție" value={form.purchasePrice} onChange={handleChange} className="w-full border rounded-lg px-4 py-2 focus:outline-blue-500" />
            </div>
            <div>
              <label className="block font-semibold mb-1">Producător</label>
              <input name="manufacturer" type="text" list="manufacturers-list" placeholder="Alege sau introdu producător" value={form.manufacturer} onChange={handleChange} className="w-full border rounded-lg px-4 py-2 focus:outline-blue-500" />
              <datalist id="manufacturers-list">
                {manufacturers.map(m => <option key={m.id} value={m.name} />)}
              </datalist>
            </div>
            <div>
              <label className="block font-semibold mb-1">Monedă</label>
              <select name="currency" value={form.currency} onChange={handleChange} className="w-full border rounded-lg px-2 py-2 focus:outline-blue-500 bg-blue-50 font-semibold">
                <option value="RON">RON</option>
                <option value="EURO">EURO</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1">Stoc</label>
              <div className="flex gap-4 items-center">
                <input name="stock" type="number" min="0" placeholder="Stoc disponibil" value={form.stock} onChange={handleChange} className="flex-1 border rounded-lg px-4 py-2 focus:outline-blue-500" disabled={form.onDemand} />
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    name="onDemand" 
                    checked={form.onDemand} 
                    onChange={(e) => setForm(prev => ({ ...prev, onDemand: e.target.checked }))} 
                    className="w-5 h-5 accent-orange-500"
                  />
                  <span className="text-orange-600 font-semibold">Pe comandă</span>
                </label>
              </div>
            </div>
            <div>
              <label className="block font-semibold mb-1">Tip produs</label>
              <select name="type" value={form.type} onChange={handleChange} className="w-full border rounded-lg px-2 py-2 focus:outline-blue-500 bg-blue-50 font-semibold">
                <option value="">Alege tipul</option>
                {types.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1">Domeniu</label>
              <select name="domain" value={form.domain} onChange={handleChange} className="w-full border rounded-lg px-2 py-2 focus:outline-blue-500 bg-blue-50 font-semibold">
                <option value="">Alege domeniul</option>
                {domains.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1">Discount (%)</label>
              <input name="discount" type="number" min="0" max="100" placeholder="Ex: 10" value={form.discount} onChange={handleChange} className="w-full border rounded-lg px-4 py-2 focus:outline-blue-500" />
            </div>
            <div>
              <label className="block font-semibold mb-1">Termen livrare</label>
              <input name="deliveryTime" type="text" placeholder="Ex: 2-3 zile" value={form.deliveryTime} onChange={handleChange} className="w-full border rounded-lg px-4 py-2 focus:outline-blue-500" />
            </div>
            <div className="md:col-span-2">
              <label className="block font-semibold mb-1">Descriere</label>
              <textarea name="description" placeholder="Descriere produs" value={form.description} onChange={handleChange} className="w-full border rounded-lg px-4 py-2 focus:outline-blue-500 h-24" />
            </div>
            <div className="md:col-span-2">
              <label className="block font-semibold mb-1">Specificații (câte una pe linie)</label>
              <textarea name="specs" placeholder="Ex: Material: oțel&#10;Greutate: 2kg" value={form.specs} onChange={handleChange} className="w-full border rounded-lg px-4 py-2 focus:outline-blue-500 h-20" />
            </div>
            <div className="md:col-span-2">
              <label className="block font-semibold mb-1">Avantaje (câte unul pe linie)</label>
              <textarea name="advantages" placeholder="Ex: Durabilitate ridicată&#10;Garanție 2 ani" value={form.advantages} onChange={handleChange} className="w-full border rounded-lg px-4 py-2 focus:outline-blue-500 h-20" />
            </div>
            <div>
              <label className="block font-semibold mb-1">Imagine produs</label>
              <div className="flex gap-2">
                <input name="image" type="text" placeholder="/products/imagine.jpg" value={form.image} onChange={handleChange} className="flex-1 border rounded-lg px-4 py-2 focus:outline-blue-500" />
                <label className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition font-semibold ${uploading.image ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'} text-white`}>
                  {uploading.image ? (
                    <><svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg> Se încarcă...</>
                  ) : (
                    <>📷 Încarcă</>
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={e => handleFileUpload(e, 'image')} disabled={uploading.image} />
                </label>
              </div>
              {form.image && <img src={form.image} alt="Preview" className="mt-2 h-20 object-contain rounded border" />}
            </div>
            <div>
              <label className="block font-semibold mb-1">PDF Fișă Tehnică</label>
              <div className="flex gap-2">
                <input name="pdfUrl" type="text" placeholder="/products/fisa-tehnica.pdf" value={form.pdfUrl} onChange={handleChange} className="flex-1 border rounded-lg px-4 py-2 focus:outline-blue-500" />
                <label className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition font-semibold ${uploading.pdfUrl ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'} text-white`}>
                  {uploading.pdfUrl ? (
                    <><svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg> Se încarcă...</>
                  ) : (
                    <>📄 Încarcă PDF</>
                  )}
                  <input type="file" accept=".pdf,application/pdf" className="hidden" onChange={e => handleFileUpload(e, 'pdfUrl')} disabled={uploading.pdfUrl} />
                </label>
              </div>
              {form.pdfUrl && <a href={form.pdfUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-blue-600 hover:underline text-sm">📄 Vizualizează fișa tehnică</a>}
            </div>
            <div>
              <label className="block font-semibold mb-1">PDF Fișă Securitate</label>
              <div className="flex gap-2">
                <input name="safetySheetUrl" type="text" placeholder="/products/fisa-securitate.pdf" value={form.safetySheetUrl} onChange={handleChange} className="flex-1 border rounded-lg px-4 py-2 focus:outline-blue-500" />
                <label className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition font-semibold ${uploading.safetySheetUrl ? 'bg-gray-400' : 'bg-orange-600 hover:bg-orange-700'} text-white`}>
                  {uploading.safetySheetUrl ? (
                    <><svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg> Se încarcă...</>
                  ) : (
                    <>🛡️ Încarcă PDF</>
                  )}
                  <input type="file" accept=".pdf,application/pdf" className="hidden" onChange={e => handleFileUpload(e, 'safetySheetUrl')} disabled={uploading.safetySheetUrl} />
                </label>
              </div>
              {form.safetySheetUrl && <a href={form.safetySheetUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-orange-600 hover:underline text-sm">🛡️ Vizualizează fișa securitate</a>}
            </div>
            <div className="md:col-span-2 flex justify-center gap-4 mt-4">
              <button type="button" onClick={resetForm} className="bg-gray-400 hover:bg-gray-500 text-white font-bold py-3 px-8 rounded-lg shadow transition">
                Anulează
              </button>
              <button type="submit" disabled={loading} className={`${editingProduct ? 'bg-orange-600 hover:bg-orange-700' : 'bg-blue-600 hover:bg-blue-700'} text-white font-bold py-3 px-10 rounded-lg shadow transition disabled:opacity-60`}>
                {loading ? "Se salvează..." : (editingProduct ? "Actualizează produs" : "Salvează produs")}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tabel produse */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-blue-50">
              <tr>
                <th className="px-3 py-3 font-semibold text-blue-700 whitespace-nowrap">ID</th>
                <th className="px-3 py-3 font-semibold text-blue-700 min-w-[180px]">Nume</th>
                <th className="px-3 py-3 font-semibold text-blue-700 whitespace-nowrap">Cod</th>
                <th className="px-3 py-3 font-semibold text-blue-700 whitespace-nowrap">Preț</th>
                <th className="px-3 py-3 font-semibold text-blue-700 whitespace-nowrap">Preț achiz.</th>
                <th className="px-3 py-3 font-semibold text-blue-700 whitespace-nowrap">Producător</th>
                <th className="px-3 py-3 font-semibold text-blue-700 whitespace-nowrap">Stoc</th>
                <th className="px-3 py-3 font-semibold text-blue-700 whitespace-nowrap">Tip</th>
                <th className="px-3 py-3 font-semibold text-blue-700">Acțiuni</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-500">Nu există produse</td></tr>
              ) : (
                products.map((p, i) => (
                  <tr key={p.id} className={`${i % 2 === 0 ? 'bg-white' : 'bg-blue-50/30'} ${editingProduct?.id === p.id ? 'ring-2 ring-orange-400' : ''}`}>
                    <td className="px-3 py-3 text-gray-600">{p.id}</td>
                    <td className="px-3 py-3 font-medium min-w-[180px] max-w-[220px]"><div className="line-clamp-2">{p.name}</div></td>
                    <td className="px-3 py-3 text-gray-600 whitespace-nowrap">{p.productCode}</td>
                    <td className="px-3 py-3 whitespace-nowrap">{p.price} RON</td>
                    <td className="px-3 py-3 text-gray-600 whitespace-nowrap">{p.purchasePrice || '-'}</td>
                    <td className="px-3 py-3 whitespace-nowrap">{p.manufacturer || '-'}</td>
                    <td className="px-3 py-3 whitespace-nowrap">{p.onDemand ? <span className="text-orange-600 font-semibold">Pe comandă</span> : p.stock}</td>
                    <td className="px-3 py-3 whitespace-nowrap">{p.type || '-'}</td>
                    <td className="px-3 py-3">
                      <div className="flex gap-2 whitespace-nowrap">
                        <Link
                          href={`/admin/variante-ro?productId=${p.id}`}
                          className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded text-sm font-semibold transition"
                        >
                          📦 Variante
                        </Link>
                        <button
                          onClick={() => handleEdit(p)}
                          className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded text-sm font-semibold transition"
                        >
                          ✏️ Editează
                        </button>
                        {deleteConfirm === p.id ? (
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleDelete(p.id)}
                              className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-sm font-semibold transition"
                            >
                              Da
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="bg-gray-400 hover:bg-gray-500 text-white px-2 py-1 rounded text-sm font-semibold transition"
                            >
                              Nu
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(p.id)}
                            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm font-semibold transition"
                          >
                            🗑️ Șterge
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 bg-gray-50 text-sm text-gray-600">
          Total: {products.length} produs(e)
        </div>
      </div>
    </div>
  );
}
