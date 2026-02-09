"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useLanguage } from "../_components/LanguageContext";

interface CategoryGroup {
  name: string;
  count: number;
  icon: string;
}

export default function CategoriiPage() {
  const { language } = useLanguage();
  const [domains, setDomains] = useState<CategoryGroup[]>([]);
  const [types, setTypes] = useState<CategoryGroup[]>([]);
  const [manufacturers, setManufacturers] = useState<CategoryGroup[]>([]);
  const [loading, setLoading] = useState(true);

  // Traduceri
  const txt = {
    title: language === "en" ? "Product Categories" : "Categorii Produse",
    subtitle: language === "en" ? "Explore our product range organized by categories" : "Explorează gama noastră de produse organizată pe categorii",
    domains: language === "en" ? "Business Domains" : "Domenii de activitate",
    productTypes: language === "en" ? "Product Types" : "Tipuri de produse",
    manufacturers: language === "en" ? "Manufacturers" : "Producători",
    products: language === "en" ? "products" : "produse",
    viewAll: language === "en" ? "View all products" : "Vezi toate produsele",
    promotions: language === "en" ? "Special Promotions" : "Promoții speciale",
    promotionsText: language === "en" ? "Discover our exclusive offers!" : "Descoperă ofertele noastre exclusive!",
    viewPromotions: language === "en" ? "View promotions" : "Vezi promoțiile",
  };

  // Mapări traduceri domenii
  const domainTranslations: Record<string, string> = {
    "Echipamente electrice": "Electrical Equipment",
    "Industrial": "Industrial",
    "Rezidential": "Residential",
    "Altele": "Others",
  };

  // Mapări traduceri tipuri
  const typeTranslations: Record<string, string> = {
    "Electric": "Electrical",
    "Protectii": "Protection",
    "Mecanic": "Mechanical",
    "Altele": "Others",
  };

  const translateDomain = (name: string) => {
    if (language === "en" && domainTranslations[name]) return domainTranslations[name];
    return name;
  };

  const translateType = (name: string) => {
    if (language === "en" && typeTranslations[name]) return typeTranslations[name];
    return name;
  };

  useEffect(() => {
    fetch("/api/products")
      .then((res) => res.json())
      .then((products) => {
        const domainCounts: Record<string, number> = {};
        const typeCounts: Record<string, number> = {};
        const manufacturerCounts: Record<string, number> = {};

        products.forEach((p: any) => {
          if (p.domain) domainCounts[p.domain] = (domainCounts[p.domain] || 0) + 1;
          if (p.type) typeCounts[p.type] = (typeCounts[p.type] || 0) + 1;
          if (p.manufacturer) manufacturerCounts[p.manufacturer] = (manufacturerCounts[p.manufacturer] || 0) + 1;
        });

        // Assign icons based on domain names
        const domainIcons: Record<string, string> = {
          "ELECTRIC": "⚡",
          "INDUSTRIAL": "🏭",
          "ELECTRONIC": "📟",
          "AUTOMATIZARE": "🤖",
          "CLIMATIZARE": "❄️",
          "ILUMINAT": "💡",
        };

        setDomains(
          Object.entries(domainCounts)
            .map(([name, count]) => ({
              name,
              count,
              icon: domainIcons[name.toUpperCase()] || "📦",
            }))
            .sort((a, b) => b.count - a.count)
        );

        setTypes(
          Object.entries(typeCounts)
            .map(([name, count]) => ({
              name,
              count,
              icon: "📋",
            }))
            .sort((a, b) => b.count - a.count)
        );

        setManufacturers(
          Object.entries(manufacturerCounts)
            .map(([name, count]) => ({
              name,
              count,
              icon: "🏷️",
            }))
            .sort((a, b) => b.count - a.count)
        );

        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <main className="container mx-auto py-10 px-4">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </main>
    );
  }

  return (
    <main className="container mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold text-center mb-4 text-blue-700">{txt.title}</h1>
      <p className="text-gray-600 text-center mb-10">
        {txt.subtitle}
      </p>

      {/* Domenii */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <span>🏢</span> {txt.domains}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {domains.map((domain) => (
            <Link
              key={domain.name}
              href={`/shop?domain=${encodeURIComponent(domain.name)}`}
              className="group bg-gradient-to-br from-blue-50 to-white border-2 border-blue-100 rounded-xl p-6 hover:border-blue-400 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
            >
              <div className="flex items-center gap-4">
                <span className="text-4xl">{domain.icon}</span>
                <div>
                  <h3 className="font-bold text-gray-800 group-hover:text-blue-600 transition-colors">
                    {translateDomain(domain.name)}
                  </h3>
                  <p className="text-sm text-gray-500">{domain.count} {txt.products}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Tipuri de produse */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <span>📦</span> {txt.productTypes}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {types.map((type) => (
            <Link
              key={type.name}
              href={`/shop?type=${encodeURIComponent(type.name)}`}
              className="group bg-gradient-to-br from-green-50 to-white border-2 border-green-100 rounded-xl p-6 hover:border-green-400 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1"
            >
              <div className="flex items-center gap-4">
                <span className="text-3xl">📋</span>
                <div>
                  <h3 className="font-bold text-gray-800 group-hover:text-green-600 transition-colors">
                    {translateType(type.name)}
                  </h3>
                  <p className="text-sm text-gray-500">{type.count} {txt.products}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Producători */}
      {manufacturers.length > 0 && (
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <span>🏭</span> {txt.manufacturers}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {manufacturers.map((mfr) => (
              <Link
                key={mfr.name}
                href={`/shop?manufacturer=${encodeURIComponent(mfr.name)}`}
                className="group bg-gradient-to-br from-purple-50 to-white border-2 border-purple-100 rounded-xl p-4 hover:border-purple-400 hover:shadow-lg transition-all duration-300 text-center"
              >
                <h3 className="font-semibold text-gray-800 group-hover:text-purple-600 transition-colors text-sm">
                  {mfr.name}
                </h3>
                <p className="text-xs text-gray-500 mt-1">{mfr.count} {txt.products}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Link către toate produsele */}
      <div className="text-center mt-8">
        <Link
          href="/shop"
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-8 py-3 rounded-full font-semibold hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
        >
          <span>{txt.viewAll}</span>
          <span>→</span>
        </Link>
      </div>

      {/* Promoții */}
      <div className="mt-12 bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl p-8 text-white text-center">
        <h2 className="text-2xl font-bold mb-2">🔥 {txt.promotions}</h2>
        <p className="mb-4 opacity-90">{txt.promotionsText}</p>
        <Link
          href="/shop?promoOnly=true"
          className="inline-block bg-white text-red-600 px-6 py-2 rounded-full font-semibold hover:bg-gray-100 transition-colors"
        >
          {txt.viewPromotions}
        </Link>
      </div>
    </main>
  );
}
