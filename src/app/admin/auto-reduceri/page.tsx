"use client";

import { useState } from "react";

interface DiscountSuggestion {
  id: number;
  name: string;
  currentPrice: number;
  purchasePrice: number | null;
  suggestedDiscount: number;
  newPrice: number;
  margin: number | null;
  stock: number;
  soldQty: number;
  wishCount: number;
  abandonCount: number;
  reason: string;
  priority: number;
  hasDiscount: boolean;
  domain: string;
}

export default function AutoReduceriPage() {
  const [suggestions, setSuggestions] = useState<DiscountSuggestion[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [customDiscounts, setCustomDiscounts] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [applying, setApplying] = useState(false);
  const [stats, setStats] = useState({ totalPotentialRevenue: 0, currentStockValue: 0 });
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);

  const analyze = async () => {
    setLoading(true);
    setAiAnalysis(null);
    try {
      const res = await fetch("/admin/api/auto-discounts");
      const data = await res.json();
      setSuggestions(data.suggestions || []);
      setStats({ totalPotentialRevenue: data.totalPotentialRevenue || 0, currentStockValue: data.currentStockValue || 0 });
      setAiAnalysis(data.aiAnalysis || null);
      setSelected(new Set());
      setCustomDiscounts({});
      setLoaded(true);
    } catch { }
    setLoading(false);
  };

  const toggleSelect = (id: number) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  const selectAll = () => {
    if (selected.size === suggestions.length) setSelected(new Set());
    else setSelected(new Set(suggestions.map(s => s.id)));
  };

  const applyDiscounts = async () => {
    if (selected.size === 0) return;
    setApplying(true);
    try {
      const discounts = suggestions
        .filter(s => selected.has(s.id))
        .map(s => ({
          productId: s.id,
          discount: customDiscounts[s.id] || s.suggestedDiscount,
          discountType: "percent",
        }));
      const res = await fetch("/admin/api/auto-discounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ discounts }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`✅ ${data.applied} reduceri aplicate cu succes!`);
        analyze();
      }
    } catch { }
    setApplying(false);
  };

  const priorityLabel = (p: number) => {
    if (p >= 3) return <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-bold">🔴 Urgent</span>;
    if (p >= 2) return <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-xs font-bold">🟡 Mediu</span>;
    return <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-bold">🔵 Opțional</span>;
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">💰 Auto-Reduceri Inteligente</h1>

      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <p className="text-sm text-gray-600 mb-3">AI analizează stocurile, vânzările, wishlist-urile și coșurile abandonate pentru a sugera reduceri optime.</p>
        <button onClick={analyze} disabled={loading} className="bg-blue-600 text-white px-5 py-2 rounded font-semibold hover:bg-blue-700 disabled:opacity-50 transition">
          {loading ? "⏳ Se analizează..." : "🔍 Analizează & Sugerează reduceri"}
        </button>
      </div>

      {loaded && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4 text-center border-t-4 border-amber-500">
              <div className="text-2xl font-bold">{suggestions.length}</div>
              <div className="text-sm text-gray-500">Sugestii reduceri</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4 text-center border-t-4 border-red-500">
              <div className="text-2xl font-bold">{suggestions.filter(s => s.priority >= 3).length}</div>
              <div className="text-sm text-gray-500">Urgente</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4 text-center border-t-4 border-blue-500">
              <div className="text-2xl font-bold">{stats.currentStockValue.toLocaleString("ro-RO")} RON</div>
              <div className="text-sm text-gray-500">Valoare stoc curent</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4 text-center border-t-4 border-green-500">
              <div className="text-2xl font-bold">{stats.totalPotentialRevenue.toLocaleString("ro-RO")} RON</div>
              <div className="text-sm text-gray-500">Valoare după reduceri</div>
            </div>
          </div>

          {aiAnalysis && (
            <div className="bg-violet-50 border border-violet-300 rounded-lg p-4 mb-6">
              <h3 className="font-bold text-sm mb-2">🤖 Analiza AI</h3>
              <div className="text-sm whitespace-pre-wrap">{aiAnalysis}</div>
            </div>
          )}

          {suggestions.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center text-green-600">
              <p className="text-4xl mb-2">✅</p>
              <p className="font-semibold">Toate produsele se vând bine — nu sunt necesare reduceri!</p>
            </div>
          ) : (
            <>
              <div className="flex gap-3 mb-4 items-center flex-wrap">
                <button onClick={selectAll} className="bg-gray-200 text-gray-700 px-4 py-2 rounded text-sm font-semibold hover:bg-gray-300">
                  {selected.size === suggestions.length ? "Deselectează tot" : `Selectează tot (${suggestions.length})`}
                </button>
                {selected.size > 0 && (
                  <button onClick={applyDiscounts} disabled={applying} className="bg-green-600 text-white px-5 py-2 rounded font-semibold hover:bg-green-700 disabled:opacity-50">
                    {applying ? "Se aplică..." : `✅ Aplică ${selected.size} reduceri`}
                  </button>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full bg-white rounded-lg shadow text-sm">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="px-2 py-2 w-8"></th>
                      <th className="px-2 py-2 text-left">Produs</th>
                      <th className="px-2 py-2 text-center">Prioritate</th>
                      <th className="px-2 py-2 text-center">Preț actual</th>
                      <th className="px-2 py-2 text-center">Reducere</th>
                      <th className="px-2 py-2 text-center">Preț nou</th>
                      <th className="px-2 py-2 text-center">Stoc</th>
                      <th className="px-2 py-2 text-center">Vândute/90z</th>
                      <th className="px-2 py-2 text-center">Wishlist</th>
                      <th className="px-2 py-2 text-center">Abandon</th>
                      <th className="px-2 py-2">Motiv</th>
                    </tr>
                  </thead>
                  <tbody>
                    {suggestions.map(s => {
                      const disc = customDiscounts[s.id] ?? s.suggestedDiscount;
                      const newP = Math.round(s.currentPrice * (1 - disc / 100) * 100) / 100;
                      return (
                        <tr key={s.id} className={`border-b hover:bg-gray-50 ${selected.has(s.id) ? "bg-green-50" : ""}`}>
                          <td className="px-2 py-2 text-center">
                            <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggleSelect(s.id)} />
                          </td>
                          <td className="px-2 py-2 font-medium">
                            {s.name}
                            {s.hasDiscount && <span className="text-orange-500 text-xs ml-1">(are deja reducere)</span>}
                          </td>
                          <td className="px-2 py-2 text-center">{priorityLabel(s.priority)}</td>
                          <td className="px-2 py-2 text-center">{s.currentPrice} RON</td>
                          <td className="px-2 py-2 text-center">
                            <input
                              type="number" min={1} max={50}
                              value={disc}
                              onChange={e => setCustomDiscounts({ ...customDiscounts, [s.id]: Number(e.target.value) })}
                              className="border rounded px-2 py-1 w-16 text-center"
                            /> %
                          </td>
                          <td className="px-2 py-2 text-center font-bold text-green-700">{newP} RON</td>
                          <td className="px-2 py-2 text-center">{s.stock}</td>
                          <td className="px-2 py-2 text-center">{s.soldQty}</td>
                          <td className="px-2 py-2 text-center">{s.wishCount > 0 ? `❤️ ${s.wishCount}` : "-"}</td>
                          <td className="px-2 py-2 text-center">{s.abandonCount > 0 ? `🛒 ${s.abandonCount}` : "-"}</td>
                          <td className="px-2 py-2 text-xs text-gray-600">{s.reason}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
