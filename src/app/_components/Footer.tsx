"use client";
import Image from "next/image";
import NewsletterForm from "./NewsletterForm";
import { useLanguage } from "./LanguageContext";

export default function Footer() {
  const { language } = useLanguage();
  
  const txt = {
    newsletter: language === "en" ? "Subscribe to newsletter" : "Abonează-te la newsletter",
    newsletterDesc: language === "en" ? "Get exclusive offers and news straight to your email" : "Primește oferte exclusive și noutăți direct pe email",
    slogan: language === "en" ? "Intelligent Industrial Automation Solutions" : "Solutii Inteligente de Automatizare Industriala",
    rights: language === "en" ? "All rights reserved." : "Toate drepturile rezervate.",
    terms: language === "en" ? "Terms and conditions" : "Termeni și condiții",
    privacy: language === "en" ? "Privacy policy" : "Politica de confidențialitate",
    contact: language === "en" ? "Contact" : "Contact",
    trackOrder: language === "en" ? "Track order" : "Urmărește comanda",
    blog: language === "en" ? "Blog" : "Blog",
  };

  return (
    <footer className="w-full bg-gray-900 text-gray-200 py-8 mt-12 border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-4">
        {/* Newsletter Section */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-6 pb-6 border-b border-gray-700">
          <div className="text-center md:text-left">
            <h3 className="text-lg font-semibold text-white">{txt.newsletter}</h3>
            <p className="text-sm text-gray-400">{txt.newsletterDesc}</p>
          </div>
          <NewsletterForm />
        </div>

        {/* Main Footer */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="Sigla PREV-COR TPM" width={52} height={52} />
            <div className="flex flex-col">
              <span className="font-bold text-lg text-blue-400">PREV-COR TPM</span>
              <span className="text-xs text-gray-300 -mt-1">{txt.slogan}</span>
            </div>
          </div>
          <div className="text-sm">&copy; {new Date().getFullYear()} PREV-COR TPM. {txt.rights}</div>
          <div className="flex gap-4 text-xs">
            <a href="/terms" className="hover:underline">{txt.terms}</a>
            <a href="/privacy" className="hover:underline">{txt.privacy}</a>
            <a href="/blog" className="hover:underline">{txt.blog}</a>
            <a href="/track-order" className="hover:underline">{txt.trackOrder}</a>
            <a href="/contact" className="hover:underline">{txt.contact}</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
