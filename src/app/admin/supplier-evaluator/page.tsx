"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Supplier {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  products: string[];
  ratings: {
    quality: number;
    delivery: number;
    price: number;
    communication: number;
  };
  metrics: {
    totalOrders: number;
    onTimeDelivery: number;
    defectRate: number;
    avgDeliveryDays: number;
  };
  totalScore: number;
  tier: string;
  notes: string;
}

export default function SupplierEvaluatorPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [evaluation, setEvaluation] = useState<any>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSupplier, setNewSupplier] = useState({
    name: "",
    email: "",
    phone: "",
    products: "",
    notes: ""
  });

  useEffect(() => {
    loadSuppliers();
  }, []);

  async function loadSuppliers() {
    setLoading(true);
    try {
      const res = await fetch("/admin/api/ai-supplier-evaluator");
      const data = await res.json();
      setSuppliers(data.suppliers || []);
      setStats(data.stats);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  async function evaluateSupplier(supplier: Supplier) {
    setSelectedSupplier(supplier);
    setEvaluating(true);
    try {
      const res = await fetch("/admin/api/ai-supplier-evaluator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "evaluate", supplierId: supplier.id })
      });
      const data = await res.json();
      setEvaluation(data.evaluation);
    } catch (e) {
      console.error(e);
    }
    setEvaluating(false);
  }

  async function addSupplier() {
    try {
      const res = await fetch("/admin/api/ai-supplier-evaluator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add",
          supplier: {
            name: newSupplier.name,
            email: newSupplier.email,
            phone: newSupplier.phone,
            products: newSupplier.products.split(",").map(p => p.trim()),
            notes: newSupplier.notes
          }
        })
      });
      await res.json();
      setShowAddForm(false);
      setNewSupplier({ name: "", email: "", phone: "", products: "", notes: "" });
      loadSuppliers();
    } catch (e) {
      console.error(e);
    }
  }

  const tierColors: Record<string, string> = {
    GOLD: "bg-yellow-100 border-yellow-400",
    SILVER: "bg-gray-100 border-gray-400",
    BRONZE: "bg-orange-100 border-orange-400",
    NEW: "bg-blue-100 border-blue-400"
  };

  const tierBadge: Record<string, string> = {
    GOLD: "bg-yellow-500",
    SILVER: "bg-gray-400",
    BRONZE: "bg-orange-500",
    NEW: "bg-blue-500"
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/admin/ai-hub" className="text-blue-600 hover:underline text-sm">
            ← Înapoi la AI Hub
          </Link>
          <h1 className="text-2xl font-bold mt-2">🏭 Evaluator Furnizori AI</h1>
          <p className="text-gray-600">Scorifică și evaluează furnizorii</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          ➕ Adaugă Furnizor
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-gray-100 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold">{stats.totalSuppliers}</div>
            <div className="text-sm text-gray-600">Total Furnizori</div>
          </div>
          <div className="bg-yellow-100 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-yellow-700">{stats.goldTier}</div>
            <div className="text-sm text-yellow-600">Gold</div>
          </div>
          <div className="bg-gray-200 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-gray-700">{stats.silverTier}</div>
            <div className="text-sm text-gray-600">Silver</div>
          </div>
          <div className="bg-orange-100 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-orange-700">{stats.bronzeTier}</div>
            <div className="text-sm text-orange-600">Bronze</div>
          </div>
          <div className="bg-green-100 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-green-700">{stats.avgOnTimeDelivery}%</div>
            <div className="text-sm text-green-600">Livrare la timp</div>
          </div>
        </div>
      )}

      {/* Add Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="font-bold text-lg mb-4">➕ Adaugă Furnizor Nou</h3>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Nume furnizor *"
                value={newSupplier.name}
                onChange={(e) => setNewSupplier({...newSupplier, name: e.target.value})}
                className="w-full px-3 py-2 border rounded"
              />
              <input
                type="email"
                placeholder="Email"
                value={newSupplier.email}
                onChange={(e) => setNewSupplier({...newSupplier, email: e.target.value})}
                className="w-full px-3 py-2 border rounded"
              />
              <input
                type="tel"
                placeholder="Telefon"
                value={newSupplier.phone}
                onChange={(e) => setNewSupplier({...newSupplier, phone: e.target.value})}
                className="w-full px-3 py-2 border rounded"
              />
              <input
                type="text"
                placeholder="Produse (separate prin virgulă)"
                value={newSupplier.products}
                onChange={(e) => setNewSupplier({...newSupplier, products: e.target.value})}
                className="w-full px-3 py-2 border rounded"
              />
              <textarea
                placeholder="Note"
                value={newSupplier.notes}
                onChange={(e) => setNewSupplier({...newSupplier, notes: e.target.value})}
                className="w-full px-3 py-2 border rounded"
                rows={2}
              />
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setShowAddForm(false)}
                className="flex-1 px-4 py-2 bg-gray-200 rounded"
              >
                Anulează
              </button>
              <button
                onClick={addSupplier}
                disabled={!newSupplier.name}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
              >
                Salvează
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Suppliers List */}
        <div>
          <h3 className="font-semibold mb-3">🏭 Furnizori</h3>
          
          {loading ? (
            <div className="text-center py-10">Se încarcă...</div>
          ) : (
            <div className="space-y-3">
              {suppliers.map(supplier => (
                <div
                  key={supplier.id}
                  onClick={() => evaluateSupplier(supplier)}
                  className={`border-2 rounded-lg p-4 cursor-pointer hover:shadow-md transition ${
                    tierColors[supplier.tier]
                  } ${selectedSupplier?.id === supplier.id ? "ring-2 ring-blue-500" : ""}`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold text-lg">{supplier.name}</div>
                      <div className="text-sm text-gray-600">{supplier.email}</div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {supplier.products.slice(0, 4).map((p, i) => (
                          <span key={i} className="px-2 py-0.5 bg-white bg-opacity-50 rounded text-xs">
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-1 text-white text-xs rounded ${tierBadge[supplier.tier]}`}>
                        {supplier.tier}
                      </span>
                      <div className="text-2xl font-bold mt-1">{supplier.totalScore}</div>
                      <div className="text-xs text-gray-600">scor total</div>
                    </div>
                  </div>

                  {/* Ratings */}
                  <div className="grid grid-cols-4 gap-2 mt-3 text-xs text-center">
                    <div className="bg-white bg-opacity-50 p-1 rounded">
                      <div className="font-bold">{supplier.ratings.quality}</div>
                      <div>Calitate</div>
                    </div>
                    <div className="bg-white bg-opacity-50 p-1 rounded">
                      <div className="font-bold">{supplier.ratings.delivery}</div>
                      <div>Livrare</div>
                    </div>
                    <div className="bg-white bg-opacity-50 p-1 rounded">
                      <div className="font-bold">{supplier.ratings.price}</div>
                      <div>Preț</div>
                    </div>
                    <div className="bg-white bg-opacity-50 p-1 rounded">
                      <div className="font-bold">{supplier.ratings.communication}</div>
                      <div>Comunicare</div>
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-4 gap-2 mt-2 text-xs text-center">
                    <div>📦 {supplier.metrics.totalOrders} comenzi</div>
                    <div>✅ {supplier.metrics.onTimeDelivery}% la timp</div>
                    <div>⚠️ {supplier.metrics.defectRate}% defecte</div>
                    <div>🚚 {supplier.metrics.avgDeliveryDays} zile</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI Evaluation */}
        <div>
          <h3 className="font-semibold mb-3">🤖 Evaluare AI</h3>
          
          {!selectedSupplier ? (
            <div className="bg-gray-100 rounded-lg p-10 text-center text-gray-500">
              <div className="text-6xl mb-4">🏭</div>
              <p>Selectează un furnizor pentru evaluare AI</p>
            </div>
          ) : evaluating ? (
            <div className="text-center py-10">Se generează evaluarea...</div>
          ) : evaluation ? (
            <div className="space-y-4">
              {/* Overall */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-800">📊 Evaluare Generală</h4>
                <p className="text-sm mt-2">{evaluation.overallAssessment}</p>
              </div>

              {/* Risk Level */}
              <div className={`p-4 rounded-lg border-2 ${
                evaluation.riskLevel === "LOW" ? "bg-green-50 border-green-300" :
                evaluation.riskLevel === "MEDIUM" ? "bg-yellow-50 border-yellow-300" :
                "bg-red-50 border-red-300"
              }`}>
                <div className="font-semibold">
                  ⚠️ Nivel Risc: {evaluation.riskLevel}
                </div>
                {evaluation.riskFactors && (
                  <ul className="list-disc ml-4 text-sm mt-2">
                    {evaluation.riskFactors.map((rf: string, i: number) => (
                      <li key={i}>{rf}</li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Strengths & Weaknesses */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <h5 className="font-medium text-green-800 text-sm">✅ Puncte Forte</h5>
                  <ul className="list-disc ml-4 text-xs mt-1">
                    {evaluation.strengths?.map((s: string, i: number) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <h5 className="font-medium text-red-800 text-sm">❌ Puncte Slabe</h5>
                  <ul className="list-disc ml-4 text-xs mt-1">
                    {evaluation.weaknesses?.map((w: string, i: number) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Recommendations */}
              {evaluation.recommendations && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h4 className="font-semibold text-purple-800 mb-2">💡 Recomandări</h4>
                  <div className="space-y-2">
                    {evaluation.recommendations.map((rec: any, i: number) => (
                      <div key={i} className="bg-white p-2 rounded text-sm">
                        <div className="flex items-center gap-2">
                          <span className={`px-1 text-xs rounded ${
                            rec.priority === "HIGH" ? "bg-red-200" : 
                            rec.priority === "MEDIUM" ? "bg-yellow-200" : "bg-gray-200"
                          }`}>
                            {rec.priority}
                          </span>
                          <span className="font-medium">{rec.area}</span>
                        </div>
                        <div className="text-xs text-gray-600 mt-1">{rec.suggestion}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Negotiation Tips */}
              {evaluation.negotiationTips && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-semibold text-yellow-800 mb-2">🤝 Sfaturi Negociere</h4>
                  <ul className="list-disc ml-4 text-sm">
                    {evaluation.negotiationTips.map((tip: string, i: number) => (
                      <li key={i}>{tip}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Contract Recommendations */}
              {evaluation.contractRecommendations && (
                <div className="bg-gray-50 border rounded-lg p-4 text-sm">
                  <h4 className="font-semibold mb-2">📝 Recomandări Contract</h4>
                  <div><strong>Termeni:</strong> {evaluation.contractRecommendations.suggestedTerms}</div>
                  <div><strong>Plată:</strong> {evaluation.contractRecommendations.paymentTerms}</div>
                  <div><strong>Garanție:</strong> {evaluation.contractRecommendations.warrantyRequirements}</div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
