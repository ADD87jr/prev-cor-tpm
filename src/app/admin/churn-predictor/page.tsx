"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Client {
  email: string;
  name: string;
  company: string;
  totalSpent: number;
  orderCount: number;
  avgOrderValue: number;
  daysSinceLastOrder: number;
  churnScore: number;
  riskLevel: string;
  riskFactors: string[];
}

export default function ChurnPredictorPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [strategy, setStrategy] = useState<any>(null);
  const [strategizing, setStrategizing] = useState(false);
  const [filterRisk, setFilterRisk] = useState<string>("");

  useEffect(() => {
    loadClients();
  }, []);

  async function loadClients() {
    setLoading(true);
    try {
      const res = await fetch("/admin/api/ai-churn-predictor");
      const data = await res.json();
      setClients(data.clients || []);
      setStats(data.stats);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  async function generateStrategy(client: Client) {
    setSelectedClient(client);
    setStrategizing(true);
    try {
      const res = await fetch("/admin/api/ai-churn-predictor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client })
      });
      const data = await res.json();
      setStrategy(data.retentionStrategy);
    } catch (e) {
      console.error(e);
    }
    setStrategizing(false);
  }

  const filteredClients = filterRisk 
    ? clients.filter(c => c.riskLevel === filterRisk)
    : clients;

  const riskColors: Record<string, string> = {
    CRITICAL: "bg-red-100 border-red-400",
    HIGH: "bg-orange-100 border-orange-400",
    MEDIUM: "bg-yellow-100 border-yellow-400",
    LOW: "bg-green-100 border-green-400"
  };

  const riskBadge: Record<string, string> = {
    CRITICAL: "bg-red-600",
    HIGH: "bg-orange-500",
    MEDIUM: "bg-yellow-500",
    LOW: "bg-green-500"
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/admin/ai-hub" className="text-blue-600 hover:underline text-sm">
            ← Înapoi la AI Hub
          </Link>
          <h1 className="text-2xl font-bold mt-2">📉 Predictor Churn Clienți</h1>
          <p className="text-gray-600">Identifică clienții cu risc de plecare</p>
        </div>
        <button
          onClick={loadClients}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          🔄 Actualizează
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-gray-100 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold">{stats.totalClients}</div>
            <div className="text-sm text-gray-600">Total Clienți</div>
          </div>
          <div className="bg-red-100 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-red-700">{stats.critical}</div>
            <div className="text-sm text-red-600">Risc Critic</div>
          </div>
          <div className="bg-orange-100 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-orange-700">{stats.high}</div>
            <div className="text-sm text-orange-600">Risc Mare</div>
          </div>
          <div className="bg-yellow-100 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-yellow-700">{stats.medium}</div>
            <div className="text-sm text-yellow-600">Risc Mediu</div>
          </div>
          <div className="bg-purple-100 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-purple-700">
              {stats.potentialLostRevenue?.toLocaleString()}
            </div>
            <div className="text-sm text-purple-600">RON Risc Pierdere</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {["", "CRITICAL", "HIGH", "MEDIUM"].map(risk => (
          <button
            key={risk}
            onClick={() => setFilterRisk(risk)}
            className={`px-3 py-1 rounded text-sm ${
              filterRisk === risk ? "bg-blue-600 text-white" : "bg-gray-200 hover:bg-gray-300"
            }`}
          >
            {risk || "Toți"}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Client List */}
        <div>
          <h3 className="font-semibold mb-3">Clienți cu risc de plecare</h3>
          
          {loading ? (
            <div className="text-center py-10">Se analizează...</div>
          ) : filteredClients.length === 0 ? (
            <div className="text-center py-10 bg-green-50 rounded-lg">
              <div className="text-4xl mb-2">🎉</div>
              <p className="text-green-700">Nu sunt clienți cu risc de plecare!</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {filteredClients.map(client => (
                <div
                  key={client.email}
                  onClick={() => generateStrategy(client)}
                  className={`border-2 rounded-lg p-4 cursor-pointer hover:shadow-md transition ${
                    riskColors[client.riskLevel]
                  } ${selectedClient?.email === client.email ? "ring-2 ring-blue-500" : ""}`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold">{client.name}</div>
                      <div className="text-sm text-gray-600">{client.company}</div>
                      <div className="text-xs text-gray-500">{client.email}</div>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-0.5 text-xs text-white rounded ${riskBadge[client.riskLevel]}`}>
                        {client.churnScore}% risc
                      </span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 mt-3 text-center text-xs">
                    <div className="bg-white bg-opacity-50 p-1 rounded">
                      <div className="font-bold">{client.totalSpent?.toLocaleString()}</div>
                      <div>RON Total</div>
                    </div>
                    <div className="bg-white bg-opacity-50 p-1 rounded">
                      <div className="font-bold">{client.orderCount}</div>
                      <div>Comenzi</div>
                    </div>
                    <div className="bg-white bg-opacity-50 p-1 rounded">
                      <div className="font-bold">{client.daysSinceLastOrder}</div>
                      <div>Zile inactiv</div>
                    </div>
                  </div>

                  <div className="mt-2">
                    {client.riskFactors?.map((factor, i) => (
                      <span key={i} className="inline-block text-xs bg-white bg-opacity-50 px-2 py-0.5 rounded mr-1 mb-1">
                        ⚠️ {factor}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Retention Strategy */}
        <div>
          <h3 className="font-semibold mb-3">🤖 Strategie Reținere AI</h3>
          
          {!selectedClient ? (
            <div className="bg-gray-100 rounded-lg p-10 text-center text-gray-500">
              <div className="text-4xl mb-4">👆</div>
              <p>Selectează un client pentru a genera strategia de reținere</p>
            </div>
          ) : strategizing ? (
            <div className="text-center py-10">Se generează strategia...</div>
          ) : strategy ? (
            <div className="space-y-4">
              {/* Urgency */}
              <div className={`p-4 rounded-lg border-2 ${
                strategy.urgency === "IMMEDIATE" ? "bg-red-50 border-red-300" :
                strategy.urgency === "THIS_WEEK" ? "bg-orange-50 border-orange-300" :
                "bg-yellow-50 border-yellow-300"
              }`}>
                <div className="font-bold">⏰ Urgență: {strategy.urgency}</div>
                <div className="text-sm mt-1">
                  Canal: {strategy.retentionStrategy?.channel} | 
                  Timp: {strategy.retentionStrategy?.timing}
                </div>
              </div>

              {/* Personalized Offer */}
              {strategy.personalizedOffer && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-semibold text-green-800">🎁 Ofertă Personalizată</h4>
                  <div className="text-sm mt-2">
                    <div><strong>Tip:</strong> {strategy.personalizedOffer.type}</div>
                    <div><strong>Valoare:</strong> {strategy.personalizedOffer.value}</div>
                    <div><strong>Condiție:</strong> {strategy.personalizedOffer.condition}</div>
                    <div><strong>Valabilitate:</strong> {strategy.personalizedOffer.expiry}</div>
                  </div>
                </div>
              )}

              {/* Communication Script */}
              {strategy.communicationScript && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-800">📝 Script Comunicare</h4>
                  <div className="space-y-2 mt-2 text-sm">
                    {strategy.communicationScript.subject && (
                      <div className="bg-white p-2 rounded">
                        <strong>Subiect:</strong> {strategy.communicationScript.subject}
                      </div>
                    )}
                    <div className="bg-white p-2 rounded">
                      <strong>Deschidere:</strong> {strategy.communicationScript.opening}
                    </div>
                    <div className="bg-white p-2 rounded">
                      <strong>Mesaj:</strong> {strategy.communicationScript.mainMessage}
                    </div>
                    <div className="bg-white p-2 rounded">
                      <strong>Încheiere:</strong> {strategy.communicationScript.closing}
                    </div>
                    <div className="bg-green-100 p-2 rounded">
                      <strong>Call to Action:</strong> {strategy.communicationScript.callToAction}
                    </div>
                  </div>
                </div>
              )}

              {/* Follow-up Plan */}
              {strategy.followUpPlan && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h4 className="font-semibold text-purple-800">📅 Plan Follow-up</h4>
                  <div className="text-sm mt-2 space-y-1">
                    <div><strong>Dacă nu răspunde:</strong> {strategy.followUpPlan.if_no_response}</div>
                    <div><strong>Dacă refuză:</strong> {strategy.followUpPlan.if_declines}</div>
                    <div><strong>Timeline:</strong> {strategy.followUpPlan.timeline}</div>
                  </div>
                </div>
              )}

              {/* Success Metrics */}
              {strategy.successMetrics && (
                <div className="text-sm">
                  <strong>Metrici de succes:</strong>
                  <ul className="list-disc ml-4">
                    {strategy.successMetrics.map((m: string, i: number) => (
                      <li key={i}>{m}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
