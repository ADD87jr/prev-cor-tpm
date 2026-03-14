"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface OrderData {
  orderId: number;
  orderNumber: string | null;
  total: number;
  courierCost: number;
  tvaPercent: number;
  items: Array<{
    name: string;
    qty: number;
    price: number;
    variant?: string;
  }>;
  clientName: string;
  status: string;
  expired: boolean;
  alreadyConfirmed: boolean;
}

export default function ConfirmPricePage() {
  const params = useParams();
  const router = useRouter();
  const token = (params?.token as string) || "";

  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    if (!token) return;

    fetch(`/api/price-confirm?token=${token}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setOrder(data);
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Eroare la încărcarea comenzii");
        setLoading(false);
      });
  }, [token]);

  const handleAction = async (action: "accept" | "reject") => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/price-confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          action,
          reason: action === "reject" ? rejectReason : undefined,
        }),
      });

      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setResult({ success: true, message: data.message });
      }
    } catch {
      setError("Eroare la procesare");
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Se încarcă comanda...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">Eroare</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link href="/" className="text-primary hover:underline">
            Înapoi la magazin
          </Link>
        </div>
      </div>
    );
  }

  if (result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <div className="text-5xl mb-4">{result.success ? "✓" : "✗"}</div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">
            {result.success ? "Mulțumim!" : "Eroare"}
          </h1>
          <p className="text-gray-600 mb-6">{result.message}</p>
          <Link href="/" className="bg-primary text-white px-6 py-3 rounded-lg inline-block hover:bg-primary/90">
            Înapoi la magazin
          </Link>
        </div>
      </div>
    );
  }

  if (!order) return null;

  if (order.expired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <div className="text-orange-500 text-5xl mb-4">⏰</div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">Link expirat</h1>
          <p className="text-gray-600 mb-6">
            Linkul de confirmare a expirat. Vă rugăm să ne contactați pentru a primi un link nou.
          </p>
          <Link href="/contact" className="text-primary hover:underline">
            Contactează-ne
          </Link>
        </div>
      </div>
    );
  }

  if (order.alreadyConfirmed || order.status === "pending") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <div className="text-green-500 text-5xl mb-4">✓</div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">Deja confirmat</h1>
          <p className="text-gray-600 mb-6">
            Prețul pentru această comandă a fost deja confirmat. Veți primi în curând detalii despre livrare.
          </p>
          <Link href="/" className="text-primary hover:underline">
            Înapoi la magazin
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-primary text-white p-6">
            <h1 className="text-2xl font-bold">Confirmare preț</h1>
            <p className="opacity-90">Comandă #{order.orderNumber || order.orderId}</p>
          </div>

          {/* Salut */}
          <div className="p-6 border-b">
            <p className="text-gray-700">
              Dragă <strong>{order.clientName}</strong>,
            </p>
            <p className="text-gray-600 mt-2">
              Vă mulțumim pentru comandă. Am verificat disponibilitatea produselor și vă prezentăm prețurile finale:
            </p>
          </div>

          {/* Produse */}
          <div className="p-6">
            {(() => {
              const subtotal = order.items.reduce((sum, item) => sum + item.price * item.qty, 0);
              const courierCost = order.courierCost || 0;
              const totalFaraTVA = subtotal + courierCost;
              const tvaPercent = order.tvaPercent || 21;
              const tva = totalFaraTVA * (tvaPercent / 100);
              const totalCuTVA = totalFaraTVA + tva;
              
              return (
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-gray-500 text-sm border-b">
                      <th className="pb-3">Produs</th>
                      <th className="pb-3 text-center">Cant.</th>
                      <th className="pb-3 text-right">Preț (fără TVA)</th>
                      <th className="pb-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((item, idx) => (
                      <tr key={idx} className="border-b">
                        <td className="py-3">
                          <div className="font-medium">{item.name}</div>
                          {item.variant && (
                            <div className="text-sm text-gray-500">{item.variant}</div>
                          )}
                        </td>
                        <td className="py-3 text-center">{item.qty}</td>
                        <td className="py-3 text-right">{item.price.toFixed(2)} RON</td>
                        <td className="py-3 text-right font-medium">
                          {(item.price * item.qty).toFixed(2)} RON
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="text-gray-600">
                      <td colSpan={3} className="pt-3 text-right">Subtotal produse:</td>
                      <td className="pt-3 text-right">{subtotal.toFixed(2)} RON</td>
                    </tr>
                    {courierCost > 0 && (
                      <tr className="text-gray-600">
                        <td colSpan={3} className="pt-2 text-right">Cost curier:</td>
                        <td className="pt-2 text-right">{courierCost.toFixed(2)} RON</td>
                      </tr>
                    )}
                    <tr className="text-gray-600">
                      <td colSpan={3} className="pt-2 text-right">TVA ({tvaPercent}%):</td>
                      <td className="pt-2 text-right">{tva.toFixed(2)} RON</td>
                    </tr>
                    <tr className="font-bold text-lg">
                      <td colSpan={3} className="pt-4 text-right">TOTAL DE PLATĂ (cu TVA):</td>
                      <td className="pt-4 text-right text-primary">{totalCuTVA.toFixed(2)} RON</td>
                    </tr>
                  </tfoot>
                </table>
              );
            })()}
          </div>

          {/* Acțiuni */}
          <div className="p-6 bg-gray-50">
            {!showRejectForm ? (
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => handleAction("accept")}
                  disabled={submitting}
                  className="flex-1 bg-green-600 text-white py-4 px-6 rounded-lg font-bold text-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  {submitting ? "Se procesează..." : "✓ Accept prețul"}
                </button>
                <button
                  onClick={() => setShowRejectForm(true)}
                  disabled={submitting}
                  className="flex-1 bg-gray-200 text-gray-700 py-4 px-6 rounded-lg font-medium hover:bg-gray-300 disabled:opacity-50 transition-colors"
                >
                  Refuz / Renunț
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-gray-600">
                  Ne pare rău să auzim asta. Puteți să ne spuneți motivul? (opțional)
                </p>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Prețul este prea mare / Am găsit altundeva / Alte motive..."
                  className="w-full border rounded-lg p-3 h-24 resize-none"
                />
                <div className="flex gap-4">
                  <button
                    onClick={() => setShowRejectForm(false)}
                    className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300"
                  >
                    Înapoi
                  </button>
                  <button
                    onClick={() => handleAction("reject")}
                    disabled={submitting}
                    className="flex-1 bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 disabled:opacity-50"
                  >
                    {submitting ? "Se procesează..." : "Confirm anularea"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 text-center text-sm text-gray-500 border-t">
            Acest link este valabil 7 zile de la primire.
          </div>
        </div>
      </div>
    </div>
  );
}
