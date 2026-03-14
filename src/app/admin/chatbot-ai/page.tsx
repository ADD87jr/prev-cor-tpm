"use client";
import { useState, useRef, useEffect } from "react";

interface Message {
  id: string;
  role: "user" | "bot";
  content: string;
  products?: any[];
  needsHuman?: boolean;
  timestamp: Date;
}

export default function ChatbotPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "bot",
      content: "Bună! Sunt asistentul virtual al magazinului. Cu ce vă pot ajuta astăzi? Pot răspunde la întrebări despre produse, prețuri, livrare sau orice altă informație aveți nevoie.",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/admin/api/ai-chatbot")
      .then(res => res.json())
      .then(setStats)
      .catch(console.error);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/admin/api/ai-chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input })
      });
      const data = await res.json();

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "bot",
        content: data.response || data.error || "Scuze, nu am putut procesa cererea.",
        products: data.suggestedProducts,
        needsHuman: data.needsHumanEscalation,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "bot",
        content: "Eroare de conexiune. Vă rugăm încercați din nou.",
        timestamp: new Date()
      }]);
    }

    setLoading(false);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">🤖 Chatbot AI - Demo</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chat Window */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-lg overflow-hidden flex flex-col h-[600px]">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-lg p-3 ${
                  msg.role === "user" 
                    ? "bg-blue-600 text-white" 
                    : "bg-white shadow border"
                }`}>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  
                  {msg.products && msg.products.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <p className="text-sm font-medium">Produse sugerate:</p>
                      {msg.products.map((p: any, idx: number) => (
                        <div key={idx} className="bg-gray-100 rounded p-2 text-sm text-gray-800">
                          <span className="font-medium">{p.name}</span>
                          <span className="ml-2 text-green-600">{p.price} RON</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {msg.needsHuman && (
                    <div className="mt-2 text-orange-600 text-sm flex items-center gap-1">
                      ⚠️ Această solicitare necesită asistență umană
                    </div>
                  )}

                  <p className="text-xs opacity-60 mt-1">
                    {msg.timestamp.toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white shadow border rounded-lg p-3">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
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
                onKeyPress={e => e.key === "Enter" && sendMessage()}
                placeholder="Scrieți mesajul dvs..."
                className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Trimite
              </button>
            </div>
          </div>
        </div>

        {/* Stats Sidebar */}
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-semibold mb-3">📊 Statistici Chatbot</h3>
            {stats ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Conversații simulate:</span>
                  <span className="font-medium">{stats.totalConversations}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Rata satisfacție:</span>
                  <span className="font-medium text-green-600">{stats.satisfactionRate}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Timp răspuns mediu:</span>
                  <span className="font-medium">{stats.avgResponseTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Escalări către om:</span>
                  <span className="font-medium">{stats.humanEscalations}</span>
                </div>
              </div>
            ) : (
              <p className="text-gray-400">Se încarcă...</p>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-semibold mb-3">❓ Întrebări frecvente</h3>
            <div className="space-y-2">
              {stats?.topQuestions?.map((q: any, idx: number) => (
                <button
                  key={idx}
                  onClick={() => setInput(q.question)}
                  className="w-full text-left text-sm p-2 bg-gray-50 hover:bg-gray-100 rounded"
                >
                  {q.question}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-100">
            <h3 className="font-semibold mb-2">💡 Capabilități</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>✓ Răspunsuri despre produse</li>
              <li>✓ Recomandări personalizate</li>
              <li>✓ Info livrare și garanție</li>
              <li>✓ Detectare escalare</li>
              <li>✓ Sugestii produse</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
