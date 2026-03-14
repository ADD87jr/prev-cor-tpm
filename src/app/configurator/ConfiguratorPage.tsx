"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { MdSettings } from "react-icons/md";
import type { ConfigProduct } from "@/app/_components/PLCConfigurator";
import { useLanguage } from "@/app/_components/LanguageContext";
import { useCart } from "@/app/_components/CartContext";

// Dynamic import pentru a evita probleme SSR cu jsPDF
const PLCConfigurator = dynamic(
  () => import("@/app/_components/PLCConfigurator"),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }
);

const translations = {
  ro: {
    title: "Configurator PLC",
    subtitle: "Selectează și configurează-ți sistemul PLC complet",
    selectProduct: "Alege produsul de bază",
    myConfigs: "Configurațiile mele",
    addedToCart: "Configurația a fost adăugată în coș!",
    loading: "Se încarcă produsele...",
    noProducts: "Nu există produse configurabile. Rulează seed-ul pentru a adăuga produse.",
    error: "Eroare la încărcarea produselor",
  },
  en: {
    title: "PLC Configurator",
    subtitle: "Select and configure your complete PLC system",
    selectProduct: "Choose the base product",
    myConfigs: "My Configurations",
    addedToCart: "Configuration has been added to cart!",
    loading: "Loading products...",
    noProducts: "No configurable products. Run the seed script to add products.",
    error: "Error loading products",
  },
};

export default function ConfiguratorPage() {
  const { language } = useLanguage();
  const { addToCart } = useCart();
  const searchParams = useSearchParams();
  const t = translations[language as "ro" | "en"] || translations.ro;

  const [products, setProducts] = useState<ConfigProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  // Încarcă produsele din API
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/configurator/products");
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        setProducts(data);
        
        // Auto-select din URL
        const sku = searchParams?.get("sku");
        if (sku) {
          const product = data.find((p: ConfigProduct) => p.sku === sku);
          if (product) {
            setSelectedProductId(product.id);
          }
        }
      } catch (err) {
        console.error("Error fetching products:", err);
        setError(t.error);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [searchParams, t.error]);

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  const handleAddToCart = (config: {
    productId: number;
    productName: string;
    selectedOptions: { categoryId: number; optionId: number; quantity: number }[];
    totalPrice: number;
    currency: string;
  }) => {
    const product = products.find((p) => p.id === config.productId);
    if (!product) return;

    addToCart({
      id: config.productId,
      name: `${product.brandName} ${product.name} - Configurație`,
      price: config.totalPrice,
      purchasePrice: config.totalPrice,
      variantCode: product.sku,
    });

    setNotification(t.addedToCart);
    setTimeout(() => setNotification(null), 3000);
  };

  // Afișează loading
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t.loading}</p>
        </div>
      </div>
    );
  }

  // Afișează eroare
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-2xl shadow-lg">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <p className="text-gray-800 font-medium">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Reîncearcă
          </button>
        </div>
      </div>
    );
  }

  // Pagina de selecție produse
  if (!selectedProduct) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-12">
        <div className="max-w-7xl mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">{t.title}</h1>
            <p className="text-xl text-gray-600">{t.subtitle}</p>
          </div>

          {/* Link către configurații salvate */}
          <div className="flex justify-end mb-6">
            <Link
              href="/configuratii"
              className="inline-flex items-center gap-2 bg-purple-100 text-purple-700 px-4 py-2 rounded-lg font-medium hover:bg-purple-200 transition"
            >
              <MdSettings className="w-5 h-5" />
              {t.myConfigs}
            </Link>
          </div>

          {products.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl shadow-lg">
              <div className="text-6xl mb-4">📦</div>
              <p className="text-gray-600">{t.noProducts}</p>
              <p className="text-sm text-gray-400 mt-2">
                Rulează: <code className="bg-gray-100 px-2 py-1 rounded">node scripts/seed-configurator.js</code>
              </p>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-gray-800 mb-6">{t.selectProduct}</h2>

              {/* Grid produse */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {products.map((product) => (
                  <div
                    key={product.id}
                    onClick={() => setSelectedProductId(product.id)}
                    className="bg-white rounded-2xl shadow-lg overflow-hidden cursor-pointer hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 border border-gray-100 group"
                  >
                    <div className="relative h-56 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                      {product.image ? (
                        <Image
                          src={product.image}
                          alt={product.name}
                          fill
                          className="object-contain p-4"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="text-6xl group-hover:scale-110 transition-transform">🔧</div>
                      )}
                      <div className="absolute top-3 left-3 bg-white/90 px-3 py-1 rounded-full text-sm font-medium text-gray-700">
                        {product.brandName}
                      </div>
                    </div>
                    <div className="p-6">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{product.name}</h3>
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">{product.description}</p>
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs text-gray-500">de la</span>
                          <span className="text-2xl font-bold text-blue-600 ml-2">
                            {product.basePrice.toLocaleString("ro-RO")} {product.currency}
                          </span>
                        </div>
                        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition">
                          {language === "en" ? "Configure" : "Configurează"}
                        </button>
                      </div>
                      <p className="text-xs text-gray-400 mt-3">SKU: {product.sku}</p>
                      {product.categories && (
                        <p className="text-xs text-blue-500 mt-1">
                          {product.categories.length} {language === "en" ? "categories" : "categorii de opțiuni"}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // Pagina configurator pentru produsul selectat
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-8">
      <div className="max-w-5xl mx-auto px-4">
        {/* Notificare */}
        {notification && (
          <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-pulse">
            ✓ {notification}
          </div>
        )}

        {/* Buton înapoi */}
        <button
          onClick={() => setSelectedProductId(null)}
          className="mb-6 text-blue-600 hover:text-blue-800 font-medium flex items-center gap-2"
        >
          ← {language === "en" ? "Back to products" : "Înapoi la produse"}
        </button>

        {/* Configurator */}
        <PLCConfigurator
          product={selectedProduct}
          language={language as "ro" | "en"}
          onAddToCart={handleAddToCart}
        />
      </div>
    </div>
  );
}
