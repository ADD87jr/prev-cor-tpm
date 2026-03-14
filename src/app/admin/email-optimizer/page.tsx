"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function EmailOptimizerPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    campaignType: "PROMOTIONAL",
    targetDescription: "",
    product: "",
    tone: "Profesional"
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch("/admin/api/ai-email-optimizer");
      const data = await res.json();
      setCampaigns(data.campaigns || []);
      setTemplates(data.templates || []);
      setStats(data.stats);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  async function generateContent() {
    setGenerating(true);
    try {
      const res = await fetch("/admin/api/ai-email-optimizer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      setGeneratedContent(data.content);
    } catch (e) {
      console.error(e);
    }
    setGenerating(false);
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <Link href="/admin/ai-hub" className="text-blue-600 hover:underline text-sm">
          ← Înapoi la AI Hub
        </Link>
        <h1 className="text-2xl font-bold mt-2">📧 Email Campaign Optimizer</h1>
        <p className="text-gray-600">Optimizează email-uri cu AI</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-100 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-blue-700">{stats.totalContacts}</div>
            <div className="text-sm text-blue-600">Total Contacte</div>
          </div>
          <div className="bg-green-100 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-green-700">{stats.activeContacts}</div>
            <div className="text-sm text-green-600">Active (90 zile)</div>
          </div>
          <div className="bg-purple-100 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-purple-700">{stats.avgOpenRate}%</div>
            <div className="text-sm text-purple-600">Open Rate Mediu</div>
          </div>
          <div className="bg-yellow-100 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-yellow-700">{stats.avgClickRate}%</div>
            <div className="text-sm text-yellow-600">Click Rate Mediu</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Campaign Suggestions */}
        <div>
          <h3 className="font-semibold mb-3">📋 Campanii Sugerate</h3>
          <div className="space-y-3">
            {campaigns.map(camp => (
              <div 
                key={camp.id}
                onClick={() => setFormData({
                  ...formData,
                  campaignType: camp.type,
                  targetDescription: camp.description
                })}
                className="bg-white border rounded-lg p-3 cursor-pointer hover:shadow-md transition"
              >
                <div className="flex justify-between items-start">
                  <div className="font-medium">{camp.name}</div>
                  <span className={`px-2 py-0.5 text-xs rounded ${
                    camp.priority === "HIGH" ? "bg-red-100 text-red-700" : "bg-gray-100"
                  }`}>
                    {camp.priority}
                  </span>
                </div>
                <div className="text-sm text-gray-600 mt-1">{camp.description}</div>
                <div className="text-xs text-gray-500 mt-2">
                  👥 {camp.targetAudience} contacte
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Generator */}
        <div>
          <h3 className="font-semibold mb-3">🤖 Generator Email AI</h3>
          <div className="bg-white border rounded-lg p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Tip Campanie</label>
              <select
                value={formData.campaignType}
                onChange={e => setFormData({...formData, campaignType: e.target.value})}
                className="w-full px-3 py-2 border rounded"
              >
                <option value="PROMOTIONAL">Promoție</option>
                <option value="WINBACK">Win-back</option>
                <option value="LOYALTY">Loialitate</option>
                <option value="CROSS_SELL">Cross-sell</option>
                <option value="ANNOUNCEMENT">Anunț</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Public Țintă</label>
              <input
                type="text"
                value={formData.targetDescription}
                onChange={e => setFormData({...formData, targetDescription: e.target.value})}
                placeholder="ex: Clienți B2B din industria auto"
                className="w-full px-3 py-2 border rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Produs/Serviciu</label>
              <input
                type="text"
                value={formData.product}
                onChange={e => setFormData({...formData, product: e.target.value})}
                placeholder="ex: PLC Siemens S7-1200"
                className="w-full px-3 py-2 border rounded"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Ton</label>
              <select
                value={formData.tone}
                onChange={e => setFormData({...formData, tone: e.target.value})}
                className="w-full px-3 py-2 border rounded"
              >
                <option>Profesional</option>
                <option>Prietenos</option>
                <option>Urgent</option>
                <option>Exclusivist</option>
              </select>
            </div>

            <button
              onClick={generateContent}
              disabled={generating}
              className="w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
            >
              {generating ? "Se generează..." : "🤖 Generează Email"}
            </button>
          </div>
        </div>

        {/* Generated Content */}
        <div>
          <h3 className="font-semibold mb-3">📝 Conținut Generat</h3>
          
          {!generatedContent ? (
            <div className="bg-gray-100 rounded-lg p-6 text-center text-gray-500 text-sm">
              Completează formularul și apasă Generează
            </div>
          ) : (
            <div className="space-y-4">
              {generatedContent.subjectLines && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <h4 className="font-medium text-blue-800 text-sm mb-2">📧 Subiecte Email</h4>
                  {generatedContent.subjectLines.map((s: any, i: number) => (
                    <div key={i} className="bg-white p-2 rounded mb-1 text-sm">
                      <div className="font-medium">{s.text}</div>
                      <div className="text-xs text-gray-500">
                        Open rate estimat: {s.predictedOpenRate}%
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {generatedContent.emailBody && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <h4 className="font-medium text-green-800 text-sm mb-2">📝 Corp Email</h4>
                  <div className="bg-white p-2 rounded text-sm space-y-2">
                    <div><strong>Deschidere:</strong> {generatedContent.emailBody.greeting}</div>
                    <div><strong>Hook:</strong> {generatedContent.emailBody.hook}</div>
                    <div className="text-xs">{generatedContent.emailBody.mainContent?.slice(0, 200)}...</div>
                    <div className="bg-blue-100 p-2 rounded">
                      <strong>CTA:</strong> {generatedContent.emailBody.cta?.text}
                    </div>
                  </div>
                </div>
              )}

              {generatedContent.sendTimeRecommendation && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm">
                  <div className="font-medium">⏰ Cel mai bun moment:</div>
                  <div>{generatedContent.sendTimeRecommendation.bestDay} la {generatedContent.sendTimeRecommendation.bestTime}</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
