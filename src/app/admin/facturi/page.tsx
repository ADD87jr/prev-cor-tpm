"use client";

import { useState, useEffect, useCallback } from "react";

interface InvoiceRow {
  id: number;
  serie: string;
  numar: number;
  type: string;
  stornoOfId: number | null;
  stornoOfNumber: number | null;
  dataFactura: string;
  dataScadenta: string;
  clientNume: string;
  clientCUI: string;
  clientEmail: string;
  numarComanda: string;
  statusComanda: string;
  subtotal: number;
  tvaPercent: number;
  tvaSuma: number;
  total: number;
  courierCost: number;
  invoiceUrl: string;
  produse: { denumire: string; cantitate: number; um: string; pretUnitar: number; valoare: number }[];
}

export default function FacturiPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [stornoMsg, setStornoMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [stornoVisible, setStornoVisible] = useState(false);

  const showNotification = useCallback((text: string, type: 'success' | 'error') => {
    setStornoMsg({ text, type });
    setStornoVisible(true);
    setTimeout(() => setStornoVisible(false), 5000);
    setTimeout(() => setStornoMsg(null), 5500);
  }, []);

  const handleDelete = async (invoiceId: number, invoiceStr: string) => {
    const msg = `⚠️ ATENȚIE! Ștergerea facturii ${invoiceStr} este ireversibilă.\n\nAceastă acțiune nu poate fi anulată. Ești sigur?`;
    if (!confirm(msg)) return;
    try {
      const res = await fetch(`/admin/api/facturi?id=${invoiceId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showNotification(`Factura ${data.deleted} a fost ștearsă cu succes.`, 'success');
        fetchInvoices();
      } else {
        showNotification(data.error || 'Eroare la ștergere', 'error');
      }
    } catch {
      showNotification('Eroare de conexiune la server', 'error');
    }
  };

  const handleRegenPdf = async (invoiceId: number, invoiceStr: string) => {
    if (!confirm(`Regenerezi PDF-ul pentru factura ${invoiceStr}?\nSe va crea un PDF nou cu datele actuale din comandă.`)) return;
    try {
      const res = await fetch('/admin/api/facturi', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification(`PDF regenerat: ${data.invoice}`, 'success');
        fetchInvoices();
      } else {
        showNotification(data.error || 'Eroare la regenerare PDF', 'error');
      }
    } catch {
      showNotification('Eroare de conexiune la server', 'error');
    }
  };

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const res = await fetch(`/admin/api/facturi?${params.toString()}`);
      const data = await res.json();
      setInvoices(data.invoices || []);
      setLoaded(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    params.set("format", "csv");
    window.open(`/admin/api/facturi?${params.toString()}`, "_blank");
  };

  const exportXLSX = () => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    params.set("format", "xlsx");
    window.open(`/admin/api/facturi?${params.toString()}`, "_blank");
  };

  const exportXml = (invoiceId: number) => {
    window.open(`/admin/api/facturi?format=xml&invoiceId=${invoiceId}`, "_blank");
  };

  const handleStorno = async (invoiceId: number, invoiceStr: string) => {
    if (!confirm(`Sigur vrei să stornezi factura ${invoiceStr}? Se va genera o factură de stornare cu valori negative.`)) return;
    try {
      const res = await fetch("/admin/api/facturi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "storno", invoiceId }),
      });
      const data = await res.json();
      if (data.success) {
        showNotification(
          `✅ Stornare realizată cu succes!\nFactura de stornare: ${data.stornoInvoice.invoiceStr}\nFactura originală stornată: ${data.stornoInvoice.originalInvoice}`,
          'success'
        );
        fetchInvoices();
      } else {
        showNotification(`❌ ${data.error}`, 'error');
      }
    } catch {
      showNotification('❌ Eroare de conexiune la server', 'error');
    }
  };

  const totalFacturi = invoices.length;
  const totalSuma = invoices.reduce((s, inv) => s + inv.total, 0);
  const totalTVA = invoices.reduce((s, inv) => s + inv.tvaSuma, 0);
  const totalFaraTVA = invoices.reduce((s, inv) => s + inv.subtotal, 0);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">🧾 Facturi emise</h1>

      {/* Filtre */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">De la data</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="border rounded px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Până la data</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="border rounded px-3 py-2 text-sm"
            />
          </div>
          <button
            onClick={fetchInvoices}
            disabled={loading}
            className="bg-blue-600 text-white px-5 py-2 rounded font-semibold hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading ? "Se încarcă..." : "🔍 Caută"}
          </button>
          {loaded && invoices.length > 0 && (
            <>
              <button
                onClick={exportCSV}
                className="bg-green-600 text-white px-5 py-2 rounded font-semibold hover:bg-green-700 transition"
              >
                📥 Export CSV (SAGA)
              </button>
              <button
                onClick={exportXLSX}
                className="bg-emerald-600 text-white px-5 py-2 rounded font-semibold hover:bg-emerald-700 transition"
              >
                📊 Export Excel
              </button>
            </>
          )}
        </div>
      </div>

      {/* Sumar */}
      {loaded && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{totalFacturi}</div>
            <div className="text-sm text-gray-500">Facturi</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <div className="text-2xl font-bold text-gray-700">{totalFaraTVA.toFixed(2)} RON</div>
            <div className="text-sm text-gray-500">Total fără TVA</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <div className="text-2xl font-bold text-amber-600">{totalTVA.toFixed(2)} RON</div>
            <div className="text-sm text-gray-500">Total TVA</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{totalSuma.toFixed(2)} RON</div>
            <div className="text-sm text-gray-500">Total cu TVA</div>
          </div>
        </div>
      )}

      {/* Tabel facturi */}
      {loaded && invoices.length === 0 && (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          Nu există facturi pentru perioada selectată.
        </div>
      )}

      {/* Notificare stornare */}
      {stornoMsg && (
        <div className={`fixed top-6 right-6 z-50 max-w-md shadow-2xl rounded-xl border-l-4 p-5 transition-all duration-500 ${
          stornoVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
        } ${
          stornoMsg.type === 'success'
            ? 'bg-white border-green-500'
            : 'bg-white border-red-500'
        }`}>
          <div className="flex items-start gap-3">
            <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white text-lg ${
              stornoMsg.type === 'success' ? 'bg-green-500' : 'bg-red-500'
            }`}>
              {stornoMsg.type === 'success' ? '✓' : '✕'}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className={`font-bold text-sm ${
                stornoMsg.type === 'success' ? 'text-green-800' : 'text-red-800'
              }`}>
                {stornoMsg.type === 'success' ? 'Operațiune reușită' : 'Eroare'}
              </h4>
              {stornoMsg.text.split('\n').map((line, i) => (
                <p key={i} className="text-sm text-gray-600 mt-0.5">{line.replace(/^[✅❌]\s*/, '')}</p>
              ))}
            </div>
            <button
              onClick={() => { setStornoVisible(false); setTimeout(() => setStornoMsg(null), 300); }}
              className="text-gray-400 hover:text-gray-600 text-lg leading-none"
            >
              ×
            </button>
          </div>
          {/* Progress bar */}
          {stornoVisible && (
            <div className="mt-3 h-1 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full animate-shrink ${
                stornoMsg.type === 'success' ? 'bg-green-400' : 'bg-red-400'
              }`} />
            </div>
          )}
          <style jsx>{`
            @keyframes shrink {
              from { width: 100%; }
              to { width: 0%; }
            }
            .animate-shrink {
              animation: shrink 5s linear forwards;
            }
          `}</style>
        </div>
      )}

      {invoices.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">Factură</th>
                <th className="px-3 py-2 text-left font-semibold">Data</th>
                <th className="px-3 py-2 text-left font-semibold">Scadență</th>
                <th className="px-3 py-2 text-left font-semibold">Client</th>
                <th className="px-3 py-2 text-left font-semibold">CUI</th>
                <th className="px-3 py-2 text-left font-semibold">Comandă</th>
                <th className="px-3 py-2 text-left font-semibold">Produse</th>
                <th className="px-3 py-2 text-right font-semibold">Fără TVA</th>
                <th className="px-3 py-2 text-right font-semibold">TVA</th>
                <th className="px-3 py-2 text-right font-semibold">Total</th>
                <th className="px-3 py-2 text-center font-semibold">Acțiuni</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {invoices.map((inv) => {
                const isStorno = inv.type === 'STORNO';
                const hasStorno = invoices.some(s => s.stornoOfId === inv.id);
                const stornoInv = hasStorno ? invoices.find(s => s.stornoOfId === inv.id) : null;
                return (
                <tr key={`${inv.serie}-${inv.numar}`} className={`hover:bg-gray-50 ${isStorno ? 'bg-red-50' : hasStorno ? 'bg-orange-50/50' : ''}`}>
                  <td className="px-3 py-2">
                    <div className="font-mono font-semibold text-blue-700">
                      {inv.serie}-{String(inv.numar).padStart(4, "0")}
                    </div>
                    {isStorno && (
                      <div className="text-xs text-red-600 font-medium mt-0.5">
                        ⛔ STORNO pt. {inv.serie}-{String(inv.stornoOfNumber || 0).padStart(4, "0")}
                      </div>
                    )}
                    {hasStorno && stornoInv && (
                      <div className="text-xs text-orange-600 font-medium mt-0.5">
                        ⚠️ Stornată prin {stornoInv.serie}-{String(stornoInv.numar).padStart(4, "0")}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2">{inv.dataFactura}</td>
                  <td className="px-3 py-2">{inv.dataScadenta}</td>
                  <td className="px-3 py-2 font-medium">{inv.clientNume}</td>
                  <td className="px-3 py-2 font-mono text-xs">{inv.clientCUI || "—"}</td>
                  <td className="px-3 py-2">#{inv.numarComanda}</td>
                  <td className="px-3 py-2 text-xs max-w-[200px]">
                    {inv.produse.map((p, i) => (
                      <div key={i} className="truncate" title={p.denumire}>
                        {p.cantitate}x {p.denumire}
                      </div>
                    ))}
                    {inv.courierCost > 0 && (
                      <div className="text-gray-400">+ transport {inv.courierCost} RON</div>
                    )}
                  </td>
                  <td className={`px-3 py-2 text-right font-mono ${isStorno ? 'text-red-600' : ''}`}>{isStorno ? '-' : ''}{inv.subtotal.toFixed(2)}</td>
                  <td className={`px-3 py-2 text-right font-mono ${isStorno ? 'text-red-600' : 'text-amber-600'}`}>{isStorno ? '-' : ''}{inv.tvaSuma.toFixed(2)}</td>
                  <td className={`px-3 py-2 text-right font-mono font-bold ${isStorno ? 'text-red-600' : ''}`}>{isStorno ? '-' : ''}{inv.total.toFixed(2)}</td>
                  <td className="px-3 py-2 text-center">
                    <div className="flex gap-1 justify-center flex-wrap">
                      {inv.invoiceUrl && (
                        <a
                          href={inv.invoiceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800"
                          title="Descarcă PDF"
                        >
                          📥
                        </a>
                      )}
                      <button
                        onClick={() => handleRegenPdf(inv.id, `${inv.serie}-${String(inv.numar).padStart(4, "0")}`)}
                        className="text-purple-500 hover:text-purple-700"
                        title="Regenerează PDF"
                      >
                        🔄
                      </button>
                      <button
                        onClick={() => exportXml(inv.id)}
                        className="text-green-600 hover:text-green-800"
                        title="Export XML e-Factura"
                      >
                        📄
                      </button>
                      {!isStorno && !hasStorno && (
                        <button
                          onClick={() => handleStorno(inv.id, `${inv.serie}-${String(inv.numar).padStart(4, "0")}`)}
                          className="text-red-500 hover:text-red-700"
                          title="Stornare factură"
                        >
                          ↩️
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(inv.id, `${inv.serie}-${String(inv.numar).padStart(4, "0")}`)}
                        className="text-red-400 hover:text-red-600"
                        title="Șterge factura"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Instrucțiuni SAGA */}
      {loaded && invoices.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
          <h3 className="font-bold text-blue-800 mb-2">📋 Import în SAGA</h3>
          <ol className="text-sm text-blue-700 list-decimal ml-5 space-y-1">
            <li>Apasă <strong>Export CSV (SAGA)</strong> pentru a descărca fișierul.</li>
            <li>Deschide SAGA → <strong>Documente → Import documente</strong>.</li>
            <li>Selectează fișierul CSV descărcat.</li>
            <li>Mapează coloanele: Serie, Număr, Data factura, Client, Produse, Sume.</li>
            <li>Verifică factura are seria <strong>PCT</strong> (aceeași ca în SAGA).</li>
            <li>Confirmă importul.</li>
          </ol>
        </div>
      )}
    </div>
  );
}
