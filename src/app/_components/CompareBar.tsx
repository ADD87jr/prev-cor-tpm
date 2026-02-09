"use client";

import { useCompare } from "./CompareContext";
import Image from "next/image";
import Link from "next/link";

export default function CompareBar() {
  const { compareItems, removeFromCompare, clearCompare } = useCompare();

  if (compareItems.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.15)] z-50 border-t border-gray-200">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Products preview */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-gray-600 hidden sm:block">
              📊 Compară ({compareItems.length}/3):
            </span>
            <div className="flex gap-2">
              {compareItems.map(item => (
                <div 
                  key={item.id} 
                  className="relative group bg-gray-100 rounded-lg p-1 flex items-center gap-2"
                >
                  <div className="relative w-10 h-10">
                    <Image
                      src={item.image || "/products/placeholder.png"}
                      alt={item.name}
                      fill
                      className="object-contain rounded"
                    />
                  </div>
                  <span className="text-xs font-medium max-w-[100px] truncate hidden md:block">
                    {item.name}
                  </span>
                  <button
                    onClick={() => removeFromCompare(item.id)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ✕
                  </button>
                </div>
              ))}
              
              {/* Empty slots */}
              {Array.from({ length: 3 - compareItems.length }).map((_, i) => (
                <div 
                  key={`empty-${i}`}
                  className="w-12 h-12 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-300"
                >
                  +
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={clearCompare}
              className="text-sm text-gray-500 hover:text-red-500 transition"
            >
              Șterge
            </button>
            <Link
              href="/compare"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold text-sm hover:bg-blue-700 transition flex items-center gap-2"
            >
              <span>📊</span>
              <span className="hidden sm:inline">Compară</span>
              <span className="sm:hidden">{compareItems.length}</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
