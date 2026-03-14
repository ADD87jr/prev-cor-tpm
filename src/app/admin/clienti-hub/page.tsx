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
  // Utilizatori & Clienți
  { name: "Utilizatori", description: "Gestionează conturile și permisiunile utilizatorilor", path: "/admin/utilizatori", icon: "👤", color: "bg-cyan-600 hover:bg-cyan-700" },
  { name: "Top Clienți", description: "Clasamentul clienților după valoare comenzi", path: "/admin/top-clienti", icon: "🏆", color: "bg-pink-600 hover:bg-pink-700" },
  { name: "Coșuri Abandonate", description: "Recuperează vânzările din coșurile abandonate de clienți", path: "/admin/abandoned-carts", icon: "🛒", color: "bg-red-600 hover:bg-red-700" },
  
  // Feedback
  { name: "Recenzii", description: "Moderează și răspunde la recenziile produselor", path: "/admin/recenzii", icon: "⭐", color: "bg-amber-600 hover:bg-amber-700" },
  { name: "Întrebări Q&A", description: "Răspunde la întrebările clienților despre produse", path: "/admin/intrebari", icon: "❓", color: "bg-orange-600 hover:bg-orange-700" },
];

export default function ClientiHubPage() {
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">👥 Clienți Hub</h1>
        <p className="text-gray-600">
          Gestionare utilizatori, recenzii și comunicare cu clienții
        </p>
      </div>

      {/* Stats rapide */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-cyan-500">
          <p className="text-2xl font-bold text-gray-800">👤</p>
          <p className="text-xs text-gray-500">Conturi utilizatori</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-pink-500">
          <p className="text-2xl font-bold text-gray-800">🏆</p>
          <p className="text-xs text-gray-500">Top clienți</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
          <p className="text-2xl font-bold text-gray-800">🛒</p>
          <p className="text-xs text-gray-500">Coșuri abandonate</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-amber-500">
          <p className="text-2xl font-bold text-gray-800">⭐</p>
          <p className="text-xs text-gray-500">Recenzii produse</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-orange-500">
          <p className="text-2xl font-bold text-gray-800">❓</p>
          <p className="text-xs text-gray-500">Întrebări Q&A</p>
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

      {/* Link către AI pentru clienți */}
      <div className="mt-8 p-6 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white">
        <h3 className="font-bold text-xl mb-2">🤖 Funcționalități AI pentru Clienți</h3>
        <p className="text-sm opacity-90 mb-4">
          Segmentare clienți, chatbot, răspunsuri tehnice automate, predicție churn și customer LTV
        </p>
        <div className="flex gap-2 flex-wrap">
          <Link href="/admin/segmentare-clienti">
            <span className="inline-block bg-white text-purple-600 px-3 py-1 rounded-lg font-semibold hover:bg-gray-100 transition text-sm">
              Segmentare AI
            </span>
          </Link>
          <Link href="/admin/chatbot-ai">
            <span className="inline-block bg-white text-purple-600 px-3 py-1 rounded-lg font-semibold hover:bg-gray-100 transition text-sm">
              Chatbot AI
            </span>
          </Link>
          <Link href="/admin/churn-predictor">
            <span className="inline-block bg-white text-purple-600 px-3 py-1 rounded-lg font-semibold hover:bg-gray-100 transition text-sm">
              Churn Predictor
            </span>
          </Link>
          <Link href="/admin/lead-scoring">
            <span className="inline-block bg-white text-purple-600 px-3 py-1 rounded-lg font-semibold hover:bg-gray-100 transition text-sm">
              Lead Scoring
            </span>
          </Link>
          <Link href="/admin/analiza-reviews">
            <span className="inline-block bg-white text-purple-600 px-3 py-1 rounded-lg font-semibold hover:bg-gray-100 transition text-sm">
              Analiză Reviews
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
