"use client";
import React, { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

export default function PlataCardPage() {
  return (
    <Suspense>
      <PlataCardContent />
    </Suspense>
  );
}

function PlataCardContent() {
  const params = useSearchParams();
  const orderId = params?.get("orderId") || "";
  const amount = params?.get("amount") || "";
  const email = params?.get("email") || "";
  // Preluare date comandă din localStorage (setate la redirect din manual-orders/new/page.tsx)
  const [orderData, setOrderData] = React.useState<any | null>(null);
  const [loadingOrder, setLoadingOrder] = React.useState(true);
  const [defaultTva, setDefaultTva] = React.useState(19);
  
  // Încarcă TVA configurat din admin
  React.useEffect(() => {
    fetch('/admin/api/pagini?pagina=cos')
      .then(res => res.json())
      .then(data => {
        if (data && data.tva !== undefined) {
          setDefaultTva(Number(data.tva));
        }
      })
      .catch(() => {});
  }, []);

  React.useEffect(() => {
    if (typeof window !== "undefined" && orderId) {
      try {
        const raw = window.localStorage.getItem(`order_${orderId}`);
        if (raw) {
          setOrderData(JSON.parse(raw));
        } else {
          setOrderData(null);
        }
      } catch {
        setOrderData(null);
      }
      setLoadingOrder(false);
    }
  }, [orderId]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Inițiază plata Stripe DOAR după ce orderData a fost încărcat și user apasă pe buton
  const handleStripePay = async () => {
    setLoading(true);
    setError("");
    try {
      if (!orderData || !orderData.items || !orderData.client) {
        setError("Datele comenzii nu au fost încărcate corect. Încearcă din nou.");
        setLoading(false);
        return;
      }
      // Transmit discountedPrice și tvaPercent la fel ca la checkout normal
      const items = (orderData.items || orderData.products || []).map((item: any) => {
        // Calculează discountedPrice dacă există discount
        let discountedPrice = item.discountPrice;
        if (typeof discountedPrice !== 'number') {
          if (item.discountType === 'percent' && typeof item.discountPercent === 'number') {
            discountedPrice = item.price * (1 - item.discountPercent / 100);
          } else if (item.discountType === 'fixed' && typeof item.discount === 'number') {
            discountedPrice = item.price - item.discount;
          } else {
            discountedPrice = item.price;
          }
        }
        return { ...item, discountedPrice };
      });
      const tvaPercent = typeof orderData.tva === 'number' ? orderData.tva : defaultTva;
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: orderId,
          manualOrderId: orderId, // trimite id-ul comenzii manuale
          items,
          client: orderData.client || orderData.clientData || {},
          userEmail: orderData.userEmail || orderData.email || email,
          paymentMethod: orderData.paymentMethod || "card online",
          deliveryType: orderData.deliveryType || "standard",
          courierCost: orderData.courierCost ?? 0,
          appliedCoupon: orderData.appliedCoupon || undefined,
          tvaPercent
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || "Eroare la inițierea plății.");
      }
    } catch (err: any) {
      setError(err.message || "Eroare la inițierea plății.");
    }
    setLoading(false);
  };

  return (
    <div className="max-w-xl mx-auto mt-12 p-8 bg-white rounded shadow">
      <h1 className="text-2xl font-bold mb-4">Plata cu cardul</h1>
      <p className="mb-6">Finalizează plata comenzii cu cardul. Vei fi redirecționat către Stripe.</p>
      {loadingOrder ? (
        <div className="text-gray-500">Se încarcă datele comenzii...</div>
      ) : (
        <button
          className="px-6 py-3 bg-green-600 text-white rounded font-bold text-lg disabled:opacity-60"
          onClick={handleStripePay}
          disabled={loading || !orderData || !orderData.items || !orderData.client}
        >{loading ? "Se inițiază plata..." : "Plătește cu cardul"}</button>
      )}
      {error && <div className="mt-4 text-red-600">{error}</div>}
    </div>
  );
}
