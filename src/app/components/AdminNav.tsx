"use client";
import Link from "next/link";
import AdminSearch from "./AdminSearch";

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
        <div className="font-bold text-lg whitespace-nowrap">Panou administrare</div>
        <AdminSearch />
        <button
          onClick={handleLogout}
          className="bg-red-600 text-white px-4 py-2 rounded font-semibold hover:bg-red-700 transition whitespace-nowrap"
        >🚪 Deconectează-te</button>
      </div>
      <div className="flex gap-2 items-center flex-wrap">
        {/* Principal */}
        <Link href="/admin/dashboard"><span className="bg-blue-600 text-white px-4 py-2 rounded font-semibold hover:bg-blue-700 transition">🏠 Dashboard</span></Link>
        <Link href="/admin/command-center"><span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2 rounded font-semibold hover:from-amber-600 hover:to-orange-600 transition animate-pulse">🎯 Command Center</span></Link>
        
        {/* HUB-uri principale */}
        <Link href="/admin/produse-hub"><span className="bg-teal-600 text-white px-4 py-2 rounded font-semibold hover:bg-teal-700 transition">📦 Produse</span></Link>
        <Link href="/admin/comenzi-hub"><span className="bg-blue-600 text-white px-4 py-2 rounded font-semibold hover:bg-blue-700 transition">📋 Comenzi</span></Link>
        <Link href="/admin/finante-hub"><span className="bg-emerald-600 text-white px-4 py-2 rounded font-semibold hover:bg-emerald-700 transition">💰 Finanțe</span></Link>
        <Link href="/admin/marketing-hub"><span className="bg-pink-600 text-white px-4 py-2 rounded font-semibold hover:bg-pink-700 transition">📣 Marketing</span></Link>
        <Link href="/admin/clienti-hub"><span className="bg-cyan-600 text-white px-4 py-2 rounded font-semibold hover:bg-cyan-700 transition">👥 Clienți</span></Link>
        <Link href="/admin/supply-chain-hub"><span className="bg-rose-600 text-white px-4 py-2 rounded font-semibold hover:bg-rose-700 transition">🏭 Supply Chain</span></Link>
        <Link href="/admin/setari-hub"><span className="bg-gray-600 text-white px-4 py-2 rounded font-semibold hover:bg-gray-700 transition">⚙️ Setări</span></Link>
        
        {/* AI Hub - evidențiat */}
        <Link href="/admin/ai-hub"><span className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded font-semibold hover:from-purple-700 hover:to-pink-700 transition">🤖 AI Hub</span></Link>
        
        {/* AI Studio & Solicitări - acces rapid */}
        <Link href="/admin/solicitari"><span className="bg-amber-600 text-white px-4 py-2 rounded font-semibold hover:bg-amber-700 transition">📬 Solicitări</span></Link>
        <Link href="/admin/ai-studio"><span className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded font-semibold hover:from-blue-600 hover:to-purple-700 transition">🎨 AI Studio</span></Link>
      </div>
    </nav>
  );
}
