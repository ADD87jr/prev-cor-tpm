"use client";
import { useState, useEffect } from "react";

export default function FraudDetectionPage() {
  const [stats, setStats] = useState<any>(null);
  const [flaggedOrders, setFlaggedOrders] = useState<any[]>([]);
  const [rules, setRules] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const res = await fetch("/admin/api/ai-fraud-detection");
      const data = await res.json();
      setStats(data.stats);
      setFlaggedOrders(data.flaggedOrders || []);
      setRules(data.rules || []);
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  }

  async function analyzeOrder(orderId: string) {
    setAnalyzing(true);
    setAnalysis(null);
    try {
      const res = await fetch("/admin/api/ai-fraud-detection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId })
      });
      const data = await res.json();
      setAnalysis(data);
    } catch (error) {
      console.error(error);
    }
    setAnalyzing(false);
  }

  const getRiskColor = (level: string) => {
    switch (level) {
      case "HIGH": return "bg-red-100 text-red-800 border-red-300";
      case "MEDIUM": return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "LOW": return "bg-green-100 text-green-800 border-green-300";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">🛡️ AI Fraud Detection</h1>
      <p className="text-gray-600 mb-6">Detectare automată comenzi suspecte</p>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Analizez comenzile...</p>
        </div>
      ) : (
        <>
          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-white p-4 rounded-lg shadow border">
                <p className="text-sm text-gray-600">Analizate</p>
                <p className="text-2xl font-bold">{stats.totalAnalyzed}</p>
              </div>
              <div className="bg-red-50 p-4 rounded-lg shadow border border-red-200">
                <p className="text-sm text-red-600">Risc Mare</p>
                <p className="text-2xl font-bold text-red-700">{stats.highRisk}</p>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg shadow border border-yellow-200">
                <p className="text-sm text-yellow-600">Risc Mediu</p>
                <p className="text-2xl font-bold text-yellow-700">{stats.mediumRisk}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg shadow border border-green-200">
                <p className="text-sm text-green-600">Total Flagged</p>
                <p className="text-2xl font-bold text-green-700">{stats.totalFlagged}</p>
              </div>
            </div>
          )}

          {/* Rules */}
          <div className="bg-blue-50 p-4 rounded-lg mb-6 border border-blue-200">
            <h3 className="font-semibold text-blue-800 mb-2">📋 Reguli de Detectare</h3>
            <ul className="text-sm text-blue-700 grid grid-cols-2 gap-1">
              {rules.map((rule, i) => (
                <li key={i}>• {rule}</li>
              ))}
            </ul>
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* Flagged Orders */}
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="font-semibold mb-4">⚠️ Comenzi Suspecte ({flaggedOrders.length})</h2>
              
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {flaggedOrders.map((order) => (
                  <div 
                    key={order.orderId}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedOrder?.orderId === order.orderId 
                        ? "ring-2 ring-blue-500" 
                        : "hover:bg-gray-50"
                    } ${getRiskColor(order.riskLevel)}`}
                    onClick={() => {
                      setSelectedOrder(order);
                      setAnalysis(null);
                    }}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="font-medium">#{order.orderNumber}</span>
                        <span className="text-xs ml-2">
                          {new Date(order.date).toLocaleDateString("ro-RO")}
                        </span>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        order.riskLevel === "HIGH" ? "bg-red-500 text-white" : "bg-yellow-500 text-white"
                      }`}>
                        {order.riskScore}% RISC
                      </span>
                    </div>
                    <p className="text-sm">{order.clientName}</p>
                    <p className="text-xs opacity-75">{order.clientEmail}</p>
                    <p className="text-sm font-semibold mt-1">{order.total?.toLocaleString()} RON</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {order.riskFactors.slice(0, 3).map((factor: string, i: number) => (
                        <span key={i} className="text-xs px-2 py-0.5 bg-white/50 rounded">
                          {factor}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
                {flaggedOrders.length === 0 && (
                  <p className="text-center text-gray-500 py-8">
                    ✅ Nu sunt comenzi suspecte
                  </p>
                )}
              </div>
            </div>

            {/* Analysis Panel */}
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="font-semibold mb-4">🔍 Analiză AI Detaliată</h2>
              
              {selectedOrder ? (
                <div>
                  <div className="bg-gray-50 p-3 rounded-lg mb-4">
                    <p className="font-medium">Comandă #{selectedOrder.orderNumber}</p>
                    <p className="text-sm text-gray-600">{selectedOrder.clientName}</p>
                    <p className="text-sm font-semibold">{selectedOrder.total?.toLocaleString()} RON</p>
                  </div>

                  <button
                    onClick={() => analyzeOrder(selectedOrder.orderId)}
                    disabled={analyzing}
                    className="w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 mb-4"
                  >
                    {analyzing ? "Analizez cu AI..." : "🤖 Analiză AI Completă"}
                  </button>

                  {analysis?.analysis && (
                    <div className="space-y-4">
                      {/* Score & Recommendation */}
                      <div className={`p-4 rounded-lg ${getRiskColor(analysis.analysis.riskLevel)}`}>
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-semibold">Scor Risc AI</span>
                          <span className="text-2xl font-bold">{analysis.analysis.riskScore}%</span>
                        </div>
                        <p className="text-lg font-medium">
                          Recomandare: {analysis.analysis.recommendation}
                        </p>
                      </div>

                      {/* Summary */}
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-sm">{analysis.analysis.summary}</p>
                      </div>

                      {/* Red Flags */}
                      {analysis.analysis.redFlags?.length > 0 && (
                        <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                          <p className="font-semibold text-red-800 mb-2">🚩 Semnale de Alarmă</p>
                          <ul className="text-sm text-red-700 space-y-1">
                            {analysis.analysis.redFlags.map((flag: string, i: number) => (
                              <li key={i}>• {flag}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Green Flags */}
                      {analysis.analysis.greenFlags?.length > 0 && (
                        <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                          <p className="font-semibold text-green-800 mb-2">✅ Indicatori Pozitivi</p>
                          <ul className="text-sm text-green-700 space-y-1">
                            {analysis.analysis.greenFlags.map((flag: string, i: number) => (
                              <li key={i}>• {flag}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Actions */}
                      {analysis.analysis.suggestedActions?.length > 0 && (
                        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                          <p className="font-semibold text-blue-800 mb-2">📋 Acțiuni Recomandate</p>
                          <ul className="text-sm text-blue-700 space-y-1">
                            {analysis.analysis.suggestedActions.map((action: string, i: number) => (
                              <li key={i}>{i + 1}. {action}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-12">
                  Selectează o comandă pentru analiză detaliată
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
