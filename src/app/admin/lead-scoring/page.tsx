"use client";
import { useState, useEffect } from "react";

export default function LeadScoringPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [filterTier, setFilterTier] = useState("all");

  useEffect(() => {
    fetch("/admin/api/ai-lead-scoring")
      .then(res => res.json())
      .then(data => {
        setLeads(data.leads || []);
        setStats(data.stats);
        setLoading(false);
      });
  }, []);

  const analyzeLead = async (email: string) => {
    setAnalyzing(true);
    try {
      const res = await fetch("/admin/api/ai-lead-scoring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      setSelectedLead(data);
    } catch (e) {
      console.error(e);
    }
    setAnalyzing(false);
  };

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case "A":
        return <span className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-bold">A</span>;
      case "B":
        return <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-bold">B</span>;
      case "C":
        return <span className="bg-yellow-500 text-white px-3 py-1 rounded-full text-sm font-bold">C</span>;
      default:
        return <span className="bg-gray-400 text-white px-3 py-1 rounded-full text-sm font-bold">D</span>;
    }
  };

  const filteredLeads = filterTier === "all" ? leads : leads.filter(l => l.tier === filterTier);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">📊 Lead Scoring AI</h1>
      <p className="text-gray-600 mb-6">Clasificare și scoring clienți potențiali</p>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{stats?.totalLeads || 0}</p>
          <p className="text-gray-600 text-sm">Total Lead-uri</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <p className="text-2xl font-bold text-purple-600">{stats?.avgScore || 0}</p>
          <p className="text-gray-600 text-sm">Scor Mediu</p>
        </div>
        <button
          onClick={() => setFilterTier("A")}
          className={`rounded-lg shadow p-4 text-center transition ${filterTier === "A" ? "ring-2 ring-green-500" : ""} bg-green-50`}
        >
          <p className="text-2xl font-bold text-green-600">{stats?.tierA || 0}</p>
          <p className="text-gray-600 text-sm">Tier A</p>
        </button>
        <button
          onClick={() => setFilterTier("B")}
          className={`rounded-lg shadow p-4 text-center transition ${filterTier === "B" ? "ring-2 ring-blue-500" : ""} bg-blue-50`}
        >
          <p className="text-2xl font-bold text-blue-600">{stats?.tierB || 0}</p>
          <p className="text-gray-600 text-sm">Tier B</p>
        </button>
        <button
          onClick={() => setFilterTier("C")}
          className={`rounded-lg shadow p-4 text-center transition ${filterTier === "C" ? "ring-2 ring-yellow-500" : ""} bg-yellow-50`}
        >
          <p className="text-2xl font-bold text-yellow-600">{stats?.tierC || 0}</p>
          <p className="text-gray-600 text-sm">Tier C</p>
        </button>
        <button
          onClick={() => setFilterTier("D")}
          className={`rounded-lg shadow p-4 text-center transition ${filterTier === "D" ? "ring-2 ring-gray-500" : ""} bg-gray-50`}
        >
          <p className="text-2xl font-bold text-gray-600">{stats?.tierD || 0}</p>
          <p className="text-gray-600 text-sm">Tier D</p>
        </button>
      </div>

      {filterTier !== "all" && (
        <button onClick={() => setFilterTier("all")} className="mb-4 text-blue-600 text-sm hover:underline">
          ← Arată toate lead-urile
        </button>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leads List */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b">
            <h3 className="font-semibold">Lead-uri ({filteredLeads.length})</h3>
          </div>
          <div className="divide-y max-h-[600px] overflow-y-auto">
            {filteredLeads.map(lead => (
              <div
                key={lead.email}
                onClick={() => analyzeLead(lead.email)}
                className={`p-4 cursor-pointer hover:bg-gray-50 ${
                  selectedLead?.lead?.email === lead.email ? "bg-blue-50" : ""
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    {getTierBadge(lead.tier)}
                    <div>
                      <p className="font-medium">{lead.name || lead.email}</p>
                      {lead.company && <p className="text-sm text-gray-500">{lead.company}</p>}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">{lead.score}</div>
                    <p className="text-xs text-gray-500">scor</p>
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-gray-50 rounded p-1 text-center">
                    <span className="text-gray-600">{lead.ordersCount} comenzi</span>
                  </div>
                  <div className="bg-gray-50 rounded p-1 text-center">
                    <span className="text-gray-600">{lead.totalValue?.toFixed(0)} RON</span>
                  </div>
                  <div className="bg-gray-50 rounded p-1 text-center">
                    <span className="text-gray-600">{lead.daysSinceLast}z de la ultima</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Lead Analysis */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b">
            <h3 className="font-semibold">Analiză AI Lead</h3>
          </div>
          
          {analyzing ? (
            <div className="p-8 text-center">
              <div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600">Analizez lead-ul...</p>
            </div>
          ) : selectedLead?.aiAnalysis ? (
            <div className="p-4 space-y-4 max-h-[600px] overflow-y-auto">
              {/* Lead Profile */}
              {selectedLead.aiAnalysis.leadProfile && (
                <div className="bg-blue-50 rounded-lg p-3">
                  <h4 className="font-medium text-blue-800 mb-2">👤 Profil Lead</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-600">Segment: </span>
                      <span className="font-medium">{selectedLead.aiAnalysis.leadProfile.segment}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Industrie: </span>
                      <span className="font-medium">{selectedLead.aiAnalysis.leadProfile.industry}</span>
                    </div>
                  </div>
                  <p className="text-sm mt-2 text-gray-700">{selectedLead.aiAnalysis.leadProfile.buyerPersona}</p>
                  <p className="text-xs mt-1 text-gray-500">
                    Pattern achiziții: {selectedLead.aiAnalysis.leadProfile.purchasingPattern}
                  </p>
                </div>
              )}

              {/* Behavior */}
              {selectedLead.aiAnalysis.behavior && (
                <div className="bg-purple-50 rounded-lg p-3">
                  <h4 className="font-medium text-purple-800 mb-2">📈 Comportament</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-600">Loialitate: </span>
                      <span className={`font-medium ${
                        selectedLead.aiAnalysis.behavior.loyaltyLevel === "high" ? "text-green-600" :
                        selectedLead.aiAnalysis.behavior.loyaltyLevel === "medium" ? "text-yellow-600" : "text-red-600"
                      }`}>
                        {selectedLead.aiAnalysis.behavior.loyaltyLevel}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Sensibilitate preț: </span>
                      <span className="font-medium">{selectedLead.aiAnalysis.behavior.pricesSensitivity}</span>
                    </div>
                  </div>
                  <p className="text-sm mt-2 text-gray-700">Focus: {selectedLead.aiAnalysis.behavior.productFocus}</p>
                </div>
              )}

              {/* Potential */}
              {selectedLead.aiAnalysis.potential && (
                <div className="bg-green-50 rounded-lg p-3">
                  <h4 className="font-medium text-green-800 mb-2">💰 Potențial</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-600">LTV estimat: </span>
                      <span className="font-bold text-green-600">{selectedLead.aiAnalysis.potential.lifetimeValue}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Creștere: </span>
                      <span className="font-medium">{selectedLead.aiAnalysis.potential.growthPotential}</span>
                    </div>
                  </div>
                  {selectedLead.aiAnalysis.potential.crossSellProducts && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-600">Cross-sell recomandat:</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedLead.aiAnalysis.potential.crossSellProducts.map((p: string, i: number) => (
                          <span key={i} className="bg-green-100 px-2 py-0.5 rounded text-xs">{p}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Engagement */}
              {selectedLead.aiAnalysis.engagement && (
                <div className={`rounded-lg p-3 ${
                  selectedLead.aiAnalysis.engagement.riskOfChurn === "high" ? "bg-red-50" :
                  selectedLead.aiAnalysis.engagement.riskOfChurn === "medium" ? "bg-yellow-50" : "bg-gray-50"
                }`}>
                  <h4 className="font-medium mb-2">⚠️ Risc Churn: {selectedLead.aiAnalysis.engagement.riskOfChurn}</h4>
                  {selectedLead.aiAnalysis.engagement.recommendedActions && (
                    <div className="space-y-2">
                      {selectedLead.aiAnalysis.engagement.recommendedActions.map((action: any, i: number) => (
                        <div key={i} className="bg-white rounded p-2 text-sm">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-xs ${
                              action.priority === "high" ? "bg-red-200" : "bg-gray-200"
                            }`}>
                              {action.priority}
                            </span>
                            <span className="font-medium">{action.action}</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">{action.expectedImpact}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Next Best Action */}
              {selectedLead.aiAnalysis.nextBestAction && (
                <div className="bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg p-4">
                  <h4 className="font-medium text-gray-800 mb-2">🎯 Acțiunea Următoare Recomandată</h4>
                  <p className="font-bold text-lg">{selectedLead.aiAnalysis.nextBestAction.action}</p>
                  <div className="flex gap-4 mt-2 text-sm text-gray-600">
                    <span>📅 {selectedLead.aiAnalysis.nextBestAction.timing}</span>
                    <span>📱 {selectedLead.aiAnalysis.nextBestAction.channel}</span>
                  </div>
                </div>
              )}

              {/* Top Products */}
              {selectedLead.topProducts && selectedLead.topProducts.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <h4 className="font-medium mb-2">🛒 Produse cumpărate frecvent</h4>
                  <div className="space-y-1 text-sm">
                    {selectedLead.topProducts.slice(0, 5).map((p: any, i: number) => (
                      <div key={i} className="flex justify-between">
                        <span>{p.name}</span>
                        <span className="text-gray-500">{p.quantity} buc</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">
              <p className="text-4xl mb-3">📊</p>
              <p>Selectează un lead pentru analiză AI</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
