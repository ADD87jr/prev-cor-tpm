"use client";
import { useState, useEffect } from "react";

export default function ReturnPredictionPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  useEffect(() => {
    fetch("/admin/api/ai-return-prediction")
      .then(res => res.json())
      .then(data => {
        setOrders(data.ordersWithRisk || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const analyzeOrder = async (orderId: string) => {
    setAnalyzing(orderId);
    try {
      const res = await fetch("/admin/api/ai-return-prediction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId })
      });
      const data = await res.json();
      setSelectedOrder(data);
    } catch (error) {
      console.error(error);
    }
    setAnalyzing(null);
  };

  const getRiskColor = (score: number) => {
    if (score >= 70) return "bg-red-100 text-red-800 border-red-300";
    if (score >= 40) return "bg-yellow-100 text-yellow-800 border-yellow-300";
    return "bg-green-100 text-green-800 border-green-300";
  };

  const getRiskLabel = (score: number) => {
    if (score >= 70) return "Risc Ridicat";
    if (score >= 40) return "Risc Mediu";
    return "Risc Scăzut";
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
      <h1 className="text-2xl font-bold mb-2">🔮 Predicție Retururi & Reclamații</h1>
      <p className="text-gray-600 mb-6">Analizează comenzile cu risc crescut de retur sau reclamație</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lista comenzi */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b">
            <h2 className="font-semibold">Comenzi cu scor de risc</h2>
          </div>
          <div className="divide-y max-h-[600px] overflow-y-auto">
            {orders.map(order => (
              <div
                key={order.id}
                onClick={() => analyzeOrder(order.id)}
                className={`p-4 cursor-pointer hover:bg-gray-50 ${selectedOrder?.order?.id === order.id ? "bg-blue-50" : ""}`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">#{order.number || order.id.slice(0, 8)}</p>
                    <p className="text-sm text-gray-600">{order.clientName}</p>
                    <p className="text-sm text-gray-500">{order.total?.toFixed(2)} RON</p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block px-2 py-1 rounded border text-sm font-medium ${getRiskColor(order.riskScore)}`}>
                      {order.riskScore}% - {getRiskLabel(order.riskScore)}
                    </span>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(order.date).toLocaleDateString("ro-RO")}
                    </p>
                  </div>
                </div>
                {order.riskFactors && (
                  <div className="mt-2 flex gap-1 flex-wrap">
                    {order.riskFactors.map((f: string, i: number) => (
                      <span key={i} className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                        {f}
                      </span>
                    ))}
                  </div>
                )}
                {analyzing === order.id && (
                  <div className="mt-2 text-sm text-blue-600">Analizez cu AI...</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Detalii analiză */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b">
            <h2 className="font-semibold">Analiză AI Detaliată</h2>
          </div>
          {selectedOrder?.aiAnalysis ? (
            <div className="p-4 space-y-4 max-h-[600px] overflow-y-auto">
              {/* Risk Assessment */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium mb-2">Evaluare Risc</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-sm text-gray-600">Probabilitate retur</p>
                    <p className="text-xl font-bold text-red-600">
                      {selectedOrder.aiAnalysis.riskAssessment?.returnProbability || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Probabilitate reclamație</p>
                    <p className="text-xl font-bold text-orange-600">
                      {selectedOrder.aiAnalysis.riskAssessment?.complaintProbability || "N/A"}
                    </p>
                  </div>
                </div>
                {selectedOrder.aiAnalysis.riskAssessment?.mainConcerns && (
                  <div className="mt-3">
                    <p className="text-sm text-gray-600 mb-1">Motive principale:</p>
                    <ul className="text-sm space-y-1">
                      {selectedOrder.aiAnalysis.riskAssessment.mainConcerns.map((c: string, i: number) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-red-500">•</span>
                          {c}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Preventive Actions */}
              {selectedOrder.aiAnalysis.preventiveActions && (
                <div className="bg-green-50 rounded-lg p-4">
                  <h3 className="font-medium mb-2 text-green-800">Acțiuni Preventive</h3>
                  <ul className="space-y-2">
                    {selectedOrder.aiAnalysis.preventiveActions.map((action: any, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className={`px-1.5 py-0.5 rounded text-xs ${
                          action.priority === "urgent" ? "bg-red-200 text-red-800" :
                          action.priority === "high" ? "bg-orange-200 text-orange-800" :
                          "bg-gray-200 text-gray-800"
                        }`}>
                          {action.priority}
                        </span>
                        <div>
                          <p className="font-medium">{action.action}</p>
                          <p className="text-gray-600">{action.expectedOutcome}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Customer Insights */}
              {selectedOrder.aiAnalysis.customerInsights && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="font-medium mb-2 text-blue-800">Profilul Clientului</h3>
                  <div className="text-sm space-y-1">
                    <p><strong>Comportament:</strong> {selectedOrder.aiAnalysis.customerInsights.buyerBehavior}</p>
                    <p><strong>Satisfacție:</strong> {selectedOrder.aiAnalysis.customerInsights.satisfactionIndicators}</p>
                    <p><strong>Comunicare recomandată:</strong> {selectedOrder.aiAnalysis.customerInsights.communicationStyle}</p>
                  </div>
                </div>
              )}

              {/* Communication Template */}
              {selectedOrder.aiAnalysis.proactiveCommunication && (
                <div className="bg-purple-50 rounded-lg p-4">
                  <h3 className="font-medium mb-2 text-purple-800">Comunicare Proactivă</h3>
                  <div className="bg-white rounded p-3 text-sm">
                    <p className="font-medium">{selectedOrder.aiAnalysis.proactiveCommunication.subject}</p>
                    <p className="text-gray-600 mt-2 whitespace-pre-wrap">
                      {selectedOrder.aiAnalysis.proactiveCommunication.message}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">
              <p className="text-4xl mb-3">📋</p>
              <p>Selectați o comandă pentru a vedea analiza AI</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
