"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type Language = "ro" | "en";

interface Translations {
  [key: string]: {
    ro: string;
    en: string;
  };
}

// Dicționar de traduceri
export const translations: Translations = {
  // Navbar
  "nav.home": { ro: "Acasă", en: "Home" },
  "nav.shop": { ro: "Magazin", en: "Shop" },
  "nav.services": { ro: "Servicii", en: "Services" },
  "nav.about": { ro: "Despre noi", en: "About us" },
  "nav.contact": { ro: "Contact", en: "Contact" },
  "nav.cart": { ro: "Coș", en: "Cart" },
  "nav.wishlist": { ro: "Favorite", en: "Wishlist" },
  "nav.account": { ro: "Cont", en: "Account" },
  "nav.login": { ro: "Autentificare", en: "Login" },
  "nav.register": { ro: "Înregistrare", en: "Register" },
  "nav.logout": { ro: "Deconectare", en: "Logout" },
  
  // Shop
  "shop.addToCart": { ro: "Adaugă în coș", en: "Add to cart" },
  "shop.addToWishlist": { ro: "Adaugă la favorite", en: "Add to wishlist" },
  "shop.inStock": { ro: "În stoc", en: "In stock" },
  "shop.outOfStock": { ro: "Stoc epuizat", en: "Out of stock" },
  "shop.price": { ro: "Preț", en: "Price" },
  "shop.description": { ro: "Descriere", en: "Description" },
  "shop.specifications": { ro: "Specificații", en: "Specifications" },
  "shop.reviews": { ro: "Recenzii", en: "Reviews" },
  "shop.compare": { ro: "Compară", en: "Compare" },
  "shop.recentlyViewed": { ro: "Produse vizualizate recent", en: "Recently viewed products" },
  "shop.recommended": { ro: "Produse recomandate", en: "Recommended products" },
  "shop.filter": { ro: "Filtrează", en: "Filter" },
  "shop.sort": { ro: "Sortează", en: "Sort" },
  "shop.category": { ro: "Categorie", en: "Category" },
  "shop.all": { ro: "Toate", en: "All" },
  "shop.search": { ro: "Căutare...", en: "Search..." },
  
  // Cart
  "cart.title": { ro: "Coșul meu", en: "My cart" },
  "cart.empty": { ro: "Coșul este gol", en: "Your cart is empty" },
  "cart.total": { ro: "Total", en: "Total" },
  "cart.checkout": { ro: "Finalizează comanda", en: "Checkout" },
  "cart.continue": { ro: "Continuă cumpărăturile", en: "Continue shopping" },
  "cart.remove": { ro: "Șterge", en: "Remove" },
  "cart.quantity": { ro: "Cantitate", en: "Quantity" },
  
  // Checkout
  "checkout.title": { ro: "Finalizare comandă", en: "Checkout" },
  "checkout.billing": { ro: "Date facturare", en: "Billing details" },
  "checkout.shipping": { ro: "Adresă livrare", en: "Shipping address" },
  "checkout.payment": { ro: "Metodă plată", en: "Payment method" },
  "checkout.card": { ro: "Card online", en: "Credit card" },
  "checkout.cash": { ro: "Ramburs la curier", en: "Cash on delivery" },
  "checkout.placeOrder": { ro: "Plasează comanda", en: "Place order" },
  "checkout.name": { ro: "Nume complet", en: "Full name" },
  "checkout.email": { ro: "Email", en: "Email" },
  "checkout.phone": { ro: "Telefon", en: "Phone" },
  "checkout.address": { ro: "Adresă", en: "Address" },
  "checkout.city": { ro: "Oraș", en: "City" },
  "checkout.county": { ro: "Județ", en: "County" },
  "checkout.postalCode": { ro: "Cod poștal", en: "Postal code" },
  
  // Account
  "account.orders": { ro: "Comenzile mele", en: "My orders" },
  "account.settings": { ro: "Setări", en: "Settings" },
  "account.password": { ro: "Schimbă parola", en: "Change password" },
  
  // Footer
  "footer.rights": { ro: "Toate drepturile rezervate", en: "All rights reserved" },
  "footer.terms": { ro: "Termeni și condiții", en: "Terms and conditions" },
  "footer.privacy": { ro: "Confidențialitate", en: "Privacy policy" },
  
  // General
  "loading": { ro: "Se încarcă...", en: "Loading..." },
  "error": { ro: "Eroare", en: "Error" },
  "success": { ro: "Succes", en: "Success" },
  "save": { ro: "Salvează", en: "Save" },
  "cancel": { ro: "Anulează", en: "Cancel" },
  "back": { ro: "Înapoi", en: "Back" },
  "next": { ro: "Următorul", en: "Next" },
  "submit": { ro: "Trimite", en: "Submit" },
  "delete": { ro: "Șterge", en: "Delete" },
  "edit": { ro: "Editează", en: "Edit" },
  "view": { ro: "Vezi", en: "View" },
  "close": { ro: "Închide", en: "Close" },
  "yes": { ro: "Da", en: "Yes" },
  "no": { ro: "Nu", en: "No" },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("ro");
  
  useEffect(() => {
    // Check localStorage for saved preference
    try {
      const saved = localStorage.getItem("site-language") as Language;
      if (saved && (saved === "ro" || saved === "en")) {
        setLanguageState(saved);
      }
    } catch (e) {
      // localStorage not available
    }
  }, []);
  
  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem("site-language", lang);
    } catch (e) {
      // localStorage not available
    }
  };
  
  const t = (key: string): string => {
    const translation = translations[key];
    if (!translation) return key;
    return translation[language] || translation.ro || key;
  };
  
  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
}
