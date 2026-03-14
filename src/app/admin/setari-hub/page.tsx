"use client";

import Link from "next/link";

interface Feature {
  name: string;
  description: string;
  path: string;
  icon: string;
  color: string;
}

const features: Feature[] = [
  // Securitate
  { name: "Securitate", description: "2FA, sesiuni active și setări de securitate", path: "/admin/securitate", icon: "🔐", color: "bg-red-600 hover:bg-red-700" },
  { name: "Schimbă Parola", description: "Modifică parola de admin", path: "/admin/schimba-parola", icon: "🔑", color: "bg-gray-600 hover:bg-gray-700" },
  
  // Audit & Logs
  { name: "Audit Trail", description: "Istoric complet al acțiunilor din admin", path: "/admin/audit-trail", icon: "📋", color: "bg-slate-600 hover:bg-slate-700" },
  { name: "Logs", description: "Vizualizare și analiză loguri de sistem", path: "/admin/logs", icon: "📝", color: "bg-zinc-600 hover:bg-zinc-700" },
  
  // Backup & Restore
  { name: "Backup Database", description: "Creează și restaurează backup-uri baza de date", path: "/admin/backup-db", icon: "💾", color: "bg-green-600 hover:bg-green-700" },
];

export default function SetariHubPage() {
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">⚙️ Setări Hub</h1>
        <p className="text-gray-600">
          Securitate, backup și configurare sistem
        </p>
      </div>

      {/* Stats rapide */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
          <p className="text-2xl font-bold text-gray-800">🔐</p>
          <p className="text-xs text-gray-500">2FA disponibil</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-slate-500">
          <p className="text-2xl font-bold text-gray-800">📋</p>
          <p className="text-xs text-gray-500">Audit complet</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
          <p className="text-2xl font-bold text-gray-800">💾</p>
          <p className="text-xs text-gray-500">Backup automat</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-zinc-500">
          <p className="text-2xl font-bold text-gray-800">📝</p>
          <p className="text-xs text-gray-500">Logs sistem</p>
        </div>
      </div>

      {/* Grid funcționalități */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {features.map((feature) => (
          <Link key={feature.path} href={feature.path}>
            <div className={`${feature.color} text-white rounded-xl shadow-lg p-6 h-full transition-transform hover:scale-105 cursor-pointer`}>
              <div className="flex items-start gap-4">
                <span className="text-4xl">{feature.icon}</span>
                <div>
                  <h3 className="font-bold text-xl">{feature.name}</h3>
                  <p className="text-sm opacity-90 mt-2">{feature.description}</p>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Informații importante */}
      <div className="mt-8 p-6 bg-amber-50 border border-amber-200 rounded-xl">
        <h3 className="font-bold text-xl text-amber-800 mb-2">⚠️ Recomandări de Securitate</h3>
        <ul className="text-sm text-amber-700 space-y-2">
          <li>• Activează autentificarea în doi pași (2FA) pentru protecție suplimentară</li>
          <li>• Creează backup-uri regulate ale bazei de date</li>
          <li>• Verifică periodic logurile pentru activități suspecte</li>
          <li>• Schimbă parola de admin în mod regulat</li>
        </ul>
      </div>

      {/* Link către AI pentru securitate */}
      <div className="mt-6 p-6 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white">
        <h3 className="font-bold text-xl mb-2">🤖 Funcționalități AI pentru Securitate</h3>
        <p className="text-sm opacity-90 mb-4">
          Detectare anomalii, detectare fraudă și monitorizare AI
        </p>
        <div className="flex gap-2 flex-wrap">
          <Link href="/admin/anomaly-detection">
            <span className="inline-block bg-white text-purple-600 px-3 py-1 rounded-lg font-semibold hover:bg-gray-100 transition text-sm">
              Detectare Anomalii
            </span>
          </Link>
          <Link href="/admin/detectie-frauda">
            <span className="inline-block bg-white text-purple-600 px-3 py-1 rounded-lg font-semibold hover:bg-gray-100 transition text-sm">
              Detectare Fraudă
            </span>
          </Link>
          <Link href="/admin/ai-usage">
            <span className="inline-block bg-white text-purple-600 px-3 py-1 rounded-lg font-semibold hover:bg-gray-100 transition text-sm">
              AI Usage Monitor
            </span>
          </Link>
          <Link href="/admin/ai-hub">
            <span className="inline-block bg-white/20 text-white border border-white/50 px-3 py-1 rounded-lg font-semibold hover:bg-white/30 transition text-sm">
              Vezi AI Hub →
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
