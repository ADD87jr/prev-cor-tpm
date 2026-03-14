"use client";

import { useEffect, useState, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import AdminNav from "../components/AdminNav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isAuthed, setIsAuthed] = useState<boolean | null>(null);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Pagina principală /admin are propriul login form
  const isMainAdminPage = pathname === '/admin';

  // Funcție stabilă pentru redirect
  const redirectTo = useCallback((path: string) => {
    router.replace(path);
  }, [router]);

  // Marcare ca mounted după hidratare
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    // Verifică sesiunea la fiecare schimbare de pagină (inclusiv pe pagina de login)
    const checkAuth = async () => {
      try {
        const res = await fetch("/admin/api/auth", {
          method: "GET",
          credentials: "include",
        });

        if (res.ok) {
          const data = await res.json();
          const authenticated = data.authenticated === true;
          setIsAuthed(authenticated);
          
          // Dacă suntem pe pagina de login și suntem autentificați, redirecționează la dashboard
          if (isMainAdminPage && authenticated) {
            redirectTo('/admin/dashboard');
          }
        } else {
          setIsAuthed(false);
        }
      } catch (err) {
        console.error("[ADMIN AUTH CHECK] Error:", err);
        setIsAuthed(false);
      }
    };

    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, isMainAdminPage, pathname]);

  // Redirect dacă nu e autentificat
  useEffect(() => {
    if (mounted && isAuthed === false && !isMainAdminPage) {
      redirectTo('/admin');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, isAuthed, isMainAdminPage]);

  // Conținut de loading consistent
  const LoadingContent = () => (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-gray-500">Loading...</div>
    </div>
  );

  // Determinăm ce conținut să afișăm
  const renderContent = () => {
    // Înainte de mount, afișăm loading
    if (!mounted) {
      return <LoadingContent />;
    }

    // Pentru pagina de login
    if (isMainAdminPage) {
      if (isAuthed === null) {
        return <LoadingContent />;
      }
      return children;
    }

    // Loading state pentru pagini protejate
    if (isAuthed === null) {
      return <LoadingContent />;
    }

    // Nu e autentificat
    if (!isAuthed) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-gray-500">Redirecționare către login...</div>
        </div>
      );
    }

    // E autentificat - afișăm conținutul cu nav
    return (
      <>
        <AdminNav />
        <div className="max-w-7xl mx-auto px-4 py-8">
          {children}
        </div>
      </>
    );
  };

  // Wrapper consistent pentru toate stările - evită diferențe de hidratare
  return (
    <section className="min-h-screen bg-gray-100" suppressHydrationWarning>
      {renderContent()}
    </section>
  );
}

