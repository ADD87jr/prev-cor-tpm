"use client";

import { useState, useEffect } from "react";

interface Product {
  id: number;
  name: string;
  description?: string;
  descriptionEn?: string;
  type?: string;
  manufacturer?: string;
  needsSeo: boolean;
}

interface SeoResult {
  productId: number;
  productName: string;
  success: boolean;
  seo?: {
    descriptionRo: string;
    descriptionEn: string;
    metaTitleRo: string;
    metaTitleEn: string;
    metaDescRo: string;
    metaDescEn: string;
    keywords: string;
  };
  error?: string;
}

export default function AISeoPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [results, setResults] = useState<SeoResult[]>([]);
  const [applying, setApplying] = useState(false);

  useEffect(() => { loadProducts(); }, []);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/admin/api/ai-seo");
      const data = await res.json();
      setProducts(data.products || []);
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
      setSelected(new Set(products.map(p => p.id)));
    }
  };

  const selectNeedingSeo = () => {
    setSelected(new Set(products.filter(p => p.needsSeo).map(p => p.id)));
  };

  const generateSeo = async () => {
    if (selected.size === 0) {
      alert("Selectează cel puțin un produs!");
      return;
    }

    setGenerating(true);
    setResults([]);

    try {
      const res = await fetch("/admin/api/ai-seo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate",
          productIds: Array.from(selected)
        }),
      });
      const data = await res.json();
      setResults(data.results || []);
    } catch (err) {
      alert("Eroare la generare!");
    }

    setGenerating(false);
  };

  const applyAll = async () => {
    const successResults = results.filter(r => r.success && r.seo);
    if (successResults.length === 0) {
      alert("Nu există descrieri de aplicat!");
      return;
    }

    setApplying(true);
    try {
      const res = await fetch("/admin/api/ai-seo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "apply",
          updates: successResults.map(r => ({
            productId: r.productId,
            descriptionRo: r.seo!.descriptionRo,
            descriptionEn: r.seo!.descriptionEn
          }))
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`✅ ${data.updated} descrieri aplicate cu succes!`);
        setResults([]);
        setSelected(new Set());
        loadProducts();
      }
    } catch (err) {
      alert("Eroare la aplicare!");
    }
    setApplying(false);
  };

  const needingSeo = products.filter(p => p.needsSeo).length;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">🔍 AI Descrieri SEO</h1>
      <p className="text-sm text-gray-500 mb-6">Generează automat descrieri optimizate SEO pentru produse în română și engleză.</p>

      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex gap-3">
            <button onClick={selectAll}
              className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded font-semibold text-sm transition">
              {selected.size === products.length ? "Deselectează tot" : "Selectează tot"}
            </button>
            {needingSeo > 0 && (
              <button onClick={selectNeedingSeo}
                className="bg-amber-100 hover:bg-amber-200 text-amber-700 px-4 py-2 rounded font-semibold text-sm transition">
                Selectează {needingSeo} fără SEO
              </button>
            )}
          </div>
          <div className="flex gap-3 items-center">
            <span className="text-sm text-gray-500">{selected.size} selectate</span>
            <button onClick={generateSeo} disabled={generating || selected.size === 0}
              className="bg-blue-600 text-white px-6 py-2 rounded font-bold hover:bg-blue-700 disabled:opacity-50 transition">
              {generating ? `⏳ Se generează... (${results.length}/${selected.size})` : "🤖 Generează SEO"}
            </button>
          </div>
        </div>
      </div>

      {/* Rezultate */}
      {results.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold">✅ Rezultate Generate ({results.filter(r => r.success).length}/{results.length})</h2>
            <button onClick={applyAll} disabled={applying}
              className="bg-green-600 text-white px-6 py-2 rounded font-bold hover:bg-green-700 disabled:opacity-50 transition">
              {applying ? "⏳ Se aplică..." : "💾 Aplică toate descrierile"}
            </button>
          </div>
          
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {results.map(r => (
              <div key={r.productId} className={`border rounded-lg p-4 ${r.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold">{r.productName}</h3>
                  {r.success ? (
                    <span className="bg-green-600 text-white text-xs px-2 py-1 rounded">✓ Generat</span>
                  ) : (
                    <span className="bg-red-600 text-white text-xs px-2 py-1 rounded">✗ Eroare</span>
                  )}
                </div>
                
                {r.success && r.seo ? (
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-medium text-gray-700 mb-1">🇷🇴 Descriere RO:</p>
                      <p className="text-gray-600 bg-white p-2 rounded max-h-32 overflow-y-auto">{r.seo.descriptionRo}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-700 mb-1">🇬🇧 Descriere EN:</p>
                      <p className="text-gray-600 bg-white p-2 rounded max-h-32 overflow-y-auto">{r.seo.descriptionEn}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-700">Meta Title RO:</p>
                      <p className="text-blue-600">{r.seo.metaTitleRo}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-700">Meta Title EN:</p>
                      <p className="text-blue-600">{r.seo.metaTitleEn}</p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="font-medium text-gray-700">🏷️ Keywords:</p>
                      <p className="text-purple-600">{r.seo.keywords}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-red-600">{r.error}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lista produse */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-semibold">Selectează</th>
              <th className="text-left px-4 py-3 text-sm font-semibold">Produs</th>
              <th className="text-left px-4 py-3 text-sm font-semibold">Categorie</th>
              <th className="text-left px-4 py-3 text-sm font-semibold">Status SEO</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="text-center py-8 text-gray-500">Se încarcă...</td></tr>
            ) : products.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-8 text-gray-500">Nu există produse</td></tr>
            ) : products.map(p => (
              <tr key={p.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3">
                  <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleSelect(p.id)}
                    className="w-5 h-5 accent-blue-600" />
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium">{p.name}</p>
                  {p.manufacturer && <p className="text-xs text-gray-500">{p.manufacturer}</p>}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{p.type}</td>
                <td className="px-4 py-3">
                  {p.needsSeo ? (
                    <span className="bg-amber-100 text-amber-700 text-xs px-2 py-1 rounded font-bold">⚠️ Necesită SEO</span>
                  ) : (
                    <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded font-bold">✓ OK</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
