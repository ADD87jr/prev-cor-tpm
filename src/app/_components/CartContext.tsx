"use client";
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useSession } from "next-auth/react";

export type CartItem = {
  id: number;
  name: string;
  nameEn?: string;
  price: number;
  listPrice?: number; // preț de listă (fără discount)
  purchasePrice: number;
  quantity: number;
  um?: string; // unitate de măsură (ex: BUC)
  discount?: number; // procent (ex: 0.15 pentru 15%)
  discountType?: string; // 'percent' sau 'fixed'
  coupon?: string;
  appliedCoupon?: any;
  basePrice?: number; // prețul de bază pentru PDF/coș
  unit?: string; // unitate de măsură (ex: BUC)
  deliveryTime?: string;
  // Variante produs
  variantId?: number; // ID varianta din ProductVariant
  variantCode?: string; // cod varianta (SKU)
  variantInfo?: string; // info suplimentar (compatibilitate etc)
  // Pe comandă
  onDemand?: boolean; // produs disponibil pe comandă
};

type CartContextType = {
  items: CartItem[];
  addToCart: (item: Omit<CartItem, "quantity">) => void;
  removeFromCart: (id: number | string, variantId?: number) => void;
  clearCart: () => void;
  updateQuantity: (id: number | string, quantity: number, variantId?: number) => void;
  updateCoupon: (id: number | string, coupon: string) => void;
  updateAppliedCoupon: (id: number | string, appliedCoupon: any) => void;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within a CartProvider");
  return context;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const { status } = useSession ? useSession() : { status: undefined };

  // Forțează reîncărcarea coșului din localStorage la fiecare mount
  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('cart_items') : null;
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Forțează id number la toate itemele
          setItems(parsed.map((item: any) => ({ ...item, id: Number(item.id) })));
        }
      } catch {}
    }
  }, []);

  // Încarcă coșul din localStorage la schimbarea sesiunii (login/logout) și dacă contextul devine gol
  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('cart_items') : null;
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0 && items.length === 0) {
          setItems(parsed.map((item: any) => ({ ...item, id: Number(item.id) })));
        }
      } catch {}
    }
  }, [status, items.length]);

  // Salvează coșul în localStorage la orice modificare
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('cart_items', JSON.stringify(items));
    }
  }, [items]);

  function addToCart(item: Omit<CartItem, "quantity">) {
    setItems((prev) => {
      const itemId = Number(item.id);
      const variantId = item.variantId ? Number(item.variantId) : undefined;
      
      // Dacă are variantă, căutăm combinația id+variantId
      // Dacă nu are variantă, căutăm doar id-ul (fără variantă)
      const existing = prev.find((i) => {
        if (variantId) {
          return Number(i.id) === itemId && Number(i.variantId) === variantId;
        }
        return Number(i.id) === itemId && !i.variantId;
      });
      
      if (existing) {
        return prev.map((i) => {
          if (variantId) {
            return (Number(i.id) === itemId && Number(i.variantId) === variantId) 
              ? { ...i, quantity: i.quantity + 1 } 
              : i;
          }
          return (Number(i.id) === itemId && !i.variantId) 
            ? { ...i, quantity: i.quantity + 1 } 
            : i;
        });
      }
      // Ensure purchasePrice, um, și listPrice sunt prezente
      return [
        ...prev,
        {
          ...item,
          id: itemId,
          quantity: 1,
          purchasePrice: item.purchasePrice ?? item.price,
          um: item.um ?? "BUC",
          listPrice: item.listPrice ?? item.price, // forțează listPrice dacă lipsește
          deliveryTime: item.deliveryTime ?? "",
          variantId: variantId,
          variantCode: item.variantCode,
          variantInfo: item.variantInfo,
          discount: item.discount ?? 0,
          discountType: item.discountType ?? 'percent'
        }
      ];
    });
  }

  function removeFromCart(id: number | string, variantId?: number) {
    setItems((prev) => {
      const idNum = Number(id);
      const varId = variantId ? Number(variantId) : undefined;
      const newItems = prev.filter((i) => {
        if (varId) {
          return !(Number(i.id) === idNum && Number(i.variantId) === varId);
        }
        return !(Number(i.id) === idNum && !i.variantId);
      });
      if (typeof window !== 'undefined') {
        localStorage.setItem('cart_items', JSON.stringify(newItems));
      }
      return newItems;
    });
  }

  function clearCart() {
    setItems([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('cart_items');
      localStorage.removeItem('cart_appliedCoupon'); // Șterge și cuponul la golirea coșului
    }
  }

  function updateQuantity(id: number | string, quantity: number, variantId?: number) {
    const idNum = Number(id);
    const varId = variantId ? Number(variantId) : undefined;
    setItems((prev) => prev.map((i) => {
      if (varId) {
        return (Number(i.id) === idNum && Number(i.variantId) === varId) 
          ? { ...i, quantity: Math.max(1, quantity) } 
          : i;
      }
      return (Number(i.id) === idNum && !i.variantId) 
        ? { ...i, quantity: Math.max(1, quantity) } 
        : i;
    }));
  }

  function updateCoupon(id: number | string, coupon: string) {
    const idNum = Number(id);
    setItems((prev) => prev.map((i) => Number(i.id) === idNum ? { ...i, coupon } : i));
  }
  function updateAppliedCoupon(id: number | string, appliedCoupon: any) {
    const idNum = Number(id);
    setItems((prev) => prev.map((i) => Number(i.id) === idNum ? { ...i, appliedCoupon } : i));
  }
  return (
    <CartContext.Provider value={{ items, addToCart, removeFromCart, clearCart, updateQuantity, updateCoupon, updateAppliedCoupon }}>
      {children}
    </CartContext.Provider>
  );
}
