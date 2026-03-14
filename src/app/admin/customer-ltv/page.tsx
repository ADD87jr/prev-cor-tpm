"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Client {
  email: string;
  name: string;
  company: string;
  metrics: any;
  ltv: any;
  scores: any;
  segment: string;
  acquisitionCostSuggestion: number;
}

export default function CustomerLTVPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [filterSegment, setFilterSegment] = useState("");

  useEffect(() => {
    loadClients();
  }, []);

  async function loadClients() {
    setLoading(true);
    try {
      const res = await fetch("/admin/api/ai-customer-ltv");
      const data = await res.json();
      setClients(data.clients || []);
      setStats(data.stats);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  async function analyzeClient(client: Client) {
    setSelectedClient(client);
    setAnalyzing(true);
    try {
      const res = await fetch("/admin/api/ai-customer-ltv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client })
      });
      const data = await res.json();
      setAnalysis(data.analysis);
    } catch (e) {
      console.error(e);
    }
    setAnalyzing(false);
  }

  const filteredClients = filterSegment 
    ? clients.filter(c => c.segment === filterSegment)
    : clients;

  const segmentColors: Record<string, string> = {
    VIP: "bg-purple-100 border-purple-400",
    HIGH_VALUE: "bg-green-100 border-green-400",
    GROWING: "bg-blue-100 border-blue-400",
    NEW: "bg-yellow-100 border-yellow-400",
    AT_RISK: "bg-red-100 border-red-400",
    STANDARD: "bg-gray-100 border-gray-400"
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <Link href="/admin/ai-hub" className="text-blue-600 hover:underline text-sm">
          ← Înapoi la AI Hub
        </Link>
        <h1 className="text-2xl font-bold mt-2">💎 Customer Lifetime Value</h1>
        <p className="text-gray-600">Analizează valoarea pe termen lung a clienților</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-gray-100 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold">{stats.totalClients}</div>
            <div className="text-sm text-gray-600">Total Clienți</div>
          </div>
          <div className="bg-purple-100 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-purple-700">{stats.vipCount}</div>
            <div className="text-sm text-purple-600">VIP</div>
          </div>
          <div className="bg-green-100 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-green-700">{stats.avgLTV?.toLocaleString()}</div>
            <div className="text-sm text-green-600">LTV Mediu</div>
          </div>
          <div className="bg-blue-100 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-blue-700">{stats.totalLTV?.toLocaleString()}</div>
            <div className="text-sm text-blue-600">Total LTV</div>
          </div>
          <div className="bg-red-100 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-red-700">{stats.atRiskCount}</div>
            <div className="text-sm text-red-600">La Risc</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {["", "VIP", "HIGH_VALUE", "GROWING", "NEW", "AT_RISK"].map(seg => (
          <button
            key={seg}
            onClick={() => setFilterSegment(seg)}
            className={`px-3 py-1 rounded text-sm ${
              filterSegment === seg ? "bg-blue-600 text-white" : "bg-gray-200 hover:bg-gray-300"
            }`}
          >
            {seg || "Toți"}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Client List */}
        <div>
          <h3 className="font-semibold mb-3">👥 Clienți ({filteredClients.length})</h3>
          
          {loading ? (
            <div className="text-center py-10">Se încarcă...</div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {filteredClients.map(client => (
                <div
                  key={client.email}
                  onClick={() => analyzeClient(client)}
                  className={`border-2 rounded-lg p-4 cursor-pointer hover:shadow-md transition ${
                    segmentColors[client.segment]
                  } ${selectedClient?.email === client.email ? "ring-2 ring-blue-500" : ""}`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold">{client.name || client.email}</div>
                      <div className="text-sm text-gray-600">{client.company}</div>
                      <span className="inline-block mt-1 px-2 py-0.5 bg-gray-600 text-white text-xs rounded">
                        {client.segment}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">{client.ltv.predictedLTV?.toLocaleString()} RON</div>
                      <div className="text-xs text-gray-600">LTV Predictiv</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2 mt-3 text-xs text-center">
                    <div className="bg-white bg-opacity-50 p-1 rounded">
                      <div className="font-bold">{client.metrics.totalRevenue?.toLocaleString()}</div>
                      <div>Total</div>
                    </div>
                    <div className="bg-white bg-opacity-50 p-1 rounded">
                      <div className="font-bold">{client.metrics.orderCount}</div>
                      <div>Comenzi</div>
                    </div>
                    <div className="bg-white bg-opacity-50 p-1 rounded">
                      <div className="font-bold">{client.scores.overall}</div>
                      <div>Scor</div>
                    </div>
                    <div className="bg-white bg-opacity-50 p-1 rounded">
                      <div className="font-bold">{client.acquisitionCostSuggestion?.toLocaleString()}</div>
                      <div>CAC Max</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Analysis */}
        <div>
          <h3 className="font-semibold mb-3">🤖 Strategie Maximizare LTV</h3>
          
          {!selectedClient ? (
            <div className="bg-gray-100 rounded-lg p-10 text-center text-gray-500">
              Selectează un client pentru analiză
            </div>
          ) : analyzing ? (
            <div className="text-center py-10">Se analizează...</div>
          ) : analysis ? (
            <div className="space-y-4">
              {analysis.growthStrategies && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-semibold text-green-800 mb-2">📈 Strategii Creștere</h4>
                  <div className="space-y-2">
                    {analysis.growthStrategies.map((s: any, i: number) => (
                      <div key={i} className="bg-white p-2 rounded text-sm">
                        <div className="font-medium">{s.strategy}</div>
                        <div className="text-xs text-gray-600">
                          Impact: {s.expectedImpact} | Efort: {s.effort}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {analysis.upsellOpportunities && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h4 className="font-semibold text-purple-800 mb-2">⬆️ Upsell</h4>
                  <ul className="list-disc ml-4 text-sm">
                    {analysis.upsellOpportunities.map((u: string, i: number) => (
                      <li key={i}>{u}</li>
                    ))}
                  </ul>
                </div>
              )}

              {analysis.communicationPlan && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-800 mb-2">📧 Plan Comunicare</h4>
                  <div className="text-sm">
                    <div><strong>Frecvență:</strong> {analysis.communicationPlan.frequency}</div>
                    <div><strong>Canale:</strong> {analysis.communicationPlan.channels?.join(", ")}</div>
                  </div>
                </div>
              )}

              {analysis.investmentRecommendation && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-semibold text-yellow-800 mb-2">💰 Recomandare Investiție</h4>
                  <div className="text-sm">
                    <div><strong>CAC Max:</strong> {analysis.investmentRecommendation.maxAcquisitionCost}</div>
                    <div><strong>Buget Discount:</strong> {analysis.investmentRecommendation.discountBudget}</div>
                    <div><strong>Prioritate:</strong> {analysis.investmentRecommendation.priorityLevel}</div>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
