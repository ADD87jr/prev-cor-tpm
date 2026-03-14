"use client";

import { useState, useEffect } from "react";

interface Supplier {
  manufacturer: string;
  totalProducts: number;
  totalPurchaseValue: number;
  avgPurchasePrice: number;
  avgMarginPercent: number;
  topProducts: { name: string; purchasePrice: number; salesCount: number }[];
}

interface NegotiationStrategy {
  success: boolean;
  supplier: string;
  overallAssessment: {
    currentRelationship: string;
    negotiationLeverage: "puternică" | "moderată" | "slabă";
    recommendedApproach: string;
  };
  arguments: {
    argument: string;
    type: "volum" | "loialitate" | "concurență" | "potențial" | "date";
    strength: "puternic" | "moderat" | "slab";
    usage: string;
  }[];
  leveragePoints: {
    point: string;
    explanation: string;
    howToUse: string;
  }[];
  tactics: {
    tactic: string;
    when: string;
    expectedOutcome: string;
  }[];
  expectedOutcomes: {
    bestCase: { discount: string; terms: string };
    likelyCase: { discount: string; terms: string };
    worstCase: { discount: string; terms: string };
  };
  openingScript: string;
  responseHandlers: { objection: string; response: string }[];
  warnings: string[];
}

export default function AINegociereFurnizoriPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null);
  const [negotiationGoal, setNegotiationGoal] = useState("discount");
  const [analyzing, setAnalyzing] = useState(false);
  const [strategy, setStrategy] = useState<NegotiationStrategy | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/admin/api/ai-supplier-negotiation");
      const data = await res.json();
      setSuppliers(data.suppliers || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const generateStrategy = async () => {
    if (!selectedSupplier) return;
    setAnalyzing(true);
    setStrategy(null);
    try {
      const res = await fetch("/admin/api/ai-supplier-negotiation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          manufacturer: selectedSupplier,
          negotiationGoal
        })
      });
      const data = await res.json();
      setStrategy(data);
    } catch (e) {
      console.error(e);
    }
    setAnalyzing(false);
  };

  const filteredSuppliers = suppliers.filter(s =>
    (s.manufacturer || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const leverageColor = (level: string): string => {
    const colors: Record<string, string> = {
      "puternică": "bg-green-600 text-white",
      "moderată": "bg-yellow-500 text-white",
      "slabă": "bg-red-500 text-white"
    };
    return colors[level] || "bg-gray-500 text-white";
  };

  const strengthBadge = (strength: string): string => {
    const colors: Record<string, string> = {
      "puternic": "bg-green-100 text-green-800",
      "moderat": "bg-yellow-100 text-yellow-800",
      "slab": "bg-gray-100 text-gray-600"
    };
    return colors[strength] || "bg-gray-100 text-gray-600";
  };

  const supplierData = suppliers.find(s => s.manufacturer === selectedSupplier);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">🤝 AI Negociere Furnizori</h1>
      <p className="text-gray-600 mb-6">
        Generează strategii de negociere personalizate pentru furnizori.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista furnizori */}
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="font-semibold text-gray-700 mb-3">Selectează Furnizor</h2>
            <input
              type="text"
              placeholder="Caută furnizor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm mb-3"
            />

            {loading ? (
              <div className="flex justify-center py-10">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-600"></div>
              </div>
            ) : (
              <div className="max-h-[400px] overflow-y-auto space-y-2">
                {filteredSuppliers.map((supplier, idx) => (
                  <div
                    key={supplier.manufacturer || `supplier-${idx}`}
                    onClick={() => setSelectedSupplier(supplier.manufacturer)}
                    className={`p-3 rounded cursor-pointer transition-colors border ${
                      selectedSupplier === supplier.manufacturer
                        ? "border-teal-500 bg-teal-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <p className="font-medium text-sm">{supplier.manufacturer}</p>
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>{supplier.totalProducts} produse</span>
                      <span>{supplier.totalPurchaseValue?.toFixed(0)} RON</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      Marjă medie: {supplier.avgMarginPercent?.toFixed(1)}%
                    </div>
                  </div>
                ))}
                {filteredSuppliers.length === 0 && (
                  <p className="text-center text-gray-500 text-sm py-4">
                    Niciun furnizor găsit
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Statistici furnizor selectat */}
          {supplierData && (
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-semibold text-gray-700 mb-3">
                📊 {supplierData.manufacturer}
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-gray-50 rounded p-2">
                  <p className="text-xs text-gray-500">Produse</p>
                  <p className="font-bold text-lg">{supplierData.totalProducts}</p>
                </div>
                <div className="bg-gray-50 rounded p-2">
                  <p className="text-xs text-gray-500">Valoare achiziții</p>
                  <p className="font-bold text-lg">{(supplierData.totalPurchaseValue / 1000).toFixed(1)}k</p>
                </div>
                <div className="bg-gray-50 rounded p-2">
                  <p className="text-xs text-gray-500">Preț mediu</p>
                  <p className="font-bold">{supplierData.avgPurchasePrice?.toFixed(0)} RON</p>
                </div>
                <div className="bg-gray-50 rounded p-2">
                  <p className="text-xs text-gray-500">Marjă medie</p>
                  <p className="font-bold text-green-600">{supplierData.avgMarginPercent?.toFixed(1)}%</p>
                </div>
              </div>
              
              <p className="text-xs text-gray-500 mt-3 mb-2">Top produse:</p>
              <div className="space-y-1">
                {supplierData.topProducts?.slice(0, 3).map((p, i) => (
                  <div key={i} className="text-xs flex justify-between">
                    <span className="truncate flex-1">{p.name}</span>
                    <span className="text-gray-500 ml-2">{p.salesCount} vândute</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Setări și generare */}
        <div className="lg:col-span-2 space-y-4">
          {/* Options */}
          <div className="bg-white rounded-lg shadow p-5">
            <h2 className="font-semibold text-gray-700 mb-4">Obiectiv Negociere</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { value: "discount", label: "💰 Discount preț", desc: "Reduceri pe achizițiile viitoare" },
                { value: "terms", label: "📅 Termeni plată", desc: "Extindere termen de plată" },
                { value: "volume", label: "📦 Bonus volum", desc: "Produse gratuite/bonus" },
                { value: "exclusive", label: "⭐ Exclusivitate", desc: "Exclusivitate zone/produse" }
              ].map((opt) => (
                <div
                  key={opt.value}
                  onClick={() => setNegotiationGoal(opt.value)}
                  className={`p-3 rounded cursor-pointer border text-center ${
                    negotiationGoal === opt.value
                      ? "border-teal-500 bg-teal-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <p className="font-medium text-sm">{opt.label}</p>
                  <p className="text-xs text-gray-500 mt-1">{opt.desc}</p>
                </div>
              ))}
            </div>

            <button
              onClick={generateStrategy}
              disabled={!selectedSupplier || analyzing}
              className="mt-4 w-full bg-teal-600 text-white py-3 rounded-lg font-medium hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {analyzing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Generez strategia...
                </>
              ) : (
                <>🎯 Generează Strategia de Negociere</>
              )}
            </button>
          </div>

          {/* Strategy result */}
          {strategy && (
            <div className="bg-white rounded-lg shadow p-5 space-y-5">
              {/* Overview */}
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">{strategy.supplier}</h2>
                  <p className="text-sm text-gray-600">{strategy.overallAssessment?.currentRelationship}</p>
                </div>
                <div className={`px-4 py-2 rounded-lg ${leverageColor(strategy.overallAssessment?.negotiationLeverage || "")}`}>
                  <p className="text-xs opacity-80">Putere de negociere</p>
                  <p className="font-bold capitalize">{strategy.overallAssessment?.negotiationLeverage}</p>
                </div>
              </div>

              <div className="bg-blue-50 rounded p-3">
                <p className="text-sm text-blue-800">
                  <strong>Abordare recomandată:</strong> {strategy.overallAssessment?.recommendedApproach}
                </p>
              </div>

              {/* Opening script */}
              <div className="bg-gray-50 rounded p-4">
                <p className="text-sm font-medium text-gray-700 mb-2">📝 Script deschidere:</p>
                <p className="text-sm italic text-gray-600">"{strategy.openingScript}"</p>
              </div>

              {/* Arguments */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-3">💡 Argumente de folosit:</p>
                <div className="grid gap-3">
                  {strategy.arguments?.map((arg, i) => (
                    <div key={i} className="bg-gray-50 rounded p-3">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-medium text-sm">{arg.argument}</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${strengthBadge(arg.strength)}`}>
                          {arg.strength}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600">{arg.usage}</p>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded mt-2 inline-block">
                        {arg.type}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tactics */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-3">🎭 Tactici:</p>
                <div className="space-y-2">
                  {strategy.tactics?.map((t, i) => (
                    <div key={i} className="border-l-4 border-teal-500 pl-3 py-1">
                      <p className="font-medium text-sm">{t.tactic}</p>
                      <p className="text-xs text-gray-500">Când: {t.when}</p>
                      <p className="text-xs text-green-600">Rezultat: {t.expectedOutcome}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Expected outcomes */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-3">📊 Rezultate așteptate:</p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-green-50 rounded p-3">
                    <p className="text-xs font-medium text-green-800">Best case</p>
                    <p className="text-lg font-bold text-green-600">{strategy.expectedOutcomes?.bestCase?.discount}</p>
                    <p className="text-xs text-green-700">{strategy.expectedOutcomes?.bestCase?.terms}</p>
                  </div>
                  <div className="bg-yellow-50 rounded p-3">
                    <p className="text-xs font-medium text-yellow-800">Likely case</p>
                    <p className="text-lg font-bold text-yellow-600">{strategy.expectedOutcomes?.likelyCase?.discount}</p>
                    <p className="text-xs text-yellow-700">{strategy.expectedOutcomes?.likelyCase?.terms}</p>
                  </div>
                  <div className="bg-red-50 rounded p-3">
                    <p className="text-xs font-medium text-red-800">Worst case</p>
                    <p className="text-lg font-bold text-red-600">{strategy.expectedOutcomes?.worstCase?.discount}</p>
                    <p className="text-xs text-red-700">{strategy.expectedOutcomes?.worstCase?.terms}</p>
                  </div>
                </div>
              </div>

              {/* Objection handlers */}
              {strategy.responseHandlers?.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-3">🛡️ Răspunsuri la obiecții:</p>
                  <div className="space-y-2">
                    {strategy.responseHandlers.map((h, i) => (
                      <div key={i} className="bg-orange-50 rounded p-3">
                        <p className="text-sm font-medium text-orange-800">Obiecție: "{h.objection}"</p>
                        <p className="text-sm text-gray-700 mt-1">→ {h.response}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Warnings */}
              {strategy.warnings?.length > 0 && (
                <div className="bg-red-50 rounded p-3">
                  <p className="text-sm font-medium text-red-800 mb-1">⚠️ Atenție:</p>
                  <ul className="text-xs text-red-700 space-y-0.5">
                    {strategy.warnings.map((w, i) => (
                      <li key={i}>• {w}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {!strategy && !analyzing && (
            <div className="bg-white rounded-lg shadow p-10 text-center">
              <div className="text-6xl mb-4">🤝</div>
              <p className="text-gray-500">Selectează un furnizor și obiectivul</p>
              <p className="text-gray-400 text-sm mt-1">pentru a genera strategia de negociere</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
