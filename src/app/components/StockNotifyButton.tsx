"use client";

import { useState } from "react";

interface StockNotifyButtonProps {
  productId: number;
  variantId?: number;
  language?: string;
}

export default function StockNotifyButton({ productId, variantId, language = "ro" }: StockNotifyButtonProps) {
  const [email, setEmail] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const txt = language === "en" ? {
    notify: "Notify me when available",
    email: "Your email",
    subscribe: "Subscribe",
    cancel: "Cancel",
  } : {
    notify: "Anunță-mă când revine în stoc",
    email: "Adresa ta de email",
    subscribe: "Abonează-mă",
    cancel: "Anulează",
  };

  const handleSubscribe = async () => {
    if (!email.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/stock-notification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, productId, variantId }),
      });
      const data = await res.json();
      setMessage(data.message || data.error);
      if (!data.error) {
        setShowForm(false);
        setEmail("");
      }
    } catch {
      setMessage("Eroare de conexiune.");
    } finally {
      setLoading(false);
    }
  };

  if (message) {
    return (
      <div className="text-sm text-green-600 font-medium py-1">
        ✅ {message}
      </div>
    );
  }

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="text-sm text-blue-600 hover:text-blue-800 underline font-medium"
      >
        🔔 {txt.notify}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 mt-1">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={txt.email}
        className="border rounded px-2 py-1 text-sm w-48"
        autoComplete="off"
      />
      <button
        onClick={handleSubscribe}
        disabled={loading || !email.trim()}
        className="bg-blue-600 text-white px-3 py-1 rounded text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "..." : txt.subscribe}
      </button>
      <button
        onClick={() => { setShowForm(false); setEmail(""); }}
        className="text-gray-400 hover:text-gray-600 text-sm"
      >
        {txt.cancel}
      </button>
    </div>
  );
}
