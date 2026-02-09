"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

interface Category {
  name: string;
  count: number;
  type: "domain" | "type" | "manufacturer";
}

export default function CategorySidebar() {
  const [categories, setCategories] = useState<{
    domains: Category[];
    types: Category[];
    manufacturers: Category[];
  }>({ domains: [], types: [], manufacturers: [] });
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    domains: true,
    types: true,
    manufacturers: false,
  });

  useEffect(() => {
    fetch("/api/products")
      .then((res) => res.json())
      .then((products) => {
        // Count products per domain
        const domainCounts: Record<string, number> = {};
        const typeCounts: Record<string, number> = {};
        const manufacturerCounts: Record<string, number> = {};

        products.forEach((p: any) => {
          if (p.domain) domainCounts[p.domain] = (domainCounts[p.domain] || 0) + 1;
          if (p.type) typeCounts[p.type] = (typeCounts[p.type] || 0) + 1;
          if (p.manufacturer) manufacturerCounts[p.manufacturer] = (manufacturerCounts[p.manufacturer] || 0) + 1;
        });

        setCategories({
          domains: Object.entries(domainCounts)
            .map(([name, count]) => ({ name, count, type: "domain" as const }))
            .sort((a, b) => b.count - a.count),
          types: Object.entries(typeCounts)
            .map(([name, count]) => ({ name, count, type: "type" as const }))
            .sort((a, b) => b.count - a.count),
          manufacturers: Object.entries(manufacturerCounts)
            .map(([name, count]) => ({ name, count, type: "manufacturer" as const }))
            .sort((a, b) => b.count - a.count),
        });
      })
      .catch(() => {});
  }, []);

  const toggleSection = (section: string) => {
    setExpanded((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <aside className="bg-white rounded-xl shadow-lg p-4 sticky top-4">
      <h2 className="font-bold text-lg text-blue-700 mb-4">Categorii</h2>

      {/* Domenii */}
      <div className="mb-4">
        <button
          onClick={() => toggleSection("domains")}
          className="flex items-center justify-between w-full text-left font-semibold text-gray-700 hover:text-blue-600 py-2"
        >
          <span>🏢 Domenii</span>
          <span className="text-xs">{expanded.domains ? "▼" : "▶"}</span>
        </button>
        {expanded.domains && (
          <ul className="pl-2 space-y-1">
            <li>
              <Link
                href="/shop"
                className="flex items-center justify-between text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded px-2 py-1"
              >
                <span>Toate domeniile</span>
              </Link>
            </li>
            {categories.domains.map((cat) => (
              <li key={cat.name}>
                <Link
                  href={`/shop?domain=${encodeURIComponent(cat.name)}`}
                  className="flex items-center justify-between text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded px-2 py-1"
                >
                  <span>{cat.name}</span>
                  <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">{cat.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Tipuri */}
      <div className="mb-4">
        <button
          onClick={() => toggleSection("types")}
          className="flex items-center justify-between w-full text-left font-semibold text-gray-700 hover:text-blue-600 py-2"
        >
          <span>📦 Tipuri produse</span>
          <span className="text-xs">{expanded.types ? "▼" : "▶"}</span>
        </button>
        {expanded.types && (
          <ul className="pl-2 space-y-1">
            <li>
              <Link
                href="/shop"
                className="flex items-center justify-between text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded px-2 py-1"
              >
                <span>Toate tipurile</span>
              </Link>
            </li>
            {categories.types.map((cat) => (
              <li key={cat.name}>
                <Link
                  href={`/shop?type=${encodeURIComponent(cat.name)}`}
                  className="flex items-center justify-between text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded px-2 py-1"
                >
                  <span>{cat.name}</span>
                  <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">{cat.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Producători */}
      {categories.manufacturers.length > 0 && (
        <div className="mb-4">
          <button
            onClick={() => toggleSection("manufacturers")}
            className="flex items-center justify-between w-full text-left font-semibold text-gray-700 hover:text-blue-600 py-2"
          >
            <span>🏭 Producători</span>
            <span className="text-xs">{expanded.manufacturers ? "▼" : "▶"}</span>
          </button>
          {expanded.manufacturers && (
            <ul className="pl-2 space-y-1">
              <li>
                <Link
                  href="/shop"
                  className="flex items-center justify-between text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded px-2 py-1"
                >
                  <span>Toți producătorii</span>
                </Link>
              </li>
              {categories.manufacturers.slice(0, 10).map((cat) => (
                <li key={cat.name}>
                  <Link
                    href={`/shop?manufacturer=${encodeURIComponent(cat.name)}`}
                    className="flex items-center justify-between text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded px-2 py-1"
                  >
                    <span>{cat.name}</span>
                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">{cat.count}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Link către promoții */}
      <div className="border-t pt-4 mt-4">
        <Link
          href="/shop?promoOnly=true"
          className="flex items-center gap-2 text-red-600 font-semibold hover:text-red-700"
        >
          <span>🔥</span>
          <span>Promoții</span>
        </Link>
      </div>
    </aside>
  );
}
