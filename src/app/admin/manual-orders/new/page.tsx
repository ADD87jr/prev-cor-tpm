"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

// Tip produs pentru tabel
type ProductRow = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
  discountPrice?: number;
  discountPercent?: number;
  discountType?: 'percent' | 'fixed';
  deliveryTime?: string;
};

// Tip cupon
type AppliedCoupon = {
  code: string;
  type: 'percent' | 'fixed';
  value: number;
} | null;


export default function AddManualOrderPage() {
    const [redirecting, setRedirecting] = useState(false);
    const [success, setSuccess] = useState(false);
    const isSubmitting = useRef(false);
    const [defaultTva, setDefaultTva] = useState(19);
    
    // Încarcă TVA configurat din admin
    useEffect(() => {
      fetch('/admin/api/pagini?pagina=cos')
        .then(res => res.json())
        .then(data => {
          if (data && data.tva !== undefined) {
            const tvaVal = Number(data.tva);
            setDefaultTva(tvaVal);
            setTvaPercent(tvaVal);
          }
        })
        .catch(() => {});
    }, []);

    useEffect(() => {
      if (success) {
        setRedirecting(true);
        setTimeout(() => {
          window.location.href = "/admin/manual-orders/confirmare";
        }, 1200);
      }
    }, [success]);
  // eliminat dublura success/setSuccess
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [courierCost, setCourierCost] = useState<number>(25);
  const [courierType, setCourierType] = useState<string>('standard');
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [tvaPercent, setTvaPercent] = useState(19);
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon>(null);
  const [couponCode, setCouponCode] = useState("");
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  
  // Calcul stacking: product discount first, then coupon on reduced price
  const subtotalPretVanzare = products.reduce((acc, p) => acc + p.price * p.quantity, 0);
  const reducereTotalaProduse = products.reduce((acc, p) => acc + ((p.price - (p.discountPrice ?? p.price)) * p.quantity), 0);
  const subtotalDupaProduse = subtotalPretVanzare - reducereTotalaProduse;
  
  // Coupon discount applied on subtotalDupaProduse (stacking)
  let reducereTotalaCupon = 0;
  if (appliedCoupon) {
    if (appliedCoupon.type === 'percent') {
      const percent = appliedCoupon.value <= 1 ? appliedCoupon.value * 100 : appliedCoupon.value;
      reducereTotalaCupon = subtotalDupaProduse * (percent / 100);
    } else {
      reducereTotalaCupon = appliedCoupon.value;
    }
  }
  const subtotalDupaReduceri = subtotalDupaProduse - reducereTotalaCupon;
  
  const totalFaraTva = subtotalDupaReduceri + courierCost;
  const tvaValoare = totalFaraTva * (tvaPercent / 100);
  const totalCuTVA = totalFaraTva + tvaValoare;
  useEffect(() => {
    let greutate = products.reduce((acc, p) => acc + (p.quantity ?? 1), 0);
    let costCurier = 0;
    if (courierType === "pickup") costCurier = 0;
    else if (courierType === "standard") costCurier = 25 + 1 * greutate;
    else if (courierType === "express") costCurier = 39 + 2 * greutate;
    else if (courierType === "easybox") costCurier = 19 + 0.5 * greutate;
    setCourierCost(costCurier);
  }, [products, courierType]);
  const [paymentMethod, setPaymentMethod] = useState<string>("transfer bancar");
  const [clientType, setClientType] = useState<'fizica' | 'companie'>("fizica");
  const [clientFizic, setClientFizic] = useState({
    name: "",
    email: "",
    telefon: "",
    adresa: "",
    oras: "",
    judet: "",
    codPostal: "",
    contBancar: "",
    banca: ""
  });
  const [clientCompanie, setClientCompanie] = useState({
    denumire: "",
    cui: "",
    nrRegCom: "",
    adresaSediu: "",
    reprezentant: "",
    email: "",
    telefon: "",
    oras: "",
    judet: "",
    codPostal: "",
    contBancar: "",
    banca: ""
  });
  const [productOptions, setProductOptions] = useState<any[]>([]);
  const [status, setStatus] = useState("nouă");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    fetch("/admin/api/products")
      .then(res => res.json())
      .then(setProductOptions);
  }, []);
  function addProductRow() {
    setProducts(p => [...p, { id: "", name: "", price: 0, quantity: 1, subtotal: 0 }]);
  }
  function updateProductRow(idx: number, update: Partial<ProductRow> | { field: string, value: any }) {
    setProducts(p => p.map((row, i) => {
      if (i !== idx) return row;
      if ('field' in update) {
        if (update.field === "quantity") {
          const qty = Math.max(1, Number(update.value));
          return { ...row, quantity: qty, subtotal: (row.discountPrice ?? row.price) * qty };
        }
        return { ...row, [update.field]: update.value };
      } else {
        return { ...row, ...update };
      }
    }));
  }
  function removeProductRow(idx: number) {
    setProducts(p => p.filter((_, i) => i !== idx));
  }
  
  // Aplică cupon
  async function handleApplyCoupon() {
    if (!couponCode.trim()) {
      setCouponError('Introdu un cod de cupon');
      return;
    }
    setCouponLoading(true);
    setCouponError(null);
    try {
      const res = await fetch('/api/validate-coupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode.trim() })
      });
      const data = await res.json();
      if (data.valid) {
        setAppliedCoupon({
          code: couponCode.trim(),
          type: data.type,
          value: data.value
        });
        setCouponError(null);
      } else {
        setCouponError(data.message || 'Cupon invalid');
        setAppliedCoupon(null);
      }
    } catch (err) {
      setCouponError('Eroare la validarea cuponului');
      setAppliedCoupon(null);
    }
    setCouponLoading(false);
  }
  
  function removeCoupon() {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError(null);
  }
  
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Protecție contra dublei trimiteri
    if (isSubmitting.current) return;
    isSubmitting.current = true;
    setSaving(true);
    setErrorMessage(null);
    if (!products || products.length === 0) {
      alert('Adaugă cel puțin un produs!');
      isSubmitting.current = false;
      setSaving(false);
      return;
    }
    let greutate = products.reduce((acc, p) => acc + (p.quantity ?? 1), 0);
    if (greutate <= 0) {
      alert('Setează cantitatea produselor!');
      isSubmitting.current = false;
      setSaving(false);
      return;
    }
    let costCurier = 0;
    if (courierType === "pickup") costCurier = 0;
    else if (courierType === "standard") costCurier = 25 + 1 * greutate;
    else if (courierType === "express") costCurier = 39 + 2 * greutate;
    else if (courierType === "easybox") costCurier = 19 + 0.5 * greutate;
    if (costCurier <= 0) {
      alert('Costul curierului nu este setat corect! Selectează tipul de livrare și adaugă produse.');
      isSubmitting.current = false;
      setSaving(false);
      return;
    }
    const payload = {
      clientType,
      clientData: clientType === 'fizica' ? clientFizic : clientCompanie,
      items: products.map(p => {
        let discount = 0;
        if (p.discountType === 'percent' && typeof p.discountPercent === 'number') {
          discount = p.discountPercent / 100;
        } else if (p.discountType === 'fixed' && typeof p.discountPrice === 'number' && typeof p.price === 'number') {
          discount = p.price - p.discountPrice;
          if (discount < 0) discount = 0;
          if (typeof p.price === 'number' && p.price > 0) discount = discount / p.price;
        }
        return {
          id: p.id,
          name: p.name,
          price: p.price,
          quantity: p.quantity,
          discountPrice: p.discountPrice,
          discountPercent: p.discountPercent,
          discountType: p.discountType,
          discount,
          deliveryTime: p.deliveryTime,
          appliedCoupon: appliedCoupon ? { type: appliedCoupon.type, value: appliedCoupon.value } : null
        };
      }),
      // Calculează totalul corect cu costCurier și TVA
      total: Math.round(((subtotalDupaReduceri + costCurier) * (1 + tvaPercent / 100)) * 100) / 100,
      // Pentru Card online, statusul e "așteptare plată" până se finalizează plata
      status: paymentMethod === 'Card online' ? 'așteptare plată' : status,
      courierCost: costCurier,
      courierType,
      paymentMethod,
      tva: tvaPercent,
      subtotalPretVanzare,
      subtotalDupaReduceri,
      reducereTotala: reducereTotalaProduse + reducereTotalaCupon,
      deliveryType: courierType,
      deliveryLabel: courierType === 'standard' ? 'Standard' : courierType === 'express' ? 'Express' : courierType === 'easybox' ? 'EasyBox' : courierType,
      userId: null
    };
    const res = await fetch("/admin/manual-orders/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const backendOrder = await res.json();
    if (!res.ok || backendOrder?.success === false) {
      setErrorMessage(backendOrder?.error || 'Eroare la salvarea comenzii.');
      isSubmitting.current = false;
      setSaving(false);
      return;
    }
    setSuccess(true);
    // Resetare cupon imediat după succes (pentru toate metodele de plată)
    setCouponCode("");
    setAppliedCoupon(null);
    setCouponError(null);
    // Mesajul de confirmare va fi afișat în UI
    if (paymentMethod === 'Card online') {
      // Inițiază sesiune Stripe pentru plată cu cardul
      try {
        // Calculează prețul final cu stacking: discount produs + discount cupon
        const items = products.map(p => {
          const priceAfterProductDiscount = p.discountPrice ?? p.price;
          const productDiscount = p.price - priceAfterProductDiscount;
          
          // Aplică cuponul pe prețul după discount produs (stacking)
          let couponDiscount = 0;
          if (appliedCoupon) {
            if (appliedCoupon.type === 'percent') {
              const percent = appliedCoupon.value <= 1 ? appliedCoupon.value * 100 : appliedCoupon.value;
              couponDiscount = priceAfterProductDiscount * (percent / 100);
            } else {
              // Fixed discount distribuit proporțional
              const totalAfterProduct = products.reduce((acc, prod) => acc + ((prod.discountPrice ?? prod.price) * prod.quantity), 0);
              const ratio = totalAfterProduct > 0 ? ((priceAfterProductDiscount * p.quantity) / totalAfterProduct) : 0;
              couponDiscount = (appliedCoupon.value * ratio) / p.quantity;
            }
          }
          
          const finalPrice = priceAfterProductDiscount - couponDiscount;
          
          return {
            id: p.id,
            name: p.name,
            price: p.price,
            quantity: p.quantity,
            discount: p.discountPercent ? p.discountPercent / 100 : 0,
            deliveryTime: p.deliveryTime,
            discountedPrice: Math.round(finalPrice * 100) / 100,
            productDiscount: Math.round(productDiscount * 100) / 100,
            couponDiscount: Math.round(couponDiscount * 100) / 100,
            appliedCoupon: appliedCoupon ? { type: appliedCoupon.type, value: appliedCoupon.value } : null
          };
        });
        const client = clientType === 'fizica' ? clientFizic : clientCompanie;
        const orderId = backendOrder.order?.id || backendOrder.id;
        const checkoutRes = await fetch("/api/create-checkout-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items,
            client,
            userEmail: (client.email) || '',
            paymentMethod: 'Card online',
            deliveryType: courierType,
            courierCost: costCurier,
            tvaPercent,
            manualOrderId: orderId,
            orderId: orderId
          })
        });
        const checkoutData = await checkoutRes.json();
        if (checkoutData?.url) {
          // Salvează datele în localStorage pentru a fi recuperate la stripe-success
          const orderData = {
            items,
            client,
            userEmail: (client.email) || '',
            courierCost: costCurier,
            deliveryType: courierType,
            paymentMethod: 'card'
          };
          localStorage.setItem(`order_${orderId}`, JSON.stringify(orderData));
          window.location.href = checkoutData.url;
          return;
        } else {
          setErrorMessage('Eroare la inițierea plății cu cardul.');
        }
      } catch (err) {
        setErrorMessage('Eroare la inițierea plății cu cardul.');
      }
      isSubmitting.current = false;
      setSaving(false);
      return;
    }
    // Pentru celelalte metode de plată, resetare formular ca înainte
    setSuccess(true);
    setClientFizic({ name: "", email: "", telefon: "", adresa: "", oras: "", judet: "", codPostal: "", contBancar: "", banca: "" });
    setClientCompanie({ denumire: "", cui: "", nrRegCom: "", adresaSediu: "", reprezentant: "", email: "", telefon: "", oras: "", judet: "", codPostal: "", contBancar: "", banca: "" });
    setProducts([]);
    setStatus("nouă");
    setPaymentMethod("transfer bancar");
    // Resetare cupon
    setCouponCode("");
    setAppliedCoupon(null);
    setCouponError(null);
    isSubmitting.current = false;
    setSaving(false);
  }
  return (
    <main className="max-w-[1400px] mx-auto py-10 px-4">
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6 font-semibold text-lg" role="alert">
          Comanda a fost finalizată cu succes! Vei fi redirecționat...
        </div>
      )}
      <h1 className="text-3xl font-bold mb-6 text-blue-900">Adaugă comandă manuală</h1>
      <Link href="/admin/manual-orders" className="text-blue-600 hover:underline mb-6 inline-block">← Înapoi la comenzi manuale</Link>
      <form onSubmit={handleSubmit} className="bg-white rounded shadow p-6 flex flex-col gap-8">
        <div className="w-full mb-8">
          <fieldset className="border rounded p-4 mb-4">
            <legend className="font-semibold text-lg text-blue-700">Date client</legend>
            <div className="mb-4">
              <label className="block text-sm font-semibold mb-1">Tip client</label>
              <select className="border rounded px-3 py-2 w-60" value={clientType} onChange={e => setClientType(e.target.value as 'fizica' | 'companie')}>
                <option value="fizica">Persoană fizică</option>
                <option value="companie">Companie</option>
              </select>
            </div>
          </fieldset>
          <div className="mb-2 font-bold text-blue-800 text-lg">
            {clientType === 'fizica' ? 'Date persoană fizică' : 'Date companie'}
          </div>
          {clientType === 'fizica' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Nume</label>
                <input type="text" className="border rounded px-3 py-2 w-full" placeholder="Nume" value={clientFizic.name} onChange={e => setClientFizic(f => ({ ...f, name: e.target.value }))} required />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Email</label>
                <input type="email" className="border rounded px-3 py-2 w-full" placeholder="Email" value={clientFizic.email} onChange={e => setClientFizic(f => ({ ...f, email: e.target.value }))} required />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Telefon</label>
                <input type="text" className="border rounded px-3 py-2 w-full" placeholder="Telefon" value={clientFizic.telefon} onChange={e => setClientFizic(f => ({ ...f, telefon: e.target.value }))} required />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Adresa</label>
                <input type="text" className="border rounded px-3 py-2 w-full" placeholder="Adresa" value={clientFizic.adresa} onChange={e => setClientFizic(f => ({ ...f, adresa: e.target.value }))} required />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Oraș</label>
                <input type="text" className="border rounded px-3 py-2 w-full" placeholder="Oraș" value={clientFizic.oras} onChange={e => setClientFizic(f => ({ ...f, oras: e.target.value }))} required />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Județ</label>
                <input type="text" className="border rounded px-3 py-2 w-full" placeholder="Județ" value={clientFizic.judet} onChange={e => setClientFizic(f => ({ ...f, judet: e.target.value }))} required />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Cod poștal</label>
                <input type="text" className="border rounded px-3 py-2 w-full" placeholder="Cod poștal" value={clientFizic.codPostal} onChange={e => setClientFizic(f => ({ ...f, codPostal: e.target.value }))} required />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Cont bancar (opțional)</label>
                <input type="text" className="border rounded px-3 py-2 w-full" placeholder="Cont bancar (opțional)" value={clientFizic.contBancar ?? ''} onChange={e => setClientFizic(f => ({ ...f, contBancar: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Banca (opțional)</label>
                <input type="text" className="border rounded px-3 py-2 w-full" placeholder="Banca (opțional)" value={clientFizic.banca ?? ''} onChange={e => setClientFizic(f => ({ ...f, banca: e.target.value }))} />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Denumire companie</label>
                <input type="text" className="border rounded px-3 py-2 w-full" placeholder="Denumire companie" value={clientCompanie.denumire} onChange={e => setClientCompanie(f => ({ ...f, denumire: e.target.value }))} required />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">CUI</label>
                <input type="text" className="border rounded px-3 py-2 w-full" placeholder="CUI" value={clientCompanie.cui} onChange={e => setClientCompanie(f => ({ ...f, cui: e.target.value }))} required />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Nr. Reg. Com.</label>
                <input type="text" className="border rounded px-3 py-2 w-full" placeholder="Nr. Reg. Com." value={clientCompanie.nrRegCom} onChange={e => setClientCompanie(f => ({ ...f, nrRegCom: e.target.value }))} required />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Adresa sediu</label>
                <input type="text" className="border rounded px-3 py-2 w-full" placeholder="Adresa sediu" value={clientCompanie.adresaSediu} onChange={e => setClientCompanie(f => ({ ...f, adresaSediu: e.target.value }))} required />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Reprezentant</label>
                <input type="text" className="border rounded px-3 py-2 w-full" placeholder="Reprezentant" value={clientCompanie.reprezentant} onChange={e => setClientCompanie(f => ({ ...f, reprezentant: e.target.value }))} required />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Email</label>
                <input type="email" className="border rounded px-3 py-2 w-full" placeholder="Email" value={clientCompanie.email} onChange={e => setClientCompanie(f => ({ ...f, email: e.target.value }))} required />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Telefon</label>
                <input type="text" className="border rounded px-3 py-2 w-full" placeholder="Telefon" value={clientCompanie.telefon} onChange={e => setClientCompanie(f => ({ ...f, telefon: e.target.value }))} required />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Oraș</label>
                <input type="text" className="border rounded px-3 py-2 w-full" placeholder="Oraș" value={clientCompanie.oras} onChange={e => setClientCompanie(f => ({ ...f, oras: e.target.value }))} required />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Județ</label>
                <input type="text" className="border rounded px-3 py-2 w-full" placeholder="Județ" value={clientCompanie.judet} onChange={e => setClientCompanie(f => ({ ...f, judet: e.target.value }))} required />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Cod poștal</label>
                <input type="text" className="border rounded px-3 py-2 w-full" placeholder="Cod poștal" value={clientCompanie.codPostal} onChange={e => setClientCompanie(f => ({ ...f, codPostal: e.target.value }))} required />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Cont bancar</label>
                <input type="text" className="border rounded px-3 py-2 w-full" placeholder="Cont bancar" value={clientCompanie.contBancar} onChange={e => setClientCompanie(f => ({ ...f, contBancar: e.target.value }))} required />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Banca</label>
                <input type="text" className="border rounded px-3 py-2 w-full" placeholder="Banca" value={clientCompanie.banca} onChange={e => setClientCompanie(f => ({ ...f, banca: e.target.value }))} required />
              </div>
            </div>
          )}
        </div>
        <div className="w-full">
          <fieldset className="border rounded p-4 mb-4">
            <legend className="font-semibold text-lg text-blue-700">Produse comandate</legend>
            <div className="bg-white rounded shadow p-4 w-full" style={{ minWidth: '100%', boxSizing: 'border-box' }}>
              <table className="w-full text-sm m-0 p-0">
                <thead>
                  <tr className="border-b">
                    <th className="font-semibold p-2 text-left">Nr. crt.</th>
                    <th className="font-semibold p-2 text-left">Produs</th>
                    <th className="font-semibold p-2 text-center">Cantitate</th>
                    <th className="font-semibold p-2 text-center">Preț vânzare</th>
                    <th className="font-semibold p-2 text-center">Reducere produs</th>
                    <th className="font-semibold p-2 text-center">Reducere cupon</th>
                    <th className="font-semibold p-2 text-center">Preț final</th>
                    <th className="font-semibold p-2 text-center">Subtotal</th>
                    <th className="font-semibold p-2 text-center">Termen livrare</th>
                    <th className="font-semibold p-2 text-center">Șterge</th>
                  </tr>
                </thead>
                <tbody>
                  {products.length === 0 ? (
                    <tr><td colSpan={10} className="text-center p-4 text-gray-400">Niciun produs adăugat</td></tr>
                  ) : (
                    products.map((p, idx) => (
                      <tr key={idx} className="border-b">
                        <td className="p-2 text-center">{idx + 1}</td>
                        <td className="p-2">
                          <select
                            className="border rounded px-2 py-1 w-full"
                            value={p.id?.toString()}
                            onChange={e => {
                              const prod = productOptions.find(opt => opt.id?.toString() === e.target.value);
                              if (prod) {
                                let discountPrice = prod.price;
                                let discountPercent = 0;
                                if (prod.discount && prod.discountType === 'percent') {
                                  discountPercent = Math.round(prod.discount * 100);
                                  discountPrice = Math.round(prod.price * (1 - prod.discount));
                                } else if (prod.discount && prod.discountType === 'fixed') {
                                  discountPrice = prod.price - prod.discount;
                                }
                                updateProductRow(idx, {
                                  id: prod.id?.toString(),
                                  name: prod.name,
                                  price: prod.price,
                                  discountPrice,
                                  discountPercent,
                                  discountType: prod.discountType,
                                  deliveryTime: Array.isArray(prod.deliveryOptions) ? prod.deliveryOptions[0] : prod.deliveryTime ?? '',
                                  subtotal: discountPrice * (p.quantity ?? 1)
                                });
                              }
                            }}
                          >
                            <option value="">Alege produs...</option>
                            {productOptions.map(opt => (
                              <option key={opt.id} value={opt.id?.toString()}>{opt.name}</option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2 text-center">
                          <input
                            type="number"
                            min={1}
                            className="border rounded px-2 py-1 w-20 text-center"
                            value={p.quantity}
                            onChange={e => {
                              const qty = Math.max(1, Number(e.target.value));
                              updateProductRow(idx, { quantity: qty, subtotal: (p.discountPrice ?? p.price) * qty });
                            }}
                          />
                        </td>
                        <td className="p-2 text-center">{p.price?.toFixed(2)}</td>
                        <td className="p-2 text-center text-orange-600">
                          {(p.price - (p.discountPrice ?? p.price)) > 0
                            ? `-${(p.price - (p.discountPrice ?? p.price)).toFixed(2)} lei`
                            : '-'}
                        </td>
                        <td className="p-2 text-center text-blue-600">
                          {appliedCoupon
                            ? (appliedCoupon.type === 'percent'
                              ? `-${((p.discountPrice ?? p.price) * (appliedCoupon.value <= 1 ? appliedCoupon.value : appliedCoupon.value / 100)).toFixed(2)} lei`
                              : `-${(appliedCoupon.value / products.length).toFixed(2)} lei`)
                            : '-'}
                        </td>
                        <td className="p-2 text-center">
                          {(() => {
                            const priceAfterProduct = p.discountPrice ?? p.price;
                            let couponDisc = 0;
                            if (appliedCoupon) {
                              if (appliedCoupon.type === 'percent') {
                                couponDisc = priceAfterProduct * (appliedCoupon.value <= 1 ? appliedCoupon.value : appliedCoupon.value / 100);
                              } else {
                                couponDisc = appliedCoupon.value / products.length;
                              }
                            }
                            return (priceAfterProduct - couponDisc).toFixed(2);
                          })()}
                        </td>
                        <td className="p-2 text-center">
                          {(() => {
                            const priceAfterProduct = p.discountPrice ?? p.price;
                            let couponDisc = 0;
                            if (appliedCoupon) {
                              if (appliedCoupon.type === 'percent') {
                                couponDisc = priceAfterProduct * (appliedCoupon.value <= 1 ? appliedCoupon.value : appliedCoupon.value / 100);
                              } else {
                                couponDisc = appliedCoupon.value / products.length;
                              }
                            }
                            return ((priceAfterProduct - couponDisc) * p.quantity).toFixed(2);
                          })()}
                        </td>
                        <td className="p-2 text-center">
                          {Array.isArray(productOptions.find(opt => opt.id === p.id)?.deliveryOptions) ? (
                            <select
                              className="border rounded px-2 py-1 w-full"
                              value={p.deliveryTime ?? ''}
                              onChange={e => updateProductRow(idx, { field: 'deliveryTime', value: e.target.value })}
                            >
                              {productOptions.find(opt => opt.id === p.id)?.deliveryOptions.map((opt: string, i: number) => (
                                <option key={i} value={opt}>{opt}</option>
                              ))}
                            </select>
                          ) : (
                            p.deliveryTime ?? '-'
                          )}
                        </td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            className="bg-red-100 text-red-700 px-2 py-1 rounded font-bold hover:bg-red-200"
                            title="Șterge rândul"
                            onClick={() => removeProductRow(idx)}
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              <div className="mt-6 flex justify-end w-full mr-0 ml-auto">
                <div className="space-y-1 max-w-md w-full text-right">
                  <div className="font-semibold">Subtotal preț de vânzare: {subtotalPretVanzare.toFixed(2)} lei</div>
                  <div className="text-orange-600 flex items-center justify-end gap-2">Reducere totală produse: -{reducereTotalaProduse.toFixed(2)} lei</div>
                  <div className="text-blue-600 flex items-center justify-end gap-2">Reducere totală cupon: -{reducereTotalaCupon.toFixed(2)} lei</div>
                  <div className="font-semibold text-green-700">Subtotal după reduceri: {subtotalDupaReduceri.toFixed(2)} lei</div>
                  <div>Cost curier: {typeof courierCost !== 'undefined' ? `${courierCost} lei` : '-'} <span className="text-xs text-gray-500">({courierType === 'standard' ? 'Standard' : courierType === 'express' ? 'Express' : courierType === 'easybox' ? 'EasyBox' : courierType})</span></div>
                  <div className="flex items-center justify-end gap-2 mt-2">
                    <span>Metodă de plată: {paymentMethod}</span>
                  </div>
                  <div className="font-semibold text-blue-700">Total fără TVA: {totalFaraTva ? `${totalFaraTva.toFixed(2)} lei` : '-'}</div>
                  <div className="text-blue-600 flex items-center justify-end gap-2">TVA (
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={tvaPercent}
                      onChange={e => setTvaPercent(Number(e.target.value))}
                      className="border rounded px-2 py-1 w-16 text-right mx-1"
                      style={{fontWeight:'bold'}}
                    />
                    %): {tvaValoare ? `${tvaValoare.toFixed(2)} lei` : '-'}
                  </div>
                  <div className="font-bold">Total de plată (cu TVA): {(totalFaraTva + tvaValoare).toFixed(2)} lei</div>
                </div>
              </div>
              
              {/* Cupon */}
              <div className="flex items-center gap-4 mt-6 mb-2">
                <span className="font-semibold">Cod cupon:</span>
                {appliedCoupon ? (
                  <div className="flex items-center gap-2">
                    <span className="bg-green-100 text-green-700 px-3 py-1 rounded font-semibold">{appliedCoupon.code} ({appliedCoupon.type === 'percent' ? `${appliedCoupon.value}%` : `${appliedCoupon.value} lei`})</span>
                    <button type="button" className="bg-red-100 text-red-700 px-2 py-1 rounded font-bold hover:bg-red-200" onClick={removeCoupon}>✕</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      className="border rounded px-3 py-2 w-40"
                      placeholder="Cod cupon"
                      value={couponCode}
                      onChange={e => setCouponCode(e.target.value)}
                      disabled={couponLoading}
                      autoComplete="off"
                    />
                    <button
                      type="button"
                      className="bg-blue-100 text-blue-700 px-3 py-2 rounded font-semibold hover:bg-blue-200"
                      onClick={handleApplyCoupon}
                      disabled={couponLoading}
                    >
                      {couponLoading ? '...' : 'Aplică'}
                    </button>
                    {couponError && <span className="text-red-600 text-sm">{couponError}</span>}
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-4 mt-4 mb-2">
                <span className="font-semibold">Metodă de plată:</span>
                <select
                  id="paymentMethod"
                  className="border rounded px-3 py-2 min-w-[180px] ml-2"
                  value={paymentMethod}
                  onChange={e => {
                    setPaymentMethod(e.target.value);
                  }}
                >
                  <option value="transfer bancar">Transfer bancar</option>
                  <option value="Ramburs">Ramburs</option>
                  <option value="Plată în rate">Plată în rate</option>
                  <option value="Card online">Card online</option>
                </select>
              </div>
              <div className="flex items-center gap-4 mb-2">
                <span className="font-semibold">Livrare:</span>
                <select
                  id="livrare"
                  className="border rounded px-3 py-2 min-w-[280px] ml-2"
                  value={courierType}
                  onChange={e => {
                    const val = e.target.value;
                    setCourierType(val);
                    let cost = 0;
                    let greutate = products.reduce((acc, p) => acc + (p.quantity ?? 1), 0);
                    if (val === "pickup") cost = 0;
                    else if (val === "standard") cost = 25 + 1 * greutate;
                    else if (val === "express") cost = 39 + 2 * greutate;
                    else if (val === "easybox") cost = 19 + 0.5 * greutate;
                    setCourierCost(cost);
                  }}
                >
                  <option value="standard">Standard (1-3 zile, 25 lei + 1 leu/kg)</option>
                  <option value="express">Express (24h, 39 lei + 2 lei/kg)</option>
                  <option value="easybox">EasyBox (1-2 zile, 19 lei + 0.5 lei/kg)</option>
                  <option value="pickup">Ridicare de la sediu (0 lei)</option>
                </select>
                <span className="ml-4 text-gray-600">Greutate estimată: {products.reduce((acc, p) => acc + (p.quantity ?? 1), 0)} kg</span>
              </div>
              <button type="button" className="bg-blue-100 text-blue-700 px-4 py-2 rounded font-semibold mt-4" onClick={addProductRow}>Adaugă produs</button>
            </div>
          </fieldset>
        </div>
        {errorMessage && (
          <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-lg mb-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-red-800 mb-1">Comanda nu a putut fi procesată!</h3>
                <p className="text-red-700">{errorMessage.replace(/<[^>]*>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')}</p>
              </div>
            </div>
          </div>
        )}
        <button
          type="submit"
          className="bg-blue-600 text-white px-6 py-2 rounded font-semibold hover:bg-blue-700 transition mt-4"
          disabled={saving || products.length === 0}
        >
          Adaugă comandă
        </button>
      </form>
    </main>
  );
}
