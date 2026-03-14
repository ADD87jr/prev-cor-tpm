"use client";

import { useState, useEffect } from "react";

interface Product {
  id: number;
  name: string;
  type?: string;
  manufacturer?: string;
  image?: string;
}

interface ImagePrompt {
  imagePrompt: string;
  alternativePrompts?: string[];
  suggestedKeywords?: string[];
  stockPhotoSearch?: string;
  stockImageSources?: string[];
}

export default function AIGenerateImagesPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<number | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [generatedPrompt, setGeneratedPrompt] = useState<ImagePrompt | null>(null);
  const [filter, setFilter] = useState<'all' | 'with' | 'without'>('without');

  useEffect(() => { loadProducts(filter); }, [filter]);

  const loadProducts = async (filterType: string = 'without') => {
    setLoading(true);
    try {
      const res = await fetch(`/admin/api/ai-generate-images?filter=${filterType}`);
      const data = await res.json();
      setProducts(data.products || []);
      setStats({
        withoutImage: data.productsWithoutImage,
        withImage: data.productsWithImage,
        total: data.totalProducts,
        coverage: data.coverage
      });
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const generatePrompt = async (product: Product) => {
    setGenerating(product.id);
    setSelectedProduct(product);
    setGeneratedPrompt(null);

    try {
      const res = await fetch("/admin/api/ai-generate-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id })
      });
      const data = await res.json();
      setGeneratedPrompt(data);
    } catch (e) {
      console.error(e);
    }
    setGenerating(null);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Copiat în clipboard!");
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">🖼️ AI Generare Imagini Produse</h1>
      <p className="text-gray-600 mb-6">
        Generează prompturi pentru crearea imaginilor de produs cu AI (DALL-E, Midjourney, etc).
      </p>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          {/* Stats - Clickable Filters */}
          {stats && (
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div 
                onClick={() => setFilter('all')}
                className={`rounded-lg shadow p-4 text-center cursor-pointer transition-all hover:scale-105 ${
                  filter === 'all' ? 'ring-2 ring-blue-500 bg-blue-50' : 'bg-white hover:bg-gray-50'
                }`}
              >
                <p className="text-3xl font-bold">{stats.total}</p>
                <p className="text-sm text-gray-500">Total produse</p>
              </div>
              <div 
                onClick={() => setFilter('with')}
                className={`rounded-lg shadow p-4 text-center cursor-pointer transition-all hover:scale-105 ${
                  filter === 'with' ? 'ring-2 ring-green-500 bg-green-100' : 'bg-green-50 hover:bg-green-100'
                }`}
              >
                <p className="text-3xl font-bold text-green-600">{stats.withImage}</p>
                <p className="text-sm text-green-500">Cu imagine</p>
              </div>
              <div 
                onClick={() => setFilter('without')}
                className={`rounded-lg shadow p-4 text-center cursor-pointer transition-all hover:scale-105 ${
                  filter === 'without' ? 'ring-2 ring-yellow-500 bg-yellow-100' : 'bg-yellow-50 hover:bg-yellow-100'
                }`}
              >
                <p className="text-3xl font-bold text-yellow-600">{stats.withoutImage}</p>
                <p className="text-sm text-yellow-500">Fără imagine</p>
              </div>
              <div className="bg-blue-50 rounded-lg shadow p-4 text-center">
                <p className="text-3xl font-bold text-blue-600">{stats.coverage}</p>
                <p className="text-sm text-blue-500">Acoperire</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Lista produse */}
            <div className="bg-white rounded-lg shadow p-5">
              <h2 className="text-lg font-semibold text-gray-700 mb-4">
                {filter === 'all' ? 'Toate Produsele' : filter === 'with' ? 'Produse Cu Imagine' : 'Produse Fără Imagine'} ({products.length})
              </h2>
              
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {products.map((product) => (
                  <div 
                    key={product.id} 
                    className={`border rounded p-3 cursor-pointer hover:bg-gray-50 ${
                      selectedProduct?.id === product.id ? "border-blue-500 bg-blue-50" : ""
                    }`}
                    onClick={() => generatePrompt(product)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-medium text-gray-800 truncate">{product.name}</p>
                        <p className="text-sm text-gray-500">
                          {product.manufacturer} • {product.type}
                        </p>
                      </div>
                      {generating === product.id && (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                      )}
                    </div>
                  </div>
                ))}

                {products.length === 0 && filter === 'without' && (
                  <p className="text-green-600 text-center py-8">
                    ✅ Toate produsele au imagini!
                  </p>
                )}
                {products.length === 0 && filter !== 'without' && (
                  <p className="text-gray-500 text-center py-8">
                    Nu există produse în această categorie.
                  </p>
                )}
              </div>
            </div>

            {/* Prompt generat */}
            <div className="bg-white rounded-lg shadow p-5">
              <h2 className="text-lg font-semibold text-gray-700 mb-4">
                Prompt Imagine AI
              </h2>

              {generating !== null ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600 mb-4"></div>
                  <p className="text-gray-600">Generez prompt...</p>
                </div>
              ) : generatedPrompt ? (
                <div className="space-y-4">
                  {/* Produs selectat */}
                  <div className="bg-blue-50 rounded p-3">
                    <p className="font-medium text-blue-800">{selectedProduct?.name}</p>
                  </div>

                  {/* Prompt principal */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm font-medium text-gray-600">Prompt principal</label>
                      <button
                        onClick={() => copyToClipboard(generatedPrompt.imagePrompt)}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        📋 Copiază
                      </button>
                    </div>
                    <div className="bg-gray-50 rounded p-3 text-sm font-mono">
                      {generatedPrompt.imagePrompt}
                    </div>
                  </div>

                  {/* Alternative */}
                  {generatedPrompt.alternativePrompts && generatedPrompt.alternativePrompts.length > 0 && (
                    <div>
                      <label className="text-sm font-medium text-gray-600 block mb-2">Prompturi alternative</label>
                      {generatedPrompt.alternativePrompts.map((alt, i) => (
                        <div key={i} className="bg-gray-50 rounded p-2 text-xs mb-1 flex justify-between">
                          <span className="truncate flex-1">{alt}</span>
                          <button
                            onClick={() => copyToClipboard(alt)}
                            className="text-blue-600 ml-2"
                          >
                            📋
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Keywords */}
                  {generatedPrompt.suggestedKeywords && (
                    <div>
                      <label className="text-sm font-medium text-gray-600 block mb-2">Keywords</label>
                      <div className="flex flex-wrap gap-2">
                        {generatedPrompt.suggestedKeywords.map((kw, i) => (
                          <span key={i} className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Stock photo search */}
                  {generatedPrompt.stockPhotoSearch && (
                    <div>
                      <label className="text-sm font-medium text-gray-600 block mb-2">Căutare imagini stock</label>
                      <p className="text-sm bg-gray-50 rounded p-2">{generatedPrompt.stockPhotoSearch}</p>
                    </div>
                  )}

                  {/* Linkuri stock */}
                  {generatedPrompt.stockImageSources && (
                    <div>
                      <label className="text-sm font-medium text-gray-600 block mb-2">Surse imagini gratuite</label>
                      <div className="space-y-1">
                        {generatedPrompt.stockImageSources.map((url, i) => (
                          <a
                            key={i}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block text-sm text-blue-600 hover:underline truncate"
                          >
                            🔗 {new URL(url).hostname}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-20">
                  Selectează un produs pentru a genera prompt-ul pentru imagine.
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
