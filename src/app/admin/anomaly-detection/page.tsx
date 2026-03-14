"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Anomaly {
  id: string;
  type: string;
  severity: string;
  title: string;
  description: string;
  data: any;
  recommendation: string;
  detectedAt: string;
}

export default function AnomalyDetectionPage() {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [metadata, setMetadata] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [filter, setFilter] = useState<string>("ALL");

  useEffect(() => {
    loadAnomalies();
  }, []);

  async function loadAnomalies() {
    setLoading(true);
    try {
      const res = await fetch("/admin/api/ai-anomaly-detection");
      const data = await res.json();
      setAnomalies(data.anomalies || []);
      setStats(data.stats);
      setMetadata(data.metadata);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  async function analyzeAnomaly(anomaly: Anomaly) {
    setAnalyzing(anomaly.id);
    try {
      const res = await fetch("/admin/api/ai-anomaly-detection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anomaly })
      });
      const data = await res.json();
      setAnalysis({ anomalyId: anomaly.id, ...data.analysis });
    } catch (e) {
      console.error(e);
    }
    setAnalyzing(null);
  }

  const filteredAnomalies = filter === "ALL" 
    ? anomalies 
    : anomalies.filter(a => a.severity === filter || a.type.includes(filter));

  const severityColors: Record<string, string> = {
    CRITICAL: "bg-red-100 border-red-400 text-red-800",
    HIGH: "bg-orange-100 border-orange-400 text-orange-800",
    MEDIUM: "bg-yellow-100 border-yellow-400 text-yellow-800",
    LOW: "bg-green-100 border-green-400 text-green-800"
  };

  const severityBadge: Record<string, string> = {
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
          <h1 className="text-2xl font-bold mt-2">🔍 Detectare Anomalii AI</h1>
          <p className="text-gray-600">Monitorizare automată pentru probleme în date</p>
        </div>
        <button
          onClick={loadAnomalies}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          🔄 Scanare Nouă
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-gray-100 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-gray-600">Total Anomalii</div>
          </div>
          <div className="bg-red-100 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-red-700">{stats.critical}</div>
            <div className="text-sm text-red-600">Critice</div>
          </div>
          <div className="bg-orange-100 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-orange-700">{stats.high}</div>
            <div className="text-sm text-orange-600">Urgente</div>
          </div>
          <div className="bg-yellow-100 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-yellow-700">{stats.medium}</div>
            <div className="text-sm text-yellow-600">Medii</div>
          </div>
          <div className="bg-blue-100 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-blue-700">{metadata?.analyzedProducts || 0}</div>
            <div className="text-sm text-blue-600">Produse Analizate</div>
          </div>
        </div>
      )}

      {/* Metadata */}
      {metadata && (
        <div className="bg-gray-50 border rounded-lg p-4 mb-6 text-sm">
          <span className="font-medium">Statistici analiză:</span>{" "}
          Valoare medie comandă: {metadata.avgOrderValue?.toLocaleString()} RON | 
          Deviație standard: {metadata.stdDeviation?.toLocaleString()} RON | 
          Comenzi analizate: {metadata.analyzedOrders}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {["ALL", "CRITICAL", "HIGH", "MEDIUM", "ORDER", "STOCK", "PRICE"].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded text-sm ${
              filter === f ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            {f === "ALL" ? "Toate" : f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-10">Se scanează pentru anomalii...</div>
      ) : filteredAnomalies.length === 0 ? (
        <div className="text-center py-10 bg-green-50 rounded-lg">
          <div className="text-6xl mb-4">✅</div>
          <h3 className="text-xl font-bold text-green-700">Totul în regulă!</h3>
          <p className="text-green-600">Nu au fost detectate anomalii</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAnomalies.map(anomaly => (
            <div
              key={anomaly.id}
              className={`border-2 rounded-lg p-4 ${severityColors[anomaly.severity]}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-0.5 text-xs text-white rounded ${severityBadge[anomaly.severity]}`}>
                      {anomaly.severity}
                    </span>
                    <span className="px-2 py-0.5 text-xs bg-gray-600 text-white rounded">
                      {anomaly.type.replace(/_/g, " ")}
                    </span>
                  </div>
                  <h3 className="font-semibold text-lg">{anomaly.title}</h3>
                  <p className="text-sm mt-1">{anomaly.description}</p>
                  <div className="mt-2 text-xs text-gray-600">
                    💡 <strong>Recomandare:</strong> {anomaly.recommendation}
                  </div>
                </div>
                <button
                  onClick={() => analyzeAnomaly(anomaly)}
                  disabled={analyzing === anomaly.id}
                  className="px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700 disabled:opacity-50"
                >
                  {analyzing === anomaly.id ? "..." : "🤖 Analiză AI"}
                </button>
              </div>

              {/* AI Analysis */}
              {analysis && analysis.anomalyId === anomaly.id && (
                <div className="mt-4 p-4 bg-white bg-opacity-80 rounded border">
                  <h4 className="font-semibold text-purple-800 mb-3">🤖 Analiză AI Detaliată</h4>
                  
                  {analysis.rootCauseAnalysis && (
                    <div className="mb-3">
                      <div className="font-medium text-sm">Cauze posibile:</div>
                      <ul className="list-disc ml-4 text-sm">
                        {analysis.rootCauseAnalysis.possibleCauses?.map((cause: string, i: number) => (
                          <li key={i}>{cause}</li>
                        ))}
                      </ul>
                      <div className="text-sm mt-1">
                        <strong>Cea mai probabilă:</strong> {analysis.rootCauseAnalysis.mostLikely}
                      </div>
                    </div>
                  )}

                  {analysis.immediateActions && (
                    <div className="mb-3">
                      <div className="font-medium text-sm">Acțiuni imediate:</div>
                      <ul className="list-decimal ml-4 text-sm">
                        {analysis.immediateActions.map((action: string, i: number) => (
                          <li key={i}>{action}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {analysis.impactAssessment && (
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="bg-gray-100 p-2 rounded text-center">
                        <div className="font-medium">Impact Financiar</div>
                        <div>{analysis.impactAssessment.financialImpact}</div>
                      </div>
                      <div className="bg-gray-100 p-2 rounded text-center">
                        <div className="font-medium">Risc Reputație</div>
                        <div>{analysis.impactAssessment.reputationRisk}</div>
                      </div>
                      <div className="bg-gray-100 p-2 rounded text-center">
                        <div className="font-medium">Urgență</div>
                        <div>{analysis.impactAssessment.urgency}</div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
