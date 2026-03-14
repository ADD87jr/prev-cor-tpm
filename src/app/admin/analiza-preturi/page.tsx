"use client";

import { useState, useEffect } from "react";

interface Product {
  id: number;
  name: string;
  price: number;
  listPrice?: number;
  purchasePrice?: number;
  manufacturer?: string;
  sku?: string;
  type?: string;
  margin?: number;
}

interface AnalysisItem {
  productId: number;
  productName: string;
  ourPrice: number;
  estimatedMarketPrice: number;
  competitorPrices?: Record<string, number>;
  positioning: string;
  recommendation: string;
  suggestedPrice?: number;
  reason: string;
}

export default function AIPriceAnalysisPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [analysis, setAnalysis] = useState<any>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<{ id: number; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { loadProducts(); }, []);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/admin/api/ai-price-analysis");
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

  const selectAll = () => {
    if (selected.size === products.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(products.map(p => p.id)));
    }
  };

  const deleteProduct = async () => {
    if (!showDeleteModal) return;
    setDeleting(true);
    try {
      const res = await fetch(`/admin/api/products?id=${showDeleteModal.id}`, { method: "DELETE" });
      if (res.ok) {
        setProducts(prev => prev.filter(p => p.id !== showDeleteModal.id));
        setSelected(prev => {
          const next = new Set(prev);
          next.delete(showDeleteModal.id);
          return next;
        });
      } else {
        alert("Eroare la ștergerea produsului");
      }
    } catch {
      alert("Eroare de rețea");
    }
    setDeleting(false);
    setShowDeleteModal(null);
  };

  const analyzePrice = async () => {
    setAnalyzing(true);
    setAnalysis(null);

    try {
      const res = await fetch("/admin/api/ai-price-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productIds: selected.size > 0 ? Array.from(selected) : products.map(p => p.id)
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

  const positioningBadge = (pos: string) => {
    const map: Record<string, { bg: string; label: string }> = {
      "sub_piata": { bg: "bg-blue-100 text-blue-700", label: "📉 Sub piață" },
      "la_piata": { bg: "bg-green-100 text-green-700", label: "✓ Competitiv" },
      "peste_piata": { bg: "bg-red-100 text-red-700", label: "📈 Peste piață" }
    };
    const p = map[pos] || { bg: "bg-gray-100 text-gray-700", label: pos };
    return <span className={`px-2 py-1 rounded text-xs font-bold ${p.bg}`}>{p.label}</span>;
  };

  const recommendationBadge = (rec: string) => {
    const map: Record<string, { bg: string; icon: string }> = {
      "pastreaza": { bg: "bg-green-600", icon: "✓" },
      "scade": { bg: "bg-red-600", icon: "↓" },
      "creste": { bg: "bg-blue-600", icon: "↑" }
    };
    const r = map[rec] || { bg: "bg-gray-600", icon: "?" };
    return <span className={`${r.bg} text-white px-2 py-1 rounded text-xs font-bold`}>{r.icon} {rec}</span>;
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">📊 AI Analiză Prețuri Competiție</h1>
      <p className="text-sm text-gray-500 mb-6">AI compară prețurile tale cu estimări de la competitori (TME, Automation24, RS) și sugerează ajustări.</p>

      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex gap-3">
            <button onClick={selectAll}
              className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded font-semibold text-sm transition">
              {selected.size === products.length ? "Deselectează tot" : "Selectează tot"}
            </button>
            <span className="text-sm text-gray-500 self-center">{selected.size || "Toate"} produse</span>
          </div>
          <button onClick={analyzePrice} disabled={analyzing}
            className="bg-purple-600 text-white px-6 py-2 rounded font-bold hover:bg-purple-700 disabled:opacity-50 transition">
            {analyzing ? "⏳ Se analizează..." : "🤖 Analizează Prețuri"}
          </button>
        </div>
      </div>

      {/* Rezultate Analiză */}
      {analysis && (
        <div className="space-y-6 mb-6">
          {/* Sumar */}
          {analysis.summary && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="font-bold mb-4">📈 Sumar Analiză</h2>
              <div className="grid md:grid-cols-4 gap-4 mb-4">
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-blue-700">{analysis.summary.underpriced || 0}</p>
                  <p className="text-sm text-blue-600">Sub piață</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-green-700">{analysis.summary.competitive || 0}</p>
                  <p className="text-sm text-green-600">Competitiv</p>
                </div>
                <div className="bg-red-50 rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-red-700">{analysis.summary.overpriced || 0}</p>
                  <p className="text-sm text-red-600">Peste piață</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-purple-700">{analysis.summary.potentialRevenue?.toLocaleString("ro-RO") || 0}</p>
                  <p className="text-sm text-purple-600">Venit potențial (RON)</p>
                </div>
              </div>
              {analysis.summary.recommendation && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="font-medium text-amber-800">💡 {analysis.summary.recommendation}</p>
                </div>
              )}
            </div>
          )}

          {/* Detalii per produs */}
          {analysis.analysis?.length > 0 && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <h2 className="font-bold p-4 border-b">📋 Detalii per Produs</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-4 py-3 text-sm">Produs</th>
                      <th className="text-right px-4 py-3 text-sm">Preț Nostru</th>
                      <th className="text-right px-4 py-3 text-sm">Preț Piață</th>
                      <th className="text-center px-4 py-3 text-sm">Poziționare</th>
                      <th className="text-center px-4 py-3 text-sm">Recomandare</th>
                      <th className="text-right px-4 py-3 text-sm">Preț Sugerat</th>
                      <th className="text-left px-4 py-3 text-sm">Motiv</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysis.analysis.map((item: AnalysisItem, idx: number) => (
                      <tr key={idx} className="border-t hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{item.productName}</td>
                        <td className="px-4 py-3 text-right">{item.ourPrice?.toLocaleString("ro-RO")} RON</td>
                        <td className="px-4 py-3 text-right">{item.estimatedMarketPrice?.toLocaleString("ro-RO")} RON</td>
                        <td className="px-4 py-3 text-center">{positioningBadge(item.positioning)}</td>
                        <td className="px-4 py-3 text-center">{recommendationBadge(item.recommendation)}</td>
                        <td className="px-4 py-3 text-right font-bold text-purple-700">
                          {item.suggestedPrice?.toLocaleString("ro-RO")} RON
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 max-w-xs">{item.reason}</td>
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
        <h2 className="font-bold p-4 border-b">🛒 Produse ({products.length})</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 text-sm">Selectează</th>
                <th className="text-left px-4 py-3 text-sm">Produs</th>
                <th className="text-left px-4 py-3 text-sm">SKU</th>
                <th className="text-right px-4 py-3 text-sm">Preț Achiziție</th>
                <th className="text-right px-4 py-3 text-sm">Preț Vânzare</th>
                <th className="text-right px-4 py-3 text-sm">Marjă</th>
                <th className="text-center px-4 py-3 text-sm">Acțiuni</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-8 text-gray-500">Se încarcă...</td></tr>
              ) : products.map(p => (
                <tr key={p.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleSelect(p.id)}
                      className="w-5 h-5 accent-purple-600" />
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{p.name}</p>
                    {p.manufacturer && <p className="text-xs text-gray-500">{p.manufacturer}</p>}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{p.sku || "-"}</td>
                  <td className="px-4 py-3 text-right text-sm">
                    {p.purchasePrice ? `${p.purchasePrice.toLocaleString("ro-RO")} RON` : "-"}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">{p.price.toLocaleString("ro-RO")} RON</td>
                  <td className="px-4 py-3 text-right">
                    {p.margin !== undefined && p.margin !== null ? (
                      <span className={`font-bold ${p.margin >= 30 ? "text-green-600" : p.margin >= 15 ? "text-amber-600" : "text-red-600"}`}>
                        {p.margin}%
                      </span>
                    ) : "-"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => setShowDeleteModal({ id: p.id, name: p.name })}
                      className="text-red-600 hover:text-red-800 hover:bg-red-50 p-2 rounded transition"
                      title="Șterge produs"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal confirmare ștergere */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowDeleteModal(null)}
          />
          <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
            <div className="bg-red-50 px-6 py-4 border-b border-red-100">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-red-800">Șterge produs</h3>
              </div>
            </div>
            <div className="px-6 py-5">
              <p className="text-gray-700 leading-relaxed">
                Sigur doriți să ștergeți produsul <strong className="text-gray-900">{showDeleteModal.name}</strong>?
              </p>
              <p className="mt-2 text-sm text-gray-500">
                Această acțiune este ireversibilă și va elimina definitiv produsul din sistem.
              </p>
            </div>
            <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(null)}
                disabled={deleting}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors disabled:opacity-50"
              >
                Anulare
              </button>
              <button
                onClick={deleteProduct}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {deleting ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Se șterge...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Da, șterge
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
