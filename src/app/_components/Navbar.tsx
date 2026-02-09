"use client";

import Link from "next/link";
import Image from "next/image";
import { FaSignInAlt, FaUserPlus } from "react-icons/fa";
import { MdShoppingCart, MdFavorite } from "react-icons/md";
import { useCart } from "./CartContext";
import { useWishlist } from "./WishlistContext";
import SearchAutocomplete from "./SearchAutocomplete";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import LanguageSwitcher from "./LanguageSwitcher";
import { useLanguage } from "./LanguageContext";

export default function Navbar() {
  const pathname = usePathname();
  const { items } = useCart();
  const cartCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const { items: wishlistItems } = useWishlist();
  const wishlistCount = wishlistItems.length;
  const { data: session, status } = useSession();
  const { t, language } = useLanguage();
  
  // Verifică dacă admin-ul este autentificat
  const [isAdminAuthed, setIsAdminAuthed] = useState(false);
  useEffect(() => {
    const checkAdminAuth = () => {
      const authedFlag = localStorage.getItem('adminAuthed');
      setIsAdminAuthed(authedFlag === 'true');
    };
    checkAdminAuth();
    // Re-verifică la focus pe fereastră (pentru cazul când te loghezi într-un alt tab)
    window.addEventListener('focus', checkAdminAuth);
    return () => window.removeEventListener('focus', checkAdminAuth);
  }, []);

  const navLinks = [
    { href: "/", label: t("nav.home") },
    { href: "/about", label: t("nav.about") },
    { href: "/services", label: t("nav.services") },
    { href: "/shop", label: t("nav.shop") },
    { href: "/categorii", label: language === "en" ? "Categories" : "Categorii" },
    { href: "/blog", label: "Blog" },
    { href: "/contact", label: t("nav.contact") },
  ];
  return (
    <nav className="w-full bg-white shadow mb-8 min-w-full">
      <div className="max-w-[1800px] mx-auto flex items-center justify-between py-4 pl-0 pr-2 xl:pl-0 xl:pr-4 2xl:pl-0 2xl:pr-8">
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="Sigla PREV-COR TPM" width={88} height={88} />
          <div className="flex flex-col">
            <span className="font-bold text-xl text-blue-700">PREV-COR TPM</span>
            <span className="text-xs text-gray-500">{language === "en" ? "Intelligent Industrial Automation Solutions" : "Solutii Inteligente de Automatizare Industriala"}</span>
            {/* Search Bar - under subtitle */}
            <div className="hidden lg:block max-w-xs mt-1">
              <SearchAutocomplete />
            </div>
          </div>
        </div>
        
        <ul className="flex flex-nowrap gap-8 text-gray-700 font-medium items-center whitespace-nowrap overflow-x-auto">
          <div className="flex flex-nowrap gap-4 items-center">
            {navLinks.map(link => (
              <li key={link.href}>
                <Link href={link.href}>
                  <span className={
                    `relative pb-1 transition-colors duration-200 ${
                      pathname === link.href
                        ? "text-blue-700 font-bold border-b-2 border-blue-700"
                        : "hover:text-blue-700"
                    }`
                  }>
                    {link.label}
                    {pathname === link.href && (
                      <span className="absolute left-0 right-0 -bottom-1 h-0.5 bg-blue-700 rounded-full"></span>
                    )}
                  </span>
                </Link>
              </li>
            ))}
            {/* Admin link - vizibil doar pentru utilizatori cu isAdmin sau admin known */}
            {((session?.user as any)?.isAdmin || session?.user?.email === 'office.prevcortpm@gmail.com') && (
              <li>
                <Link href="/admin">
                  <span className="bg-blue-700 text-white px-3 py-1 rounded shadow hover:bg-blue-800">
                    Admin
                  </span>
                </Link>
              </li>
            )}
          </div>
          {/* Grupare butoane favorite + cos */}
          <div className="flex flex-nowrap gap-4 items-center ml-8">
            {/* Ascunde Favorite până statusul sesiunii nu mai e 'loading' */}
            {status !== "loading" && (
              <li>
                <Link href={session ? "/account" : "/wishlist"} className="relative flex items-center gap-1 text-pink-600 hover:underline font-semibold text-base" aria-label="Favoritele mele">
                  <span className="relative">
                    <MdFavorite className="w-5 h-5" />
                    {wishlistCount > 0 && (
                      <span className="absolute -top-2 -right-2 bg-pink-600 text-white text-xs rounded-full px-1 py-0.5 min-w-[16px] text-center font-bold shadow-lg border border-white">
                        {wishlistCount}
                      </span>
                    )}
                  </span>
                  <span className="hidden sm:inline">{t("nav.wishlist")}</span>
                </Link>
              </li>
            )}
            <li>
              <Link href="/cart" className="relative flex items-center gap-1 text-blue-700 hover:underline font-semibold text-base" aria-label="Vezi coșul de cumpărături">
                <span className="relative">
                  <MdShoppingCart className="w-5 h-5" />
                  {cartCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs rounded-full px-1 py-0.5 min-w-[16px] text-center font-bold shadow-lg border border-white">
                      {cartCount}
                    </span>
                  )}
                </span>
                <span className="hidden sm:inline">{t("nav.cart")}</span>
              </Link>
            </li>
            {/* Language Switcher */}
            <li>
              <LanguageSwitcher />
            </li>
            {/* Eliminat butonul 'Finalizare comandă' din navbar, va fi vizibil doar pe pagina coșului */}
            {session ? (
              <li className="flex flex-col items-start justify-center px-2 py-1" style={{minWidth:'220px'}}>
                <div className="flex items-center gap-3 mb-1">
                  <svg width="32" height="32" fill="none" stroke="#2563eb" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6"/></svg>
                  <span className="text-blue-700 font-semibold text-lg">{language === "en" ? "Welcome" : "Bun venit"}, {session.user?.name?.toUpperCase() || session.user?.email?.toUpperCase()}!</span>
                </div>
                <div className="flex gap-2 text-blue-700 text-base">
                  <Link href="/account" className="underline">{language === "en" ? "My account" : "Vezi cont"}</Link>
                  <span>/</span>
                  <button onClick={() => signOut({ callbackUrl: "/" })} className="underline">{t("nav.logout")}</button>
                </div>
              </li>
            ) : (
              <>
                <li>
                  <Link href="/login" className="flex items-center gap-1.5 px-3 py-1 rounded-[8px] font-bold border border-[#b3d4fc] bg-[#eaf3ff] text-[#0066d6] hover:bg-[#d4e7fd] transition text-sm leading-tight" style={{boxShadow:'none',marginRight:'7px',minWidth:'90px',justifyContent:'center'}}>
                    <FaSignInAlt className="w-4 h-4" style={{color:'#0066d6'}} />
                    <span style={{color:'#0066d6'}}>{t("nav.login")}</span>
                  </Link>
                </li>
                <li>
                  <Link href="/register" className="flex items-center gap-1.5 px-3 py-1 rounded-[8px] font-bold border border-[#b3e6b3] bg-[#eafeea] text-[#008c2a] hover:bg-[#d4f7d4] transition text-sm leading-tight" style={{boxShadow:'none',minWidth:'90px',justifyContent:'center'}}>
                    <FaUserPlus className="w-4 h-4" style={{color:'#008c2a'}} />
                    <span style={{color:'#008c2a'}}>{t("nav.register")}</span>
                  </Link>
                </li>
              </>
            )}
          </div>
        </ul>
      </div>
    </nav>
  );
}
