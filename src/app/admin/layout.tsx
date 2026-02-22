"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import AdminNav from "../components/AdminNav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isAuthed, setIsAuthed] = useState<boolean | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  // Pagina principală /admin are propriul login form
  const isMainAdminPage = pathname === '/admin';

  useEffect(() => {
    // Pentru pagina de login, nu verificăm autentificarea
    if (isMainAdminPage) {
      setIsAuthed(false);
      return;
    }

    // Verifică sesiunea la fiecare schimbare de pagină
    const checkAuth = async () => {
      try {
        const res = await fetch("/admin/api/auth", {
          method: "GET",
          credentials: "include",
        });

        if (res.ok) {
          const data = await res.json();
          setIsAuthed(data.authenticated === true);
        } else {
          setIsAuthed(false);
        }
      } catch (err) {
        console.error("[ADMIN AUTH CHECK] Error:", err);
        setIsAuthed(false);
      }
    };

    checkAuth();
  }, [isMainAdminPage, pathname]);

  // Redirect dacă nu e autentificat
  useEffect(() => {
    if (isAuthed === false && !isMainAdminPage) {
      router.replace('/admin');
    }
  }, [isAuthed, isMainAdminPage, router]);

  // Pentru pagina de login, afișăm direct conținutul
  if (isMainAdminPage) {
    return (
      <section className="min-h-screen bg-gray-100">
        {children}
      </section>
    );
  }

  // Loading state
  if (isAuthed === null) {
    return (
      <section className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-500">Se încarcă...</div>
      </section>
    );
  }

  // Nu e autentificat
  if (!isAuthed) {
    return (
      <section className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-500">Redirecționare către login...</div>
      </section>
    );
  }

  // E autentificat
  return (
    <section className="min-h-screen bg-gray-100">
      <AdminNav />
      <div className="max-w-7xl mx-auto px-4 py-8">
        {children}
      </div>
    </section>
  );
}

