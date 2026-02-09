"use client";

import Link from "next/link";
import { useLanguage } from "./_components/LanguageContext";

export default function NotFound() {
  const { language } = useLanguage();
  
  const txt = {
    title: language === "en" ? "Page Not Found" : "Pagina nu a fost găsită",
    subtitle: language === "en" 
      ? "The page you are looking for does not exist or has been moved."
      : "Pagina pe care o cauți nu există sau a fost mutată.",
    goHome: language === "en" ? "Go to Homepage" : "Mergi la pagina principală",
    goShop: language === "en" ? "Browse Products" : "Vezi produsele",
  };

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-16">
      <div className="text-center max-w-md">
        <h1 className="text-9xl font-bold text-blue-600 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">{txt.title}</h2>
        <p className="text-gray-600 mb-8">{txt.subtitle}</p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link 
            href="/" 
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            {txt.goHome}
          </Link>
          <Link 
            href="/shop" 
            className="bg-gray-200 text-gray-800 px-6 py-3 rounded-lg font-semibold hover:bg-gray-300 transition"
          >
            {txt.goShop}
          </Link>
        </div>
      </div>
    </div>
  );
}
