"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function ReorderPredictorPage() {
  const [predictions, setPredictions] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPrediction, setSelectedPrediction] = useState<any>(null);
  const [outreach, setOutreach] = useState<any>(null);
  const [generating, setGenerating] = useState(false);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    loadPredictions();
  }, []);

  async function loadPredictions() {
    setLoading(true);
    try {
      const res = await fetch("/admin/api/ai-reorder-predictor");
      const data = await res.json();
      setPredictions(data.predictions || []);
      setStats(data.stats);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  async function generateOutreach(prediction: any) {
    setSelectedPrediction(prediction);
    setGenerating(true);
    try {
      const res = await fetch("/admin/api/ai-reorder-predictor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prediction })
      });
      const data = await res.json();
      setOutreach(data.outreach);
    } catch (e) {
      console.error(e);
    }
    setGenerating(false);
  }

  const filtered = filter 
    ? predictions.filter(p => p.urgency === filter)
    : predictions;

  const urgencyColors: Record<string, string> = {
    OVERDUE: "bg-red-100 border-red-400",
    URGENT: "bg-orange-100 border-orange-400",
    SOON: "bg-yellow-100 border-yellow-400",
    MEDIUM: "bg-blue-100 border-blue-400",
    LOW: "bg-green-100 border-green-400"
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <Link href="/admin/ai-hub" className="text-blue-600 hover:underline text-sm">
          ← Înapoi la AI Hub
        </Link>
        <h1 className="text-2xl font-bold mt-2">🔄 Predictor Recomandă</h1>
        <p className="text-gray-600">Prezice când clienții vor recomanda produse</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-gray-100 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold">{stats.totalPredictions}</div>
            <div className="text-sm text-gray-600">Total Predicții</div>
          </div>
          <div className="bg-red-100 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-red-700">{stats.overdue}</div>
            <div className="text-sm text-red-600">Overdue</div>
          </div>
          <div className="bg-orange-100 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-orange-700">{stats.urgent}</div>
            <div className="text-sm text-orange-600">Urgent</div>
          </div>
          <div className="bg-yellow-100 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-yellow-700">{stats.soon}</div>
            <div className="text-sm text-yellow-600">Curând</div>
          </div>
          <div className="bg-green-100 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-green-700">{stats.potentialRevenue?.toLocaleString()}</div>
            <div className="text-sm text-green-600">RON Potențial</div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-6">
        {["", "OVERDUE", "URGENT", "SOON", "MEDIUM"].map(u => (
          <button
            key={u}
            onClick={() => setFilter(u)}
            className={`px-3 py-1 rounded text-sm ${
              filter === u ? "bg-blue-600 text-white" : "bg-gray-200 hover:bg-gray-300"
            }`}
          >
            {u || "Toate"}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h3 className="font-semibold mb-3">📦 Predicții Recomandă</h3>
          
          {loading ? (
            <div className="text-center py-10">Se încarcă...</div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {filtered.map((pred, i) => (
                <div
                  key={i}
                  onClick={() => generateOutreach(pred)}
                  className={`border-2 rounded-lg p-4 cursor-pointer hover:shadow-md transition ${
                    urgencyColors[pred.urgency]
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold">{pred.clientName}</div>
                      <div className="text-sm text-gray-600">{pred.clientCompany}</div>
                      <div className="text-sm mt-1">{pred.productName}</div>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-1 text-xs text-white rounded ${
                        pred.urgency === "OVERDUE" ? "bg-red-600" :
                        pred.urgency === "URGENT" ? "bg-orange-500" :
                        pred.urgency === "SOON" ? "bg-yellow-500" : "bg-blue-500"
                      }`}>
                        {pred.urgency}
                      </span>
                      <div className="text-sm mt-1">
                        {pred.daysUntilReorder < 0 
                          ? `${Math.abs(pred.daysUntilReorder)} zile întârziere`
                          : `în ${pred.daysUntilReorder} zile`}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-3 text-xs text-center">
                    <div className="bg-white bg-opacity-50 p-1 rounded">
                      <div className="font-bold">{pred.purchaseCount}x</div>
                      <div>Achiziții</div>
                    </div>
                    <div className="bg-white bg-opacity-50 p-1 rounded">
                      <div className="font-bold">{pred.avgIntervalDays}</div>
                      <div>Zile interval</div>
                    </div>
                    <div className="bg-white bg-opacity-50 p-1 rounded">
                      <div className="font-bold">{pred.confidence}%</div>
                      <div>Încredere</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 className="font-semibold mb-3">📧 Outreach AI</h3>
          
          {!selectedPrediction ? (
            <div className="bg-gray-100 rounded-lg p-10 text-center text-gray-500">
              Selectează o predicție pentru a genera email de follow-up
            </div>
          ) : generating ? (
            <div className="text-center py-10">Se generează...</div>
          ) : outreach ? (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-800 mb-2">📧 Email Generat</h4>
                <div className="bg-white p-3 rounded text-sm">
                  <div className="font-medium mb-2">Subiect: {outreach.emailSubject}</div>
                  <div className="whitespace-pre-line">{outreach.emailBody}</div>
                </div>
              </div>

              {outreach.specialOffer && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-semibold text-green-800 mb-2">🎁 Ofertă Specială</h4>
                  <div className="text-sm">
                    <div><strong>Tip:</strong> {outreach.specialOffer.type}</div>
                    <div><strong>Valoare:</strong> {outreach.specialOffer.value}</div>
                    <div><strong>Valabil:</strong> {outreach.specialOffer.validUntil}</div>
                  </div>
                </div>
              )}

              {outreach.callScript && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h4 className="font-semibold text-purple-800 mb-2">📞 Script Telefon</h4>
                  <div className="text-sm whitespace-pre-line">{outreach.callScript}</div>
                </div>
              )}

              <div className="text-xs text-gray-500">
                Cel mai bun moment pentru contact: {outreach.bestContactTime}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
