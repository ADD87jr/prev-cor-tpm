"use client";

import { useState } from "react";

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

interface TrackedOrder {
  id: number;
  number: string;
  date: string;
  status: string;
  total: number;
  items: any[];
  awb: string | null;
  courierName: string | null;
  paymentMethod: string | null;
  deliveryType: string | null;
}

const STATUS_STEPS = [
  { key: "awaiting_price", label: "Cerere primită", icon: "📩" },
  { key: "pending", label: "În așteptare", icon: "⏳" },
  { key: "confirmed", label: "Confirmată", icon: "✅" },
  { key: "processing", label: "În procesare", icon: "⚙️" },
  { key: "shipped", label: "Expediată", icon: "🚚" },
  { key: "delivered", label: "Livrată", icon: "📦" },
];

const STATUS_LABELS: Record<string, string> = {
  awaiting_price: "Cerere primită",
  pending: "În așteptare",
  confirmed: "Confirmată",
  processing: "În procesare",
  shipped: "Expediată",
  delivered: "Livrată",
  cancelled: "Anulată",
  refunded: "Rambursată",
};

export default function StatusComandaPage() {
  const [number, setNumber] = useState("");
  const [email, setEmail] = useState("");
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!number.trim() && !email.trim()) return;

    setLoading(true);
    setError("");
    setOrder(null);

    try {
      const params = new URLSearchParams();
      if (number.trim()) params.set("number", number.trim());
      if (email.trim()) params.set("email", email.trim());
      const res = await fetch(`/api/track-order?${params.toString()}`);
      const data = await res.json();

      if (data.orders && data.orders.length > 0) {
        setOrder(data.orders[0]);
      } else if (data.error) {
        setError(data.error);
      } else {
        setError("Comanda nu a fost găsită.");
      }
    } catch {
      setError("Eroare de conexiune. Vă rugăm încercați din nou.");
    } finally {
      setLoading(false);
      setSearched(true);
    }
  };

  const getStepIndex = (status: string) => {
    const idx = STATUS_STEPS.findIndex((s) => s.key === status);
    return idx >= 0 ? idx : -1;
  };

  const isCancelled = order?.status === "cancelled" || order?.status === "refunded";
  const currentStep = order ? getStepIndex(order.status) : -1;

  const items: OrderItem[] = order
    ? (typeof order.items === "string" ? JSON.parse(order.items) : (order.items || [])).map((it: any) => ({
        name: it.name || it.nameRo || it.productName || "-",
        quantity: it.quantity || it.qty || 1,
        price: it.price || 0,
      }))
    : [];

  const fmt = (n: number) => n.toLocaleString("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-center text-blue-900 mb-2">📦 Urmărire Comandă</h1>
        <p className="text-center text-gray-500 mb-8">Introduceți numărul comenzii sau adresa de email pentru a verifica statusul.</p>

        <form onSubmit={handleSearch} className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Număr comandă</label>
              <input
                type="text"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder="Ex: CMD-001"
                className="w-full border rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                autoComplete="off"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@exemplu.ro"
                className="w-full border rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                autoComplete="off"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading || (!number.trim() && !email.trim())}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading ? "Se caută..." : "🔍 Verifică status"}
          </button>
        </form>

        {error && searched && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-center mb-6">
            {error}
          </div>
        )}

        {order && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            {/* Header */}
            <div className="bg-blue-900 text-white p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm opacity-80">Comandă</div>
                  <div className="text-2xl font-bold">#{order.number || order.id}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm opacity-80">Data</div>
                  <div className="font-semibold">{new Date(order.date).toLocaleDateString("ro-RO")}</div>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${
                  isCancelled ? "bg-red-500" : 
                  order.status === "delivered" ? "bg-green-500" : 
                  "bg-blue-500"
                }`}>
                  {STATUS_LABELS[order.status] || order.status}
                </span>
                {order.awb && (
                  <span className="text-sm opacity-80">AWB: <strong>{order.awb}</strong></span>
                )}
              </div>
            </div>

            {/* Timeline */}
            {!isCancelled && (
              <div className="p-6 border-b">
                <h3 className="font-bold text-gray-700 mb-4">Progres comandă</h3>
                <div className="flex items-center justify-between relative">
                  {/* Linia de bază */}
                  <div className="absolute top-5 left-5 right-5 h-0.5 bg-gray-200 z-0" />
                  <div
                    className="absolute top-5 left-5 h-0.5 bg-blue-500 z-0 transition-all duration-500"
                    style={{ width: `${currentStep >= 0 ? (currentStep / (STATUS_STEPS.length - 1)) * (100 - 10) : 0}%` }}
                  />

                  {STATUS_STEPS.map((step, i) => (
                    <div key={step.key} className="flex flex-col items-center z-10 relative" style={{ width: `${100 / STATUS_STEPS.length}%` }}>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg border-2 transition-all ${
                        i <= currentStep
                          ? "bg-blue-500 border-blue-500 text-white"
                          : "bg-white border-gray-300 text-gray-400"
                      } ${i === currentStep ? "ring-4 ring-blue-200 scale-110" : ""}`}>
                        {step.icon}
                      </div>
                      <span className={`text-xs mt-2 text-center font-medium ${
                        i <= currentStep ? "text-blue-700" : "text-gray-400"
                      }`}>
                        {step.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cancelled */}
            {isCancelled && (
              <div className="p-6 border-b bg-red-50">
                <div className="text-center">
                  <div className="text-4xl mb-2">{order.status === "cancelled" ? "❌" : "💰"}</div>
                  <div className="text-lg font-bold text-red-700">
                    {order.status === "cancelled" ? "Comandă anulată" : "Comandă rambursată"}
                  </div>
                </div>
              </div>
            )}

            {/* AWB */}
            {order.awb && (
              <div className="p-6 border-b bg-green-50">
                <h3 className="font-bold text-gray-700 mb-2">🚚 Informații livrare</h3>
                <div className="flex flex-wrap gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Curier:</span>{" "}
                    <strong>{order.courierName || "N/A"}</strong>
                  </div>
                  <div>
                    <span className="text-gray-500">AWB:</span>{" "}
                    <strong className="text-blue-600">{order.awb}</strong>
                  </div>
                </div>
              </div>
            )}

            {/* Produse */}
            {items.length > 0 && (
              <div className="p-6 border-b">
                <h3 className="font-bold text-gray-700 mb-3">Produse comandate</h3>
                <div className="space-y-2">
                  {items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                      <div>
                        <div className="font-medium text-sm">{item.name}</div>
                        <div className="text-xs text-gray-400">Cantitate: {item.quantity}</div>
                      </div>
                      <div className="font-mono text-sm font-bold">{fmt(item.price * item.quantity)} RON</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Total */}
            <div className="p-6 bg-gray-50">
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-gray-700">Total</span>
                <span className="text-xl font-bold text-green-600">{fmt(order.total)} RON</span>
              </div>
              {order.paymentMethod && (
                <div className="text-sm text-gray-400 mt-1">
                  Metodă plată: <span className="capitalize">{order.paymentMethod}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
