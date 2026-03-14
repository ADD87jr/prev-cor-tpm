"use client";

import { useState, useEffect } from "react";

interface CrossSellPair {
  count: number;
  product1: { id: number; name: string; price: number; type: string };
  product2: { id: number; name: string; price: number; type: string };
}

interface Recommendation {
  productId: number;
  productName: string;
  price?: number;
  score: number;
  reason: string;
  crossSellMessage?: string;
}

export default function AICrossSellPage() {
  const [pairs, setPairs] = useState<CrossSellPair[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [productInfo, setProductInfo] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/admin/api/ai-crosssell");
      const data = await res.json();
      setPairs(data.crossSellPairs || []);
      setStats(data.stats);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const analyzeProduct = async (productId: number) => {
    setAnalyzing(true);
    setSelectedProduct(productId);
    setRecommendations([]);
    
    try {
      const res = await fetch("/admin/api/ai-crosssell", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId })
      });
      const data = await res.json();
      setRecommendations(data.recommendations || []);
      setProductInfo(data.product);
    } catch (e) {
      console.error(e);
    }
    setAnalyzing(false);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">🛒 AI Cross-Sell Smart</h1>
      <p className="text-gray-600 mb-6">Analizează ce produse se cumpără frecvent împreună și generează recomandări.</p>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Perechi populare */}
          <div className="bg-white rounded-lg shadow p-5">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">
              Produse Cumpărate Frecvent Împreună
            </h2>
            {stats && (
              <p className="text-sm text-gray-500 mb-4">
                {stats.frequentPairs} perechi frecvente din {stats.totalPairs} total
              </p>
            )}
            
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {pairs.map((pair, i) => (
                <div key={i} className="border rounded p-3 hover:bg-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded">
                      {pair.count}x împreună
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div 
                      className="cursor-pointer hover:text-blue-600"
                      onClick={() => analyzeProduct(pair.product1.id)}
                    >
                      <p className="font-medium truncate">{pair.product1.name}</p>
                      <p className="text-gray-500">{pair.product1.price} RON</p>
                    </div>
                    <div 
                      className="cursor-pointer hover:text-blue-600"
                      onClick={() => analyzeProduct(pair.product2.id)}
                    >
                      <p className="font-medium truncate">{pair.product2.name}</p>
                      <p className="text-gray-500">{pair.product2.price} RON</p>
                    </div>
                  </div>
                </div>
              ))}
              
              {pairs.length === 0 && (
                <p className="text-gray-500 text-center py-4">Nu sunt suficiente date de comenzi.</p>
              )}
            </div>
          </div>

          {/* Recomandări pentru produs selectat */}
          <div className="bg-white rounded-lg shadow p-5">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">
              Recomandări Cross-Sell
            </h2>
            
            {analyzing ? (
              <div className="flex justify-center py-10">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                <span className="ml-3 text-gray-600">Analizez cu AI...</span>
              </div>
            ) : productInfo ? (
              <div>
                <div className="bg-blue-50 rounded p-3 mb-4">
                  <p className="font-medium text-blue-800">{productInfo.name}</p>
                  <p className="text-sm text-blue-600">{productInfo.type} • {productInfo.price} RON</p>
                </div>

                <div className="space-y-3">
                  {recommendations.map((rec, i) => (
                    <div key={i} className="border rounded p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-gray-800">{rec.productName}</p>
                          {rec.price && <p className="text-sm text-gray-500">{rec.price} RON</p>}
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          rec.score >= 90 ? "bg-green-100 text-green-700" :
                          rec.score >= 70 ? "bg-yellow-100 text-yellow-700" :
                          "bg-gray-100 text-gray-700"
                        }`}>
                          {rec.score}% match
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-2">{rec.reason}</p>
                      {rec.crossSellMessage && (
                        <p className="text-sm text-green-600 mt-1 italic">"{rec.crossSellMessage}"</p>
                      )}
                    </div>
                  ))}
                </div>

                {recommendations.length === 0 && (
                  <p className="text-gray-500 text-center py-4">Nu sunt recomandări disponibile.</p>
                )}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-10">
                Selectează un produs din stânga pentru a vedea recomandări cross-sell.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
