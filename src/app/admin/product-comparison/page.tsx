"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Product {
  id: number;
  name: string;
  sku: string;
  type: string;
  manufacturer: string;
  price: number;
}

export default function ProductComparisonPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const [comparison, setComparison] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [comparing, setComparing] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    setLoading(true);
    try {
      const res = await fetch("/admin/api/ai-product-comparison");
      const data = await res.json();
      setProducts(data.products || []);
      setCategories(data.categories || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  async function compareProducts() {
    if (selectedProducts.length < 2) {
      alert("Selectează cel puțin 2 produse!");
      return;
    }
    setComparing(true);
    try {
      const res = await fetch("/admin/api/ai-product-comparison", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productIds: selectedProducts,
          comparisonType: "GENERAL"
        })
      });
      const data = await res.json();
      setComparison(data);
    } catch (e) {
      console.error(e);
    }
    setComparing(false);
  }

  function toggleProduct(id: number) {
    if (selectedProducts.includes(id)) {
      setSelectedProducts(selectedProducts.filter(p => p !== id));
    } else if (selectedProducts.length < 5) {
      setSelectedProducts([...selectedProducts, id]);
    }
  }

  const filteredProducts = products.filter(p => {
    const matchesCategory = !filterCategory || p.type === filterCategory;
    const matchesSearch = !searchTerm || 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/admin/ai-hub" className="text-blue-600 hover:underline text-sm">
            ← Înapoi la AI Hub
          </Link>
          <h1 className="text-2xl font-bold mt-2">⚖️ Comparație Produse AI</h1>
          <p className="text-gray-600">Compară produse și primește recomandări inteligente</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Product Selection */}
        <div className="lg:col-span-1 bg-white border rounded-lg p-4">
          <h2 className="font-semibold mb-4">Selectează Produse (max 5)</h2>
          
          {/* Filters */}
          <div className="space-y-2 mb-4">
            <input
              type="text"
              placeholder="Caută produs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border rounded"
            />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full px-3 py-2 border rounded"
            >
              <option value="">Toate categoriile</option>
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Selected */}
          <div className="mb-4">
            <div className="text-sm text-gray-600 mb-2">
              Selectate: {selectedProducts.length}/5
            </div>
            {selectedProducts.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {selectedProducts.map(id => {
                  const prod = products.find(p => p.id === id);
                  return (
                    <span
                      key={id}
                      className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded flex items-center gap-1"
                    >
                      {prod?.name?.substring(0, 20)}...
                      <button onClick={() => toggleProduct(id)} className="text-red-500">×</button>
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {/* Product List */}
          {loading ? (
            <div className="text-center py-4">Se încarcă...</div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredProducts.map(product => (
                <div
                  key={product.id}
                  onClick={() => toggleProduct(product.id)}
                  className={`p-2 border rounded cursor-pointer hover:bg-gray-50 ${
                    selectedProducts.includes(product.id) ? "border-blue-500 bg-blue-50" : ""
                  }`}
                >
                  <div className="font-medium text-sm">{product.name}</div>
                  <div className="text-xs text-gray-500">
                    {product.manufacturer} | {product.price?.toLocaleString()} RON
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={compareProducts}
            disabled={selectedProducts.length < 2 || comparing}
            className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {comparing ? "Se compară..." : "🔍 Compară Produse"}
          </button>
        </div>

        {/* Comparison Results */}
        <div className="lg:col-span-2">
          {!comparison ? (
            <div className="bg-gray-100 rounded-lg p-10 text-center text-gray-500">
              <div className="text-6xl mb-4">⚖️</div>
              <p>Selectează 2-5 produse și apasă "Compară" pentru a vedea analiza AI</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-800 mb-2">📊 Rezumat Comparație</h3>
                <p>{comparison.comparison?.summary}</p>
              </div>

              {/* Products being compared */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                {comparison.products?.map((p: any, i: number) => (
                  <div key={p.id} className="bg-white border rounded p-2 text-center">
                    <div className="text-xs text-gray-500">Produs {i + 1}</div>
                    <div className="font-medium text-sm">{p.name}</div>
                    <div className="text-sm text-green-600">{p.price?.toLocaleString()} RON</div>
                    <div className={`text-xs ${p.inStock ? "text-green-500" : "text-red-500"}`}>
                      {p.inStock ? "În stoc" : "Stoc epuizat"}
                    </div>
                  </div>
                ))}
              </div>

              {/* Comparison Table */}
              {comparison.comparison?.comparisonTable && (
                <div className="bg-white border rounded-lg p-4">
                  <h3 className="font-semibold mb-3">📋 Tabel Comparativ</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="p-2 text-left">Criteriu</th>
                          {comparison.products?.map((p: any, i: number) => (
                            <th key={i} className="p-2 text-center">{p.name?.substring(0, 15)}...</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {comparison.comparison.comparisonTable.criteria?.map((criterion: any, i: number) => (
                          <tr key={i} className="border-t">
                            <td className="p-2 font-medium">{criterion.name}</td>
                            {criterion.values?.map((val: string, j: number) => (
                              <td key={j} className={`p-2 text-center ${
                                criterion.winner === j ? "bg-green-100 font-semibold" : ""
                              }`}>
                                {val}
                                {criterion.winner === j && " ✓"}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {comparison.comparison?.recommendations && (
                <div className="bg-white border rounded-lg p-4">
                  <h3 className="font-semibold mb-3">🏆 Recomandări</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {Object.entries(comparison.comparison.recommendations).map(([key, rec]: [string, any]) => (
                      <div key={key} className="bg-gray-50 p-3 rounded">
                        <div className="text-sm font-semibold text-gray-700">
                          {key === "bestOverall" && "🥇 Cel Mai Bun Overall"}
                          {key === "bestValue" && "💰 Cel Mai Bun Raport Calitate-Preț"}
                          {key === "bestForBeginners" && "🌱 Pentru Începători"}
                          {key === "bestForProfessionals" && "⚡ Pentru Profesioniști"}
                        </div>
                        <div className="text-sm mt-1">
                          <strong>{comparison.products?.[rec.productIndex]?.name}</strong>
                        </div>
                        <div className="text-xs text-gray-600 mt-1">{rec.reason}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pros/Cons */}
              {comparison.comparison?.prosAndCons && (
                <div className="bg-white border rounded-lg p-4">
                  <h3 className="font-semibold mb-3">✅ Avantaje & Dezavantaje</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {comparison.comparison.prosAndCons.map((pc: any, i: number) => (
                      <div key={i} className="border rounded p-3">
                        <div className="font-medium mb-2">
                          {comparison.products?.[pc.productIndex]?.name}
                        </div>
                        <div className="space-y-1">
                          {pc.pros?.map((pro: string, j: number) => (
                            <div key={`pro-${j}`} className="text-xs text-green-700">✓ {pro}</div>
                          ))}
                          {pc.cons?.map((con: string, j: number) => (
                            <div key={`con-${j}`} className="text-xs text-red-700">✗ {con}</div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Technical Notes */}
              {comparison.comparison?.technicalNotes && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h3 className="font-semibold text-yellow-800 mb-2">📝 Note Tehnice</h3>
                  <p className="text-sm">{comparison.comparison.technicalNotes}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
