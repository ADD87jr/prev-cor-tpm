"use client";

import { useState, useEffect } from "react";

interface OrderDetails {
  orderId: number;
  orderNumber: string;
  clientName: string;
  clientEmail: string;
  totalValue: number;
  itemsCount: number;
  status: string;
  paymentMethod: string;
  orderDate: string;
  daysSinceOrder: number;
  priorityScore: number;
}

interface PriorityAnalysis {
  success: boolean;
  orderId: number;
  orderNumber: string;
  urgencyLevel: "critică" | "mare" | "medie" | "mică";
  priorityScore: number;
  factors: {
    factor: string;
    impact: "pozitiv" | "negativ" | "neutru";
    weight: number;
    explanation: string;
  }[];
  recommendedActions: {
    action: string;
    priority: "imediată" | "zilnică" | "săptămânală";
    reason: string;
  }[];
  estimatedProcessingTime: string;
  customerProfile: {
    type: string;
    previousOrders: number;
    riskLevel: "low" | "medium" | "high";
  };
  specialConsiderations: string[];
}

export default function AIPrioritizareBeganziPage() {
  const [orders, setOrders] = useState<OrderDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState<number | null>(null);
  const [analysis, setAnalysis] = useState<PriorityAnalysis | null>(null);
  const [sortBy, setSortBy] = useState<"priority" | "date" | "value">("priority");
  const [filterStatus, setFilterStatus] = useState("PENDING");

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch("/admin/api/ai-order-priority");
      const data = await res.json();
      setOrders(data.orders || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const analyzeOrder = async (orderId: number) => {
    setAnalyzing(orderId);
    setAnalysis(null);
    try {
      const res = await fetch("/admin/api/ai-order-priority", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId })
      });
      const data = await res.json();
      setAnalysis(data);
    } catch (e) {
      console.error(e);
    }
    setAnalyzing(null);
  };

  const sortedOrders = [...orders].sort((a, b) => {
    if (sortBy === "priority") return b.priorityScore - a.priorityScore;
    if (sortBy === "value") return b.totalValue - a.totalValue;
    return b.daysSinceOrder - a.daysSinceOrder;
  });

  const urgencyColor = (level: string): string => {
    const colors: Record<string, string> = {
      "critică": "bg-red-600 text-white",
      "mare": "bg-orange-500 text-white",
      "medie": "bg-yellow-500 text-white",
      "mică": "bg-green-500 text-white"
    };
    return colors[level] || "bg-gray-500 text-white";
  };

  const priorityScoreColor = (score: number): string => {
    if (score >= 80) return "text-red-600";
    if (score >= 60) return "text-orange-500";
    if (score >= 40) return "text-yellow-600";
    return "text-green-600";
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">🎯 AI Prioritizare Comenzi</h1>
      <p className="text-gray-600 mb-6">
        Prioritizează comenzile pe baza urgenței, valorii și profilului clientului.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista comenzi */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filters */}
          <div className="bg-white rounded-lg shadow p-4 flex flex-wrap gap-4 items-center">
            <div>
              <label className="text-xs text-gray-500">Sortare:</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "priority" | "date" | "value")}
                className="ml-2 border rounded px-2 py-1 text-sm"
              >
                <option value="priority">Prioritate</option>
                <option value="date">Data</option>
                <option value="value">Valoare</option>
              </select>
            </div>
            <button
              onClick={loadOrders}
              className="ml-auto text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded"
            >
              🔄 Reîncarcă
            </button>
          </div>

          {/* Orders list */}
          <div className="bg-white rounded-lg shadow">
            {loading ? (
              <div className="flex justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
              </div>
            ) : sortedOrders.length === 0 ? (
              <div className="text-center py-20 text-gray-500">
                Nu există comenzi în așteptare
              </div>
            ) : (
              <div className="divide-y">
                {sortedOrders.map((order) => (
                  <div
                    key={order.orderId}
                    onClick={() => analyzeOrder(order.orderId)}
                    className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                      analysis?.orderId === order.orderId ? "bg-teal-50 border-l-4 border-teal-500" : ""
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-semibold text-gray-800">
                          #{order.orderNumber}
                          <span className="ml-2 text-xs px-2 py-0.5 bg-gray-100 rounded">
                            {order.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">{order.clientName}</p>
                        <p className="text-xs text-gray-400">{order.clientEmail}</p>
                      </div>
                      <div className="text-right">
                        <div className={`text-lg font-bold ${priorityScoreColor(order.priorityScore)}`}>
                          {order.priorityScore}
                        </div>
                        <p className="text-xs text-gray-500">scor prioritate</p>
                      </div>
                    </div>
                    <div className="flex gap-4 mt-2 text-xs text-gray-500">
                      <span>💰 {order.totalValue?.toFixed(2)} RON</span>
                      <span>📦 {order.itemsCount} produse</span>
                      <span>📅 {order.daysSinceOrder} zile</span>
                      <span>💳 {order.paymentMethod}</span>
                    </div>
                    {analyzing === order.orderId && (
                      <div className="mt-2 flex items-center text-xs text-teal-600">
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-teal-600 mr-2"></div>
                        Analizez comanda...
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Panoul de analiză */}
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow p-5">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">Analiză AI</h2>

            {analysis ? (
              <div className="space-y-4">
                {/* Header */}
                <div className={`rounded-lg p-4 ${urgencyColor(analysis.urgencyLevel)}`}>
                  <p className="text-xs opacity-80">Nivel Urgență</p>
                  <p className="text-2xl font-bold capitalize">{analysis.urgencyLevel}</p>
                  <p className="text-sm opacity-90 mt-1">Scor: {analysis.priorityScore}/100</p>
                </div>

                {/* Customer profile */}
                <div className="bg-gray-50 rounded p-3">
                  <p className="text-xs text-gray-500 mb-1">Profil Client</p>
                  <p className="font-medium">{analysis.customerProfile?.type}</p>
                  <div className="flex justify-between text-xs mt-1">
                    <span>Comenzi anterioare: {analysis.customerProfile?.previousOrders}</span>
                    <span className={`px-2 rounded ${
                      analysis.customerProfile?.riskLevel === "low" ? "bg-green-100 text-green-800" :
                      analysis.customerProfile?.riskLevel === "medium" ? "bg-yellow-100 text-yellow-800" :
                      "bg-red-100 text-red-800"
                    }`}>
                      Risc {analysis.customerProfile?.riskLevel}
                    </span>
                  </div>
                </div>

                {/* Processing time */}
                <div className="text-sm">
                  <span className="text-gray-600">Timp procesare estimat: </span>
                  <span className="font-medium">{analysis.estimatedProcessingTime}</span>
                </div>

                {/* Factors */}
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Factori prioritate:</p>
                  <div className="space-y-2">
                    {analysis.factors?.map((f, i) => (
                      <div key={i} className="bg-gray-50 rounded p-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">{f.factor}</span>
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            f.impact === "pozitiv" ? "bg-green-100 text-green-700" :
                            f.impact === "negativ" ? "bg-red-100 text-red-700" :
                            "bg-gray-100 text-gray-700"
                          }`}>
                            {f.impact} ({f.weight > 0 ? "+" : ""}{f.weight})
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">{f.explanation}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recommended actions */}
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Acțiuni recomandate:</p>
                  <div className="space-y-2">
                    {analysis.recommendedActions?.map((a, i) => (
                      <div key={i} className={`rounded p-2 border-l-4 ${
                        a.priority === "imediată" ? "border-red-500 bg-red-50" :
                        a.priority === "zilnică" ? "border-orange-500 bg-orange-50" :
                        "border-blue-500 bg-blue-50"
                      }`}>
                        <div className="flex justify-between items-start">
                          <span className="text-sm font-medium">{a.action}</span>
                          <span className="text-xs opacity-70">{a.priority}</span>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">{a.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Special considerations */}
                {analysis.specialConsiderations?.length > 0 && (
                  <div className="bg-purple-50 rounded p-3">
                    <p className="text-xs font-medium text-purple-800 mb-1">⚠️ Considerații speciale:</p>
                    <ul className="text-xs text-purple-700 space-y-0.5">
                      {analysis.specialConsiderations.map((c, i) => (
                        <li key={i}>• {c}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-10">
                <div className="text-4xl mb-4">📋</div>
                <p className="text-gray-500 text-sm">
                  Selectează o comandă pentru analiză AI
                </p>
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-xs font-medium text-gray-600 mb-2">Legenda scoruri:</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center">
                <span className="w-3 h-3 rounded-full bg-red-600 mr-2"></span>
                80-100 Critic
              </div>
              <div className="flex items-center">
                <span className="w-3 h-3 rounded-full bg-orange-500 mr-2"></span>
                60-79 Mare
              </div>
              <div className="flex items-center">
                <span className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></span>
                40-59 Medie
              </div>
              <div className="flex items-center">
                <span className="w-3 h-3 rounded-full bg-green-500 mr-2"></span>
                0-39 Mică
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
