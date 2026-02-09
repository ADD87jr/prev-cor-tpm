"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface CompareProduct {
  id: number;
  name: string;
  price: number;
  listPrice?: number;
  image: string;
  brand?: string;
  sku?: string;
  description?: string;
  specs?: string[];
  stock?: number;
}

interface CompareContextType {
  compareItems: CompareProduct[];
  addToCompare: (product: CompareProduct) => boolean;
  removeFromCompare: (productId: number) => void;
  clearCompare: () => void;
  isInCompare: (productId: number) => boolean;
  canAddMore: boolean;
}

const CompareContext = createContext<CompareContextType | undefined>(undefined);

const MAX_COMPARE_ITEMS = 3;

export function CompareProvider({ children }: { children: ReactNode }) {
  const [compareItems, setCompareItems] = useState<CompareProduct[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("compareProducts");
    if (saved) {
      try {
        setCompareItems(JSON.parse(saved));
      } catch (e) {
        console.error("Error parsing compare products:", e);
      }
    }
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    localStorage.setItem("compareProducts", JSON.stringify(compareItems));
  }, [compareItems]);

  const addToCompare = (product: CompareProduct): boolean => {
    if (compareItems.length >= MAX_COMPARE_ITEMS) {
      return false;
    }
    if (compareItems.some(item => item.id === product.id)) {
      return false;
    }
    setCompareItems(prev => [...prev, product]);
    return true;
  };

  const removeFromCompare = (productId: number) => {
    setCompareItems(prev => prev.filter(item => item.id !== productId));
  };

  const clearCompare = () => {
    setCompareItems([]);
  };

  const isInCompare = (productId: number): boolean => {
    return compareItems.some(item => item.id === productId);
  };

  const canAddMore = compareItems.length < MAX_COMPARE_ITEMS;

  return (
    <CompareContext.Provider value={{
      compareItems,
      addToCompare,
      removeFromCompare,
      clearCompare,
      isInCompare,
      canAddMore,
    }}>
      {children}
    </CompareContext.Provider>
  );
}

export function useCompare() {
  const context = useContext(CompareContext);
  if (!context) {
    throw new Error("useCompare must be used within a CompareProvider");
  }
  return context;
}
