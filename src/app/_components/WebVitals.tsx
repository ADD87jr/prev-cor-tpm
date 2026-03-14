"use client";

import { useEffect } from "react";

// Raportează Web Vitals la Google Analytics (dacă este configurat)
function sendToAnalytics(metric: { name: string; value: number; id: string }) {
  // Trimite metrici la GA4 dacă gtag există
  if (typeof window !== "undefined" && (window as any).gtag) {
    (window as any).gtag("event", metric.name, {
      event_category: "Web Vitals",
      event_label: metric.id,
      value: Math.round(metric.name === "CLS" ? metric.value * 1000 : metric.value),
      non_interaction: true,
    });
  }
}

export default function WebVitals() {
  useEffect(() => {
    // Importăm dinamic web-vitals
    import("web-vitals").then(({ onCLS, onLCP, onFCP, onTTFB, onINP }) => {
      onCLS(sendToAnalytics);
      onLCP(sendToAnalytics);
      onFCP(sendToAnalytics);
      onTTFB(sendToAnalytics);
      onINP(sendToAnalytics);
    }).catch(() => {
      // web-vitals nu e instalat — skip fără eroare
    });
  }, []);

  return null;
}
