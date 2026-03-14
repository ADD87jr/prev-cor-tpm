"use client";

import { useState, useEffect } from "react";

interface Product {
  id: number;
  name: string;
  type?: string;
  manufacturer?: string;
  sku?: string;
}

export default function AIGeneratePDFPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<number | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null);
  const [aiEnhanced, setAiEnhanced] = useState(true);
  const [generatedPdf, setGeneratedPdf] = useState<{ base64: string; filename: string } | null>(null);

  useEffect(() => { loadProducts(); }, []);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/admin/api/ai-generate-pdf");
      const data = await res.json();
      setProducts(data.products || []);
      setStats({
        withoutPdf: data.productsWithoutPdf,
        withPdf: data.productsWithPdf,
        total: data.totalProducts,
        coverage: data.coverage
      });
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const generatePdf = async (productId: number) => {
    setGenerating(productId);
    setSelectedProduct(productId);
    setGeneratedPdf(null);

    try {
      const res = await fetch("/admin/api/ai-generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, includeAiEnhanced: aiEnhanced })
      });
      const data = await res.json();
      if (data.pdf) {
        setGeneratedPdf(data.pdf);
      }
    } catch (e) {
      console.error(e);
    }
    setGenerating(null);
  };

  const downloadPdf = () => {
    if (!generatedPdf) return;

    const link = document.createElement("a");
    link.href = `data:application/pdf;base64,${generatedPdf.base64}`;
    link.download = generatedPdf.filename;
    link.click();
  };

  const openPdf = () => {
    if (!generatedPdf) return;

    const blob = base64ToBlob(generatedPdf.base64, "application/pdf");
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  };

  const base64ToBlob = (base64: string, type: string) => {
    const binary = atob(base64);
    const array = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      array[i] = binary.charCodeAt(i);
    }
    return new Blob([array], { type });
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">📄 AI Generare Fișe Tehnice PDF</h1>
      <p className="text-gray-600 mb-6">
        Generează fișe tehnice PDF profesionale pentru produse, cu îmbunătățiri AI.
      </p>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-lg shadow p-4 text-center">
                <p className="text-3xl font-bold">{stats.total}</p>
                <p className="text-sm text-gray-500">Total produse</p>
              </div>
              <div className="bg-green-50 rounded-lg shadow p-4 text-center">
                <p className="text-3xl font-bold text-green-600">{stats.withPdf}</p>
                <p className="text-sm text-green-500">Cu fișă PDF</p>
              </div>
              <div className="bg-yellow-50 rounded-lg shadow p-4 text-center">
                <p className="text-3xl font-bold text-yellow-600">{stats.withoutPdf}</p>
                <p className="text-sm text-yellow-500">Fără fișă PDF</p>
              </div>
              <div className="bg-blue-50 rounded-lg shadow p-4 text-center">
                <p className="text-3xl font-bold text-blue-600">{stats.coverage}</p>
                <p className="text-sm text-blue-500">Acoperire</p>
              </div>
            </div>
          )}

          {/* Opțiuni generare */}
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={aiEnhanced}
                onChange={(e) => setAiEnhanced(e.target.checked)}
                className="w-5 h-5 rounded"
              />
              <div>
                <span className="font-medium">Îmbunătățire AI</span>
                <p className="text-sm text-gray-500">
                  AI-ul va completa descrierile și specificațiile lipsă bazat pe tipul produsului
                </p>
              </div>
            </label>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Lista produse */}
            <div className="bg-white rounded-lg shadow p-5">
              <h2 className="text-lg font-semibold text-gray-700 mb-4">
                Produse Fără Fișă Tehnică ({products.length})
              </h2>
              
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {products.map((product) => (
                  <div 
                    key={product.id} 
                    className={`border rounded p-3 cursor-pointer hover:bg-gray-50 ${
                      selectedProduct === product.id ? "border-blue-500 bg-blue-50" : ""
                    }`}
                    onClick={() => generatePdf(product.id)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-medium text-gray-800 truncate">{product.name}</p>
                        <p className="text-sm text-gray-500">
                          {product.manufacturer} • {product.type} • SKU: {product.sku || "N/A"}
                        </p>
                      </div>
                      {generating === product.id && (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                      )}
                    </div>
                  </div>
                ))}

                {products.length === 0 && (
                  <p className="text-green-600 text-center py-8">
                    ✅ Toate produsele au fișe tehnice!
                  </p>
                )}
              </div>
            </div>

            {/* Preview & Download */}
            <div className="bg-white rounded-lg shadow p-5">
              <h2 className="text-lg font-semibold text-gray-700 mb-4">
                PDF Generat
              </h2>

              {generating !== null ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
                  <p className="text-gray-600">
                    {aiEnhanced ? "Generare cu îmbunătățiri AI..." : "Generare PDF..."}
                  </p>
                </div>
              ) : generatedPdf ? (
                <div className="text-center py-10">
                  <div className="text-6xl mb-4">📄</div>
                  <p className="font-medium text-gray-800 mb-2">{generatedPdf.filename}</p>
                  
                  <div className="flex gap-4 justify-center mt-6">
                    <button
                      onClick={downloadPdf}
                      className="bg-blue-600 text-white px-6 py-2 rounded font-medium hover:bg-blue-700"
                    >
                      ⬇️ Descarcă
                    </button>
                    <button
                      onClick={openPdf}
                      className="bg-gray-100 text-gray-700 px-6 py-2 rounded font-medium hover:bg-gray-200"
                    >
                      👁️ Deschide
                    </button>
                  </div>

                  <p className="text-sm text-gray-500 mt-4">
                    Fișă generată {aiEnhanced ? "cu îmbunătățiri AI" : "din date existente"}
                  </p>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-20">
                  Selectează un produs pentru a genera fișa tehnică PDF.
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
