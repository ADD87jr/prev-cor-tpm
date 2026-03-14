"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Client {
  email: string;
  name: string;
  company: string;
  tier: string;
  totalOrders: number;
  totalValue: number;
  avgOrderValue: number;
  maxDiscount: number;
  products: string[];
}

export default function QuoteNegotiationPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [requestedDiscount, setRequestedDiscount] = useState("");
  const [dealContext, setDealContext] = useState("");
  const [strategy, setStrategy] = useState<any>(null);
  const [strategizing, setStrategizing] = useState(false);
  const [filterTier, setFilterTier] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadClients();
  }, []);

  async function loadClients() {
    setLoading(true);
    try {
      const res = await fetch("/admin/api/ai-quote-negotiation");
      const data = await res.json();
      setClients(data.clients || []);
      setStats(data.stats);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  async function generateStrategy() {
    if (!selectedClient) return;
    setStrategizing(true);
    try {
      const res = await fetch("/admin/api/ai-quote-negotiation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientEmail: selectedClient.email,
          requestedDiscount: requestedDiscount ? parseFloat(requestedDiscount) : null,
          dealContext
        })
      });
      const data = await res.json();
      setStrategy(data);
    } catch (e) {
      console.error(e);
    }
    setStrategizing(false);
  }

  const filteredClients = clients.filter(c => {
    const matchesTier = !filterTier || c.tier === filterTier;
    const matchesSearch = !searchTerm || 
      c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.company?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesTier && matchesSearch;
  });

  const tierColors: Record<string, string> = {
    PLATINUM: "bg-purple-100 text-purple-800 border-purple-200",
    GOLD: "bg-yellow-100 text-yellow-800 border-yellow-200",
    SILVER: "bg-gray-200 text-gray-700 border-gray-300",
    BRONZE: "bg-orange-100 text-orange-700 border-orange-200"
  };

  const tierBadgeColors: Record<string, string> = {
    PLATINUM: "bg-purple-600",
    GOLD: "bg-yellow-500",
    SILVER: "bg-gray-400",
    BRONZE: "bg-orange-500"
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/admin/ai-hub" className="text-blue-600 hover:underline text-sm">
            ← Înapoi la AI Hub
          </Link>
          <h1 className="text-2xl font-bold mt-2">💬 Negociere Oferte AI</h1>
          <p className="text-gray-600">Strategii de negociere personalizate per client</p>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-gray-100 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold">{stats.totalClients}</div>
            <div className="text-sm text-gray-600">Total Clienți</div>
          </div>
          <div className="bg-purple-100 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-purple-700">{stats.platinum}</div>
            <div className="text-sm text-purple-600">Platinum</div>
          </div>
          <div className="bg-yellow-100 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-yellow-700">{stats.gold}</div>
            <div className="text-sm text-yellow-600">Gold</div>
          </div>
          <div className="bg-gray-200 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-gray-700">{stats.silver}</div>
            <div className="text-sm text-gray-600">Silver</div>
          </div>
          <div className="bg-orange-100 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-orange-700">{stats.bronze}</div>
            <div className="text-sm text-orange-600">Bronze</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Client List */}
        <div className="lg:col-span-1">
          <div className="bg-white border rounded-lg p-4">
            <h3 className="font-semibold mb-3">👥 Selectează Client</h3>
            
            <input
              type="text"
              placeholder="Caută client..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border rounded mb-3"
            />
            
            <div className="flex gap-2 mb-3 flex-wrap">
              {["", "PLATINUM", "GOLD", "SILVER", "BRONZE"].map(tier => (
                <button
                  key={tier}
                  onClick={() => setFilterTier(tier)}
                  className={`px-2 py-1 text-xs rounded ${
                    filterTier === tier ? "bg-blue-600 text-white" : "bg-gray-200"
                  }`}
                >
                  {tier || "Toate"}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="text-center py-4">Se încarcă...</div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredClients.map(client => (
                  <div
                    key={client.email}
                    onClick={() => { setSelectedClient(client); setStrategy(null); }}
                    className={`p-3 border rounded cursor-pointer hover:bg-gray-50 ${
                      selectedClient?.email === client.email ? "border-blue-500 bg-blue-50" : ""
                    } ${tierColors[client.tier]}`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium">{client.name}</div>
                        <div className="text-xs">{client.company}</div>
                      </div>
                      <span className={`px-2 py-0.5 text-xs text-white rounded ${tierBadgeColors[client.tier]}`}>
                        {client.tier}
                      </span>
                    </div>
                    <div className="text-xs mt-1">
                      {client.totalValue?.toLocaleString()} RON | {client.totalOrders} comenzi
                    </div>
                    <div className="text-xs text-gray-600">
                      Max discount: {client.maxDiscount}%
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Negotiation Panel */}
        <div className="lg:col-span-2">
          {!selectedClient ? (
            <div className="bg-gray-100 rounded-lg p-10 text-center text-gray-500">
              <div className="text-6xl mb-4">💬</div>
              <p>Selectează un client pentru a genera strategia de negociere</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Client Info */}
              <div className={`p-4 rounded-lg border-2 ${tierColors[selectedClient.tier]}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-bold">{selectedClient.name}</h2>
                    <div className="text-sm">{selectedClient.company}</div>
                    <div className="text-sm text-gray-600">{selectedClient.email}</div>
                  </div>
                  <div className="text-right">
                    <span className={`px-3 py-1 text-white rounded ${tierBadgeColors[selectedClient.tier]}`}>
                      {selectedClient.tier}
                    </span>
                    <div className="mt-2 text-sm">
                      Max discount: <strong>{selectedClient.maxDiscount}%</strong>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div className="text-center bg-white bg-opacity-50 p-2 rounded">
                    <div className="font-bold">{selectedClient.totalValue?.toLocaleString()}</div>
                    <div className="text-xs">RON Total</div>
                  </div>
                  <div className="text-center bg-white bg-opacity-50 p-2 rounded">
                    <div className="font-bold">{selectedClient.totalOrders}</div>
                    <div className="text-xs">Comenzi</div>
                  </div>
                  <div className="text-center bg-white bg-opacity-50 p-2 rounded">
                    <div className="font-bold">{selectedClient.avgOrderValue?.toLocaleString()}</div>
                    <div className="text-xs">RON Medie</div>
                  </div>
                </div>
              </div>

              {/* Negotiation Form */}
              <div className="bg-white border rounded-lg p-4">
                <h3 className="font-semibold mb-3">📋 Parametri Negociere</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Discount cerut de client (%)</label>
                    <input
                      type="number"
                      value={requestedDiscount}
                      onChange={(e) => setRequestedDiscount(e.target.value)}
                      placeholder="ex: 15"
                      className="w-full px-3 py-2 border rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Context negociere</label>
                    <input
                      type="text"
                      value={dealContext}
                      onChange={(e) => setDealContext(e.target.value)}
                      placeholder="ex: Comandă mare, client nou..."
                      className="w-full px-3 py-2 border rounded"
                    />
                  </div>
                </div>
                <button
                  onClick={generateStrategy}
                  disabled={strategizing}
                  className="mt-4 w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
                >
                  {strategizing ? "Se generează..." : "🤖 Generează Strategie AI"}
                </button>
              </div>

              {/* Strategy Results */}
              {strategy && strategy.strategy && (
                <div className="space-y-4">
                  {/* Recommendation */}
                  <div className={`p-4 rounded-lg border-2 ${
                    strategy.strategy.recommendation === "ACCEPT" ? "bg-green-50 border-green-300" :
                    strategy.strategy.recommendation === "COUNTER" ? "bg-yellow-50 border-yellow-300" :
                    "bg-red-50 border-red-300"
                  }`}>
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">
                        {strategy.strategy.recommendation === "ACCEPT" ? "✅" :
                         strategy.strategy.recommendation === "COUNTER" ? "🔄" : "❌"}
                      </span>
                      <div>
                        <div className="font-bold text-lg">{strategy.strategy.recommendation}</div>
                        <div className="text-sm">
                          Discount sugerat: <strong>{strategy.strategy.suggestedDiscount}%</strong>
                        </div>
                      </div>
                    </div>
                    <p className="mt-2 text-sm">{strategy.strategy.reasoning}</p>
                  </div>

                  {/* Negotiation Script */}
                  {strategy.strategy.negotiationScript && (
                    <div className="bg-white border rounded-lg p-4">
                      <h4 className="font-semibold mb-3">🎯 Script Negociere</h4>
                      <div className="space-y-3 text-sm">
                        <div className="bg-blue-50 p-3 rounded">
                          <div className="font-medium text-blue-800">Deschidere</div>
                          <p>{strategy.strategy.negotiationScript.opening}</p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded">
                          <div className="font-medium">Argumente principale</div>
                          <ul className="list-disc ml-4 mt-1">
                            {strategy.strategy.negotiationScript.mainArguments?.map((arg: string, i: number) => (
                              <li key={i}>{arg}</li>
                            ))}
                          </ul>
                        </div>
                        {strategy.strategy.negotiationScript.counterOffer && (
                          <div className="bg-yellow-50 p-3 rounded">
                            <div className="font-medium text-yellow-800">Counter-offer</div>
                            <p>{strategy.strategy.negotiationScript.counterOffer}</p>
                          </div>
                        )}
                        <div className="bg-green-50 p-3 rounded">
                          <div className="font-medium text-green-800">Închidere</div>
                          <p>{strategy.strategy.negotiationScript.closing}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Risk Assessment */}
                  {strategy.strategy.riskAssessment && (
                    <div className="bg-white border rounded-lg p-4">
                      <h4 className="font-semibold mb-3">⚠️ Evaluare Risc</h4>
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div className={`p-3 rounded ${
                          strategy.strategy.riskAssessment.churnRisk === "HIGH" ? "bg-red-100" :
                          strategy.strategy.riskAssessment.churnRisk === "MEDIUM" ? "bg-yellow-100" : "bg-green-100"
                        }`}>
                          <div className="text-xs font-medium">Risc Pierdere</div>
                          <div className="font-bold">{strategy.strategy.riskAssessment.churnRisk}</div>
                        </div>
                        <div className={`p-3 rounded ${
                          strategy.strategy.riskAssessment.competitorThreat ? "bg-red-100" : "bg-green-100"
                        }`}>
                          <div className="text-xs font-medium">Amenințare Concurență</div>
                          <div className="font-bold">
                            {strategy.strategy.riskAssessment.competitorThreat ? "DA" : "NU"}
                          </div>
                        </div>
                        <div className={`p-3 rounded ${
                          strategy.strategy.riskAssessment.strategicValue === "HIGH" ? "bg-green-100" :
                          strategy.strategy.riskAssessment.strategicValue === "MEDIUM" ? "bg-yellow-100" : "bg-gray-100"
                        }`}>
                          <div className="text-xs font-medium">Valoare Strategică</div>
                          <div className="font-bold">{strategy.strategy.riskAssessment.strategicValue}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Upsell */}
                  {strategy.strategy.upsellOpportunities?.length > 0 && (
                    <div className="bg-white border rounded-lg p-4">
                      <h4 className="font-semibold mb-3">💡 Oportunități Upsell</h4>
                      <div className="space-y-2">
                        {strategy.strategy.upsellOpportunities.map((opp: any, i: number) => (
                          <div key={i} className="bg-purple-50 p-3 rounded">
                            <div className="font-medium">{opp.product}</div>
                            <div className="text-sm text-gray-600">{opp.reason}</div>
                            {opp.discount && (
                              <div className="text-xs text-purple-600 mt-1">
                                Discount special: {opp.discount}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Alternative Deals */}
                  {strategy.strategy.alternativeDeals?.length > 0 && (
                    <div className="bg-white border rounded-lg p-4">
                      <h4 className="font-semibold mb-3">🔄 Deal-uri Alternative</h4>
                      <div className="space-y-2">
                        {strategy.strategy.alternativeDeals.map((deal: any, i: number) => (
                          <div key={i} className="bg-gray-50 p-3 rounded flex justify-between">
                            <div>
                              <div className="font-medium">{deal.description}</div>
                              <div className="text-xs text-gray-600">{deal.conditions}</div>
                            </div>
                            <div className="text-lg font-bold text-green-600">
                              {deal.discount}%
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
