"use client";

import { useState, useEffect } from "react";

interface DeliveryStats {
  totalOrders: number;
  avgDeliveryCost: number;
  avgWeight: number;
  regionStats: Array<{
    county: string;
    orders: number;
    avgCost: number;
  }>;
}

interface CourierResult {
  name: string;
  price: number;
  estimatedDays: string;
  isRecommended: boolean;
  features: string[];
}

interface OptimizationResult {
  orderId: number;
  destination: string;
  weight: number;
  dimensions: string;
  couriers: CourierResult[];
  recommendation: string;
  potentialSaving: number;
  reasoning: string;
}

export default function AIDeliveryOptimizerPage() {
  const [stats, setStats] = useState<DeliveryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [optimizing, setOptimizing] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [weight, setWeight] = useState("1");
  const [dimensions, setDimensions] = useState("30x20x10");
  const [destination, setDestination] = useState("București");
  const [result, setResult] = useState<OptimizationResult | null>(null);

  useEffect(() => { loadStats(); }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const res = await fetch("/admin/api/ai-delivery-optimizer");
      const data = await res.json();
      setStats(data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const optimizeDelivery = async () => {
    setOptimizing(true);
    setResult(null);

    try {
      const res = await fetch("/admin/api/ai-delivery-optimizer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: orderId ? parseInt(orderId) : undefined,
          destination,
          weight: parseFloat(weight),
          dimensions
        })
      });
      const data = await res.json();
      setResult(data);
    } catch (e) {
      console.error(e);
    }
    setOptimizing(false);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">🚚 AI Optimizare Livrare</h1>
      <p className="text-gray-600 mb-6">
        Calculează cel mai bun curier și cost pentru fiecare livrare.
      </p>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Statistici */}
          <div className="space-y-4">
            {stats && (
              <>
                <div className="bg-white rounded-lg shadow p-5">
                  <h2 className="text-lg font-semibold text-gray-700 mb-4">Statistici Livrări</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-orange-50 rounded p-3 text-center">
                      <p className="text-2xl font-bold text-orange-600">{stats.totalOrders}</p>
                      <p className="text-xs text-orange-500">Comenzi analizate</p>
                    </div>
                    <div className="bg-blue-50 rounded p-3 text-center">
                      <p className="text-2xl font-bold text-blue-600">{stats.avgDeliveryCost?.toFixed(2)}</p>
                      <p className="text-xs text-blue-500">Cost mediu (RON)</p>
                    </div>
                    <div className="bg-green-50 rounded p-3 text-center col-span-2">
                      <p className="text-2xl font-bold text-green-600">{stats.avgWeight?.toFixed(2)} kg</p>
                      <p className="text-xs text-green-500">Greutate medie</p>
                    </div>
                  </div>
                </div>

                {/* Top regiuni */}
                <div className="bg-white rounded-lg shadow p-5">
                  <h3 className="font-semibold text-gray-700 mb-3">Top Regiuni</h3>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {stats.regionStats?.map((region, i) => (
                      <div key={i} className="flex justify-between items-center text-sm">
                        <span className="text-gray-700">{region.county}</span>
                        <span className="text-gray-500">
                          {region.orders} cmd • {region.avgCost?.toFixed(2)} RON
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Formular optimizare */}
            <div className="bg-white rounded-lg shadow p-5">
              <h3 className="font-semibold text-gray-700 mb-3">Calculează Cost</h3>
              
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-gray-600">ID Comandă (opțional)</label>
                  <input
                    type="text"
                    value={orderId}
                    onChange={(e) => setOrderId(e.target.value)}
                    placeholder="Ex: 123"
                    className="w-full border rounded px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Destinație *</label>
                  <input
                    type="text"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="Ex: București, Sector 3"
                    className="w-full border rounded px-3 py-2 text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-sm text-gray-600">Greutate (kg)</label>
                    <input
                      type="number"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      className="w-full border rounded px-3 py-2 text-sm"
                      step="0.1"
                      min="0.1"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Dimensiuni (cm)</label>
                    <input
                      type="text"
                      value={dimensions}
                      onChange={(e) => setDimensions(e.target.value)}
                      placeholder="LxWxH"
                      className="w-full border rounded px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                
                <button
                  onClick={optimizeDelivery}
                  disabled={optimizing || !destination}
                  className="w-full bg-orange-600 text-white py-2 rounded font-medium hover:bg-orange-700 disabled:opacity-50"
                >
                  {optimizing ? "Calculez..." : "🚀 Calculează Opțiuni"}
                </button>
              </div>
            </div>
          </div>

          {/* Rezultate */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow p-5">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">Comparație Curieri</h2>

            {optimizing ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-600 mb-4"></div>
                <p className="text-gray-600">Calculez cele mai bune opțiuni...</p>
              </div>
            ) : result ? (
              <div className="space-y-4">
                {/* Info colet */}
                <div className="bg-gray-50 rounded p-4 flex justify-between items-center">
                  <div>
                    <p className="font-medium text-gray-800">Destinație: {result.destination}</p>
                    <p className="text-sm text-gray-500">
                      {result.weight} kg • {result.dimensions}
                    </p>
                  </div>
                  {result.potentialSaving > 0 && (
                    <div className="bg-green-100 text-green-700 px-3 py-1 rounded text-sm font-medium">
                      💰 Economie: {result.potentialSaving.toFixed(2)} RON
                    </div>
                  )}
                </div>

                {/* Lista curieri */}
                <div className="space-y-3">
                  {result.couriers?.map((courier, i) => (
                    <div 
                      key={i} 
                      className={`border rounded p-4 ${
                        courier.isRecommended 
                          ? "border-orange-400 bg-orange-50 ring-2 ring-orange-200" 
                          : ""
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-800">{courier.name}</span>
                            {courier.isRecommended && (
                              <span className="bg-orange-500 text-white text-xs px-2 py-0.5 rounded">
                                ⭐ RECOMANDAT
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 mt-1">
                            Livrare: {courier.estimatedDays}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-gray-800">
                            {courier.price.toFixed(2)} <span className="text-sm">RON</span>
                          </p>
                        </div>
                      </div>
                      
                      {courier.features && courier.features.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {courier.features.map((f, j) => (
                            <span key={j} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                              {f}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Recomandare AI */}
                {result.recommendation && (
                  <div className="bg-blue-50 rounded p-4">
                    <p className="font-medium text-blue-800 mb-1">💡 Recomandare AI:</p>
                    <p className="text-sm text-blue-700">{result.recommendation}</p>
                    {result.reasoning && (
                      <p className="text-xs text-blue-600 mt-2 italic">{result.reasoning}</p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-20">
                <p className="text-gray-500 mb-2">Introdu datele coletului pentru a vedea comparația</p>
                <p className="text-xs text-gray-400">Compară Fan Courier, Cargus, Sameday, GLS și DPD</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
