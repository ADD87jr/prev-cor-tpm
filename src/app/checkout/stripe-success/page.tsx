
"use client";
import { useEffect, useRef, Suspense } from "react";
import { useCart } from "../../_components/CartContext";
import { useSearchParams } from "next/navigation";
import { useLanguage } from "../../_components/LanguageContext";


function StripeSuccessPageInner() {
  const { clearCart } = useCart();
  const { language } = useLanguage();
  const params = useSearchParams();
  const hasFetched = useRef(false);

  const txt = {
    title: language === "en" ? "Payment processed!" : "Plata a fost procesată!",
    message: language === "en" 
      ? "You will receive a confirmation email with order details and PDF attached." 
      : "Veți primi un email de confirmare cu detaliile comenzii și PDF-ul atașat.",
  };

  useEffect(() => {
    // Previne apelul dublu în React Strict Mode
    if (hasFetched.current) return;
    hasFetched.current = true;

    // Get language from localStorage for robustness after Stripe redirect
    const savedLanguage = typeof window !== 'undefined' ? (localStorage.getItem('site-language') || 'ro') : 'ro';

    const orderId = params?.get("orderId");
    const sessionId = params?.get("session_id"); // Stripe session ID for fallback data retrieval
    let payload;
    if (orderId) {
      const raw = localStorage.getItem(`order_${orderId}`);
      if (raw) {
        try {
          const order = JSON.parse(raw);
          payload = {
            manualOrderId: orderId,
            sessionId, // Include Stripe session ID
            items: order.items || [],
            client: order.client || {},
            userEmail: order.userEmail || order.email || '',
            courierCost: order.courierCost ?? 0,
            deliveryType: order.deliveryType || '',
            paymentMethod: order.paymentMethod || 'card',
            language: savedLanguage,
          };
        } catch (e) {
          payload = { items: [], client: {}, userEmail: '', courierCost: 0, deliveryType: '', paymentMethod: 'card', language: savedLanguage, sessionId };
        }
      } else {
        const items = JSON.parse(localStorage.getItem('checkout_items') || '[]');
        const client = JSON.parse(localStorage.getItem('checkout_client') || '{}');
        const userEmail = client.email || '';
        const courierCost = JSON.parse(localStorage.getItem('checkout_courierCost') || '0');
        const deliveryType = localStorage.getItem('checkout_deliveryType') || '';
        const paymentMethod = 'card';
        payload = { items, client, userEmail, courierCost, deliveryType, paymentMethod, language: savedLanguage, sessionId };
      }
    } else {
      const items = JSON.parse(localStorage.getItem('checkout_items') || '[]');
      const client = JSON.parse(localStorage.getItem('checkout_client') || '{}');
      const userEmail = client.email || '';
      const courierCost = JSON.parse(localStorage.getItem('checkout_courierCost') || '0');
      const deliveryType = localStorage.getItem('checkout_deliveryType') || '';
      const paymentMethod = 'card';
      payload = { items, client, userEmail, courierCost, deliveryType, paymentMethod, language: savedLanguage, sessionId };
    }
    // Loguri suplimentare pentru debug
    console.log('[STRIPE-SUCCESS] checkout_items:', localStorage.getItem('checkout_items'));
    console.log('[STRIPE-SUCCESS] checkout_client:', localStorage.getItem('checkout_client'));
    console.log('[STRIPE-SUCCESS] checkout_courierCost:', localStorage.getItem('checkout_courierCost'));
    console.log('[STRIPE-SUCCESS] checkout_deliveryType:', localStorage.getItem('checkout_deliveryType'));
    console.log('[STRIPE-SUCCESS] Payload trimis:', payload);
    fetch('/api/stripe-success', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    clearCart();
    localStorage.removeItem('checkout_manualOrderId');
    localStorage.removeItem('cart_appliedCoupon'); // Șterge cuponul după finalizarea plății
    if (orderId) {
      localStorage.removeItem(`order_${orderId}`);
    } else {
      localStorage.removeItem('checkout_items');
      localStorage.removeItem('checkout_client');
      localStorage.removeItem('checkout_courierCost');
      localStorage.removeItem('checkout_deliveryType');
    }
    // NU mai redirecționa și nu mai da reload, mesajul rămâne afișat!
  }, [params]);
  return (
    <div className="max-w-xl mx-auto mt-10 p-6 bg-white rounded-xl shadow">
      <h1 className="text-2xl font-bold mb-4 text-green-700">{txt.title}</h1>
      <p>{txt.message}</p>
    </div>
  );
}

export default function StripeSuccessPage() {
  return (
    <Suspense>
      <StripeSuccessPageInner />
    </Suspense>
  );
}
