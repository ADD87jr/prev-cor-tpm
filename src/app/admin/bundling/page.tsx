"use client";

import { useState, useEffect } from "react";

interface ProductPair {
  product1Id: number;
  product1Name: string;
  product2Id: number;
  product2Name: string;
  coOccurrence: number;
}

interface Product {
  id: number;
  name: string;
  type?: string;
  price: number;
  manufacturer?: string;
}

interface BundleResult {
  products: Product[];
  originalPrice: number;
  bundleName: string;
  bundleDescription: string;
  suggestedDiscount: number;
  bundlePrice: number;
  savings: number;
  targetAudience: string;
  useCases: string[];
  marketingCopy: string;
  technicalSynergy: string;
  additionalProducts: string[];
  estimatedDemand: string;
}

export default function AIBundlingPage() {
  const [topPairs, setTopPairs] = useState<ProductPair[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [bundle, setBundle] = useState<BundleResult | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [allProducts, setAllProducts] = useState<Product[]>([]);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pairsRes, productsRes] = await Promise.all([
        fetch("/admin/api/ai-product-bundling"),
        fetch("/admin/api/produse?limit=100")
      ]);
      
      const pairsData = await pairsRes.json();
      setTopPairs(pairsData.topPairs || []);
      setStats(pairsData.stats);

      try {
        const productsData = await productsRes.json();
        setAllProducts(productsData.products || productsData || []);
      } catch {}
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const toggleProduct = (productId: number) => {
    setSelectedProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const selectPair = (pair: ProductPair) => {
    setSelectedProducts([pair.product1Id, pair.product2Id]);
  };

  const generateBundle = async () => {
    if (selectedProducts.length < 2) {
      alert("Selectează minim 2 produse!");
      return;
    }

    setGenerating(true);
    setBundle(null);

    try {
      const res = await fetch("/admin/api/ai-product-bundling", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productIds: selectedProducts })
      });
      const data = await res.json();
      setBundle(data);
    } catch (e) {
      console.error(e);
    }
    setGenerating(false);
  };

  const filteredProducts = allProducts.filter((p: any) => 
    p.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">📦 AI Product Bundling</h1>
      <p className="text-gray-600 mb-6">
        Creează pachete de produse care se vând bine împreună.
      </p>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coloane stânga */}
          <div className="space-y-4">
            {/* Stats */}
            {stats && (
              <div className="bg-white rounded-lg shadow p-4">
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="bg-emerald-50 rounded p-2">
                    <p className="text-xl font-bold text-emerald-600">{stats.ordersAnalyzed}</p>
                    <p className="text-xs text-emerald-500">Comenzi analizate</p>
                  </div>
                  <div className="bg-blue-50 rounded p-2">
                    <p className="text-xl font-bold text-blue-600">{stats.uniquePairs}</p>
                    <p className="text-xs text-blue-500">Perechi unice</p>
                  </div>
                </div>
              </div>
            )}

            {/* Top perechi */}
            <div className="bg-white rounded-lg shadow p-5">
              <h3 className="font-semibold text-gray-700 mb-3">Top Perechi Frecvente</h3>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {topPairs.slice(0, 10).map((pair, i) => (
                  <div 
                    key={i}
                    className="border rounded p-2 cursor-pointer hover:bg-emerald-50 text-xs"
                    onClick={() => selectPair(pair)}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex-1 min-w-0">
                        <p className="truncate">{pair.product1Name}</p>
                        <p className="truncate text-gray-500">+ {pair.product2Name}</p>
                      </div>
                      <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-xs ml-2">
                        {pair.coOccurrence}x
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Selectare manuală */}
            <div className="bg-white rounded-lg shadow p-5">
              <h3 className="font-semibold text-gray-700 mb-3">Selectare Manuală</h3>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Caută produs..."
                className="w-full border rounded px-3 py-2 text-sm mb-3"
              />
              <div className="space-y-1 max-h-[150px] overflow-y-auto">
                {filteredProducts.slice(0, 20).map((product: any) => (
                  <label 
                    key={product.id}
                    className="flex items-center gap-2 p-1 hover:bg-gray-50 cursor-pointer text-xs"
                  >
                    <input
                      type="checkbox"
                      checked={selectedProducts.includes(product.id)}
                      onChange={() => toggleProduct(product.id)}
                      className="rounded"
                    />
                    <span className="truncate flex-1">{product.name}</span>
                    <span className="text-gray-500">{product.price?.toFixed(0)} RON</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Produse selectate */}
            <div className="bg-white rounded-lg shadow p-5">
              <h3 className="font-semibold text-gray-700 mb-3">
                Selectate ({selectedProducts.length})
              </h3>
              <div className="space-y-1 mb-3">
                {selectedProducts.map(id => {
                  const p = allProducts.find((pr: any) => pr.id === id);
                  return p ? (
                    <div key={id} className="flex justify-between text-xs bg-emerald-50 rounded p-1">
                      <span className="truncate">{p.name}</span>
                      <button 
                        onClick={() => toggleProduct(id)}
                        className="text-red-500 ml-2"
                      >
                        ✕
                      </button>
                    </div>
                  ) : null;
                })}
              </div>
              <button
                onClick={generateBundle}
                disabled={generating || selectedProducts.length < 2}
                className="w-full bg-emerald-600 text-white py-2 rounded font-medium hover:bg-emerald-700 disabled:opacity-50"
              >
                {generating ? "Generez..." : "📦 Creează Bundle"}
              </button>
            </div>
          </div>

          {/* Bundle generat */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow p-5">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">Bundle Generat</h2>

            {generating ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600 mb-4"></div>
                <p className="text-gray-600">Creez pachetul...</p>
              </div>
            ) : bundle ? (
              <div className="space-y-4">
                {/* Header bundle */}
                <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-lg p-5">
                  <h3 className="text-xl font-bold text-emerald-800">{bundle.bundleName}</h3>
                  <p className="text-sm text-emerald-600 mt-1">{bundle.bundleDescription}</p>
                </div>

                {/* Prețuri */}
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="bg-gray-50 rounded p-3">
                    <p className="text-xs text-gray-500">Preț individual</p>
                    <p className="text-lg font-semibold text-gray-400 line-through">{bundle.originalPrice?.toFixed(0)} RON</p>
                  </div>
                  <div className="bg-emerald-100 rounded p-3">
                    <p className="text-xs text-emerald-600">Preț bundle</p>
                    <p className="text-2xl font-bold text-emerald-700">{bundle.bundlePrice?.toFixed(0)} RON</p>
                  </div>
                  <div className="bg-green-100 rounded p-3">
                    <p className="text-xs text-green-600">Economisești</p>
                    <p className="text-lg font-bold text-green-700">{bundle.savings?.toFixed(0)} RON ({bundle.suggestedDiscount}%)</p>
                  </div>
                </div>

                {/* Produse incluse */}
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Produse incluse:</p>
                  <div className="flex flex-wrap gap-2">
                    {bundle.products?.map((p, i) => (
                      <span key={i} className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-sm">
                        {p.name} - {p.price?.toFixed(0)} RON
                      </span>
                    ))}
                  </div>
                </div>

                {/* Target & Use Cases */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 rounded p-3">
                    <p className="text-xs font-medium text-blue-600 mb-1">🎯 Public țintă:</p>
                    <p className="text-sm text-blue-800">{bundle.targetAudience}</p>
                  </div>
                  <div className="bg-purple-50 rounded p-3">
                    <p className="text-xs font-medium text-purple-600 mb-1">📈 Cerere estimată:</p>
                    <p className="text-sm text-purple-800 capitalize">{bundle.estimatedDemand}</p>
                  </div>
                </div>

                {/* Use cases */}
                {bundle.useCases && bundle.useCases.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Cazuri de utilizare:</p>
                    <ul className="space-y-1">
                      {bundle.useCases.map((uc, i) => (
                        <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                          <span className="text-emerald-500">✓</span> {uc}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Technical synergy */}
                {bundle.technicalSynergy && (
                  <div className="bg-gray-50 rounded p-3">
                    <p className="text-sm font-medium text-gray-700 mb-1">🔧 Sinergie tehnică:</p>
                    <p className="text-sm text-gray-600">{bundle.technicalSynergy}</p>
                  </div>
                )}

                {/* Marketing copy */}
                {bundle.marketingCopy && (
                  <div className="bg-yellow-50 rounded p-3">
                    <p className="text-sm font-medium text-yellow-700 mb-1">📢 Text promoțional:</p>
                    <p className="text-sm text-yellow-800 italic">"{bundle.marketingCopy}"</p>
                  </div>
                )}

                {/* Additional products */}
                {bundle.additionalProducts && bundle.additionalProducts.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">➕ Produse suplimentare sugerate:</p>
                    <div className="flex flex-wrap gap-2">
                      {bundle.additionalProducts.map((p, i) => (
                        <span key={i} className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs">
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-20">
                <p className="text-gray-500">Selectează produse sau o pereche frecventă</p>
                <p className="text-xs text-gray-400 mt-2">AI-ul va genera un bundle atractiv cu discount optim</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
