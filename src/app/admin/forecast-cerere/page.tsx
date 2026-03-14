"use client";

import { useState, useEffect } from "react";

interface MonthlyHistory {
  month: string;
  revenue: number;
  orders: number;
  products: number;
}

interface ForecastPeriod {
  period: string;
  predictedRevenue: number;
  predictedOrders: number;
  confidence: number;
}

interface ForecastResult {
  historicalData: Record<string, number>;
  forecast: ForecastPeriod[];
  trend: string;
  seasonality: string;
  growthRate: number;
  insights: string[];
  recommendations: string[];
  risks: string[];
  opportunities: string[];
}

export default function AIForecastPage() {
  const [history, setHistory] = useState<MonthlyHistory[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [forecasting, setForecasting] = useState(false);
  const [result, setResult] = useState<ForecastResult | null>(null);
  const [period, setPeriod] = useState("3 luni");
  const [productType, setProductType] = useState("");

  useEffect(() => { loadHistory(); }, []);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch("/admin/api/ai-demand-forecast");
      const data = await res.json();
      setHistory(data.history || []);
      setStats(data.stats);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const generateForecast = async () => {
    setForecasting(true);
    setResult(null);

    try {
      const res = await fetch("/admin/api/ai-demand-forecast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period, productType: productType || undefined })
      });
      const data = await res.json();
      setResult(data);
    } catch (e) {
      console.error(e);
    }
    setForecasting(false);
  };

  const getTrendIcon = (trend: string) => {
    if (trend === "growing") return "📈";
    if (trend === "declining") return "📉";
    return "➡️";
  };

  const getTrendColor = (trend: string) => {
    if (trend === "growing") return "text-green-600 bg-green-50";
    if (trend === "declining") return "text-red-600 bg-red-50";
    return "text-yellow-600 bg-yellow-50";
  };

  const maxRevenue = Math.max(...history.map(h => h.revenue), 1);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">📊 AI Forecast Cerere</h1>
      <p className="text-gray-600 mb-6">
        Predicție cerere și vânzări bazată pe pattern-uri istorice.
      </p>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-600"></div>
        </div>
      ) : (
        <>
          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-lg shadow p-4 text-center">
                <p className="text-3xl font-bold">{stats.totalOrders}</p>
                <p className="text-sm text-gray-500">Comenzi analizate</p>
              </div>
              <div className="bg-cyan-50 rounded-lg shadow p-4 text-center">
                <p className="text-3xl font-bold text-cyan-600">{(stats.totalRevenue / 1000).toFixed(0)}k</p>
                <p className="text-sm text-cyan-500">Venituri totale (RON)</p>
              </div>
              <div className="bg-blue-50 rounded-lg shadow p-4 text-center">
                <p className="text-3xl font-bold text-blue-600">{(stats.avgMonthlyRevenue / 1000).toFixed(1)}k</p>
                <p className="text-sm text-blue-500">Medie lunară</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Istoric + Controls */}
            <div className="space-y-4">
              {/* Controls */}
              <div className="bg-white rounded-lg shadow p-5">
                <h3 className="font-semibold text-gray-700 mb-3">Generează Forecast</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-gray-600">Perioadă</label>
                    <select
                      value={period}
                      onChange={(e) => setPeriod(e.target.value)}
                      className="w-full border rounded px-3 py-2 text-sm"
                    >
                      <option value="1 lună">1 lună</option>
                      <option value="3 luni">3 luni</option>
                      <option value="6 luni">6 luni</option>
                      <option value="12 luni">12 luni</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Categorie produs (opțional)</label>
                    <input
                      type="text"
                      value={productType}
                      onChange={(e) => setProductType(e.target.value)}
                      placeholder="Ex: contactoare, senzori"
                      className="w-full border rounded px-3 py-2 text-sm"
                    />
                  </div>
                  <button
                    onClick={generateForecast}
                    disabled={forecasting}
                    className="w-full bg-cyan-600 text-white py-2 rounded font-medium hover:bg-cyan-700 disabled:opacity-50"
                  >
                    {forecasting ? "Calculez..." : "🔮 Generează Predicție"}
                  </button>
                </div>
              </div>

              {/* Istoric vizual */}
              <div className="bg-white rounded-lg shadow p-5">
                <h3 className="font-semibold text-gray-700 mb-3">Istoric Vânzări</h3>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {history.map((h, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span className="w-16 text-gray-500">{h.month}</span>
                      <div className="flex-1 bg-gray-100 rounded h-4 overflow-hidden">
                        <div 
                          className="h-full bg-cyan-500"
                          style={{ width: `${(h.revenue / maxRevenue) * 100}%` }}
                        ></div>
                      </div>
                      <span className="w-20 text-right text-gray-700">{(h.revenue / 1000).toFixed(1)}k</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Forecast */}
            <div className="lg:col-span-2 bg-white rounded-lg shadow p-5">
              <h2 className="text-lg font-semibold text-gray-700 mb-4">Predicție AI</h2>

              {forecasting ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-600 mb-4"></div>
                  <p className="text-gray-600">Analizez pattern-uri...</p>
                </div>
              ) : result ? (
                <div className="space-y-5">
                  {/* Trend & Growth */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className={`rounded-lg p-4 ${getTrendColor(result.trend)}`}>
                      <p className="text-sm font-medium">Trend</p>
                      <p className="text-2xl font-bold">
                        {getTrendIcon(result.trend)} {result.trend === "growing" ? "Creștere" : result.trend === "declining" ? "Scădere" : "Stabil"}
                      </p>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-4">
                      <p className="text-sm text-blue-600">Rata creștere</p>
                      <p className="text-2xl font-bold text-blue-700">
                        {result.growthRate > 0 ? "+" : ""}{result.growthRate?.toFixed(1)}%
                      </p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4">
                      <p className="text-sm text-purple-600">Sezonalitate</p>
                      <p className="text-sm font-medium text-purple-700">{result.seasonality}</p>
                    </div>
                  </div>

                  {/* Forecast table */}
                  {result.forecast && result.forecast.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-700 mb-2">Predicții pe perioade:</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="text-left p-2">Perioadă</th>
                              <th className="text-right p-2">Venituri</th>
                              <th className="text-right p-2">Comenzi</th>
                              <th className="text-right p-2">Încredere</th>
                            </tr>
                          </thead>
                          <tbody>
                            {result.forecast.map((f, i) => (
                              <tr key={i} className="border-t">
                                <td className="p-2 font-medium">{f.period}</td>
                                <td className="p-2 text-right text-cyan-600">{(f.predictedRevenue / 1000).toFixed(1)}k RON</td>
                                <td className="p-2 text-right">{f.predictedOrders}</td>
                                <td className="p-2 text-right">
                                  <span className={`px-2 py-0.5 rounded text-xs ${
                                    f.confidence >= 80 ? "bg-green-100 text-green-700" : 
                                    f.confidence >= 60 ? "bg-yellow-100 text-yellow-700" : 
                                    "bg-red-100 text-red-700"
                                  }`}>
                                    {f.confidence}%
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Insights */}
                  {result.insights && result.insights.length > 0 && (
                    <div className="bg-blue-50 rounded-lg p-4">
                      <h4 className="font-medium text-blue-800 mb-2">💡 Insights:</h4>
                      <ul className="space-y-1">
                        {result.insights.map((insight, i) => (
                          <li key={i} className="text-sm text-blue-700">• {insight}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Recommendations */}
                  {result.recommendations && result.recommendations.length > 0 && (
                    <div className="bg-green-50 rounded-lg p-4">
                      <h4 className="font-medium text-green-800 mb-2">📋 Recomandări:</h4>
                      <ul className="space-y-1">
                        {result.recommendations.map((rec, i) => (
                          <li key={i} className="text-sm text-green-700">• {rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Risks & Opportunities */}
                  <div className="grid grid-cols-2 gap-4">
                    {result.risks && result.risks.length > 0 && (
                      <div className="bg-red-50 rounded-lg p-4">
                        <h4 className="font-medium text-red-800 mb-2">⚠️ Riscuri:</h4>
                        <ul className="space-y-1">
                          {result.risks.map((risk, i) => (
                            <li key={i} className="text-xs text-red-700">• {risk}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {result.opportunities && result.opportunities.length > 0 && (
                      <div className="bg-emerald-50 rounded-lg p-4">
                        <h4 className="font-medium text-emerald-800 mb-2">🎯 Oportunități:</h4>
                        <ul className="space-y-1">
                          {result.opportunities.map((opp, i) => (
                            <li key={i} className="text-xs text-emerald-700">• {opp}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-20">
                  <p className="text-gray-500">Selectează perioada și generează predicția</p>
                  <p className="text-xs text-gray-400 mt-2">Analiză bazată pe istoric vânzări și pattern-uri sezoniere</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
