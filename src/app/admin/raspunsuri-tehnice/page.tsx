"use client";

import { useState } from "react";

interface Answer {
  answer: string;
  confidence: number;
  sources: string[];
  relatedTopics: string[];
  suggestedProducts: string[];
  needsSpecialist: boolean;
  followUpQuestions: string[];
}

interface FAQ {
  category: string;
  questions: string[];
}

export default function AITechnicalAnswersPage() {
  const [question, setQuestion] = useState("");
  const [productId, setProductId] = useState("");
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [faq, setFaq] = useState<FAQ[]>([]);
  const [loadingFaq, setLoadingFaq] = useState(false);

  const loadFaq = async () => {
    setLoadingFaq(true);
    try {
      const res = await fetch("/admin/api/ai-technical-answers");
      const data = await res.json();
      setFaq(data.faq || []);
    } catch (e) {
      console.error(e);
    }
    setLoadingFaq(false);
  };

  const askQuestion = async (q?: string) => {
    const questionToAsk = q || question;
    if (!questionToAsk.trim()) return;

    setLoading(true);
    setAnswer(null);

    try {
      const res = await fetch("/admin/api/ai-technical-answers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: questionToAsk,
          productId: productId ? parseInt(productId) : null,
          context: { searchProducts: true }
        })
      });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
      } else {
        setAnswer(data);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const selectFaqQuestion = (q: string) => {
    setQuestion(q);
    askQuestion(q);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">🎓 AI Răspunsuri Tehnice</h1>
      <p className="text-gray-600 mb-6">
        Obține răspunsuri profesionale la întrebări tehnice despre automatizări industriale.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formular întrebare */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow p-5 mb-6">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">Pune o întrebare</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Întrebare tehnică</label>
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Ex: Ce diferență este între un PLC și un microcontroller?"
                  className="w-full border rounded px-3 py-2 h-24 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">ID Produs (opțional)</label>
                <input
                  type="number"
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  placeholder="Lasă gol pentru întrebări generale"
                  className="w-full border rounded px-3 py-2"
                />
              </div>

              <button
                onClick={() => askQuestion()}
                disabled={loading || !question.trim()}
                className="w-full bg-blue-600 text-white py-2 rounded font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? "Se generează răspunsul..." : "Întreabă AI"}
              </button>
            </div>
          </div>

          {/* Răspuns */}
          {answer && (
            <div className="bg-white rounded-lg shadow p-5">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-lg font-semibold text-gray-700">Răspuns AI</h2>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${
                    answer.confidence >= 90 ? "bg-green-100 text-green-700" :
                    answer.confidence >= 70 ? "bg-yellow-100 text-yellow-700" :
                    "bg-red-100 text-red-700"
                  }`}>
                    {answer.confidence}% încredere
                  </span>
                  {answer.needsSpecialist && (
                    <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs font-bold">
                      🔧 Necesită specialist
                    </span>
                  )}
                </div>
              </div>

              <div className="prose prose-sm max-w-none mb-4">
                <p className="text-gray-800 whitespace-pre-line">{answer.answer}</p>
              </div>

              {answer.sources && answer.sources.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-600 mb-1">Surse:</p>
                  <div className="flex flex-wrap gap-2">
                    {answer.sources.map((source, i) => (
                      <span key={i} className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">
                        {source}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {answer.suggestedProducts && answer.suggestedProducts.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-600 mb-1">Produse sugerate:</p>
                  <div className="flex flex-wrap gap-2">
                    {answer.suggestedProducts.map((product, i) => (
                      <span key={i} className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">
                        {product}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {answer.relatedTopics && answer.relatedTopics.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-600 mb-1">Topicuri conexe:</p>
                  <div className="flex flex-wrap gap-2">
                    {answer.relatedTopics.map((topic, i) => (
                      <span key={i} className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs">
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {answer.followUpQuestions && answer.followUpQuestions.length > 0 && (
                <div className="border-t pt-4">
                  <p className="text-sm font-medium text-gray-600 mb-2">Întrebări de follow-up:</p>
                  <div className="space-y-2">
                    {answer.followUpQuestions.map((q, i) => (
                      <button
                        key={i}
                        onClick={() => selectFaqQuestion(q)}
                        className="block text-left text-sm text-blue-600 hover:underline"
                      >
                        → {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* FAQ */}
        <div className="bg-white rounded-lg shadow p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-700">Întrebări Frecvente</h2>
            {faq.length === 0 && (
              <button
                onClick={loadFaq}
                disabled={loadingFaq}
                className="text-sm text-blue-600 hover:underline"
              >
                {loadingFaq ? "..." : "Încarcă"}
              </button>
            )}
          </div>

          {faq.length > 0 ? (
            <div className="space-y-4">
              {faq.map((category, i) => (
                <div key={i}>
                  <p className="font-medium text-gray-800 mb-2">{category.category}</p>
                  <div className="space-y-1">
                    {category.questions.map((q, j) => (
                      <button
                        key={j}
                        onClick={() => selectFaqQuestion(q)}
                        className="block text-left text-sm text-gray-600 hover:text-blue-600 hover:bg-gray-50 p-2 rounded w-full"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm text-center py-4">
              Click "Încarcă" pentru a vedea întrebările frecvente.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
