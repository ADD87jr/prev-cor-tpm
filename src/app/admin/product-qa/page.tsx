"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function ProductQAPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [question, setQuestion] = useState("");
  const [qaHistory, setQaHistory] = useState<any[]>([]);
  const [answering, setAnswering] = useState(false);
  const [faqs, setFaqs] = useState<any[]>([]);
  const [generatingFaq, setGeneratingFaq] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    setLoading(true);
    try {
      const res = await fetch("/admin/api/ai-product-qa");
      const data = await res.json();
      setProducts(data.products || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  async function askQuestion() {
    if (!question.trim() || !selectedProduct) return;
    setAnswering(true);
    try {
      const res = await fetch("/admin/api/ai-product-qa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "answer",
          productId: selectedProduct.id,
          question
        })
      });
      const data = await res.json();
      setQaHistory([...qaHistory, {
        question,
        answer: data.answer,
        confidence: data.confidence
      }]);
      setQuestion("");
    } catch (e) {
      console.error(e);
    }
    setAnswering(false);
  }

  async function generateFaqs() {
    if (!selectedProduct) return;
    setGeneratingFaq(true);
    try {
      const res = await fetch("/admin/api/ai-product-qa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate-faq",
          productId: selectedProduct.id
        })
      });
      const data = await res.json();
      setFaqs(data.faqs || []);
    } catch (e) {
      console.error(e);
    }
    setGeneratingFaq(false);
  }

  function selectProduct(p: any) {
    setSelectedProduct(p);
    setQaHistory([]);
    setFaqs([]);
  }

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <Link href="/admin/ai-hub" className="text-blue-600 hover:underline text-sm">
          ← Înapoi la AI Hub
        </Link>
        <h1 className="text-2xl font-bold mt-2">❓ Product Q&A Bot</h1>
        <p className="text-gray-600">Răspunde la întrebări tehnice despre produse</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Product List */}
        <div>
          <div className="mb-3">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Caută produs..."
              className="w-full px-3 py-2 border rounded"
            />
          </div>
          
          {loading ? (
            <div className="text-center py-10">Se încarcă...</div>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {filtered.slice(0, 50).map(p => (
                <div
                  key={p.id}
                  onClick={() => selectProduct(p)}
                  className={`p-3 border rounded cursor-pointer hover:bg-gray-50 ${
                    selectedProduct?.id === p.id ? "border-blue-500 bg-blue-50" : ""
                  }`}
                >
                  <div className="font-medium text-sm line-clamp-2">{p.name}</div>
                  <div className="text-xs text-gray-500">{p.category}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Q&A Interface */}
        <div className="lg:col-span-2">
          {!selectedProduct ? (
            <div className="bg-gray-100 rounded-lg p-10 text-center text-gray-500">
              Selectează un produs pentru Q&A
            </div>
          ) : (
            <div className="space-y-4">
              {/* Selected Product */}
              <div className="bg-white border rounded-lg p-4">
                <h3 className="font-semibold">{selectedProduct.name}</h3>
                <div className="text-sm text-gray-600">{selectedProduct.category}</div>
                <div className="text-lg font-bold text-blue-600 mt-1">
                  {selectedProduct.price?.toLocaleString()} RON
                </div>
                <button
                  onClick={generateFaqs}
                  disabled={generatingFaq}
                  className="mt-3 text-sm px-3 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
                >
                  {generatingFaq ? "..." : "🤖 Generează FAQ"}
                </button>
              </div>

              {/* Generated FAQs */}
              {faqs.length > 0 && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h4 className="font-semibold text-purple-800 mb-2">📋 FAQ Generat</h4>
                  <div className="space-y-2">
                    {faqs.map((faq, i) => (
                      <div key={i} className="bg-white p-2 rounded text-sm">
                        <div className="font-medium">{faq.question}</div>
                        <div className="text-gray-600 text-xs mt-1">{faq.answer}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Chat History */}
              <div className="bg-gray-50 rounded-lg p-4 min-h-[300px] max-h-[400px] overflow-y-auto">
                {qaHistory.length === 0 ? (
                  <div className="text-center text-gray-400 py-10">
                    Pune o întrebare despre produs
                  </div>
                ) : (
                  <div className="space-y-4">
                    {qaHistory.map((qa, i) => (
                      <div key={i}>
                        <div className="flex justify-end">
                          <div className="bg-blue-500 text-white px-3 py-2 rounded-lg max-w-xs text-sm">
                            {qa.question}
                          </div>
                        </div>
                        <div className="flex justify-start mt-2">
                          <div className="bg-white border px-3 py-2 rounded-lg max-w-md text-sm">
                            {qa.answer}
                            <div className="text-xs text-gray-400 mt-1">
                              Încredere: {qa.confidence}%
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Question Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={question}
                  onChange={e => setQuestion(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && askQuestion()}
                  placeholder="Pune o întrebare despre acest produs..."
                  className="flex-1 px-4 py-2 border rounded"
                />
                <button
                  onClick={askQuestion}
                  disabled={answering || !question.trim()}
                  className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {answering ? "..." : "Trimite"}
                </button>
              </div>

              {/* Quick Questions */}
              <div className="flex flex-wrap gap-2">
                {[
                  "Care sunt specificațiile tehnice?",
                  "Ce garanție are?",
                  "Este compatibil cu..?",
                  "Cum se instalează?",
                  "Ce alternative există?"
                ].map((q, i) => (
                  <button
                    key={i}
                    onClick={() => setQuestion(q)}
                    className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
