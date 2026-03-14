"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function StockAlertsPage() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    loadAlerts();
  }, []);

  async function loadAlerts() {
    setLoading(true);
    try {
      const res = await fetch("/admin/api/ai-stock-alerts");
      const data = await res.json();
      setAlerts(data.alerts || []);
      setStats(data.stats);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  async function analyzeAlerts() {
    setAnalyzing(true);
    try {
      const res = await fetch("/admin/api/ai-stock-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alerts: alerts.slice(0, 20) })
      });
      const data = await res.json();
      setAnalysis(data.analysis);
    } catch (e) {
      console.error(e);
    }
    setAnalyzing(false);
  }

  const filtered = filter 
    ? alerts.filter(a => a.severity === filter)
    : alerts;

  const severityColors: Record<string, string> = {
    CRITICAL: "bg-red-100 border-red-400",
    HIGH: "bg-orange-100 border-orange-400",
    MEDIUM: "bg-yellow-100 border-yellow-400",
    LOW: "bg-green-100 border-green-400"
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/admin/ai-hub" className="text-blue-600 hover:underline text-sm">
            ← Înapoi la AI Hub
          </Link>
          <h1 className="text-2xl font-bold mt-2">📦 Alerte Stoc Inteligente</h1>
          <p className="text-gray-600">Alerte bazate pe viteză de vânzare</p>
        </div>
        <button
          onClick={analyzeAlerts}
          disabled={analyzing || alerts.length === 0}
          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
        >
          {analyzing ? "..." : "🤖 Analiză AI"}
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          <div className="bg-gray-100 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold">{stats.totalAlerts}</div>
            <div className="text-sm text-gray-600">Total Alerte</div>
          </div>
          <div className="bg-red-100 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-red-700">{stats.critical}</div>
            <div className="text-sm text-red-600">Critice</div>
          </div>
          <div className="bg-orange-100 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-orange-700">{stats.high}</div>
            <div className="text-sm text-orange-600">Urgente</div>
          </div>
          <div className="bg-yellow-100 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-yellow-700">{stats.medium}</div>
            <div className="text-sm text-yellow-600">Medii</div>
          </div>
          <div className="bg-blue-100 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-blue-700">{stats.productsNeedingReorder}</div>
            <div className="text-sm text-blue-600">De Comandat</div>
          </div>
          <div className="bg-purple-100 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-purple-700">{stats.totalStockValue?.toLocaleString()}</div>
            <div className="text-sm text-purple-600">RON Stoc</div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-6">
        {["", "CRITICAL", "HIGH", "MEDIUM", "LOW"].map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1 rounded text-sm ${
              filter === s ? "bg-blue-600 text-white" : "bg-gray-200 hover:bg-gray-300"
            }`}
          >
            {s || "Toate"}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h3 className="font-semibold mb-3">⚠️ Alerte Stoc ({filtered.length})</h3>
          
          {loading ? (
            <div className="text-center py-10">Se încarcă...</div>
          ) : filtered.length === 0 ? (
            <div className="bg-green-50 p-10 rounded-lg text-center">
              <div className="text-4xl mb-2">✅</div>
              <p className="text-green-700">Toate stocurile sunt OK!</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {filtered.map((alert, i) => (
                <div key={i} className={`border-2 rounded-lg p-4 ${severityColors[alert.severity]}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold">{alert.productName}</div>
                      <div className="text-sm text-gray-600">{alert.category}</div>
                    </div>
                    <span className={`px-2 py-1 text-xs text-white rounded ${
                      alert.severity === "CRITICAL" ? "bg-red-600" :
                      alert.severity === "HIGH" ? "bg-orange-500" :
                      alert.severity === "MEDIUM" ? "bg-yellow-500" : "bg-green-500"
                    }`}>
                      {alert.alertType}
                    </span>
                  </div>

                  <div className="mt-2 text-sm">{alert.message}</div>
                  <div className="text-xs text-gray-600 mt-1">💡 {alert.recommendation}</div>

                  <div className="grid grid-cols-4 gap-2 mt-3 text-xs text-center">
                    <div className="bg-white bg-opacity-50 p-1 rounded">
                      <div className="font-bold">{alert.currentStock}</div>
                      <div>Stoc</div>
                    </div>
                    <div className="bg-white bg-opacity-50 p-1 rounded">
                      <div className="font-bold">{alert.avgDailySales}</div>
                      <div>Vânzări/zi</div>
                    </div>
                    <div className="bg-white bg-opacity-50 p-1 rounded">
                      <div className="font-bold">{alert.daysUntilStockout || "∞"}</div>
                      <div>Zile rămase</div>
                    </div>
                    <div className="bg-white bg-opacity-50 p-1 rounded">
                      <div className="font-bold">{alert.trend}</div>
                      <div>Trend</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 className="font-semibold mb-3">🤖 Analiză AI</h3>
          
          {!analysis ? (
            <div className="bg-gray-100 rounded-lg p-10 text-center text-gray-500">
              Apasă "Analiză AI" pentru recomandări
            </div>
          ) : (
            <div className="space-y-4">
              {analysis.priorityActions && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-semibold text-red-800 mb-2">🚨 Acțiuni Prioritare</h4>
                  <div className="space-y-2">
                    {analysis.priorityActions.slice(0, 5).map((a: any, i: number) => (
                      <div key={i} className="bg-white p-2 rounded text-sm">
                        <div className="font-medium">{a.productName}</div>
                        <div className="text-xs">{a.action} - {a.deadline}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {analysis.purchaseOrderSuggestion && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-800 mb-2">📋 Comandă Sugerată</h4>
                  <div className="text-sm">
                    <div>Produse: {analysis.purchaseOrderSuggestion.totalProducts}</div>
                    <div>Cost estimat: {analysis.purchaseOrderSuggestion.estimatedCost}</div>
                  </div>
                </div>
              )}

              {analysis.riskAssessment && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-semibold text-yellow-800 mb-2">⚠️ Evaluare Risc</h4>
                  <div className="text-sm">
                    <div><strong>Venit la risc:</strong> {analysis.riskAssessment.revenueAtRisk}</div>
                    <div><strong>Impact clienți:</strong> {analysis.riskAssessment.customerImpact}</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
