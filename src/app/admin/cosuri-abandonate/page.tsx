"use client";
import { useState, useEffect } from "react";

interface AbandonedCart {
  id: number;
  email: string;
  phone: string | null;
  items: any[];
  total: number;
  createdAt: string;
  emailSent: boolean;
  emailSentAt: string | null;
  recovered: boolean;
}

export default function AbandonedCartsPage() {
  const [carts, setCarts] = useState<AbandonedCart[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [deleting, setDeleting] = useState<number | null>(null);

  useEffect(() => {
    fetchCarts();
  }, []);

  const fetchCarts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/abandoned-cart?days=30");
      const data = await res.json();
      setCarts(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Error fetching carts:", e);
      setCarts([]);
    }
    setLoading(false);
  };

  const deleteCart = async (id: number) => {
    if (!confirm("Sigur vrei să ștergi acest coș abandonat?")) return;
    setDeleting(id);
    try {
      await fetch(`/api/abandoned-cart?id=${id}`, { method: "DELETE" });
      setCarts(carts.filter(c => c.id !== id));
      setMessage("Coș șters cu succes");
    } catch (e) {
      setMessage("Eroare la ștergere");
    }
    setDeleting(null);
  };

  const deleteAllCarts = async () => {
    if (!confirm(`Sigur vrei să ștergi TOATE cele ${carts.length} coșuri abandonate?`)) return;
    setSending(true);
    try {
      const res = await fetch("/api/abandoned-cart?deleteAll=true", { method: "DELETE" });
      const data = await res.json();
      setMessage(`${data.deleted || 0} coșuri șterse`);
      setCarts([]);
    } catch (e) {
      setMessage("Eroare la ștergere");
    }
    setSending(false);
  };

  const sendReminders = async () => {
    setSending(true);
    setMessage("");
    try {
      const res = await fetch("/api/cron/abandoned-cart-email?secret=manual-trigger", {
        method: "POST"
      });
      const data = await res.json();
      setMessage(`Trimise ${data.sent || 0} email-uri, ${data.errors || 0} erori`);
      fetchCarts(); // Refresh
    } catch (e) {
      setMessage("Eroare la trimitere");
    }
    setSending(false);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("ro-RO") + " " + d.toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" });
  };

  const timeSince = (dateStr: string) => {
    const hours = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60));
    if (hours < 1) return "< 1 oră";
    if (hours < 24) return `${hours} ore`;
    const days = Math.floor(hours / 24);
    return `${days} zile`;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">🛒 Coșuri Abandonate</h1>
          <div className="flex gap-4 items-center">
            {message && (
              <span className="text-sm text-green-600 bg-green-50 px-3 py-1 rounded">
                {message}
              </span>
            )}
            <button
              onClick={sendReminders}
              disabled={sending}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
            >
              {sending ? "Se trimit..." : "📧 Trimite reminder-uri"}
            </button>
            {carts.length > 0 && (
              <button
                onClick={deleteAllCarts}
                disabled={sending}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:bg-gray-400"
              >
                🗑️ Șterge toate ({carts.length})
              </button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 bg-gray-100 border-b text-sm text-gray-600">
            Coșuri abandonate în ultimele 30 zile (nerecuperate)
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-500">Se încarcă...</div>
          ) : carts.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              🎉 Nu există coșuri abandonate!
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 text-left text-sm text-gray-600">
                <tr>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Telefon</th>
                  <th className="px-4 py-3">Produse</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Abandonat</th>
                  <th className="px-4 py-3">Email trimis</th>
                  <th className="px-4 py-3">Acțiuni</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {carts.map((cart) => (
                  <tr key={cart.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <a href={`mailto:${cart.email}`} className="text-blue-600 hover:underline">
                        {cart.email}
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      {cart.phone ? (
                        <a href={`tel:${cart.phone}`} className="text-blue-600 hover:underline">
                          {cart.phone}
                        </a>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="max-w-xs">
                        {(cart.items as any[]).map((item, i) => (
                          <div key={i} className="text-sm truncate">
                            {item.quantity}x {item.name}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-semibold">
                      {cart.total.toFixed(2)} RON
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div>{formatDate(cart.createdAt)}</div>
                      <div className="text-gray-400">({timeSince(cart.createdAt)})</div>
                    </td>
                    <td className="px-4 py-3">
                      {cart.emailSent ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                          ✓ {cart.emailSentAt ? formatDate(cart.emailSentAt) : "Da"}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs">
                          ⏳ În așteptare
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => deleteCart(cart.id)}
                        disabled={deleting === cart.id}
                        className="text-red-600 hover:text-red-800 text-sm font-medium disabled:opacity-50"
                      >
                        {deleting === cart.id ? "..." : "🗑️ Șterge"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg text-sm text-blue-800">
          <strong>Cum funcționează:</strong>
          <ul className="list-disc ml-5 mt-2 space-y-1">
            <li>Când un client introduce emailul la checkout dar nu finalizează, coșul se salvează automat</li>
            <li>După 1 oră, se poate trimite un email reminder (sau poți rula cron job automat)</li>
            <li>Când clientul finalizează comanda, coșul este marcat ca „recuperat"</li>
            <li>Butonul „Trimite reminder-uri" trimite emailuri pentru coșurile care nu au primit încă</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
