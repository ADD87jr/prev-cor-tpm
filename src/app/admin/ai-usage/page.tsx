"use client";
import { useState, useEffect } from "react";

export default function AIUsageStatsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  async function fetchData() {
    try {
      const res = await fetch("/admin/api/ai-usage-stats");
      const data = await res.json();
      setData(data);
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">📊 AI Usage Monitor</h1>
      <p className="text-gray-600 mb-6">Monitorizare utilizare API Gemini și rate limits</p>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      ) : data ? (
        <div className="space-y-6">
          {/* Rate Limits */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="font-semibold text-lg mb-4">⏱️ Rate Limits (Gemini Free Tier)</h2>
            
            <div className="grid grid-cols-2 gap-6">
              {/* Minute limit */}
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-600">Requests per minut</span>
                  <span className="font-medium">
                    {data.rateLimits.minuteRemaining} / {data.rateLimits.maxPerMinute}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div 
                    className={`h-4 rounded-full transition-all ${
                      data.rateLimits.minuteRemaining < 3 ? "bg-red-500" :
                      data.rateLimits.minuteRemaining < 7 ? "bg-yellow-500" : "bg-green-500"
                    }`}
                    style={{ 
                      width: `${(data.rateLimits.minuteRemaining / data.rateLimits.maxPerMinute) * 100}%` 
                    }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Reset în {data.rateLimits.resetMinute}s
                </p>
              </div>

              {/* Day limit */}
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-600">Requests per zi</span>
                  <span className="font-medium">
                    {data.rateLimits.dayRemaining} / {data.rateLimits.maxPerDay}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div 
                    className={`h-4 rounded-full transition-all ${
                      data.rateLimits.dayRemaining < 100 ? "bg-red-500" :
                      data.rateLimits.dayRemaining < 500 ? "bg-yellow-500" : "bg-green-500"
                    }`}
                    style={{ 
                      width: `${(data.rateLimits.dayRemaining / data.rateLimits.maxPerDay) * 100}%` 
                    }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Reset în {data.rateLimits.resetDay}h
                </p>
              </div>
            </div>
          </div>

          {/* Usage Stats */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-600">Total Requests (7 zile)</p>
              <p className="text-2xl font-bold text-blue-700">{data.usage.totalRequests}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <p className="text-sm text-green-600">Cache Hits</p>
              <p className="text-2xl font-bold text-green-700">{data.usage.cachedRequests}</p>
              <p className="text-xs text-green-600">
                {data.usage.totalRequests > 0 
                  ? Math.round((data.usage.cachedRequests / data.usage.totalRequests) * 100) 
                  : 0}% hit rate
              </p>
            </div>
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <p className="text-sm text-red-600">Failed</p>
              <p className="text-2xl font-bold text-red-700">{data.usage.failedRequests}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <p className="text-sm text-purple-600">Avg Latency</p>
              <p className="text-2xl font-bold text-purple-700">{data.usage.avgLatencyMs}ms</p>
            </div>
          </div>

          {/* Top Endpoints */}
          {data.usage.topEndpoints?.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="font-semibold text-lg mb-4">🔥 Top Endpoints</h2>
              <div className="space-y-2">
                {data.usage.topEndpoints.map((ep: any, i: number) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-48 text-sm font-mono truncate">{ep.endpoint}</div>
                    <div className="flex-1 bg-gray-200 rounded-full h-3">
                      <div 
                        className="bg-blue-500 h-3 rounded-full"
                        style={{ 
                          width: `${(ep.count / data.usage.topEndpoints[0].count) * 100}%` 
                        }}
                      ></div>
                    </div>
                    <div className="w-16 text-right text-sm font-medium">{ep.count}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Daily Usage Chart */}
          {data.usage.dailyUsage?.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="font-semibold text-lg mb-4">📅 Utilizare Zilnică</h2>
              <div className="flex items-end gap-2 h-32">
                {data.usage.dailyUsage.map((day: any, i: number) => {
                  const maxCount = Math.max(...data.usage.dailyUsage.map((d: any) => d.count));
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center">
                      <div 
                        className="w-full bg-blue-500 rounded-t"
                        style={{ height: `${(day.count / maxCount) * 100}%`, minHeight: "4px" }}
                      ></div>
                      <p className="text-xs text-gray-500 mt-1">{day.date.slice(5)}</p>
                      <p className="text-xs font-medium">{day.count}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Health Status */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="font-semibold text-lg mb-4">🏥 System Health</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="flex items-center gap-3">
                <span className={`w-4 h-4 rounded-full ${data.health.cacheEnabled ? "bg-green-500" : "bg-red-500"}`}></span>
                <span>Cache</span>
              </div>
              <div className="flex items-center gap-3">
                <span className={`w-4 h-4 rounded-full ${data.health.rateLimitEnabled ? "bg-green-500" : "bg-red-500"}`}></span>
                <span>Rate Limiter</span>
              </div>
              <div className="flex items-center gap-3">
                <span className={`w-4 h-4 rounded-full ${data.health.loggingEnabled ? "bg-green-500" : "bg-red-500"}`}></span>
                <span>Logging</span>
              </div>
            </div>
          </div>

          {/* Recommendations */}
          {data.recommendations?.length > 0 && (
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <h3 className="font-semibold text-yellow-800 mb-2">💡 Recomandări</h3>
              <ul className="space-y-1">
                {data.recommendations.map((rec: string, i: number) => (
                  <li key={i} className="text-yellow-700">{rec}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <p className="text-center text-gray-500 py-12">Nu sunt date disponibile</p>
      )}
    </div>
  );
}
