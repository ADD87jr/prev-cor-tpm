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
  // Comenzi
  { name: "Comenzi", description: "Vizualizează și gestionează toate comenzile", path: "/admin/orders", icon: "📋", color: "bg-blue-600 hover:bg-blue-700" },
  { name: "Comenzi Manuale", description: "Creează comenzi manual pentru clienți", path: "/admin/manual-orders", icon: "✍️", color: "bg-indigo-600 hover:bg-indigo-700" },
  
  // Coșuri & Abandonări
  { name: "Coșuri Abandonate", description: "Recuperează coșurile abandonate de clienți", path: "/admin/cosuri-abandonate", icon: "🛒", color: "bg-orange-600 hover:bg-orange-700" },
  
  // Rapoarte
  { name: "Raport Comenzi", description: "Statistici și rapoarte detaliate comenzi", path: "/admin/raport-comenzi", icon: "📊", color: "bg-cyan-600 hover:bg-cyan-700" },
];

export default function ComenziHubPage() {
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">📋 Comenzi Hub</h1>
        <p className="text-gray-600">
          Gestionare comenzi și recuperare coșuri abandonate
        </p>
      </div>

      {/* Stats rapide */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
          <p className="text-2xl font-bold text-gray-800">{features.length}</p>
          <p className="text-xs text-gray-500">Funcționalități</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
          <p className="text-2xl font-bold text-gray-800">Auto</p>
          <p className="text-xs text-gray-500">& Manuale</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-orange-500">
          <p className="text-2xl font-bold text-gray-800">🛒</p>
          <p className="text-xs text-gray-500">Recuperare coșuri</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-cyan-500">
          <p className="text-2xl font-bold text-gray-800">📊</p>
          <p className="text-xs text-gray-500">Rapoarte detaliate</p>
        </div>
      </div>

      {/* Grid funcționalități */}
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

      {/* Link către AI pentru comenzi */}
      <div className="mt-8 p-6 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white">
        <h3 className="font-bold text-xl mb-2">🤖 Funcționalități AI pentru Comenzi</h3>
        <p className="text-sm opacity-90 mb-4">
          Prioritizare comenzi, detectare fraudă, predicție livrări și analiză coșuri abandonate
        </p>
        <div className="flex gap-2 flex-wrap">
          <Link href="/admin/prioritizare-comenzi">
            <span className="inline-block bg-white text-purple-600 px-3 py-1 rounded-lg font-semibold hover:bg-gray-100 transition text-sm">
              Prioritizare AI
            </span>
          </Link>
          <Link href="/admin/detectie-frauda">
            <span className="inline-block bg-white text-purple-600 px-3 py-1 rounded-lg font-semibold hover:bg-gray-100 transition text-sm">
              Detectare Fraudă
            </span>
          </Link>
          <Link href="/admin/analiza-cosuri-ai">
            <span className="inline-block bg-white text-purple-600 px-3 py-1 rounded-lg font-semibold hover:bg-gray-100 transition text-sm">
              Analiză Coșuri AI
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
