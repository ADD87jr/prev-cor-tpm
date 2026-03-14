"use client";

import { useState, useEffect } from "react";

interface PurchaseOrder {
  id: number;
  supplierId: number;
  status: string;
  items: any[];
  totalAmount: number;
  generatedBy: string;
  notes: string | null;
  sentAt: string | null;
  receivedAt: string | null;
  createdAt: string;
  supplier: { name: string };
}

export default function ComenziAchizitiePage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  // AI Order Suggestions
  const [aiRec, setAiRec] = useState<any>(null);
  const [aiRecLoading, setAiRecLoading] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);

  useEffect(() => { fetchOrders(); }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch("/admin/api/purchase-orders");
      const data = await res.json();
      setOrders(data.orders || []);
    } catch { }
    setLoading(false);
  };

  const autoGenerate = async () => {
    setGenerating(true);
    setAiSuggestion(null);
    try {
      const res = await fetch("/admin/api/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "auto-generate" }),
      });
      const data = await res.json();
      if (data.aiSuggestion) setAiSuggestion(data.aiSuggestion);
      fetchOrders();
    } catch { }
    setGenerating(false);
  };

  const changeStatus = async (orderId: number, action: string) => {
    try {
      await fetch("/admin/api/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, orderId }),
      });
      fetchOrders();
    } catch { }
  };

  const fetchAiSuggestions = async () => {
    setAiRecLoading(true);
    setShowAiPanel(true);
    try {
      const res = await fetch("/admin/api/ai-order-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      setAiRec(data);
    } catch {
      setAiRec({ error: "Eroare la obținerea sugestiilor" });
    }
    setAiRecLoading(false);
  };

  const deleteOrder = async (id: number) => {
    if (!confirm("Sigur ștergi această comandă draft?")) return;
    await fetch(`/admin/api/purchase-orders?id=${id}`, { method: "DELETE" });
    fetchOrders();
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      draft: "bg-gray-200 text-gray-700",
      sent: "bg-blue-100 text-blue-700",
      confirmed: "bg-purple-100 text-purple-700",
      received: "bg-green-100 text-green-700",
      cancelled: "bg-red-100 text-red-700",
    };
    const labels: Record<string, string> = {
      draft: "Draft", sent: "Trimisă", confirmed: "Confirmată", received: "Recepționată", cancelled: "Anulată",
    };
    return <span className={`px-2 py-0.5 rounded text-xs font-bold ${map[status] || "bg-gray-100"}`}>{labels[status] || status}</span>;
  };

  const grouped = {
    active: orders.filter(o => ["draft", "sent", "confirmed"].includes(o.status)),
    completed: orders.filter(o => o.status === "received"),
    cancelled: orders.filter(o => o.status === "cancelled"),
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">📋 Comenzi Achiziție</h1>

      <div className="flex gap-3 mb-6 flex-wrap">
        <button onClick={autoGenerate} disabled={generating} className="bg-green-600 text-white px-5 py-2 rounded font-semibold hover:bg-green-700 disabled:opacity-50 transition">
          {generating ? "⏳ Se generează..." : "🤖 Auto-generează comenzi"}
        </button>
        <button onClick={fetchAiSuggestions} disabled={aiRecLoading} className="bg-violet-600 text-white px-5 py-2 rounded font-semibold hover:bg-violet-700 disabled:opacity-50 transition">
          {aiRecLoading ? "⏳ AI analizează..." : "🧠 Sugestii AI — ce să comand?"}
        </button>
        <div className="bg-white rounded px-4 py-2 shadow text-sm flex gap-4">
          <span>📦 Active: <b>{grouped.active.length}</b></span>
          <span>✅ Finalizate: <b>{grouped.completed.length}</b></span>
          <span>❌ Anulate: <b>{grouped.cancelled.length}</b></span>
        </div>
      </div>

      {showAiPanel && aiRec && !aiRec.error && (
        <div className="bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-300 rounded-xl p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-violet-800">🧠 Recomandări AI — Ce să comanzi</h2>
            <button onClick={() => setShowAiPanel(false)} className="text-gray-500 hover:text-gray-700 text-xl">✕</button>
          </div>

          {/* Statistici rapide */}
          {aiRec.stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div className="bg-white rounded-lg p-3 text-center shadow-sm">
                <div className="text-2xl font-bold text-red-600">{aiRec.stats.outOfStock}</div>
                <div className="text-xs text-gray-500">Fără stoc</div>
              </div>
              <div className="bg-white rounded-lg p-3 text-center shadow-sm">
                <div className="text-2xl font-bold text-amber-600">{aiRec.stats.lowStock}</div>
                <div className="text-xs text-gray-500">Stoc mic (&le;3)</div>
              </div>
              <div className="bg-white rounded-lg p-3 text-center shadow-sm">
                <div className="text-2xl font-bold text-blue-600">{aiRec.stats.totalOrders}</div>
                <div className="text-xs text-gray-500">Comenzi procesate</div>
              </div>
              <div className="bg-white rounded-lg p-3 text-center shadow-sm">
                <div className="text-2xl font-bold text-green-600">{aiRec.stats.totalRevenue?.toLocaleString()} RON</div>
                <div className="text-xs text-gray-500">Venituri totale</div>
              </div>
            </div>
          )}

          {/* Rezumat AI */}
          {aiRec.recommendations?.summary && (
            <div className="bg-white rounded-lg p-3 mb-4 shadow-sm">
              <p className="text-sm text-gray-700">{aiRec.recommendations.summary}</p>
              {aiRec.recommendations.source === "local" && (
                <p className="text-xs text-amber-600 mt-1">ℹ️ Analiză locală (Gemini indisponibil). Reîncearcă mai târziu pentru AI.</p>
              )}
            </div>
          )}

          {/* Comenzi urgente */}
          {aiRec.recommendations?.urgentOrders?.length > 0 && (
            <div className="mb-4">
              <h3 className="font-bold text-sm text-red-700 mb-2">🚨 Comenzi URGENTE</h3>
              <div className="space-y-2">
                {aiRec.recommendations.urgentOrders.map((o: any, i: number) => (
                  <div key={i} className="bg-white rounded-lg p-3 shadow-sm border-l-4 border-red-500">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-bold text-sm">{o.product}</span>
                        <span className={`ml-2 text-xs px-2 py-0.5 rounded ${o.priority === "CRITICĂ" ? "bg-red-100 text-red-700" : o.priority === "MARE" ? "bg-orange-100 text-orange-700" : "bg-yellow-100 text-yellow-700"}`}>{o.priority}</span>
                      </div>
                      <span className="text-sm font-semibold text-violet-700">Qty: {o.suggestedQty}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{o.reason}</p>
                    {o.estimatedCost && o.estimatedCost !== "N/A" && <p className="text-xs text-green-700 mt-0.5">💰 Cost estimat: {o.estimatedCost}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Comenzi strategice */}
          {aiRec.recommendations?.strategicOrders?.length > 0 && (
            <div className="mb-4">
              <h3 className="font-bold text-sm text-blue-700 mb-2">📊 Achiziții strategice</h3>
              <div className="space-y-2">
                {aiRec.recommendations.strategicOrders.map((o: any, i: number) => (
                  <div key={i} className="bg-white rounded-lg p-3 shadow-sm border-l-4 border-blue-500">
                    <span className="font-bold text-sm">{o.category}</span>
                    <p className="text-xs text-gray-600 mt-1">{o.reason}</p>
                    {o.products && <p className="text-xs text-gray-500">Produse: {o.products}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Produse noi sugerate*/}
          {aiRec.recommendations?.newProductSuggestions?.length > 0 && (
            <div className="mb-4">
              <h3 className="font-bold text-sm text-purple-700 mb-2">💡 Produse noi de adăugat</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {aiRec.recommendations.newProductSuggestions.map((s: any, i: number) => (
                  <div key={i} className="bg-white rounded-lg p-3 shadow-sm">
                    <span className="font-bold text-sm">{s.product}</span>
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded ml-2">{s.category}</span>
                    <p className="text-xs text-gray-500 mt-1">{s.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top vânzări */}
          {aiRec.topSelling?.length > 0 && (
            <div className="mb-4">
              <h3 className="font-bold text-sm text-green-700 mb-2">🏆 Top produse vândute</h3>
              <table className="w-full text-xs bg-white rounded-lg shadow-sm">
                <thead><tr className="bg-gray-50"><th className="px-2 py-1 text-left">Produs</th><th className="px-2 py-1 text-center">Vândute</th><th className="px-2 py-1 text-right">Venituri</th><th className="px-2 py-1 text-center">Stoc</th></tr></thead>
                <tbody>
                  {aiRec.topSelling.slice(0, 10).map((p: any, i: number) => (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="px-2 py-1">{p.name}</td>
                      <td className="px-2 py-1 text-center">{p.soldCount}</td>
                      <td className="px-2 py-1 text-right">{p.revenue} RON</td>
                      <td className={`px-2 py-1 text-center font-bold ${p.currentStock === 0 ? "text-red-600" : p.currentStock <= 3 ? "text-amber-600" : "text-green-600"}`}>{p.currentStock}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Sfaturi */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {aiRec.recommendations?.costSavingTips?.length > 0 && (
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <h4 className="font-bold text-xs text-emerald-700 mb-1">💰 Sfaturi economisire</h4>
                <ul className="text-xs text-gray-600 space-y-1">
                  {aiRec.recommendations.costSavingTips.map((tip: string, i: number) => <li key={i}>• {tip}</li>)}
                </ul>
              </div>
            )}
            {aiRec.recommendations?.seasonalAdvice && (
              <div className="bg-white rounded-lg p-3 shadow-sm">
                <h4 className="font-bold text-xs text-orange-700 mb-1">📅 Sfaturi sezoniere</h4>
                <p className="text-xs text-gray-600">{aiRec.recommendations.seasonalAdvice}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {showAiPanel && aiRec?.error && (
        <div className="bg-red-50 border border-red-300 rounded-lg p-3 mb-4 text-red-700 text-sm">
          {aiRec.error}
          <button onClick={() => setShowAiPanel(false)} className="ml-3 underline">Închide</button>
        </div>
      )}

      {aiSuggestion && (
        <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 mb-6">
          <h3 className="font-bold text-sm mb-2">🤖 Sugestii AI — produse fără furnizor</h3>
          <p className="text-sm whitespace-pre-wrap">{aiSuggestion}</p>
        </div>
      )}

      {loading ? <p>Se încarcă...</p> : orders.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          <p className="text-4xl mb-2">📋</p>
          <p>Nu ai comenzi de achiziție. Apasă &quot;Auto-generează&quot; pentru a crea comenzi bazate pe stocul scăzut.</p>
        </div>
      ) : (
        <>
          {grouped.active.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-bold mb-3">📦 Comenzi active</h2>
              <div className="space-y-3">
                {grouped.active.map(order => (
                  <OrderCard key={order.id} order={order} onAction={changeStatus} onDelete={deleteOrder} statusBadge={statusBadge} />
                ))}
              </div>
            </div>
          )}

          {grouped.completed.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-bold mb-3">✅ Recepționate</h2>
              <div className="space-y-3">
                {grouped.completed.map(order => (
                  <OrderCard key={order.id} order={order} onAction={changeStatus} onDelete={deleteOrder} statusBadge={statusBadge} />
                ))}
              </div>
            </div>
          )}

          {grouped.cancelled.length > 0 && (
            <div>
              <h2 className="text-lg font-bold mb-3 text-gray-500">❌ Anulate</h2>
              <div className="space-y-3">
                {grouped.cancelled.map(order => (
                  <OrderCard key={order.id} order={order} onAction={changeStatus} onDelete={deleteOrder} statusBadge={statusBadge} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function OrderCard({ order, onAction, onDelete, statusBadge }: {
  order: PurchaseOrder; onAction: (id: number, action: string) => void; onDelete: (id: number) => void;
  statusBadge: (s: string) => JSX.Element;
}) {
  const items = Array.isArray(order.items) ? order.items : [];

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold">#{order.id}</span>
            {statusBadge(order.status)}
            <span className="text-sm text-gray-500">de la <b>{order.supplier?.name}</b></span>
            {order.generatedBy === "ai" && <span className="bg-violet-100 text-violet-700 px-2 py-0.5 rounded text-xs">🤖 AI</span>}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">
            Creat: {new Date(order.createdAt).toLocaleDateString("ro-RO")}
            {order.sentAt && ` • Trimisă: ${new Date(order.sentAt).toLocaleDateString("ro-RO")}`}
            {order.receivedAt && ` • Recepționată: ${new Date(order.receivedAt).toLocaleDateString("ro-RO")}`}
          </div>
        </div>
        <div className="text-right">
          <div className="font-bold text-lg">{order.totalAmount?.toFixed(2)} RON</div>
          <div className="text-xs text-gray-500">{items.length} produse</div>
        </div>
      </div>

      <table className="w-full text-sm mb-3">
        <thead><tr className="bg-gray-50"><th className="px-2 py-1 text-left">Produs</th><th className="px-2 py-1 text-center">Cant.</th><th className="px-2 py-1 text-right">Preț unit.</th><th className="px-2 py-1 text-right">Total</th></tr></thead>
        <tbody>
          {items.map((item: any, i: number) => (
            <tr key={i} className="border-b border-gray-100">
              <td className="px-2 py-1">{item.name || `Produs #${item.productId}`}</td>
              <td className="px-2 py-1 text-center">{item.quantity}</td>
              <td className="px-2 py-1 text-right">{item.price?.toFixed(2)} RON</td>
              <td className="px-2 py-1 text-right font-semibold">{(item.price * item.quantity)?.toFixed(2)} RON</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex gap-2 flex-wrap">
        {order.status === "draft" && (
          <>
            <button onClick={() => onAction(order.id, "send")} className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700">📤 Trimite</button>
            <button onClick={() => onDelete(order.id)} className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700">🗑️ Șterge</button>
          </>
        )}
        {order.status === "sent" && (
          <button onClick={() => onAction(order.id, "receive")} className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700">📥 Recepționează (+ update stoc)</button>
        )}
        {["draft", "sent"].includes(order.status) && (
          <button onClick={() => onAction(order.id, "cancel")} className="bg-gray-500 text-white px-3 py-1 rounded text-sm hover:bg-gray-600">❌ Anulează</button>
        )}
      </div>
    </div>
  );
}
