"use client";

import { useState } from "react";

interface OrderInfo {
  id: number;
  number: string | null;
  date: string;
  status: string;
  total: number;
  items: any[];
  awb?: string;
  courierName?: string;
  paymentMethod?: string;
  deliveryType?: string;
}

const STATUS_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  pending: { label: "În așteptare", color: "bg-yellow-100 text-yellow-800", icon: "⏳" },
  processing: { label: "În procesare", color: "bg-blue-100 text-blue-800", icon: "🔄" },
  shipped: { label: "Expediată", color: "bg-purple-100 text-purple-800", icon: "📦" },
  delivered: { label: "Livrată", color: "bg-green-100 text-green-800", icon: "✅" },
  cancelled: { label: "Anulată", color: "bg-red-100 text-red-800", icon: "❌" },
};

// Funcție pentru a genera URL-ul de tracking pentru fiecare curier
function getCourierTrackingUrl(courierName: string, awb: string): string {
  const courier = courierName.toLowerCase();
  
  if (courier.includes("fan") || courier.includes("fancourier")) {
    return `https://www.fancourier.ro/awb-tracking/?awb=${awb}`;
  }
  if (courier.includes("cargus")) {
    return `https://www.cargus.ro/tracking/?awbNumber=${awb}`;
  }
  if (courier.includes("sameday")) {
    return `https://sameday.ro/#awb=${awb}`;
  }
  if (courier.includes("dpd")) {
    return `https://tracking.dpd.ro/?parcelNumber=${awb}`;
  }
  if (courier.includes("gls")) {
    return `https://gls-group.com/RO/ro/urmarire-colete?match=${awb}`;
  }
  if (courier.includes("urgent")) {
    return `https://urgentcargus.ro/tracking.aspx?t=${awb}`;
  }
  
  // Generic - Google search
  return `https://www.google.com/search?q=${encodeURIComponent(courierName)}+tracking+${awb}`;
}

export default function TrackOrderPage() {
  const [searchType, setSearchType] = useState<"number" | "email">("number");
  const [searchValue, setSearchValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<OrderInfo[] | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchValue.trim()) {
      setError("Completează câmpul de căutare");
      return;
    }
    setLoading(true);
    setError(null);
    setOrders(null);

    try {
      const params = new URLSearchParams();
      if (searchType === "number") {
        params.set("number", searchValue.trim());
      } else {
        params.set("email", searchValue.trim());
      }
      
      const res = await fetch(`/api/track-order?${params.toString()}`);
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Eroare la căutare");
      }
      
      if (!data.orders || data.orders.length === 0) {
        setError("Nu am găsit nicio comandă cu aceste date");
      } else {
        setOrders(data.orders);
      }
    } catch (err: any) {
      setError(err.message || "Eroare la căutare");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="container mx-auto py-10 px-4 max-w-3xl">
      <h1 className="text-3xl font-bold text-center mb-8 text-blue-700">Urmărește comanda</h1>
      
      <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="flex gap-4 justify-center mb-4">
            <button
              type="button"
              onClick={() => { setSearchType("number"); setSearchValue(""); setOrders(null); setError(null); }}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                searchType === "number" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              După număr comandă
            </button>
            <button
              type="button"
              onClick={() => { setSearchType("email"); setSearchValue(""); setOrders(null); setError(null); }}
              className={`px-4 py-2 rounded-lg font-semibold transition ${
                searchType === "email" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              După email
            </button>
          </div>
          
          <div className="flex gap-2">
            <input
              type={searchType === "email" ? "email" : "text"}
              placeholder={searchType === "number" ? "Introdu numărul comenzii (ex: 1234)" : "Introdu adresa de email"}
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="flex-1 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Se caută..." : "Caută"}
            </button>
          </div>
        </form>
        
        {error && (
          <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg text-center">
            {error}
          </div>
        )}
      </div>

      {orders && orders.length > 0 && (
        <div className="space-y-6">
          {orders.map((order) => {
            const statusInfo = STATUS_LABELS[order.status] || STATUS_LABELS.pending;
            return (
              <div key={order.id} className="bg-white rounded-xl shadow-lg overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-sm opacity-80">Comandă</span>
                      <h2 className="text-xl font-bold">#{order.number || order.id}</h2>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-sm font-semibold ${statusInfo.color}`}>
                      {statusInfo.icon} {statusInfo.label}
                    </div>
                  </div>
                </div>
                
                {/* Progress bar */}
                <div className="p-4 bg-gray-50">
                  <div className="flex justify-between items-center mb-2">
                    {["pending", "processing", "shipped", "delivered"].map((step, idx) => {
                      const stepInfo = STATUS_LABELS[step];
                      const currentIdx = ["pending", "processing", "shipped", "delivered"].indexOf(order.status);
                      const isActive = idx <= currentIdx && order.status !== "cancelled";
                      return (
                        <div key={step} className="flex flex-col items-center flex-1">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-lg ${
                            isActive ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-400"
                          }`}>
                            {stepInfo.icon}
                          </div>
                          <span className={`text-xs mt-1 ${isActive ? "text-blue-600 font-semibold" : "text-gray-400"}`}>
                            {stepInfo.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-600 transition-all duration-500"
                      style={{ 
                        width: order.status === "cancelled" ? "0%" :
                               order.status === "pending" ? "25%" :
                               order.status === "processing" ? "50%" :
                               order.status === "shipped" ? "75%" : "100%"
                      }}
                    />
                  </div>
                </div>
                
                {/* Details */}
                <div className="p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Data comenzii:</span>
                      <p className="font-semibold">{new Date(order.date).toLocaleDateString("ro-RO", { 
                        day: "numeric", month: "long", year: "numeric" 
                      })}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Total:</span>
                      <p className="font-bold text-green-600">{order.total.toFixed(2)} RON</p>
                    </div>
                    {order.paymentMethod && (
                      <div>
                        <span className="text-gray-500">Metodă plată:</span>
                        <p className="font-semibold capitalize">{order.paymentMethod}</p>
                      </div>
                    )}
                    {order.deliveryType && (
                      <div>
                        <span className="text-gray-500">Livrare:</span>
                        <p className="font-semibold capitalize">{order.deliveryType}</p>
                      </div>
                    )}
                  </div>
                  
                  {/* AWB */}
                  {order.awb && (
                    <div className="bg-purple-50 p-3 rounded-lg">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div>
                          <span className="text-purple-700 font-semibold">📦 AWB: </span>
                          <span className="font-mono text-purple-900">{order.awb}</span>
                          {order.courierName && (
                            <span className="ml-2 text-purple-600">({order.courierName})</span>
                          )}
                        </div>
                        {order.courierName && (
                          <a
                            href={getCourierTrackingUrl(order.courierName, order.awb)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700 transition"
                          >
                            🔍 Urmărește pe site curier
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Items */}
                  <div className="border-t pt-3">
                    <h3 className="font-semibold text-gray-700 mb-2">Produse comandate:</h3>
                    <div className="space-y-2">
                      {(Array.isArray(order.items) ? order.items : []).map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                          <span className="text-sm">{item.name || item.productName || "Produs"}</span>
                          <span className="text-sm text-gray-600">
                            x{item.quantity || item.qty || 1} • {(item.price || 0).toFixed(2)} RON
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
