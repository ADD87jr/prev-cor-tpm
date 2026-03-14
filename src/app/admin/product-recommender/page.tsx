"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Recommendation {
  id: number;
  name: string;
  price: number;
  recommendationType: string;
  score: number;
  reason: string;
}

export default function ProductRecommenderPage() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchType, setSearchType] = useState<"trending" | "product" | "client">("trending");
  const [productId, setProductId] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [aiRecommendations, setAiRecommendations] = useState<any>(null);
  const [generatingAi, setGeneratingAi] = useState(false);

  useEffect(() => {
    loadRecommendations();
  }, []);

  async function loadRecommendations() {
    setLoading(true);
    try {
      let url = "/admin/api/ai-product-recommender?type=trending";
      
      if (searchType === "product" && productId) {
        url = `/admin/api/ai-product-recommender?productId=${productId}`;
      } else if (searchType === "client" && clientEmail) {
        url = `/admin/api/ai-product-recommender?client=${encodeURIComponent(clientEmail)}`;
      }

      const res = await fetch(url);
      const data = await res.json();
      setRecommendations(data.recommendations || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  async function generateAiRecommendations() {
    setGeneratingAi(true);
    try {
      const res = await fetch("/admin/api/ai-product-recommender", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context: searchType === "product" ? `Recomandări pentru produsul ID ${productId}` :
                   searchType === "client" ? `Recomandări pentru clientul ${clientEmail}` :
                   "Recomandări trending generale",
          productIds: recommendations.slice(0, 10).map(r => String(r.id))
        })
      });
      const data = await res.json();
      setAiRecommendations(data.aiRecommendations);
    } catch (e) {
      console.error(e);
    }
    setGeneratingAi(false);
  }

  const typeColors: Record<string, string> = {
    TRENDING: "bg-purple-100 text-purple-800",
    FREQUENTLY_BOUGHT_TOGETHER: "bg-green-100 text-green-800",
    SIMILAR_CATEGORY: "bg-blue-100 text-blue-800",
    PERSONALIZED: "bg-orange-100 text-orange-800"
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <Link href="/admin/ai-hub" className="text-blue-600 hover:underline text-sm">
          ← Înapoi la AI Hub
        </Link>
        <h1 className="text-2xl font-bold mt-2">🎯 Recomandări Produse AI</h1>
        <p className="text-gray-600">Widget inteligent de recomandări pentru clienți</p>
      </div>

      {/* Search Type */}
      <div className="bg-white border rounded-lg p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm font-medium mb-1">Tip recomandări</label>
            <select
              value={searchType}
              onChange={(e) => setSearchType(e.target.value as any)}
              className="px-3 py-2 border rounded"
            >
              <option value="trending">🔥 Trending (cele mai vândute)</option>
              <option value="product">📦 Pentru un produs specific</option>
              <option value="client">👤 Pentru un client</option>
            </select>
          </div>

          {searchType === "product" && (
            <div>
              <label className="block text-sm font-medium mb-1">ID Produs</label>
              <input
                type="text"
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                placeholder="ex: 123"
                className="px-3 py-2 border rounded"
              />
            </div>
          )}

          {searchType === "client" && (
            <div>
              <label className="block text-sm font-medium mb-1">Email Client</label>
              <input
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="client@firma.ro"
                className="px-3 py-2 border rounded w-64"
              />
            </div>
          )}

          <button
            onClick={loadRecommendations}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "..." : "🔍 Caută"}
          </button>

          <button
            onClick={generateAiRecommendations}
            disabled={generatingAi || recommendations.length === 0}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
          >
            {generatingAi ? "..." : "🤖 Analiză AI Avansată"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recommendations Grid */}
        <div className="lg:col-span-2">
          <h3 className="font-semibold mb-3">
            📦 Recomandări ({recommendations.length})
          </h3>

          {loading ? (
            <div className="text-center py-10">Se încarcă...</div>
          ) : recommendations.length === 0 ? (
            <div className="bg-gray-100 rounded-lg p-10 text-center text-gray-500">
              Nu s-au găsit recomandări. Verifică parametrii.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recommendations.map((rec, i) => (
                <div key={rec.id || i} className="bg-white border rounded-lg p-4 hover:shadow-md transition">
                  <div className="flex justify-between items-start mb-2">
                    <span className={`px-2 py-0.5 text-xs rounded ${typeColors[rec.recommendationType] || "bg-gray-100"}`}>
                      {rec.recommendationType?.replace(/_/g, " ")}
                    </span>
                    <span className="text-sm font-bold text-green-600">
                      {rec.price?.toLocaleString()} RON
                    </span>
                  </div>
                  <h4 className="font-medium">{rec.name}</h4>
                  <p className="text-sm text-gray-600 mt-1">{rec.reason}</p>
                  {rec.score > 0 && (
                    <div className="mt-2 text-xs text-gray-500">
                      Scor: {rec.score}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI Analysis */}
        <div>
          <h3 className="font-semibold mb-3">🤖 Analiză AI</h3>
          
          {!aiRecommendations ? (
            <div className="bg-gray-100 rounded-lg p-6 text-center text-gray-500 text-sm">
              <div className="text-4xl mb-2">🤖</div>
              <p>Apasă "Analiză AI Avansată" pentru recomandări inteligente</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Bundles */}
              {aiRecommendations.bundles && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h4 className="font-semibold text-purple-800 mb-2">📦 Pachete Sugerate</h4>
                  <div className="space-y-2">
                    {aiRecommendations.bundles.map((bundle: any, i: number) => (
                      <div key={i} className="bg-white p-2 rounded text-sm">
                        <div className="font-medium">{bundle.name}</div>
                        <div className="text-xs text-gray-600">
                          {bundle.products?.join(" + ")}
                        </div>
                        <div className="text-xs text-green-600">
                          Discount: {bundle.discount}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Cross-sell */}
              {aiRecommendations.crossSellOpportunities && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-semibold text-green-800 mb-2">🔗 Cross-sell</h4>
                  <div className="space-y-2 text-sm">
                    {aiRecommendations.crossSellOpportunities.map((cs: any, i: number) => (
                      <div key={i} className="bg-white p-2 rounded">
                        <div>Dacă cumpără <strong>{cs.if_buys}</strong></div>
                        <div>→ Recomandă <strong>{cs.recommend}</strong></div>
                        <div className="text-xs text-gray-600">{cs.reason}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Priority Recommendations */}
              {aiRecommendations.recommendations && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-800 mb-2">⭐ Prioritare</h4>
                  <div className="space-y-2 text-sm">
                    {aiRecommendations.recommendations.slice(0, 5).map((rec: any, i: number) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className={`px-1 text-xs rounded ${
                          rec.priority === "HIGH" ? "bg-red-200" : 
                          rec.priority === "MEDIUM" ? "bg-yellow-200" : "bg-gray-200"
                        }`}>
                          {rec.priority}
                        </span>
                        <span>{rec.productName}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Seasonal */}
              {aiRecommendations.seasonalRecommendations && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm">
                  <span className="font-medium">🌸 Sezonier:</span>{" "}
                  {aiRecommendations.seasonalRecommendations}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Widget Preview */}
      <div className="mt-8">
        <h3 className="font-semibold mb-3">👁️ Preview Widget (cum ar arăta pe site)</h3>
        <div className="bg-gray-100 p-4 rounded-lg">
          <div className="bg-white rounded-lg p-4 max-w-md">
            <h4 className="font-medium mb-3">
              {searchType === "product" ? "Cumpărate frecvent împreună" :
               searchType === "client" ? "Recomandate pentru tine" :
               "🔥 Cele mai populare"}
            </h4>
            <div className="space-y-2">
              {recommendations.slice(0, 3).map((rec, i) => (
                <div key={i} className="flex items-center gap-3 p-2 border rounded hover:bg-gray-50">
                  <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center text-2xl">
                    📦
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium line-clamp-1">{rec.name}</div>
                    <div className="text-sm text-green-600 font-bold">
                      {rec.price?.toLocaleString()} RON
                    </div>
                  </div>
                  <button className="px-2 py-1 bg-blue-600 text-white text-xs rounded">
                    +
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
