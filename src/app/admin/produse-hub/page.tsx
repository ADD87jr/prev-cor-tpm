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
  // Adăugare produse
  { name: "Adaugă Produs RO", description: "Adaugă produs nou în limba română", path: "/admin/adauga-produs-ro", icon: "➕", color: "bg-teal-600 hover:bg-teal-700" },
  { name: "Adaugă Produs EN", description: "Adaugă produs nou în limba engleză", path: "/admin/adauga-produs-en", icon: "➕", color: "bg-green-600 hover:bg-green-700" },
  
  // Variante
  { name: "Variante RO", description: "Gestionează variantele produselor (română)", path: "/admin/variante-ro", icon: "📦", color: "bg-purple-600 hover:bg-purple-700" },
  { name: "Variante EN", description: "Gestionează variantele produselor (engleză)", path: "/admin/variante-en", icon: "📦", color: "bg-blue-600 hover:bg-blue-700" },
  
  // Organizare
  { name: "Categorii Produse", description: "Gestionează categoriile și tipurile de produse", path: "/admin/categorii-produse", icon: "🏷️", color: "bg-amber-600 hover:bg-amber-700" },
  { name: "Gama Produse", description: "Definește gamele și domeniile de aplicație", path: "/admin/gama-produse", icon: "📂", color: "bg-violet-600 hover:bg-violet-700" },
  
  // Editare & Import
  { name: "Editare Produse", description: "Editează produsele existente din catalog", path: "/admin/editare", icon: "✏️", color: "bg-green-600 hover:bg-green-700" },
  { name: "Import Bulk CSV", description: "Importă produse în masă din fișier CSV", path: "/admin/bulk-produse", icon: "📥", color: "bg-teal-600 hover:bg-teal-700" },
  
  // Stocuri & Prețuri
  { name: "Gestiune Stocuri", description: "Monitorizează și actualizează stocurile", path: "/admin/stocuri", icon: "📦", color: "bg-orange-600 hover:bg-orange-700" },
  { name: "Istoric Prețuri", description: "Vizualizează evoluția prețurilor în timp", path: "/admin/istoric-preturi", icon: "📈", color: "bg-teal-600 hover:bg-teal-700" },
];

export default function ProduseHubPage() {
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">📦 Produse Hub</h1>
        <p className="text-gray-600">
          Gestionare completă catalog produse
        </p>
      </div>

      {/* Stats rapide */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-teal-500">
          <p className="text-2xl font-bold text-gray-800">{features.length}</p>
          <p className="text-xs text-gray-500">Funcționalități</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
          <p className="text-2xl font-bold text-gray-800">2</p>
          <p className="text-xs text-gray-500">Limbi suportate</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500">
          <p className="text-2xl font-bold text-gray-800">RO/EN</p>
          <p className="text-xs text-gray-500">Variante bilingve</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-orange-500">
          <p className="text-2xl font-bold text-gray-800">CSV</p>
          <p className="text-xs text-gray-500">Import în masă</p>
        </div>
      </div>

      {/* Grid funcționalități */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {features.map((feature) => (
          <Link key={feature.path} href={feature.path}>
            <div className={`${feature.color} text-white rounded-xl shadow-lg p-5 h-full transition-transform hover:scale-105 cursor-pointer`}>
              <div className="flex items-start gap-3">
                <span className="text-3xl">{feature.icon}</span>
                <div>
                  <h3 className="font-bold text-lg">{feature.name}</h3>
                  <p className="text-sm opacity-90 mt-1">{feature.description}</p>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Link către AI pentru produse */}
      <div className="mt-8 p-6 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white">
        <h3 className="font-bold text-xl mb-2">🤖 Funcționalități AI pentru Produse</h3>
        <p className="text-sm opacity-90 mb-4">
          Generare imagini, traduceri automate, clasificare, și multe altele în AI Hub
        </p>
        <Link href="/admin/ai-hub">
          <span className="inline-block bg-white text-purple-600 px-4 py-2 rounded-lg font-semibold hover:bg-gray-100 transition">
            Deschide AI Hub →
          </span>
        </Link>
      </div>
    </div>
  );
}
