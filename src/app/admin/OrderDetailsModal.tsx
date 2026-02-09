import React from "react";

// Link-uri tracking pentru curierii din România
const COURIER_TRACKING_URLS: Record<string, string> = {
  "FanCourier": "https://www.fancourier.ro/awb-tracking/?tracking=",
  "Cargus": "https://www.cargus.ro/tracking/?t=",
  "DPD": "https://tracking.dpd.ro/parcelTracking?lang=ro&awbNumber=",
  "GLS": "https://gls-group.eu/RO/ro/serviciul-de-tracking-al-coletelor?match=",
  "Sameday": "https://www.sameday.ro/#awb/",
};

export default function OrderDetailsModal({ open, onClose, orders, title, onUpdate }: { open: boolean; onClose: () => void; orders: any[]; title?: string; onUpdate?: (updatedOrder: any) => void }) {
  const [total, setTotal] = React.useState(orders[0]?.total ?? 0);
  const [clientName, setClientName] = React.useState(orders[0]?.clientData?.name ?? '');
  const [clientEmail, setClientEmail] = React.useState(orders[0]?.clientData?.email ?? '');
  const [status, setStatus] = React.useState(orders[0]?.status ?? 'nouă');
  const [awb, setAwb] = React.useState(orders[0]?.awb ?? '');
  const [courierName, setCourierName] = React.useState(orders[0]?.courierName ?? '');
  const [saving, setSaving] = React.useState(false);
  
  // Sync state when orders change
  React.useEffect(() => {
    if (orders[0]) {
      setTotal(orders[0].total ?? 0);
      setClientName(orders[0].clientData?.name ?? '');
      setClientEmail(orders[0].clientData?.email ?? '');
      setStatus(orders[0].status ?? 'nouă');
      setAwb(orders[0].awb ?? '');
      setCourierName(orders[0].courierName ?? '');
    }
  }, [orders]);
  
  if (!open || !orders[0]) return null;
  const o = orders[0];
  
  // Generează link tracking
  const trackingUrl = courierName && awb && COURIER_TRACKING_URLS[courierName] 
    ? COURIER_TRACKING_URLS[courierName] + awb 
    : null;
  
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/admin/api/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: o.id, total, clientData: { name: clientName, email: clientEmail }, status, awb, courierName })
    });
    const data = await res.json();
    setSaving(false);
    if (onUpdate && data.order) {
      onUpdate(data.order);
    }
    onClose();
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full relative">
        <button onClick={onClose} className="absolute top-2 right-2 text-gray-500 hover:text-red-600 text-xl font-bold">×</button>
        <h2 className="text-xl font-bold mb-4 text-blue-700">Editează comanda #{o.id}</h2>
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Total (RON)</label>
            <input type="number" value={total} onChange={e => setTotal(Number(e.target.value))} className="border rounded px-3 py-2 w-full" min={0} step={0.01} required />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Nume client</label>
            <input type="text" value={clientName} onChange={e => setClientName(e.target.value)} className="border rounded px-3 py-2 w-full" required />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Email client</label>
            <input type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} className="border rounded px-3 py-2 w-full" required />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)} className="border rounded px-3 py-2 w-full">
              <option value="nouă">Nouă</option>
              <option value="procesată">Procesată</option>
              <option value="livrată">Livrată</option>
            </select>
          </div>
          
          {/* Secțiune AWB & Tracking */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <h3 className="text-sm font-bold text-blue-700 mb-3">📦 Tracking Livrare</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold mb-1">Curier</label>
                <select value={courierName} onChange={e => setCourierName(e.target.value)} className="border rounded px-3 py-2 w-full">
                  <option value="">-- Selectează curier --</option>
                  <option value="FanCourier">FanCourier</option>
                  <option value="Cargus">Cargus</option>
                  <option value="DPD">DPD</option>
                  <option value="GLS">GLS</option>
                  <option value="Sameday">Sameday</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">AWB</label>
                <input 
                  type="text" 
                  value={awb} 
                  onChange={e => setAwb(e.target.value)} 
                  className="border rounded px-3 py-2 w-full font-mono" 
                  placeholder="ex: 123456789"
                />
              </div>
            </div>
            {trackingUrl && (
              <div className="mt-3">
                <a 
                  href={trackingUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded font-semibold hover:bg-green-700 transition text-sm"
                >
                  🔍 Verifică status livrare ({courierName})
                </a>
              </div>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-semibold mb-1">Produse</label>
            <ul className="list-disc ml-6 text-gray-700">
              {Array.isArray(o.items) && o.items.map((it: any, i: number) => (
                <li key={i}>{it.name} x{it.quantity}</li>
              ))}
            </ul>
          </div>
          <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded font-bold" disabled={saving}>{saving ? "Se salvează..." : "Salvează"}</button>
        </form>
      </div>
    </div>
  );
}
