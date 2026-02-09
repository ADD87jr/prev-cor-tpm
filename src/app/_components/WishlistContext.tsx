"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useSession } from "next-auth/react";

export type WishlistItem = {
  id: number;
  name: string;
  image: string;
};

type WishlistContextType = {
  items: WishlistItem[];
  addToWishlist: (item: WishlistItem) => void;
  removeFromWishlist: (id: number) => void;
  isInWishlist: (id: number) => boolean;
};

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) throw new Error("useWishlist must be used within a WishlistProvider");
  return context;
}

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const [items, setItems] = useState<WishlistItem[]>([]);

  // Încarcă wishlist din localStorage la inițializare (doar dacă nu e user logat)
  useEffect(() => {
    if (!session?.user?.email) {
      const stored = localStorage.getItem("wishlist");
      if (stored) {
        try {
          setItems(JSON.parse(stored));
        } catch {}
      }
    }
  }, [session?.user?.email]);

  // Salvează wishlist în localStorage la modificare (doar dacă nu e user logat)
  useEffect(() => {
    if (!session?.user?.email) {
      localStorage.setItem("wishlist", JSON.stringify(items));
    }
  }, [items, session?.user?.email]);


  function addToWishlist(item: WishlistItem) {
    setItems(prev => prev.some(i => i.id === item.id) ? prev : [...prev, item]);
    // TODO: dacă user logat, trimite la backend
  }

  function removeFromWishlist(id: number) {
    setItems(prev => prev.filter(i => i.id !== id));
    // TODO: dacă user logat, trimite la backend
  }

  function isInWishlist(id: number) {
    return items.some(i => i.id === id);
  }

  return (
    <WishlistContext.Provider value={{ items, addToWishlist, removeFromWishlist, isInWishlist }}>
      {children}
    </WishlistContext.Provider>
  );
}
