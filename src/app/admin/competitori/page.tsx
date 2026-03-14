"use client";
import { useState, useEffect } from "react";

export default function CompetitorMonitorPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    fetch("/admin/api/ai-competitor-monitor")
      .then(res => res.json())
      .then(d => {
        setData(d);
        setLoading(false);
      });
  }, []);

  const analyzeProduct = async (productId: string) => {
    setAnalyzing(true);
    try {
      const res = await fetch("/admin/api/ai-competitor-monitor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId })
      });
      const d = await res.json();
      setSelectedProduct(d);
    } catch (e) {
      console.error(e);
    }
    setAnalyzing(false);
  };

  const getPositionBadge = (position: string) => {
    switch (position) {
      case "cheapest":
        return <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">Cel mai ieftin</span>;
      case "competitive":
        return <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">Competitiv</span>;
      default:
        return <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs">Mai scump</span>;
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">🔍 Monitorizare Competitori</h1>
      <p className="text-gray-600 mb-6">Compară prețurile tale cu ale competiției</p>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{data?.stats?.monitored || 0}</p>
          <p className="text-gray-600 text-sm">Produse monitorizate</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <p className="text-2xl font-bold text-purple-600">{data?.stats?.competitors || 0}</p>
          <p className="text-gray-600 text-sm">Competitori</p>
        </div>
        <div className="bg-green-50 rounded-lg shadow p-4 text-center border-2 border-green-200">
          <p className="text-2xl font-bold text-green-600">{data?.stats?.cheapest || 0}</p>
          <p className="text-gray-600 text-sm">Cel mai ieftin</p>
        </div>
        <div className="bg-blue-50 rounded-lg shadow p-4 text-center border-2 border-blue-200">
          <p className="text-2xl font-bold text-blue-600">{data?.stats?.competitive || 0}</p>
          <p className="text-gray-600 text-sm">Competitiv</p>
        </div>
        <div className="bg-red-50 rounded-lg shadow p-4 text-center border-2 border-red-200">
          <p className="text-2xl font-bold text-red-600">{data?.stats?.expensive || 0}</p>
          <p className="text-gray-600 text-sm">Mai scump</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Products List */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b flex justify-between items-center">
            <h3 className="font-semibold">Produse vs Competiție</h3>
            <span className="text-sm text-gray-500">{data?.competitors?.join(", ")}</span>
          </div>
          <div className="divide-y max-h-[600px] overflow-y-auto">
            {data?.competitorData?.map((item: any) => (
              <div
                key={item.product.id}
                onClick={() => analyzeProduct(item.product.id)}
                className={`p-4 cursor-pointer hover:bg-gray-50 ${
                  selectedProduct?.product?.id === item.product.id ? "bg-blue-50" : ""
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{item.product.name}</p>
                    <p className="text-sm text-gray-500">{item.product.sku}</p>
                  </div>
                  <div className="text-right">
                    {getPositionBadge(item.analysis.ourPosition)}
                    <p className="text-xs text-gray-500 mt-1">
                      {item.analysis.priceDiffPercent > 0 ? "+" : ""}{item.analysis.priceDiffPercent}% vs medie
                    </p>
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                  <div className="bg-blue-50 rounded p-2 text-center">
                    <p className="text-xs text-gray-600">Prețul nostru</p>
                    <p className="font-bold text-blue-600">{item.product.ourPrice} RON</p>
                  </div>
                  <div className="bg-gray-50 rounded p-2 text-center">
                    <p className="text-xs text-gray-600">Min competitori</p>
                    <p className="font-bold">{item.analysis.minPrice} RON</p>
                  </div>
                  <div className="bg-gray-50 rounded p-2 text-center">
                    <p className="text-xs text-gray-600">Medie competitori</p>
                    <p className="font-bold">{item.analysis.avgPrice} RON</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Analysis Panel */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b">
            <h3 className="font-semibold">Analiză AI Detaliată</h3>
          </div>
          
          {analyzing ? (
            <div className="p-8 text-center">
              <div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600">Analizez competiția...</p>
            </div>
          ) : selectedProduct?.aiAnalysis ? (
            <div className="p-4 space-y-4 max-h-[600px] overflow-y-auto">
              {/* Product Summary */}
              <div className="bg-gray-50 rounded-lg p-3">
                <h4 className="font-medium">{selectedProduct.product?.name}</h4>
                <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                  <div>
                    <span className="text-gray-600">Prețul nostru: </span>
                    <span className="font-bold">{selectedProduct.summary?.ourPrice} RON</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Minim piață: </span>
                    <span className="font-bold text-green-600">{selectedProduct.summary?.minCompetitorPrice} RON</span>
                  </div>
                </div>
              </div>

              {/* Market Position */}
              <div className="bg-blue-50 rounded-lg p-3">
                <h4 className="font-medium text-blue-800 mb-2">📊 Poziție pe Piață</h4>
                <p className="text-lg font-bold">{selectedProduct.aiAnalysis.marketPosition}</p>
              </div>

              {/* Advantages */}
              {selectedProduct.aiAnalysis.competitiveAdvantages && (
                <div className="bg-green-50 rounded-lg p-3">
                  <h4 className="font-medium text-green-800 mb-2">✓ Avantajele noastre</h4>
                  <ul className="text-sm space-y-1">
                    {selectedProduct.aiAnalysis.competitiveAdvantages.map((adv: string, i: number) => (
                      <li key={i}>• {adv}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Pricing Recommendation */}
              {selectedProduct.aiAnalysis.pricingRecommendation && (
                <div className={`rounded-lg p-3 ${
                  selectedProduct.aiAnalysis.pricingRecommendation.action === "reduce" ? "bg-orange-50" :
                  selectedProduct.aiAnalysis.pricingRecommendation.action === "crește" ? "bg-purple-50" :
                  "bg-gray-50"
                }`}>
                  <h4 className="font-medium mb-2">💰 Recomandare Preț</h4>
                  <p className="text-lg font-bold">
                    {selectedProduct.aiAnalysis.pricingRecommendation.action?.toUpperCase()}
                    {selectedProduct.aiAnalysis.pricingRecommendation.suggestedPrice > 0 && (
                      <span className="text-sm font-normal ml-2">
                        → {selectedProduct.aiAnalysis.pricingRecommendation.suggestedPrice} RON
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedProduct.aiAnalysis.pricingRecommendation.reasoning}
                  </p>
                </div>
              )}

              {/* Threat Analysis */}
              {selectedProduct.aiAnalysis.threatAnalysis && (
                <div className="bg-red-50 rounded-lg p-3">
                  <h4 className="font-medium text-red-800 mb-2">⚠️ Analiză Amenințări</h4>
                  <div className="space-y-2">
                    {selectedProduct.aiAnalysis.threatAnalysis.map((threat: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          threat.threatLevel === "ridicat" ? "bg-red-200 text-red-800" :
                          threat.threatLevel === "mediu" ? "bg-yellow-200 text-yellow-800" :
                          "bg-green-200 text-green-800"
                        }`}>
                          {threat.threatLevel}
                        </span>
                        <span><strong>{threat.competitor}:</strong> {threat.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Items */}
              {selectedProduct.aiAnalysis.actionItems && (
                <div className="bg-purple-50 rounded-lg p-3">
                  <h4 className="font-medium text-purple-800 mb-2">📋 Acțiuni Recomandate</h4>
                  <ul className="space-y-2 text-sm">
                    {selectedProduct.aiAnalysis.actionItems.map((item: any, i: number) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className={`px-2 py-0.5 rounded text-xs whitespace-nowrap ${
                          item.priority === "urgent" ? "bg-red-200" :
                          item.priority === "important" ? "bg-orange-200" :
                          "bg-gray-200"
                        }`}>
                          {item.priority}
                        </span>
                        <span>{item.action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">
              <p className="text-4xl mb-3">🔍</p>
              <p>Selectează un produs pentru analiză detaliată</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
