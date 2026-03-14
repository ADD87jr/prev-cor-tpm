"use client";

import { useState, useEffect } from "react";

interface OrderRisk {
  orderId: number;
  orderNumber: string;
  customerName: string;
  email: string;
  totalValue: number;
  riskLevel: "low" | "medium" | "high";
  riskScore: number;
  flags: string[];
  date: string;
}

interface AnalysisResult {
  orderId: number;
  riskAssessment: {
    overallRisk: "low" | "medium" | "high";
    riskScore: number;
    fraudProbability: string;
    recommendation: string;
    analysis: string;
    redFlags: string[];
    greenFlags: string[];
    suggestedActions: string[];
  };
}

export default function AIFraudDetectionPage() {
  const [orders, setOrders] = useState<OrderRisk[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState<number | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<OrderRisk | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

  useEffect(() => { loadOrders(); }, []);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch("/admin/api/ai-fraud-detection");
      const data = await res.json();
      setOrders(data.suspiciousOrders || []);
      setStats({
        high: data.highRisk,
        medium: data.mediumRisk,
        low: data.lowRisk,
        analyzed: data.totalAnalyzed
      });
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const analyzeOrder = async (order: OrderRisk) => {
    setAnalyzing(order.orderId);
    setSelectedOrder(order);
    setAnalysisResult(null);

    try {
      const res = await fetch("/admin/api/ai-fraud-detection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.orderId })
      });
      const data = await res.json();
      setAnalysisResult(data);
    } catch (e) {
      console.error(e);
    }
    setAnalyzing(null);
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case "high": return "bg-red-100 text-red-700 border-red-300";
      case "medium": return "bg-yellow-100 text-yellow-700 border-yellow-300";
      default: return "bg-green-100 text-green-700 border-green-300";
    }
  };

  const getRiskBadge = (level: string) => {
    switch (level) {
      case "high": return "🔴 Risc mare";
      case "medium": return "🟡 Risc mediu";
      default: return "🟢 Risc scăzut";
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">🛡️ AI Detecție Fraudă</h1>
      <p className="text-gray-600 mb-6">
        Analizează comenzile pentru indicii de fraudă și comportament suspect.
      </p>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600"></div>
        </div>
      ) : (
        <>
          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-lg shadow p-4 text-center">
                <p className="text-3xl font-bold">{stats.analyzed}</p>
                <p className="text-sm text-gray-500">Comenzi analizate</p>
              </div>
              <div className="bg-red-50 rounded-lg shadow p-4 text-center">
                <p className="text-3xl font-bold text-red-600">{stats.high}</p>
                <p className="text-sm text-red-500">Risc mare</p>
              </div>
              <div className="bg-yellow-50 rounded-lg shadow p-4 text-center">
                <p className="text-3xl font-bold text-yellow-600">{stats.medium}</p>
                <p className="text-sm text-yellow-500">Risc mediu</p>
              </div>
              <div className="bg-green-50 rounded-lg shadow p-4 text-center">
                <p className="text-3xl font-bold text-green-600">{stats.low}</p>
                <p className="text-sm text-green-500">Risc scăzut</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Lista comenzi suspecte */}
            <div className="bg-white rounded-lg shadow p-5">
              <h2 className="text-lg font-semibold text-gray-700 mb-4">
                Comenzi Suspecte ({orders.length})
              </h2>
              
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {orders.map((order) => (
                  <div 
                    key={order.orderId} 
                    className={`border rounded p-3 cursor-pointer hover:bg-gray-50 ${
                      selectedOrder?.orderId === order.orderId ? "border-blue-500 bg-blue-50" : ""
                    }`}
                    onClick={() => analyzeOrder(order)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-800">#{order.orderNumber}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${getRiskColor(order.riskLevel)}`}>
                            {getRiskBadge(order.riskLevel)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">{order.customerName}</p>
                        <p className="text-xs text-gray-500">{order.email}</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {order.flags.slice(0, 3).map((flag, i) => (
                            <span key={i} className="text-xs bg-red-50 text-red-600 px-1.5 py-0.5 rounded">
                              {flag}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-800">{order.totalValue.toFixed(2)} RON</p>
                        <p className="text-xs text-gray-500">{new Date(order.date).toLocaleDateString("ro-RO")}</p>
                        {analyzing === order.orderId && (
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-600 mt-2 ml-auto"></div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {orders.length === 0 && (
                  <p className="text-green-600 text-center py-8">
                    ✅ Nu au fost detectate comenzi suspecte!
                  </p>
                )}
              </div>
            </div>

            {/* Rezultat analiză */}
            <div className="bg-white rounded-lg shadow p-5">
              <h2 className="text-lg font-semibold text-gray-700 mb-4">
                Analiză Detaliată AI
              </h2>

              {analyzing !== null ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600 mb-4"></div>
                  <p className="text-gray-600">Analizez comanda...</p>
                </div>
              ) : analysisResult?.riskAssessment ? (
                <div className="space-y-4">
                  {/* Header risc */}
                  <div className={`rounded p-4 ${getRiskColor(analysisResult.riskAssessment.overallRisk)}`}>
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-lg">
                        {getRiskBadge(analysisResult.riskAssessment.overallRisk)}
                      </span>
                      <span className="font-bold text-2xl">
                        Scor: {analysisResult.riskAssessment.riskScore}/100
                      </span>
                    </div>
                    <p className="mt-2">
                      Probabilitate fraudă: <strong>{analysisResult.riskAssessment.fraudProbability}</strong>
                    </p>
                  </div>

                  {/* Recomandare */}
                  <div className="bg-blue-50 rounded p-3">
                    <p className="font-medium text-blue-800">📋 Recomandare:</p>
                    <p className="text-blue-700 text-sm mt-1">{analysisResult.riskAssessment.recommendation}</p>
                  </div>

                  {/* Analiză */}
                  <div>
                    <p className="font-medium text-gray-700 mb-2">Analiză:</p>
                    <p className="text-sm text-gray-600 bg-gray-50 rounded p-3">
                      {analysisResult.riskAssessment.analysis}
                    </p>
                  </div>

                  {/* Red Flags */}
                  {analysisResult.riskAssessment.redFlags && analysisResult.riskAssessment.redFlags.length > 0 && (
                    <div>
                      <p className="font-medium text-red-700 mb-2">🚩 Semnale de alarmă:</p>
                      <ul className="space-y-1">
                        {analysisResult.riskAssessment.redFlags.map((flag, i) => (
                          <li key={i} className="text-sm text-red-600 flex items-start gap-2">
                            <span>⚠️</span> {flag}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Green Flags */}
                  {analysisResult.riskAssessment.greenFlags && analysisResult.riskAssessment.greenFlags.length > 0 && (
                    <div>
                      <p className="font-medium text-green-700 mb-2">✅ Puncte pozitive:</p>
                      <ul className="space-y-1">
                        {analysisResult.riskAssessment.greenFlags.map((flag, i) => (
                          <li key={i} className="text-sm text-green-600 flex items-start gap-2">
                            <span>✓</span> {flag}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Acțiuni sugerate */}
                  {analysisResult.riskAssessment.suggestedActions && (
                    <div>
                      <p className="font-medium text-gray-700 mb-2">📌 Acțiuni sugerate:</p>
                      <ul className="space-y-1">
                        {analysisResult.riskAssessment.suggestedActions.map((action, i) => (
                          <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                            <span className="text-blue-500">{i + 1}.</span> {action}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-20">
                  Selectează o comandă pentru a vedea analiza detaliată AI.
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
