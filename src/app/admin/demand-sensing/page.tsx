"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function DemandSensingPage() {
  const [signals, setSignals] = useState<any[]>([]);
  const [trends, setTrends] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [forecast, setForecast] = useState<any>(null);
  const [forecasting, setForecasting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch("/admin/api/ai-demand-sensing");
      const data = await res.json();
      setSignals(data.signals || []);
      setTrends(data.trends || []);
      setStats(data.stats);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  async function generateForecast() {
    setForecasting(true);
    try {
      const res = await fetch("/admin/api/ai-demand-sensing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signals, trends })
      });
      const data = await res.json();
      setForecast(data.forecast);
    } catch (e) {
      console.error(e);
    }
    setForecasting(false);
  }

  const signalColors: Record<string, string> = {
    STRONG: "bg-green-100 border-green-400",
    MODERATE: "bg-yellow-100 border-yellow-400",
    WEAK: "bg-gray-100 border-gray-400",
    NEGATIVE: "bg-red-100 border-red-400"
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/admin/ai-hub" className="text-blue-600 hover:underline text-sm">
            ← Înapoi la AI Hub
          </Link>
          <h1 className="text-2xl font-bold mt-2">📡 Demand Sensing</h1>
          <p className="text-gray-600">Detectează cererea din semnale externe</p>
        </div>
        <button
          onClick={generateForecast}
          disabled={forecasting}
          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
        >
          {forecasting ? "..." : "🤖 Predicție AI"}
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-blue-100 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-blue-700">{stats.signalsDetected}</div>
            <div className="text-sm text-blue-600">Semnale Detectate</div>
          </div>
          <div className="bg-green-100 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-green-700">{stats.positiveSignals}</div>
            <div className="text-sm text-green-600">Pozitive</div>
          </div>
          <div className="bg-red-100 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-red-700">{stats.negativeSignals}</div>
            <div className="text-sm text-red-600">Negative</div>
          </div>
          <div className="bg-purple-100 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-purple-700">{stats.categoriesAffected}</div>
            <div className="text-sm text-purple-600">Categorii</div>
          </div>
          <div className="bg-yellow-100 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-yellow-700">{stats.confidenceLevel}%</div>
            <div className="text-sm text-yellow-600">Încredere</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Signals */}
        <div>
          <h3 className="font-semibold mb-3">📊 Semnale Externe</h3>
          
          {loading ? (
            <div className="text-center py-10">Se încarcă...</div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {signals.map((signal, i) => (
                <div
                  key={i}
                  className={`border-2 rounded-lg p-3 ${signalColors[signal.strength]}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-semibold text-sm">{signal.source}</div>
                      <div className="text-xs text-gray-600">{signal.type}</div>
                    </div>
                    <span className={`px-2 py-0.5 text-xs rounded ${
                      signal.strength === "STRONG" ? "bg-green-500 text-white" :
                      signal.strength === "MODERATE" ? "bg-yellow-500 text-white" :
                      signal.strength === "NEGATIVE" ? "bg-red-500 text-white" : "bg-gray-400 text-white"
                    }`}>
                      {signal.strength}
                    </span>
                  </div>
                  <div className="text-sm mt-2">{signal.description}</div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {signal.affectedCategories?.map((cat: string, j: number) => (
                      <span key={j} className="px-1 py-0.5 bg-white bg-opacity-50 rounded text-xs">
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Trends */}
        <div>
          <h3 className="font-semibold mb-3">📈 Trending Categorii</h3>
          <div className="space-y-3">
            {trends.map((trend, i) => (
              <div key={i} className="bg-white border rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <div className="font-semibold">{trend.category}</div>
                  <span className={`text-sm font-bold ${
                    trend.direction === "UP" ? "text-green-600" : "text-red-600"
                  }`}>
                    {trend.direction === "UP" ? "↑" : "↓"} {trend.changePercent}%
                  </span>
                </div>
                
                <div className="mt-3 h-4 bg-gray-100 rounded overflow-hidden">
                  <div 
                    className={`h-full ${
                      trend.direction === "UP" ? "bg-green-400" : "bg-red-400"
                    }`}
                    style={{ width: `${Math.min(Math.abs(trend.changePercent), 100)}%` }}
                  />
                </div>
                
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span>Săptămâna trecută</span>
                  <span>Acum</span>
                </div>
                
                {trend.topProducts && (
                  <div className="mt-2 text-xs">
                    <div className="font-medium">Top produse:</div>
                    {trend.topProducts.slice(0, 2).map((p: string, j: number) => (
                      <div key={j} className="truncate text-gray-600">{p}</div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* AI Forecast */}
        <div>
          <h3 className="font-semibold mb-3">🤖 Predicție Cerere</h3>
          
          {!forecast ? (
            <div className="bg-gray-100 rounded-lg p-6 text-center text-gray-500 text-sm">
              Apasă "Predicție AI" pentru analiză
            </div>
          ) : (
            <div className="space-y-4">
              {forecast.demandForecast && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-800 mb-2">📊 Cerere 30 Zile</h4>
                  <div className="space-y-2">
                    {forecast.demandForecast.map((f: any, i: number) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="truncate flex-1">{f.category}</span>
                        <span className={`font-medium ${
                          f.change > 0 ? "text-green-600" : "text-red-600"
                        }`}>
                          {f.change > 0 ? "+" : ""}{f.change}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {forecast.stockRecommendations && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-semibold text-green-800 mb-2">📦 Recomandări Stoc</h4>
                  <div className="space-y-2">
                    {forecast.stockRecommendations.map((r: any, i: number) => (
                      <div key={i} className="bg-white p-2 rounded text-sm">
                        <div className="font-medium">{r.product}</div>
                        <div className="text-xs text-green-600">{r.action}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {forecast.externalFactors && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-semibold text-yellow-800 mb-2">🌍 Factori Externi</h4>
                  <ul className="list-disc ml-4 text-sm">
                    {forecast.externalFactors.map((f: string, i: number) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                </div>
              )}

              {forecast.seasonalInsights && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h4 className="font-semibold text-purple-800 mb-2">📅 Sezonalitate</h4>
                  <p className="text-sm">{forecast.seasonalInsights}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
