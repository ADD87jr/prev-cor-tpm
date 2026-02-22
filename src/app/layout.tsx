import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";


import Navbar from "./_components/Navbar";
import Footer from "./_components/Footer";
import CookieConsent from "./_components/CookieConsent";
import GoogleAnalytics from "./_components/GoogleAnalytics";
import CompareBar from "./_components/CompareBar";
import { CartProvider } from "./_components/CartContext";
import { NextAuthProvider } from "./_components/NextAuthProvider";
import { WishlistProvider } from "./_components/WishlistContext";
import { CompareProvider } from "./_components/CompareContext";
import { RecentlyViewedProvider } from "./_components/RecentlyViewedContext";
import { LanguageProvider } from "./_components/LanguageContext";
import LiveChatWidget from "./_components/LiveChatWidget";
import MaintenanceWrapper from "./_components/MaintenanceWrapper";
import SentryProvider from "./_components/SentryProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://prevcortpm.ro"),
  title: "PREV-COR TPM | Soluții Inteligente de Automatizare Industrială & Magazin Online",
  description: "PREV-COR TPM oferă soluții complete de automatizare industrială: consultanță, proiectare, instalare și mentenanță. Magazin online cu livrare rapidă în toată România.",
  keywords: ["automatizare industrială", "soluții inteligente", "echipamente electrice", "protecții electrice", "PREV-COR TPM"],
  authors: [{ name: "PREV-COR TPM" }],
  creator: "PREV-COR TPM",
  publisher: "PREV-COR TPM",
  robots: "index, follow",
  manifest: "/manifest.json",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
  openGraph: {
    type: "website",
    locale: "ro_RO",
    url: "https://prevcortpm.ro",
    siteName: "PREV-COR TPM",
    title: "PREV-COR TPM | Soluții Inteligente de Automatizare Industrială & Magazin Online",
    description: "PREV-COR TPM oferă soluții complete de automatizare industrială: consultanță, proiectare, instalare și mentenanță. Magazin online cu livrare rapidă în toată România.",
    images: [{ url: "/logo.png", width: 200, height: 200, alt: "PREV-COR TPM Logo" }],
  },
  twitter: {
    card: "summary_large_image",
    site: "@prevcortpm",
    creator: "@prevcortpm",
    title: "PREV-COR TPM | Soluții Inteligente de Automatizare Industrială",
    description: "PREV-COR TPM oferă soluții complete de automatizare industrială: consultanță, proiectare, instalare și mentenanță. Magazin online cu livrare rapidă.",
    images: ["/logo.png"],
  },
  alternates: {
    canonical: "https://prevcortpm.ro",
    languages: {
      "ro-RO": "https://prevcortpm.ro",
      "en-US": "https://prevcortpm.ro/en",
    },
  },
  verification: {
    google: "your-google-verification-code", // Înlocuiește cu codul real
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ro">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <GoogleAnalytics />
        <NextAuthProvider>
          <LanguageProvider>
            <WishlistProvider>
              <CartProvider>
                <CompareProvider>
                  <RecentlyViewedProvider>
                    <SentryProvider>
                    <MaintenanceWrapper>
                      <Navbar />
                      {children}
                      <Footer />
                      <CompareBar />
                      <CookieConsent />
                      <LiveChatWidget />
                    </MaintenanceWrapper>
                    </SentryProvider>
                  </RecentlyViewedProvider>
                </CompareProvider>
              </CartProvider>
            </WishlistProvider>
          </LanguageProvider>
        </NextAuthProvider>
      </body>
    </html>
  );
}
