"use client";

import { useState, useEffect } from "react";

interface Product {
  id: number;
  name: string;
  sku?: string;
  stock: number;
  manufacturer?: string;
  price: number;
  soldQuantity: number;
  orderCount: number;
  lastSale?: string;
  avgPerMonth: number;
}

interface Prediction {
  productId: number;
  productName: string;
  currentStock: number;
  trend: string;
  predicted30Days: number;
  daysUntilEmpty: number;
  recommendedOrder: number;
  urgency: string;
  urgencyReason: string;
  seasonality?: string;
}

export default function AIStockPredictionPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [analysis, setAnalysis] = useState<any>(null);

  useEffect(() => { loadProducts(); }, []);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/admin/api/ai-stock-prediction");
      const data = await res.json();
      setProducts(data.products || []);
    } catch { }
    setLoading(false);
  };

  const toggleSelect = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectLowStock = () => {
    const lowStock = products.filter(p => p.stock <= 5).map(p => p.id);
    setSelected(new Set(lowStock));
  };

  const analyze = async () => {
    setAnalyzing(true);
    setAnalysis(null);

    try {
      const res = await fetch("/admin/api/ai-stock-prediction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productIds: selected.size > 0 ? Array.from(selected) : products.slice(0, 20).map(p => p.id) // Max 20 pentru AI
        }),
      });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
      } else {
        setAnalysis(data.analysis);
      }
    } catch (err) {
      alert("Eroare la analiză!");
    }

    setAnalyzing(false);
  };

  const urgencyBadge = (urg: string) => {
    const map: Record<string, { bg: string; icon: string }> = {
      "critic": { bg: "bg-red-600", icon: "🚨" },
      "urgent": { bg: "bg-orange-500", icon: "⚠️" },
      "normal": { bg: "bg-yellow-500", icon: "📋" },
      "ok": { bg: "bg-green-600", icon: "✓" }
    };
    const u = map[urg] || { bg: "bg-gray-600", icon: "?" };
    return <span className={`${u.bg} text-white px-2 py-1 rounded text-xs font-bold`}>{u.icon} {urg.toUpperCase()}</span>;
  };

  const trendIcon = (t: string) => {
    if (t.includes("cresc")) return "📈";
    if (t.includes("desc")) return "📉";
    return "➡️";
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">📦 AI Predicție Stoc</h1>
      <p className="text-sm text-gray-500 mb-6">AI analizează istoricul comenzilor și prezice când trebuie să reaprovizionezi.</p>

      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex gap-3">
            <button onClick={selectLowStock}
              className="bg-red-100 text-red-700 hover:bg-red-200 px-4 py-2 rounded font-semibold text-sm transition">
              🔴 Selectează stoc mic
            </button>
            <span className="text-sm text-gray-500 self-center">{selected.size || "Max 20"} produse</span>
          </div>
          <button onClick={analyze} disabled={analyzing}
            className="bg-blue-600 text-white px-6 py-2 rounded font-bold hover:bg-blue-700 disabled:opacity-50 transition">
            {analyzing ? "⏳ Se analizează..." : "🤖 Analizează & Prezice"}
          </button>
        </div>
      </div>

      {/* Rezultate Analiză */}
      {analysis && (
        <div className="space-y-6 mb-6">
          {/* Sumar */}
          {analysis.summary && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="font-bold mb-4">📊 Sumar Predicții</h2>
              <div className="grid md:grid-cols-4 gap-4 mb-4">
                <div className="bg-red-50 rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-red-700">{analysis.summary.criticalCount || 0}</p>
                  <p className="text-sm text-red-600">🚨 Critice</p>
                </div>
                <div className="bg-orange-50 rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-orange-700">{analysis.summary.urgentCount || 0}</p>
                  <p className="text-sm text-orange-600">⚠️ Urgente</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-blue-700">
                    {analysis.summary.totalRecommendedInvestment?.toLocaleString("ro-RO") || 0}
                  </p>
                  <p className="text-sm text-blue-600">💰 Investiție RON</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4 text-center">
                  <p className="text-xl font-bold text-purple-700">{analysis.predictions?.length || 0}</p>
                  <p className="text-sm text-purple-600">📦 Analizate</p>
                </div>
              </div>

              {analysis.summary.topPriorities?.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <p className="font-medium text-red-800 mb-2">🎯 Priorități de comandat:</p>
                  <ul className="list-disc list-inside text-red-700">
                    {analysis.summary.topPriorities.map((p: string, i: number) => (
                      <li key={i}>{p}</li>
                    ))}
                  </ul>
                </div>
              )}

              {analysis.summary.generalRecommendation && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="font-medium text-blue-800">💡 {analysis.summary.generalRecommendation}</p>
                </div>
              )}
            </div>
          )}

          {/* Detalii per produs */}
          {analysis.predictions?.length > 0 && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <h2 className="font-bold p-4 border-b">📋 Predicții per Produs</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-4 py-3 text-sm">Produs</th>
                      <th className="text-center px-4 py-3 text-sm">Stoc</th>
                      <th className="text-center px-4 py-3 text-sm">Trend</th>
                      <th className="text-center px-4 py-3 text-sm">Est. 30 zile</th>
                      <th className="text-center px-4 py-3 text-sm">Zile rămase</th>
                      <th className="text-center px-4 py-3 text-sm">Urgență</th>
                      <th className="text-center px-4 py-3 text-sm">De comandat</th>
                      <th className="text-left px-4 py-3 text-sm">Motiv</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysis.predictions
                      .sort((a: Prediction, b: Prediction) => {
                        const urgencyOrder: Record<string, number> = { "critic": 0, "urgent": 1, "normal": 2, "ok": 3 };
                        return (urgencyOrder[a.urgency] || 4) - (urgencyOrder[b.urgency] || 4);
                      })
                      .map((item: Prediction, idx: number) => (
                        <tr key={idx} className={`border-t hover:bg-gray-50 ${item.urgency === "critic" ? "bg-red-50" : item.urgency === "urgent" ? "bg-orange-50" : ""}`}>
                          <td className="px-4 py-3 font-medium">{item.productName}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`font-bold ${item.currentStock <= 5 ? "text-red-600" : "text-gray-700"}`}>
                              {item.currentStock}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">{trendIcon(item.trend)} {item.trend}</td>
                          <td className="px-4 py-3 text-center font-medium">{item.predicted30Days} buc</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`font-bold ${item.daysUntilEmpty <= 7 ? "text-red-600" : item.daysUntilEmpty <= 14 ? "text-orange-600" : "text-green-600"}`}>
                              {item.daysUntilEmpty} zile
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">{urgencyBadge(item.urgency)}</td>
                          <td className="px-4 py-3 text-center font-bold text-blue-700">{item.recommendedOrder} buc</td>
                          <td className="px-4 py-3 text-sm text-gray-600 max-w-xs">{item.urgencyReason}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Lista produse */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <h2 className="font-bold p-4 border-b">🛒 Produse cu istoric vânzări ({products.length})</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 text-sm">Selectează</th>
                <th className="text-left px-4 py-3 text-sm">Produs</th>
                <th className="text-center px-4 py-3 text-sm">Stoc actual</th>
                <th className="text-center px-4 py-3 text-sm">Vândute (90z)</th>
                <th className="text-center px-4 py-3 text-sm">Medie/lună</th>
                <th className="text-left px-4 py-3 text-sm">Ultima vânzare</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-8 text-gray-500">Se încarcă...</td></tr>
              ) : products.map(p => (
                <tr key={p.id} className={`border-t hover:bg-gray-50 ${p.stock <= 5 ? "bg-red-50" : ""}`}>
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleSelect(p.id)}
                      className="w-5 h-5 accent-blue-600" />
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{p.name}</p>
                    {p.sku && <p className="text-xs text-gray-500">{p.sku}</p>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`font-bold ${p.stock <= 5 ? "text-red-600" : p.stock <= 10 ? "text-orange-600" : "text-green-600"}`}>
                      {p.stock}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center font-medium">{p.soldQuantity}</td>
                  <td className="px-4 py-3 text-center">{p.avgPerMonth}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {p.lastSale ? new Date(p.lastSale).toLocaleDateString("ro-RO") : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
