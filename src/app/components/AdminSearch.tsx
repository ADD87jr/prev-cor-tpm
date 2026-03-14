"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

interface SearchResult {
  type: string;
  id: number;
  title: string;
  subtitle?: string;
  url: string;
}

const TYPE_ICONS: Record<string, string> = {
  product: "📦",
  order: "🛒",
  user: "👤",
  invoice: "🧾",
};

export default function AdminSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const router = useRouter();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = (val: string) => {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (val.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/admin/api/search?q=${encodeURIComponent(val.trim())}`);
        const data = await res.json();
        setResults(data.results || []);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  };

  const handleSelect = (result: SearchResult) => {
    setOpen(false);
    setQuery("");
    router.push(result.url);
  };

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center">
        <input
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="🔍 Caută produs, comandă, client..."
          className="bg-blue-800 text-white placeholder-blue-300 px-3 py-1.5 rounded text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-400"
          autoComplete="off"
          data-form-type="other"
        />
        {loading && (
          <span className="absolute right-2 text-blue-300 text-xs animate-pulse">...</span>
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute top-full mt-1 left-0 w-80 bg-white rounded-lg shadow-2xl border z-50 max-h-80 overflow-y-auto">
          {results.map((r, i) => (
            <button
              key={`${r.type}-${r.id}-${i}`}
              onClick={() => handleSelect(r)}
              className="w-full text-left px-3 py-2.5 hover:bg-blue-50 border-b border-gray-100 last:border-0 flex items-start gap-2 transition"
            >
              <span className="text-lg">{TYPE_ICONS[r.type] || "📄"}</span>
              <div className="min-w-0">
                <div className="font-medium text-sm text-gray-800 truncate">{r.title}</div>
                {r.subtitle && <div className="text-xs text-gray-400 truncate">{r.subtitle}</div>}
              </div>
            </button>
          ))}
        </div>
      )}

      {open && results.length === 0 && query.trim().length >= 2 && !loading && (
        <div className="absolute top-full mt-1 left-0 w-80 bg-white rounded-lg shadow-2xl border z-50 p-4 text-center text-gray-400 text-sm">
          Niciun rezultat pentru &quot;{query}&quot;
        </div>
      )}
    </div>
  );
}
