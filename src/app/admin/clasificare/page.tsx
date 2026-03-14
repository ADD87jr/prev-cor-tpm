"use client";

import { useState, useEffect } from "react";

interface TypeCategory {
  type: string;
  count: number;
}

interface DomainCategory {
  domain: string;
  count: number;
}

interface ClassifyResult {
  type: string;
  domain: string;
  keywords: string[];
  suggestedDescription?: string;
  confidence: number;
}

export default function AIClassifyPage() {
  const [categories, setCategories] = useState<{ types: TypeCategory[]; domains: DomainCategory[] }>({ types: [], domains: [] });
  const [loading, setLoading] = useState(true);
  const [classifying, setClassifying] = useState(false);
  
  // Form inputs
  const [productName, setProductName] = useState("");
  const [description, setDescription] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [sku, setSku] = useState("");
  
  // Result
  const [result, setResult] = useState<ClassifyResult | null>(null);

  useEffect(() => { loadCategories(); }, []);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const res = await fetch("/admin/api/ai-classify");
      const data = await res.json();
      setCategories({ types: data.types || [], domains: data.domains || [] });
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const classifyProduct = async () => {
    if (!productName.trim()) {
      alert("Numele produsului este obligatoriu");
      return;
    }

    setClassifying(true);
    setResult(null);

    try {
      const res = await fetch("/admin/api/ai-classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName,
          description,
          manufacturer,
          sku
        })
      });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
      } else {
        setResult(data);
      }
    } catch (e) {
      console.error(e);
    }
    setClassifying(false);
  };

  const clearForm = () => {
    setProductName("");
    setDescription("");
    setManufacturer("");
    setSku("");
    setResult(null);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">🏷️ AI Clasificare Automată</h1>
      <p className="text-gray-600 mb-6">
        Clasifică automat produsele noi în categorii existente folosind AI.
      </p>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Formular clasificare */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow p-5">
              <h2 className="text-lg font-semibold text-gray-700 mb-4">Clasificare Produs Nou</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nume Produs <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder="Ex: Siemens S7-1200 CPU 1214C DC/DC/DC"
                    className="w-full border rounded px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descriere</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Descriere opțională pentru o clasificare mai precisă..."
                    className="w-full border rounded px-3 py-2 h-24 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Producător</label>
                    <input
                      type="text"
                      value={manufacturer}
                      onChange={(e) => setManufacturer(e.target.value)}
                      placeholder="Ex: Siemens"
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">SKU/Cod</label>
                    <input
                      type="text"
                      value={sku}
                      onChange={(e) => setSku(e.target.value)}
                      placeholder="Ex: 6ES7214-1AG40-0XB0"
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={classifyProduct}
                    disabled={classifying || !productName.trim()}
                    className="flex-1 bg-blue-600 text-white py-2 rounded font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    {classifying ? "Se clasifică..." : "🤖 Clasifică cu AI"}
                  </button>
                  <button
                    onClick={clearForm}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  >
                    Șterge
                  </button>
                </div>
              </div>

              {/* Rezultat */}
              {result && (
                <div className="mt-6 border-t pt-6">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-semibold text-gray-700">Rezultat Clasificare</h3>
                    <span className={`px-3 py-1 rounded text-sm font-bold ${
                      result.confidence >= 90 ? "bg-green-100 text-green-700" :
                      result.confidence >= 70 ? "bg-yellow-100 text-yellow-700" :
                      "bg-red-100 text-red-700"
                    }`}>
                      {result.confidence}% încredere
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-blue-50 rounded p-3">
                      <p className="text-sm text-gray-600">Tip (categorie)</p>
                      <p className="text-xl font-bold text-blue-700">{result.type}</p>
                    </div>
                    <div className="bg-purple-50 rounded p-3">
                      <p className="text-sm text-gray-600">Domeniu</p>
                      <p className="text-xl font-bold text-purple-700">{result.domain}</p>
                    </div>
                  </div>

                  {result.keywords && result.keywords.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm text-gray-600 mb-2">Cuvinte cheie sugerate:</p>
                      <div className="flex flex-wrap gap-2">
                        {result.keywords.map((kw, i) => (
                          <span key={i} className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-sm">
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {result.suggestedDescription && (
                    <div>
                      <p className="text-sm text-gray-600 mb-2">Descriere sugerată:</p>
                      <p className="text-gray-700 bg-gray-50 rounded p-3 text-sm">
                        {result.suggestedDescription}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Categorii existente */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-5">
              <h2 className="text-lg font-semibold text-gray-700 mb-4">Tipuri Existente</h2>
              <div className="space-y-2 max-h-[250px] overflow-y-auto">
                {categories.types.map((cat, i) => (
                  <div key={i} className="flex justify-between items-center py-1 border-b last:border-0">
                    <span className="text-gray-700">{cat.type || "Fără tip"}</span>
                    <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-sm">{cat.count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-5">
              <h2 className="text-lg font-semibold text-gray-700 mb-4">Domenii Existente</h2>
              <div className="space-y-2 max-h-[250px] overflow-y-auto">
                {categories.domains.map((cat, i) => (
                  <div key={i} className="flex justify-between items-center py-1 border-b last:border-0">
                    <span className="text-gray-700">{cat.domain || "Fără domeniu"}</span>
                    <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-sm">{cat.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
