"use client";

import { useState } from "react";

interface RaportData {
  totalOrders: number;
  totalRevenue: number;
  avgOrder: number;
  statusCount: Record<string, number>;
  statusRevenue: Record<string, number>;
  months: { luna: string; count: number; revenue: number }[];
  paymentData: Record<string, { count: number; revenue: number }>;
  sourceData: Record<string, number>;
}

const STATUS_LABELS: Record<string, string> = {
  awaiting_price: "Așteaptă preț",
  pending: "În așteptare",
  confirmed: "Confirmat",
  processing: "În procesare",
  shipped: "Expediat",
  delivered: "Livrat",
  cancelled: "Anulat",
  refunded: "Rambursat",
};

const LUNA_LABELS: Record<string, string> = {
  "01": "Ian", "02": "Feb", "03": "Mar", "04": "Apr",
  "05": "Mai", "06": "Iun", "07": "Iul", "08": "Aug",
  "09": "Sep", "10": "Oct", "11": "Nov", "12": "Dec",
};

export default function RaportComenziPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [data, setData] = useState<RaportData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchRaport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const res = await fetch(`/admin/api/raport-comenzi?${params.toString()}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n: number) => n.toLocaleString("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const getLunaLabel = (luna: string) => {
    const [year, month] = luna.split("-");
    return `${LUNA_LABELS[month] || month} ${year}`;
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">📋 Raport Comenzi</h1>

      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">De la</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="border rounded px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Până la</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="border rounded px-3 py-2 text-sm" />
          </div>
          <button onClick={fetchRaport} disabled={loading} className="bg-blue-600 text-white px-5 py-2 rounded font-semibold hover:bg-blue-700 transition disabled:opacity-50">
            {loading ? "Se calculează..." : "📋 Generează raport"}
          </button>
        </div>
      </div>

      {data && (
        <>
          {/* Sumar principal */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4 text-center border-t-4 border-blue-500">
              <div className="text-2xl font-bold text-blue-600">{data.totalOrders}</div>
              <div className="text-sm text-gray-500">Total comenzi</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4 text-center border-t-4 border-green-500">
              <div className="text-2xl font-bold text-green-600">{fmt(data.totalRevenue)} RON</div>
              <div className="text-sm text-gray-500">Venituri totale</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4 text-center border-t-4 border-purple-500">
              <div className="text-2xl font-bold text-purple-600">{fmt(data.avgOrder)} RON</div>
              <div className="text-sm text-gray-500">Valoare medie comandă</div>
            </div>
          </div>

          {/* Pe status */}
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <h2 className="text-lg font-bold mb-3">Comenzi pe status</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(data.statusCount)
                .sort((a, b) => b[1] - a[1])
                .map(([status, count]) => (
                  <div key={status} className="bg-gray-50 rounded-lg p-3 border">
                    <div className="font-semibold text-sm">{STATUS_LABELS[status] || status}</div>
                    <div className="text-xl font-bold text-blue-600">{count}</div>
                    <div className="text-xs text-gray-400">{fmt(data.statusRevenue[status] || 0)} RON</div>
                  </div>
                ))}
            </div>
          </div>

          {/* Tabel lunar */}
          {data.months.length > 0 && (
            <div className="bg-white rounded-lg shadow overflow-x-auto mb-6">
              <h2 className="text-lg font-bold px-4 pt-4 pb-2">Evoluție lunară</h2>
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold">Luna</th>
                    <th className="px-3 py-2 text-right font-semibold">Comenzi</th>
                    <th className="px-3 py-2 text-right font-semibold">Venituri</th>
                    <th className="px-3 py-2 text-right font-semibold">Medie/comandă</th>
                    <th className="px-3 py-2 text-left font-semibold">Vizualizare</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.months.map((m) => {
                    const maxRev = Math.max(...data.months.map((x) => x.revenue), 1);
                    const pct = Math.min((m.revenue / maxRev) * 100, 100);
                    return (
                      <tr key={m.luna} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-medium">{getLunaLabel(m.luna)}</td>
                        <td className="px-3 py-2 text-right font-bold">{m.count}</td>
                        <td className="px-3 py-2 text-right font-mono text-green-600">{fmt(m.revenue)} RON</td>
                        <td className="px-3 py-2 text-right font-mono text-gray-600">
                          {m.count > 0 ? fmt(m.revenue / m.count) : "0"} RON
                        </td>
                        <td className="px-3 py-2">
                          <div className="bg-gray-200 rounded-full h-4 w-full overflow-hidden">
                            <div className="bg-blue-500 h-full rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Metode de plată */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-lg font-bold mb-3">Metode de plată</h2>
              <div className="space-y-2">
                {Object.entries(data.paymentData)
                  .sort((a, b) => b[1].count - a[1].count)
                  .map(([method, d]) => (
                    <div key={method} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="font-medium text-sm capitalize">{method}</span>
                      <div className="text-right">
                        <span className="font-bold text-blue-600 mr-2">{d.count}</span>
                        <span className="text-xs text-gray-400">{fmt(d.revenue)} RON</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-lg font-bold mb-3">Surse comenzi</h2>
              <div className="space-y-2">
                {Object.entries(data.sourceData)
                  .sort((a, b) => b[1] - a[1])
                  .map(([source, count]) => (
                    <div key={source} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="font-medium text-sm capitalize">{source}</span>
                      <span className="font-bold text-blue-600">{count}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
