"use client";

import Script from "next/script";
import { useEffect } from "react";

// ID-ul Google Analytics - poate fi configurat din variabile de mediu sau admin
const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || process.env.NEXT_PUBLIC_GA_ID || "";

export default function GoogleAnalytics() {
  useEffect(() => {
    // Verifică consimțământul la încărcare
    const consent = localStorage.getItem("cookieConsent");
    if (consent) {
      try {
        const parsed = JSON.parse(consent);
        if (parsed.analytics && typeof window !== "undefined" && (window as any).gtag) {
          (window as any).gtag("consent", "update", {
            analytics_storage: "granted",
          });
        }
      } catch (e) {}
    }
  }, []);

  // Nu încărca dacă nu e setat ID-ul
  if (!GA_MEASUREMENT_ID || GA_MEASUREMENT_ID === "G-XXXXXXXXXX") {
    return null;
  }

  return (
    <>
      {/* Google tag (gtag.js) */}
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
      />
      <Script
        id="google-analytics"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            
            // Default consent - negat până când utilizatorul acceptă
            gtag('consent', 'default', {
              'analytics_storage': 'denied',
              'ad_storage': 'denied',
              'wait_for_update': 500
            });
            
            gtag('config', '${GA_MEASUREMENT_ID}', {
              page_path: window.location.pathname,
              anonymize_ip: true
            });
          `,
        }}
      />
    </>
  );
}

// Hook pentru tracking custom events
export function useAnalytics() {
  const trackEvent = (action: string, category: string, label?: string, value?: number) => {
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("event", action, {
        event_category: category,
        event_label: label,
        value: value,
      });
    }
  };

  const trackPageView = (url: string) => {
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("config", GA_MEASUREMENT_ID, {
        page_path: url,
      });
    }
  };

  const trackPurchase = (orderId: string, value: number, items: any[]) => {
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("event", "purchase", {
        transaction_id: orderId,
        value: value,
        currency: "RON",
        items: items.map((item, index) => ({
          item_id: item.id,
          item_name: item.name,
          price: item.price,
          quantity: item.quantity || 1,
          index: index,
        })),
      });
    }
  };

  const trackAddToCart = (productId: number, productName: string, price: number) => {
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("event", "add_to_cart", {
        currency: "RON",
        value: price,
        items: [{
          item_id: productId,
          item_name: productName,
          price: price,
          quantity: 1,
        }],
      });
    }
  };

  const trackViewItem = (productId: number, productName: string, price: number, category?: string) => {
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("event", "view_item", {
        currency: "RON",
        value: price,
        items: [{
          item_id: productId,
          item_name: productName,
          price: price,
          item_category: category,
        }],
      });
    }
  };

  const trackBeginCheckout = (value: number, items: any[]) => {
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("event", "begin_checkout", {
        currency: "RON",
        value: value,
        items: items.map((item, index) => ({
          item_id: item.id,
          item_name: item.name,
          price: item.price,
          quantity: item.quantity || 1,
          index: index,
        })),
      });
    }
  };

  const trackViewItemList = (listName: string, items: any[]) => {
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("event", "view_item_list", {
        item_list_name: listName,
        items: items.slice(0, 20).map((item, index) => ({
          item_id: item.id,
          item_name: item.name,
          price: item.price,
          index: index,
        })),
      });
    }
  };

  return { trackEvent, trackPageView, trackPurchase, trackAddToCart, trackViewItem, trackBeginCheckout, trackViewItemList };
}
