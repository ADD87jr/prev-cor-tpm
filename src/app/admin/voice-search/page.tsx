"use client";

import { useState } from "react";
import Link from "next/link";

export default function VoiceSearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  async function search() {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/admin/api/ai-voice-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voiceText: query })
      });
      const data = await res.json();
      setResults(data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  // Simulated voice recording
  function startRecording() {
    setIsRecording(true);
    setTimeout(() => {
      setIsRecording(false);
      // Simulate transcription
      setQuery("Vreau un PLC Siemens pentru automatizare industrială");
    }, 2000);
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <Link href="/admin/ai-hub" className="text-blue-600 hover:underline text-sm">
          ← Înapoi la AI Hub
        </Link>
        <h1 className="text-2xl font-bold mt-2">🎤 Căutare Vocală</h1>
        <p className="text-gray-600">Caută produse prin comandă vocală</p>
      </div>

      {/* Search Input */}
      <div className="bg-white border rounded-lg p-6 mb-6">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && search()}
              placeholder="Tastează sau spune ce cauți..."
              className="w-full px-4 py-3 border rounded-lg pr-12"
            />
            <button
              onClick={startRecording}
              className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full ${
                isRecording ? "bg-red-500 animate-pulse" : "bg-gray-200 hover:bg-gray-300"
              }`}
            >
              🎤
            </button>
          </div>
          <button
            onClick={search}
            disabled={loading || !query.trim()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "..." : "Caută"}
          </button>
        </div>

        {isRecording && (
          <div className="mt-4 text-center text-red-500 animate-pulse">
            🎤 Se înregistrează...
          </div>
        )}
      </div>

      {/* Interpretare */}
      {results.interpretation && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-purple-800 mb-2">🤖 Interpretare AI</h3>
          <div className="text-sm space-y-1">
            <div><strong>Intenție:</strong> {results.interpretation.intent}</div>
            <div><strong>Categorie:</strong> {results.interpretation.category}</div>
            {results.interpretation.brand && (
              <div><strong>Brand:</strong> {results.interpretation.brand}</div>
            )}
            {results.interpretation.priceRange && (
              <div><strong>Preț:</strong> {results.interpretation.priceRange}</div>
            )}
            {results.interpretation.specifications?.length > 0 && (
              <div><strong>Specificații:</strong> {results.interpretation.specifications.join(", ")}</div>
            )}
          </div>
          <div className="text-xs text-purple-600 mt-2">
            Încredere: {results.interpretation.confidence}%
          </div>
        </div>
      )}

      {/* Results */}
      {results.products?.length > 0 && (
        <div>
          <h3 className="font-semibold mb-3">📦 Produse Găsite ({results.products.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.products.map((p: any) => (
              <div key={p.id} className="bg-white border rounded-lg p-4 hover:shadow-md transition">
                <div className="aspect-square bg-gray-100 rounded mb-3 flex items-center justify-center text-4xl">
                  📦
                </div>
                <h4 className="font-semibold line-clamp-2">{p.name}</h4>
                <div className="text-sm text-gray-600 mt-1">{p.category}</div>
                <div className="flex justify-between items-center mt-2">
                  <div className="text-lg font-bold text-blue-600">
                    {p.price?.toLocaleString()} RON
                  </div>
                  <span className={`px-2 py-0.5 text-xs rounded ${
                    p.stock > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  }`}>
                    {p.stock > 0 ? `${p.stock} în stoc` : "Stoc epuizat"}
                  </span>
                </div>
                <div className="text-xs text-purple-600 mt-2">
                  Relevanță: {p.relevanceScore}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Suggestions */}
      {results.suggestions?.length > 0 && (
        <div className="mt-6">
          <h3 className="font-semibold mb-2">💡 Sugestii</h3>
          <div className="flex flex-wrap gap-2">
            {results.suggestions.map((s: string, i: number) => (
              <button
                key={i}
                onClick={() => { setQuery(s); search(); }}
                className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-sm"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !results.products && query && (
        <div className="text-center py-10 text-gray-500">
          Nu s-au găsit produse pentru această căutare
        </div>
      )}
    </div>
  );
}
