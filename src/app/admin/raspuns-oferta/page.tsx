"use client";

import { useState } from "react";

export default function AIQuoteResponsePage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState({
    customerName: "",
    customerEmail: "",
    customerCompany: "",
    requestedProducts: "",
    additionalNotes: "",
    urgency: "normal"
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const generateQuote = async () => {
    if (!form.customerName || !form.requestedProducts) {
      alert("Completează numele clientului și produsele solicitate!");
      return;
    }
    
    setLoading(true);
    setResult(null);
    
    try {
      const res = await fetch("/admin/api/ai-quote-response", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          requestedProducts: form.requestedProducts.split("\n").map(p => p.trim()).filter(Boolean)
        }),
      });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
      } else {
        setResult(data);
      }
    } catch (err) {
      alert("Eroare la generare!");
    }
    setLoading(false);
  };

  const copyToClipboard = async () => {
    if (!result?.quote) return;
    const text = `Subiect: ${result.quote.subject}\n\n${result.quote.greeting || ""}\n\n${result.quote.body?.replace(/<[^>]*>/g, "") || ""}\n\n${result.quote.signature || ""}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">📝 AI Răspuns Cereri de Ofertă</h1>
      <p className="text-sm text-gray-500 mb-6">Introdu datele cererii de ofertă și AI va genera automat un răspuns profesional.</p>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Formular */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="font-bold mb-4">📋 Detalii Cerere</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nume Client *</label>
              <input name="customerName" value={form.customerName} onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2 focus:outline-blue-500"
                placeholder="Ion Popescu" />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Email Client</label>
              <input name="customerEmail" value={form.customerEmail} onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2 focus:outline-blue-500"
                placeholder="client@firma.ro" type="email" />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Companie Client</label>
              <input name="customerCompany" value={form.customerCompany} onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2 focus:outline-blue-500"
                placeholder="SC Firma SRL" />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Produse Solicitate * (unul pe linie)</label>
              <textarea name="requestedProducts" value={form.requestedProducts} onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2 focus:outline-blue-500 h-32"
                placeholder="Senzor inductiv M12&#10;Alimentator 24V 100W&#10;Senzor capacitiv" />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Note Suplimentare</label>
              <textarea name="additionalNotes" value={form.additionalNotes} onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2 focus:outline-blue-500 h-20"
                placeholder="Cantități, specificații speciale, etc." />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Urgență</label>
              <select name="urgency" value={form.urgency} onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2 focus:outline-blue-500">
                <option value="low">Scăzută</option>
                <option value="normal">Normală</option>
                <option value="high">Urgentă</option>
              </select>
            </div>
            
            <button onClick={generateQuote} disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 transition">
              {loading ? "⏳ Se generează răspunsul..." : "🤖 Generează Răspuns Ofertă"}
            </button>
          </div>
        </div>

        {/* Rezultat */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold">📧 Răspuns Generat</h2>
            {result && (
              <button onClick={copyToClipboard}
                className="bg-green-600 text-white px-4 py-1 rounded text-sm hover:bg-green-700">
                {copied ? "✓ Copiat!" : "📋 Copiază"}
              </button>
            )}
          </div>
          
          {!result ? (
            <div className="text-center text-gray-400 py-12">
              <p className="text-4xl mb-2">📝</p>
              <p>Completează formularul și apasă butonul pentru a genera răspunsul.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {result.quote?.subject && (
                <div className="bg-blue-50 rounded p-3">
                  <p className="text-xs text-blue-600 font-bold">SUBIECT:</p>
                  <p className="font-medium">{result.quote.subject}</p>
                </div>
              )}
              
              {result.quote?.totalValue && (
                <div className="bg-green-50 rounded p-3 text-center">
                  <p className="text-xs text-green-600">VALOARE TOTALĂ ESTIMATĂ</p>
                  <p className="text-2xl font-bold text-green-700">{result.quote.totalValue.toLocaleString("ro-RO")} RON</p>
                </div>
              )}
              
              <div className="bg-gray-50 rounded p-4 max-h-96 overflow-y-auto">
                {result.quote?.greeting && <p className="font-medium mb-2">{result.quote.greeting}</p>}
                <div className="text-sm whitespace-pre-wrap" 
                  dangerouslySetInnerHTML={{ __html: result.quote?.body || result.quote }} />
                {result.quote?.signature && (
                  <div className="mt-4 pt-4 border-t text-sm text-gray-600">{result.quote.signature}</div>
                )}
              </div>
              
              {result.quote?.productsNotFound?.length > 0 && (
                <div className="bg-amber-50 rounded p-3 text-sm">
                  <p className="font-bold text-amber-700">⚠️ Produse negăsite în catalog:</p>
                  <p className="text-amber-600">{result.quote.productsNotFound.join(", ")}</p>
                </div>
              )}
              
              {result.products?.length > 0 && (
                <div className="text-xs text-gray-500">
                  ✓ {result.products.length} produse găsite în catalog
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
