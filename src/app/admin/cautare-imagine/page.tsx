"use client";
import { useState, useEffect, useRef } from "react";

export default function ImageSearchPage() {
  const [info, setInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [searchMode, setSearchMode] = useState<"text" | "image">("text");
  const [description, setDescription] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [results, setResults] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchInfo();
  }, []);

  async function fetchInfo() {
    try {
      const res = await fetch("/admin/api/ai-image-search");
      const data = await res.json();
      setInfo(data);
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  async function search() {
    setSearching(true);
    setResults(null);
    try {
      const body: any = {};
      if (searchMode === "text") {
        body.description = description;
      } else {
        body.imageBase64 = imagePreview;
      }

      const res = await fetch("/admin/api/ai-image-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      setResults(data);
    } catch (error) {
      console.error(error);
    }
    setSearching(false);
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">🔍 AI Image Search</h1>
      <p className="text-gray-600 mb-6">Căutare produse prin descriere sau poză</p>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
        </div>
      ) : (
        <>
          {/* Info */}
          {info && (
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                <p className="text-sm text-purple-600">Produse în catalog</p>
                <p className="text-2xl font-bold text-purple-700">{info.totalProducts}</p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow border">
                <p className="text-sm text-gray-600">Categorii</p>
                <p className="text-2xl font-bold">{info.categories?.length || 0}</p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow border">
                <p className="text-sm text-gray-600">Producători</p>
                <p className="text-2xl font-bold">{info.manufacturers?.length || 0}</p>
              </div>
            </div>
          )}

          {/* Capabilities */}
          <div className="bg-blue-50 p-4 rounded-lg mb-6 border border-blue-200">
            <h3 className="font-semibold text-blue-800 mb-2">🤖 Capabilități AI</h3>
            <div className="flex flex-wrap gap-2">
              {info?.info?.capabilities?.map((cap: string, i: number) => (
                <span key={i} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                  {cap}
                </span>
              ))}
            </div>
          </div>

          {/* Search Mode Toggle */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setSearchMode("text")}
              className={`px-6 py-3 rounded-lg flex items-center gap-2 ${
                searchMode === "text" 
                  ? "bg-purple-600 text-white" 
                  : "bg-gray-100 hover:bg-gray-200"
              }`}
            >
              ✏️ Căutare Text
            </button>
            <button
              onClick={() => setSearchMode("image")}
              className={`px-6 py-3 rounded-lg flex items-center gap-2 ${
                searchMode === "image" 
                  ? "bg-purple-600 text-white" 
                  : "bg-gray-100 hover:bg-gray-200"
              }`}
            >
              📷 Căutare Imagine
            </button>
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* Search Input */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="font-semibold mb-4">
                {searchMode === "text" ? "✏️ Descrie produsul" : "📷 Încarcă imagine"}
              </h2>

              {searchMode === "text" ? (
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder='Ex: "PLC Siemens mic cu 8 intrări", "senzor inductiv M12", "cablu pentru HMI Omron"...'
                  className="w-full h-40 p-3 border rounded-lg resize-none"
                />
              ) : (
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-purple-400 transition-colors"
                  >
                    {imagePreview ? (
                      <img 
                        src={imagePreview} 
                        alt="Preview" 
                        className="max-h-40 mx-auto rounded-lg"
                      />
                    ) : (
                      <div className="text-gray-500">
                        <p className="text-4xl mb-2">📷</p>
                        <p>Click pentru a încărca imagine</p>
                        <p className="text-sm">sau drag & drop</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <button
                onClick={search}
                disabled={searching || (searchMode === "text" ? !description : !imagePreview)}
                className="w-full mt-4 bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {searching ? "Caut..." : "🔍 Caută cu AI"}
              </button>
            </div>

            {/* Results */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="font-semibold mb-4">📋 Rezultate</h2>

              {results?.result ? (
                <div className="space-y-4">
                  {/* Interpretation */}
                  {results.result.interpretation && (
                    <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                      <p className="text-sm text-purple-700">
                        <strong>Căutare:</strong> {results.result.interpretation.searchedFor}
                      </p>
                      {results.result.interpretation.componentType && (
                        <p className="text-sm text-purple-600">
                          Tip: {results.result.interpretation.componentType}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Identified (for image search) */}
                  {results.result.identified && (
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                      <h4 className="font-semibold text-blue-800 mb-2">🔎 Identificat</h4>
                      <p className="text-sm">{results.result.identified.componentType}</p>
                      <p className="text-sm">Producător: {results.result.identified.possibleManufacturer}</p>
                      <p className="text-xs mt-1">Confidence: {results.result.identified.confidence}</p>
                    </div>
                  )}

                  {/* Matches */}
                  {results.result.matches?.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">✅ Potriviri ({results.result.matches.length})</h4>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {results.result.matches.map((match: any, i: number) => (
                          <div key={i} className="p-3 bg-green-50 rounded-lg border border-green-200">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium text-sm">{match.productName || match.product?.name}</p>
                                <p className="text-xs text-gray-600">{match.sku || match.product?.sku}</p>
                              </div>
                              <span className="px-2 py-1 bg-green-500 text-white text-xs rounded-full">
                                {match.matchScore}%
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">{match.reasoning}</p>
                            {match.product?.price && (
                              <p className="text-sm font-semibold mt-1">{match.product.price.toLocaleString()} RON</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Alternatives */}
                  {results.result.alternatives?.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2 text-gray-600">💡 Alternative</h4>
                      <div className="space-y-1">
                        {results.result.alternatives.slice(0, 3).map((alt: any, i: number) => (
                          <div key={i} className="p-2 bg-gray-50 rounded text-sm">
                            <p className="font-medium">{alt.productName}</p>
                            <p className="text-xs text-gray-500">{alt.reason}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Clarifications */}
                  {results.result.clarifications?.length > 0 && (
                    <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                      <h4 className="font-semibold text-yellow-800 mb-2">❓ Întrebări</h4>
                      <ul className="text-sm text-yellow-700 space-y-1">
                        {results.result.clarifications.map((q: string, i: number) => (
                          <li key={i}>• {q}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {results.result.matches?.length === 0 && (
                    <p className="text-center text-gray-500 py-4">
                      Nu am găsit potriviri exacte. Încearcă o altă descriere.
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-12">
                  Descrie sau încarcă o poză cu produsul căutat
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
