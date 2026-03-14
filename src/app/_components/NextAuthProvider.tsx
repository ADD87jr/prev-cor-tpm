"use client";
import { SessionProvider } from "next-auth/react";
import { useEffect } from "react";

export function NextAuthProvider({ children }: { children: React.ReactNode }) {
  // Suprimă eroarea CLIENT_FETCH_ERROR din consolă în development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const originalError = console.error;
      console.error = (...args) => {
        // Suprimă erorile next-auth CLIENT_FETCH_ERROR
        if (args[0]?.includes?.('[next-auth]') || 
            args[0]?.includes?.('CLIENT_FETCH_ERROR') ||
            (typeof args[0] === 'string' && args[0].includes('Failed to fetch'))) {
          return;
        }
        originalError.apply(console, args);
      };
      return () => {
        console.error = originalError;
      };
    }
  }, []);

  return (
    <SessionProvider 
      refetchOnWindowFocus={false}
      refetchWhenOffline={false}
      refetchInterval={0}
    >
      {children}
    </SessionProvider>
  );
}
