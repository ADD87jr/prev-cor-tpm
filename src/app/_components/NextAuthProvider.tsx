"use client";
import { SessionProvider } from "next-auth/react";

export function NextAuthProvider({ children }: { children: React.ReactNode }) {
  // Simplu - nu mai verificăm sesiunea la încărcare
  // NextAuth gestionează automat sesiunile invalide
  return <SessionProvider>{children}</SessionProvider>;
}
