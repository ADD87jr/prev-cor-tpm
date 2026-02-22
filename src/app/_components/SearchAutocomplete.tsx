"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useLanguage } from "./LanguageContext";

interface Product {
  id: number;
  name: string;
  nameEn?: string;
  price: number;
  image: string;
  domain?: string;
  type?: string;
}

export default function SearchAutocomplete() {
  const { language } = useLanguage();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const getProductName = (p: Product) => language === "en" && p.nameEn ? p.nameEn : p.name;

  // Load all products once
  useEffect(() => {
    fetch("/api/products")
      .then((res) => res.json())
      .then((data) => setAllProducts(data || []))
      .catch(() => {});
  }, []);

  // Handle click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Search when query changes
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setLoading(true);
    const searchTerm = query.toLowerCase();
    
    const filtered = allProducts.filter((p) => {
      const searchFields = [
        p.name,
        p.domain,
        p.type,
      ].filter(Boolean).join(" ").toLowerCase();
      
      return searchFields.includes(searchTerm);
    }).slice(0, 8); // Max 8 results

    setResults(filtered);
    setIsOpen(filtered.length > 0);
    setLoading(false);
  }, [query, allProducts]);

  const handleSelect = () => {
    setQuery("");
    setIsOpen(false);
    if (inputRef.current) inputRef.current.blur();
  };

  return (
    <div ref={wrapperRef} className="relative w-full max-w-md">
      <div className="relative">
        <input
          ref={inputRef}
          type="search"
          name="product-search"
          autoComplete="off"
          placeholder={language === "en" ? "Search products..." : "Caută produse..."}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-400 focus:border-transparent focus:outline-none transition"
        />
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
          </div>
        )}
      </div>

      {/* Dropdown results */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-200 max-h-96 overflow-y-auto z-50">
          {results.map((product) => (
            <Link
              key={product.id}
              href={`/shop/${product.id}`}
              onClick={handleSelect}
              className="flex items-center gap-3 p-3 hover:bg-blue-50 transition border-b border-gray-100 last:border-0"
            >
              <div className="w-12 h-12 relative flex-shrink-0 bg-gray-100 rounded overflow-hidden">
                <Image
                  src={product.image || "/uploads/default.jpg"}
                  alt={product.name}
                  fill
                  className="object-contain"
                  sizes="48px"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800 truncate">{getProductName(product)}</p>
                <p className="text-sm text-gray-500">{product.domain}</p>
              </div>
              <div className="text-blue-700 font-bold whitespace-nowrap">
                {product.price} RON
              </div>
            </Link>
          ))}
          
          {/* Link to full search */}
          {query.length >= 2 && (
            <Link
              href={`/shop?search=${encodeURIComponent(query)}`}
              onClick={handleSelect}
              className="block p-3 text-center text-blue-600 hover:bg-blue-50 font-semibold border-t"
            >
              {language === "en" ? `View all results for "${query}"` : `Vezi toate rezultatele pentru "${query}"`} →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
