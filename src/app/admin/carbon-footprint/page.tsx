"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function CarbonFootprintPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [dateRange, setDateRange] = useState("30");

  useEffect(() => {
    loadData();
  }, [dateRange]);

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch(`/admin/api/ai-carbon-footprint?days=${dateRange}`);
      const data = await res.json();
      setOrders(data.orders || []);
      setStats(data.stats);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  async function generateRecommendations() {
    setAnalyzing(true);
    try {
      const res = await fetch("/admin/api/ai-carbon-footprint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stats, orders: orders.slice(0, 20) })
      });
      const data = await res.json();
      setRecommendations(data.recommendations);
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
          <h1 className="text-2xl font-bold mt-2">🌿 Carbon Footprint</h1>
          <p className="text-gray-600">Monitorizează emisiile CO2</p>
        </div>
        <div className="flex gap-2">
          <select
            value={dateRange}
            onChange={e => setDateRange(e.target.value)}
            className="px-3 py-2 border rounded"
          >
            <option value="7">7 zile</option>
            <option value="30">30 zile</option>
            <option value="90">90 zile</option>
            <option value="365">1 an</option>
          </select>
          <button
            onClick={generateRecommendations}
            disabled={analyzing}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            {analyzing ? "..." : "🤖 Recomandări"}
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-gray-100 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold">{stats.totalOrders}</div>
            <div className="text-sm text-gray-600">Comenzi</div>
          </div>
          <div className="bg-green-100 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-green-700">{stats.totalCO2?.toFixed(1)}</div>
            <div className="text-sm text-green-600">kg CO2 Total</div>
          </div>
          <div className="bg-blue-100 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-blue-700">{stats.avgCO2PerOrder?.toFixed(2)}</div>
            <div className="text-sm text-blue-600">kg/Comandă</div>
          </div>
          <div className="bg-yellow-100 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-yellow-700">{stats.avgDistance?.toFixed(0)}</div>
            <div className="text-sm text-yellow-600">km Mediu</div>
          </div>
          <div className={`p-4 rounded-lg text-center ${
            stats.trendVsLastPeriod <= 0 ? "bg-green-100" : "bg-red-100"
          }`}>
            <div className={`text-2xl font-bold ${
              stats.trendVsLastPeriod <= 0 ? "text-green-700" : "text-red-700"
            }`}>
              {stats.trendVsLastPeriod >= 0 ? "+" : ""}{stats.trendVsLastPeriod}%
            </div>
            <div className="text-sm">vs Perioada Anterioară</div>
          </div>
        </div>
      )}

      {/* Visual CO2 Meter */}
      {stats && (
        <div className="bg-white border rounded-lg p-6 mb-6">
          <h3 className="font-semibold mb-4">🌡️ Emisii CO2 - Vizualizare</h3>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="h-8 bg-gradient-to-r from-green-400 via-yellow-400 to-red-500 rounded-full relative">
                <div 
                  className="absolute top-1/2 -translate-y-1/2 w-4 h-10 bg-white border-2 border-gray-800 rounded"
                  style={{ 
                    left: `${Math.min((stats.avgCO2PerOrder / 10) * 100, 95)}%` 
                  }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0 kg</span>
                <span>Excelent</span>
                <span>Moderat</span>
                <span>Îmbunătățire necesară</span>
                <span>10+ kg</span>
              </div>
            </div>
          </div>
          
          <div className="mt-4 grid grid-cols-3 gap-4 text-center">
            <div className="bg-green-50 p-3 rounded">
              <div className="text-green-600 text-2xl">🌳</div>
              <div className="text-sm font-medium">{stats.treesNeeded?.toFixed(0)}</div>
              <div className="text-xs text-gray-500">Copaci pentru compensare</div>
            </div>
            <div className="bg-blue-50 p-3 rounded">
              <div className="text-blue-600 text-2xl">🚗</div>
              <div className="text-sm font-medium">{stats.equivalentCarKm?.toFixed(0)} km</div>
              <div className="text-xs text-gray-500">Echivalent auto</div>
            </div>
            <div className="bg-yellow-50 p-3 rounded">
              <div className="text-yellow-600 text-2xl">💡</div>
              <div className="text-sm font-medium">{stats.equivalentLightHours?.toFixed(0)} ore</div>
              <div className="text-xs text-gray-500">Bec 60W</div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Orders by CO2 */}
        <div>
          <h3 className="font-semibold mb-3">📦 Comenzi - Emisii CO2</h3>
          
          {loading ? (
            <div className="text-center py-10">Se încarcă...</div>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {orders.map((order, i) => (
                <div key={i} className={`border rounded-lg p-3 ${
                  order.co2 < 2 ? "bg-green-50 border-green-200" :
                  order.co2 < 5 ? "bg-yellow-50 border-yellow-200" :
                  "bg-red-50 border-red-200"
                }`}>
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-semibold">Comanda #{order.number}</div>
                      <div className="text-xs text-gray-600">{order.date}</div>
                    </div>
                    <div className="text-right">
                      <div className={`font-bold ${
                        order.co2 < 2 ? "text-green-600" :
                        order.co2 < 5 ? "text-yellow-600" : "text-red-600"
                      }`}>
                        {order.co2?.toFixed(2)} kg CO2
                      </div>
                      <div className="text-xs text-gray-500">{order.distance} km</div>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-gray-600">
                    {order.products} produse • {order.weight?.toFixed(1)} kg greutate
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI Recommendations */}
        <div>
          <h3 className="font-semibold mb-3">🤖 Recomandări Sustenabilitate</h3>
          
          {!recommendations ? (
            <div className="bg-gray-100 rounded-lg p-6 text-center text-gray-500 text-sm">
              Apasă "Recomandări" pentru sugestii
            </div>
          ) : (
            <div className="space-y-4">
              {recommendations.quickWins && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-semibold text-green-800 mb-2">🎯 Quick Wins</h4>
                  <div className="space-y-2">
                    {recommendations.quickWins.map((q: any, i: number) => (
                      <div key={i} className="bg-white p-2 rounded text-sm">
                        <div className="font-medium">{q.action}</div>
                        <div className="text-xs text-green-600">
                          Potențial: -{q.co2Savings} kg CO2/lună
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {recommendations.packagingOptimization && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-800 mb-2">📦 Optimizare Ambalaj</h4>
                  <p className="text-sm">{recommendations.packagingOptimization}</p>
                </div>
              )}

              {recommendations.deliveryOptimization && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-semibold text-yellow-800 mb-2">🚚 Optimizare Livrare</h4>
                  <p className="text-sm">{recommendations.deliveryOptimization}</p>
                </div>
              )}

              {recommendations.offsetProgram && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h4 className="font-semibold text-purple-800 mb-2">🌳 Program Compensare</h4>
                  <p className="text-sm">{recommendations.offsetProgram}</p>
                  <div className="mt-2 text-xs">
                    Cost estimat: {recommendations.offsetCost} RON/lună
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
