"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { MdShoppingCart, MdFavorite, MdFavoriteBorder } from "react-icons/md";


import { useWishlist } from "../_components/WishlistContext";
import { useCart } from "../_components/CartContext";
import { useLanguage } from "../_components/LanguageContext";

// --- Comparare produse ---
function useCompareProducts() {
  const [compare, setCompare] = useState<any[]>([]);
  function toggleCompare(product: any) {
    setCompare((prev) => {
      if (prev.find((p) => p.id === product.id)) {
        return prev.filter((p) => p.id !== product.id);
      } else {
        if (prev.length >= 4) return prev; // max 4 produse
        return [...prev, product];
      }
    });
  }
  function clearCompare() { setCompare([]); }
  return { compare, toggleCompare, clearCompare };
}

function CompareBar({ compare, clearCompare }: { compare: any[], clearCompare: () => void }) {
  const [show, setShow] = useState(false);
  const { language } = useLanguage();
  useEffect(() => { setShow(compare.length > 0); }, [compare.length]);
  if (!show) return null;
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-white border shadow-lg rounded-xl px-4 py-2 flex items-center gap-4 animate-fade-in">
      <span className="font-semibold text-blue-700">{language === "en" ? "Compare:" : "Compari:"}</span>
      {compare.map((p) => (
        <span key={p.id} className="flex items-center gap-1 bg-blue-50 px-2 py-1 rounded text-sm">
          <Image src={p.image || '/products/default.jpg'} alt={p.name} width={32} height={24} className="object-contain rounded" />
          {p.name}
        </span>
      ))}
      <a href={`#compare-modal`} className="ml-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 font-semibold">{language === "en" ? "View comparison" : "Vezi comparația"}</a>
      <button onClick={clearCompare} className="ml-2 px-2 py-1 text-xs text-gray-500 hover:text-red-600">Reset</button>
    </div>
  );
}

function CompareModal({ compare, onClose }: { compare: any[], onClose: () => void }) {
  const { language } = useLanguage();
  const t = {
    title: language === "en" ? "Compare products" : "Compară produse",
    specification: language === "en" ? "Specification" : "Specificație",
    image: language === "en" ? "Image" : "Imagine",
    price: language === "en" ? "Price" : "Preț",
    stock: language === "en" ? "Stock" : "Stoc",
    outOfStock: language === "en" ? "Out of stock" : "Stoc epuizat",
    type: language === "en" ? "Type" : "Tip",
    domain: language === "en" ? "Domain" : "Domeniu",
    manufacturer: language === "en" ? "Manufacturer" : "Producător",
    specifications: language === "en" ? "Specifications" : "Specificații",
    advantages: language === "en" ? "Advantages" : "Avantaje",
    dataSheet: language === "en" ? "Data sheet" : "Fișă tehnică",
  };
  if (!compare.length) return null;
  return (
    <div id="compare-modal" className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-xl p-8 max-w-5xl w-full relative overflow-x-auto">
        <button onClick={onClose} className="absolute top-2 right-2 text-2xl text-gray-400 hover:text-red-600">×</button>
        <h2 className="text-2xl font-bold mb-6 text-blue-700">{t.title}</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full border text-sm">
            <thead>
              <tr>
                <th className="border px-2 py-1 bg-gray-50">{t.specification}</th>
                {compare.map((p) => (
                  <th key={p.id} className="border px-2 py-1 bg-blue-50 font-semibold">{p.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border px-2 py-1 font-semibold">{t.image}</td>
                {compare.map((p) => (
                  <td key={p.id} className="border px-2 py-1"><Image src={p.image || '/products/default.jpg'} alt={p.name} width={80} height={60} className="object-contain rounded mx-auto" /></td>
                ))}
              </tr>
              <tr>
                <td className="border px-2 py-1 font-semibold">{t.price}</td>
                {compare.map((p) => (
                  <td key={p.id} className="border px-2 py-1">{p.price} RON</td>
                ))}
              </tr>
              <tr>
                <td className="border px-2 py-1 font-semibold">{t.stock}</td>
                {compare.map((p) => (
                  <td key={p.id} className="border px-2 py-1">{typeof p.stock === 'number' ? (p.stock > 0 ? p.stock : <span className="text-red-600">{t.outOfStock}</span>) : '-'}</td>
                ))}
              </tr>
              <tr>
                <td className="border px-2 py-1 font-semibold">{t.type}</td>
                {compare.map((p) => (
                  <td key={p.id} className="border px-2 py-1">{p.type}</td>
                ))}
              </tr>
              <tr>
                <td className="border px-2 py-1 font-semibold">{t.domain}</td>
                {compare.map((p) => (
                  <td key={p.id} className="border px-2 py-1">{p.domain}</td>
                ))}
              </tr>
              <tr>
                <td className="border px-2 py-1 font-semibold">{t.manufacturer}</td>
                {compare.map((p) => (
                  <td key={p.id} className="border px-2 py-1">{p.manufacturer || '-'}</td>
                ))}
              </tr>
              <tr>
                <td className="border px-2 py-1 font-semibold">{t.specifications}</td>
                {compare.map((p) => (
                  <td key={p.id} className="border px-2 py-1 whitespace-pre-line">{Array.isArray(p.specs) ? p.specs.join('\n') : (p.specs || '-')}</td>
                ))}
              </tr>
              <tr>
                <td className="border px-2 py-1 font-semibold">{t.advantages}</td>
                {compare.map((p) => (
                  <td key={p.id} className="border px-2 py-1 whitespace-pre-line">{Array.isArray(p.advantages) ? p.advantages.join('\n') : (p.advantages || '-')}</td>
                ))}
              </tr>
              <tr>
                <td className="border px-2 py-1 font-semibold">PDF</td>
                {compare.map((p) => (
                  <td key={p.id} className="border px-2 py-1">{p.pdfUrl ? <a href={p.pdfUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">{t.dataSheet}</a> : '-'}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Traduceri pentru domeniile și tipurile de produse
const domainTranslations: Record<string, string> = {
  "echipamente electrice": "electrical equipment",
  "automatizari": "automation",
  "automatizări": "automation",
  "pneumatice": "pneumatics",
  "hidraulice": "hydraulics",
  "mecanice": "mechanical",
  "senzori": "sensors",
  "roboti": "robots",
  "roboți": "robots",
  "plc": "PLC",
  "hmi": "HMI",
  "motoare": "motors",
  "reductoare": "gearboxes",
  "convertoare": "converters",
  "surse alimentare": "power supplies",
  "cabluri": "cables",
  "conectori": "connectors",
};

const typeTranslations: Record<string, string> = {
  "electric": "electrical",
  "electronic": "electronic",
  "mecanic": "mechanical",
  "pneumatic": "pneumatic",
  "hidraulic": "hydraulic",
  "senzor": "sensor",
  "motor": "motor",
  "variator": "drive",
  "plc": "PLC",
  "hmi": "HMI",
  "robot": "robot",
  "alimentare": "power supply",
  "cablu": "cable",
  "conector": "connector",
  "reductor": "gearbox",
  "valve": "valve",
  "cilindru": "cylinder",
};

export default function ShopPage() {
  const { language } = useLanguage();
  
  // Funcție de traducere pentru domenii/tipuri
  const translateDomain = (domain: string) => {
    if (language !== "en") return domain;
    const key = domain.toLowerCase();
    return domainTranslations[key] || domain;
  };
  
  const translateType = (type: string) => {
    if (language !== "en") return type;
    const key = type.toLowerCase();
    return typeTranslations[key] || type;
  };
  
  // Traduceri pentru shop
  const txt = {
    pageTitle: language === "en" ? "Online Shop" : "Magazin online",
    allDomains: language === "en" ? "All domains" : "Toate domeniile",
    subDomains: language === "en" ? "Sub-domains" : "Sub-domenii",
    searchPlaceholder: language === "en" ? "Search products..." : "Caută produse...",
    brand: language === "en" ? "Brand" : "Brand",
    all: language === "en" ? "All" : "Toate",
    price: language === "en" ? "Price" : "Preț",
    sort: language === "en" ? "Sort" : "Sortare",
    relevance: language === "en" ? "Relevance" : "Relevanță",
    priceAsc: language === "en" ? "Price ascending" : "Preț crescător",
    priceDesc: language === "en" ? "Price descending" : "Preț descrescător",
    inStockOnly: language === "en" ? "In stock only" : "Doar în stoc",
    promoOnly: language === "en" ? "Promotions only" : "Doar promoții",
    resetFilters: language === "en" ? "Reset filters" : "Resetează filtrele",
    grid: "Grid",
    list: language === "en" ? "List" : "Listă",
    loading: language === "en" ? "Loading products..." : "Se încarcă produsele...",
    noProducts: language === "en" ? "No products found" : "Nu s-au găsit produse",
    tryFilters: language === "en" ? "Try modifying filters or search" : "Încearcă să modifici filtrele sau căutarea",
    addToCart: language === "en" ? "Add to cart" : "Adaugă în coș",
    viewDetails: language === "en" ? "View details" : "Vezi detalii",
    stock: language === "en" ? "Stock" : "Stoc",
    outOfStock: language === "en" ? "Out of stock" : "Stoc epuizat",
    delivery: language === "en" ? "Delivery" : "Livrare",
    onRequest: language === "en" ? "On request" : "La cerere",
    productCode: language === "en" ? "Product code" : "Cod produs",
    addedToCart: language === "en" ? "has been added to cart!" : "a fost adăugat în coș!",
    showing: language === "en" ? "Showing" : "Se afișează",
    of: language === "en" ? "of" : "din",
    products: language === "en" ? "products" : "produse",
    filtered: language === "en" ? "(filtered)" : "(filtrate)",
    previous: language === "en" ? "Previous" : "Anterior",
    next: language === "en" ? "Next" : "Următor",
    compare: language === "en" ? "Compare" : "Compari",
    viewComparison: language === "en" ? "View comparison" : "Vezi comparația",
    reset: "Reset",
    compareProducts: language === "en" ? "Compare products" : "Compară produse",
    specification: language === "en" ? "Specification" : "Specificație",
    image: language === "en" ? "Image" : "Imagine",
    type: language === "en" ? "Type" : "Tip",
    domain: language === "en" ? "Domain" : "Domeniu",
    manufacturer: language === "en" ? "Manufacturer" : "Producător",
    specifications: language === "en" ? "Specifications" : "Specificații",
    advantages: language === "en" ? "Advantages" : "Avantaje",
    dataSheet: language === "en" ? "Data sheet" : "Fișă tehnică",
    addToFavorites: language === "en" ? "Add to favorites" : "Adaugă la favorite",
    removeFromFavorites: language === "en" ? "Remove from favorites" : "Elimină din favorite",
    addToCompare: language === "en" ? "Compare product" : "Compară produsul",
    removeFromCompare: language === "en" ? "Remove from comparison" : "Elimină din comparație",
    onDemand: language === "en" ? "On order" : "La comandă",
    availableOnDemand: language === "en" ? "Available on order" : "Disponibil pe comandă",
  };

  // Funcții helper pentru traducerea produselor
  const getProductName = (product: any) => {
    if (language === "en" && product.nameEn) return product.nameEn;
    return product.name;
  };
  
  const getProductDescription = (product: any) => {
    if (language === "en" && product.descriptionEn) return product.descriptionEn;
    return product.description;
  };

  const getDeliveryTime = (product: any) => {
    if (language === "en" && product.deliveryTimeEn) return product.deliveryTimeEn;
    return product.deliveryTime;
  };

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [domain, setDomain] = useState("");
  const [sort, setSort] = useState("relevanta");
  const [promoOnly, setPromoOnly] = useState(false);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 6;
  const [bannerIdx, setBannerIdx] = useState(0);
  const { items: wishlist, addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const [products, setProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [promoBanners, setPromoBanners] = useState<{title: string, titleEn?: string, text: string, textEn?: string, image: string, active?: boolean}[]>([]);
  // --- Comparare produse ---
  const { compare, toggleCompare, clearCompare } = useCompareProducts();
  const [showCompareModal, setShowCompareModal] = useState(false);

  useEffect(() => {
    setLoadingProducts(true);
    Promise.all([
      fetch("/api/products").then(res => res.json()),
      fetch("/api/promotii").then(res => res.json())
    ])
      .then(([productsData, promosData]) => {
        setProducts(productsData);
        const activePromos = (promosData || []).filter((p: any) => p.active !== false);
        setPromoBanners(activePromos.length > 0 ? activePromos : [
          { title: "Magazin Online", text: "Cele mai bune produse pentru tine!", image: "", active: true }
        ]);
      })
      .catch(() => {
        setProducts([]);
        setPromoBanners([{ title: "Magazin Online", text: "Cele mai bune produse!", image: "", active: true }]);
      })
      .finally(() => setLoadingProducts(false));
  }, []);

  useEffect(() => {
    if (window.location.hash === '#compare-modal') setShowCompareModal(true);
    const onHash = () => setShowCompareModal(window.location.hash === '#compare-modal');
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const fixedTypes = Array.from(new Set(products.map(p => p.type)));
  const uniqueDomains = Array.from(new Set(products.map(p => p.domain)));
  const uniqueManufacturers = Array.from(new Set(products.map(p => p.manufacturer).filter(Boolean))) as string[];
  let filtered = products.filter(p =>
    (type ? p.type === type : true) &&
    (domain ? p.domain === domain : true) &&
    (manufacturer ? p.manufacturer === manufacturer : true) &&
    (priceMin ? p.price >= parseFloat(priceMin) : true) &&
    (priceMax ? p.price <= parseFloat(priceMax) : true) &&
    (search ? (
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase())
    ) : true) &&
    (!promoOnly || p.discount > 0) &&
    (!inStockOnly || (typeof p.stock === "number" && p.stock > 0))
  );
  if (sort === "pret-cresc") filtered = [...filtered].sort((a, b) => a.price - b.price);
  if (sort === "pret-desc") filtered = [...filtered].sort((a, b) => b.price - a.price);
  const totalPages = Math.ceil(filtered.length / pageSize);
  const pagedProducts = filtered.slice((page - 1) * pageSize, page * pageSize);

  const testimonials = [
    {
      logo: "/clients/continental.png",
      name: "Continental Automotive",
      quote: "Colaborarea cu PREV-COR TPM a dus la creșterea eficienței și reducerea timpilor de oprire în fabrica noastră.",
    },
    {
      logo: "/clients/schneider.png",
      name: "Schneider Electric",
      quote: "Echipa PREV-COR TPM a livrat soluții tehnice inovatoare și suport prompt pentru proiectele noastre.",
    },
    {
      logo: "/clients/rompetrol.png",
      name: "Rompetrol",
      quote: "Profesionalism și seriozitate în fiecare etapă a colaborării. Recomandăm cu încredere!",
    },
  ];


  function toggleWishlist(product: any) {
    if (isInWishlist(product.id)) {
      removeFromWishlist(product.id);
    } else {
      addToWishlist({ id: product.id, name: product.name, image: product.image });
    }
  }

  const { addToCart } = useCart();
  const [addedMsg, setAddedMsg] = useState<string | null>(null);

  return (
    <main className="container mx-auto py-10 px-4">
      {addedMsg && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white px-6 py-3 rounded-xl shadow-lg text-lg animate-bounce">
          {addedMsg}
        </div>
      )}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-center">{txt.pageTitle}</h1>
      </div>
      {/* Tab-uri pentru tipuri și domenii pe linii separate */}
      <div className="flex flex-col gap-3 mb-6">
        {/* Domenii */}
        <div className="flex flex-wrap justify-center gap-2">
          <button
            className={"px-4 py-2 rounded-full border font-semibold shadow transition-all bg-blue-700 text-white border-blue-700 scale-105"}
            onClick={() => setDomain('')}
          >
            {txt.allDomains}
          </button>
          {uniqueDomains.map((d) => {
            const hasProducts = products.some(p => p.domain === d);
            const btnClass = `px-4 py-2 rounded-full border font-semibold shadow transition-all ${domain === d ? 'bg-blue-700 text-white border-blue-700 scale-105' : 'bg-white text-blue-700 border-blue-300'} ${!hasProducts ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-50'}`;
            return hasProducts
              ? (
                  <button
                    key={d}
                    className={btnClass}
                    onClick={() => setDomain(d)}
                  >
                    {translateDomain(d).toLowerCase()}
                  </button>
                )
              : (
                  <button
                    key={d}
                    className={btnClass}
                    disabled={true}
                  >
                    {translateDomain(d).toLowerCase()}
                  </button>
                );
          })}
        </div>
        {/* Tipuri */}
        <div className="flex flex-wrap justify-center gap-2">
          <button
            className={"px-4 py-2 rounded-full border font-semibold shadow transition-all bg-blue-700 text-white border-blue-700 scale-105"}
            onClick={() => setType('')}
          >
            {txt.subDomains}
          </button>
          {fixedTypes.map((t) => {
            const hasProducts = products.some(p => p.type === t);
            const btnClass = `px-4 py-2 rounded-full border font-semibold shadow transition-all ${type === t ? 'bg-blue-700 text-white border-blue-700 scale-105' : 'bg-white text-blue-700 border-blue-300'} ${!hasProducts ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-50'}`;
            return hasProducts
              ? (
                  <button
                    key={t}
                    className={btnClass}
                    onClick={() => setType(t)}
                  >
                    {translateType(t).toLowerCase()}
                  </button>
                )
              : (
                  <button
                    key={t}
                    className={btnClass}
                    disabled={true}
                  >
                    {translateType(t)}
                  </button>
                );
          })}
        </div>
      </div>
      {/* Filtre avansate: căutare, disponibilitate, promoții, sortare */}
      <div className="flex flex-wrap items-center justify-center gap-4 mb-6 bg-gray-50 rounded-xl p-4 shadow-inner">
        {/* Căutare */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder={txt.searchPlaceholder}
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="px-3 py-2 border rounded-lg w-48 focus:ring-2 focus:ring-blue-400 focus:outline-none"
          />
        </div>
        {/* Producător */}
        {uniqueManufacturers.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-600">{txt.brand}:</label>
            <select
              value={manufacturer}
              onChange={e => { setManufacturer(e.target.value); setPage(1); }}
              className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none"
            >
              <option value="">{txt.all}</option>
              {uniqueManufacturers.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        )}
        {/* Preț minim-maxim */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-600">{txt.price}:</label>
          <input
            type="number"
            placeholder="Min"
            value={priceMin}
            onChange={e => { setPriceMin(e.target.value); setPage(1); }}
            className="px-2 py-2 border rounded-lg w-20 focus:ring-2 focus:ring-blue-400 focus:outline-none"
          />
          <span className="text-gray-400">-</span>
          <input
            type="number"
            placeholder="Max"
            value={priceMax}
            onChange={e => { setPriceMax(e.target.value); setPage(1); }}
            className="px-2 py-2 border rounded-lg w-20 focus:ring-2 focus:ring-blue-400 focus:outline-none"
          />
          <span className="text-xs text-gray-500">RON</span>
        </div>
        {/* Sortare */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-600">{txt.sort}:</label>
          <select
            value={sort}
            onChange={e => setSort(e.target.value)}
            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none"
          >
            <option value="relevanta">{txt.relevance}</option>
            <option value="pret-cresc">{txt.priceAsc}</option>
            <option value="pret-desc">{txt.priceDesc}</option>
          </select>
        </div>
        {/* Doar în stoc */}
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={e => { setInStockOnly(e.target.checked); setPage(1); }}
            className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-green-700">{txt.inStockOnly}</span>
        </label>
        {/* Doar promoții */}
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={promoOnly}
            onChange={e => { setPromoOnly(e.target.checked); setPage(1); }}
            className="w-5 h-5 text-red-600 rounded focus:ring-red-500"
          />
          <span className="text-sm font-medium text-red-600">{txt.promoOnly}</span>
        </label>
        {/* Resetare filtre */}
        <button
          onClick={() => { setSearch(''); setType(''); setDomain(''); setManufacturer(''); setPriceMin(''); setPriceMax(''); setSort('relevanta'); setPromoOnly(false); setInStockOnly(false); setPage(1); }}
          className="px-3 py-2 text-sm font-semibold text-gray-600 bg-gray-200 rounded-lg hover:bg-gray-300 transition"
        >
          {txt.resetFilters}
        </button>
      </div>
      {/* Toggle grid/list view */}
      <div className="flex justify-end mb-4 gap-2">
        <button
          className={`px-3 py-1 rounded border ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-white'}`}
          onClick={() => setViewMode('grid')}
          aria-label={language === "en" ? "Grid view" : "Vizualizare grid"}
        >
          <svg className="w-5 h-5 inline-block mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
          {txt.grid}
        </button>
        <button
          className={`px-3 py-1 rounded border ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-white'}`}
          onClick={() => setViewMode('list')}
          aria-label={language === "en" ? "List view" : "Vizualizare listă"}
        >
          <svg className="w-5 h-5 inline-block mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="3"/><rect x="4" y="10.5" width="16" height="3"/><rect x="4" y="16" width="16" height="3"/></svg>
          {txt.list}
        </button>
      </div>
      {/* Banner promoțional/slider - design cu imagine vizibilă */}
      {promoBanners.length > 0 && (
        <div className="mb-8 relative rounded-2xl overflow-hidden shadow-2xl bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600">
          <div className="flex flex-col md:flex-row items-center">
            {/* Imaginea - mai compactă */}
            {promoBanners[bannerIdx]?.image && (
              <div className="w-full md:w-1/4 h-32 md:h-36 flex-shrink-0">
                <img 
                  src={promoBanners[bannerIdx].image} 
                  alt={promoBanners[bannerIdx]?.title || ''} 
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            
            {/* Conținut text */}
            <div className={`flex-1 py-8 md:py-12 px-8 text-center ${promoBanners[bannerIdx]?.image ? 'md:text-left' : ''}`}>
              <h2 
                className="text-3xl md:text-4xl font-extrabold text-white mb-3"
                style={{ textShadow: '1px 1px 4px rgba(0,0,0,0.3)' }}
              >
                {language === "en" ? (promoBanners[bannerIdx]?.titleEn || promoBanners[bannerIdx]?.title) : promoBanners[bannerIdx]?.title}
              </h2>
              <p 
                className="text-lg md:text-xl text-blue-100 font-medium"
              >
                {language === "en" ? (promoBanners[bannerIdx]?.textEn || promoBanners[bannerIdx]?.text) : promoBanners[bannerIdx]?.text}
              </p>
            </div>
          </div>
          
          {/* Navigare slider */}
          {promoBanners.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-3">
              {promoBanners.map((_, i) => (
                <button 
                  key={i} 
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${i === bannerIdx ? 'bg-white scale-125' : 'bg-white/50 hover:bg-white/80'}`} 
                  onClick={() => setBannerIdx(i)} 
                  aria-label={`Banner ${i+1}`}
                ></button>
              ))}
            </div>
          )}
          
          {/* Săgeți navigare */}
          {promoBanners.length > 1 && (
            <>
              <button 
                onClick={() => setBannerIdx(prev => prev === 0 ? promoBanners.length - 1 : prev - 1)}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center text-white transition-all"
                aria-label="Banner anterior"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
              </button>
              <button 
                onClick={() => setBannerIdx(prev => prev === promoBanners.length - 1 ? 0 : prev + 1)}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center text-white transition-all"
                aria-label="Banner următor"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
              </button>
            </>
          )}
        </div>
      )}

      {/* Grid/Listă produse */}
      {loadingProducts ? (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-500">{txt.loading}</p>
        </div>
      ) : pagedProducts.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <p className="text-xl text-gray-500">{txt.noProducts}</p>
          <p className="text-gray-400 mt-2">{txt.tryFilters}</p>
          <button
            onClick={() => { setSearch(''); setType(''); setDomain(''); setSort('relevanta'); setPromoOnly(false); setInStockOnly(false); setPage(1); }}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            {txt.resetFilters}
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
          {pagedProducts.map((product) => {
            const discountPercent = product.discountType === "percent"
              ? (product.discount > 1 ? product.discount : product.discount * 100)
              : product.discount;
            const priceWithDiscount = product.discountType === "percent"
              ? (product.price * (1 - discountPercent / 100)).toFixed(2)
              : (product.price - product.discount).toFixed(2);
            return (
              <div key={product.id} className="bg-gradient-to-br from-blue-50 via-white to-blue-100 border border-blue-200 rounded-2xl shadow-xl p-4 flex flex-col h-full relative group transition-transform duration-200 hover:scale-105 hover:shadow-2xl">
                {/* Badge reduceri */}
                {discountPercent > 0 && (
                  <span className="absolute top-3 left-3 bg-red-600 text-white text-xs px-2 py-1 rounded-full z-10 shadow">-{Math.round(discountPercent)}%</span>
                )}
                {/* Badge nou */}
                {product.isNew && (
                  <span className="absolute top-3 right-3 bg-blue-600 text-white text-xs px-2 py-1 rounded-full z-10 shadow">{language === "en" ? "New" : "Nou"}</span>
                )}
                {/* Badge la comandă */}
                {product.onDemand && (
                  <span className="absolute top-10 left-3 bg-orange-500 text-white text-xs px-2 py-1 rounded-full z-10 shadow">{txt.onDemand}</span>
                )}
                {/* Favorite */}
                <button
                  className={`absolute top-3 right-12 z-10 rounded-full p-1 border-2 ${isInWishlist(product.id) ? 'bg-pink-100 border-pink-400 text-pink-600' : 'bg-white border-gray-300 text-gray-400 hover:bg-pink-50 hover:text-pink-500'}`}
                  title={isInWishlist(product.id) ? txt.removeFromFavorites : txt.addToFavorites}
                  onClick={() => toggleWishlist(product)}
                  aria-label={isInWishlist(product.id) ? txt.removeFromFavorites : txt.addToFavorites}
                >
                  {isInWishlist(product.id) ? <MdFavorite className="w-6 h-6" /> : <MdFavoriteBorder className="w-6 h-6" />}
                </button>
                {/* Buton comparare */}
                <button
                  className={`absolute top-3 right-24 z-10 rounded-full p-1 border-2 ${compare.find((p) => p.id === product.id) ? 'bg-green-100 border-green-400 text-green-700' : 'bg-white border-gray-300 text-gray-400 hover:bg-green-50 hover:text-green-700'}`}
                  title={compare.find((p) => p.id === product.id) ? txt.removeFromCompare : txt.addToCompare}
                  onClick={() => toggleCompare(product)}
                  aria-label={compare.find((p) => p.id === product.id) ? txt.removeFromCompare : txt.addToCompare}
                >
                  <span className="font-bold text-lg">≣</span>
                </button>
                <a href={`/shop/${product.id}`} aria-label={`${language === "en" ? "Details for" : "Detalii pentru"} ${getProductName(product)}`} className="block focus:outline-none focus:ring-2 focus:ring-blue-500 group">
                  <div className="mb-2 flex items-center justify-center">
                    <Image src={(!product.image || (!product.image.startsWith('/products/') && !product.image.startsWith('/uploads/'))) ? '/products/default.jpg' : product.image} alt={getProductName(product)} width={180} height={140} className="object-contain rounded-xl border bg-white" />
                  </div>
                  <h2 className="font-bold text-lg mb-1 text-center text-gray-900 group-hover:text-blue-700 transition-colors">{getProductName(product)}</h2>
                  <p className="mb-2 text-gray-600 text-sm line-clamp-2 min-h-[2.5em] text-center">{getProductDescription(product)}</p>
                  {product.productCode && (
                    <div className="mb-1 text-xs text-gray-500 font-mono text-center">{txt.productCode}: {product.productCode}</div>
                  )}
                  <button type="button" className="mt-2 mx-auto flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-700 font-semibold shadow hover:bg-blue-200 transition group-hover:bg-blue-200 group-hover:text-blue-900 cursor-pointer">
                    {txt.viewDetails} <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
                  </button>
                </a>
                <div className="flex flex-col items-center mt-auto">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-blue-700 font-bold text-xl">{discountPercent > 0 ? <><span className='line-through text-gray-400 text-base mr-1'>{product.price} RON</span> <span>{priceWithDiscount} RON</span></> : <>{product.price} RON</>}</span>
                  </div>
                  {/* Eliminat afișarea codului de cupon */}
                  <button
                    type="button"
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition w-full mt-1 flex items-center justify-center gap-2"
                    onClick={e => {
                      e.stopPropagation();
                      addToCart({
                        id: Number(product.id),
                        name: product.name,                      nameEn: product.nameEn,                        listPrice: product.listPrice, // preț de vânzare (fără discount)
                        price: product.price, // preț cu discount (din catalog)
                        discount: product.discount ?? 0,
                        discountType: product.discountType ?? 'percent',
                        purchasePrice: product.purchasePrice, // preț de achiziție
                        deliveryTime: product.deliveryTime
                      });
                      setAddedMsg(`${getProductName(product)} ${txt.addedToCart}`);
                      setTimeout(() => setAddedMsg(null), 2000);
                    }}
                    aria-label={`${txt.addToCart} ${getProductName(product)}`}
                  >
                    <MdShoppingCart className="w-5 h-5" /> {txt.addToCart}
                  </button>
                  <div className="text-xs mt-2 text-gray-500 text-center">
                    <span>{product.onDemand ? <span className="text-orange-600 font-semibold">{txt.availableOnDemand}</span> : <>{txt.stock}: {typeof product.stock === "number" ? (product.stock > 0 ? product.stock : <span className="text-red-600 font-semibold">{txt.outOfStock}</span>) : "-"}</>}</span>
                    <span className="ml-2">{txt.delivery}: {getDeliveryTime(product) ?? txt.onRequest}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {pagedProducts.map((product) => (
            <div key={product.id} className="border rounded-2xl p-4 shadow-lg bg-white flex flex-row items-center gap-6 relative group">
              <button
                className={`absolute top-3 right-3 z-10 rounded-full p-1 border-2 ${isInWishlist(product.id) ? 'bg-pink-100 border-pink-400 text-pink-600' : 'bg-white border-gray-300 text-gray-400 hover:bg-pink-50 hover:text-pink-500'}`}
                title={isInWishlist(product.id) ? txt.removeFromFavorites : txt.addToFavorites}
                onClick={() => toggleWishlist(product)}
                aria-label={isInWishlist(product.id) ? txt.removeFromFavorites : txt.addToFavorites}
              >
                {isInWishlist(product.id) ? <MdFavorite className="w-6 h-6" /> : <MdFavoriteBorder className="w-6 h-6" />}
              </button>
              {/* Buton comparare */}
              <button
                className={`absolute top-3 right-14 z-10 rounded-full p-1 border-2 ${compare.find((p) => p.id === product.id) ? 'bg-green-100 border-green-400 text-green-700' : 'bg-white border-gray-300 text-gray-400 hover:bg-green-50 hover:text-green-700'}`}
                title={compare.find((p) => p.id === product.id) ? txt.removeFromCompare : txt.addToCompare}
                onClick={() => toggleCompare(product)}
                aria-label={compare.find((p) => p.id === product.id) ? txt.removeFromCompare : txt.addToCompare}
              >
                <span className="font-bold text-lg">≣</span>
              </button>
              {/* Badge la comandă - list view */}
              {product.onDemand && (
                <span className="absolute top-3 left-3 bg-orange-500 text-white text-xs px-2 py-1 rounded-full z-10 shadow">{txt.onDemand}</span>
              )}
              <a href={`/shop/${product.id}`} aria-label={`${language === "en" ? "Details for" : "Detalii pentru"} ${getProductName(product)}`} className="w-32 h-24 flex-shrink-0 relative block focus:outline-none focus:ring-2 focus:ring-blue-500">
                <Image src={(!product.image || (!product.image.startsWith('/products/') && !product.image.startsWith('/uploads/'))) ? '/products/default.jpg' : product.image} alt={getProductName(product)} fill className="object-contain rounded-xl" />
              </a>
              <div className="flex-1 flex flex-col gap-1">
                <a href={`/shop/${product.id}`} aria-label={`${language === "en" ? "Details for" : "Detalii pentru"} ${getProductName(product)}`} className="block focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <h2 className="text-lg font-bold mb-1 text-gray-900">{getProductName(product)}</h2>
                  <p className="mb-2 text-gray-600 text-sm line-clamp-2 min-h-[2.5em]">{getProductDescription(product)}</p>
                  {product.productCode && (
                    <div className="mb-1 text-xs text-gray-500 font-mono">{txt.productCode}: {product.productCode}</div>
                  )}
                </a>
                <div className="flex items-center gap-2 mb-2 mt-1">
                  <span className="text-blue-700 font-bold text-base">{product.discount > 0 ? <><span className='line-through text-gray-400 text-sm mr-1'>{product.price} RON</span> <span>{(product.price * (1 - product.discount / 100)).toFixed(2)} RON</span></> : <>{product.price} RON</>}</span>
                </div>
                {/* Eliminat afișarea codului de cupon din listă */}
                <button
                  type="button"
                  className="bg-blue-600 text-white px-3 py-1 rounded-lg font-semibold hover:bg-blue-700 transition w-fit flex items-center justify-center gap-2 text-sm"
                  onClick={e => {
                    e.stopPropagation();
                    const catalogProduct = products.find(p => p.id === product.id);
                    const listPrice = catalogProduct ? catalogProduct.listPrice : product.listPrice;
                    const priceWithDiscount = catalogProduct ? catalogProduct.price : product.price;
                    const discount = catalogProduct ? catalogProduct.discount : product.discount;
                    addToCart({
                      id: product.id,
                      name: product.name,
                      nameEn: product.nameEn,
                      listPrice: listPrice, // preț de vânzare (fără discount)
                      price: priceWithDiscount, // preț cu discount
                      discount: discount ?? 0,
                      discountType: catalogProduct?.discountType ?? product.discountType ?? 'percent',
                      coupon: product.couponCode ?? undefined,
                      purchasePrice: product.purchasePrice
                    });
                    setAddedMsg(`${getProductName(product)} ${txt.addedToCart}`);
                    setTimeout(() => setAddedMsg(null), 2000);
                  }}
                  aria-label={`${txt.addToCart} ${getProductName(product)}`}
                >
                  <MdShoppingCart className="w-4 h-4" /> {txt.addToCart}
                </button>
                <div className="text-xs mt-2 text-gray-500">
                  <span>{product.onDemand ? <span className="text-orange-600 font-semibold">{txt.availableOnDemand}</span> : <>{txt.stock}: {typeof product.stock === "number" ? (product.stock > 0 ? product.stock : <span className="text-red-600 font-semibold">{txt.outOfStock}</span>) : "-"}</>}</span>
                  <span className="ml-2">{txt.delivery}: {getDeliveryTime(product) ?? txt.onRequest}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {/* Info rezultate și paginare */}
      <div className="mt-8 flex flex-col items-center gap-4">
        <p className="text-gray-600">
          {txt.showing} {pagedProducts.length} {txt.of} {filtered.length} {txt.products}
          {(type || domain || search || promoOnly || inStockOnly) && <span className="text-blue-600 ml-1">{txt.filtered}</span>}
        </p>
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-2 rounded-lg border bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ← {txt.previous}
            </button>
            <div className="flex gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-10 h-10 rounded-lg border font-semibold ${page === p ? 'bg-blue-600 text-white' : 'bg-white hover:bg-gray-100'}`}
                >
                  {p}
                </button>
              ))}
            </div>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-2 rounded-lg border bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {txt.next} →
            </button>
          </div>
        )}
      </div>
      {/* ...restul codului existent: filtre, paginare, testimoniale etc. */}
      {/* Bară persistentă comparare */}
      <CompareBar compare={compare} clearCompare={clearCompare} />
      {showCompareModal && <CompareModal compare={compare} onClose={() => { setShowCompareModal(false); window.location.hash = ''; }} />}
    </main>
  );
}