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
import WebVitals from "./_components/WebVitals";
import BackToTop from "./_components/BackToTop";
import AIChatbot from "./_components/AIChatbot";

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
    google: process.env.GOOGLE_VERIFICATION_CODE || "",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ro">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "S.C. PREV-COR TPM S.R.L.",
              url: "https://prevcortpm.ro",
              logo: "https://prevcortpm.ro/logo.png",
              description: "Soluții complete de automatizare industrială: consultanță, proiectare, instalare și mentenanță. Magazin online cu livrare rapidă în toată România.",
              telephone: "+40732935623",
              email: "office@prevcortpm.ro",
              address: {
                "@type": "PostalAddress",
                streetAddress: "Str. Principala, Nr. 70",
                addressLocality: "Stroesti",
                addressRegion: "Mehedinti",
                postalCode: "227208",
                addressCountry: "RO",
              },
              sameAs: [],
              contactPoint: {
                "@type": "ContactPoint",
                telephone: "+40732935623",
                contactType: "customer service",
                availableLanguage: ["Romanian", "English"],
              },
            }),
          }}
        />
        {process.env.NEXT_PUBLIC_CLARITY_ID && (
          <script
            id="microsoft-clarity"
            dangerouslySetInnerHTML={{
              __html: `(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y)})(window,document,"clarity","script","${process.env.NEXT_PUBLIC_CLARITY_ID}");`,
            }}
          />
        )}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <GoogleAnalytics />
        <WebVitals />
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
                      <AIChatbot />
                      <BackToTop />
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
