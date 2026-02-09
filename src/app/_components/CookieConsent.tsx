"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function CookieConsent() {
  const [show, setShow] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Verifică dacă utilizatorul a acceptat deja
    const consent = localStorage.getItem("cookieConsent");
    if (!consent) {
      // Afișează banner-ul după 1 secundă
      setTimeout(() => setShow(true), 1000);
    }
  }, []);

  const acceptAll = () => {
    localStorage.setItem("cookieConsent", JSON.stringify({
      necessary: true,
      analytics: true,
      marketing: true,
      timestamp: new Date().toISOString()
    }));
    setShow(false);
    // Activează analytics dacă există
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("consent", "update", {
        analytics_storage: "granted",
        ad_storage: "granted"
      });
    }
  };

  const acceptNecessary = () => {
    localStorage.setItem("cookieConsent", JSON.stringify({
      necessary: true,
      analytics: false,
      marketing: false,
      timestamp: new Date().toISOString()
    }));
    setShow(false);
  };

  const savePreferences = (analytics: boolean, marketing: boolean) => {
    localStorage.setItem("cookieConsent", JSON.stringify({
      necessary: true,
      analytics,
      marketing,
      timestamp: new Date().toISOString()
    }));
    setShow(false);
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("consent", "update", {
        analytics_storage: analytics ? "granted" : "denied",
        ad_storage: marketing ? "granted" : "denied"
      });
    }
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] p-4 bg-gray-900/95 backdrop-blur-sm shadow-lg border-t border-gray-700">
      <div className="container mx-auto max-w-6xl">
        {!showDetails ? (
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex-1 text-white">
              <p className="text-sm md:text-base">
                🍪 Folosim cookie-uri pentru a îmbunătăți experiența ta pe site. 
                Unele sunt esențiale pentru funcționarea site-ului, altele ne ajută să înțelegem cum folosești site-ul.{" "}
                <Link href="/privacy" className="underline text-blue-400 hover:text-blue-300">
                  Politica de confidențialitate
                </Link>
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setShowDetails(true)}
                className="px-4 py-2 text-sm text-gray-300 hover:text-white border border-gray-600 rounded-lg hover:border-gray-500 transition"
              >
                Personalizează
              </button>
              <button
                onClick={acceptNecessary}
                className="px-4 py-2 text-sm text-white bg-gray-700 hover:bg-gray-600 rounded-lg transition"
              >
                Doar esențiale
              </button>
              <button
                onClick={acceptAll}
                className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition"
              >
                Accept toate
              </button>
            </div>
          </div>
        ) : (
          <CookiePreferences 
            onSave={savePreferences} 
            onBack={() => setShowDetails(false)}
            onAcceptAll={acceptAll}
          />
        )}
      </div>
    </div>
  );
}

function CookiePreferences({ 
  onSave, 
  onBack,
  onAcceptAll 
}: { 
  onSave: (analytics: boolean, marketing: boolean) => void;
  onBack: () => void;
  onAcceptAll: () => void;
}) {
  const [analytics, setAnalytics] = useState(true);
  const [marketing, setMarketing] = useState(false);

  return (
    <div className="text-white">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold">Preferințe cookie-uri</h3>
        <button onClick={onBack} className="text-gray-400 hover:text-white">
          ← Înapoi
        </button>
      </div>
      
      <div className="space-y-3 mb-4">
        {/* Necesare */}
        <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
          <div>
            <p className="font-semibold">Cookie-uri necesare</p>
            <p className="text-sm text-gray-400">Esențiale pentru funcționarea site-ului (coș, autentificare)</p>
          </div>
          <div className="bg-green-600 px-3 py-1 rounded text-sm font-semibold">
            Mereu active
          </div>
        </div>
        
        {/* Analytics */}
        <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
          <div>
            <p className="font-semibold">Cookie-uri de analiză</p>
            <p className="text-sm text-gray-400">Ne ajută să înțelegem cum folosești site-ul (Google Analytics)</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={analytics}
              onChange={(e) => setAnalytics(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-600 peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
        
        {/* Marketing */}
        <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
          <div>
            <p className="font-semibold">Cookie-uri de marketing</p>
            <p className="text-sm text-gray-400">Pentru reclame personalizate pe alte site-uri</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={marketing}
              onChange={(e) => setMarketing(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-600 peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>
      
      <div className="flex gap-2 justify-end">
        <button
          onClick={() => onSave(analytics, marketing)}
          className="px-4 py-2 text-sm text-white bg-gray-700 hover:bg-gray-600 rounded-lg transition"
        >
          Salvează preferințele
        </button>
        <button
          onClick={onAcceptAll}
          className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition"
        >
          Accept toate
        </button>
      </div>
    </div>
  );
}
