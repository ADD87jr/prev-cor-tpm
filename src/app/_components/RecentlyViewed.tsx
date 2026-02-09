"use client";

import { useRecentlyViewed } from "./RecentlyViewedContext";
import { useLanguage } from "./LanguageContext";
import Image from "next/image";
import Link from "next/link";

export default function RecentlyViewed() {
  const { viewedProducts, clearViewed } = useRecentlyViewed();
  const { language } = useLanguage();
  
  const txt = {
    title: language === "en" ? "Recently viewed products" : "Produse vizualizate recent",
    clearHistory: language === "en" ? "Clear history" : "Șterge istoricul",
  };

  const getProductName = (product: any) => {
    if (language === "en" && product.nameEn) return product.nameEn;
    return product.name;
  };

  if (viewedProducts.length === 0) return null;

  return (
    <div className="mt-12 mb-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-800">{txt.title}</h2>
        <button
          onClick={clearViewed}
          className="text-sm text-gray-500 hover:text-red-600 transition-colors"
        >
          {txt.clearHistory}
        </button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {viewedProducts.slice(0, 10).map((product) => (
          <Link
            key={product.id}
            href={`/shop/${product.slug}`}
            className="group bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-3"
          >
            <div className="aspect-square relative mb-2 overflow-hidden rounded">
              <Image
                src={product.image || "/products/placeholder.png"}
                alt={product.name}
                fill
                className="object-contain group-hover:scale-105 transition-transform"
                sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 20vw"
              />
            </div>
            <h3 className="text-sm font-medium text-gray-800 line-clamp-2 group-hover:text-blue-600 transition-colors">
              {getProductName(product)}
            </h3>
            <p className="text-sm font-bold text-blue-600 mt-1">
              {product.price.toLocaleString("ro-RO")} RON
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
