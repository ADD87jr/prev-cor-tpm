"use client";
import { useLanguage } from "../_components/LanguageContext";

export default function TermsPage() {
  const { language } = useLanguage();
  
  const txt = language === "en" ? {
    title: "Terms and Conditions",
    intro: "This website is operated by PREV-COR TPM, a provider of intelligent industrial automation solutions. By accessing and using this site, you agree to the following terms and conditions:",
    items: [
      "All products and services presented are intended for industrial and professional use only.",
      "Technical information, images and product descriptions are for informational purposes and may be subject to change without prior notice.",
      "Orders are processed based on stock availability and may require additional confirmation from the PREV-COR TPM team.",
      "Prices displayed do not include VAT. VAT is calculated and displayed separately at checkout.",
      "Delivery is made according to the shipping policy displayed on the site.",
      "Users are responsible for the accuracy of data entered when placing orders.",
      "Copying, distributing or using site content without written consent from PREV-COR TPM is prohibited.",
      "For any questions or requests, you can contact us using the details in the Contact section."
    ],
    lastUpdate: "Last updated: February 2026"
  } : {
    title: "Termeni și condiții",
    intro: "Acest site este operat de PREV-COR TPM, furnizor de soluții inteligente de automatizare industrială. Prin accesarea și utilizarea acestui site, sunteți de acord cu următorii termeni și condiții:",
    items: [
      "Toate produsele și serviciile prezentate sunt destinate exclusiv utilizării industriale și profesionale.",
      "Informațiile tehnice, imaginile și descrierile produselor sunt cu titlu informativ și pot suferi modificări fără notificare prealabilă.",
      "Comenzile se procesează în funcție de disponibilitatea stocului și pot necesita confirmare suplimentară din partea echipei PREV-COR TPM.",
      "Prețurile afișate nu includ TVA. TVA-ul se calculează și afișează separat la finalizarea comenzii.",
      "Livrarea se face conform politicii de transport afișate pe site.",
      "Utilizatorii sunt responsabili de corectitudinea datelor introduse la plasarea comenzilor.",
      "Este interzisă copierea, distribuirea sau utilizarea conținutului site-ului fără acordul scris al PREV-COR TPM.",
      "Pentru orice nelămuriri sau solicitări, ne puteți contacta la datele din secțiunea Contact."
    ],
    lastUpdate: "Ultima actualizare: Februarie 2026"
  };

  return (
    <main className="max-w-3xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-6">{txt.title}</h1>
      <p className="mb-4">{txt.intro}</p>
      <ul className="list-disc ml-6 mb-4 space-y-2">
        {txt.items.map((item, idx) => (
          <li key={idx}>{item}</li>
        ))}
      </ul>
      <p className="text-sm text-gray-500">{txt.lastUpdate}</p>
    </main>
  );
}
