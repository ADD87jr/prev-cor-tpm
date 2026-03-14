"use client";

import { useState, useEffect } from "react";

interface OutOfStockProduct {
  id: number;
  name: string;
  sku?: string;
  type?: string;
  manufacturer?: string;
  price: number;
}

interface Alternative {
  productId: number;
  productName: string;
  price?: number;
  type?: string;
  matchScore: number;
  reason: string;
  priceDiff?: string;
}

export default function AIAlternativesPage() {
  const [products, setProducts] = useState<OutOfStockProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState<number | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<OutOfStockProduct | null>(null);
  const [alternatives, setAlternatives] = useState<Alternative[]>([]);

  useEffect(() => { loadProducts(); }, []);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/admin/api/ai-alternatives");
      const data = await res.json();
      setProducts(data.outOfStockProducts || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const findAlternatives = async (product: OutOfStockProduct) => {
    setSearching(product.id);
    setSelectedProduct(product);
    setAlternatives([]);

    try {
      const res = await fetch("/admin/api/ai-alternatives", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id })
      });
      const data = await res.json();
      setAlternatives(data.alternatives || []);
    } catch (e) {
      console.error(e);
    }
    setSearching(null);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">🔄 AI Produse Alternative</h1>
      <p className="text-gray-600 mb-6">
        Găsește alternative pentru produsele fără stoc bazat pe specificații similare.
      </p>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Produse fără stoc */}
          <div className="bg-white rounded-lg shadow p-5">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">
              Produse Fără Stoc ({products.length})
            </h2>
            
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {products.map((product) => (
                <div 
                  key={product.id} 
                  className={`border rounded p-3 cursor-pointer hover:bg-gray-50 ${
                    selectedProduct?.id === product.id ? "border-blue-500 bg-blue-50" : ""
                  }`}
                  onClick={() => findAlternatives(product)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-medium text-gray-800 truncate">{product.name}</p>
                      <p className="text-sm text-gray-500">
                        {product.manufacturer} • {product.type} • {product.price} RON
                      </p>
                      {product.sku && (
                        <p className="text-xs text-gray-400">SKU: {product.sku}</p>
                      )}
                    </div>
                    {searching === product.id ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                    ) : (
                      <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs">
                        Stoc 0
                      </span>
                    )}
                  </div>
                </div>
              ))}

              {products.length === 0 && (
                <p className="text-green-600 text-center py-8">
                  ✅ Toate produsele sunt în stoc!
                </p>
              )}
            </div>
          </div>

          {/* Alternative găsite */}
          <div className="bg-white rounded-lg shadow p-5">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">
              Alternative Sugerate
            </h2>

            {searching !== null ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600 mb-4"></div>
                <p className="text-gray-600">Caut alternative cu AI...</p>
              </div>
            ) : selectedProduct ? (
              <div>
                {/* Produs selectat */}
                <div className="bg-red-50 rounded p-3 mb-4">
                  <p className="text-sm text-gray-600">Produs fără stoc:</p>
                  <p className="font-semibold text-red-700">{selectedProduct.name}</p>
                  <p className="text-sm text-red-600">{selectedProduct.price} RON</p>
                </div>

                {/* Lista alternative */}
                <div className="space-y-3">
                  {alternatives.map((alt, i) => (
                    <div key={i} className="border rounded p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <a 
                            href={`/admin/produse/${alt.productId}`}
                            className="font-medium text-blue-600 hover:underline"
                          >
                            {alt.productName}
                          </a>
                          {alt.price && (
                            <p className="text-sm text-gray-600">
                              {alt.price} RON
                              {alt.priceDiff && (
                                <span className={`ml-2 ${
                                  alt.priceDiff.startsWith("+") ? "text-red-500" : "text-green-500"
                                }`}>
                                  ({alt.priceDiff})
                                </span>
                              )}
                            </p>
                          )}
                        </div>
                        <span className={`px-2 py-1 rounded text-sm font-bold ${
                          alt.matchScore >= 90 ? "bg-green-100 text-green-700" :
                          alt.matchScore >= 70 ? "bg-yellow-100 text-yellow-700" :
                          "bg-gray-100 text-gray-700"
                        }`}>
                          {alt.matchScore}% match
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{alt.reason}</p>
                    </div>
                  ))}

                  {alternatives.length === 0 && (
                    <p className="text-gray-500 text-center py-8">
                      Nu s-au găsit alternative pentru acest produs.
                    </p>
                  )}
                </div>

                {alternatives.length > 0 && (
                  <div className="mt-4 p-3 bg-blue-50 rounded text-sm text-blue-700">
                    💡 Poți folosi aceste alternative pentru a sugera clienților produse similare 
                    când cel original nu e disponibil.
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-20">
                Selectează un produs fără stoc pentru a găsi alternative.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
