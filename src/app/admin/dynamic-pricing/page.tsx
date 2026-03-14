"use client";

import { useState, useEffect } from "react";

interface PriceSuggestion {
  productId: number;
  productName: string;
  currentPrice: number;
  stock?: number;
  sales90days?: number;
  margin?: string;
  currentMargin?: string;
  suggestion: "reduce" | "increase";
  reason: string;
  suggestedPrice: number;
  suggestedDiscount?: number;
  suggestedIncrease?: number;
  priority: "critical" | "high" | "medium";
}

export default function AIDynamicPricingPage() {
  const [suggestions, setSuggestions] = useState<PriceSuggestion[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState<number | null>(null);
  const [analyzingCategory, setAnalyzingCategory] = useState<string | null>(null);
  const [categoryAnalysis, setCategoryAnalysis] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState("");

  useEffect(() => { loadSuggestions(); }, []);

  const loadSuggestions = async () => {
    setLoading(true);
    try {
      const res = await fetch("/admin/api/ai-dynamic-pricing");
      const data = await res.json();
      setSuggestions(data.suggestions || []);
      setStats(data.stats);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const applyPrice = async (productId: number, newPrice: number) => {
    setApplying(productId);
    try {
      const res = await fetch("/admin/api/ai-dynamic-pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "apply", productId, newPrice })
      });
      const data = await res.json();
      if (data.success) {
        setSuggestions(prev => prev.filter(s => s.productId !== productId));
      }
    } catch (e) {
      console.error(e);
    }
    setApplying(null);
  };

  const analyzeCategory = async () => {
    if (!selectedCategory) return;
    setAnalyzingCategory(selectedCategory);
    setCategoryAnalysis(null);

    try {
      const res = await fetch("/admin/api/ai-dynamic-pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "analyze-category", analyzeCategory: selectedCategory })
      });
      const data = await res.json();
      setCategoryAnalysis(data);
    } catch (e) {
      console.error(e);
    }
    setAnalyzingCategory(null);
  };

  const priorityBadge = (priority: string) => {
    const styles: Record<string, string> = {
      critical: "bg-red-100 text-red-700",
      high: "bg-orange-100 text-orange-700",
      medium: "bg-yellow-100 text-yellow-700"
    };
    const labels: Record<string, string> = {
      critical: "🔴 Critic",
      high: "🟠 Urgent",
      medium: "🟡 Mediu"
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-bold ${styles[priority] || styles.medium}`}>
        {labels[priority] || priority}
      </span>
    );
  };

  const categories = ["PLC", "HMI", "Senzori", "Invertoare", "Surse", "Module I/O", "Cabluri"];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">💰 AI Dynamic Pricing</h1>
      <p className="text-gray-600 mb-6">
        Optimizează prețurile bazat pe stoc, cerere și marje.
      </p>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-lg shadow p-4 text-center">
                <p className="text-3xl font-bold">{suggestions.length}</p>
                <p className="text-sm text-gray-500">Total sugestii</p>
              </div>
              <div className="bg-red-50 rounded-lg shadow p-4 text-center">
                <p className="text-3xl font-bold text-red-600">{stats.criticalPriority}</p>
                <p className="text-sm text-red-500">Prioritate critică</p>
              </div>
              <div className="flex gap-4">
                <div className="bg-green-50 rounded-lg shadow p-4 text-center flex-1">
                  <p className="text-2xl font-bold text-green-600">↑ {stats.increaseSuggestions}</p>
                  <p className="text-xs text-green-500">Creștere</p>
                </div>
                <div className="bg-blue-50 rounded-lg shadow p-4 text-center flex-1">
                  <p className="text-2xl font-bold text-blue-600">↓ {stats.reduceSuggestions}</p>
                  <p className="text-xs text-blue-500">Reducere</p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sugestii */}
            <div className="lg:col-span-2 bg-white rounded-lg shadow p-5">
              <h2 className="text-lg font-semibold text-gray-700 mb-4">Sugestii Preț</h2>
              
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {suggestions.map((sugg) => (
                  <div key={sugg.productId} className="border rounded p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium text-gray-800 truncate max-w-[300px]">{sugg.productName}</p>
                        <p className="text-sm text-gray-500">
                          Stoc: {sugg.stock ?? "N/A"} | Vânzări 90z: {sugg.sales90days ?? "N/A"} | Marjă: {sugg.margin || sugg.currentMargin || "N/A"}
                        </p>
                      </div>
                      {priorityBadge(sugg.priority)}
                    </div>

                    <div className="flex items-center gap-4 mb-2">
                      <div className="text-center">
                        <p className="text-xs text-gray-500">Actual</p>
                        <p className="text-lg font-bold">{sugg.currentPrice} RON</p>
                      </div>
                      <div className={`text-2xl ${sugg.suggestion === "increase" ? "text-green-500" : "text-blue-500"}`}>
                        {sugg.suggestion === "increase" ? "→" : "→"}
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500">Sugerat</p>
                        <p className={`text-lg font-bold ${sugg.suggestion === "increase" ? "text-green-600" : "text-blue-600"}`}>
                          {sugg.suggestedPrice} RON
                        </p>
                      </div>
                      <div className="text-sm text-gray-500">
                        {sugg.suggestedDiscount && `(-${sugg.suggestedDiscount}%)`}
                        {sugg.suggestedIncrease && `(+${sugg.suggestedIncrease}%)`}
                      </div>
                    </div>

                    <p className="text-sm text-gray-600 mb-3">{sugg.reason}</p>

                    <div className="flex gap-2">
                      <button
                        onClick={() => applyPrice(sugg.productId, sugg.suggestedPrice)}
                        disabled={applying === sugg.productId}
                        className="bg-green-500 text-white px-4 py-1 rounded text-sm hover:bg-green-600 disabled:opacity-50"
                      >
                        {applying === sugg.productId ? "Aplicare..." : "Aplică"}
                      </button>
                      <a
                        href={`/admin/produse/${sugg.productId}`}
                        className="bg-gray-100 text-gray-700 px-4 py-1 rounded text-sm hover:bg-gray-200"
                      >
                        Editează
                      </a>
                    </div>
                  </div>
                ))}

                {suggestions.length === 0 && (
                  <p className="text-green-600 text-center py-8">
                    ✅ Toate prețurile sunt optimizate!
                  </p>
                )}
              </div>
            </div>

            {/* Analiză categorie */}
            <div className="bg-white rounded-lg shadow p-5">
              <h2 className="text-lg font-semibold text-gray-700 mb-4">Analiză Categorie</h2>
              
              <div className="flex gap-2 mb-4">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="flex-1 border rounded px-3 py-2"
                >
                  <option value="">Selectează categorie</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <button
                  onClick={analyzeCategory}
                  disabled={!selectedCategory || analyzingCategory !== null}
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
                >
                  {analyzingCategory ? "..." : "Analizează"}
                </button>
              </div>

              {categoryAnalysis && (
                <div className="space-y-4">
                  {categoryAnalysis.categoryAnalysis && (
                    <div className="bg-gray-50 rounded p-3">
                      <p className="text-sm"><strong>Preț mediu:</strong> {categoryAnalysis.categoryAnalysis.avgPrice} RON</p>
                      <p className="text-sm"><strong>Marjă medie:</strong> {categoryAnalysis.categoryAnalysis.avgMargin}</p>
                      <p className="text-sm"><strong>Competitivitate:</strong> {categoryAnalysis.categoryAnalysis.competitiveness}</p>
                    </div>
                  )}

                  {categoryAnalysis.recommendations?.length > 0 && (
                    <div>
                      <p className="font-medium text-sm mb-2">Recomandări:</p>
                      <div className="space-y-2">
                        {categoryAnalysis.recommendations.slice(0, 5).map((rec: any, i: number) => (
                          <div key={i} className="text-sm border-l-2 border-blue-500 pl-2">
                            <p className="font-medium truncate">{rec.productName}</p>
                            <p className="text-gray-500">{rec.currentPrice} → {rec.suggestedPrice} RON</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {categoryAnalysis.insights?.length > 0 && (
                    <div>
                      <p className="font-medium text-sm mb-2">Insights:</p>
                      <ul className="list-disc list-inside text-sm text-gray-600">
                        {categoryAnalysis.insights.map((insight: string, i: number) => (
                          <li key={i}>{insight}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
