"use client";

import { useState, useEffect } from "react";

interface PendingEmail {
  id: string;
  from: string;
  subject: string;
  preview: string;
  receivedAt: string;
  category: "întrebare" | "reclamație" | "comandă" | "retur" | "altele";
  priority: "low" | "medium" | "high";
}

interface GeneratedResponse {
  emailId: string;
  subject: string;
  greeting: string;
  body: string;
  closing: string;
  fullResponse: string;
  suggestedProducts?: Array<{
    name: string;
    reason: string;
  }>;
  suggestedActions?: string[];
  tone: string;
}

export default function AIEmailAutoresponderPage() {
  const [emails, setEmails] = useState<PendingEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<PendingEmail | null>(null);
  const [emailContent, setEmailContent] = useState("");
  const [senderName, setSenderName] = useState("");
  const [generatedResponse, setGeneratedResponse] = useState<GeneratedResponse | null>(null);

  useEffect(() => { loadEmails(); }, []);

  const loadEmails = async () => {
    setLoading(true);
    try {
      const res = await fetch("/admin/api/ai-email-autoresponder");
      const data = await res.json();
      setEmails(Array.isArray(data.pendingEmails) ? data.pendingEmails : []);
    } catch (e) {
      console.error(e);
      setEmails([]);
    }
    setLoading(false);
  };

  const generateResponse = async (email?: PendingEmail) => {
    if (!email && !emailContent.trim()) {
      alert("Introdu conținutul email-ului!");
      return;
    }

    const target = email?.id || "custom";
    setGenerating(target);
    setSelectedEmail(email || null);
    setGeneratedResponse(null);

    try {
      const res = await fetch("/admin/api/ai-email-autoresponder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailId: email?.id,
          emailContent: email ? undefined : emailContent,
          senderName: email?.from?.split("@")[0] || senderName || "Client"
        })
      });
      const data = await res.json();
      setGeneratedResponse(data);
    } catch (e) {
      console.error(e);
    }
    setGenerating(null);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Copiat în clipboard!");
  };

  const getCategoryBadge = (category: string) => {
    const colors: Record<string, string> = {
      "întrebare": "bg-blue-100 text-blue-700",
      "reclamație": "bg-red-100 text-red-700",
      "comandă": "bg-green-100 text-green-700",
      "retur": "bg-yellow-100 text-yellow-700",
      "altele": "bg-gray-100 text-gray-700"
    };
    return colors[category] || colors.altele;
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "high": return "🔴";
      case "medium": return "🟡";
      default: return "🟢";
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">✉️ AI Auto-Răspuns Email</h1>
      <p className="text-gray-600 mb-6">
        Generează răspunsuri profesionale pentru email-urile clienților.
      </p>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lista email-uri + custom */}
          <div className="space-y-4">
            {/* Email custom */}
            <div className="bg-white rounded-lg shadow p-5">
              <h2 className="text-lg font-semibold text-gray-700 mb-3">Email nou</h2>
              <div className="space-y-2">
                <input
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="Nume expeditor"
                  className="w-full border rounded px-3 py-2 text-sm"
                />
                <textarea
                  value={emailContent}
                  onChange={(e) => setEmailContent(e.target.value)}
                  placeholder="Lipește conținutul email-ului aici..."
                  rows={4}
                  className="w-full border rounded px-3 py-2 text-sm resize-none"
                />
                <button
                  onClick={() => generateResponse()}
                  disabled={generating !== null || !emailContent.trim()}
                  className="w-full bg-indigo-600 text-white py-2 rounded font-medium hover:bg-indigo-700 disabled:opacity-50"
                >
                  {generating === "custom" ? "Generez..." : "Generează Răspuns"}
                </button>
              </div>
            </div>

            {/* Email-uri în așteptare */}
            <div className="bg-white rounded-lg shadow p-5">
              <h2 className="text-lg font-semibold text-gray-700 mb-3">
                Email-uri în Așteptare ({emails.length})
              </h2>
              
              <div className="space-y-2 max-h-[350px] overflow-y-auto">
                {emails.map((email) => (
                  <div 
                    key={email.id} 
                    className={`border rounded p-3 cursor-pointer hover:bg-gray-50 ${
                      selectedEmail?.id === email.id ? "border-indigo-500 bg-indigo-50" : ""
                    }`}
                    onClick={() => generateResponse(email)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{getPriorityIcon(email.priority)}</span>
                          <span className={`text-xs px-2 py-0.5 rounded ${getCategoryBadge(email.category)}`}>
                            {email.category}
                          </span>
                        </div>
                        <p className="font-medium text-gray-800 text-sm truncate mt-1">{email.subject}</p>
                        <p className="text-xs text-gray-500 truncate">{email.from}</p>
                        <p className="text-xs text-gray-400 truncate mt-1">{email.preview}</p>
                      </div>
                      {generating === email.id && (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                      )}
                    </div>
                  </div>
                ))}

                {emails.length === 0 && (
                  <p className="text-green-600 text-center py-4 text-sm">
                    ✅ Nu sunt email-uri în așteptare
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Răspuns generat */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow p-5">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">
              Răspuns Generat AI
            </h2>

            {generating !== null ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mb-4"></div>
                <p className="text-gray-600">Generez răspunsul...</p>
              </div>
            ) : generatedResponse ? (
              <div className="space-y-4">
                {/* Ton detectat */}
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600">Ton detectat:</span>
                  <span className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded text-sm">
                    {generatedResponse.tone}
                  </span>
                </div>

                {/* Email complet */}
                <div className="bg-gray-50 rounded p-4">
                  <div className="flex justify-between items-center mb-3">
                    <p className="font-medium text-gray-700">Subject: {generatedResponse.subject}</p>
                    <button
                      onClick={() => copyToClipboard(generatedResponse.fullResponse)}
                      className="text-sm text-indigo-600 hover:underline"
                    >
                      📋 Copiază tot
                    </button>
                  </div>
                  
                  <div className="bg-white rounded p-4 border text-sm whitespace-pre-wrap">
                    {generatedResponse.fullResponse}
                  </div>
                </div>

                {/* Componente separate */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Salut</label>
                    <div className="bg-gray-50 rounded p-2 text-sm">{generatedResponse.greeting}</div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Corp</label>
                    <div className="bg-gray-50 rounded p-2 text-sm truncate">{generatedResponse.body?.substring(0, 60)}...</div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Încheiere</label>
                    <div className="bg-gray-50 rounded p-2 text-sm">{generatedResponse.closing}</div>
                  </div>
                </div>

                {/* Produse sugerate */}
                {generatedResponse.suggestedProducts && generatedResponse.suggestedProducts.length > 0 && (
                  <div>
                    <p className="font-medium text-gray-700 mb-2">🛒 Produse de recomandat:</p>
                    <div className="space-y-2">
                      {generatedResponse.suggestedProducts.map((product, i) => (
                        <div key={i} className="bg-blue-50 rounded p-2 flex justify-between">
                          <span className="font-medium text-blue-800">{product.name}</span>
                          <span className="text-xs text-blue-600">{product.reason}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Acțiuni sugerate */}
                {generatedResponse.suggestedActions && generatedResponse.suggestedActions.length > 0 && (
                  <div>
                    <p className="font-medium text-gray-700 mb-2">📌 Acțiuni de luat:</p>
                    <ul className="space-y-1">
                      {generatedResponse.suggestedActions.map((action, i) => (
                        <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                          <span className="text-indigo-500">•</span> {action}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Butoane acțiune */}
                <div className="flex gap-2 pt-4 border-t">
                  <button className="flex-1 bg-green-600 text-white py-2 rounded hover:bg-green-700">
                    ✅ Trimite răspuns
                  </button>
                  <button className="flex-1 bg-gray-200 text-gray-700 py-2 rounded hover:bg-gray-300">
                    ✏️ Editează
                  </button>
                  <button className="bg-red-100 text-red-600 px-4 py-2 rounded hover:bg-red-200">
                    🗑️
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-20">
                <p className="text-gray-500 mb-2">Selectează un email sau lipește conținutul</p>
                <p className="text-xs text-gray-400">Răspunsul va fi generat automat în tonul potrivit</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
