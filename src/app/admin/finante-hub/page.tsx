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
  // Facturare
  { name: "Facturi", description: "Emite și gestionează facturile pentru comenzi", path: "/admin/facturi", icon: "🧾", color: "bg-emerald-600 hover:bg-emerald-700" },
  { name: "Facturare Manuală", description: "Creează facturi personalizate manual", path: "/admin/facturare", icon: "📝", color: "bg-teal-600 hover:bg-teal-700" },
  
  // Rapoarte financiare
  { name: "Raport P&L", description: "Profit și pierderi - situație financiară completă", path: "/admin/raport-pl", icon: "📊", color: "bg-violet-600 hover:bg-violet-700" },
  { name: "Reports Hub", description: "Rapoarte avansate și analize financiare", path: "/admin/reports", icon: "📈", color: "bg-indigo-600 hover:bg-indigo-700" },
  
  // Cheltuieli
  { name: "Cheltuieli", description: "Evidența cheltuielilor și costurilor operaționale", path: "/admin/cheltuieli", icon: "💸", color: "bg-red-600 hover:bg-red-700" },
];

export default function FinanteHubPage() {
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">💰 Finanțe Hub</h1>
        <p className="text-gray-600">
          Facturare, rapoarte financiare și evidență cheltuieli
        </p>
      </div>

      {/* Stats rapide */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-emerald-500">
          <p className="text-2xl font-bold text-gray-800">🧾</p>
          <p className="text-xs text-gray-500">Facturare automată</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-violet-500">
          <p className="text-2xl font-bold text-gray-800">P&L</p>
          <p className="text-xs text-gray-500">Profit & Loss</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-indigo-500">
          <p className="text-2xl font-bold text-gray-800">📊</p>
          <p className="text-xs text-gray-500">Rapoarte avansate</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
          <p className="text-2xl font-bold text-gray-800">💸</p>
          <p className="text-xs text-gray-500">Evidență cheltuieli</p>
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

      {/* Link către AI pentru finanțe */}
      <div className="mt-8 p-6 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white">
        <h3 className="font-bold text-xl mb-2">🤖 Funcționalități AI pentru Finanțe</h3>
        <p className="text-sm opacity-90 mb-4">
          Predicție venituri, analiză facturi cu OCR, dynamic pricing și customer LTV
        </p>
        <div className="flex gap-2 flex-wrap">
          <Link href="/admin/revenue-forecast">
            <span className="inline-block bg-white text-purple-600 px-3 py-1 rounded-lg font-semibold hover:bg-gray-100 transition text-sm">
              Revenue Forecast
            </span>
          </Link>
          <Link href="/admin/invoice-analyzer">
            <span className="inline-block bg-white text-purple-600 px-3 py-1 rounded-lg font-semibold hover:bg-gray-100 transition text-sm">
              Invoice Analyzer
            </span>
          </Link>
          <Link href="/admin/dynamic-pricing">
            <span className="inline-block bg-white text-purple-600 px-3 py-1 rounded-lg font-semibold hover:bg-gray-100 transition text-sm">
              Dynamic Pricing
            </span>
          </Link>
          <Link href="/admin/customer-ltv">
            <span className="inline-block bg-white text-purple-600 px-3 py-1 rounded-lg font-semibold hover:bg-gray-100 transition text-sm">
              Customer LTV
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
