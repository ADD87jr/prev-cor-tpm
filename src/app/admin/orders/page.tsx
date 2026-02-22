"use client";
import React, { useEffect, useState } from "react";
import OrderDetailsModal from "../OrderDetailsModal";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Toast from "@/components/Toast";
import ConfirmModal from "@/components/ConfirmModal";

export default function AdminOrdersPage() {
  // Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [defaultTva, setDefaultTva] = useState(19);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  
  // Încarcă TVA configurat din admin
  useEffect(() => {
    fetch('/admin/api/pagini?pagina=cos')
      .then(res => res.json())
      .then(data => {
        if (data && data.tva !== undefined) {
          setDefaultTva(Number(data.tva));
        }
      })
      .catch(() => {});
  }, []);

  function showToast(message: string, type: 'success' | 'error' = 'success') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  }

  // ...existing code...
  // ...existing code...
  // ...existing code...
  // ...existing code...
  // ...existing code...
  // ...existing code...
  // ...existing code...
  // ...existing code...
  // ...logica de debug eliminată...
    // ...existing code...
  const { data: session, status } = useSession();
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [clientFilter, setClientFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalOrder, setModalOrder] = useState<any | null>(null);
  const [deleteOrderId, setDeleteOrderId] = useState<number | null>(null);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.append("status", statusFilter);
    if (dateFilter) params.append("date", dateFilter);
    if (clientFilter) params.append("userEmail", clientFilter);
    fetch(`/admin/api/orders?${params.toString()}`)
      .then(res => res.json())
      .then(data => setOrders(data))
      .finally(() => setLoading(false));
  }, [statusFilter, dateFilter, clientFilter]);

  // funcția fetchOrders nu mai este necesară

  // Filtrare pentru a elimina dublurile (păstrează doar prima comandă unică după client, email, produse, total, paymentMethod normalizat)
  function normalizePaymentMethod(method: string) {
    if (!method) return '';
    const m = method.toLowerCase().replace(/\s+/g, '').trim();
    if (m === 'card' || m === 'cardonline') return 'card online';
    return 'card online' === m ? 'card online' : m;
  }
  function normalizeStatus(status: string) {
    if (!status) return '';
    return status.toLowerCase().trim();
  }
  function normalizeEmail(email: string) {
    return (email || '').toLowerCase().trim();
  }
  function normalizeItems(items: any[]) {
    return (items || [])
      .map(i => ({ id: i.id, name: (i.name || '').trim(), quantity: Number(i.quantity || i.qty || 1) }))
      .sort((a, b) => String(a.id || '').localeCompare(String(b.id || '')) || a.name.localeCompare(b.name) || a.quantity - b.quantity);
  }
  const groups = new Map<string, any[]>();
  for (const order of orders) {
    const groupKey = [
      normalizeEmail(order.clientData?.email || order.user?.email || ''),
      JSON.stringify(normalizeItems(order.items)),
      normalizePaymentMethod(order.paymentMethod),
      order.id // Folosim ID-ul pentru a nu grupa comenzi diferite
    ].join('|');
    if (!groups.has(groupKey)) groups.set(groupKey, []);
    groups.get(groupKey)!.push(order);
  }
  const uniqueOrders: any[] = [];
  for (const group of groups.values()) {
    const toKeep = group.reduce((min, o) => o.total < min.total ? o : min, group[0]);
    uniqueOrders.push(toKeep);
  }

  return (
    <div className="max-w-4xl mt-10 ml-4">
      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} />}
      <div className="bg-white rounded-xl shadow p-6 mb-2">
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
          Administrare comenzi
          {orders.filter(o => o.status === "nouă").length > 0 && (
            <span className="ml-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded-full animate-pulse">
              {orders.filter(o => o.status === "nouă").length} noi
            </span>
          )}
        </h1>
        <div className="mb-4 flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold mb-1">Status</label>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border rounded px-2 py-1">
              <option value="">Toate</option>
              <option value="nouă">Nouă</option>
              <option value="așteptare plată">În așteptare plată</option>
              <option value="procesată">Procesată</option>
              <option value="livrată">Livrată</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Dată</label>
            <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="border rounded px-2 py-1" />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Client (email)</label>
            <input type="text" value={clientFilter} onChange={e => setClientFilter(e.target.value)} placeholder="Căutare email..." className="border rounded px-2 py-1" />
          </div>
          <div>
            <button onClick={() => { setStatusFilter(""); setDateFilter(""); setClientFilter(""); }} className="ml-2 px-3 py-1 bg-gray-200 rounded hover:bg-gray-300">Reset filtre</button>
          </div>
          <div>
            <button
              onClick={() => setShowResetConfirm(true)}
              className="ml-2 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 font-bold"
            >
              Resetează comenzi
            </button>
          </div>
        </div>

        {/* Modal confirmare resetare */}
        <ConfirmModal
          isOpen={showResetConfirm}
          title="Resetare comenzi"
          message="Sigur vrei să ștergi toate comenzile și să resetezi numerotarea? Această acțiune este ireversibilă!"
          confirmText="Da, șterge tot"
          cancelText="Anulează"
          confirmColor="red"
          icon="danger"
          onConfirm={async () => {
            setShowResetConfirm(false);
            const res = await fetch("/api/orders/reset", { method: "POST" });
            if (res.ok) {
              showToast("Comenzile au fost șterse și numerotarea resetată!", "success");
              window.location.reload();
            } else {
              const data = await res.json();
              showToast("Eroare la resetare: " + (data?.error || res.status), "error");
            }
          }}
          onCancel={() => setShowResetConfirm(false)}
        />
        <div className="flex gap-4 mb-6 ml-4 flex-wrap">
          <div className="bg-blue-100 rounded px-4 py-2 text-blue-900 font-semibold">
            <span>Comenzi noi: </span>
            <span>{orders.filter(o => o.status === "nouă").length}</span>
          </div>
          <div className="bg-orange-100 rounded px-4 py-2 text-orange-900 font-semibold">
            <span>În așteptare: </span>
            <span>{orders.filter(o => o.status === "așteptare plată").length}</span>
          </div>
          <div className="bg-yellow-100 rounded px-4 py-2 text-yellow-900 font-semibold">
            <span>Procesate: </span>
            <span>{orders.filter(o => o.status === "procesată").length}</span>
          </div>
          <div className="bg-green-100 rounded px-4 py-2 text-green-900 font-semibold">
            <span>Livrate: </span>
            <span>{orders.filter(o => o.status === "livrată").length}</span>
          </div>
          <div className="bg-pink-100 rounded px-4 py-2 text-pink-900 font-semibold">
            <span>Comenzi manuale: </span>
            <span>{orders.filter(o => o.source === "manual").length}</span>
          </div>
          <div className="bg-gray-100 rounded px-4 py-2 text-gray-900 font-semibold">
            <span>Timp mediu procesare: </span>
            <span>{(() => {
              const processedOrders = orders.filter(o => o.status === "procesată" && o.statusUpdatedAt && o.date);
              if (processedOrders.length === 0) return '0m';
              const avgMs = processedOrders.reduce((acc, o) => acc + (new Date(o.statusUpdatedAt).getTime() - new Date(o.date).getTime()), 0) / processedOrders.length;
              const h = Math.floor(avgMs / 3600000);
              const m = Math.floor((avgMs % 3600000) / 60000);
              return h > 0 ? `${h}h ${m}m` : `${m}m`;
            })()}</span>
          </div>
          <div className="bg-gray-100 rounded px-4 py-2 text-gray-900 font-semibold">
            <span>Timp mediu livrare: </span>
            <span>{(() => {
              const deliveredOrders = orders.filter(o => o.status === "livrată" && o.statusUpdatedAt && o.date);
              if (deliveredOrders.length === 0) return '0m';
              const avgMs = deliveredOrders.reduce((acc, o) => acc + (new Date(o.statusUpdatedAt).getTime() - new Date(o.date).getTime()), 0) / deliveredOrders.length;
              const h = Math.floor(avgMs / 3600000);
              const m = Math.floor((avgMs % 3600000) / 60000);
              return h > 0 ? `${h}h ${m}m` : `${m}m`;
            })()}</span>
          </div>
        </div>
      </div>
      {loading && <div>Se încarcă comenzile...</div>}
      {!loading && uniqueOrders.length === 0 && <div className="text-gray-600">Nu există comenzi înregistrate.</div>}
      {!loading && uniqueOrders.length > 0 && (
        <table className="w-full bg-white rounded shadow mb-8">
          <thead className="bg-blue-50">
            <tr>
              <th className="p-2">ID</th>
              <th className="p-2">Data</th>
              <th className="p-2 w-32">Client</th>
              <th className="p-2">Email</th>
              <th className="p-2 w-40">Produse</th>
              <th className="p-2 w-40">Total</th>
              <th className="p-2">Status</th>
              <th className="p-2">Timp procesare/livrare</th>
              <th className="p-2">Comandă</th>
              <th className="p-2">Șterge</th>
            </tr>
          </thead>
          <tbody>
            {uniqueOrders.map((order: any, idx: number) => (
              <tr key={order.id} className="border-b hover:bg-blue-50 cursor-pointer" onClick={() => { setModalOrder(order); setModalOpen(true); }}>
                <td className="p-2 font-mono">{idx + 1}</td>
                <td className="p-2">{order.date ? new Date(order.date).toLocaleString("ro-RO", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "-"}</td>
                <td className="p-2 w-32 truncate" title={order.clientData?.denumire || order.clientData?.name || "-"}>{order.clientData?.denumire || order.clientData?.name || "-"}</td>
                <td className="p-2">{order.clientData?.email || order.user?.email || "-"}</td>
                <td className="p-2">
                  <span className="whitespace-nowrap overflow-x-auto block w-full" title={Array.isArray(order.items) ? order.items.map((item: any) => `${item.name} x ${(item.quantity ?? item.qty ?? 1)}`).join(', ') : ''}>
                    {Array.isArray(order.items) ? order.items.map((item: any) => `${item.name} x ${(item.quantity ?? item.qty ?? 1)}`).join(', ') : ''}
                  </span>
                </td>
                {/* Total cu TVA: folosește totalul salvat în baza de date */}
                <td className="p-2 w-40 whitespace-nowrap text-blue-900 font-bold">
                    {(() => {
                    // Folosește totalul salvat în baza de date (deja calculat corect cu stacking)
                    if (typeof order.total === 'number' && order.total > 0) {
                      return `${order.total.toFixed(2)} lei`;
                    }
                    // Fallback: calculează cu stacking dacă nu există total salvat
                    const coupon = order.appliedCoupon || order.coupon || null;
                    const subtotalDupaProduseDiscount = Array.isArray(order.items)
                      ? order.items.reduce((acc: number, item: any) => {
                          // Prețul deja include reducerea de produs - nu aplicăm discount suplimentar
                          const price = typeof item.price === 'number' ? item.price : 0;
                          return acc + price * (item.quantity ?? item.qty ?? 1);
                        }, 0)
                      : 0;
                    let subtotal = subtotalDupaProduseDiscount;
                    if (coupon) {
                      if (coupon.type === 'percent') {
                        subtotal = subtotal * (1 - coupon.value / 100);
                      } else if (coupon.type === 'fixed') {
                        subtotal = Math.max(0, subtotal - coupon.value);
                      }
                    }
                    const courier = typeof order.courierCost === 'number' ? order.courierCost : 0;
                    const tvaPercent = typeof order.tva === 'number' ? order.tva : defaultTva;
                    const totalFaraTVA = subtotal + courier;
                    const tvaValoare = Math.round(totalFaraTVA * tvaPercent / 100 * 100) / 100;
                    const totalCuTVA = Math.round((totalFaraTVA + tvaValoare) * 100) / 100;
                    return `${totalCuTVA.toFixed(2)} lei`;
                  })()}
                </td>
                <td className="p-2 w-40" title={Array.isArray(order.items) ? order.items.map((item: any) => `${item.name} x ${item.quantity}`).join(', ') : ''}
                  style={{
                    background:
                      order.status === "nouă" ? "#e3f0ff" :
                      order.status === "procesată" ? "#fff9db" :
                      order.status === "livrată" ? "#e6ffe6" : undefined,
                    color:
                      order.status === "nouă" ? "#2563eb" :
                      order.status === "procesată" ? "#b45309" :
                      order.status === "livrată" ? "#059669" : undefined,
                    fontWeight: "bold"
                  }}
                >
                  <span>
                    {['card', 'card online'].includes((order.paymentMethod || '').toLowerCase())
                      ? 'Card online'
                      : order.paymentMethod || order.status}
                    {order.source === 'manual' ? ' (manuală)' : ' (online)'}
                  </span>
                  <select
                    value={order.status}
                    onChange={async e => {
                      const newStatus = e.target.value;
                      const now = new Date().toISOString();
                      await fetch("/api/orders", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ id: order.id, status: newStatus, statusUpdatedAt: now })
                      });
                      setOrders(orders => orders.map(o => o.id === order.id ? { ...o, status: newStatus, statusUpdatedAt: now } : o));
                    }}
                    className="border rounded px-2 py-1 ml-2"
                    onClick={e => e.stopPropagation()}
                  >
                    <option value="nouă">Nouă</option>
                    <option value="așteptare plată">În așteptare plată</option>
                    <option value="procesată">Procesată</option>
                    <option value="livrată">Livrată</option>
                  </select>
                </td>
                <td className="p-2">
                  {order.statusUpdatedAt && order.date ? (() => {
                    const diffMs = new Date(order.statusUpdatedAt).getTime() - new Date(order.date).getTime();
                    const diffH = Math.floor(diffMs / 3600000);
                    const diffM = Math.floor((diffMs % 3600000) / 60000);
                    if (diffH > 0) return `${diffH}h ${diffM}m`;
                    return `${diffM}m`;
                  })() : '-'}
                </td>
                <td className="p-2">
                  <button
                    className="bg-gray-200 px-2 py-1 rounded text-xs hover:bg-gray-300 border"
                    onClick={async e => {
                      e.stopPropagation();
                      // Trimite doar orderId conform noii logici backend
                      const res = await fetch("/api/generate-invoice", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ orderId: order.id })
                      });
                      const contentType = res.headers.get("Content-Type");
                      if (contentType && contentType.includes("application/pdf")) {
                        const blob = await res.blob();
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `comanda-${order.id}.pdf`;
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                        setTimeout(() => window.URL.revokeObjectURL(url), 1000);
                      } else {
                        const text = await res.text();
                        showToast("Eroare generare PDF: " + text, "error");
                      }
                    }}
                  >
                    Descarcă comanda
                  </button>
                </td>
                <td className="p-2 flex gap-2">
                  <button
                    className="bg-yellow-400 text-yellow-900 px-2 py-1 rounded text-xs hover:bg-yellow-500 font-bold border"
                    onClick={e => {
                      e.stopPropagation();
                      setModalOrder(order);
                      setModalOpen(true);
                    }}
                  >
                    Editează
                  </button>
                  <button
                    className="bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700 font-bold"
                    onClick={e => {
                      e.stopPropagation();
                      setDeleteOrderId(order.id);
                    }}
                  >
                    Șterge
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Modal confirmare ștergere comandă individuală */}
      <ConfirmModal
        isOpen={deleteOrderId !== null}
        title="Ștergere comandă"
        message="Sigur vrei să ștergi această comandă? Acțiunea este ireversibilă."
        confirmText="Da, șterge"
        cancelText="Anulează"
        confirmColor="red"
        icon="danger"
        onConfirm={async () => {
          if (deleteOrderId) {
            const res = await fetch(`/api/orders?id=${deleteOrderId}`, { method: "DELETE" });
            if (res.ok) {
              setOrders(orders => orders.filter(o => o.id !== deleteOrderId));
              showToast("Comandă ștearsă cu succes!", "success");
            } else {
              showToast("Eroare la ștergere comandă!", "error");
            }
          }
          setDeleteOrderId(null);
        }}
        onCancel={() => setDeleteOrderId(null)}
      />

      <OrderDetailsModal open={modalOpen} onClose={() => setModalOpen(false)} orders={modalOrder ? [modalOrder] : []} />
    </div>
  );
}
