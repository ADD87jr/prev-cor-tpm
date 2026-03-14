"use client";

import { useState } from "react";

interface ProductSuggestion {
  name: string;
  nameEn: string;
  productCode?: string;
  type: string;
  domain: string;
  description: string;
  estimatedPrice: number;
  estimatedPurchasePrice: number;
  brand: string;
  priority: string;
  whyRelevant: string;
  suggestedSupplier: string;
  supplierUrl?: string;
  imageUrl?: string;
  image?: string;
  specs?: string[];
  specsEn?: string[];
  advantages?: string[];
  advantagesEn?: string[];
  datasheetUrl?: string;
  safetySheetUrl?: string;
}

interface Category {
  category: string;
  reason: string;
  products: ProductSuggestion[];
}

export default function DescoperiProdusePage() {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [note, setNote] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [approving, setApproving] = useState(false);
  const [findingSuppliers, setFindingSuppliers] = useState(false);
  const [supplierResults, setSupplierResults] = useState<any>(null);
  const [result, setResult] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const discover = async (customSearch?: string) => {
    setLoading(true);
    setSuggestions(null);
    setNote("");
    setSelected(new Set());
    setResult("");
    setSupplierResults(null);
    try {
      const query = customSearch !== undefined ? customSearch : searchQuery;
      const res = await fetch("/admin/api/ai-discover-products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "discover", searchQuery: query || undefined }),
      });
      const data = await res.json();
      setSuggestions(data.suggestions);
      setProfile(data.profile);
      if (data.note) setNote(data.note);
    } catch {
      setNote("Eroare la obținerea sugestiilor");
    }
    setLoading(false);
  };

  const toggleProduct = (name: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const selectAll = () => {
    const all = getAllProducts();
    if (selected.size === all.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(all.map(p => p.name)));
    }
  };

  const getAllProducts = (): ProductSuggestion[] => {
    if (!suggestions?.categories) return [];
    return suggestions.categories.flatMap((c: Category) => c.products);
  };

  const getSelectedProducts = (): ProductSuggestion[] => {
    return getAllProducts().filter(p => selected.has(p.name));
  };

  const approveProducts = async () => {
    const products = getSelectedProducts();
    if (products.length === 0) return;
    setApproving(true);
    setResult("");
    try {
      const res = await fetch("/admin/api/ai-discover-products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve", products }),
      });
      const data = await res.json();
      setResult(`✅ ${data.message}${data.products?.length > 0 ? ` (${data.products.filter((p: any) => p.hasSpecs).length} cu specificații, ${data.products.filter((p: any) => p.hasDatasheet).length} cu fișă tehnică)` : ""}`);
      setSelected(new Set());
    } catch {
      setResult("❌ Eroare la adăugarea produselor");
    }
    setApproving(false);
  };

  const findSuppliers = async () => {
    const products = getSelectedProducts();
    if (products.length === 0) return;
    setFindingSuppliers(true);
    setSupplierResults(null);
    try {
      const res = await fetch("/admin/api/ai-discover-products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "find-suppliers", products }),
      });
      const data = await res.json();
      setSupplierResults(data);
    } catch {
      setSupplierResults({ error: "Eroare la căutarea furnizorilor" });
    }
    setFindingSuppliers(false);
  };

  const priorityBadge = (p: string) => {
    const cls = p === "MARE" ? "bg-red-100 text-red-700" : p === "MEDIE" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700";
    return <span className={`text-xs px-2 py-0.5 rounded font-bold ${cls}`}>{p}</span>;
  };

  const allProducts = getAllProducts();
  const totalEstimated = getSelectedProducts().reduce((s, p) => s + (p.estimatedPurchasePrice || 0) * 5, 0);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">🔍 Descoperă Produse Noi cu AI</h1>
      <p className="text-sm text-gray-500 mb-6">AI-ul analizează profilul firmei PREV-COR TPM și sugerează produse noi pentru catalogul tău. Aprobă ce vrei, apoi AI te ajută să găsești furnizori.</p>

      <div className="flex gap-3 mb-4 flex-wrap items-center">
        <button onClick={() => discover()} disabled={loading}
          className="bg-violet-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-violet-700 disabled:opacity-50 transition text-sm">
          {loading ? "Se caută..." : "🤖 Descoperă produse noi"}
        </button>
        <span className="text-gray-400">sau</span>
        <div className="flex items-center gap-2">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchQuery.trim() && discover()}
              placeholder="Caută produse specifice..."
              className="border border-gray-300 rounded-lg pl-10 pr-4 py-2 w-72 focus:outline-none focus:border-violet-500 text-sm"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          </div>
          <button
            onClick={() => searchQuery.trim() && discover()}
            disabled={loading || !searchQuery.trim()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition text-sm"
          >
            Caută
          </button>
        </div>
      </div>

      {searchQuery.trim() && (
        <p className="text-sm text-violet-600 mb-4">🔎 Căutare activă: <strong>{searchQuery}</strong> — <button onClick={() => { setSearchQuery(""); discover(""); }} className="text-gray-500 hover:text-gray-700 underline">resetează</button></p>
      )}

      <div className="flex gap-3 mb-6 flex-wrap">
        {selected.size > 0 && (
          <>
            <button onClick={approveProducts} disabled={approving}
              className="bg-green-600 text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 transition text-sm">
              {approving ? "⏳ Se adaugă..." : `✅ Aprobă și adaugă ${selected.size} produse în catalog`}
            </button>
            <button onClick={findSuppliers} disabled={findingSuppliers}
              className="bg-blue-600 text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition text-sm">
              {findingSuppliers ? "⏳ Caut furnizori..." : `🏭 Găsește furnizori (${selected.size} produse)`}
            </button>
          </>
        )}
      </div>

      {note && (
        <div className={`${suggestions ? "bg-amber-50 border-amber-300 text-amber-700" : "bg-red-50 border-red-300 text-red-700"} border rounded-lg p-3 mb-4 text-sm`}>
          {note}
        </div>
      )}

      {result && (
        <div className="bg-green-50 border border-green-300 rounded-lg p-3 mb-4 text-green-700 text-sm font-semibold">
          {result}
        </div>
      )}

      {/* Profil firmă */}
      {profile && (
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <h3 className="font-bold text-sm mb-2">📊 Profilul catalogului tău</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
            <div><span className="text-gray-500">Produse:</span> <b>{profile.productCount}</b></div>
            <div><span className="text-gray-500">Domenii:</span> <b>{profile.currentDomains?.length || 0}</b></div>
            <div><span className="text-gray-500">Tipuri/Subcategorii:</span> <b>{profile.currentTypes?.length || 0}</b></div>
            <div><span className="text-gray-500">Branduri:</span> <b>{profile.currentBrands?.length || 0}</b></div>
            <div><span className="text-gray-500">Furnizori:</span> <b>{profile.suppliers?.length || 0}</b></div>
          </div>
          {profile.currentTypes?.length > 0 && (
            <div className="mt-3 pt-3 border-t">
              <span className="text-xs text-gray-500">Categorii și subcategorii active: </span>
              <span className="text-xs text-violet-600 font-medium">{profile.currentTypes.join(', ')}</span>
            </div>
          )}
        </div>
      )}

      {/* Sugestii pe categorii */}
      {suggestions?.categories && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">🛒 Produse sugerate ({allProducts.length})</h2>
            <div className="flex items-center gap-3">
              {selected.size > 0 && <span className="text-sm text-violet-700 font-semibold">Selectate: {selected.size} • Investiție ~{totalEstimated.toLocaleString()} RON (5 buc/produs)</span>}
              <button onClick={selectAll} className="text-sm text-blue-600 hover:underline">
                {selected.size === allProducts.length ? "Deselectează tot" : "Selectează tot"}
              </button>
            </div>
          </div>

          {suggestions.categories.map((cat: Category, ci: number) => (
            <div key={ci} className="bg-white rounded-xl shadow-sm border p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">{cat.category}</h3>
                  <p className="text-sm text-gray-500">{cat.reason}</p>
                </div>
                <span className="bg-violet-100 text-violet-700 text-xs px-3 py-1 rounded-full font-semibold">{cat.products.length} produse</span>
              </div>

              <div className="space-y-3">
                {cat.products.map((p, pi) => (
                  <div key={pi}
                    className={`rounded-lg p-4 transition border-2 ${selected.has(p.name) ? "border-violet-500 bg-violet-50" : "border-gray-100 bg-gray-50 hover:border-gray-300"}`}>
                    <div className="flex items-start justify-between cursor-pointer" onClick={() => toggleProduct(p.name)}>
                      <div className="flex items-start gap-3">
                        <input type="checkbox" checked={selected.has(p.name)} onChange={() => toggleProduct(p.name)}
                          className="mt-1 w-4 h-4 accent-violet-600" />
                        {(p.image || p.imageUrl) && (
                          <img src={p.image || p.imageUrl} alt={p.name}
                            className="w-24 h-24 object-contain rounded-lg border border-gray-200 flex-shrink-0 bg-white p-1"
                            onError={(e) => { const t = e.target as HTMLImageElement; if (t.src !== '/products/default.jpg') t.src = '/products/default.jpg'; }} />
                        )}
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold">{p.name}</span>
                            {priorityBadge(p.priority)}
                            {p.brand && <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{p.brand}</span>}
                            {p.productCode && <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded font-mono">{p.productCode}</span>}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{p.description}</p>
                          <p className="text-xs text-gray-400 mt-1">💡 {p.whyRelevant}</p>
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            {p.suggestedSupplier && <span className="text-xs text-blue-500">🏭 {p.suggestedSupplier}</span>}
                            {p.supplierUrl && (
                              <a href={p.supplierUrl} target="_blank" rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:underline" onClick={e => e.stopPropagation()}>
                                🔗 Pagina furnizor
                              </a>
                            )}
                            {p.datasheetUrl && (
                              <a href={p.datasheetUrl} target="_blank" rel="noopener noreferrer"
                                className="text-xs text-emerald-600 hover:underline" onClick={e => e.stopPropagation()}>
                                📄 Fișă tehnică
                              </a>
                            )}
                            {p.safetySheetUrl && (
                              <a href={p.safetySheetUrl} target="_blank" rel="noopener noreferrer"
                                className="text-xs text-orange-600 hover:underline" onClick={e => e.stopPropagation()}>
                                ⚠️ Fișă securitate
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-4">
                        <div className="text-lg font-bold text-green-700">{p.estimatedPrice} RON</div>
                        <div className="text-xs text-gray-400">achiziție: ~{p.estimatedPurchasePrice} RON</div>
                        <div className="text-xs text-emerald-600 font-semibold">marjă: {Math.round(((p.estimatedPrice - p.estimatedPurchasePrice) / p.estimatedPrice) * 100)}%</div>
                      </div>
                    </div>

                    {/* Specificații tehnice */}
                    {p.specs && p.specs.length > 0 && (
                      <details className="mt-3 ml-7" onClick={e => e.stopPropagation()}>
                        <summary className="text-xs font-semibold text-gray-600 cursor-pointer hover:text-gray-800">
                          📋 Specificații tehnice ({p.specs.length})
                        </summary>
                        <ul className="mt-1 text-xs text-gray-600 space-y-0.5 ml-4 list-disc">
                          {p.specs.map((spec, si) => (
                            <li key={si}>{spec}</li>
                          ))}
                        </ul>
                      </details>
                    )}

                    {/* Avantaje */}
                    {p.advantages && p.advantages.length > 0 && (
                      <details className="mt-2 ml-7" onClick={e => e.stopPropagation()}>
                        <summary className="text-xs font-semibold text-emerald-700 cursor-pointer hover:text-emerald-900">
                          ✅ Avantaje ({p.advantages.length})
                        </summary>
                        <ul className="mt-1 text-xs text-gray-600 space-y-0.5 ml-4 list-disc">
                          {p.advantages.map((adv, ai) => (
                            <li key={ai}>{adv}</li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Insights */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {suggestions.marketInsight && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                <h3 className="font-bold text-sm text-indigo-700 mb-1">📈 Insight piață</h3>
                <p className="text-sm text-gray-700">{suggestions.marketInsight}</p>
              </div>
            )}
            {suggestions.estimatedInvestment && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                <h3 className="font-bold text-sm text-emerald-700 mb-1">💰 Investiție estimată</h3>
                <p className="text-sm text-gray-700">{suggestions.estimatedInvestment}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Rezultate furnizori */}
      {supplierResults && !supplierResults.error && (
        <div className="bg-blue-50 border border-blue-300 rounded-xl p-5 mt-6">
          <h2 className="text-lg font-bold text-blue-800 mb-1">🏭 Furnizori recomandați</h2>
          <p className="text-sm text-gray-500 mb-4">{supplierResults.message} • Cost total estimat: <b>{supplierResults.totalEstimatedCost?.toLocaleString()} RON</b> ({supplierResults.note})</p>

          <div className="space-y-3">
            {supplierResults.suggestions?.map((s: any, i: number) => (
              <div key={i} className="bg-white rounded-lg p-3 shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-bold text-sm">{s.product}</span>
                    <span className="text-xs text-green-700 ml-2">{s.estimatedCost}</span>
                  </div>
                  <span className="text-xs text-gray-400">Sugerat: {s.suggestedSupplier}</span>
                </div>
                <div className="flex gap-2 mt-2">
                  {s.availableSuppliers?.map((sup: any, j: number) => (
                    <span key={j} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                      {sup.name} {sup.website && <a href={sup.website} target="_blank" rel="noopener noreferrer" className="underline ml-1">🔗</a>} ⭐{sup.rating}/10
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {supplierResults?.error && (
        <div className="bg-red-50 border border-red-300 rounded-lg p-3 mt-4 text-red-700 text-sm">
          {supplierResults.error}
        </div>
      )}

      {/* Stare inițială */}
      {!suggestions && !loading && (
        <div className="bg-white rounded-lg shadow p-12 text-center text-gray-400">
          <p className="text-5xl mb-3">🔍</p>
          <p className="text-lg">Apasă <b>&quot;Descoperă produse noi&quot;</b> pentru ca AI-ul să analizeze profilul firmei</p>
          <p className="text-sm mt-1">și să sugereze produse noi relevante pentru catalogul tău</p>
        </div>
      )}
    </div>
  );
}
