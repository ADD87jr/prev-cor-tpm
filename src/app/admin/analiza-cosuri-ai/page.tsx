"use client";
import { useState, useEffect } from "react";

export default function CartAbandonmentAIPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCart, setSelectedCart] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    fetch("/admin/api/ai-cart-abandonment")
      .then(res => res.json())
      .then(d => {
        setData(d);
        setLoading(false);
      });
  }, []);

  const analyzeCart = async (cartId: string) => {
    setAnalyzing(true);
    try {
      const res = await fetch("/admin/api/ai-cart-abandonment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cartId })
      });
      const d = await res.json();
      setSelectedCart(d);
    } catch (e) {
      console.error(e);
    }
    setAnalyzing(false);
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">🧠 Analiză AI Coșuri Abandonate</h1>
      <p className="text-gray-600 mb-6">Strategii inteligente de recuperare bazate pe AI</p>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <p className="text-2xl font-bold text-red-600">{data?.stats?.totalAbandoned || 0}</p>
          <p className="text-gray-600 text-sm">Coșuri abandonate</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <p className="text-2xl font-bold text-orange-600">
            {data?.stats?.totalLostValue?.toLocaleString("ro-RO") || 0}
          </p>
          <p className="text-gray-600 text-sm">Valoare pierdută (RON)</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <p className="text-2xl font-bold text-yellow-600">{data?.stats?.abandonmentRate || 0}%</p>
          <p className="text-gray-600 text-sm">Rată abandonare</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">
            {data?.stats?.avgCartValue?.toLocaleString("ro-RO") || 0}
          </p>
          <p className="text-gray-600 text-sm">Valoare medie coș</p>
        </div>
        <div className="bg-green-50 rounded-lg shadow p-4 text-center border-2 border-green-200">
          <p className="text-2xl font-bold text-green-600">
            {data?.stats?.recoveryPotential?.toLocaleString("ro-RO") || 0}
          </p>
          <p className="text-gray-600 text-sm">Potențial recuperare</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Abandoned Carts List */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b">
            <h3 className="font-semibold">Coșuri pentru Analiză</h3>
          </div>
          <div className="divide-y max-h-[500px] overflow-y-auto">
            {data?.abandonedCarts?.map((cart: any) => (
              <div
                key={cart.id}
                onClick={() => analyzeCart(cart.id)}
                className={`p-4 cursor-pointer hover:bg-gray-50 ${
                  selectedCart?.cart?.id === cart.id ? "bg-blue-50" : ""
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{cart.clientName}</p>
                    <p className="text-sm text-gray-500">{cart.clientEmail}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">{cart.total?.toFixed(0)} RON</p>
                    <p className="text-xs text-gray-500">{cart.itemsCount} produse</p>
                  </div>
                </div>
                <div className="mt-2 flex justify-between items-center text-sm">
                  <span className={`px-2 py-1 rounded ${
                    cart.daysSinceAbandonment < 7 ? "bg-green-100 text-green-700" :
                    cart.daysSinceAbandonment < 30 ? "bg-yellow-100 text-yellow-700" :
                    "bg-red-100 text-red-700"
                  }`}>
                    {cart.daysSinceAbandonment} zile
                  </span>
                  <span className="text-gray-500">{cart.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Analysis Panel */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b">
            <h3 className="font-semibold">Strategii AI de Recuperare</h3>
          </div>
          
          {analyzing ? (
            <div className="p-8 text-center">
              <div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600">Analizez cu AI...</p>
            </div>
          ) : selectedCart?.aiAnalysis ? (
            <div className="p-4 space-y-4 max-h-[500px] overflow-y-auto">
              {/* Abandonment Analysis */}
              {selectedCart.aiAnalysis.abandonmentAnalysis && (
                <div className="bg-red-50 rounded-lg p-3">
                  <h4 className="font-medium text-red-800 mb-2">❓ Cauze Probabile</h4>
                  <div className="space-y-2">
                    {selectedCart.aiAnalysis.abandonmentAnalysis.probableCauses?.map((cause: any, i: number) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          cause.probability === "high" ? "bg-red-200" : "bg-yellow-200"
                        }`}>
                          {cause.probability}
                        </span>
                        <div>
                          <p className="font-medium">{cause.cause}</p>
                          <p className="text-gray-600 text-xs">{cause.evidence}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recovery Strategies */}
              {selectedCart.aiAnalysis.recoveryStrategies && (
                <div className="bg-green-50 rounded-lg p-3">
                  <h4 className="font-medium text-green-800 mb-2">🎯 Strategii Recomandate</h4>
                  <div className="space-y-2">
                    {selectedCart.aiAnalysis.recoveryStrategies.map((s: any, i: number) => (
                      <div key={i} className="bg-white p-2 rounded">
                        <p className="font-medium">{s.strategy}</p>
                        <p className="text-sm text-gray-600">{s.description}</p>
                        <div className="flex gap-2 mt-1 text-xs text-gray-500">
                          <span>📱 {s.channel}</span>
                          <span>⏰ {s.timing}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Email Templates */}
              {selectedCart.aiAnalysis.emailTemplates && (
                <div className="bg-blue-50 rounded-lg p-3">
                  <h4 className="font-medium text-blue-800 mb-2">✉️ Template-uri Email</h4>
                  {selectedCart.aiAnalysis.emailTemplates.map((t: any, i: number) => (
                    <div key={i} className="bg-white p-2 rounded text-sm mb-2">
                      <p className="font-medium">{t.subject}</p>
                      <p className="text-gray-600 mt-1">{t.keyMessage}</p>
                      <div className="mt-2 bg-blue-100 rounded p-1 text-center">
                        <strong>{t.cta}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">
              <p className="text-4xl mb-3">🧠</p>
              <p>Selectează un coș pentru analiză AI</p>
            </div>
          )}
        </div>
      </div>

      {/* Top Abandoned Products */}
      {data?.topAbandonedProducts?.length > 0 && (
        <div className="mt-6 bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold mb-4">📦 Produse Cel Mai Des Abandonate</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {data.topAbandonedProducts.slice(0, 5).map((p: any, i: number) => (
              <div key={i} className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="font-medium text-sm truncate">{p.name}</p>
                <p className="text-xl font-bold text-red-600">{p.count}</p>
                <p className="text-xs text-gray-500">abandonări</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
