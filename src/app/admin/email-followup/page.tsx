"use client";

import { useState, useEffect } from "react";

interface OrderForFollowup {
  id: number;
  orderNumber?: string;
  type: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  company?: string;
  items: any[];
  itemCount: number;
  total: number;
  createdAt: string;
  daysSinceOrder: number;
}

export default function AIEmailFollowupPage() {
  const [orders, setOrders] = useState<{ forReview: OrderForFollowup[]; abandoned: OrderForFollowup[] }>({ forReview: [], abandoned: [] });
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<number | null>(null);
  const [generatedEmail, setGeneratedEmail] = useState<any>(null);
  const [customNote, setCustomNote] = useState("");
  const [activeTab, setActiveTab] = useState<"review" | "abandoned">("abandoned");

  useEffect(() => { loadOrders(); }, []);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch("/admin/api/ai-email-followup");
      const data = await res.json();
      setOrders({
        forReview: data.forReview || [],
        abandoned: data.abandoned || []
      });
    } catch { }
    setLoading(false);
  };

  const generateEmail = async (orderId: number, type: string) => {
    setGenerating(orderId);
    setGeneratedEmail(null);

    try {
      const res = await fetch("/admin/api/ai-email-followup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, type, customNote }),
      });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
      } else {
        setGeneratedEmail(data);
      }
    } catch (err) {
      alert("Eroare la generare!");
    }

    setGenerating(null);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Copiat în clipboard!");
  };

  const currentOrders = activeTab === "abandoned" ? orders.abandoned : orders.forReview;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">📧 AI Email Follow-up</h1>
      <p className="text-sm text-gray-500 mb-6">Generează emailuri personalizate pentru recuperare coșuri abandonate și solicitare review-uri.</p>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab("abandoned")}
          className={`px-4 py-2 rounded-lg font-semibold transition ${activeTab === "abandoned" ? "bg-orange-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
        >
          🛒 Coșuri Abandonate ({orders.abandoned.length})
        </button>
        <button
          onClick={() => setActiveTab("review")}
          className={`px-4 py-2 rounded-lg font-semibold transition ${activeTab === "review" ? "bg-green-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
        >
          ⭐ Cerere Review ({orders.forReview.length})
        </button>
      </div>

      {/* Notă personalizată */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <label className="block text-sm font-medium mb-2">💡 Notă personalizată (opțional)</label>
        <input
          type="text"
          value={customNote}
          onChange={(e) => setCustomNote(e.target.value)}
          className="w-full border rounded-lg px-4 py-2"
          placeholder="Ex: Oferă 10% reducere, Menționează promoția curentă..."
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Lista comenzi */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <h2 className="font-bold p-4 border-b">
            {activeTab === "abandoned" ? "🛒 Comenzi nefinalizate" : "📦 Comenzi livrate"} ({currentOrders.length})
          </h2>

          {loading ? (
            <p className="text-center py-8 text-gray-500">Se încarcă...</p>
          ) : currentOrders.length === 0 ? (
            <p className="text-center py-8 text-gray-500">
              {activeTab === "abandoned" 
                ? "Nu există comenzi abandonate în ultimile 7 zile"
                : "Nu există comenzi livrate în intervalul 7-14 zile"}
            </p>
          ) : (
            <div className="divide-y max-h-[600px] overflow-y-auto">
              {currentOrders.map(order => (
                <div key={order.id} className="p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold">{order.customerName}</p>
                      <p className="text-sm text-gray-600">{order.customerEmail}</p>
                      {order.company && <p className="text-xs text-gray-500">{order.company}</p>}
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">{order.total?.toLocaleString("ro-RO")} RON</p>
                      <p className="text-xs text-gray-500">{order.daysSinceOrder} zile</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    {order.itemCount} produse: {order.items.map(i => i.name || i.productName).slice(0, 2).join(", ")}
                    {order.itemCount > 2 && ` +${order.itemCount - 2} altele`}
                  </p>
                  <button
                    onClick={() => generateEmail(order.id, activeTab)}
                    disabled={generating === order.id}
                    className={`w-full py-2 rounded font-semibold text-white transition ${
                      activeTab === "abandoned" 
                        ? "bg-orange-600 hover:bg-orange-700" 
                        : "bg-green-600 hover:bg-green-700"
                    } disabled:opacity-50`}
                  >
                    {generating === order.id ? "⏳ Se generează..." : "🤖 Generează Email"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Email generat */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <h2 className="font-bold p-4 border-b">✉️ Email Generat</h2>

          {generatedEmail ? (
            <div className="p-4">
              <div className="mb-4">
                <p className="text-sm text-gray-500 mb-1">Către:</p>
                <p className="font-medium">{generatedEmail.order?.customerEmail}</p>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-500 mb-1">Subiect:</p>
                <div className="flex gap-2 items-center">
                  <p className="font-semibold flex-1 bg-gray-50 px-3 py-2 rounded">{generatedEmail.email?.subject}</p>
                  <button
                    onClick={() => copyToClipboard(generatedEmail.email?.subject || "")}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    📋
                  </button>
                </div>
              </div>

              <div className="mb-4">
                <div className="flex justify-between items-center mb-1">
                  <p className="text-sm text-gray-500">Conținut:</p>
                  <button
                    onClick={() => copyToClipboard(generatedEmail.email?.plainBody || "")}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    📋 Copiază text
                  </button>
                </div>
                <div
                  className="bg-gray-50 rounded-lg p-4 prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: generatedEmail.email?.htmlBody || "" }}
                />
              </div>

              <div className="flex gap-3">
                <a
                  href={`mailto:${generatedEmail.order?.customerEmail}?subject=${encodeURIComponent(generatedEmail.email?.subject || "")}&body=${encodeURIComponent(generatedEmail.email?.plainBody || "")}`}
                  className="flex-1 bg-blue-600 text-white text-center py-3 rounded-lg font-bold hover:bg-blue-700 transition"
                >
                  📤 Deschide în Email Client
                </a>
                <button
                  onClick={() => {
                    copyToClipboard(generatedEmail.email?.plainBody || "");
                  }}
                  className="bg-gray-200 hover:bg-gray-300 px-6 py-3 rounded-lg font-semibold transition"
                >
                  📋 Copiază Tot
                </button>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-gray-400">
              <p className="text-4xl mb-4">✉️</p>
              <p>Selectează o comandă și generează un email personalizat</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
