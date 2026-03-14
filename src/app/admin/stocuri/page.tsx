"use client";

import { useState } from "react";

interface StockItem {
  type: "product" | "variant";
  id: number;
  productId?: number;
  name: string;
  sku: string;
  stock: number;
  price: number;
  status: "out" | "low" | "ok";
}

export default function StocuriPage() {
  const [items, setItems] = useState<StockItem[]>([]);
  const [totalOut, setTotalOut] = useState(0);
  const [totalLow, setTotalLow] = useState(0);
  const [threshold, setThreshold] = useState(5);
  const [showAll, setShowAll] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const fetchStock = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("threshold", String(threshold));
      if (showAll) params.set("all", "true");
      const res = await fetch(`/admin/api/stocuri?${params.toString()}`);
      const data = await res.json();
      setItems(data.items);
      setTotalOut(data.totalOut);
      setTotalLow(data.totalLow);
      setLoaded(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const statusBadge = (status: string) => {
    if (status === "out") return <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-bold">EPUIZAT</span>;
    if (status === "low") return <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-xs font-bold">STOC SCĂZUT</span>;
    if (status === "ondemand") return <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-bold">LA COMANDĂ</span>;
    return <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-bold">OK</span>;
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">📦 Raport Stocuri</h1>

      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Prag stoc scăzut</label>
            <input
              type="number"
              min={0}
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="border rounded px-3 py-2 text-sm w-24"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
            Arată toate produsele
          </label>
          <button
            onClick={fetchStock}
            disabled={loading}
            className="bg-blue-600 text-white px-5 py-2 rounded font-semibold hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading ? "Se încarcă..." : "🔍 Verifică stocuri"}
          </button>
        </div>
      </div>

      {loaded && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4 text-center border-t-4 border-red-500">
              <div className="text-2xl font-bold text-red-600">{totalOut}</div>
              <div className="text-sm text-gray-500">Stoc epuizat</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4 text-center border-t-4 border-amber-500">
              <div className="text-2xl font-bold text-amber-600">{totalLow}</div>
              <div className="text-sm text-gray-500">Stoc scăzut (≤{threshold})</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4 text-center border-t-4 border-blue-500">
              <div className="text-2xl font-bold text-blue-600">{items.length}</div>
              <div className="text-sm text-gray-500">Total afișate</div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Tip</th>
                  <th className="px-3 py-2 text-left font-semibold">Produs / Variantă</th>
                  <th className="px-3 py-2 text-left font-semibold">SKU</th>
                  <th className="px-3 py-2 text-right font-semibold">Stoc</th>
                  <th className="px-3 py-2 text-right font-semibold">Preț</th>
                  <th className="px-3 py-2 text-center font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((item, i) => (
                  <tr key={`${item.type}-${item.id}`} className={`hover:bg-gray-50 ${item.status === "out" ? "bg-red-50" : item.status === "low" ? "bg-amber-50" : ""}`}>
                    <td className="px-3 py-2">
                      {item.type === "product" ? "📦" : "🔧"}
                    </td>
                    <td className="px-3 py-2 font-medium">{item.name}</td>
                    <td className="px-3 py-2 text-gray-500">{item.sku}</td>
                    <td className={`px-3 py-2 text-right font-bold ${item.stock === 0 ? "text-red-600" : item.stock <= threshold ? "text-amber-600" : "text-green-600"}`}>
                      {item.stock}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">{item.price.toFixed(2)} RON</td>
                    <td className="px-3 py-2 text-center">{statusBadge(item.status)}</td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-gray-400">
                      {showAll ? "Nu sunt produse în baza de date." : "Nu sunt produse cu stoc scăzut — bifează 'Arată toate produsele' pentru a vedea totul 🎉"}
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
