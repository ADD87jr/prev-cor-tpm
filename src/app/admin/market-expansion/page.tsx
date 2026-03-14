"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function MarketExpansionPage() {
  const [currentMarkets, setCurrentMarkets] = useState<any[]>([]);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedOpportunity, setSelectedOpportunity] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch("/admin/api/ai-market-expansion");
      const data = await res.json();
      setCurrentMarkets(data.currentMarkets || []);
      setOpportunities(data.opportunities || []);
      setStats(data.stats);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  async function analyzeOpportunity(opportunity: any) {
    setSelectedOpportunity(opportunity);
    setAnalyzing(true);
    try {
      const res = await fetch("/admin/api/ai-market-expansion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opportunity, currentMarkets, stats })
      });
      const data = await res.json();
      setAnalysis(data.analysis);
    } catch (e) {
      console.error(e);
    }
    setAnalyzing(false);
  }

  const opportunityTypes: Record<string, { icon: string; color: string }> = {
    GEOGRAPHIC: { icon: "🗺️", color: "blue" },
    VERTICAL: { icon: "🏭", color: "purple" },
    PRODUCT: { icon: "📦", color: "green" },
    SEGMENT: { icon: "👥", color: "orange" }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <Link href="/admin/ai-hub" className="text-blue-600 hover:underline text-sm">
          ← Înapoi la AI Hub
        </Link>
        <h1 className="text-2xl font-bold mt-2">🚀 Market Expansion</h1>
        <p className="text-gray-600">Identifică oportunități de extindere</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-gray-100 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold">{stats.currentRegions}</div>
            <div className="text-sm text-gray-600">Regiuni Active</div>
          </div>
          <div className="bg-blue-100 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-blue-700">{stats.currentVerticals}</div>
            <div className="text-sm text-blue-600">Verticale</div>
          </div>
          <div className="bg-green-100 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-green-700">{stats.opportunitiesFound}</div>
            <div className="text-sm text-green-600">Oportunități</div>
          </div>
          <div className="bg-purple-100 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-purple-700">{stats.potentialRevenue?.toLocaleString()}</div>
            <div className="text-sm text-purple-600">RON Potențial</div>
          </div>
          <div className="bg-yellow-100 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-yellow-700">{stats.marketPenetration}%</div>
            <div className="text-sm text-yellow-600">Penetrare</div>
          </div>
        </div>
      )}

      {/* Current Markets Map */}
      <div className="bg-white border rounded-lg p-6 mb-6">
        <h3 className="font-semibold mb-4">🗺️ Piețe Curente</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {currentMarkets.map((market, i) => (
            <div key={i} className="bg-gray-50 p-3 rounded-lg">
              <div className="flex justify-between items-center">
                <div className="font-semibold">{market.name}</div>
                <span className={`text-xs px-1 rounded ${
                  market.penetration > 50 ? "bg-green-100 text-green-700" :
                  market.penetration > 20 ? "bg-yellow-100 text-yellow-700" :
                  "bg-red-100 text-red-700"
                }`}>
                  {market.penetration}%
                </span>
              </div>
              <div className="text-sm text-gray-600 mt-1">
                {market.revenue?.toLocaleString()} RON
              </div>
              <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${
                    market.penetration > 50 ? "bg-green-400" :
                    market.penetration > 20 ? "bg-yellow-400" : "bg-red-400"
                  }`}
                  style={{ width: `${market.penetration}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Opportunities */}
        <div>
          <h3 className="font-semibold mb-3">💡 Oportunități Identificate</h3>
          
          {loading ? (
            <div className="text-center py-10">Se încarcă...</div>
          ) : (
            <div className="space-y-3">
              {opportunities.map((opp, i) => {
                const type = opportunityTypes[opp.type] || { icon: "📍", color: "gray" };
                return (
                  <div
                    key={i}
                    onClick={() => analyzeOpportunity(opp)}
                    className={`border-2 rounded-lg p-4 cursor-pointer hover:shadow-md transition ${
                      selectedOpportunity?.id === opp.id ? "ring-2 ring-blue-500" : ""
                    } bg-${type.color}-50 border-${type.color}-200`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{type.icon}</span>
                        <div>
                          <div className="font-semibold">{opp.name}</div>
                          <div className="text-xs text-gray-600">{opp.type}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-green-600">
                          +{opp.estimatedRevenue?.toLocaleString()} RON
                        </div>
                        <div className="text-xs text-gray-500">potential/an</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mt-3 text-xs text-center">
                      <div className="bg-white bg-opacity-50 p-1 rounded">
                        <div className="font-bold">{opp.difficulty}</div>
                        <div>Dificultate</div>
                      </div>
                      <div className="bg-white bg-opacity-50 p-1 rounded">
                        <div className="font-bold">{opp.timeToMarket}</div>
                        <div>Timp</div>
                      </div>
                      <div className="bg-white bg-opacity-50 p-1 rounded">
                        <div className="font-bold">{opp.investmentRequired?.toLocaleString()}</div>
                        <div>Investiție</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* AI Analysis */}
        <div>
          <h3 className="font-semibold mb-3">🤖 Analiză Detaliată</h3>
          
          {!selectedOpportunity ? (
            <div className="bg-gray-100 rounded-lg p-10 text-center text-gray-500">
              Selectează o oportunitate pentru analiză
            </div>
          ) : analyzing ? (
            <div className="text-center py-10">Se analizează...</div>
          ) : analysis ? (
            <div className="space-y-4">
              {/* Market Assessment */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-800 mb-2">📊 Evaluare Piață</h4>
                <div className="text-sm space-y-1">
                  <div><strong>Dimensiune:</strong> {analysis.marketSize}</div>
                  <div><strong>Competiție:</strong> {analysis.competitionLevel}</div>
                  <div><strong>Bariere intrare:</strong> {analysis.entryBarriers}</div>
                </div>
              </div>

              {/* Entry Strategy */}
              {analysis.entryStrategy && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-semibold text-green-800 mb-2">🎯 Strategie Intrare</h4>
                  <div className="space-y-2">
                    {analysis.entryStrategy.steps?.map((step: any, i: number) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <span className="bg-green-200 text-green-800 px-2 py-0.5 rounded text-xs">
                          {i + 1}
                        </span>
                        <div>
                          <div className="font-medium">{step.action}</div>
                          <div className="text-xs text-gray-600">{step.timeline}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Required Resources */}
              {analysis.requiredResources && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-semibold text-yellow-800 mb-2">🛠️ Resurse Necesare</h4>
                  <ul className="list-disc ml-4 text-sm">
                    {analysis.requiredResources.map((r: string, i: number) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Risks */}
              {analysis.risks && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-semibold text-red-800 mb-2">⚠️ Riscuri</h4>
                  <ul className="list-disc ml-4 text-sm">
                    {analysis.risks.map((r: string, i: number) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* ROI Projection */}
              {analysis.roiProjection && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h4 className="font-semibold text-purple-800 mb-2">📈 Proiecție ROI</h4>
                  <div className="grid grid-cols-3 gap-3 text-center text-sm">
                    <div>
                      <div className="font-bold">{analysis.roiProjection.year1}%</div>
                      <div className="text-xs">Anul 1</div>
                    </div>
                    <div>
                      <div className="font-bold">{analysis.roiProjection.year2}%</div>
                      <div className="text-xs">Anul 2</div>
                    </div>
                    <div>
                      <div className="font-bold">{analysis.roiProjection.year3}%</div>
                      <div className="text-xs">Anul 3</div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-2 text-center">
                    Payback: {analysis.roiProjection.paybackPeriod}
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
