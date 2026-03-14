"use client";

import { useState, useEffect } from "react";

interface PriceRecord {
  id: number;
  productId: number;
  productName: string;
  productSku: string;
  variantId: number | null;
  oldPrice: number;
  newPrice: number;
  oldListPrice: number | null;
  newListPrice: number | null;
  changedBy: string;
  createdAt: string;
}

export default function IstoricPreturiPage() {
  const [items, setItems] = useState<PriceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [productId, setProductId] = useState("");

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (productId) params.set("productId", productId);
      const res = await fetch(`/admin/api/istoric-preturi?${params.toString()}`);
      const data = await res.json();
      setItems(data.items);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const fmt = (n: number) => n.toLocaleString("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const priceDiff = (oldP: number, newP: number) => {
    const diff = newP - oldP;
    const pct = oldP > 0 ? ((diff / oldP) * 100).toFixed(1) : "∞";
    if (diff > 0) return <span className="text-red-600 font-semibold">+{fmt(diff)} (+{pct}%)</span>;
    if (diff < 0) return <span className="text-green-600 font-semibold">{fmt(diff)} ({pct}%)</span>;
    return <span className="text-gray-400">0</span>;
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">📈 Istoric Prețuri</h1>

      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ID Produs (opțional)</label>
            <input
              type="number"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              placeholder="Toate produsele"
              className="border rounded px-3 py-2 text-sm w-40"
            />
          </div>
          <button
            onClick={fetchHistory}
            disabled={loading}
            className="bg-blue-600 text-white px-5 py-2 rounded font-semibold hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading ? "Se încarcă..." : "🔍 Caută"}
          </button>
        </div>
      </div>

      {items.length === 0 && !loading && (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-400">
          Nu există modificări de prețuri înregistrate.
        </div>
      )}

      {items.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">Data</th>
                <th className="px-3 py-2 text-left font-semibold">Produs</th>
                <th className="px-3 py-2 text-right font-semibold">Preț vechi</th>
                <th className="px-3 py-2 text-right font-semibold">Preț nou</th>
                <th className="px-3 py-2 text-right font-semibold">Diferență</th>
                <th className="px-3 py-2 text-left font-semibold">Modificat de</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
                    {new Date(item.createdAt).toLocaleString("ro-RO")}
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-medium">{item.productName}</div>
                    {item.variantId && <div className="text-xs text-gray-400">Variantă #{item.variantId}</div>}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">{fmt(item.oldPrice)} RON</td>
                  <td className="px-3 py-2 text-right font-mono">{fmt(item.newPrice)} RON</td>
                  <td className="px-3 py-2 text-right">{priceDiff(item.oldPrice, item.newPrice)}</td>
                  <td className="px-3 py-2 text-gray-500">{item.changedBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
