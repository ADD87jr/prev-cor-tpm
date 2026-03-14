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
    cookies: language === "en" ? "Cookie policy" : "Politica de cookies",
    returnPolicy: language === "en" ? "Return policy" : "Politica de retur",
    faq: "FAQ",
    contact: language === "en" ? "Contact" : "Contact",
    trackOrder: language === "en" ? "Track order" : "Urmărește comanda",
    blog: language === "en" ? "Blog" : "Blog",
    companyData: language === "en" ? "Company data" : "Date firmă",
    anpcInfo: language === "en" ? "Consumer protection" : "Protecția consumatorilor",
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
              <div className="flex items-center gap-3 mt-1">
                <a href="https://www.prevcortpm.ro" className="text-xs text-blue-400 hover:underline">www.prevcortpm.ro</a>
                <a href="https://www.facebook.com/profile.php?id=61587323746589" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300" title="Facebook">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                </a>
              </div>
            </div>
          </div>
          <div className="text-sm text-center">
            <div>&copy; {new Date().getFullYear()} PREV-COR TPM</div>
            <div className="text-xs text-gray-400">{txt.rights}</div>
          </div>
          <div className="flex gap-4 text-xs flex-wrap justify-center">
            <a href="/terms" className="hover:underline">{txt.terms}</a>
            <a href="/privacy" className="hover:underline">{txt.privacy}</a>
            <a href="/cookie-policy" className="hover:underline">{txt.cookies}</a>
            <a href="/politica-retur" className="hover:underline">{txt.returnPolicy}</a>
            <a href="/faq" className="hover:underline">{txt.faq}</a>
            <a href="/blog" className="hover:underline">{txt.blog}</a>
            <a href="/track-order" className="hover:underline">{txt.trackOrder}</a>
            <a href="/contact" className="hover:underline">{txt.contact}</a>
          </div>
        </div>

        {/* Date companie + ANPC */}
        <div className="mt-6 pt-6 border-t border-gray-700 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-gray-400">
          <div className="text-center md:text-left">
            <div className="font-semibold text-gray-300">{txt.companyData}:</div>
            <div>S.C. PREV-COR TPM S.R.L. | CUI: RO43434739 | J25/582/2020</div>
            <div>Str. Principala nr. 70, Stroesti, Mehedinti, 227208, Romania</div>
            <div>Tel: 0732 935 623 | Email: office@prevcortpm.ro</div>
          </div>
          <div className="text-center md:text-right flex flex-col gap-1">
            <div className="font-semibold text-gray-300">{txt.anpcInfo}:</div>
            <a href="https://anpc.ro/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">ANPC - anpc.ro</a>
            <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">SOL - Soluționarea Online a Litigiilor</a>
            <a href="https://anpc.ro/ce-este-sal/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">SAL - Soluționarea Alternativă a Litigiilor</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
