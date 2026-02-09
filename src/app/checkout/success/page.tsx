"use client";
import { useEffect, useRef } from "react";
import { useCart } from "../../_components/CartContext";

export default function CheckoutSuccess() {
  const { clearCart } = useCart();
  const cleared = useRef(false);
  useEffect(() => {
    if (!cleared.current) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('checkout_manualOrderId');
        setTimeout(() => {
          clearCart();
          window.location.href = "/cart";
          setTimeout(() => { window.location.reload(); }, 100);
        }, 200);
      }
    }
  }, []);

  return (
    <div style={{ maxWidth: 600, margin: '60px auto', textAlign: 'left', background: '#f7fafd', borderRadius: 16, padding: 24 }}>
      <h1 style={{ color: '#17913a', fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Plata a fost procesată!</h1>
      <p style={{ fontSize: 18, marginTop: 0 }}>
        Veți primi un email de confirmare cu detaliile comenzii și PDF-ul atașat.
      </p>
      <a href="/shop" style={{ display: 'inline-block', marginTop: 32, color: '#2563eb', fontWeight: 600, fontSize: 18 }}>Înapoi la magazin</a>
    </div>
  );
}
