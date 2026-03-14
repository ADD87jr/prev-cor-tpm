"use client";
import { useState, useEffect } from "react";

export default function BundleBuilderPage() {
  const [stats, setStats] = useState<any>(null);
  const [suggestedBundles, setSuggestedBundles] = useState<any[]>([]);
  const [categoryRecommendations, setCategoryRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBundle, setSelectedBundle] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [bundleType, setBundleType] = useState("STANDARD");
  const [generating, setGenerating] = useState(false);
  const [generatedBundle, setGeneratedBundle] = useState<any>(null);

  useEffect(() => {
    fetchData();
    fetchProducts();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const res = await fetch("/admin/api/ai-bundle-builder");
      const data = await res.json();
      setStats(data.stats);
      setSuggestedBundles(data.suggestedBundles || []);
      setCategoryRecommendations(data.categoryRecommendations || []);
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  }

  async function fetchProducts() {
    try {
      const res = await fetch("/admin/api/products?limit=100");
      const data = await res.json();
      setProducts(data.products || data || []);
    } catch (error) {
      console.error(error);
    }
  }

  async function generateBundle() {
    if (!selectedProductId) return;
    setGenerating(true);
    setGeneratedBundle(null);
    try {
      const res = await fetch("/admin/api/ai-bundle-builder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          productId: selectedProductId, 
          bundleType,
          maxProducts: 5 
        })
      });
      const data = await res.json();
      setGeneratedBundle(data);
    } catch (error) {
      console.error(error);
    }
    setGenerating(false);
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">🎁 AI Bundle Builder</h1>
      <p className="text-gray-600 mb-6">Generator pachete produse complementare</p>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
        </div>
      ) : (
        <>
          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <p className="text-sm text-green-600">Pachete Sugerate</p>
                <p className="text-2xl font-bold text-green-700">{stats.totalBundles}</p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow border">
                <p className="text-sm text-gray-600">Comenzi Analizate</p>
                <p className="text-2xl font-bold">{stats.ordersAnalyzed}</p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-600">Venituri Potențiale</p>
                <p className="text-2xl font-bold text-blue-700">{stats.potentialRevenue?.toLocaleString()} RON</p>
              </div>
            </div>
          )}

          {/* Category Recommendations */}
          <div className="bg-yellow-50 p-4 rounded-lg mb-6 border border-yellow-200">
            <h3 className="font-semibold text-yellow-800 mb-2">💡 Tipuri de Pachete Recomandate</h3>
            <div className="grid grid-cols-4 gap-3">
              {categoryRecommendations.map((cat, i) => (
                <div key={i} className={`p-3 rounded-lg ${
                  cat.type === "ESSENTIAL" ? "bg-green-100" : "bg-purple-100"
                }`}>
                  <p className="font-medium text-sm">{cat.category}</p>
                  <p className="text-xs opacity-75">{cat.description}</p>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    cat.type === "ESSENTIAL" ? "bg-green-500 text-white" : "bg-purple-500 text-white"
                  }`}>{cat.type}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* Suggested Bundles */}
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="font-semibold mb-4">📊 Pachete Bazate pe Vânzări</h2>
              
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {suggestedBundles.map((bundle) => (
                  <div 
                    key={bundle.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-all hover:bg-gray-50 ${
                      selectedBundle?.id === bundle.id ? "ring-2 ring-green-500 bg-green-50" : ""
                    }`}
                    onClick={() => setSelectedBundle(bundle)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                        Cumpărate împreună {bundle.frequency}x
                      </span>
                      <span className="text-green-600 font-semibold text-sm">
                        -{bundle.savingsPercent}%
                      </span>
                    </div>
                    <div className="space-y-1">
                      {bundle.products.map((p: any, i: number) => (
                        <p key={i} className="text-sm">
                          • {p.name} <span className="text-gray-500">({p.price?.toLocaleString()} RON)</span>
                        </p>
                      ))}
                    </div>
                    <div className="flex justify-between items-center mt-2 pt-2 border-t">
                      <span className="text-gray-500 line-through text-sm">{bundle.originalPrice?.toLocaleString()} RON</span>
                      <span className="text-lg font-bold text-green-600">{bundle.bundlePrice?.toLocaleString()} RON</span>
                    </div>
                  </div>
                ))}
                {suggestedBundles.length === 0 && (
                  <p className="text-center text-gray-500 py-8">
                    Nicio sugestie disponibilă - nu sunt suficiente date de vânzări
                  </p>
                )}
              </div>
            </div>

            {/* Custom Bundle Generator */}
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="font-semibold mb-4">🤖 Generator Pachete AI</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Produs Principal</label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="w-full p-2 border rounded-lg"
                  >
                    <option value="">-- Selectează produs --</option>
                    {products.map((p: any) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.price?.toLocaleString()} RON)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Tip Pachet</label>
                  <div className="flex gap-2">
                    {["STANDARD", "ESSENTIAL", "PREMIUM", "STARTER_KIT"].map(type => (
                      <button
                        key={type}
                        onClick={() => setBundleType(type)}
                        className={`px-3 py-2 rounded-lg text-sm ${
                          bundleType === type 
                            ? "bg-green-600 text-white" 
                            : "bg-gray-100 hover:bg-gray-200"
                        }`}
                      >
                        {type.replace("_", " ")}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={generateBundle}
                  disabled={generating || !selectedProductId}
                  className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {generating ? "Generez..." : "🎁 Generează Pachet AI"}
                </button>

                {/* Generated Bundle */}
                {generatedBundle?.bundle && (
                  <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                    <h3 className="font-bold text-lg text-green-800">
                      {generatedBundle.bundle.bundleName}
                    </h3>
                    <p className="text-sm text-green-600 mb-3">
                      {generatedBundle.bundle.bundleDescription}
                    </p>

                    {/* Products in bundle */}
                    <div className="space-y-2 mb-3">
                      {generatedBundle.bundle.products?.map((p: any, i: number) => (
                        <div key={i} className="flex justify-between items-center p-2 bg-white rounded">
                          <div>
                            <p className="font-medium text-sm">{p.productName}</p>
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              p.role === "principal" ? "bg-blue-100 text-blue-700" : "bg-gray-100"
                            }`}>{p.role}</span>
                          </div>
                          <p className="text-sm">{p.details?.price?.toLocaleString()} RON</p>
                        </div>
                      ))}
                    </div>

                    {/* Pricing */}
                    <div className="bg-white p-3 rounded-lg">
                      <div className="flex justify-between text-sm">
                        <span>Preț total normal</span>
                        <span className="line-through text-gray-500">
                          {generatedBundle.bundle.pricing?.actualOriginalTotal?.toLocaleString()} RON
                        </span>
                      </div>
                      <div className="flex justify-between text-lg font-bold text-green-600">
                        <span>Preț pachet</span>
                        <span>{generatedBundle.bundle.pricing?.actualBundlePrice?.toLocaleString()} RON</span>
                      </div>
                      <p className="text-center text-green-700 text-sm mt-1">
                        Economisești {generatedBundle.bundle.pricing?.actualSavings?.toLocaleString()} RON
                      </p>
                    </div>

                    {/* Target Audience */}
                    {generatedBundle.bundle.targetAudience && (
                      <div className="mt-3 text-sm">
                        <p className="font-medium">👥 Pentru cine:</p>
                        <p className="text-gray-600">{generatedBundle.bundle.targetAudience}</p>
                      </div>
                    )}

                    {/* Use Cases */}
                    {generatedBundle.bundle.useCases?.length > 0 && (
                      <div className="mt-2 text-sm">
                        <p className="font-medium">🎯 Cazuri de utilizare:</p>
                        <ul className="text-gray-600">
                          {generatedBundle.bundle.useCases.slice(0, 3).map((uc: string, i: number) => (
                            <li key={i}>• {uc}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
