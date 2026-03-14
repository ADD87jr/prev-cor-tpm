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
  // Furnizori
  { name: "Furnizori", description: "Gestionează lista de furnizori și datele de contact", path: "/admin/furnizori", icon: "🏭", color: "bg-rose-600 hover:bg-rose-700" },
  
  // Achiziții
  { name: "Comenzi Achiziție", description: "Creează și urmărește comenzi către furnizori", path: "/admin/comenzi-achizitie", icon: "📋", color: "bg-rose-600 hover:bg-rose-700" },
  
  // Dropshipping
  { name: "Dropshipping", description: "Gestionează produsele dropshipping de la furnizori", path: "/admin/dropshipping", icon: "📦", color: "bg-purple-600 hover:bg-purple-700" },
];

export default function SupplyChainHubPage() {
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">🏭 Supply Chain Hub</h1>
        <p className="text-gray-600">
          Gestionare furnizori și achiziții
        </p>
      </div>

      {/* Stats rapide */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-rose-500">
          <p className="text-2xl font-bold text-gray-800">🏭</p>
          <p className="text-xs text-gray-500">Furnizori activi</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-orange-500">
          <p className="text-2xl font-bold text-gray-800">📋</p>
          <p className="text-xs text-gray-500">Comenzi achiziție</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-amber-500">
          <p className="text-2xl font-bold text-gray-800">🤝</p>
          <p className="text-xs text-gray-500">Negocieri AI</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-teal-500">
          <p className="text-2xl font-bold text-gray-800">⭐</p>
          <p className="text-xs text-gray-500">Evaluare furnizori</p>
        </div>
      </div>

      {/* Grid funcționalități principale */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

      {/* Link către AI pentru supply chain */}
      <div className="mt-8 p-6 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white">
        <h3 className="font-bold text-xl mb-2">🤖 Funcționalități AI pentru Supply Chain</h3>
        <p className="text-sm opacity-90 mb-4">
          Evaluare furnizori, negociere AI, predicție stoc și optimizare aprovizionare
        </p>
        <div className="flex gap-2 flex-wrap">
          <Link href="/admin/supplier-evaluator">
            <span className="inline-block bg-white text-purple-600 px-3 py-1 rounded-lg font-semibold hover:bg-gray-100 transition text-sm">
              Evaluator Furnizori
            </span>
          </Link>
          <Link href="/admin/negociere-furnizori">
            <span className="inline-block bg-white text-purple-600 px-3 py-1 rounded-lg font-semibold hover:bg-gray-100 transition text-sm">
              Negociere AI
            </span>
          </Link>
          <Link href="/admin/supplier-negotiation">
            <span className="inline-block bg-white text-purple-600 px-3 py-1 rounded-lg font-semibold hover:bg-gray-100 transition text-sm">
              Supplier Negotiation
            </span>
          </Link>
          <Link href="/admin/predictie-stoc">
            <span className="inline-block bg-white text-purple-600 px-3 py-1 rounded-lg font-semibold hover:bg-gray-100 transition text-sm">
              Predicție Stoc
            </span>
          </Link>
          <Link href="/admin/stock-alerts">
            <span className="inline-block bg-white text-purple-600 px-3 py-1 rounded-lg font-semibold hover:bg-gray-100 transition text-sm">
              Stock Alerts
            </span>
          </Link>
          <Link href="/admin/reorder-predictor">
            <span className="inline-block bg-white text-purple-600 px-3 py-1 rounded-lg font-semibold hover:bg-gray-100 transition text-sm">
              Reorder Predictor
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
