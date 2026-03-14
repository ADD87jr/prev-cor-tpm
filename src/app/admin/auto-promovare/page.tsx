"use client";

import { useState, useEffect } from "react";

interface Promotion {
  id: number;
  type: string;
  title: string;
  content: string;
  targetProducts: any[];
  status: string;
  scheduledFor: string | null;
  sentAt: string | null;
  createdAt: string;
}

export default function AutoPromovarePage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [genType, setGenType] = useState("email");

  useEffect(() => { fetchPromotions(); }, []);

  const fetchPromotions = async () => {
    setLoading(true);
    try {
      const res = await fetch("/admin/api/ai-promotions");
      const data = await res.json();
      // API returnează direct array-ul sau {promotions: [...]}
      setPromotions(Array.isArray(data) ? data : (data.promotions || []));
    } catch { }
    setLoading(false);
  };

  const generate = async (type: string) => {
    setGenerating(true);
    setGenType(type);
    try {
      console.log("[AUTO-PROMOVARE] Generez promovare:", type);
      const res = await fetch("/admin/api/ai-promotions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate", type }),
      });
      const data = await res.json();
      console.log("[AUTO-PROMOVARE] Răspuns:", data);
      if (!res.ok) {
        alert(`Eroare: ${data.error || "Eroare necunoscută"}`);
      }
      fetchPromotions();
    } catch (err) {
      console.error("[AUTO-PROMOVARE] Eroare:", err);
      alert("Eroare la generarea promovării!");
    }
    setGenerating(false);
  };

  const approve = async (id: number) => {
    try {
      const res = await fetch("/admin/api/ai-promotions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve", promoId: id }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(`Eroare: ${data.error || "Eroare la aprobare"}`);
      }
      fetchPromotions();
    } catch (err) {
      console.error("[AUTO-PROMOVARE] Eroare approve:", err);
    }
  };

  const deletePromo = async (id: number) => {
    if (!confirm("Sigur ștergi această promovare?")) return;
    try {
      const res = await fetch("/admin/api/ai-promotions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", promoId: id }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(`Eroare: ${data.error || "Eroare la ștergere"}`);
      }
      fetchPromotions();
    } catch (err) {
      console.error("[AUTO-PROMOVARE] Eroare delete:", err);
    }
  };

  const typeBadge = (type: string) => {
    const map: Record<string, { bg: string; icon: string; label: string }> = {
      email: { bg: "bg-blue-100 text-blue-700", icon: "📧", label: "Email" },
      social: { bg: "bg-pink-100 text-pink-700", icon: "📱", label: "Social Media" },
      discount: { bg: "bg-green-100 text-green-700", icon: "💰", label: "Reducere" },
    };
    const t = map[type] || { bg: "bg-gray-100 text-gray-700", icon: "📄", label: type };
    return <span className={`px-2 py-0.5 rounded text-xs font-bold ${t.bg}`}>{t.icon} {t.label}</span>;
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      draft: "bg-gray-200 text-gray-700",
      approved: "bg-green-100 text-green-700",
      sent: "bg-blue-100 text-blue-700",
      active: "bg-purple-100 text-purple-700",
    };
    const labels: Record<string, string> = {
      draft: "Draft", approved: "Aprobat", sent: "Trimis", active: "Activ",
    };
    return <span className={`px-2 py-0.5 rounded text-xs font-bold ${map[status] || "bg-gray-100"}`}>{labels[status] || status}</span>;
  };

  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">📣 Auto-Promovare AI</h1>

      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <p className="text-sm text-gray-600 mb-3">AI va analiza produsele tale și va genera conținut promoțional personalizat.</p>
        <div className="flex gap-3 flex-wrap">
          <button onClick={() => generate("email")} disabled={generating} className="bg-blue-600 text-white px-4 py-2 rounded font-semibold hover:bg-blue-700 disabled:opacity-50 transition">
            {generating && genType === "email" ? "⏳ Se generează..." : "📧 Generează Email"}
          </button>
          <button onClick={() => generate("social")} disabled={generating} className="bg-pink-600 text-white px-4 py-2 rounded font-semibold hover:bg-pink-700 disabled:opacity-50 transition">
            {generating && genType === "social" ? "⏳ Se generează..." : "📱 Generează Social Media"}
          </button>
          <button onClick={() => generate("discount")} disabled={generating} className="bg-green-600 text-white px-4 py-2 rounded font-semibold hover:bg-green-700 disabled:opacity-50 transition">
            {generating && genType === "discount" ? "⏳ Se generează..." : "💰 Generează Ofertă"}
          </button>
        </div>
      </div>

      {loading ? <p>Se încarcă...</p> : promotions.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          <p className="text-4xl mb-2">📣</p>
          <p>Nu ai promovări generate. Alege un tip de promovare și AI va crea conținut!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {promotions.map(p => (
            <div key={p.id} className="bg-white rounded-lg shadow p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {typeBadge(p.type)}
                    {statusBadge(p.status)}
                    <span className="text-xs text-gray-400">{new Date(p.createdAt).toLocaleDateString("ro-RO")}</span>
                  </div>
                  <h3 className="font-bold">{p.title}</h3>
                  {expanded === p.id ? (
                    <div className="mt-2 bg-gray-50 rounded p-3 text-sm whitespace-pre-wrap">{p.content}</div>
                  ) : (
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{p.content?.slice(0, 200)}...</p>
                  )}
                </div>
                <div className="flex gap-2 ml-4 flex-shrink-0">
                  <button onClick={() => setExpanded(expanded === p.id ? null : p.id)} className="text-blue-600 text-sm hover:underline">
                    {expanded === p.id ? "Închide" : "Detalii"}
                  </button>
                  {p.status === "draft" && (
                    <button onClick={() => approve(p.id)} className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700">✅ Aprobă</button>
                  )}
                  <button onClick={() => deletePromo(p.id)} className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700">🗑️</button>
                </div>
              </div>
              {expanded === p.id && p.targetProducts && Array.isArray(p.targetProducts) && p.targetProducts.length > 0 && (
                <div className="mt-2 text-xs text-gray-500">
                  🎯 Produse vizate: {p.targetProducts.map((tp: any) => tp.name || `#${tp.id}`).join(", ")}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
