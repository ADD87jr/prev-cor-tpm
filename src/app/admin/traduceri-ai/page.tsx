"use client";

import { useState, useEffect } from "react";

interface Product {
  id: number;
  name: string;
  nameEn?: string;
  description?: string;
  descriptionEn?: string;
  type?: string;
  domain?: string;
  manufacturer?: string;
  sku?: string;
}

interface Translation {
  id: number;
  nameEn: string;
  descriptionEn: string;
  specificationsEn?: string;
  advantagesEn?: string;
}

export default function AITranslatePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [translating, setTranslating] = useState(false);
  const [applying, setApplying] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [translations, setTranslations] = useState<Translation[]>([]);

  useEffect(() => { loadProducts(); }, []);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/admin/api/ai-translate");
      const data = await res.json();
      setProducts(data.untranslated || []);
      setStats(data.stats);
    } catch { }
    setLoading(false);
  };

  const toggleSelect = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === products.length) {
      setSelected(new Set());
    } else {
      // Max 10 pentru traducere
      setSelected(new Set(products.slice(0, 10).map(p => p.id)));
    }
  };

  const translate = async () => {
    if (selected.size === 0) {
      alert("Selectează cel puțin un produs!");
      return;
    }

    setTranslating(true);
    setTranslations([]);

    try {
      const res = await fetch("/admin/api/ai-translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productIds: Array.from(selected),
          action: "preview"
        }),
      });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
      } else {
        setTranslations(data.translations || []);
      }
    } catch (err) {
      alert("Eroare la traducere!");
    }

    setTranslating(false);
  };

  const applyTranslations = async () => {
    if (translations.length === 0) return;

    setApplying(true);

    try {
      const res = await fetch("/admin/api/ai-translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productIds: translations.map(t => t.id),
          action: "apply"
        }),
      });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
      } else {
        alert(data.message || "Traduceri salvate!");
        setTranslations([]);
        setSelected(new Set());
        loadProducts();
      }
    } catch (err) {
      alert("Eroare la salvare!");
    }

    setApplying(false);
  };

  const getProductById = (id: number) => products.find(p => p.id === id);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">🌐 AI Traduceri Automate Produse</h1>
      <p className="text-sm text-gray-500 mb-6">AI traduce automat produsele din română în engleză, păstrând acuratețea tehnică.</p>

      {/* Stats */}
      {stats && (
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <div className="bg-red-50 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-red-700">{stats.untranslatedCount}</p>
            <p className="text-sm text-red-600">🔴 Netraduse</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-green-700">{stats.translatedCount}</p>
            <p className="text-sm text-green-600">✓ Traduse</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-blue-700">{stats.totalProducts}</p>
            <p className="text-sm text-blue-600">📦 Total produse</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex gap-3 items-center">
            <button onClick={selectAll}
              className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded font-semibold text-sm transition">
              {selected.size > 0 ? "Deselectează" : "Selectează 10"}
            </button>
            <span className="text-sm text-gray-500">{selected.size} selectate (max 10/request)</span>
          </div>
          <button onClick={translate} disabled={translating || selected.size === 0}
            className="bg-indigo-600 text-white px-6 py-2 rounded font-bold hover:bg-indigo-700 disabled:opacity-50 transition">
            {translating ? "⏳ Se traduce..." : "🤖 Traduce cu AI"}
          </button>
        </div>
      </div>

      {/* Rezultate traduceri */}
      {translations.length > 0 && (
        <div className="bg-white rounded-lg shadow mb-6 overflow-hidden">
          <div className="p-4 border-b flex justify-between items-center">
            <h2 className="font-bold">✅ Traduceri Generate ({translations.length})</h2>
            <button
              onClick={applyTranslations}
              disabled={applying}
              className="bg-green-600 text-white px-6 py-2 rounded font-bold hover:bg-green-700 disabled:opacity-50 transition"
            >
              {applying ? "⏳ Se salvează..." : "💾 Salvează Toate în Baza de Date"}
            </button>
          </div>

          <div className="divide-y max-h-[500px] overflow-y-auto">
            {translations.map(t => {
              const original = getProductById(t.id);
              return (
                <div key={t.id} className="p-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-1">🇷🇴 Original RO</p>
                      <p className="font-semibold text-gray-800">{original?.name}</p>
                      <p className="text-sm text-gray-600 mt-2">{original?.description?.substring(0, 200)}...</p>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-3">
                      <p className="text-xs text-blue-600 mb-1">🇬🇧 Traducere EN</p>
                      <p className="font-semibold text-blue-800">{t.nameEn}</p>
                      <p className="text-sm text-blue-700 mt-2">{t.descriptionEn?.substring(0, 200)}...</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Lista produse netraduse */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <h2 className="font-bold p-4 border-b">📋 Produse Netraduse ({products.length})</h2>
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="text-left px-4 py-3 text-sm">Selectează</th>
                <th className="text-left px-4 py-3 text-sm">Produs</th>
                <th className="text-left px-4 py-3 text-sm">Tip</th>
                <th className="text-left px-4 py-3 text-sm">Descriere RO</th>
                <th className="text-center px-4 py-3 text-sm">Status EN</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center py-8 text-gray-500">Se încarcă...</td></tr>
              ) : products.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-green-600 font-medium">🎉 Toate produsele sunt traduse!</td></tr>
              ) : products.map(p => (
                <tr key={p.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(p.id)}
                      onChange={() => toggleSelect(p.id)}
                      disabled={!selected.has(p.id) && selected.size >= 10}
                      className="w-5 h-5 accent-indigo-600"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{p.name}</p>
                    {p.manufacturer && <p className="text-xs text-gray-500">{p.manufacturer}</p>}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{p.type}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                    {p.description?.substring(0, 100) || "-"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {p.nameEn ? (
                      <span className="text-green-600 text-xs">✓ Nume</span>
                    ) : (
                      <span className="text-red-600 text-xs">✗ Lipsește</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
