"use client";

import { useEffect } from "react";
import { useCart } from "../_components/CartContext";
import { useState, Suspense } from "react";
import { calculateCartSummary } from "../utils/cartSummary";
import { useRouter, useSearchParams } from "next/navigation";
import { useLanguage } from "../_components/LanguageContext";

function CheckoutPageInner() {
  const { items: contextItems, clearCart } = useCart();
  const [items, setItems] = useState<Array<any>>(contextItems && contextItems.length > 0 ? contextItems : []);
  const { language } = useLanguage();
  
  const txt = {
    paymentMethod: language === "en" ? "Payment method:" : "Metodă de plată:",
    cardOnline: language === "en" ? "Card online" : "Card online",
    cashOnDelivery: language === "en" ? "Cash on delivery" : "Ramburs la livrare",
    bankTransfer: language === "en" ? "Bank transfer" : "Transfer bancar",
    installments: language === "en" ? "Installments" : "Plată în rate",
    clientData: language === "en" ? "Client data" : "Date client",
    clientType: language === "en" ? "Client type:" : "Tip client:",
    individual: language === "en" ? "Individual" : "Persoană fizică",
    company: language === "en" ? "Company" : "Companie",
    companyName: language === "en" ? "Company name" : "Denumire firmă",
    cui: language === "en" ? "Tax ID (CIF)" : "CIF",
    reg: language === "en" ? "Reg. No. (RC)" : "RC",
    fullName: language === "en" ? "Full name" : "Nume complet",
    email: "Email",
    phone: language === "en" ? "Phone number" : "Telefon",
    iban: language === "en" ? "IBAN account" : "Cont IBAN",
    bank: language === "en" ? "Bank" : "Banca",
    deliveryAddress: language === "en" ? "Delivery address" : "Adresă de livrare",
    postalCode: language === "en" ? "Postal code" : "Cod poștal",
    city: language === "en" ? "City" : "Oraș",
    county: language === "en" ? "County" : "Județ",
    back: language === "en" ? "← Back" : "← Înapoi",
    finishOrder: language === "en" ? "Finish order" : "Finalizare comandă",
    emailNote: language === "en" ? "You will receive order details by email." : "Veți primi detaliile pe email după finalizare.",
    orderPlaced: language === "en" ? "Order placed!" : "Comanda a fost plasată!",
    thankYou: language === "en" ? "Thank you for your order. You will receive a confirmation email shortly." : "Vă mulțumim pentru comandă. Veți primi un email de confirmare în scurt timp.",
    close: language === "en" ? "Close" : "Închide",
    paymentError: language === "en" ? "Error initiating online payment." : "Eroare la inițializarea plății online.",
    orderError: language === "en" ? "Error processing order." : "Eroare la procesarea comenzii.",
    fillField: language === "en" ? "Please fill in:" : "Completează câmpul:",
    onDemandNoRamburs: language === "en" ? "COD/Installments not available for on-demand products." : "Ramburs/Rate indisponibile pt. produse pe comandă.",
    priceConfirmation: language === "en" ? "Prices are indicative. We will contact you to confirm the final price before delivery." : "Prețurile sunt orientative. Vă vom contacta pentru confirmarea prețului final înainte de livrare.",
  };
  // La montarea paginii, dacă contextItems e gol, citește din localStorage
  useEffect(() => {
    if ((!contextItems || contextItems.length === 0) && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('checkout_items');
        if (stored) {
          setItems(JSON.parse(stored));
        }
      } catch (e) {
        setItems([]);
      }
    }
  }, [contextItems]);
  const router = useRouter();
  const searchParams = useSearchParams();
  const paymentMethod = searchParams?.get('paymentMethod') || 'transfer';
  // Preia deliveryType din query string sau localStorage/context
  const deliveryTypeParam = searchParams?.get('deliveryType');
  const [deliveryType, setDeliveryType] = useState(deliveryTypeParam || 'standard');
  const [form, setForm] = useState({
    clientType: "fizica",
    companyName: "",
    cui: "",
    reg: "",
    name: "",
    email: "",
    phone: "",
    iban: "",
    bank: "",
    address: "",
    postalCode: "",
    city: "",
    county: ""
  });
  const [error, setError] = useState("");
  const isStockError = error && error.toLowerCase().includes("stoc insuficient");
  const [submitted, setSubmitted] = useState(false);
  // TVA și setări curier configurabile din admin
  const [TVA_PERCENT, setTvaPercent] = useState(21);
  const [livrareGratuita, setLivrareGratuita] = useState(500);
  const [costCurierStandard, setCostCurierStandard] = useState(25);
  const [costCurierExpress, setCostCurierExpress] = useState(40);
  const [costPerKg, setCostPerKg] = useState(1);
  // State pentru verificarea produselor onDemand (din DB)
  const [hasOnDemandProducts, setHasOnDemandProducts] = useState(false);
  
  // Încarcă setări coș din admin
  useEffect(() => {
    fetch('/api/pages?pagina=cos')
      .then(res => res.json())
      .then(data => {
        if (data) {
          if (data.tva !== undefined) setTvaPercent(Number(data.tva));
          if (data.livrareGratuita !== undefined) setLivrareGratuita(Number(data.livrareGratuita));
          if (data.costCurierStandard !== undefined) setCostCurierStandard(Number(data.costCurierStandard));
          if (data.costCurierExpress !== undefined) setCostCurierExpress(Number(data.costCurierExpress));
          if (data.costPerKg !== undefined) setCostPerKg(Number(data.costPerKg));
        }
      })
      .catch(() => {});
  }, []);

  // Verifică onDemand din DB pentru produsele din coș
  useEffect(() => {
    const checkOnDemand = async () => {
      if (!items || items.length === 0) return;
      
      // Verifică direct din flag-urile din coș (dacă există)
      const hasFromCart = items.some(item => item.onDemand === true);
      if (hasFromCart) {
        setHasOnDemandProducts(true);
        return;
      }
      
      // Fallback: verifică din API dacă coșul nu are flag-uri onDemand
      try {
        const productIds = [...new Set(items.map(item => item.id))];
        const variantIds = items.filter(i => i.variantId).map(i => i.variantId);
        const res = await fetch('/api/check-ondemand', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productIds, variantIds })
        });
        if (res.ok) {
          const data = await res.json();
          setHasOnDemandProducts(data.hasOnDemand === true);
        }
      } catch (e) {
        console.log('onDemand check failed:', e);
      }
    };
    checkOnDemand();
  }, [items]);

  // Pentru consistență, construim array de produse pentru utilitarul de sumar
  const summaryProducts = Array.isArray(items) ? items.map(item => ({
    id: item.id,
    name: item.name,
    price: item.price,
    quantity: item.quantity,
    discount: item.discount,
    appliedCoupon: item.appliedCoupon || null,
  })) : [];
  // Folosește deliveryType selectat
  const summary = calculateCartSummary({
    products: summaryProducts,
    deliveryType,
    paymentMethod,
    TVA_PERCENT,
    livrareGratuita,
    costCurierStandard,
    costCurierExpress,
    costPerKg,
  });
  const totalWeight = items.reduce((sum, item) => sum + 1 * item.quantity, 0);
  const courierCost = summary.courierCost;

  // Salvează coșul abandonat când utilizatorul introduce emailul
  const saveAbandonedCart = async (email: string) => {
    if (!email || !email.includes("@") || items.length === 0) return;
    try {
      await fetch("/api/abandoned-cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          phone: form.phone,
          items: items.map(i => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity, image: i.image })),
          total: summary.totalCuTVA
        })
      });
    } catch (e) {
      console.log("Abandoned cart save failed:", e);
    }
  };

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
    // Sincronizează metoda de plată în localStorage la schimbare
    if (e.target.name === 'paymentMethod') {
      localStorage.setItem('checkout_paymentMethod', e.target.value);
    }
    // Salvează coșul abandonat când se introduce emailul
    if (e.target.name === 'email' && e.target.value.includes("@")) {
      saveAbandonedCart(e.target.value);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
      // ...existing code...
      // (Mutat) Calcul și log pentru itemsWithDiscount exact înainte de fetch
      // ...existing code...
    e.preventDefault();
    // DEBUG: Logare structura items și localStorage
    let effectiveItems = items;
    if ((!items || items.length === 0) && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('checkout_items');
        if (stored) {
          effectiveItems = JSON.parse(stored);
        }
      } catch (e) {
        effectiveItems = [];
      }
    }
    if (typeof window !== 'undefined') {
      console.log('[DEBUG] items din context:', contextItems);
      console.log('[DEBUG] checkout_items din localStorage:', localStorage.getItem('checkout_items'));
      console.log('[DEBUG] items folosite la submit:', effectiveItems);
      console.log('[DEBUG] checkout_client din localStorage:', localStorage.getItem('checkout_client'));
      console.log('[DEBUG] checkout_courierCost din localStorage:', localStorage.getItem('checkout_courierCost'));
      console.log('[DEBUG] checkout_deliveryType din localStorage:', localStorage.getItem('checkout_deliveryType'));
    }
      // ...existing code...
    // Validare câmpuri obligatorii
    const requiredFields = [
      { key: 'email', label: 'Email' },
      { key: 'address', label: 'Adresă de livrare' },
      { key: 'phone', label: 'Telefon' },
      { key: 'postalCode', label: 'Cod poștal' },
      { key: 'city', label: 'Oraș' },
      { key: 'county', label: 'Județ' }
    ];
    if (typeof window !== 'undefined') {
      // Forțez mapare dublă pentru localStorage
      let clientToSave;
      if (form.clientType === "companie") {
        clientToSave = {
          ...form,
          denumire: form.companyName,
          name: form.companyName,
          companyName: form.companyName
        };
      } else {
        clientToSave = {
          ...form,
          name: form.name,
          denumire: form.name
        };
      }
      // checkout_items se salvează mai târziu din itemsWithDiscount (cu appliedCoupon)
      localStorage.setItem('checkout_client', JSON.stringify(clientToSave));
      localStorage.setItem('checkout_courierCost', JSON.stringify(courierCost));
      localStorage.setItem('checkout_deliveryType', deliveryType);
      localStorage.setItem('checkout_paymentMethod', paymentMethod); // Asigură persistarea metodei de plată
      console.log('[DEBUG] checkout_courierCost salvat:', courierCost);
      console.log('[DEBUG] checkout_paymentMethod salvat:', paymentMethod);
    }
    if (form.clientType === 'companie') {
      requiredFields.unshift({ key: 'companyName', label: 'Denumire firmă' });
      requiredFields.push({ key: 'cui', label: 'CIF' }, { key: 'reg', label: 'RC' }, { key: 'iban', label: 'Cont IBAN' }, { key: 'bank', label: 'Banca' });
    } else {
      requiredFields.unshift({ key: 'name', label: 'Nume complet' });
    }
    const missing = requiredFields.filter(f => !(form as Record<string, string>)[f.key] || String((form as Record<string, string>)[f.key]).trim() === '');
    if (missing.length > 0) {
      setError(`Completează câmpul: ${missing.map(f => f.label).join(', ')}`);
      return;
    }
    setError("");
    // Forțez mapare dublă pentru backend/email/PDF
    let clientData;
    if (form.clientType === "companie") {
      clientData = {
        ...form,
        denumire: form.companyName,
        name: form.companyName,
        companyName: form.companyName
      };
    } else {
      clientData = {
        ...form,
        name: form.name,
        denumire: form.name
      };
    }
    // Transmit deliveryType explicit, fără fallback, la orice submit
    const deliveryTypeToSend = typeof deliveryType === 'string' ? deliveryType : '';
    if (["rate", "ramburs", "transfer", "card"].includes(paymentMethod)) {
      const endpoint = paymentMethod === "card" ? "/api/create-checkout-session" : "/api/order-complete";
      // DEBUG: loghează userEmail înainte de submit
      console.log("DEBUG userEmail trimis:", form.email);
      // Adaugă discountedPrice la fiecare item dacă există discount/cupon
      // Păstrează o singură declarație pentru itemsWithDiscount, exact înainte de fetch
      // Atașează automat cuponul global pe fiecare item dacă există
      let globalAppliedCoupon = null;
      if (typeof window !== 'undefined') {
        try {
          // Prima sursă: cart_appliedCoupon (salvat explicit când se aplică cuponul)
          const storedCoupon = localStorage.getItem('cart_appliedCoupon');
          if (storedCoupon) {
            globalAppliedCoupon = JSON.parse(storedCoupon);
          }
          // A doua sursă: din cart_items dacă nu s-a găsit
          if (!globalAppliedCoupon) {
            const stored = localStorage.getItem('cart_items');
            if (stored) {
              const parsed = JSON.parse(stored);
              if (Array.isArray(parsed) && parsed.length > 0) {
                for (const it of parsed) {
                  if (it.appliedCoupon) {
                    globalAppliedCoupon = it.appliedCoupon;
                    break;
                  }
                }
              }
            }
          }
        } catch {}
      }
      console.log('[DEBUG] globalAppliedCoupon:', globalAppliedCoupon);
      const itemsWithDiscount = effectiveItems.map((item: any) => {
        // NU aplicăm item.discount - prețul din item.price este deja cu reducerea aplicată
        let priceAfterProductDiscount = item.price;
        let productDiscount = 0;
        
        // Aplică cuponul pe preț (reducerea e deja inclusă în price)
        let appliedCoupon = item.appliedCoupon || globalAppliedCoupon || null;
        let couponDiscount = 0;
        let discountedPrice = priceAfterProductDiscount;
        
        if (appliedCoupon) {
          if (appliedCoupon.type === 'percent') {
            let percent = appliedCoupon.value;
            if (percent > 1) percent = percent / 100;
            couponDiscount = priceAfterProductDiscount * percent;
          } else if (appliedCoupon.type === 'fixed') {
            couponDiscount = appliedCoupon.value;
          }
          discountedPrice = priceAfterProductDiscount - couponDiscount;
        }
        
        if (discountedPrice < 0) discountedPrice = 0;
        discountedPrice = Math.round(discountedPrice * 100) / 100;
        
        console.log('[DEBUG] Item:', item.name, 'price:', item.price, 'productDiscount:', productDiscount, 'couponDiscount:', couponDiscount, 'discountedPrice:', discountedPrice);
        
        return { ...item, discountedPrice, appliedCoupon, productDiscount, couponDiscount };
      });
      // DEBUG: loghează structura itemelor cu discount înainte de POST
      console.log('[DEBUG] itemsWithDiscount trimise la backend:', itemsWithDiscount);
      // DEBUG: loghează structura itemelor cu discount înainte de POST
      console.log('[DEBUG] itemsWithDiscount trimise la backend:', itemsWithDiscount);
      // Salvez itemsWithDiscount (cu appliedCoupon) în localStorage pentru stripe-success
      if (typeof window !== 'undefined') {
        localStorage.setItem('checkout_items', JSON.stringify(itemsWithDiscount));
      }
      // Adaugă manualOrderId dacă există în localStorage/context
      let manualOrderId = undefined;
      if (typeof window !== 'undefined') {
        manualOrderId = localStorage.getItem('checkout_manualOrderId');
        if (manualOrderId && manualOrderId.match(/^\d+$/)) {
          manualOrderId = Number(manualOrderId);
        }
      }
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: itemsWithDiscount,
          products: itemsWithDiscount,
          client: clientData,
          userEmail: form.email,
          courierCost,
          deliveryType: deliveryTypeToSend,
          paymentMethod,
          tvaPercent: 21,
          manualOrderId: manualOrderId || undefined,
          language
        })
      });
      if (paymentMethod === "card") {
        let data: any = {};
        try {
          const text = await res.text();
          data = text ? JSON.parse(text) : {};
        } catch {
          alert("Eroare la inițializarea plății online.");
          return;
        }
        if (res.ok && data.url) {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('checkout_manualOrderId');
          }
          window.location.href = data.url;
        } else {
          alert(data.error || "Eroare la inițializarea plății online.");
        }
      } else {
        if (res.ok) {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('checkout_manualOrderId');
          }
          clearCart();
          setSubmitted(true);
        } else {
          let data: any = {};
          try {
            const text = await res.text();
            data = text ? JSON.parse(text) : {};
          } catch {
            alert("Eroare la procesarea comenzii.");
            return;
          }
          const errMsg = (data && typeof data === 'object' && 'error' in data ? data.error : undefined) || "Eroare la procesarea comenzii.";
          setError(errMsg);
          if (errMsg.toLowerCase().includes("stoc insuficient")) return;
          alert(errMsg);
        }
      }
    }
  }

  if (submitted) {
    return (
      <div className="max-w-xl mx-auto mt-10 p-6 bg-white rounded-xl shadow">
        <h1 className="text-2xl font-bold mb-4 text-green-700">{txt.orderPlaced}</h1>
        <p>{txt.thankYou}</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto mt-10 p-6 bg-white rounded-xl shadow">
      {error && (
        <div className={`mb-4 text-center text-sm ${isStockError ? 'bg-red-100 text-red-700 border border-red-300 rounded px-4 py-2' : 'text-red-700'}`}>
          {error}
          <button className="ml-4 px-2 py-1 bg-blue-600 text-white rounded" onClick={() => setError("")}>{txt.close}</button>
        </div>
      )}
      <form className="space-y-4 mb-8" onSubmit={handleSubmit}>
        {language === "en" && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
            Prices are displayed in RON (Romanian Leu). International cards are automatically converted by your bank.
          </div>
        )}
        {/* Notificare prețuri orientative */}
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-300 rounded text-sm text-yellow-800">
          ⚠️ {txt.priceConfirmation}
        </div>
        <div className="flex gap-2 items-center mt-4">
          <label className="font-medium">{txt.paymentMethod}</label>
          <select name="paymentMethod" value={paymentMethod} onChange={handleChange} className="border rounded px-2 py-1">
            {/* Card dezactivat temporar - prețuri orientative */}
            {/* <option value="card">{txt.cardOnline}</option> */}
            {!hasOnDemandProducts && <option value="ramburs">{txt.cashOnDelivery}</option>}
            <option value="transfer">{txt.bankTransfer}</option>
            {/* Rate dezactivate temporar - prețuri orientative */}
            {/* {!hasOnDemandProducts && <option value="rate">{txt.installments}</option>} */}
          </select>
          {/* Ascuns temporar - card/rate dezactivate global */}
          {/* {hasOnDemandProducts && (
            <span className="text-xs text-orange-600 ml-2">{txt.onDemandNoRamburs}</span>
          )} */}
        </div>
        <h2 className="text-xl font-bold mb-2">{txt.clientData}</h2>
        <div className="flex gap-4">
          <label className="font-medium">{txt.clientType}</label>
          <select name="clientType" value={form.clientType} onChange={handleChange} className="border rounded px-2 py-1">
            <option value="fizica">{txt.individual}</option>
            <option value="companie">{txt.company}</option>
          </select>
        </div>
        {form.clientType === "companie" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block font-medium mb-1" htmlFor="companyName">{txt.companyName}</label>
              <input id="companyName" name="companyName" type="text" placeholder={txt.companyName} className="w-full border rounded px-3 py-2" value={form.companyName} onChange={handleChange} />
            </div>
            <div>
              <label className="block font-medium mb-1" htmlFor="cui">{txt.cui}</label>
              <input id="cui" name="cui" type="text" placeholder={txt.cui} className="w-full border rounded px-3 py-2" value={form.cui} onChange={handleChange} />
            </div>
            <div>
              <label className="block font-medium mb-1" htmlFor="reg">{txt.reg}</label>
              <input id="reg" name="reg" type="text" placeholder={txt.reg} className="w-full border rounded px-3 py-2" value={form.reg} onChange={handleChange} />
            </div>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {form.clientType !== "companie" && (
            <div>
              <label className="block font-medium mb-1" htmlFor="name">{txt.fullName}</label>
              <input id="name" name="name" type="text" placeholder={txt.fullName} className="w-full border rounded px-3 py-2" value={form.name} onChange={handleChange} />
            </div>
          )}
          <div>
            <label className="block font-medium mb-1" htmlFor="email">{txt.email}</label>
            <input id="email" name="email" type="email" placeholder={txt.email} className="w-full border rounded px-3 py-2" value={form.email} onChange={handleChange} />
          </div>
          <div>
            <label className="block font-medium mb-1" htmlFor="phone">{txt.phone}</label>
            <input id="phone" name="phone" type="tel" placeholder={txt.phone} className="w-full border rounded px-3 py-2" value={form.phone} onChange={handleChange} />
          </div>
          <div>
            <label className="block font-medium mb-1" htmlFor="iban">{txt.iban}</label>
            <input id="iban" name="iban" type="text" placeholder={txt.iban} className="w-full border rounded px-3 py-2" value={form.iban} onChange={handleChange} />
          </div>
          <div>
            <label className="block font-medium mb-1" htmlFor="bank">{txt.bank}</label>
            <input id="bank" name="bank" type="text" placeholder={txt.bank} className="w-full border rounded px-3 py-2" value={form.bank} onChange={handleChange} />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block font-medium mb-1" htmlFor="address">{txt.deliveryAddress}</label>
            <input id="address" name="address" type="text" placeholder={txt.deliveryAddress} className="w-full border rounded px-3 py-2" value={form.address} onChange={handleChange} />
          </div>
          <div>
            <label className="block font-medium mb-1" htmlFor="postalCode">{txt.postalCode}</label>
            <input id="postalCode" name="postalCode" type="text" placeholder={txt.postalCode} className="w-full border rounded px-3 py-2" value={form.postalCode} onChange={handleChange} />
          </div>
          <div>
            <label className="block font-medium mb-1" htmlFor="city">{txt.city}</label>
            <input id="city" name="city" type="text" placeholder={txt.city} className="w-full border rounded px-3 py-2" value={form.city} onChange={handleChange} />
          </div>
          <div>
            <label className="block font-medium mb-1" htmlFor="county">{txt.county}</label>
            <input id="county" name="county" type="text" placeholder={txt.county} className="w-full border rounded px-3 py-2" value={form.county} onChange={handleChange} />
          </div>
        </div>
        {error && <div className="text-red-600 font-semibold">{error}</div>}
        <div className="flex gap-4 mt-6">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="flex-1 py-3 rounded-xl font-bold text-lg shadow bg-gray-200 hover:bg-gray-300 text-gray-700 transition"
          >
            {txt.back}
          </button>
          <button
            type="submit"
            className="flex-1 py-3 rounded-xl font-bold text-lg shadow bg-blue-700 hover:bg-blue-800 text-white transition"
            disabled={items.length === 0}
          >
            {txt.finishOrder}
          </button>
        </div>
        <div className="text-center text-gray-600 mt-2 text-sm">{txt.emailNote}</div>
      </form>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense>
      <CheckoutPageInner />
    </Suspense>
  );
}
