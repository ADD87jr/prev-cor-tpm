"use client";

import { useState, useEffect } from "react";

interface ClientSegment {
  count: number;
  clients: Array<{
    email: string;
    name: string;
    company?: string;
    orders: number;
    totalSpent: number;
    avgOrderValue: number;
  }>;
}

interface Campaign {
  name: string;
  subject: string;
  headline: string;
  body: string;
  cta: string;
  offer?: string;
  timing: string;
  expectedOpenRate: number;
}

export default function AISegmentClientsPage() {
  const [segments, setSegments] = useState<Record<string, ClientSegment>>({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [insights, setInsights] = useState<string[]>([]);
  const [activeSegment, setActiveSegment] = useState<string | null>(null);
  const [totalClients, setTotalClients] = useState(0);

  useEffect(() => { loadSegments(); }, []);

  const loadSegments = async () => {
    setLoading(true);
    try {
      const res = await fetch("/admin/api/ai-segment-clients");
      const data = await res.json();
      setSegments(data.segments || {});
      setTotalClients(data.totalClients || 0);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const generateCampaign = async (segment: string) => {
    setGenerating(segment);
    setActiveSegment(segment);
    setCampaign(null);
    setInsights([]);

    try {
      const res = await fetch("/admin/api/ai-segment-clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ segment, generateCampaign: true })
      });
      const data = await res.json();
      setCampaign(data.campaign);
      setInsights(data.insights || []);
    } catch (e) {
      console.error(e);
    }
    setGenerating(null);
  };

  const segmentInfo: Record<string, { label: string; color: string; icon: string; description: string }> = {
    vip: { 
      label: "VIP", 
      color: "bg-purple-100 text-purple-700 border-purple-200",
      icon: "👑",
      description: "Clienți cu >10.000 RON sau 5+ comenzi"
    },
    regular: { 
      label: "Regulari", 
      color: "bg-blue-100 text-blue-700 border-blue-200",
      icon: "🔄",
      description: "2.000-10.000 RON și 2+ comenzi"
    },
    occasional: { 
      label: "Ocazionali", 
      color: "bg-gray-100 text-gray-700 border-gray-200",
      icon: "🎯",
      description: "1 comandă sau <2.000 RON"
    },
    inactive: { 
      label: "Inactivi", 
      color: "bg-red-100 text-red-700 border-red-200",
      icon: "💤",
      description: "Fără comenzi în ultimele 90 zile"
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">👥 AI Segmentare Clienți</h1>
      <p className="text-gray-600 mb-6">
        Analizează clienții pe segmente și generează campanii personalizate cu AI.
      </p>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          {/* Stats overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {Object.entries(segments).map(([key, segment]) => {
              const info = segmentInfo[key];
              return (
                <div 
                  key={key}
                  className={`rounded-lg border-2 p-4 cursor-pointer transition hover:shadow-md ${
                    activeSegment === key ? "ring-2 ring-blue-500" : ""
                  } ${info?.color || "bg-gray-100"}`}
                  onClick={() => generateCampaign(key)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl">{info?.icon}</span>
                    <span className="text-2xl font-bold">{segment.count}</span>
                  </div>
                  <h3 className="font-semibold">{info?.label || key}</h3>
                  <p className="text-xs opacity-75">{info?.description}</p>
                  {generating === key && (
                    <div className="mt-2 text-xs">Generez campanie...</div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Clienți din segment */}
            <div className="bg-white rounded-lg shadow p-5">
              <h2 className="text-lg font-semibold text-gray-700 mb-4">
                {activeSegment ? `Clienți ${segmentInfo[activeSegment]?.label}` : "Selectează un segment"}
              </h2>
              
              {activeSegment && segments[activeSegment] ? (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {segments[activeSegment].clients.map((client, i) => (
                    <div key={i} className="border rounded p-3 text-sm">
                      <div className="flex justify-between">
                        <div>
                          <p className="font-medium">{client.name || client.email}</p>
                          {client.company && <p className="text-gray-500">{client.company}</p>}
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600">{client.totalSpent.toLocaleString()} RON</p>
                          <p className="text-gray-500">{client.orders} comenzi</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  Click pe un segment pentru a vedea clienții.
                </p>
              )}
            </div>

            {/* Campanie generată */}
            <div className="bg-white rounded-lg shadow p-5">
              <h2 className="text-lg font-semibold text-gray-700 mb-4">
                📧 Campanie Email AI
              </h2>

              {generating ? (
                <div className="flex items-center justify-center py-10">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                  <span className="ml-3 text-gray-600">Generez campanie personalizată...</span>
                </div>
              ) : campaign ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-gray-500">Nume campanie</label>
                    <p className="font-semibold text-lg">{campaign.name}</p>
                  </div>

                  <div className="bg-blue-50 rounded p-3">
                    <label className="text-xs text-gray-500">Subiect email</label>
                    <p className="font-medium">{campaign.subject}</p>
                  </div>

                  <div>
                    <label className="text-xs text-gray-500">Titlu</label>
                    <p className="font-bold text-xl">{campaign.headline}</p>
                  </div>

                  <div>
                    <label className="text-xs text-gray-500">Conținut</label>
                    <p className="text-gray-700 whitespace-pre-line">{campaign.body}</p>
                  </div>

                  {campaign.offer && (
                    <div className="bg-green-50 rounded p-3">
                      <label className="text-xs text-gray-500">Ofertă</label>
                      <p className="font-semibold text-green-700">{campaign.offer}</p>
                    </div>
                  )}

                  <div className="flex gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">CTA:</span>
                      <span className="ml-1 font-medium">{campaign.cta}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Timing:</span>
                      <span className="ml-1">{campaign.timing}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Open rate estimat:</span>
                      <span className="ml-1 font-medium">{campaign.expectedOpenRate}%</span>
                    </div>
                  </div>

                  {insights.length > 0 && (
                    <div className="mt-4 border-t pt-4">
                      <label className="text-xs text-gray-500">Insights AI</label>
                      <ul className="list-disc list-inside text-sm text-gray-600 mt-1">
                        {insights.map((insight, i) => (
                          <li key={i}>{insight}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  Selectează un segment pentru a genera o campanie email personalizată.
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
