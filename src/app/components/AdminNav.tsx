"use client";
import Link from "next/link";

export default function AdminNav() {
  const handleLogout = async () => {
    try {
      await fetch("/admin/api/auth", { method: "DELETE", credentials: "include" });
    } catch (e) {
      console.error("Logout error:", e);
    }
    window.location.href = "/admin";
  };

  return (
    <nav className="w-full bg-blue-900 text-white py-3 px-4 shadow">
      <div className="flex items-center justify-between mb-2">
        <div className="font-bold text-lg flex flex-col items-center"><span>Panou</span><span>administrare</span></div>
        <button
          onClick={handleLogout}
          className="bg-red-600 text-white px-4 py-2 rounded font-semibold hover:bg-red-700 transition whitespace-nowrap"
        >🚪 Deconectează-te</button>
      </div>
      <div className="flex gap-2 items-center flex-wrap">
        <Link href="/admin/dashboard"><span className="bg-blue-600 text-white px-4 py-2 rounded font-semibold hover:bg-blue-700 transition">Dashboard</span></Link>
        <Link href="/admin/orders"><span className="bg-blue-600 text-white px-4 py-2 rounded font-semibold hover:bg-blue-700 transition">Comenzi</span></Link>
        <Link href="/admin/manual-orders"><span className="bg-blue-600 text-white px-4 py-2 rounded font-semibold hover:bg-blue-700 transition">Comenzi manuale</span></Link>
        <Link href="/admin/products"><span className="bg-blue-600 text-white px-4 py-2 rounded font-semibold hover:bg-blue-700 transition">Produse</span></Link>
        <Link href="/admin/coupons"><span className="bg-blue-600 text-white px-4 py-2 rounded font-semibold hover:bg-blue-700 transition">Cupoane</span></Link>
        <Link href="/admin/promotii"><span className="bg-purple-600 text-white px-4 py-2 rounded font-semibold hover:bg-purple-700 transition">Promoții</span></Link>
        <Link href="/admin/recenzii"><span className="bg-amber-600 text-white px-4 py-2 rounded font-semibold hover:bg-amber-700 transition">Recenzii</span></Link>
        <Link href="/admin/newsletter"><span className="bg-pink-600 text-white px-4 py-2 rounded font-semibold hover:bg-pink-700 transition">Newsletter</span></Link>
        <Link href="/admin/cosuri-abandonate"><span className="bg-orange-600 text-white px-4 py-2 rounded font-semibold hover:bg-orange-700 transition">🛒 Coșuri</span></Link>
        <Link href="/admin/blog"><span className="bg-indigo-600 text-white px-4 py-2 rounded font-semibold hover:bg-indigo-700 transition">Blog</span></Link>
        <Link href="/admin/cheltuieli"><span className="bg-blue-600 text-white px-4 py-2 rounded font-semibold hover:bg-blue-700 transition">Cheltuieli</span></Link>
        <Link href="/admin/editare"><span className="bg-green-600 text-white px-4 py-2 rounded font-semibold hover:bg-green-700 transition">Editare</span></Link>
        <Link href="/admin/utilizatori"><span className="bg-cyan-600 text-white px-4 py-2 rounded font-semibold hover:bg-cyan-700 transition">Utilizatori</span></Link>
        <Link href="/admin/schimba-parola"><span className="bg-gray-600 text-white px-4 py-2 rounded font-semibold hover:bg-gray-700 transition">Parolă</span></Link>
        <Link href="/admin/securitate"><span className="bg-red-600 text-white px-4 py-2 rounded font-semibold hover:bg-red-700 transition">🔐 Securitate</span></Link>
        <Link href="/admin/audit-trail"><span className="bg-slate-600 text-white px-4 py-2 rounded font-semibold hover:bg-slate-700 transition">📋 Audit</span></Link>
      </div>
    </nav>
  );
}
