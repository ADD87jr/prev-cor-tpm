"use client";

import { useState } from "react";

interface ClientRow {
  email: string;
  name: string;
  phone: string;
  totalSpent: number;
  orderCount: number;
  firstOrder: string;
  lastOrder: string;
  avgOrder: number;
}

export default function TopClientiPage() {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalClients, setTotalClients] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [limit, setLimit] = useState(50);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/admin/api/top-clienti?limit=${limit}`);
      const data = await res.json();
      setClients(data.clients);
      setTotalRevenue(data.totalRevenue);
      setTotalOrders(data.totalOrders);
      setTotalClients(data.totalClients);
      setLoaded(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n: number) => n.toLocaleString("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">👥 Top Clienți (LTV)</h1>

      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Top</label>
            <select value={limit} onChange={(e) => setLimit(Number(e.target.value))} className="border rounded px-3 py-2 text-sm">
              <option value={10}>Top 10</option>
              <option value={25}>Top 25</option>
              <option value={50}>Top 50</option>
              <option value={100}>Top 100</option>
            </select>
          </div>
          <button
            onClick={fetchClients}
            disabled={loading}
            className="bg-blue-600 text-white px-5 py-2 rounded font-semibold hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading ? "Se încarcă..." : "👥 Generează raport"}
          </button>
        </div>
      </div>

      {loaded && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4 text-center border-t-4 border-blue-500">
              <div className="text-2xl font-bold text-blue-600">{totalClients}</div>
              <div className="text-sm text-gray-500">Clienți unici</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4 text-center border-t-4 border-green-500">
              <div className="text-2xl font-bold text-green-600">{fmt(totalRevenue)} RON</div>
              <div className="text-sm text-gray-500">Venituri totale</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4 text-center border-t-4 border-amber-500">
              <div className="text-2xl font-bold text-amber-600">{totalOrders}</div>
              <div className="text-sm text-gray-500">Comenzi totale</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4 text-center border-t-4 border-purple-500">
              <div className="text-2xl font-bold text-purple-600">
                {totalClients > 0 ? fmt(totalRevenue / totalClients) : "0"} RON
              </div>
              <div className="text-sm text-gray-500">LTV mediu</div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-3 py-2 text-center font-semibold w-10">#</th>
                  <th className="px-3 py-2 text-left font-semibold">Client</th>
                  <th className="px-3 py-2 text-left font-semibold">Email</th>
                  <th className="px-3 py-2 text-left font-semibold">Telefon</th>
                  <th className="px-3 py-2 text-right font-semibold">Comenzi</th>
                  <th className="px-3 py-2 text-right font-semibold">Total cheltuit</th>
                  <th className="px-3 py-2 text-right font-semibold">Medie/comandă</th>
                  <th className="px-3 py-2 text-left font-semibold">Prima comandă</th>
                  <th className="px-3 py-2 text-left font-semibold">Ultima comandă</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {clients.map((c, i) => (
                  <tr key={c.email} className={`hover:bg-gray-50 ${i < 3 ? "bg-yellow-50" : ""}`}>
                    <td className="px-3 py-2 text-center font-bold text-gray-400">
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                    </td>
                    <td className="px-3 py-2 font-medium">{c.name}</td>
                    <td className="px-3 py-2 text-blue-600">{c.email}</td>
                    <td className="px-3 py-2 text-gray-500">{c.phone}</td>
                    <td className="px-3 py-2 text-right font-bold">{c.orderCount}</td>
                    <td className="px-3 py-2 text-right font-mono font-bold text-green-600">{fmt(c.totalSpent)} RON</td>
                    <td className="px-3 py-2 text-right font-mono text-gray-600">{fmt(c.avgOrder)} RON</td>
                    <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{new Date(c.firstOrder).toLocaleDateString("ro-RO")}</td>
                    <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{new Date(c.lastOrder).toLocaleDateString("ro-RO")}</td>
                  </tr>
                ))}
                {clients.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-3 py-8 text-center text-gray-400">
                      Nu sunt comenzi în baza de date.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
