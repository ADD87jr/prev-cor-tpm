import React from "react";

// Link-uri tracking pentru curierii din România
const COURIER_TRACKING_URLS: Record<string, string> = {
  "FanCourier": "https://www.fancourier.ro/awb-tracking/?tracking=",
  "Cargus": "https://www.cargus.ro/tracking/?t=",
  "DPD": "https://tracking.dpd.ro/parcelTracking?lang=ro&awbNumber=",
  "GLS": "https://gls-group.eu/RO/ro/serviciul-de-tracking-al-coletelor?match=",
  "Sameday": "https://www.sameday.ro/#awb/",
};

// Mapare deliveryType (de la coș) la courierName default
const DELIVERY_TYPE_TO_COURIER: Record<string, string> = {
  "pickup": "Ridicare personală",
  "client": "Ridicare personală",
  // standard/express/rapid nu au curier pre-selectat
};

// Labels pentru deliveryType
const DELIVERY_TYPE_LABELS: Record<string, string> = {
  "pickup": "Ridicare de la sediu",
  "client": "Ridicare de la sediu",
  "standard": "Curier standard",
  "express": "Curier express",
  "rapid": "Curier rapid",
};

interface OrderItem {
  id?: number;
  name: string;
  price: number;
  qty: number;
  quantity?: number;
  variant?: string;
}

export default function OrderDetailsModal({ open, onClose, orders, title, onUpdate }: { open: boolean; onClose: () => void; orders: any[]; title?: string; onUpdate?: (updatedOrder: any) => void }) {
  const [clientName, setClientName] = React.useState(orders[0]?.clientData?.name ?? '');
  const [clientEmail, setClientEmail] = React.useState(orders[0]?.clientData?.email ?? '');
  const [status, setStatus] = React.useState(orders[0]?.status ?? 'nouă');
  const [awb, setAwb] = React.useState(orders[0]?.awb ?? '');
  const [courierName, setCourierName] = React.useState(orders[0]?.courierName ?? '');
  const [courierCost, setCourierCost] = React.useState<number>(typeof orders[0]?.courierCost === 'number' ? orders[0].courierCost : 0);
  const [saving, setSaving] = React.useState(false);
  const [sendingOffer, setSendingOffer] = React.useState(false);
  const [offerMessage, setOfferMessage] = React.useState<{type: 'success'|'error', text: string} | null>(null);
  const [sendingInvoice, setSendingInvoice] = React.useState(false);
  const [invoiceMessage, setInvoiceMessage] = React.useState<{type: 'success'|'error', text: string} | null>(null);
  const [invoiceUrl, setInvoiceUrl] = React.useState<string | null>(orders[0]?.invoiceUrl || null);
  
  // State pentru produse editabile
  const [items, setItems] = React.useState<OrderItem[]>([]);
  
  // Calculează totalul din items
  const calculatedTotal = React.useMemo(() => {
    return items.reduce((sum, item) => sum + (item.price * item.qty), 0);
  }, [items]);
  
  // Sync state when orders change
  React.useEffect(() => {
    if (orders[0]) {
      setClientName(orders[0].clientData?.name ?? orders[0].clientData?.denumire ?? '');
      setClientEmail(orders[0].clientData?.email ?? '');
      setStatus(orders[0].status ?? 'nouă');
      setAwb(orders[0].awb ?? '');
      
      // Citește deliveryType din comandă (poate fi în clientData sau direct pe order)
      const deliveryType = orders[0].clientData?.deliveryType || orders[0].deliveryType || '';
      
      // Pre-selectează curierul bazat pe deliveryType dacă nu există courierName setat
      const existingCourier = orders[0].courierName || '';
      if (existingCourier) {
        setCourierName(existingCourier);
      } else if (DELIVERY_TYPE_TO_COURIER[deliveryType]) {
        setCourierName(DELIVERY_TYPE_TO_COURIER[deliveryType]);
      } else {
        setCourierName('');
      }
      
      // Costul curier e 0 pentru pickup/ridicare
      const isPickup = deliveryType === 'pickup' || deliveryType === 'client';
      if (isPickup && !existingCourier) {
        setCourierCost(0);
      } else {
        setCourierCost(typeof orders[0].courierCost === 'number' ? orders[0].courierCost : 0);
      }
      
      setOfferMessage(null);
      setInvoiceMessage(null);
      setInvoiceUrl(orders[0]?.invoiceUrl || null);
      
      // Normalizează items
      const rawItems = orders[0].items || [];
      setItems(rawItems.map((it: any) => ({
        id: it.id,
        name: it.name,
        price: Number(it.price) || 0,
        qty: it.qty ?? it.quantity ?? 1,
        variant: it.variant || it.variantCode || it.variantInfo || it.selectedVariant || it.variantLabel || ''
      })));
    }
  }, [orders]);
  
  if (!open || !orders[0]) return null;
  const o = orders[0];
  
  // Generează link tracking
  const trackingUrl = courierName && awb && COURIER_TRACKING_URLS[courierName] 
    ? COURIER_TRACKING_URLS[courierName] + awb 
    : null;
  
  // Update item price or qty
  function updateItem(index: number, field: 'price' | 'qty', value: number) {
    setItems(prev => prev.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ));
  }
  
  async function handleSendOffer() {
    setSendingOffer(true);
    setOfferMessage(null);
    try {
      // Salvează mai întâi modificările
      await fetch("/admin/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          orderId: o.id, 
          total: calculatedTotal, 
          items: items.map(it => ({ ...it, quantity: it.qty })),
          clientData: { name: clientName, email: clientEmail }, 
          status: 'awaiting_price',
          awb, 
          courierName 
        })
      });
      
      // Apoi trimite oferta
      const res = await fetch("/api/price-confirm/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: o.id })
      });
      const data = await res.json();
      if (data.success) {
        setOfferMessage({ type: 'success', text: 'Email trimis către client!' });
        setStatus('awaiting_price');
      } else {
        setOfferMessage({ type: 'error', text: data.error || 'Eroare la trimitere' });
      }
    } catch {
      setOfferMessage({ type: 'error', text: 'Eroare la trimitere' });
    }
    setSendingOffer(false);
  }
  
  async function handleSendInvoice() {
    setSendingInvoice(true);
    setInvoiceMessage(null);
    try {
      const res = await fetch("/api/send-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order: {
            orderId: o.id,
            id: o.id,
            number: o.number,
            date: o.date ? new Date(o.date).toLocaleDateString('ro-RO') : new Date().toLocaleDateString('ro-RO'),
            items: items.map(it => ({ ...it, quantity: it.qty })),
            userEmail: clientEmail,
            clientData: { name: clientName, email: clientEmail, ...(o.clientData || {}) },
            deliveryType: o.deliveryType || 'standard',
            courierCost: courierCost || 0,
          }
        })
      });
      if (res.ok) {
        setInvoiceMessage({ type: 'success', text: 'Factura a fost trimisă pe email!' });
        // Actualizează URL-ul facturii local pentru butonul de descărcare
        const invoiceNum = `PCT-${String(o.id).padStart(4, '0')}`;
        setInvoiceUrl(`/api/download-invoice?file=factura-${invoiceNum}.pdf`);
      } else {
        const errData = await res.json().catch(() => ({ error: 'Eroare necunoscută' }));
        setInvoiceMessage({ type: 'error', text: errData.error || 'Eroare la trimitere' });
      }
    } catch {
      setInvoiceMessage({ type: 'error', text: 'Eroare la trimitere factură' });
    }
    setSendingInvoice(false);
  }
  
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    // Validare: pentru status "expediată" trebuie curier (și AWB dacă nu e ridicare/livrare internă)
    const isInternalDelivery = courierName === 'Ridicare personală' || courierName === 'Livrare PREV-COR';
    if (status === 'expediată' && !courierName) {
      alert('Pentru statusul "Expediată" trebuie să selectați metoda de livrare!');
      return;
    }
    if (status === 'expediată' && !isInternalDelivery && !awb) {
      alert('Pentru statusul "Expediată" cu curier extern trebuie să completați AWB-ul!');
      return;
    }
    
    // Costul curier devine 0 pentru ridicare personală sau livrare PREV-COR
    const finalCourierCost = isInternalDelivery ? 0 : courierCost;
    
    setSaving(true);
    const res = await fetch("/admin/api/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        orderId: o.id, 
        total: calculatedTotal, 
        items: items.map(it => ({ ...it, quantity: it.qty })),
        clientData: { name: clientName, email: clientEmail }, 
        status, 
        awb, 
        courierName,
        courierCost: finalCourierCost
      })
    });
    const data = await res.json();
    setSaving(false);
    if (onUpdate && data.order) {
      onUpdate(data.order);
    }
    onClose();
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-4">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-lg w-full relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-2 right-2 text-gray-500 hover:text-red-600 text-xl font-bold">×</button>
        <h2 className="text-xl font-bold mb-4 text-blue-700">Editează comanda #{o.id}</h2>
        <form onSubmit={handleSave} className="flex flex-col gap-3">
          
          {/* Produse editabile */}
          <div>
            <label className="block text-sm font-semibold mb-2">Produse</label>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="text-left p-2">Produs</th>
                    <th className="text-center p-2 w-20">Cant.</th>
                    <th className="text-right p-2 w-24">Preț</th>
                    <th className="text-right p-2 w-24">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="p-2">
                        <div className="font-medium text-xs">{item.name}</div>
                        {item.variant && <div className="text-xs text-gray-500">{item.variant}</div>}
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          min={1}
                          value={item.qty}
                          onChange={e => updateItem(idx, 'qty', Number(e.target.value) || 1)}
                          className="border rounded w-16 px-2 py-1 text-center text-sm"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          value={item.price}
                          onChange={e => updateItem(idx, 'price', Number(e.target.value) || 0)}
                          className="border rounded w-20 px-2 py-1 text-right text-sm"
                        />
                      </td>
                      <td className="p-2 text-right font-medium">
                        {(item.price * item.qty).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-blue-50 font-bold">
                  <tr>
                    <td colSpan={3} className="p-2 text-right">TOTAL:</td>
                    <td className="p-2 text-right text-blue-700">{calculatedTotal.toFixed(2)} RON</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold mb-1">Nume client</label>
              <input type="text" value={clientName} onChange={e => setClientName(e.target.value)} className="border rounded px-3 py-2 w-full text-sm" required />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Email client</label>
              <input type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} className="border rounded px-3 py-2 w-full text-sm" required />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-semibold mb-1">Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)} className="border rounded px-3 py-2 w-full text-sm">
              <option value="nouă">Nouă</option>
              <option value="awaiting_price">Așteptare confirmare preț</option>
              <option value="pending">Confirmat - în procesare</option>
              <option value="procesată">Procesată</option>
              <option value="expediată">Expediată</option>
              <option value="livrată">Livrată</option>
              <option value="cancelled">Anulată</option>
            </select>
          </div>
          
          {/* Secțiune Trimite ofertă preț */}
          {(status === 'nouă' || status === 'awaiting_price') && (
            <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
              <h3 className="text-sm font-bold text-amber-700 mb-1">💰 Confirmare preț</h3>
              <p className="text-xs text-amber-600 mb-2">
                Salvează modificările și trimite email cu prețurile finale.
              </p>
              <button
                type="button"
                onClick={handleSendOffer}
                disabled={sendingOffer || !clientEmail}
                className="bg-amber-600 text-white px-4 py-2 rounded font-semibold hover:bg-amber-700 disabled:opacity-50 transition text-sm"
              >
                {sendingOffer ? 'Se trimite...' : '📧 Trimite ofertă client'}
              </button>
              {!clientEmail && (
                <p className="text-xs text-red-600 mt-1">⚠️ Clientul nu are email setat</p>
              )}
              {offerMessage && (
                <p className={`text-xs mt-1 ${offerMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                  {offerMessage.text}
                </p>
              )}
            </div>
          )}
          
          {/* Secțiune AWB & Tracking */}
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
            <h3 className="text-sm font-bold text-blue-700 mb-2">📦 Tracking Livrare</h3>
            {/* Afișează ce a ales clientul la checkout */}
            {(() => {
              const dt = o.clientData?.deliveryType || o.deliveryType;
              if (dt && DELIVERY_TYPE_LABELS[dt]) {
                return (
                  <p className="text-xs text-gray-600 mb-2 bg-white px-2 py-1 rounded">
                    📋 Alegere client la comandă: <strong>{DELIVERY_TYPE_LABELS[dt]}</strong>
                    {(dt === 'pickup' || dt === 'client') && <span className="text-green-600 ml-1">(0 cost curier)</span>}
                  </p>
                );
              }
              return null;
            })()}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold mb-1">Curier / Metoda livrare</label>
                <select value={courierName} onChange={e => setCourierName(e.target.value)} className="border rounded px-2 py-1 w-full text-sm">
                  <option value="">-- Selectează --</option>
                  <option value="FanCourier">FanCourier</option>
                  <option value="Cargus">Cargus</option>
                  <option value="DPD">DPD</option>
                  <option value="GLS">GLS</option>
                  <option value="Sameday">Sameday</option>
                  <option value="Ridicare personală">Ridicare personală</option>
                  <option value="Livrare PREV-COR">Livrare PREV-COR</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">AWB / Notă</label>
                <input 
                  type="text" 
                  value={awb} 
                  onChange={e => setAwb(e.target.value)} 
                  className="border rounded px-2 py-1 w-full font-mono text-sm" 
                  placeholder={courierName === "Ridicare personală" || courierName === "Livrare PREV-COR" ? "opțional" : "123456789"}
                />
              </div>
            </div>
            {trackingUrl && (
              <div className="mt-2">
                <a 
                  href={trackingUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 bg-green-600 text-white px-3 py-1 rounded font-semibold hover:bg-green-700 transition text-xs"
                >
                  🔍 Verifică livrare
                </a>
              </div>
            )}
          </div>
          
          {/* Secțiune Trimite factura */}
          <div className="bg-green-50 rounded-lg p-3 border border-green-200">
            <h3 className="text-sm font-bold text-green-700 mb-1">🧾 Facturare</h3>
            {invoiceUrl ? (
              <p className="text-xs text-green-700 mb-2 font-semibold">✅ Factura a fost generată și trimisă.</p>
            ) : (
              <p className="text-xs text-green-600 mb-2">
                Generează și trimite factura PDF pe emailul clientului.
              </p>
            )}
            <div className="flex gap-2 items-center flex-wrap">
              <button
                type="button"
                onClick={handleSendInvoice}
                disabled={sendingInvoice || !clientEmail}
                className={`${invoiceUrl ? 'bg-amber-500 hover:bg-amber-600' : 'bg-green-600 hover:bg-green-700'} text-white px-4 py-2 rounded font-semibold disabled:opacity-50 transition text-sm`}
              >
                {sendingInvoice ? 'Se generează...' : invoiceUrl ? '🔄 Retrimite factura' : '🧾 Trimite factura'}
              </button>
              <a
                href={invoiceUrl || `/api/download-invoice?file=factura-PCT-${String(o.id).padStart(4, '0')}.pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-blue-600 text-white px-4 py-2 rounded font-semibold hover:bg-blue-700 transition text-sm inline-block"
              >
                📥 Descarcă factura
              </a>
            </div>
            {!clientEmail && (
              <p className="text-xs text-red-600 mt-1">⚠️ Clientul nu are email setat</p>
            )}
            {invoiceMessage && (
              <p className={`text-xs mt-1 ${invoiceMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                {invoiceMessage.text}
              </p>
            )}
          </div>
          
          <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded font-bold mt-2" disabled={saving}>
            {saving ? "Se salvează..." : "Salvează modificările"}
          </button>
        </form>
      </div>
    </div>
  );
}
