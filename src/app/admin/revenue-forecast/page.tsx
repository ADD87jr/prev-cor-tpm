"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function RevenueForecastPage() {
  const [historical, setHistorical] = useState<any[]>([]);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch("/admin/api/ai-revenue-forecast");
      const data = await res.json();
      setHistorical(data.historical || []);
      setPredictions(data.predictions || []);
      setStats(data.stats);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  async function generateAnalysis() {
    setAnalyzing(true);
    try {
      const res = await fetch("/admin/api/ai-revenue-forecast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ historical, predictions, stats })
      });
      const data = await res.json();
      setAnalysis(data.analysis);
    } catch (e) {
      console.error(e);
    }
    setAnalyzing(false);
  }

  const maxRevenue = Math.max(
    ...historical.map(h => h.revenue),
    ...predictions.map(p => p.optimistic)
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/admin/ai-hub" className="text-blue-600 hover:underline text-sm">
            ← Înapoi la AI Hub
          </Link>
          <h1 className="text-2xl font-bold mt-2">📈 Forecast Venituri AI</h1>
          <p className="text-gray-600">Predicție venituri cu scenarii</p>
        </div>
        <button
          onClick={generateAnalysis}
          disabled={analyzing}
          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
        >
          {analyzing ? "..." : "🤖 Insights AI"}
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-blue-100 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-blue-700">
              {stats.currentMonthRevenue?.toLocaleString()}
            </div>
            <div className="text-sm text-blue-600">Luna Curentă</div>
          </div>
          <div className={`p-4 rounded-lg text-center ${
            stats.monthOverMonth >= 0 ? "bg-green-100" : "bg-red-100"
          }`}>
            <div className={`text-2xl font-bold ${
              stats.monthOverMonth >= 0 ? "text-green-700" : "text-red-700"
            }`}>
              {stats.monthOverMonth >= 0 ? "+" : ""}{stats.monthOverMonth}%
            </div>
            <div className="text-sm">vs Luna Trecută</div>
          </div>
          <div className="bg-purple-100 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-purple-700">
              {stats.avgRevenueL3M?.toLocaleString()}
            </div>
            <div className="text-sm text-purple-600">Media 3 Luni</div>
          </div>
          <div className="bg-yellow-100 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-yellow-700">
              {stats.projectedAnnual?.toLocaleString()}
            </div>
            <div className="text-sm text-yellow-600">Proiecție Anuală</div>
          </div>
          <div className={`p-4 rounded-lg text-center ${
            stats.trend === "GROWING" ? "bg-green-100" :
            stats.trend === "DECLINING" ? "bg-red-100" : "bg-gray-100"
          }`}>
            <div className="text-2xl font-bold">{stats.trend}</div>
            <div className="text-sm">{stats.trendPercent}%</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="lg:col-span-2 bg-white border rounded-lg p-4">
          <h3 className="font-semibold mb-4">📊 Istoric + Predicții</h3>
          
          {loading ? (
            <div className="text-center py-10">Se încarcă...</div>
          ) : (
            <div className="space-y-2">
              {/* Historical */}
              {historical.map((h, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-20 text-xs">{h.month}</div>
                  <div className="flex-1 bg-gray-100 rounded overflow-hidden h-6">
                    <div 
                      className="h-full bg-blue-500"
                      style={{ width: `${(h.revenue / maxRevenue) * 100}%` }}
                    />
                  </div>
                  <div className="w-24 text-xs text-right">{h.revenue.toLocaleString()}</div>
                </div>
              ))}
              
              <div className="border-t my-4 pt-2 text-sm font-medium">📮 Predicții</div>
              
              {/* Predictions */}
              {predictions.map((p, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-20 text-xs">{p.month}</div>
                  <div className="flex-1 bg-gray-100 rounded overflow-hidden h-6 relative">
                    <div 
                      className="h-full bg-red-200 absolute"
                      style={{ width: `${(p.optimistic / maxRevenue) * 100}%` }}
                    />
                    <div 
                      className="h-full bg-green-400 absolute"
                      style={{ width: `${(p.realistic / maxRevenue) * 100}%` }}
                    />
                    <div 
                      className="h-full bg-yellow-400 absolute"
                      style={{ width: `${(p.pessimistic / maxRevenue) * 100}%` }}
                    />
                  </div>
                  <div className="w-24 text-xs text-right">
                    {p.realistic.toLocaleString()} 
                    <span className="text-gray-400 ml-1">({p.confidence}%)</span>
                  </div>
                </div>
              ))}
              
              <div className="flex gap-4 text-xs mt-4">
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-yellow-400 rounded" /> Pesimist</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-400 rounded" /> Realist</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-200 rounded" /> Optimist</span>
              </div>
            </div>
          )}
        </div>

        {/* AI Analysis */}
        <div>
          <h3 className="font-semibold mb-3">🤖 Insights AI</h3>
          
          {!analysis ? (
            <div className="bg-gray-100 rounded-lg p-6 text-center text-gray-500 text-sm">
              Apasă "Insights AI" pentru analiză detaliată
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <h4 className="font-medium text-blue-800 text-sm">📝 Sumar</h4>
                <p className="text-sm mt-1">{analysis.executiveSummary}</p>
              </div>

              {analysis.recommendations && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <h4 className="font-medium text-green-800 text-sm">💡 Recomandări</h4>
                  <div className="space-y-1 mt-1">
                    {analysis.recommendations.slice(0, 3).map((r: any, i: number) => (
                      <div key={i} className="text-xs bg-white p-1 rounded">
                        <span className={`px-1 rounded ${
                          r.priority === "HIGH" ? "bg-red-200" : "bg-gray-200"
                        }`}>{r.priority}</span> {r.action}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {analysis.targets && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                  <h4 className="font-medium text-purple-800 text-sm">🎯 Obiective</h4>
                  <div className="text-xs mt-1 space-y-1">
                    <div>Luna următoare: {analysis.targets.nextMonth?.target?.toLocaleString()}</div>
                    <div>Trimestru: {analysis.targets.quarter?.target?.toLocaleString()}</div>
                  </div>
                </div>
              )}

              {analysis.risks && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <h4 className="font-medium text-red-800 text-sm">⚠️ Riscuri</h4>
                  <ul className="list-disc ml-4 text-xs mt-1">
                    {analysis.risks.slice(0, 3).map((r: string, i: number) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
