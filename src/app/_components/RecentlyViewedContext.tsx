"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

interface ViewedProduct {
  id: number;
  name: string;
  nameEn?: string;
  slug: string;
  price: number;
  image: string;
  viewedAt: number;
}

interface RecentlyViewedContextType {
  viewedProducts: ViewedProduct[];
  addViewed: (product: Omit<ViewedProduct, "viewedAt">) => void;
  clearViewed: () => void;
  updateProductPrices: (priceMap: Record<number, number>) => void;
}

const RecentlyViewedContext = createContext<RecentlyViewedContextType | undefined>(undefined);

const MAX_VIEWED_ITEMS = 10;

export function RecentlyViewedProvider({ children }: { children: ReactNode }) {
  const [viewedProducts, setViewedProducts] = useState<ViewedProduct[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("recentlyViewed");
    if (saved) {
      try {
        setViewedProducts(JSON.parse(saved));
      } catch (e) {
        console.error("Error parsing recently viewed:", e);
      }
    }
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    if (viewedProducts.length > 0) {
      localStorage.setItem("recentlyViewed", JSON.stringify(viewedProducts));
    }
  }, [viewedProducts]);

  const addViewed = useCallback((product: Omit<ViewedProduct, "viewedAt">) => {
    setViewedProducts(prev => {
      // Remove if already exists
      const filtered = prev.filter(p => p.id !== product.id);
      // Add at beginning with timestamp
      const newItem: ViewedProduct = { ...product, viewedAt: Date.now() };
      // Keep only last MAX_VIEWED_ITEMS
      return [newItem, ...filtered].slice(0, MAX_VIEWED_ITEMS);
    });
  }, []);

  const clearViewed = useCallback(() => {
    setViewedProducts([]);
    localStorage.removeItem("recentlyViewed");
  }, []);

  const updateProductPrices = useCallback((priceMap: Record<number, number>) => {
    setViewedProducts(prev => {
      const updated = prev.map(p => {
        if (priceMap[p.id] !== undefined) {
          return { ...p, price: priceMap[p.id] };
        }
        return p;
      });
      return updated;
    });
  }, []);

  return (
    <RecentlyViewedContext.Provider value={{ viewedProducts, addViewed, clearViewed, updateProductPrices }}>
      {children}
    </RecentlyViewedContext.Provider>
  );
}

export function useRecentlyViewed() {
  const context = useContext(RecentlyViewedContext);
  if (!context) {
    throw new Error("useRecentlyViewed must be used within a RecentlyViewedProvider");
  }
  return context;
}
