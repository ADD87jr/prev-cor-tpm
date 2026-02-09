"use client";
import { SessionProvider } from "next-auth/react";
import { useEffect, useState } from "react";

export function NextAuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  
  useEffect(() => {
    // Verifică dacă sesiunea a fost deja curățată recent
    const lastCleared = localStorage.getItem("session_cleared");
    const now = Date.now();
    
    // Nu curăța din nou dacă a fost curățat în ultimele 5 secunde
    if (lastCleared && (now - parseInt(lastCleared)) < 5000) {
      setReady(true);
      return;
    }
    
    const checkSession = async () => {
      try {
        const res = await fetch("/api/auth/session");
        const text = await res.text();
        
        // Verifică dacă răspunsul e valid JSON și nu conține erori
        if (text.includes("error") || text.includes("JWE") || !res.ok) {
          // Sesiune invalidă - clear cookies
          localStorage.setItem("session_cleared", now.toString());
          await fetch("/api/clear-session");
          window.location.reload();
          return;
        }
        setReady(true);
      } catch {
        // Eroare de sesiune - doar continuă
        setReady(true);
      }
    };
    
    checkSession();
  }, []);
  
  if (!ready) {
    return <div className="min-h-screen flex items-center justify-center">Se încarcă...</div>;
  }
  
  return <SessionProvider>{children}</SessionProvider>;
}
