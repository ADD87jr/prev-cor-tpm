"use client";


import Link from "next/link";
import { useCart } from "../_components/CartContext";
import { useState } from "react";
import { useSession } from "next-auth/react";
import React from "react";
import { calculateCartSummary } from "../utils/cartSummary";
import { useLanguage } from "../_components/LanguageContext";

function CartPageInner() {
    const { language } = useLanguage();
    
    // Traduceri pentru cart
    const txt = {
      pageTitle: language === "en" ? "Shopping Cart" : "Coșul de cumpărături",
      emptyCart: language === "en" ? "Your cart is empty." : "Coșul tău este momentan gol.",
      backToShop: language === "en" ? "Back to shop" : "Înapoi la magazin",
      orderSuccess: language === "en" ? "Order processed successfully! You will receive the invoice by email." : "Comanda a fost procesată cu succes! Vei primi factura pe email.",
      product: language === "en" ? "Product" : "Produs",
      quantity: language === "en" ? "Quantity" : "Cantitate",
      salePrice: language === "en" ? "Sale price" : "Preț de vânzare",
      productDiscount: language === "en" ? "Product discount" : "Reducere produs",
      couponDiscount: language === "en" ? "Coupon discount" : "Reducere cupon",
      finalPrice: language === "en" ? "Final price" : "Preț final",
      subtotal: language === "en" ? "Subtotal" : "Subtotal",
      remove: language === "en" ? "Remove" : "Șterge",
      addMoreProducts: language === "en" ? "+ Add more products" : "+ Adaugă și alte produse",
      cartSummary: language === "en" ? "Cart summary" : "Sumar coș",
      haveCoupon: language === "en" ? "Have a promo code? Example:" : "Ai un cod promoțional? Exemplu:",
      couponPlaceholder: language === "en" ? "Coupon code" : "Cod de cupon",
      applyCoupon: language === "en" ? "Apply coupon" : "Aplică cupon",
      enterCoupon: language === "en" ? "Enter a coupon code!" : "Introdu un cod de cupon!",
      couponApplied: language === "en" ? "Coupon applied:" : "Cupon aplicat:",
      couponInvalid: language === "en" ? "Invalid or expired coupon!" : "Cupon invalid sau expirat!",
      subtotalSalePrice: language === "en" ? "Subtotal sale price" : "Subtotal preț de vânzare",
      totalProductDiscount: language === "en" ? "Total product discount" : "Reducere totală produse",
      totalCouponDiscount: language === "en" ? "Total coupon discount" : "Reducere totală cupon",
      subtotalAfterDiscounts: language === "en" ? "Subtotal after discounts" : "Subtotal după reduceri",
      courierCost: language === "en" ? "Courier cost" : "Cost curier",
      paymentMethod: language === "en" ? "Payment method" : "Metodă de plată",
      totalNoVat: language === "en" ? "Total without VAT" : "Total fără TVA",
      vat: language === "en" ? "VAT" : "TVA",
      totalWithVat: language === "en" ? "Total with VAT" : "Total cu TVA",
      delivery: language === "en" ? "Delivery" : "Livrare",
      estimatedWeight: language === "en" ? "Estimated weight" : "Greutate estimată",
      continueToCheckout: language === "en" ? "Continue to checkout" : "Continuă către checkout",
      cardOnline: language === "en" ? "card online" : "card online",
      cashOnDelivery: language === "en" ? "cash on delivery" : "ramburs la livrare",
      bankTransfer: language === "en" ? "bank transfer" : "transfer bancar",
      installments: language === "en" ? "installments" : "plată în rate",
      standard: language === "en" ? "Standard (1-3 days)" : "Standard (1-3 zile, 25 lei + 1 leu/kg)",
      rapid: language === "en" ? "Rapid (24h)" : "Rapid (24h, 40 lei + 1 leu/kg)",
      pickup: language === "en" ? "Pickup from office (free)" : "Ridicare de la sediu (0 lei)",
      clientShipping: language === "en" ? "Client shipping account (free)" : "Expediere pe cont client (0 lei)",
      pickupLabel: language === "en" ? "(Pickup from office)" : "(Ridicare de la sediu)",
      clientLabel: language === "en" ? "(Client shipping account)" : "(Expediere pe cont client)",
      standardLabel: language === "en" ? "(Standard)" : "(Standard)",
      rapidLabel: language === "en" ? "(Rapid)" : "(Rapid)",
    };

    const [deliveryType, setDeliveryType] = useState("standard");
    const [coupon, setCoupon] = useState("");
    const [couponStatus, setCouponStatus] = useState<any>(null);
    const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
    const [showCouponField, setShowCouponField] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState("card");
    const [pdfReady, setPdfReady] = useState(false);
    const [downloading, setDownloading] = useState(false);
  const { items, removeFromCart, clearCart, updateQuantity, updateCoupon, updateAppliedCoupon } = useCart();
  // NU încărcăm cuponul din localStorage automat - utilizatorul trebuie să-l introducă manual
  // Cuponul se salvează în localStorage doar pentru a fi transmis la checkout
  const totalWeight = items.reduce((sum, item) => sum + 1 * item.quantity, 0);
  // Sincronizare context-localStorage la mount: dacă localStorage e gol și contextul are iteme, golește contextul
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('cart_items');
      if ((!stored || stored === '[]') && items.length > 0) {
        clearCart();
      }
      // Șterge cuponul vechi dacă coșul este gol (începe sesiune nouă)
      if (!stored || stored === '[]') {
        localStorage.removeItem('cart_appliedCoupon');
      }
    }
    // rulează o singură dată la mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Încarcă cuponul aplicat din items (la mount)
  React.useEffect(() => {
    const itemWithCoupon = items.find(i => i.appliedCoupon);
    if (itemWithCoupon?.appliedCoupon && !appliedCoupon) {
      setAppliedCoupon(itemWithCoupon.appliedCoupon);
    }
  }, [items, appliedCoupon]);
  
  const { data: session } = useSession();
  // TVA configurabil din admin
  const [TVA_PERCENT, setTvaPercent] = useState(21);
  const [showOrderSuccess, setShowOrderSuccess] = useState(false);
  const [catalogProducts, setCatalogProducts] = useState<any[]>([]);
  // Verifică dacă există produse pe comandă (onDemand) în coș
  const [hasOnDemandProducts, setHasOnDemandProducts] = useState(false);
  
  // Încarcă TVA din setările admin
  React.useEffect(() => {
    fetch('/api/pages?pagina=cos')
      .then(res => res.json())
      .then(data => {
        if (data && data.tva !== undefined) {
          setTvaPercent(Number(data.tva));
        }
      })
      .catch(() => {});
  }, []);
  
  // Verifică onDemand din DB pentru produsele din coș
  React.useEffect(() => {
    const checkOnDemand = async () => {
      if (!items || items.length === 0) {
        setHasOnDemandProducts(false);
        return;
      }
      
      // Verifică direct din flag-urile din coș (dacă există)
      const hasFromCart = items.some(item => item.onDemand === true);
      if (hasFromCart) {
        setHasOnDemandProducts(true);
        // Schimbă metoda de plată dacă e ramburs
        if (paymentMethod === 'ramburs' || paymentMethod === 'rate') setPaymentMethod('card');
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
          // Schimbă metoda de plată dacă e ramburs și sunt produse onDemand
          if (data.hasOnDemand && (paymentMethod === 'ramburs' || paymentMethod === 'rate')) setPaymentMethod('card');
        }
      } catch (e) {
        console.log('onDemand check failed:', e);
      }
    };
    checkOnDemand();
  }, [items, paymentMethod]);

  React.useEffect(() => {
    fetch('/api/products')
      .then(res => res.json())
      .then(data => setCatalogProducts(Array.isArray(data) ? data : []));
  }, []);


  const summaryProducts = Array.isArray(items) ? items.map(item => {
    const catalogProduct = catalogProducts.find(p => p.id === item.id);
    return {
      id: item.id,
      name: item.name,
      price: catalogProduct ? catalogProduct.price : item.price,
      quantity: item.quantity,
      discount: catalogProduct ? catalogProduct.discount : item.discount,
      discountType: catalogProduct ? catalogProduct.discountType : undefined,
      appliedCoupon: appliedCoupon || item.appliedCoupon || null,
      deliveryTime: catalogProduct ? catalogProduct.deliveryTime : item.deliveryTime,
    };
  }) : [];

  const summary = calculateCartSummary({
    products: summaryProducts,
    deliveryType,
    paymentMethod,
    TVA_PERCENT,
  });
  // Subtotal, discount, cost curier, totaluri din utilitar
  const subtotal = summary.subtotal;
  const subtotalDupaReduceri = summary.subtotalDupaReduceri;
  const discount = summary.discount;
  const courierCost = summary.courierCost;
  const totalFaraTVA = summary.totalFaraTVA;
  const totalTVA = summary.tva;
  const total = summary.totalCuTVA;
  // Mută calculul sumarului după definirea deliveryType/paymentMethod
  return (
    <main className="container mx-auto py-10 px-4">
      {showOrderSuccess && (
        <div className="mt-6 mb-8 p-4 bg-green-100 border border-green-300 rounded text-green-800 text-lg font-bold text-center">
          {txt.orderSuccess}
        </div>
      )}
      {items.length === 0 ? (
        <div>
          <div className="mb-6 text-gray-600">{txt.emptyCart}</div>
          <Link href="/shop" className="text-blue-600 hover:underline">{txt.backToShop}</Link>
        </div>
      ) : (
        <div>
          <h1 className="text-3xl font-bold mb-6">{txt.pageTitle}</h1>
          <div className="mb-6">
            <table className="w-full text-left border rounded-lg overflow-hidden">
              <thead className="bg-blue-50">
                <tr>
                  <th className="p-2">Nr.</th>
                  <th className="p-2">{txt.product}</th>
                  <th className="p-2">{txt.quantity}</th>
                  <th className="p-2">{txt.salePrice}</th>
                  {appliedCoupon && <th className="p-2">{txt.couponDiscount}</th>}
                  <th className="p-2">{txt.finalPrice}</th>
                  <th className="p-2">{txt.subtotal}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const catalogProduct = catalogProducts.find(p => p.id === item.id);
                  const price = catalogProduct ? catalogProduct.price : item.price;
                  const listPrice = catalogProduct?.listPrice;
                  const discount = catalogProduct?.discount;
                  const hasDiscount = listPrice && listPrice > price;
                  // NU aplicăm discount suplimentar - prețul deja include reducerea
                  let priceAfterProductDiscount = price;
                  let couponDiscount = 0;
                  let priceAfterCoupon = priceAfterProductDiscount;
                  let cuponToApply = appliedCoupon || item.appliedCoupon;
                  if (cuponToApply) {
                    if (cuponToApply.type === "percent") {
                      const percent = cuponToApply.value <= 1 ? cuponToApply.value * 100 : cuponToApply.value;
                      couponDiscount = priceAfterProductDiscount * (percent / 100);
                    } else {
                      couponDiscount = cuponToApply.value;
                    }
                    priceAfterCoupon = priceAfterProductDiscount - couponDiscount;
                  }
                  if (priceAfterCoupon < 0) priceAfterCoupon = 0;
                  return (
                    <tr key={`${item.id}-${item.variantId || 'main'}`} className="border-b">
                      <td className="p-2 text-center">{idx + 1}</td>
                      <td className="p-2 font-medium">
                        {language === "en" && item.nameEn ? item.nameEn : item.name}
                        {item.variantCode && (
                          <div className="text-xs text-blue-600 mt-1">
                            Varianta: <span className="font-semibold">{item.variantCode}</span>
                            {item.variantInfo && <span className="text-gray-500 ml-1">({item.variantInfo})</span>}
                          </div>
                        )}
                      </td>
                      <td className="p-2 text-center">
                        <div className="flex items-center gap-2 justify-center">
                          <button className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300" onClick={() => updateQuantity(item.id, item.quantity - 1, item.variantId)} disabled={item.quantity <= 1}>-</button>
                          <span className="inline-block w-6 text-center">{item.quantity}</span>
                          <button className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300" onClick={() => updateQuantity(item.id, item.quantity + 1, item.variantId)}>+</button>
                        </div>
                      </td>
                      <td className="p-2">
                        <div className="flex flex-col">
                          {hasDiscount && (
                            <span className="text-sm text-gray-400 line-through">{listPrice.toFixed(2)} RON</span>
                          )}
                          <span className="font-semibold">{price.toFixed(2)} RON</span>
                          {hasDiscount && discount && (
                            <span className="text-xs text-green-600 font-medium">(-{discount}%)</span>
                          )}
                        </div>
                      </td>
                      {appliedCoupon && (
                        <td className="p-2">
                          {couponDiscount > 0 ? (
                            <span className="font-bold text-blue-700">-{couponDiscount.toFixed(2)} RON</span>
                          ) : (
                            <span>-</span>
                          )}
                        </td>
                      )}
                      <td className="p-2 font-bold text-green-700">{priceAfterCoupon.toFixed(2)} RON</td>
                      <td className="p-2 font-semibold">{(priceAfterCoupon * item.quantity).toFixed(2)} RON</td>
                      <td className="p-2">
                        <button onClick={() => removeFromCart(item.id, item.variantId)} className="text-red-600 hover:underline">{txt.remove}</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <Link href="/shop" className="bg-green-600 text-white px-4 py-2 rounded font-semibold hover:bg-green-700 transition mt-4 block">{txt.addMoreProducts}</Link>
          </div>
          <div className="border-t pt-4">
            <h2 className="font-bold mb-2">{txt.cartSummary}</h2>
            {/* Câmp cupon - expandabil */}
            {!appliedCoupon && !showCouponField ? (
              <button
                type="button"
                className="text-blue-600 hover:underline text-sm mb-4"
                onClick={() => setShowCouponField(true)}
              >
                {txt.haveCoupon}
              </button>
            ) : !appliedCoupon ? (
              <div className="flex flex-col md:flex-row gap-2 items-center mb-4">
                <input
                  type="text"
                  value={coupon}
                  onChange={e => setCoupon(e.target.value)}
                  placeholder={txt.couponPlaceholder}
                  className="border rounded px-3 py-2 w-full md:w-64"
                />
                <button
                  type="button"
                  className="bg-blue-600 text-white px-4 py-2 rounded font-semibold hover:bg-blue-700 transition"
                  onClick={() => {
                    if (!coupon) {
                      setCouponStatus({ success: false, message: txt.enterCoupon });
                      return;
                    }
                    if (coupon === "REDUCERE10") {
                      setCouponStatus({ success: true, message: `${txt.couponApplied} 10%!` });
                      const couponData = { type: "percent", value: 10 };
                      setAppliedCoupon(couponData);
                      localStorage.setItem('cart_appliedCoupon', JSON.stringify(couponData));
                      items.forEach(item => updateAppliedCoupon(item.id, couponData));
                    } else if (coupon === "REDUCERE5") {
                      setCouponStatus({ success: true, message: `${txt.couponApplied} 5 RON!` });
                      const couponData = { type: "fixed", value: 5 };
                      setAppliedCoupon(couponData);
                      localStorage.setItem('cart_appliedCoupon', JSON.stringify(couponData));
                      items.forEach(item => updateAppliedCoupon(item.id, couponData));
                    } else {
                      setCouponStatus({ success: false, message: txt.couponInvalid });
                      setAppliedCoupon(null);
                      localStorage.removeItem('cart_appliedCoupon');
                      items.forEach(item => updateAppliedCoupon(item.id, null));
                    }
                  }}
                >
                  {txt.applyCoupon}
                </button>
                <button
                  type="button"
                  className="text-gray-500 hover:text-gray-700 text-sm"
                  onClick={() => setShowCouponField(false)}
                >
                  ✕
                </button>
              </div>
            ) : null}
            {couponStatus && (
              <div className={`mb-4 text-sm font-semibold ${couponStatus.success ? 'text-green-700' : 'text-red-600'}`}>{couponStatus.message}</div>
            )}
            {/* Afișare cupon aplicat */}
            {(appliedCoupon || items.some(i => i.appliedCoupon)) && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded flex items-center justify-between">
                <span className="text-green-700 font-semibold">
                  ✓ Cupon aplicat: {appliedCoupon?.type === 'percent' ? `${appliedCoupon?.value}%` : appliedCoupon?.type === 'fixed' ? `${appliedCoupon?.value} RON` : 'activ'}
                </span>
                <button
                  type="button"
                  className="text-red-600 hover:text-red-800 font-semibold text-sm"
                  onClick={() => {
                    setAppliedCoupon(null);
                    setCoupon('');
                    setCouponStatus(null);
                    localStorage.removeItem('cart_appliedCoupon');
                    items.forEach(item => updateAppliedCoupon(item.id, null));
                  }}
                >
                  ✕ Elimină cupon
                </button>
              </div>
            )}
            {language === "en" && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                Prices are displayed in RON (Romanian Leu). International cards are automatically converted by your bank.
              </div>
            )}
            <div className="font-bold text-right text-gray-900">{txt.subtotalSalePrice}: {subtotal.toFixed(2)} lei</div>
            {summary.totalCouponDiscount > 0 && (
              <div className="font-bold text-right text-blue-700">{txt.totalCouponDiscount}: -{summary.totalCouponDiscount.toFixed(2)} lei</div>
            )}
            {summary.totalCouponDiscount > 0 && (
              <div className="font-bold text-right text-green-700">{txt.subtotalAfterDiscounts}: {subtotalDupaReduceri.toFixed(2)} lei</div>
            )}
            <div className="font-bold text-right">{txt.courierCost}: {courierCost.toFixed(2)} lei
              {(() => {
                switch (deliveryType) {
                  case 'pickup': return ` ${txt.pickupLabel}`;
                  case 'client': return ` ${txt.clientLabel}`;
                  case 'standard': return ` ${txt.standardLabel}`;
                  case 'rapid': return ` ${txt.rapidLabel}`;
                  default: return '';
                }
              })()}
            </div>
            <div className="font-bold text-right mt-1">
              {txt.paymentMethod}: {paymentMethod === "card" && txt.cardOnline}
              {paymentMethod === "ramburs" && txt.cashOnDelivery}
              {paymentMethod === "transfer" && txt.bankTransfer}
              {paymentMethod === "rate" && txt.installments}
            </div>
            <div className="font-bold text-right text-blue-900">{txt.totalNoVat}: {totalFaraTVA.toFixed(2)} lei</div>
            <div className="font-bold text-right text-blue-900">{txt.vat} ({TVA_PERCENT}%): {totalTVA.toFixed(2)} lei</div>
            <div className="font-bold text-right">{txt.totalWithVat}: {total.toFixed(2)} lei</div>
            <div className="flex gap-2 items-center mt-4">
              <label className="font-medium">{txt.paymentMethod}:</label>
              <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="border rounded px-2 py-1">
                <option value="card">{language === "en" ? "Card online" : "Card online"}</option>
                {!hasOnDemandProducts && <option value="ramburs">{language === "en" ? "Cash on delivery" : "Ramburs la livrare"}</option>}
                <option value="transfer">{language === "en" ? "Bank transfer" : "Transfer bancar"}</option>
                {!hasOnDemandProducts && <option value="rate">{language === "en" ? "Installments" : "Plată în rate"}</option>}
              </select>
              {hasOnDemandProducts && (
                <span className="ml-2 text-xs text-orange-600">
                  {language === "en" ? "COD/Installments not available for on-demand products" : "Ramburs/Rate indisponibile pt. produse pe comandă"}
                </span>
              )}
            </div>
            <div className="flex gap-2 items-center mt-2">
              <label className="font-medium">{txt.delivery}:</label>
              <select value={deliveryType} onChange={e => setDeliveryType(e.target.value)} className="border rounded px-2 py-1">
                <option value="standard">{txt.standard}</option>
                <option value="rapid">{txt.rapid}</option>
                <option value="pickup">{txt.pickup}</option>
                <option value="client">{txt.clientShipping}</option>
              </select>
              <span className="ml-2 text-gray-500">{txt.estimatedWeight}: {totalWeight} kg</span>
            </div>
            <Link
              href={`/checkout?paymentMethod=${paymentMethod}&deliveryType=${deliveryType}`}
              className="w-full block bg-green-600 text-white py-3 rounded-xl font-bold text-lg shadow hover:bg-green-700 transition mt-6 text-center"
              style={{ pointerEvents: items.length === 0 ? 'none' : undefined, opacity: items.length === 0 ? 0.5 : 1 }}
            >
              {txt.continueToCheckout}
            </Link>
          </div>
        </div>
      )}
    </main>
  );

  // După plată, dacă userul e logat, trimite comanda și emailul cu factură


  async function handleDownloadInvoice() {
    setDownloading(true);
    try {
      // Exemplu: date client fictive, poți integra cu date reale dacă ai formular
      const client = { nume: "Client Online", email: "client@email.com" };
      const res = await fetch("/api/proforma", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client, items }),
      });
      if (!res.ok) throw new Error("Eroare la generarea facturii.");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "factura-proforma.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("Eroare la descărcarea facturii proforme.");
    } finally {
      setDownloading(false);
    }
  }

}

export default function CartPage() {
  return <CartPageInner />;
}
