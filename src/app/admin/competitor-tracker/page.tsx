"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function CompetitorTrackerPage() {
  const [competitors, setCompetitors] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
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
      const res = await fetch("/admin/api/ai-competitor-tracker");
      const data = await res.json();
      setCompetitors(data.competitors || []);
      setAlerts(data.alerts || []);
      setStats(data.stats);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  async function generateStrategy() {
    setAnalyzing(true);
    try {
      const res = await fetch("/admin/api/ai-competitor-tracker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ competitors, alerts })
      });
      const data = await res.json();
      setAnalysis(data.analysis);
    } catch (e) {
      console.error(e);
    }
    setAnalyzing(false);
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/admin/ai-hub" className="text-blue-600 hover:underline text-sm">
            ← Înapoi la AI Hub
          </Link>
          <h1 className="text-2xl font-bold mt-2">🔍 Competitor Tracker</h1>
          <p className="text-gray-600">Monitorizează prețurile competitorilor</p>
        </div>
        <button
          onClick={generateStrategy}
          disabled={analyzing}
          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
        >
          {analyzing ? "..." : "🤖 Strategie AI"}
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-gray-100 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold">{stats.competitorsTracked}</div>
            <div className="text-sm text-gray-600">Competitori</div>
          </div>
          <div className="bg-blue-100 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-blue-700">{stats.productsTracked}</div>
            <div className="text-sm text-blue-600">Produse Track</div>
          </div>
          <div className="bg-green-100 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-green-700">{stats.cheaperThanUs}</div>
            <div className="text-sm text-green-600">Mai Ieftine</div>
          </div>
          <div className="bg-red-100 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-red-700">{stats.moreExpensive}</div>
            <div className="text-sm text-red-600">Mai Scumpe</div>
          </div>
          <div className="bg-yellow-100 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-yellow-700">{stats.priceChangeAlerts}</div>
            <div className="text-sm text-yellow-600">Alerte Azi</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Alerts */}
        <div>
          <h3 className="font-semibold mb-3">🔔 Alerte Prețuri</h3>
          
          {loading ? (
            <div className="text-center py-10">Se încarcă...</div>
          ) : alerts.length === 0 ? (
            <div className="bg-green-50 p-6 rounded-lg text-center">
              <div className="text-3xl mb-2">✅</div>
              <p className="text-green-700">Nu sunt alerte noi</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {alerts.map((alert, i) => (
                <div
                  key={i}
                  className={`border-2 rounded-lg p-3 ${
                    alert.type === "PRICE_DROP" ? "bg-red-50 border-red-300" :
                    alert.type === "PRICE_INCREASE" ? "bg-green-50 border-green-300" :
                    "bg-yellow-50 border-yellow-300"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-semibold text-sm line-clamp-1">{alert.productName}</div>
                      <div className="text-xs text-gray-600">{alert.competitor}</div>
                    </div>
                    <span className={`px-2 py-0.5 text-xs rounded ${
                      alert.type === "PRICE_DROP" ? "bg-red-200 text-red-800" :
                      alert.type === "PRICE_INCREASE" ? "bg-green-200 text-green-800" :
                      "bg-yellow-200 text-yellow-800"
                    }`}>
                      {alert.type === "PRICE_DROP" ? "↓" : "↑"} {alert.changePercent}%
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-xs">
                    <span>Vechi: {alert.oldPrice}</span>
                    <span>→</span>
                    <span className="font-bold">Nou: {alert.newPrice}</span>
                  </div>
                  <div className={`text-xs mt-1 ${
                    alert.ourPrice < alert.newPrice ? "text-green-600" : "text-red-600"
                  }`}>
                    Prețul nostru: {alert.ourPrice} RON
                    {alert.ourPrice < alert.newPrice ? " ✓ Mai mic" : " ⚠️ Mai mare"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Competitors */}
        <div>
          <h3 className="font-semibold mb-3">🏢 Competitori</h3>
          <div className="space-y-3">
            {competitors.map((comp, i) => (
              <div key={i} className="bg-white border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold">{comp.name}</div>
                    <div className="text-xs text-gray-500">{comp.website}</div>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded ${
                    comp.threatLevel === "HIGH" ? "bg-red-100 text-red-700" :
                    comp.threatLevel === "MEDIUM" ? "bg-yellow-100 text-yellow-700" :
                    "bg-green-100 text-green-700"
                  }`}>
                    {comp.threatLevel}
                  </span>
                </div>
                
                <div className="grid grid-cols-3 gap-2 mt-3 text-xs text-center">
                  <div className="bg-gray-50 p-2 rounded">
                    <div className="font-bold">{comp.productsTracked}</div>
                    <div>Produse</div>
                  </div>
                  <div className={`p-2 rounded ${
                    comp.avgPriceDiff < 0 ? "bg-red-50" : "bg-green-50"
                  }`}>
                    <div className="font-bold">
                      {comp.avgPriceDiff > 0 ? "+" : ""}{comp.avgPriceDiff}%
                    </div>
                    <div>vs Noi</div>
                  </div>
                  <div className="bg-gray-50 p-2 rounded">
                    <div className="font-bold">{comp.recentChanges}</div>
                    <div>Schimbări</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Strategy */}
        <div>
          <h3 className="font-semibold mb-3">🤖 Strategie AI</h3>
          
          {!analysis ? (
            <div className="bg-gray-100 rounded-lg p-6 text-center text-gray-500 text-sm">
              Apasă "Strategie AI" pentru recomandări
            </div>
          ) : (
            <div className="space-y-4">
              {analysis.competitivePosition && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-800 mb-2">📍 Poziționare</h4>
                  <div className="text-sm">
                    <div><strong>Status:</strong> {analysis.competitivePosition.status}</div>
                    <div><strong>Piață:</strong> {analysis.competitivePosition.marketPosition}</div>
                    <div className="mt-2 text-xs">{analysis.competitivePosition.summary}</div>
                  </div>
                </div>
              )}

              {analysis.recommendations && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-semibold text-green-800 mb-2">💡 Recomandări</h4>
                  <div className="space-y-2">
                    {analysis.recommendations.slice(0, 4).map((r: any, i: number) => (
                      <div key={i} className="bg-white p-2 rounded text-sm">
                        <div className="flex items-center gap-2">
                          <span className={`px-1 rounded text-xs ${
                            r.priority === "HIGH" ? "bg-red-200" : "bg-gray-200"
                          }`}>{r.priority}</span>
                          <span className="font-medium">{r.action}</span>
                        </div>
                        <div className="text-xs text-gray-600 mt-1">{r.reason}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {analysis.priceAdjustments && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-semibold text-yellow-800 mb-2">💰 Ajustări Preț</h4>
                  <div className="space-y-1 text-sm">
                    {analysis.priceAdjustments.slice(0, 5).map((p: any, i: number) => (
                      <div key={i} className="flex justify-between">
                        <span className="truncate flex-1">{p.product}</span>
                        <span className={p.change > 0 ? "text-green-600" : "text-red-600"}>
                          {p.change > 0 ? "+" : ""}{p.change}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {analysis.threats && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-semibold text-red-800 mb-2">⚠️ Amenințări</h4>
                  <ul className="list-disc ml-4 text-sm">
                    {analysis.threats.slice(0, 3).map((t: string, i: number) => (
                      <li key={i}>{t}</li>
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
