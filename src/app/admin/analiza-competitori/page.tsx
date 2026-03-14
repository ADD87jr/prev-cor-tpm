"use client";

import { useState, useEffect } from "react";

interface Product {
  id: number;
  name: string;
  type?: string;
  manufacturer?: string;
  price: number;
  listPrice?: number;
  purchasePrice?: number;
}

interface Competitor {
  name: string;
  price: number;
}

interface AnalysisResult {
  productId: number;
  productName: string;
  currentPrice: number;
  competitors: Competitor[];
  marketPosition: string;
  competitiveIndex: number;
  recommendedPrice: number;
  priceChange: string;
  analysis: string;
  strengths: string[];
  threats: string[];
  strategy: string;
  urgency: string;
}

export default function AICompetitorAnalysisPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState<number | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => { loadProducts(); }, []);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/admin/api/ai-competitor-analysis");
      const data = await res.json();
      setProducts(data.products || []);
      setStats(data.stats);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const analyzeProduct = async (product: Product) => {
    setAnalyzing(product.id);
    setSelectedProduct(product);
    setResult(null);

    try {
      const res = await fetch("/admin/api/ai-competitor-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id })
      });
      const data = await res.json();
      setResult(data);
    } catch (e) {
      console.error(e);
    }
    setAnalyzing(null);
  };

  const getPositionColor = (pos: string) => {
    if (pos === "below_market") return "bg-green-100 text-green-700";
    if (pos === "above_market") return "bg-red-100 text-red-700";
    return "bg-yellow-100 text-yellow-700";
  };

  const getUrgencyColor = (urgency: string) => {
    if (urgency === "high") return "bg-red-500";
    if (urgency === "medium") return "bg-yellow-500";
    return "bg-green-500";
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.manufacturer || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">📊 AI Analiză Competitori</h1>
      <p className="text-gray-600 mb-6">
        Compară prețurile tale cu competitorii și primește recomandări de ajustare.
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
                <p className="text-3xl font-bold">{stats.totalProducts}</p>
                <p className="text-sm text-gray-500">Produse</p>
              </div>
              <div className="bg-blue-50 rounded-lg shadow p-4 text-center">
                <p className="text-3xl font-bold text-blue-600">{stats.avgMargin}%</p>
                <p className="text-sm text-blue-500">Marjă medie</p>
              </div>
              <div className="bg-green-50 rounded-lg shadow p-4 text-center">
                <p className="text-3xl font-bold text-green-600">{stats.productsWithPurchasePrice}</p>
                <p className="text-sm text-green-500">Cu preț achiziție</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Lista produse */}
            <div className="bg-white rounded-lg shadow p-5">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Caută produs..."
                className="w-full border rounded px-3 py-2 text-sm mb-4"
              />
              
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {filteredProducts.slice(0, 30).map((product) => (
                  <div 
                    key={product.id} 
                    className={`border rounded p-3 cursor-pointer hover:bg-gray-50 ${
                      selectedProduct?.id === product.id ? "border-blue-500 bg-blue-50" : ""
                    }`}
                    onClick={() => analyzeProduct(product)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800 text-sm truncate">{product.name}</p>
                        <p className="text-xs text-gray-500">{product.manufacturer}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-800">{product.price?.toFixed(2)} RON</p>
                        {analyzing === product.id && (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mt-1 ml-auto"></div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Rezultat analiză */}
            <div className="lg:col-span-2 bg-white rounded-lg shadow p-5">
              <h2 className="text-lg font-semibold text-gray-700 mb-4">Analiză Competitivă</h2>

              {analyzing !== null ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
                  <p className="text-gray-600">Analizez piața...</p>
                </div>
              ) : result ? (
                <div className="space-y-4">
                  {/* Header produs */}
                  <div className="bg-gray-50 rounded p-4 flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-gray-800">{result.productName}</p>
                      <p className="text-sm text-gray-600">Preț curent: {result.currentPrice?.toFixed(2)} RON</p>
                    </div>
                    <div className={`px-3 py-1 rounded ${getPositionColor(result.marketPosition)}`}>
                      {result.marketPosition === "below_market" ? "Sub piață" : 
                       result.marketPosition === "above_market" ? "Peste piață" : "La nivelul pieței"}
                    </div>
                  </div>

                  {/* Competitori */}
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-2">Prețuri competitori:</p>
                    <div className="space-y-1">
                      {result.competitors?.map((c, i) => (
                        <div key={i} className="flex justify-between text-sm bg-gray-50 rounded p-2">
                          <span>{c.name}</span>
                          <span className={c.price < result.currentPrice ? "text-red-600" : "text-green-600"}>
                            {c.price?.toFixed(2)} RON
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recomandare preț */}
                  <div className="bg-blue-50 rounded p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-blue-800">Preț recomandat:</span>
                      <span className="text-2xl font-bold text-blue-600">{result.recommendedPrice?.toFixed(2)} RON</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-blue-600">Ajustare: {result.priceChange}</span>
                      <span className={`w-2 h-2 rounded-full ${getUrgencyColor(result.urgency)}`}></span>
                      <span className="text-xs text-gray-500">Urgență: {result.urgency}</span>
                    </div>
                  </div>

                  {/* Index competitiv */}
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-gray-600">Index competitiv</span>
                      <span className="text-sm font-medium">{result.competitiveIndex}/100</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          result.competitiveIndex >= 70 ? "bg-green-500" : 
                          result.competitiveIndex >= 40 ? "bg-yellow-500" : "bg-red-500"
                        }`}
                        style={{ width: `${result.competitiveIndex}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Analiză */}
                  <div className="bg-gray-50 rounded p-3">
                    <p className="text-sm text-gray-700">{result.analysis}</p>
                  </div>

                  {/* Puncte forte / Amenințări */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-green-700 mb-2">✅ Puncte forte:</p>
                      <ul className="space-y-1">
                        {result.strengths?.map((s, i) => (
                          <li key={i} className="text-xs text-green-600">• {s}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-red-700 mb-2">⚠️ Amenințări:</p>
                      <ul className="space-y-1">
                        {result.threats?.map((t, i) => (
                          <li key={i} className="text-xs text-red-600">• {t}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Strategie */}
                  <div className="bg-purple-50 rounded p-3">
                    <p className="text-sm font-medium text-purple-800 mb-1">📋 Strategie recomandată:</p>
                    <p className="text-sm text-purple-700">{result.strategy}</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-20">
                  <p className="text-gray-500">Selectează un produs pentru a vedea analiza competitivă</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
