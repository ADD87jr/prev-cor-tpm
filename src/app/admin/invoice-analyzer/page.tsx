"use client";

import { useState } from "react";
import Link from "next/link";

export default function InvoiceAnalyzerPage() {
  const [invoiceText, setInvoiceText] = useState("");
  const [invoiceImage, setInvoiceImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  async function analyzeInvoice() {
    if (!invoiceText && !invoiceImage) {
      setError("Introdu textul facturii sau încarcă o imagine");
      return;
    }

    setAnalyzing(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/admin/api/ai-invoice-analyzer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceText: invoiceText || undefined,
          invoiceBase64: invoiceImage || undefined
        })
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setResult(data);
      }
    } catch (e: any) {
      setError(e.message);
    }
    setAnalyzing(false);
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setInvoiceImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <Link href="/admin/ai-hub" className="text-blue-600 hover:underline text-sm">
          ← Înapoi la AI Hub
        </Link>
        <h1 className="text-2xl font-bold mt-2">📄 Analizator Facturi AI</h1>
        <p className="text-gray-600">Extrage automat date din facturi furnizori</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input */}
        <div className="space-y-4">
          <div className="bg-white border rounded-lg p-4">
            <h3 className="font-semibold mb-3">📝 Introdu Factura</h3>
            
            {/* Image Upload */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Încarcă imagine factură (JPG, PNG)
              </label>
              <input
                type="file"
                accept="image/jpeg,image/png"
                onChange={handleImageUpload}
                className="w-full px-3 py-2 border rounded"
              />
              {invoiceImage && (
                <div className="mt-2">
                  <img 
                    src={invoiceImage} 
                    alt="Preview" 
                    className="max-h-40 rounded border"
                  />
                  <button
                    onClick={() => setInvoiceImage(null)}
                    className="text-red-500 text-sm mt-1"
                  >
                    ✕ Șterge imagine
                  </button>
                </div>
              )}
            </div>

            <div className="text-center text-gray-400 text-sm mb-4">— SAU —</div>

            {/* Text Input */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Lipește textul facturii
              </label>
              <textarea
                value={invoiceText}
                onChange={(e) => setInvoiceText(e.target.value)}
                placeholder="Copiază și lipește conținutul facturii aici..."
                rows={12}
                className="w-full px-3 py-2 border rounded font-mono text-sm"
              />
            </div>

            {error && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                {error}
              </div>
            )}

            <button
              onClick={analyzeInvoice}
              disabled={analyzing || (!invoiceText && !invoiceImage)}
              className="mt-4 w-full px-4 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 font-semibold"
            >
              {analyzing ? "Se analizează..." : "🤖 Analizează Factura"}
            </button>
          </div>

          {/* Demo */}
          <div className="bg-gray-50 border rounded-lg p-4 text-sm">
            <h4 className="font-medium mb-2">💡 Exemplu text factură:</h4>
            <button
              onClick={() => setInvoiceText(`FACTURA FISCALA Nr. 2024-1234
Data: 15.02.2026

FURNIZOR:
Siemens Romania SRL
CUI: RO12345678
Str. Industriei 100, București
Tel: 021-123-4567
IBAN: RO49AAAA1B31007593840000

CUMPĂRĂTOR:
SC Client SRL
CUI: RO87654321

PRODUSE:
1. PLC Siemens S7-1200 - 2 buc x 2500 RON = 5000 RON
2. HMI KTP700 Basic - 1 buc x 3200 RON = 3200 RON
3. Cablu profinet 10m - 5 buc x 150 RON = 750 RON

Subtotal: 8950 RON
TVA 19%: 1700.50 RON
TOTAL: 10650.50 RON

Scadență: 15.03.2026`)}
              className="text-blue-600 hover:underline"
            >
              Încarcă exemplu →
            </button>
          </div>
        </div>

        {/* Results */}
        <div>
          <h3 className="font-semibold mb-3">📊 Rezultate Analiză</h3>
          
          {!result ? (
            <div className="bg-gray-100 rounded-lg p-10 text-center text-gray-500">
              <div className="text-6xl mb-4">📄</div>
              <p>Încarcă o factură pentru a extrage datele automat</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Processing Info */}
              <div className="text-sm text-gray-500">
                Metodă: {result.processingInfo?.method} | 
                {new Date(result.processingInfo?.timestamp).toLocaleString("ro-RO")}
              </div>

              {/* Supplier */}
              {result.extracted?.supplier && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-800 mb-2">🏢 Furnizor</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><strong>Nume:</strong> {result.extracted.supplier.name}</div>
                    <div><strong>CUI:</strong> {result.extracted.supplier.cui}</div>
                    <div><strong>Email:</strong> {result.extracted.supplier.email}</div>
                    <div><strong>Telefon:</strong> {result.extracted.supplier.phone}</div>
                    <div className="col-span-2"><strong>IBAN:</strong> {result.extracted.supplier.iban}</div>
                  </div>
                </div>
              )}

              {/* Invoice */}
              {result.extracted?.invoice && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-semibold text-green-800 mb-2">📋 Factură</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><strong>Număr:</strong> {result.extracted.invoice.number}</div>
                    <div><strong>Data:</strong> {result.extracted.invoice.date}</div>
                    <div><strong>Scadență:</strong> {result.extracted.invoice.dueDate}</div>
                    <div><strong>Monedă:</strong> {result.extracted.invoice.currency}</div>
                  </div>
                </div>
              )}

              {/* Items */}
              {result.extracted?.items && (
                <div className="bg-white border rounded-lg p-4">
                  <h4 className="font-semibold mb-2">📦 Produse ({result.extracted.items.length})</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="p-2 text-left">Descriere</th>
                          <th className="p-2 text-center">Cant.</th>
                          <th className="p-2 text-right">Preț</th>
                          <th className="p-2 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.extracted.items.map((item: any, i: number) => (
                          <tr key={i} className="border-t">
                            <td className="p-2">{item.description}</td>
                            <td className="p-2 text-center">{item.quantity} {item.unit}</td>
                            <td className="p-2 text-right">{item.unitPrice?.toLocaleString()}</td>
                            <td className="p-2 text-right font-medium">{item.total?.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Totals */}
              {result.extracted?.totals && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h4 className="font-semibold text-purple-800 mb-2">💰 Totaluri</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>Subtotal:</div>
                    <div className="text-right">{result.extracted.totals.subtotal?.toLocaleString()} RON</div>
                    <div>TVA:</div>
                    <div className="text-right">{result.extracted.totals.vatAmount?.toLocaleString()} RON</div>
                    <div className="font-bold text-lg">TOTAL:</div>
                    <div className="text-right font-bold text-lg">{result.extracted.totals.total?.toLocaleString()} RON</div>
                  </div>
                </div>
              )}

              {/* Suggestions */}
              {result.suggestions && result.suggestions.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="font-semibold text-yellow-800 mb-2">💡 Acțiuni Sugerate</h4>
                  <div className="space-y-2">
                    {result.suggestions.map((sug: any, i: number) => (
                      <div key={i} className="flex items-center justify-between bg-white p-2 rounded">
                        <div>
                          <div className="font-medium text-sm">{sug.action.replace(/_/g, " ")}</div>
                          <div className="text-xs text-gray-600">{sug.description}</div>
                        </div>
                        <button className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700">
                          Aplică
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Confidence */}
              {result.extracted?.confidence && (
                <div className={`text-center py-2 rounded ${
                  result.extracted.confidence === "HIGH" ? "bg-green-100 text-green-700" :
                  result.extracted.confidence === "MEDIUM" ? "bg-yellow-100 text-yellow-700" :
                  "bg-red-100 text-red-700"
                }`}>
                  Încredere extracție: {result.extracted.confidence}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
