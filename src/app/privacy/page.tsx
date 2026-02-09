"use client";
import { useLanguage } from "../_components/LanguageContext";

export default function PrivacyPage() {
  const { language } = useLanguage();
  
  const txt = language === "en" ? {
    title: "Privacy Policy",
    intro: "PREV-COR TPM respects the confidentiality of your data. This policy explains how we collect, use and protect personal information:",
    items: [
      "Collected data (name, email, phone, address) is used exclusively for order processing and customer communication.",
      "We do not share personal data with third parties, except for partners involved in order delivery (couriers, payment processors).",
      "We store data securely, using appropriate technical and organizational measures.",
      "Users have the right to access, rectify and delete personal data, in accordance with applicable legislation.",
      "The site may use cookies for functionality and anonymous traffic analysis.",
      "For any personal data requests, you can contact us at the email address in the Contact section."
    ],
    lastUpdate: "Last updated: October 2025"
  } : {
    title: "Politica de confidențialitate",
    intro: "PREV-COR TPM respectă confidențialitatea datelor dumneavoastră. Această politică explică modul în care colectăm, utilizăm și protejăm informațiile personale:",
    items: [
      "Datele colectate (nume, email, telefon, adresă) sunt folosite exclusiv pentru procesarea comenzilor și comunicarea cu clienții.",
      "Nu transmitem datele personale către terți, cu excepția partenerilor implicați în livrarea comenzilor (curierat, procesatori de plăți).",
      "Stocăm datele în condiții de siguranță, folosind măsuri tehnice și organizatorice adecvate.",
      "Utilizatorii au dreptul de acces, rectificare și ștergere a datelor personale, conform legislației în vigoare.",
      "Site-ul poate folosi cookie-uri pentru funcționalitate și analiză anonimă a traficului.",
      "Pentru orice solicitare privind datele personale, ne puteți contacta la adresa de email din secțiunea Contact."
    ],
    lastUpdate: "Ultima actualizare: Octombrie 2025"
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
