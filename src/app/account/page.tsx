"use client";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useWishlist } from "../_components/WishlistContext";
import { useLanguage } from "../_components/LanguageContext";

type Order = { id: string; date: string; total: number; clientData?: any; awb?: string; courierName?: string; status?: string };

// Link-uri tracking pentru curierii din România
const COURIER_TRACKING_URLS: Record<string, string> = {
  "FanCourier": "https://www.fancourier.ro/awb-tracking/?tracking=",
  "Cargus": "https://www.cargus.ro/tracking/?t=",
  "DPD": "https://tracking.dpd.ro/parcelTracking?lang=ro&awbNumber=",
  "GLS": "https://gls-group.eu/RO/ro/serviciul-de-tracking-al-coletelor?match=",
  "Sameday": "https://www.sameday.ro/#awb/",
};

// Formatează data: 01.02.2026 15:50
function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day}.${month}.${year} ${hours}:${minutes}`;
}

export default function AccountPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const { items: wishlist } = useWishlist();
  const { language } = useLanguage();
  
  const txt = {
    loading: language === "en" ? "Loading..." : "Se încarcă...",
    myAccount: language === "en" ? "My account" : "Contul meu",
    welcome: language === "en" ? "Welcome," : "Bun venit,",
    orderHistory: language === "en" ? "Order history" : "Istoric comenzi",
    loadingOrders: language === "en" ? "Loading orders..." : "Se încarcă comenzile...",
    noOrders: language === "en" ? "No orders yet." : "Nu există comenzi.",
    orderNo: language === "en" ? "Order no." : "Nr. comandă",
    date: language === "en" ? "Date" : "Data",
    status: language === "en" ? "Status" : "Status",
    total: language === "en" ? "Total" : "Total",
    tracking: language === "en" ? "Tracking" : "Tracking",
    confirmation: language === "en" ? "Confirmation" : "Confirmare",
    trackPackage: language === "en" ? "📦 Track package" : "📦 Urmărește colet",
    courier: language === "en" ? "Courier" : "Curier",
    downloadPdf: language === "en" ? "Download PDF" : "Descarcă PDF",
    pdfError: language === "en" ? "Error generating confirmation. Please try again." : "Eroare la generarea confirmării. Încercați din nou.",
    myFavorites: language === "en" ? "My favorites" : "Favoritele mele",
    noFavorites: language === "en" ? "No favorite products yet." : "Nu ai produse la favorite.",
    viewProduct: language === "en" ? "View product" : "Vezi produs",
    backToShop: language === "en" ? "Back to shop" : "Înapoi la magazin",
    logout: language === "en" ? "Logout" : "Deconectare",
    statusDelivered: language === "en" ? "delivered" : "livrată",
    statusProcessed: language === "en" ? "processed" : "procesată",
    statusNew: language === "en" ? "new" : "nouă",
    statusPending: language === "en" ? "Pending" : "În așteptare",
  };

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user?.email) {
      setLoadingOrders(true);
      fetch(`/admin/api/orders?userEmail=${encodeURIComponent(session.user.email)}`)
        .then(res => res.json())
        .then(data => {
          // Asigură-te că data e un array
          if (Array.isArray(data)) {
            setOrders(data);
          } else {
            setOrders([]);
          }
        })
        .catch(() => setOrders([]))
        .finally(() => setLoadingOrders(false));
    }
  }, [session?.user?.email]);

  if (status === "loading") {
    return <div className="max-w-xl mx-auto mt-10 p-6 bg-white rounded-xl shadow">{txt.loading}</div>;
  }

  if (!session) return null;

  return (
    <div className="max-w-xl mx-auto mt-10 p-6 bg-white rounded-xl shadow">
      <h1 className="text-2xl font-bold mb-4">{txt.myAccount}</h1>
      <div className="mb-4">{txt.welcome} <span className="font-semibold">{session.user?.name || session.user?.email}</span>!</div>
      <h2 className="text-xl font-semibold mb-2 mt-8">{txt.orderHistory}</h2>
      {loadingOrders ? (
        <div>{txt.loadingOrders}</div>
      ) : orders.length === 0 ? (
        <div className="mb-8 text-gray-600">{txt.noOrders}</div>
      ) : (
        <>
        <table className="w-full bg-white rounded shadow mb-8">
          <thead className="bg-blue-50">
            <tr>
              <th className="p-2">{txt.orderNo}</th>
              <th className="p-2">{txt.date}</th>
              <th className="p-2">{txt.status}</th>
              <th className="p-2">{txt.total}</th>
              <th className="p-2">{txt.tracking}</th>
              <th className="p-2">{txt.confirmation}</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const trackingUrl = order.courierName && order.awb && COURIER_TRACKING_URLS[order.courierName]
                ? COURIER_TRACKING_URLS[order.courierName] + order.awb
                : null;
              const statusLabel = order.status === 'livrată' ? txt.statusDelivered :
                                  order.status === 'procesată' ? txt.statusProcessed :
                                  order.status === 'nouă' ? txt.statusNew : txt.statusPending;
              return (
              <tr key={order.id} className="border-b">
                <td className="p-2 font-mono">CMD-{order.id}</td>
                <td className="p-2">{formatDate(order.date)}</td>
                <td className="p-2">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                    order.status === 'livrată' ? 'bg-green-100 text-green-700' :
                    order.status === 'procesată' ? 'bg-yellow-100 text-yellow-700' :
                    order.status === 'nouă' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {statusLabel}
                  </span>
                </td>
                <td className="p-2">{Number(order.total).toFixed(2)} lei</td>
                <td className="p-2">
                  {order.awb ? (
                    <div className="flex flex-col gap-1">
                      <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{order.awb}</span>
                      {trackingUrl ? (
                        <a 
                          href={trackingUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs bg-green-600 text-white px-2 py-1 rounded text-center hover:bg-green-700 transition"
                        >
                          {txt.trackPackage}
                        </a>
                      ) : (
                        <span className="text-xs text-gray-500">{order.courierName || txt.courier}</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-gray-400 text-xs">-</span>
                  )}
                </td>
                <td className="p-2">
                  <button
                    className="bg-gray-200 px-2 py-1 rounded text-sm hover:bg-gray-300 border"
                    onClick={async () => {
                      const res = await fetch("/api/generate-invoice", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ orderId: order.id })
                      });
                      if (!res.ok) {
                        alert(txt.pdfError);
                        return;
                      }
                      const blob = await res.blob();
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `confirmare-CMD-${order.id}.pdf`;
                      document.body.appendChild(a);
                      a.click();
                      a.remove();
                      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
                    }}
                  >
                    {txt.downloadPdf}
                  </button>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
        </>
      )}

      <h2 className="text-xl font-semibold mb-2 mt-8">{txt.myFavorites}</h2>
      {wishlist.length === 0 ? (
        <div className="mb-8 text-gray-600">{txt.noFavorites}</div>
      ) : (
        <ul className="mb-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {wishlist.map(item => (
            <li key={item.id} className="flex items-center gap-3 bg-pink-50 rounded p-2 border border-pink-200">
              <Image src={item.image} alt={item.name} width={64} height={64} className="w-16 h-16 object-contain rounded bg-white border" />
              <span className="font-semibold flex-1">{item.name}</span>
              <a href={`/shop/${item.id}`} className="text-blue-600 underline">{txt.viewProduct}</a>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-3 mt-6">
        <Link
          href="/shop"
          className="bg-blue-600 text-white px-4 py-2 rounded font-bold hover:bg-blue-700 transition"
        >
          {txt.backToShop}
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="bg-red-600 text-white px-4 py-2 rounded font-bold hover:bg-red-700 transition"
        >
          {txt.logout}
        </button>
      </div>
    </div>
  );
}
