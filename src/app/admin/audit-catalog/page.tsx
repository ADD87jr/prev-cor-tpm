"use client";

import { useState, useEffect } from "react";

interface Issue {
  productId: number;
  productName: string;
  type: string;
  severity: "critical" | "warning" | "info";
  message: string;
}

interface Summary {
  totalProducts: number;
  productsWithIssues: number;
  totalIssues: number;
  critical: number;
  warnings: number;
  info: number;
}

export default function AIAuditCatalogPage() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [issuesByType, setIssuesByType] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [fixing, setFixing] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => { loadAudit(); }, []);

  const loadAudit = async () => {
    setLoading(true);
    try {
      const res = await fetch("/admin/api/ai-audit-catalog");
      const data = await res.json();
      setIssues(data.issues || []);
      setSummary(data.summary);
      setIssuesByType(data.issuesByType || {});
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const autoFix = async (issueType: string) => {
    setFixing(issueType);
    try {
      const res = await fetch("/admin/api/ai-audit-catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issueType, autoFix: true })
      });
      const data = await res.json();
      alert(`Reparat ${data.fixed} produse din ${data.totalAffected}`);
      loadAudit();
    } catch (e) {
      console.error(e);
    }
    setFixing(null);
  };

  const severityBadge = (severity: string) => {
    const styles = {
      critical: "bg-red-100 text-red-700",
      warning: "bg-yellow-100 text-yellow-700",
      info: "bg-blue-100 text-blue-700"
    };
    const labels = {
      critical: "🔴 Critic",
      warning: "🟡 Atenție",
      info: "🔵 Info"
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-bold ${styles[severity as keyof typeof styles] || styles.info}`}>
        {labels[severity as keyof typeof labels] || severity}
      </span>
    );
  };

  const issueTypeLabel: Record<string, string> = {
    missing_price: "Fără preț",
    negative_margin: "Marjă negativă",
    missing_image: "Fără imagine",
    missing_description: "Fără descriere",
    missing_specs: "Fără specificații",
    missing_category: "Fără categorie",
    missing_sku: "Fără SKU",
    missing_seo: "Fără SEO",
    high_discount: "Discount mare",
    out_of_stock: "Fără stoc"
  };

  const filteredIssues = filter === "all" 
    ? issues 
    : issues.filter(i => i.severity === filter || i.type === filter);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">🔍 AI Audit Catalog</h1>
      <p className="text-gray-600 mb-6">
        Verifică automat catalogul pentru probleme și corectează-le cu AI.
      </p>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          {/* Summary */}
          {summary && (
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
              <div className="bg-white rounded-lg shadow p-4 text-center">
                <p className="text-3xl font-bold">{summary.totalProducts}</p>
                <p className="text-sm text-gray-500">Total produse</p>
              </div>
              <div className="bg-white rounded-lg shadow p-4 text-center">
                <p className="text-3xl font-bold">{summary.productsWithIssues}</p>
                <p className="text-sm text-gray-500">Cu probleme</p>
              </div>
              <div className="bg-white rounded-lg shadow p-4 text-center">
                <p className="text-3xl font-bold">{summary.totalIssues}</p>
                <p className="text-sm text-gray-500">Total probleme</p>
              </div>
              <div className="bg-red-50 rounded-lg shadow p-4 text-center cursor-pointer" onClick={() => setFilter("critical")}>
                <p className="text-3xl font-bold text-red-600">{summary.critical}</p>
                <p className="text-sm text-red-500">Critice</p>
              </div>
              <div className="bg-yellow-50 rounded-lg shadow p-4 text-center cursor-pointer" onClick={() => setFilter("warning")}>
                <p className="text-3xl font-bold text-yellow-600">{summary.warnings}</p>
                <p className="text-sm text-yellow-500">Avertismente</p>
              </div>
              <div className="bg-blue-50 rounded-lg shadow p-4 text-center cursor-pointer" onClick={() => setFilter("info")}>
                <p className="text-3xl font-bold text-blue-600">{summary.info}</p>
                <p className="text-sm text-blue-500">Informative</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Probleme pe tip */}
            <div className="bg-white rounded-lg shadow p-5">
              <h2 className="text-lg font-semibold text-gray-700 mb-4">Probleme pe Tip</h2>
              <div className="space-y-2">
                <div 
                  className={`p-2 rounded cursor-pointer hover:bg-gray-100 ${filter === "all" ? "bg-gray-100" : ""}`}
                  onClick={() => setFilter("all")}
                >
                  <span className="font-medium">Toate</span>
                  <span className="float-right">{issues.length}</span>
                </div>
                {Object.entries(issuesByType).map(([type, count]) => (
                  <div 
                    key={type} 
                    className={`p-2 rounded cursor-pointer hover:bg-gray-100 flex justify-between items-center ${filter === type ? "bg-gray-100" : ""}`}
                    onClick={() => setFilter(type)}
                  >
                    <span>{issueTypeLabel[type] || type}</span>
                    <div className="flex items-center gap-2">
                      <span className="bg-gray-200 px-2 py-0.5 rounded text-sm">{count}</span>
                      {["missing_description", "missing_category"].includes(type) && (
                        <button
                          onClick={(e) => { e.stopPropagation(); autoFix(type); }}
                          disabled={fixing === type}
                          className="bg-green-500 text-white px-2 py-0.5 rounded text-xs hover:bg-green-600 disabled:opacity-50"
                        >
                          {fixing === type ? "..." : "Fix AI"}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Lista probleme */}
            <div className="lg:col-span-2 bg-white rounded-lg shadow p-5">
              <h2 className="text-lg font-semibold text-gray-700 mb-4">
                Probleme Detectate 
                {filter !== "all" && <span className="text-sm font-normal text-gray-500 ml-2">({filter})</span>}
              </h2>
              
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {filteredIssues.map((issue, i) => (
                  <div key={i} className="border rounded p-3 hover:bg-gray-50">
                    <div className="flex justify-between items-start mb-2">
                      <a 
                        href={`/admin/produse/${issue.productId}`}
                        className="font-medium text-blue-600 hover:underline truncate max-w-[60%]"
                      >
                        {issue.productName}
                      </a>
                      {severityBadge(issue.severity)}
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">{issue.message}</span>
                      <span className="text-gray-400">{issueTypeLabel[issue.type] || issue.type}</span>
                    </div>
                  </div>
                ))}

                {filteredIssues.length === 0 && (
                  <p className="text-green-600 text-center py-8">
                    ✅ Nu sunt probleme de acest tip!
                  </p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
