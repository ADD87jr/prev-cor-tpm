"use client";
import { useState, useEffect, useRef } from "react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  confidence?: string;
  products?: any[];
  needsHuman?: boolean;
  timestamp: Date;
}

export default function TechnicalRAGPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/admin/api/ai-technical-rag")
      .then(res => res.json())
      .then(setInfo);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendQuestion = async (question?: string) => {
    const q = question || input;
    if (!q.trim() || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: q,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const context = messages.slice(-6).map(m => `${m.role}: ${m.content}`).join("\n");
      const res = await fetch("/admin/api/ai-technical-rag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, context })
      });
      const data = await res.json();

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.answer || data.error || "Nu am putut procesa întrebarea.",
        confidence: data.confidence,
        products: data.relatedProducts,
        needsHuman: data.needsHumanAssistance,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (e) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Eroare la procesarea cererii.",
        timestamp: new Date()
      }]);
    }

    setLoading(false);
  };

  const getConfidenceBadge = (confidence?: string) => {
    switch (confidence) {
      case "high":
        return <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs">Încredere mare</span>;
      case "medium":
        return <span className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded text-xs">Încredere medie</span>;
      default:
        return <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded text-xs">Încredere scăzută</span>;
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">🧠 Asistent Tehnic RAG</h1>
      <p className="text-gray-600 mb-6">Întrebări tehnice cu răspunsuri bazate pe baza de cunoștințe</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chat */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow flex flex-col h-[600px]">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                <p className="text-4xl mb-3">🔧</p>
                <p>Pune o întrebare tehnică despre produse</p>
                <p className="text-sm mt-2">Răspunsurile sunt bazate exclusiv pe datele din catalog</p>
              </div>
            )}
            
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg p-3 ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-white shadow border"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>

                  {msg.role === "assistant" && msg.confidence && (
                    <div className="mt-2 flex items-center gap-2">
                      {getConfidenceBadge(msg.confidence)}
                      {msg.needsHuman && (
                        <span className="bg-orange-100 text-orange-800 px-2 py-0.5 rounded text-xs">
                          ⚠️ Necesită verificare
                        </span>
                      )}
                    </div>
                  )}

                  {msg.products && msg.products.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-sm font-medium mb-2">Produse relevante:</p>
                      {msg.products.map((p: any, i: number) => (
                        <div key={i} className="bg-gray-50 rounded p-2 mb-1 text-sm">
                          <p className="font-medium text-gray-800">{p.name}</p>
                          <p className="text-gray-600 text-xs">{p.relevance}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <p className="text-xs opacity-50 mt-2">
                    {msg.timestamp.toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-white shadow border rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                    <span className="text-gray-600 text-sm">Caut în baza de cunoștințe...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 bg-white border-t">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyPress={e => e.key === "Enter" && sendQuestion()}
                placeholder="Întreabă despre produse, specificații, compatibilitate..."
                className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
              <button
                onClick={() => sendQuestion()}
                disabled={loading || !input.trim()}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Întreabă
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-semibold mb-3">📚 Baza de Cunoștințe</h3>
            {info ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Produse indexate:</span>
                  <span className="font-medium">{info.productsCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Categorii:</span>
                  <span className="font-medium">{info.categories?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Producători:</span>
                  <span className="font-medium">{info.manufacturers?.length || 0}</span>
                </div>
              </div>
            ) : (
              <p className="text-gray-400 text-sm">Se încarcă...</p>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-semibold mb-3">❓ Întrebări sugerate</h3>
            <div className="space-y-2">
              {info?.commonQuestions?.slice(0, 6).map((q: string, i: number) => (
                <button
                  key={i}
                  onClick={() => sendQuestion(q)}
                  className="w-full text-left text-sm p-2 bg-gray-50 hover:bg-gray-100 rounded transition"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg p-4 border border-purple-100">
            <h3 className="font-semibold mb-2">🔧 Capabilități RAG</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              {info?.systemCapabilities?.map((cap: string, i: number) => (
                <li key={i}>✓ {cap}</li>
              ))}
            </ul>
          </div>

          <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
            <h4 className="font-medium text-yellow-800 mb-2">ℹ️ Cum funcționează</h4>
            <p className="text-sm text-yellow-700">
              Sistemul RAG (Retrieval-Augmented Generation) caută informații relevante în 
              catalogul de produse și generează răspunsuri bazate exclusiv pe datele disponibile.
              Când informația nu există, va indica clar acest lucru.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
