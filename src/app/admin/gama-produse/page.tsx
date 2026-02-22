"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Toast from "@/components/Toast";

interface Product {
  id: number;
  name: string;
  productCode?: string;
  price: number;
  image?: string;
  type: string;
  domain: string;
  manufacturer?: string;
  stock: number;
  onDemand?: boolean;
}

interface CategoryGroup {
  name: string;
  products: Product[];
}

export default function GamaProdusePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'types' | 'domains'>('types');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const res = await fetch("/admin/api/products");
      if (res.ok) {
        const data = await res.json();
        setProducts(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Error loading products:", err);
    } finally {
      setLoading(false);
    }
  };

  // Grupare produse pe tipuri
  const productsByType: CategoryGroup[] = React.useMemo(() => {
    const typeMap: Record<string, Product[]> = {};
    products.forEach(p => {
      const type = p.type || 'Necategorisit';
      if (!typeMap[type]) typeMap[type] = [];
      typeMap[type].push(p);
    });
    return Object.entries(typeMap)
      .map(([name, products]) => ({ name, products }))
      .sort((a, b) => b.products.length - a.products.length);
  }, [products]);

  // Grupare produse pe domenii
  const productsByDomain: CategoryGroup[] = React.useMemo(() => {
    const domainMap: Record<string, Product[]> = {};
    products.forEach(p => {
      const domain = p.domain || 'Necategorisit';
      if (!domainMap[domain]) domainMap[domain] = [];
      domainMap[domain].push(p);
    });
    return Object.entries(domainMap)
      .map(([name, products]) => ({ name, products }))
      .sort((a, b) => b.products.length - a.products.length);
  }, [products]);

  const currentGroups = viewMode === 'types' ? productsByType : productsByDomain;
  const selectedCategory = viewMode === 'types' ? selectedType : selectedDomain;

  const categoryIcons: Record<string, string> = {
    "Senzor inductiv": "🔵",
    "Senzor optic": "🔴",
    "Senzor capacitiv": "🟡",
    "Senzor de presiune": "🟢",
    "Electric": "⚡",
    "Mecanic": "⚙️",
    "Protecții": "🛡️",
    "Echipamente electrice": "🔌",
    "Industrial": "🏭",
    "Altele": "📦",
    "Necategorisit": "❓",
  };

  const getIcon = (name: string) => categoryIcons[name] || "📦";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-xl text-violet-600 animate-pulse">Se încarcă produsele...</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {toast && <Toast message={toast.message} type={toast.type} />}

      <div className="bg-white rounded-2xl shadow-lg p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-violet-700">Gama de produse</h1>
            <p className="text-gray-600 mt-1">
              {products.length} produse în {currentGroups.length} {viewMode === 'types' ? 'tipuri' : 'domenii'}
            </p>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => { setViewMode('types'); setSelectedType(null); setSelectedDomain(null); }}
              className={`px-4 py-2 rounded-lg font-semibold transition ${viewMode === 'types' ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              📋 Pe tipuri
            </button>
            <button
              onClick={() => { setViewMode('domains'); setSelectedType(null); setSelectedDomain(null); }}
              className={`px-4 py-2 rounded-lg font-semibold transition ${viewMode === 'domains' ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              🏢 Pe domenii
            </button>
            <Link href="/admin/categorii-produse" className="px-4 py-2 rounded-lg font-semibold bg-amber-500 hover:bg-amber-600 text-white transition">
              🏷️ Gestionează categorii
            </Link>
          </div>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-16 bg-gray-50 rounded-xl">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">Nu există produse</h3>
            <p className="text-gray-500 mb-4">Adaugă produse pentru a le vedea grupate pe categorii</p>
            <Link href="/admin/adauga-produs-ro" className="bg-violet-600 hover:bg-violet-700 text-white font-bold py-2 px-6 rounded-lg transition">
              ➕ Adaugă primul produs
            </Link>
          </div>
        ) : !selectedCategory ? (
          // Afișare categorii
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {currentGroups.map((group, idx) => (
              <div 
                key={idx} 
                onClick={() => viewMode === 'types' ? setSelectedType(group.name) : setSelectedDomain(group.name)}
                className="border-2 border-violet-100 rounded-xl p-5 flex flex-col items-center hover:shadow-lg hover:border-violet-300 transition cursor-pointer bg-gradient-to-br from-violet-50 to-white"
              >
                <div className="text-4xl mb-3">{getIcon(group.name)}</div>
                <h2 className="text-lg font-bold text-violet-800 mb-1 text-center">{group.name}</h2>
                <div className="bg-violet-100 text-violet-700 px-3 py-1 rounded-full text-sm font-semibold">
                  {group.products.length} {group.products.length === 1 ? 'produs' : 'produse'}
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Afișare produse din categoria selectată
          <div>
            <button 
              onClick={() => { setSelectedType(null); setSelectedDomain(null); }}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-5 rounded-lg mb-5 transition"
            >
              ← Înapoi la {viewMode === 'types' ? 'tipuri' : 'domenii'}
            </button>
            
            <h2 className="text-xl font-bold text-violet-700 mb-4 flex items-center gap-2">
              <span>{getIcon(selectedCategory)}</span>
              {selectedCategory}
              <span className="text-sm font-normal text-gray-500">
                ({currentGroups.find(g => g.name === selectedCategory)?.products.length || 0} produse)
              </span>
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {currentGroups
                .find(g => g.name === selectedCategory)
                ?.products.map((product, idx) => (
                  <div key={idx} className="border rounded-xl p-4 bg-white hover:shadow-lg transition flex gap-4">
                    {product.image ? (
                      <img 
                        src={product.image} 
                        alt={product.name}
                        className="w-20 h-20 object-contain rounded-lg bg-gray-100 flex-shrink-0"
                      />
                    ) : (
                      <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center text-3xl flex-shrink-0">
                        📦
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-violet-900 truncate">{product.name}</h3>
                      {product.productCode && (
                        <p className="text-xs text-gray-500 font-mono">{product.productCode}</p>
                      )}
                      {product.manufacturer && (
                        <p className="text-sm text-gray-600">🏭 {product.manufacturer}</p>
                      )}
                      <div className="flex items-center justify-between mt-2">
                        <span className="font-bold text-violet-700">{product.price.toFixed(2)} RON</span>
                        <span className={`text-xs px-2 py-1 rounded ${product.stock > 0 ? 'bg-green-100 text-green-700' : product.onDemand ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>
                          {product.stock > 0 ? `Stoc: ${product.stock}` : product.onDemand ? 'La comandă' : 'Stoc epuizat'}
                        </span>
                      </div>
                      <div className="mt-2 flex gap-2">
                        <Link 
                          href={`/shop?search=${encodeURIComponent(product.name)}`}
                          className="text-xs bg-violet-100 hover:bg-violet-200 text-violet-700 px-3 py-1 rounded transition"
                        >
                          👁️ Vezi în magazin
                        </Link>
                        <Link 
                          href={`/admin/adauga-produs-ro`}
                          className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1 rounded transition"
                        >
                          ✏️ Editează
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Statistici rapide */}
        {products.length > 0 && !selectedCategory && (
          <div className="mt-8 pt-6 border-t">
            <h3 className="font-semibold text-gray-700 mb-4">📊 Statistici rapide</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-violet-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-violet-700">{products.length}</div>
                <div className="text-sm text-gray-600">Total produse</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-700">{products.filter(p => p.stock > 0).length}</div>
                <div className="text-sm text-gray-600">În stoc</div>
              </div>
              <div className="bg-orange-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-orange-700">{products.filter(p => p.onDemand).length}</div>
                <div className="text-sm text-gray-600">La comandă</div>
              </div>
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-blue-700">{new Set(products.map(p => p.manufacturer).filter(Boolean)).size}</div>
                <div className="text-sm text-gray-600">Producători</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
