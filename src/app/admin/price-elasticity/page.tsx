"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function PriceElasticityPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch("/admin/api/ai-price-elasticity");
      const data = await res.json();
      setProducts(data.products || []);
      setStats(data.stats);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  async function analyzeProduct(product: any) {
    setSelectedProduct(product);
    setAnalyzing(true);
    try {
      const res = await fetch("/admin/api/ai-price-elasticity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product })
      });
      const data = await res.json();
      setAnalysis(data.analysis);
    } catch (e) {
      console.error(e);
    }
    setAnalyzing(false);
  }

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const elasticityColors: Record<string, string> = {
    HIGHLY_ELASTIC: "bg-red-100 border-red-400",
    ELASTIC: "bg-orange-100 border-orange-400",
    UNIT_ELASTIC: "bg-yellow-100 border-yellow-400",
    INELASTIC: "bg-green-100 border-green-400",
    HIGHLY_INELASTIC: "bg-blue-100 border-blue-400"
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <Link href="/admin/ai-hub" className="text-blue-600 hover:underline text-sm">
          ← Înapoi la AI Hub
        </Link>
        <h1 className="text-2xl font-bold mt-2">📊 Elasticitate Prețuri</h1>
        <p className="text-gray-600">Analizează sensibilitatea la preț</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-100 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold">{stats.analyzedProducts}</div>
            <div className="text-sm text-gray-600">Produse Analizate</div>
          </div>
          <div className="bg-green-100 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-green-700">{stats.inelastic}</div>
            <div className="text-sm text-green-600">Inelastice (↑ preț)</div>
          </div>
          <div className="bg-red-100 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-red-700">{stats.elastic}</div>
            <div className="text-sm text-red-600">Elastice (↓ preț)</div>
          </div>
          <div className="bg-purple-100 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-purple-700">
              +{stats.potentialRevenueGain?.toLocaleString()}
            </div>
            <div className="text-sm text-purple-600">RON Potențial</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Products List */}
        <div>
          <div className="flex items-center gap-3 mb-3">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Caută produs..."
              className="flex-1 px-3 py-2 border rounded"
            />
          </div>

          {loading ? (
            <div className="text-center py-10">Se încarcă...</div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {filtered.map(p => (
                <div
                  key={p.id}
                  onClick={() => analyzeProduct(p)}
                  className={`border-2 rounded-lg p-4 cursor-pointer hover:shadow-md transition ${
                    elasticityColors[p.elasticity] || "bg-gray-100"
                  } ${selectedProduct?.id === p.id ? "ring-2 ring-blue-500" : ""}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-semibold line-clamp-1">{p.name}</div>
                      <div className="text-sm text-gray-600">{p.category}</div>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded text-white ${
                      p.elasticity === "HIGHLY_ELASTIC" ? "bg-red-600" :
                      p.elasticity === "ELASTIC" ? "bg-orange-500" :
                      p.elasticity === "UNIT_ELASTIC" ? "bg-yellow-500" :
                      p.elasticity === "INELASTIC" ? "bg-green-500" : "bg-blue-500"
                    }`}>
                      {p.elasticity}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-2 mt-3 text-xs text-center">
                    <div className="bg-white bg-opacity-50 p-1 rounded">
                      <div className="font-bold">{p.currentPrice?.toLocaleString()}</div>
                      <div>Preț Actual</div>
                    </div>
                    <div className="bg-white bg-opacity-50 p-1 rounded">
                      <div className="font-bold">{p.salesVolume}</div>
                      <div>Vânzări 30z</div>
                    </div>
                    <div className="bg-white bg-opacity-50 p-1 rounded">
                      <div className="font-bold">{p.elasticityCoef}</div>
                      <div>Coeficient</div>
                    </div>
                    <div className={`bg-white bg-opacity-50 p-1 rounded ${
                      p.priceChange > 0 ? "text-green-600" : "text-red-600"
                    }`}>
                      <div className="font-bold">
                        {p.priceChange > 0 ? "+" : ""}{p.priceChange}%
                      </div>
                      <div>Recomandare</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI Analysis */}
        <div>
          <h3 className="font-semibold mb-3">🤖 Analiză AI</h3>
          
          {!selectedProduct ? (
            <div className="bg-gray-100 rounded-lg p-10 text-center text-gray-500">
              Selectează un produs pentru analiză detaliată
            </div>
          ) : analyzing ? (
            <div className="text-center py-10">Se analizează...</div>
          ) : analysis ? (
            <div className="space-y-4">
              {/* Price Recommendation */}
              <div className={`border-2 rounded-lg p-4 ${
                analysis.recommendation?.action === "INCREASE" ? "bg-green-50 border-green-300" :
                analysis.recommendation?.action === "DECREASE" ? "bg-red-50 border-red-300" :
                "bg-gray-50 border-gray-300"
              }`}>
                <h4 className="font-semibold mb-2">💰 Recomandare Preț</h4>
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className="text-sm text-gray-500">Actual</div>
                    <div className="text-xl font-bold">{selectedProduct.currentPrice}</div>
                  </div>
                  <div className="text-2xl">→</div>
                  <div className="text-center">
                    <div className="text-sm text-gray-500">Recomandat</div>
                    <div className="text-xl font-bold text-blue-600">
                      {analysis.recommendation?.newPrice}
                    </div>
                  </div>
                  <div className={`ml-auto px-3 py-1 rounded text-sm font-medium ${
                    analysis.recommendation?.action === "INCREASE" ? "bg-green-200" :
                    analysis.recommendation?.action === "DECREASE" ? "bg-red-200" : "bg-gray-200"
                  }`}>
                    {analysis.recommendation?.action === "INCREASE" ? "↑" : 
                     analysis.recommendation?.action === "DECREASE" ? "↓" : "="}
                    {" "}{analysis.recommendation?.percentChange}%
                  </div>
                </div>
              </div>

              {/* Impact Projection */}
              {analysis.impactProjection && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-800 mb-2">📈 Impact Proiectat</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-600">Volum vânzări:</span>{" "}
                      <span className={analysis.impactProjection.salesVolumeChange >= 0 ? "text-green-600" : "text-red-600"}>
                        {analysis.impactProjection.salesVolumeChange > 0 ? "+" : ""}
                        {analysis.impactProjection.salesVolumeChange}%
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Venit:</span>{" "}
                      <span className={analysis.impactProjection.revenueChange >= 0 ? "text-green-600" : "text-red-600"}>
                        {analysis.impactProjection.revenueChange > 0 ? "+" : ""}
                        {analysis.impactProjection.revenueChange}%
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Profit:</span>{" "}
                      <span className={analysis.impactProjection.profitChange >= 0 ? "text-green-600" : "text-red-600"}>
                        {analysis.impactProjection.profitChange > 0 ? "+" : ""}
                        {analysis.impactProjection.profitChange}%
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Market share:</span>{" "}
                      <span>{analysis.impactProjection.marketShareImpact}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Risks */}
              {analysis.risks && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-semibold text-yellow-800 mb-2">⚠️ Riscuri</h4>
                  <ul className="list-disc ml-4 text-sm">
                    {analysis.risks.map((r: string, i: number) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Reasoning */}
              {analysis.reasoning && (
                <div className="bg-gray-50 border rounded-lg p-4">
                  <h4 className="font-semibold mb-2">💭 Raționament</h4>
                  <p className="text-sm">{analysis.reasoning}</p>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
