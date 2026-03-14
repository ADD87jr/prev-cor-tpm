"use client";
import { useState, useEffect } from "react";

export default function SeasonalityPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/admin/api/ai-seasonality")
      .then(res => res.json())
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const monthNames = ["Ian", "Feb", "Mar", "Apr", "Mai", "Iun", "Iul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">📅 Analiză Sezonalitate</h1>
      <p className="text-gray-600 mb-6">Pattern-uri sezoniere în vânzări și predicții</p>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <p className="text-3xl font-bold text-blue-600">{data?.totalOrders || 0}</p>
          <p className="text-gray-600 text-sm">Total comenzi</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <p className="text-3xl font-bold text-green-600">
            {data?.totalRevenue?.toLocaleString("ro-RO") || 0}
          </p>
          <p className="text-gray-600 text-sm">Venituri totale (RON)</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <p className="text-3xl font-bold text-purple-600">{data?.monthlyStats?.length || 0}</p>
          <p className="text-gray-600 text-sm">Luni analizate</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <p className="text-3xl font-bold text-orange-600">{data?.categories?.length || 0}</p>
          <p className="text-gray-600 text-sm">Categorii produse</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Seasonal Pattern */}
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold mb-4">Pattern Sezonier (Medii pe lună)</h3>
          <div className="space-y-2">
            {data?.seasonalPattern?.map((sp: any) => {
              const maxRevenue = Math.max(...(data.seasonalPattern?.map((s: any) => s.avgRevenue) || [1]));
              const percentage = (sp.avgRevenue / maxRevenue) * 100;
              
              return (
                <div key={sp.month} className="flex items-center gap-3">
                  <span className="w-10 font-medium text-sm">{sp.monthName}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        percentage > 80 ? "bg-green-500" : percentage > 50 ? "bg-blue-500" : "bg-gray-400"
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="w-24 text-right text-sm">
                    {sp.avgRevenue?.toFixed(0)} RON
                  </span>
                  <span className="w-16 text-right text-xs text-gray-500">
                    {sp.avgOrders?.toFixed(1)} cmd
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Monthly Stats */}
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold mb-4">Ultimele 12 luni</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-2 text-left">Luna</th>
                  <th className="p-2 text-right">Venituri</th>
                  <th className="p-2 text-right">Comenzi</th>
                </tr>
              </thead>
              <tbody>
                {data?.monthlyStats?.slice(-12).map((ms: any) => (
                  <tr key={ms.month} className="border-b">
                    <td className="p-2 font-medium">{ms.month}</td>
                    <td className="p-2 text-right">{ms.revenue?.toLocaleString("ro-RO")} RON</td>
                    <td className="p-2 text-right">{ms.orders}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* AI Analysis */}
        {data?.aiAnalysis && (
          <>
            {/* Peak & Low Months */}
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-semibold mb-4">🔥 Luni de Vârf vs 📉 Luni Slabe</h3>
              
              <div className="space-y-4">
                <div className="bg-green-50 p-3 rounded-lg">
                  <h4 className="font-medium text-green-800 mb-2">Luni de vârf</h4>
                  {data.aiAnalysis.peakMonths?.map((pm: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-sm mb-1">
                      <span className="font-bold">{monthNames[pm.month - 1] || pm.month}</span>
                      <span className="text-gray-600">- {pm.reason}</span>
                    </div>
                  ))}
                </div>
                
                <div className="bg-red-50 p-3 rounded-lg">
                  <h4 className="font-medium text-red-800 mb-2">Luni slabe</h4>
                  {data.aiAnalysis.lowMonths?.map((lm: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-sm mb-1">
                      <span className="font-bold">{monthNames[lm.month - 1] || lm.month}</span>
                      <span className="text-gray-600">- {lm.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Seasonal Factors */}
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-semibold mb-4">🌡️ Factori Sezonieri</h3>
              <div className="space-y-3">
                {data.aiAnalysis.seasonalFactors?.map((sf: any, i: number) => (
                  <div key={i} className={`p-3 rounded-lg ${
                    sf.impact === "pozitiv" ? "bg-green-50" : "bg-red-50"
                  }`}>
                    <div className="flex items-center gap-2">
                      <span className={`text-lg ${sf.impact === "pozitiv" ? "" : ""}`}>
                        {sf.impact === "pozitiv" ? "📈" : "📉"}
                      </span>
                      <span className="font-medium">{sf.factor}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{sf.explanation}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Luni afectate: {sf.months?.map((m: number) => monthNames[m - 1]).join(", ")}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Stocking Advice */}
            {data.aiAnalysis.stockingAdvice && (
              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="font-semibold mb-4">📦 Recomandări Stocuri</h3>
                <div className="space-y-3">
                  <div className="bg-green-50 p-3 rounded-lg">
                    <p className="font-medium text-green-800">Crește stocul pentru:</p>
                    <ul className="text-sm mt-1">
                      {data.aiAnalysis.stockingAdvice.increaseStock?.map((cat: string, i: number) => (
                        <li key={i}>• {cat}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-yellow-50 p-3 rounded-lg">
                    <p className="font-medium text-yellow-800">Timing optimal comenzi:</p>
                    <p className="text-sm mt-1">{data.aiAnalysis.stockingAdvice.optimalTiming}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Marketing Calendar */}
            {data.aiAnalysis.marketingCalendar && (
              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="font-semibold mb-4">📣 Calendar Marketing</h3>
                <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                  {data.aiAnalysis.marketingCalendar.map((mc: any, i: number) => (
                    <div key={i} className="bg-purple-50 p-2 rounded text-center">
                      <p className="font-bold text-purple-800">{monthNames[mc.month - 1]}</p>
                      <p className="text-xs text-purple-600">{mc.campaign}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Next Quarter Forecast */}
            {data.aiAnalysis.nextQuarterForecast && (
              <div className="lg:col-span-2 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg shadow p-4">
                <h3 className="font-semibold mb-4">🔮 Predicție Trimestrul Următor</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">
                      {data.aiAnalysis.nextQuarterForecast.expectedRevenue}
                    </p>
                    <p className="text-sm text-gray-600">Venituri estimate</p>
                  </div>
                  <div className="text-center">
                    <p className={`text-2xl font-bold ${
                      data.aiAnalysis.nextQuarterForecast.confidence === "ridicată" ? "text-green-600" :
                      data.aiAnalysis.nextQuarterForecast.confidence === "medie" ? "text-yellow-600" :
                      "text-red-600"
                    }`}>
                      {data.aiAnalysis.nextQuarterForecast.confidence}
                    </p>
                    <p className="text-sm text-gray-600">Încredere</p>
                  </div>
                  <div>
                    <p className="font-medium text-sm mb-1">Riscuri:</p>
                    <ul className="text-xs text-gray-600">
                      {data.aiAnalysis.nextQuarterForecast.risks?.map((r: string, i: number) => (
                        <li key={i}>• {r}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
