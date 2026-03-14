"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

interface MarginProduct {
  id: number;
  name: string;
  purchasePrice: number;
  salePrice: number;
  margin: number;
  marginPercent: number;
  domain: string;
  stock: number;
}

interface SalesProduct {
  name: string;
  qty: number;
  revenue: number;
}

interface DomainPerf {
  domain: string;
  orders: number;
  revenue: number;
  products: number;
}

interface AdvisorData {
  margins: {
    average: number;
    lowMargin: MarginProduct[];
    highMargin: MarginProduct[];
    noPurchasePrice: { id: number; name: string; price: number }[];
  };
  sales: {
    revenue30days: number;
    revenue60days: number;
    revenueGrowth: number;
    orders30days: number;
    topSelling: SalesProduct[];
    slowProducts: { id: number; name: string; stock: number; price: number; domain: string }[];
    domainPerformance: DomainPerf[];
  };
  demand: {
    topWishlist: { id: number; name: string; count: number; stock: number; price: number }[];
    topAbandoned: { name: string; count: number; lostRevenue: number }[];
    abandonedTotal: number;
  };
  aiAdvice: string | null;
  newsletters: number;
}

export default function AIBusinessAdvisor() {
  const [data, setData] = useState<AdvisorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"overview" | "margins" | "sales" | "demand" | "ai">("overview");
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [chatHistory, setChatHistory] = useState<{ q: string; a: string }[]>([]);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [chatHistory]);

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/ai/business-advisor");
      if (!res.ok) throw new Error("Eroare la încărcare");
      const json = await res.json();
      setData(json);
    } catch (e: any) {
      setError(e.message || "Eroare");
    }
    setLoading(false);
  };

  const askQuestion = async () => {
    if (!question.trim() || asking) return;
    setAsking(true);
    const q = question;
    setQuestion("");
    try {
      const res = await fetch("/api/ai/business-advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: q,
          context: data ? {
            margins: data.margins.average,
            revenue30: data.sales.revenue30days,
            growth: data.sales.revenueGrowth,
            topSelling: data.sales.topSelling.slice(0, 5),
            slowProducts: data.sales.slowProducts.length,
            abandonedCarts: data.demand.topAbandoned.length,
            abandonedValue: data.demand.abandonedTotal,
          } : {},
        }),
      });
      const json = await res.json();
      setChatHistory([...chatHistory, { q, a: json.answer || json.error || "Fără răspuns" }]);
    } catch {
      setChatHistory([...chatHistory, { q, a: "Eroare la comunicarea cu AI" }]);
    }
    setAsking(false);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8 text-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-gray-600">AI-ul analizează datele afacerii...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-50 rounded-xl p-6 text-red-700">
        <p className="font-semibold">Eroare: {error}</p>
        <button onClick={fetchData} className="mt-2 text-sm underline">Reîncearcă</button>
      </div>
    );
  }

  const tabs = [
    { key: "overview", label: "📊 Sumar", icon: "📊" },
    { key: "margins", label: "💰 Marje & Prețuri", icon: "💰" },
    { key: "sales", label: "📈 Vânzări", icon: "📈" },
    { key: "demand", label: "🎯 Cerere", icon: "🎯" },
    { key: "ai", label: "🤖 Consilier AI", icon: "🤖" },
  ] as const;

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
        <h2 className="text-xl font-bold flex items-center gap-2">
          🧠 Consilier AI de Afaceri
        </h2>
        <p className="text-indigo-100 text-sm mt-1">
          Analiză completă a afacerii cu recomandări personalizate bazate pe datele tale reale
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.key
                ? "border-b-2 border-indigo-600 text-indigo-600 bg-indigo-50"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="p-6">
        {/* TAB: OVERVIEW */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KPICard
                label="Venit 30 zile"
                value={`${data.sales.revenue30days.toLocaleString()} RON`}
                trend={data.sales.revenueGrowth}
                icon="💰"
              />
              <KPICard
                label="Comenzi 30 zile"
                value={data.sales.orders30days.toString()}
                icon="📦"
              />
              <KPICard
                label="Marjă medie"
                value={`${data.margins.average}%`}
                icon="📊"
                color={data.margins.average < 20 ? "red" : data.margins.average > 40 ? "green" : "yellow"}
              />
              <KPICard
                label="Venit pierdut (coșuri)"
                value={`${data.demand.abandonedTotal.toLocaleString()} RON`}
                icon="🛒"
                color="red"
              />
            </div>

            {/* Alertele principale */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h3 className="font-bold text-amber-800 mb-3">⚠️ Necesită atenție</h3>
              <div className="space-y-2 text-sm">
                {data.margins.noPurchasePrice.length > 0 && (
                  <p className="text-amber-700">• <strong>{data.margins.noPurchasePrice.length} produse</strong> nu au preț de achiziție setat — nu poți calcula marja reală</p>
                )}
                {data.margins.lowMargin.length > 0 && (
                  <p className="text-amber-700">• <strong>{data.margins.lowMargin.length} produse</strong> au marjă sub 15% — risc de pierdere</p>
                )}
                {data.sales.slowProducts.length > 0 && (
                  <p className="text-amber-700">• <strong>{data.sales.slowProducts.length} produse</strong> cu stoc dar nevândute în 90 zile — stoc mort</p>
                )}
                {data.demand.topAbandoned.length > 0 && (
                  <p className="text-amber-700">• <strong>{data.demand.abandonedTotal.toLocaleString()} RON</strong> pierduți din coșuri abandonate</p>
                )}
              </div>
            </div>

            {/* AI Advice */}
            {data.aiAdvice && (
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-5">
                <h3 className="font-bold text-indigo-800 mb-3">🤖 Sfaturi AI Personalizate</h3>
                <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed prose prose-sm max-w-none">
                  {formatMarkdown(data.aiAdvice)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB: MARJE */}
        {activeTab === "margins" && (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-green-700">{data.margins.average}%</p>
                <p className="text-sm text-green-600">Marjă medie</p>
              </div>
              <div className="bg-red-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-red-700">{data.margins.lowMargin.length}</p>
                <p className="text-sm text-red-600">Marjă mică (&lt;15%)</p>
              </div>
              <div className="bg-emerald-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-emerald-700">{data.margins.highMargin.length}</p>
                <p className="text-sm text-emerald-600">Marjă mare (&gt;50%)</p>
              </div>
            </div>

            {/* Low margin products */}
            {data.margins.lowMargin.length > 0 && (
              <div>
                <h3 className="font-bold text-red-700 mb-2">🔴 Produse cu marjă mică — Trebuie crescut prețul sau găsit furnizor mai ieftin</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-red-50">
                      <tr>
                        <th className="px-3 py-2 text-left">Produs</th>
                        <th className="px-3 py-2 text-right">Preț cumpărare</th>
                        <th className="px-3 py-2 text-right">Preț vânzare</th>
                        <th className="px-3 py-2 text-right">Marjă</th>
                        <th className="px-3 py-2 text-right">Stoc</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {data.margins.lowMargin.map((p) => (
                        <tr key={p.id} className="hover:bg-red-50/50 cursor-pointer" onClick={() => window.location.href = `/admin/adauga-produs-ro?edit=${p.id}`}>
                          <td className="px-3 py-2 font-medium text-blue-600 hover:underline">{p.name}</td>
                          <td className="px-3 py-2 text-right">{p.purchasePrice} RON</td>
                          <td className="px-3 py-2 text-right">{p.salePrice} RON</td>
                          <td className="px-3 py-2 text-right font-bold text-red-600">{p.marginPercent}%</td>
                          <td className="px-3 py-2 text-right">{p.stock}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* High margin products */}
            {data.margins.highMargin.length > 0 && (
              <div>
                <h3 className="font-bold text-emerald-700 mb-2">🟢 Produse cele mai profitabile — Investește în stoc și promovare</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-emerald-50">
                      <tr>
                        <th className="px-3 py-2 text-left">Produs</th>
                        <th className="px-3 py-2 text-right">Preț cumpărare</th>
                        <th className="px-3 py-2 text-right">Preț vânzare</th>
                        <th className="px-3 py-2 text-right">Marjă</th>
                        <th className="px-3 py-2 text-right">Stoc</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {data.margins.highMargin.map((p) => (
                        <tr key={p.id} className="hover:bg-emerald-50/50 cursor-pointer" onClick={() => window.location.href = `/admin/adauga-produs-ro?edit=${p.id}`}>
                          <td className="px-3 py-2 font-medium text-blue-600 hover:underline">{p.name}</td>
                          <td className="px-3 py-2 text-right">{p.purchasePrice} RON</td>
                          <td className="px-3 py-2 text-right">{p.salePrice} RON</td>
                          <td className="px-3 py-2 text-right font-bold text-emerald-600">{p.marginPercent}%</td>
                          <td className="px-3 py-2 text-right">{p.stock}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* No purchase price */}
            {data.margins.noPurchasePrice.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="font-bold text-yellow-800 mb-2">⚠️ Fără preț de achiziție ({data.margins.noPurchasePrice.length} produse)</h3>
                <p className="text-sm text-yellow-700 mb-2">Setează prețul de cumpărare pentru a calcula marja reală:</p>
                <div className="flex flex-wrap gap-2">
                  {data.margins.noPurchasePrice.slice(0, 10).map((p) => (
                    <Link key={p.id} href={`/admin/adauga-produs-ro?edit=${p.id}`} className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded hover:bg-yellow-200 cursor-pointer">
                      {p.name} ({p.price} RON)
                    </Link>
                  ))}
                  {data.margins.noPurchasePrice.length > 10 && (
                    <span className="text-yellow-600 text-xs px-2 py-1">...și alte {data.margins.noPurchasePrice.length - 10}</span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB: VÂNZĂRI */}
        {activeTab === "sales" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-blue-700">{data.sales.revenue30days.toLocaleString()} RON</p>
                <p className="text-sm text-blue-600">Venit 30 zile</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-gray-700">{data.sales.revenue60days.toLocaleString()} RON</p>
                <p className="text-sm text-gray-500">Venit luna anterioară</p>
              </div>
              <div className={`rounded-lg p-4 text-center ${data.sales.revenueGrowth >= 0 ? "bg-green-50" : "bg-red-50"}`}>
                <p className={`text-2xl font-bold ${data.sales.revenueGrowth >= 0 ? "text-green-700" : "text-red-700"}`}>
                  {data.sales.revenueGrowth > 0 ? "+" : ""}{data.sales.revenueGrowth}%
                </p>
                <p className="text-sm text-gray-600">Creștere</p>
              </div>
            </div>

            {/* Top selling */}
            <div>
              <h3 className="font-bold text-gray-800 mb-2">🏆 Top produse vândute (90 zile)</h3>
              <div className="space-y-2">
                {data.sales.topSelling.slice(0, 10).map((p, i) => (
                  <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-gray-400">#{i + 1}</span>
                      <span className="font-medium text-sm">{p.name}</span>
                    </div>
                    <div className="flex gap-4 text-sm">
                      <span className="text-gray-500">{p.qty} buc</span>
                      <span className="font-bold text-green-700">{Math.round(p.revenue).toLocaleString()} RON</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Domain performance */}
            <div>
              <h3 className="font-bold text-gray-800 mb-2">📊 Performanță pe domenii</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left">Domeniu</th>
                      <th className="px-3 py-2 text-right">Produse</th>
                      <th className="px-3 py-2 text-right">Vândute</th>
                      <th className="px-3 py-2 text-right">Venit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {data.sales.domainPerformance.map((d, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 font-medium">{d.domain}</td>
                        <td className="px-3 py-2 text-right">{d.products}</td>
                        <td className="px-3 py-2 text-right">{d.orders}</td>
                        <td className="px-3 py-2 text-right font-bold">{Math.round(d.revenue).toLocaleString()} RON</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Slow products */}
            {data.sales.slowProducts.length > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <h3 className="font-bold text-orange-800 mb-2">🐌 Stoc mort — Nevândute în 90 zile ({data.sales.slowProducts.length} produse)</h3>
                <p className="text-sm text-orange-600 mb-3">Consideră: reduceri, bundle-uri, sau returnare la furnizor</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {data.sales.slowProducts.slice(0, 10).map((p) => (
                    <div key={p.id} className="flex justify-between text-sm bg-white rounded px-3 py-2">
                      <span className="truncate mr-2">{p.name}</span>
                      <span className="text-orange-600 whitespace-nowrap">{p.stock} buc · {p.price} RON</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB: CERERE */}
        {activeTab === "demand" && (
          <div className="space-y-6">
            {/* Wishlist demand */}
            {data.demand.topWishlist.length > 0 && (
              <div>
                <h3 className="font-bold text-gray-800 mb-2">❤️ Ce vor clienții (din wishlist-uri)</h3>
                <p className="text-sm text-gray-500 mb-3">Aceste produse sunt cele mai dorite — asigură stocul și consideră promoții</p>
                <div className="space-y-2">
                  {data.demand.topWishlist.map((p, i) => (
                    <div key={i} className="flex items-center justify-between bg-pink-50 rounded-lg px-4 py-2">
                      <div>
                        <span className="font-medium text-sm">{p.name}</span>
                        <span className="ml-2 text-xs text-pink-600">({p.count} wishlist-uri)</span>
                      </div>
                      <div className="flex gap-3 text-sm">
                        <span className={`${p.stock === 0 ? "text-red-600 font-bold" : "text-gray-500"}`}>
                          Stoc: {p.stock || "ZERO"}
                        </span>
                        <span className="text-gray-700">{p.price} RON</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Abandoned carts */}
            {data.demand.topAbandoned.length > 0 && (
              <div>
                <h3 className="font-bold text-gray-800 mb-2">🛒 Produse pierdute din coșuri abandonate</h3>
                <p className="text-sm text-gray-500 mb-3">
                  Valoare totală pierdută: <strong className="text-red-600">{data.demand.abandonedTotal.toLocaleString()} RON</strong>
                </p>
                <div className="space-y-2">
                  {data.demand.topAbandoned.map((p, i) => (
                    <div key={i} className="flex items-center justify-between bg-red-50 rounded-lg px-4 py-2">
                      <span className="font-medium text-sm">{p.name}</span>
                      <div className="flex gap-3 text-sm">
                        <span className="text-gray-500">{p.count} buc pierdute</span>
                        <span className="font-bold text-red-600">{Math.round(p.lostRevenue).toLocaleString()} RON</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB: CONSILIER AI */}
        {activeTab === "ai" && (
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg p-4">
              <h3 className="font-bold text-indigo-800 mb-1">🤖 Întreabă-l pe AI orice despre afacerea ta</h3>
              <p className="text-sm text-indigo-600">
                Exemplu: &quot;Ce produse ar trebui să cumpăr luna aceasta?&quot;, &quot;Cum cresc vânzările?&quot;, &quot;Ce promoții recomazi?&quot;
              </p>
            </div>

            {/* Chat history */}
            <div ref={chatRef} className="space-y-4 max-h-[500px] overflow-y-auto">
              {data.aiAdvice && chatHistory.length === 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <p className="text-xs text-gray-400 mb-2">Analiză automată</p>
                  <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed prose prose-sm max-w-none">
                    {formatMarkdown(data.aiAdvice)}
                  </div>
                </div>
              )}
              {chatHistory.map((chat, i) => (
                <div key={i} className="space-y-2">
                  <div className="bg-indigo-100 rounded-lg p-3 ml-12">
                    <p className="text-sm font-medium text-indigo-800">{chat.q}</p>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-4 mr-12">
                    <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed prose prose-sm max-w-none">
                      {formatMarkdown(chat.a)}
                    </div>
                  </div>
                </div>
              ))}
              {asking && (
                <div className="bg-white border rounded-lg p-4 mr-12">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && askQuestion()}
                placeholder="Întreabă ceva despre afacerea ta..."
                className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                disabled={asking}
              />
              <button
                onClick={askQuestion}
                disabled={asking || !question.trim()}
                className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:bg-gray-300 transition-colors"
              >
                {asking ? "..." : "Întreabă"}
              </button>
            </div>

            {/* Quick questions */}
            <div className="flex flex-wrap gap-2">
              {[
                "Ce produse ar trebui să cumpăr?",
                "Cum cresc vânzările luna asta?",
                "Ce prețuri trebuie ajustate?",
                "Ce promoții recomazi?",
                "Cum reduc coșurile abandonate?",
                "Pe ce domenii să mă concentrez?",
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => { setQuestion(q); }}
                  className="text-xs bg-gray-100 hover:bg-indigo-100 text-gray-600 hover:text-indigo-700 px-3 py-1.5 rounded-full transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function KPICard({ label, value, trend, icon, color }: {
  label: string; value: string; icon: string; trend?: number; color?: string;
}) {
  const bgColor = color === "red" ? "bg-red-50" : color === "green" ? "bg-green-50" : color === "yellow" ? "bg-yellow-50" : "bg-blue-50";
  return (
    <div className={`${bgColor} rounded-lg p-4`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-2xl">{icon}</span>
        {trend !== undefined && (
          <span className={`text-xs font-bold ${trend >= 0 ? "text-green-600" : "text-red-600"}`}>
            {trend > 0 ? "↑" : "↓"} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="text-lg font-bold text-gray-800">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}

function formatMarkdown(text: string): React.ReactNode {
  // Simple markdown rendering
  return text.split("\n").map((line, i) => {
    // Bold
    let formatted = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Headers
    if (line.startsWith("### ")) return <h4 key={i} className="font-bold text-gray-800 mt-3 mb-1">{line.slice(4)}</h4>;
    if (line.startsWith("## ")) return <h3 key={i} className="font-bold text-lg text-gray-800 mt-4 mb-2">{line.slice(3)}</h3>;
    if (line.startsWith("# ")) return <h2 key={i} className="font-bold text-xl text-gray-800 mt-4 mb-2">{line.slice(2)}</h2>;
    // Empty line
    if (line.trim() === "") return <br key={i} />;
    // List items
    if (line.trim().startsWith("- ") || line.trim().startsWith("• ")) {
      return <p key={i} className="ml-4 text-sm" dangerouslySetInnerHTML={{ __html: "• " + formatted.replace(/^[\s]*[-•]\s*/, "") }} />;
    }
    if (/^\d+\.\s/.test(line.trim())) {
      return <p key={i} className="ml-4 text-sm" dangerouslySetInnerHTML={{ __html: formatted }} />;
    }
    return <p key={i} className="text-sm" dangerouslySetInnerHTML={{ __html: formatted }} />;
  });
}
