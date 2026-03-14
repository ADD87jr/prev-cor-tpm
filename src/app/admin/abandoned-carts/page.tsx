"use client";
import { useState, useEffect } from "react";

interface CartItem {
  productId: number;
  name: string;
  quantity: number;
  price: number;
  sku?: string;
}

interface AbandonedCart {
  id: number;
  email: string;
  phone: string | null;
  items: CartItem[];
  total: number;
  createdAt: string;
  emailSent: boolean;
  emailSentAt: string | null;
  recovered: boolean;
}

interface Stats {
  total: number;
  notRecovered: number;
  recovered: number;
  emailSent: number;
  totalValue: number;
  recoveredValue: number;
}

export default function AbandonedCartsPage() {
  const [carts, setCarts] = useState<AbandonedCart[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "recovered">("active");
  const [expandedCart, setExpandedCart] = useState<number | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ show: boolean; cartId: number | null; email: string }>({ show: false, cartId: null, email: "" });

  useEffect(() => {
    fetchCarts();
  }, []);

  const fetchCarts = async () => {
    try {
      const res = await fetch("/admin/api/abandoned-carts");
      const data = await res.json();
      setCarts(data.carts || []);
      setStats(data.stats);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const markRecovered = async (id: number) => {
    try {
      await fetch("/admin/api/abandoned-carts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "markRecovered" })
      });
      fetchCarts();
    } catch (e) {
      console.error(e);
    }
  };

  const deleteCart = async (id: number) => {
    try {
      await fetch(`/admin/api/abandoned-carts?id=${id}`, { method: "DELETE" });
      setDeleteModal({ show: false, cartId: null, email: "" });
      fetchCarts();
    } catch (e) {
      console.error(e);
    }
  };

  const openDeleteModal = (cart: AbandonedCart) => {
    setDeleteModal({ show: true, cartId: cart.id, email: cart.email });
  };

  const filteredCarts = carts.filter(c => {
    if (filter === "active") return !c.recovered;
    if (filter === "recovered") return c.recovered;
    return true;
  });

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("ro-RO", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const timeSince = (dateStr: string) => {
    const now = new Date();
    const then = new Date(dateStr);
    const diff = now.getTime() - then.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (days > 0) return `acum ${days} zile`;
    if (hours > 0) return `acum ${hours} ore`;
    return "recent";
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin h-10 w-10 border-4 border-orange-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">🛒 Coșuri Abandonate</h1>
      <p className="text-gray-600 mb-6">Vizualizează și gestionează coșurile abandonate de clienți</p>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{stats.notRecovered}</p>
            <p className="text-gray-600 text-sm">Nerecuperate</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.recovered}</p>
            <p className="text-gray-600 text-sm">Recuperate</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <p className="text-2xl font-bold text-orange-600">{stats.totalValue.toLocaleString("ro-RO")} RON</p>
            <p className="text-gray-600 text-sm">Valoare pierdută</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{stats.emailSent}</p>
            <p className="text-gray-600 text-sm">Emailuri trimise</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setFilter("active")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${filter === "active" ? "bg-red-600 text-white" : "bg-gray-100 hover:bg-gray-200"}`}
        >
          🔴 Active ({stats?.notRecovered || 0})
        </button>
        <button
          onClick={() => setFilter("recovered")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${filter === "recovered" ? "bg-green-600 text-white" : "bg-gray-100 hover:bg-gray-200"}`}
        >
          ✅ Recuperate ({stats?.recovered || 0})
        </button>
        <button
          onClick={() => setFilter("all")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${filter === "all" ? "bg-gray-700 text-white" : "bg-gray-100 hover:bg-gray-200"}`}
        >
          📋 Toate ({stats?.total || 0})
        </button>
      </div>

      {/* Carts List */}
      {filteredCarts.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500 text-lg">Nu există coșuri abandonate în această categorie</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredCarts.map(cart => (
            <div key={cart.id} className={`bg-white rounded-lg shadow overflow-hidden ${cart.recovered ? "opacity-70" : ""}`}>
              {/* Header */}
              <div 
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                onClick={() => setExpandedCart(expandedCart === cart.id ? null : cart.id)}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-3 h-3 rounded-full ${cart.recovered ? "bg-green-500" : "bg-red-500"}`}></div>
                  <div>
                    <p className="font-semibold">{cart.email}</p>
                    {cart.phone && <p className="text-sm text-gray-500">{cart.phone}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="font-bold text-lg text-orange-600">{cart.total.toLocaleString("ro-RO")} RON</p>
                    <p className="text-xs text-gray-500">{timeSince(cart.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {cart.emailSent && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">📧 Email trimis</span>
                    )}
                    {cart.recovered && (
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">✅ Recuperat</span>
                    )}
                  </div>
                  <span className="text-gray-400">{expandedCart === cart.id ? "▲" : "▼"}</span>
                </div>
              </div>

              {/* Expanded Details */}
              {expandedCart === cart.id && (
                <div className="border-t bg-gray-50 p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Data abandonare</p>
                      <p className="font-medium">{formatDate(cart.createdAt)}</p>
                    </div>
                    {cart.emailSentAt && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Email trimis la</p>
                        <p className="font-medium">{formatDate(cart.emailSentAt)}</p>
                      </div>
                    )}
                  </div>

                  <h4 className="font-semibold mb-2">🛍️ Produse în coș ({Array.isArray(cart.items) ? cart.items.length : 0})</h4>
                  <div className="bg-white rounded-lg border divide-y">
                    {Array.isArray(cart.items) && cart.items.map((item, i) => (
                      <div key={i} className="p-3 flex items-center justify-between">
                        <div>
                          <p className="font-medium">{item.name}</p>
                          {item.sku && <p className="text-xs text-gray-500">SKU: {item.sku}</p>}
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{(item.price * item.quantity).toLocaleString("ro-RO")} RON</p>
                          <p className="text-xs text-gray-500">{item.quantity} x {item.price.toLocaleString("ro-RO")} RON</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  {!cart.recovered && (
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => markRecovered(cart.id)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                      >
                        ✅ Marchează recuperat
                      </button>
                      <a
                        href={`mailto:${cart.email}?subject=Ai uitat ceva în coș!&body=Bună! Am observat că ai lăsat câteva produse în coș. Vrei să finalizezi comanda?`}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                      >
                        📧 Trimite email
                      </a>
                      <button
                        onClick={() => openDeleteModal(cart)}
                        className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm ml-auto"
                      >
                        🗑️ Șterge
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.show && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="bg-red-50 px-6 py-4 border-b border-red-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Confirmare ștergere</h3>
                  <p className="text-sm text-gray-500">Această acțiune nu poate fi anulată</p>
                </div>
              </div>
            </div>
            
            {/* Body */}
            <div className="px-6 py-5">
              <p className="text-gray-700">
                Ești sigur că vrei să ștergi coșul abandonat pentru:
              </p>
              <div className="mt-3 p-3 bg-gray-100 rounded-lg">
                <p className="font-medium text-gray-900">{deleteModal.email}</p>
              </div>
              <p className="mt-3 text-sm text-gray-500">
                Toate datele asociate acestui coș vor fi șterse permanent.
              </p>
            </div>
            
            {/* Footer */}
            <div className="bg-gray-50 px-6 py-4 flex gap-3 justify-end border-t">
              <button
                onClick={() => setDeleteModal({ show: false, cartId: null, email: "" })}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors"
              >
                Anulează
              </button>
              <button
                onClick={() => deleteModal.cartId && deleteCart(deleteModal.cartId)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Șterge definitiv
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
