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
  // Promoții & Cupoane
  { name: "Cupoane", description: "Creează și gestionează coduri de reducere", path: "/admin/coupons", icon: "🎟️", color: "bg-blue-600 hover:bg-blue-700" },
  { name: "Promoții", description: "Configurează campanii promoționale", path: "/admin/promotii", icon: "🏷️", color: "bg-purple-600 hover:bg-purple-700" },
  
  // Comunicare
  { name: "Newsletter", description: "Trimite email-uri către abonați", path: "/admin/newsletter", icon: "📧", color: "bg-pink-600 hover:bg-pink-700" },
  { name: "Blog", description: "Gestionează articolele de pe blog", path: "/admin/blog", icon: "✍️", color: "bg-indigo-600 hover:bg-indigo-700" },
];

export default function MarketingHubPage() {
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">📣 Marketing Hub</h1>
        <p className="text-gray-600">
          Promoții, cupoane, newsletter și content marketing
        </p>
      </div>

      {/* Stats rapide */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
          <p className="text-2xl font-bold text-gray-800">🎟️</p>
          <p className="text-xs text-gray-500">Cupoane discount</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500">
          <p className="text-2xl font-bold text-gray-800">🏷️</p>
          <p className="text-xs text-gray-500">Campanii promo</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-pink-500">
          <p className="text-2xl font-bold text-gray-800">📧</p>
          <p className="text-xs text-gray-500">Email marketing</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-indigo-500">
          <p className="text-2xl font-bold text-gray-800">✍️</p>
          <p className="text-xs text-gray-500">Content blog</p>
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

      {/* Link către AI pentru marketing */}
      <div className="mt-8 p-6 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white">
        <h3 className="font-bold text-xl mb-2">🤖 Funcționalități AI pentru Marketing</h3>
        <p className="text-sm opacity-90 mb-4">
          Auto promovare, generare blog, social media, email optimizer și SEO
        </p>
        <div className="flex gap-2 flex-wrap">
          <Link href="/admin/auto-promovare">
            <span className="inline-block bg-white text-purple-600 px-3 py-1 rounded-lg font-semibold hover:bg-gray-100 transition text-sm">
              Auto Promovare
            </span>
          </Link>
          <Link href="/admin/blog-generator">
            <span className="inline-block bg-white text-purple-600 px-3 py-1 rounded-lg font-semibold hover:bg-gray-100 transition text-sm">
              Blog Generator
            </span>
          </Link>
          <Link href="/admin/social-media">
            <span className="inline-block bg-white text-purple-600 px-3 py-1 rounded-lg font-semibold hover:bg-gray-100 transition text-sm">
              Social Media AI
            </span>
          </Link>
          <Link href="/admin/email-optimizer">
            <span className="inline-block bg-white text-purple-600 px-3 py-1 rounded-lg font-semibold hover:bg-gray-100 transition text-sm">
              Email Optimizer
            </span>
          </Link>
          <Link href="/admin/ai-seo">
            <span className="inline-block bg-white text-purple-600 px-3 py-1 rounded-lg font-semibold hover:bg-gray-100 transition text-sm">
              AI SEO
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
