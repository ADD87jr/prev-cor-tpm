"use client";

import { useState, useEffect } from "react";

interface InsightsData {
  overview: {
    totalProducts: number;
    totalOrders: number;
    recentOrders: number;
    recentRevenue: number;
    revenueGrowth: number;
    activeNewsletters: number;
    abandonedCarts: number;
    abandonedValue: number;
  };
  alerts: {
    lowStock: { id: number; name: string; stock: number }[];
    outOfStock: { id: number; name: string }[];
  };
  analytics: {
    topSelling: { name: string; qty: number; revenue: number }[];
    topDomains: { domain: string; revenue: number }[];
    popularInWishlist: { id: number; name: string; count: number }[];
  };
  recommendations: string[];
}

export default function AIInsightsPanel() {
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/ai/admin-insights")
      .then((res) => res.json())
      .then(setData)
      .catch(() => setError("Eroare la încărcarea datelor"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-64 mb-4"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return <div className="text-red-600 p-4">{error || "Nu s-au putut încărca datele."}</div>;
  }

  const { overview, alerts, analytics, recommendations } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-800">AI Business Insights</h2>
          <p className="text-sm text-gray-500">Analiză automată a performanței</p>
        </div>
      </div>

      {/* Overview cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Comenzi (30 zile)" value={overview.recentOrders} icon="📦" />
        <StatCard
          label="Venituri (30 zile)"
          value={`${overview.recentRevenue.toLocaleString()} RON`}
          icon="💰"
          trend={overview.revenueGrowth}
        />
        <StatCard label="Coșuri abandonate" value={overview.abandonedCarts} icon="🛒" subtitle={`${overview.abandonedValue.toLocaleString()} RON`} />
        <StatCard label="Abonați newsletter" value={overview.activeNewsletters} icon="📧" />
      </div>

      {/* Recomandări AI */}
      {recommendations.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-100">
          <h3 className="font-bold text-blue-800 mb-3 flex items-center gap-2">
            <span>🤖</span> Recomandări AI
          </h3>
          <ul className="space-y-2">
            {recommendations.map((rec, i) => (
              <li key={i} className="text-sm text-gray-700 bg-white rounded-lg p-3 shadow-sm">
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Alerte stoc */}
      {(alerts.lowStock.length > 0 || alerts.outOfStock.length > 0) && (
        <div className="bg-amber-50 rounded-xl p-5 border border-amber-200">
          <h3 className="font-bold text-amber-800 mb-3">⚠️ Alerte Stoc</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {alerts.outOfStock.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-red-700 mb-2">Fără stoc ({alerts.outOfStock.length})</h4>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {alerts.outOfStock.slice(0, 10).map((p) => (
                    <a key={p.id} href={`/admin/produse?edit=${p.id}`} className="block text-xs text-red-600 hover:underline">
                      {p.name}
                    </a>
                  ))}
                </div>
              </div>
            )}
            {alerts.lowStock.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-amber-700 mb-2">Stoc scăzut ({alerts.lowStock.length})</h4>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {alerts.lowStock.map((p) => (
                    <a key={p.id} href={`/admin/produse?edit=${p.id}`} className="block text-xs text-amber-700 hover:underline">
                      {p.name} — <span className="font-bold">{p.stock} buc</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Analytics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Top vânzări */}
        <div className="bg-white rounded-xl p-5 border shadow-sm">
          <h3 className="font-bold text-gray-800 mb-3">🏆 Top Vânzări</h3>
          <div className="space-y-2">
            {analytics.topSelling.slice(0, 5).map((p, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className="text-gray-400 font-mono w-5">{i + 1}.</span>
                <span className="flex-1 truncate">{p.name}</span>
                <span className="text-xs text-gray-500">{p.qty}×</span>
                <span className="font-semibold text-blue-700">{p.revenue.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top domenii */}
        <div className="bg-white rounded-xl p-5 border shadow-sm">
          <h3 className="font-bold text-gray-800 mb-3">📊 Domenii Performante</h3>
          <div className="space-y-2">
            {analytics.topDomains.map((d, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className="text-gray-400 font-mono w-5">{i + 1}.</span>
                <span className="flex-1">{d.domain}</span>
                <span className="font-semibold text-green-700">{d.revenue.toLocaleString()} RON</span>
              </div>
            ))}
          </div>
        </div>

        {/* Popular în wishlist */}
        <div className="bg-white rounded-xl p-5 border shadow-sm">
          <h3 className="font-bold text-gray-800 mb-3">❤️ Cele Mai Dorite</h3>
          <div className="space-y-2">
            {analytics.popularInWishlist.slice(0, 5).map((p, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className="text-gray-400 font-mono w-5">{i + 1}.</span>
                <span className="flex-1 truncate">{p.name}</span>
                <span className="text-xs text-pink-600 font-semibold">{p.count} ❤️</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  trend,
  subtitle,
}: {
  label: string;
  value: string | number;
  icon: string;
  trend?: number;
  subtitle?: string;
}) {
  return (
    <div className="bg-white rounded-xl p-4 border shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{icon}</span>
        {trend !== undefined && trend !== 0 && (
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${trend > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
            {trend > 0 ? "+" : ""}{trend.toFixed(0)}%
          </span>
        )}
      </div>
      <div className="text-xl font-bold text-gray-800">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
      {subtitle && <div className="text-xs text-gray-400 mt-1">{subtitle}</div>}
    </div>
  );
}
