"use client";

import { useState } from "react";

interface LunaData {
  luna: string;
  venituriFaraTVA: number;
  tvaColectat: number;
  venituri: number;
  nrFacturi: number;
  cheltuieli: number;
  nrCheltuieli: number;
  profit: number;
}

interface RaportData {
  totalVenituriFaraTVA: number;
  totalTVAColectat: number;
  totalVenituri: number;
  totalCheltuieli: number;
  profitNet: number;
  marjaProfit: number;
  nrFacturi: number;
  nrCheltuieli: number;
  lunile: LunaData[];
  cheltuieliPeCategorie: Record<string, number>;
}

const LUNA_LABELS: Record<string, string> = {
  "01": "Ianuarie", "02": "Februarie", "03": "Martie", "04": "Aprilie",
  "05": "Mai", "06": "Iunie", "07": "Iulie", "08": "August",
  "09": "Septembrie", "10": "Octombrie", "11": "Noiembrie", "12": "Decembrie",
};

export default function RaportPLPage() {
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
      const res = await fetch(`/admin/api/raport-pl?${params.toString()}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getLunaLabel = (luna: string) => {
    const [year, month] = luna.split("-");
    return `${LUNA_LABELS[month] || month} ${year}`;
  };

  const fmt = (n: number) => n.toLocaleString("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">📊 Raport Profit & Pierdere</h1>

      {/* Filtre */}
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
            {loading ? "Se calculează..." : "📊 Generează raport"}
          </button>
          {data && (
            <button
              onClick={() => {
                const params = new URLSearchParams();
                if (from) params.set("from", from);
                if (to) params.set("to", to);
                params.set("format", "pdf");
                window.open(`/admin/api/raport-pl?${params.toString()}`, "_blank");
              }}
              className="bg-red-600 text-white px-5 py-2 rounded font-semibold hover:bg-red-700 transition"
            >
              📄 Export PDF
            </button>
          )}
        </div>
      </div>

      {data && (
        <>
          {/* Sumar principal */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4 text-center border-t-4 border-blue-500">
              <div className="text-xl font-bold text-blue-600">{data.nrFacturi}</div>
              <div className="text-xs text-gray-500">Facturi emise</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4 text-center border-t-4 border-green-500">
              <div className="text-xl font-bold text-green-600">{fmt(data.totalVenituriFaraTVA)} RON</div>
              <div className="text-xs text-gray-500">Venituri (fără TVA)</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4 text-center border-t-4 border-amber-500">
              <div className="text-xl font-bold text-amber-600">{fmt(data.totalTVAColectat)} RON</div>
              <div className="text-xs text-gray-500">TVA colectat</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4 text-center border-t-4 border-red-500">
              <div className="text-xl font-bold text-red-600">{fmt(data.totalCheltuieli)} RON</div>
              <div className="text-xs text-gray-500">Cheltuieli ({data.nrCheltuieli})</div>
            </div>
            <div className={`bg-white rounded-lg shadow p-4 text-center border-t-4 ${data.profitNet >= 0 ? "border-green-500" : "border-red-500"}`}>
              <div className={`text-xl font-bold ${data.profitNet >= 0 ? "text-green-700" : "text-red-700"}`}>
                {fmt(data.profitNet)} RON
              </div>
              <div className="text-xs text-gray-500">Profit net</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4 text-center border-t-4 border-purple-500">
              <div className="text-xl font-bold text-purple-600">{data.marjaProfit}%</div>
              <div className="text-xs text-gray-500">Marjă profit</div>
            </div>
          </div>

          {/* Tabel lunar */}
          {data.lunile.length > 0 && (
            <div className="bg-white rounded-lg shadow overflow-x-auto mb-6">
              <h2 className="text-lg font-bold px-4 pt-4 pb-2">Detalii pe luni</h2>
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold">Luna</th>
                    <th className="px-3 py-2 text-right font-semibold">Facturi</th>
                    <th className="px-3 py-2 text-right font-semibold">Venituri (fără TVA)</th>
                    <th className="px-3 py-2 text-right font-semibold">TVA colectat</th>
                    <th className="px-3 py-2 text-right font-semibold">Cheltuieli</th>
                    <th className="px-3 py-2 text-right font-semibold">Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.lunile.map((l) => (
                    <tr key={l.luna} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium">{getLunaLabel(l.luna)}</td>
                      <td className="px-3 py-2 text-right">{l.nrFacturi}</td>
                      <td className="px-3 py-2 text-right font-mono text-green-600">{fmt(l.venituriFaraTVA)}</td>
                      <td className="px-3 py-2 text-right font-mono text-amber-600">{fmt(l.tvaColectat)}</td>
                      <td className="px-3 py-2 text-right font-mono text-red-600">{fmt(l.cheltuieli)}</td>
                      <td className={`px-3 py-2 text-right font-mono font-bold ${l.profit >= 0 ? "text-green-700" : "text-red-700"}`}>
                        {fmt(l.profit)}
                      </td>
                    </tr>
                  ))}
                  {/* Total row */}
                  <tr className="bg-gray-50 font-bold">
                    <td className="px-3 py-2">TOTAL</td>
                    <td className="px-3 py-2 text-right">{data.nrFacturi}</td>
                    <td className="px-3 py-2 text-right font-mono text-green-600">{fmt(data.totalVenituriFaraTVA)}</td>
                    <td className="px-3 py-2 text-right font-mono text-amber-600">{fmt(data.totalTVAColectat)}</td>
                    <td className="px-3 py-2 text-right font-mono text-red-600">{fmt(data.totalCheltuieli)}</td>
                    <td className={`px-3 py-2 text-right font-mono ${data.profitNet >= 0 ? "text-green-700" : "text-red-700"}`}>
                      {fmt(data.profitNet)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Cheltuieli pe categorii */}
          {Object.keys(data.cheltuieliPeCategorie).length > 0 && (
            <div className="bg-white rounded-lg shadow p-4 mb-6">
              <h2 className="text-lg font-bold mb-3">Cheltuieli pe categorii</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {Object.entries(data.cheltuieliPeCategorie)
                  .sort((a, b) => b[1] - a[1])
                  .map(([cat, suma]) => (
                    <div key={cat} className="bg-red-50 rounded-lg p-3 border border-red-100">
                      <div className="font-semibold text-sm text-gray-700">{cat}</div>
                      <div className="text-lg font-bold text-red-600">{fmt(suma)} RON</div>
                      <div className="text-xs text-gray-400">
                        {data.totalCheltuieli > 0 ? Math.round((suma / data.totalCheltuieli) * 100) : 0}% din total
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Vizualizare bară simplă profit pe lună */}
          {data.lunile.length > 0 && (
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-lg font-bold mb-3">Profit lunar</h2>
              <div className="space-y-2">
                {data.lunile.map((l) => {
                  const maxVal = Math.max(...data.lunile.map((x) => Math.abs(x.profit)), 1);
                  const pct = Math.min(Math.abs(l.profit) / maxVal * 100, 100);
                  return (
                    <div key={l.luna} className="flex items-center gap-3">
                      <div className="w-32 text-sm font-medium text-gray-600 text-right">{getLunaLabel(l.luna)}</div>
                      <div className="flex-1 bg-gray-100 rounded-full h-6 relative overflow-hidden">
                        <div
                          className={`h-full rounded-full ${l.profit >= 0 ? "bg-green-500" : "bg-red-500"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className={`w-28 text-right text-sm font-bold ${l.profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {fmt(l.profit)} RON
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
