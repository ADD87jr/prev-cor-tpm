"use client";

import { useState, useEffect } from "react";
import Toast from "@/components/Toast";

type Tab = "acasa" | "despre" | "servicii" | "magazin" | "contact" | "cos" | "companie";

const TABS: { id: Tab; label: string }[] = [
  { id: "acasa", label: "ACASĂ" },
  { id: "despre", label: "DESPRE NOI" },
  { id: "servicii", label: "SERVICII" },
  { id: "magazin", label: "MAGAZIN ONLINE" },
  { id: "contact", label: "CONTACT" },
  { id: "cos", label: "COȘ" },
  { id: "companie", label: "COMPANIE" },
];

export default function EditarePaginiPage() {
  const [activeTab, setActiveTab] = useState<Tab>("acasa");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  
  // Date pentru fiecare pagină
  const [acasa, setAcasa] = useState({
    titlu: "",
    subtitlu: "",
    descriere: "",
    textB2B: "Oferim și servicii B2B pentru companii. Contactează-ne pentru o ofertă personalizată!",
    // Avantaje (3 carduri)
    avantaj1Emoji: "🚀",
    avantaj1Titlu: "Rapiditate",
    avantaj1Text: "Implementare și livrare rapidă a soluțiilor.",
    avantaj2Emoji: "🔒",
    avantaj2Titlu: "Siguranță",
    avantaj2Text: "Protejăm datele și confidențialitatea clienților.",
    avantaj3Emoji: "🤝",
    avantaj3Titlu: "Parteneriat",
    avantaj3Text: "Suntem alături de tine pe tot parcursul colaborării.",
    // Servicii
    serviciiTitlu: "Colaborează cu profesioniștii industriei",
    serviciiText: "La PREV-COR TPM, credem în parteneriate solide și soluții adaptate fiecărui client.",
    // Valori
    valoriTitlu: "Valorile noastre",
    valoriText: "Ne ghidăm activitatea după principii solide: integritate, responsabilitate și orientare către client.",
    // Angajament
    angajamentTitlu: "Angajamentul nostru",
    angajamentText: "Punem accent pe colaborare, transparență și rezultate măsurabile.",
    // Testimoniale
    testimonialeTitlu: "Ce spun clienții noștri",
    testimonial1Text: "Servicii excelente și produse de calitate!",
    testimonial1Autor: "Andrei P.",
    testimonial2Text: "Recomand cu încredere această companie!",
    testimonial2Autor: "Maria L.",
    // Call to action
    ctaTitlu: "Contactează-ne pentru o ofertă personalizată!",
    ctaButon: "Trimite mesaj"
  });
  const [despre, setDespre] = useState({
    titlu: "PREV-COR TPM",
    subtitlu: "Excelență, inovație și parteneriate durabile în industrie",
    // Cine suntem
    cineSuntemP1: "Suntem o echipă de profesioniști dedicați excelenței în industrie și comerț. Cu o experiență vastă în domeniu, oferim soluții complete și personalizate pentru partenerii noștri.",
    cineSuntemP2: "Abordarea noastră combină expertiza tehnică cu o înțelegere profundă a nevoilor clienților, asigurând rezultate care depășesc așteptările.",
    // Misiune, Viziune, Valori (3 carduri)
    misiuneEmoji: "🎯",
    misiuneTitlu: "Misiune",
    misiuneText: "Să oferim produse și servicii de cea mai înaltă calitate, construind relații de încredere cu partenerii noștri și contribuind la dezvoltarea industriei.",
    viziuneEmoji: "🌍",
    viziuneTitlu: "Viziune",
    viziuneText: "Să devenim lider de piață în furnizarea de soluții industriale inovatoare, recunoscuți pentru excelență, integritate și impact pozitiv în comunitate.",
    valoriEmoji: "💡",
    valoriTitlu: "Valori",
    valoriText: "Ne ghidăm după principii solide: integritate, profesionalism, orientare către client și îmbunătățire continuă.",
    // Abordare
    abordareEmoji: "🔧",
    abordareTitlu: "Abordare",
    abordareP1: "Punem accent pe înțelegerea nevoilor fiecărui client și pe dezvoltarea de soluții personalizate. Folosim tehnologii moderne și metode verificate pentru a asigura rezultate optime.",
    abordareP2: "Colaborăm strâns cu partenerii noștri pentru a identifica cele mai bune strategii și pentru a implementa proiecte de succes, indiferent de complexitate.",
    // Valorile noastre și Angajament (2 carduri)
    valorileNoastreEmoji: "💡",
    valorileNoastreTitlu: "Valorile noastre",
    valorileNoastreText: "Ne ghidăm activitatea după principii solide: integritate, responsabilitate și orientare către client.",
    angajamentEmoji: "⭐",
    angajamentTitlu: "Angajamentul nostru",
    angajamentText: "Punem accent pe colaborare, transparență și rezultate măsurabile.",
    // Parteneriate și Relații (2 carduri)
    parteneriatEmoji: "🤝",
    parteneriatTitlu: "Parteneriate și rezultate",
    parteneriatText: "Colaborăm cu branduri de top și furnizori de încredere pentru a oferi cele mai bune produse și servicii.",
    relatiiEmoji: "📈",
    relatiiTitlu: "Relații pe termen lung",
    relatiiText: "Construim parteneriate durabile, bazate pe încredere, profesionalism și respect reciproc."
  });
  const [servicii, setServicii] = useState({ titlu: "", descriere: "", lista: [] as any[] });
  const [magazin, setMagazin] = useState({ titlu: "", descriere: "", banner: "" });
  const [contact, setContact] = useState({ titlu: "", telefon: "", email: "", adresa: "", codPostal: "", program: "" });
  const [cos, setCos] = useState({ tva: 19, moneda: "RON", livrareGratuita: 500, textLivrare: "", termenLivrare: "" });
  const [companie, setCompanie] = useState({
    name: "S.C. PREV-COR TPM S.R.L.",
    shortName: "PREV-COR TPM",
    cui: "RO43434739",
    regCom: "J25/582/2020",
    phone: "0732 935 623",
    phoneClean: "40732935623",
    email: "office@prevcortpm.ro",
    whatsapp: "https://wa.me/40732935623",
    address: {
      street: "Principala",
      number: "70",
      city: "Stroesti",
      county: "Mehedinti",
      postalCode: "227208",
      country: "Romania",
    },
    iban: "RO23BRDE360SV67547173600",
    bank: "BANCA ROMANA DE DEZVOLTARE",
    bankEn: "ROMANIAN DEVELOPMENT BANK (BRD)",
  });

  function showToast(message: string, type: "success" | "error" = "success") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  }

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const res = await fetch("/admin/api/pagini");
      const data = await res.json();
      if (data.acasa) setAcasa(data.acasa);
      if (data.despre) setDespre(data.despre);
      if (data.servicii) setServicii(data.servicii);
      if (data.magazin) setMagazin(data.magazin);
      if (data.contact) setContact(data.contact);
      if (data.cos) setCos(data.cos);
      // Fetch company data separately
      try {
        const resCompanie = await fetch("/admin/api/companie");
        const companieData = await resCompanie.json();
        if (companieData && companieData.name) setCompanie(companieData);
      } catch (e) {}
    } catch (err) {
      showToast("Eroare la încărcare date!", "error");
    }
    setLoading(false);
  }

  async function handleSave(pagina: Tab, date: any) {
    setSaving(true);
    try {
      const res = await fetch("/admin/api/pagini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pagina, date }),
      });
      if (res.ok) {
        showToast("Modificări salvate cu succes!", "success");
      } else {
        showToast("Eroare la salvare!", "error");
      }
    } catch (err) {
      showToast("Eroare la salvare!", "error");
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">Se încarcă...</div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      {toast && <Toast message={toast.message} type={toast.type} />}
      
      <h1 className="text-2xl font-bold text-blue-900 mb-6">Editare Pagini Site</h1>
      
      {/* Tab-uri */}
      <div className="flex flex-wrap gap-2 mb-6 border-b pb-4">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-t font-semibold transition ${
              activeTab === tab.id
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Conținut tab-uri */}
      <div className="bg-white rounded-xl shadow p-6">
        
        {/* ACASĂ */}
        {activeTab === "acasa" && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Editare pagina Acasă</h2>
            
            {/* Hero Section */}
            <div className="border-b pb-4">
              <h3 className="text-lg font-semibold text-blue-700 mb-3">🏠 Hero Section</h3>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Titlu principal</label>
                  <input type="text" value={acasa.titlu} onChange={(e) => setAcasa({ ...acasa, titlu: e.target.value })} className="w-full border rounded px-3 py-2" placeholder="Titlu principal" />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Subtitlu</label>
                  <input type="text" value={acasa.subtitlu} onChange={(e) => setAcasa({ ...acasa, subtitlu: e.target.value })} className="w-full border rounded px-3 py-2" placeholder="Subtitlu" />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Text B2B (verde)</label>
                  <input type="text" value={acasa.textB2B || ''} onChange={(e) => setAcasa({ ...acasa, textB2B: e.target.value })} className="w-full border rounded px-3 py-2" placeholder="Text B2B" />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Descriere</label>
                  <textarea value={acasa.descriere} onChange={(e) => setAcasa({ ...acasa, descriere: e.target.value })} className="w-full border rounded px-3 py-2 h-20" placeholder="Descriere" />
                </div>
              </div>
            </div>

            {/* Avantaje */}
            <div className="border-b pb-4">
              <h3 className="text-lg font-semibold text-blue-700 mb-3">⭐ Avantaje (3 carduri)</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 p-3 rounded">
                  <label className="block font-semibold mb-1">Emoji 1</label>
                  <input type="text" value={acasa.avantaj1Emoji || ''} onChange={(e) => setAcasa({ ...acasa, avantaj1Emoji: e.target.value })} className="w-full border rounded px-3 py-2" />
                  <label className="block font-semibold mb-1 mt-2">Titlu 1</label>
                  <input type="text" value={acasa.avantaj1Titlu || ''} onChange={(e) => setAcasa({ ...acasa, avantaj1Titlu: e.target.value })} className="w-full border rounded px-3 py-2" />
                  <label className="block font-semibold mb-1 mt-2">Text 1</label>
                  <textarea value={acasa.avantaj1Text || ''} onChange={(e) => setAcasa({ ...acasa, avantaj1Text: e.target.value })} className="w-full border rounded px-3 py-2 h-16" />
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <label className="block font-semibold mb-1">Emoji 2</label>
                  <input type="text" value={acasa.avantaj2Emoji || ''} onChange={(e) => setAcasa({ ...acasa, avantaj2Emoji: e.target.value })} className="w-full border rounded px-3 py-2" />
                  <label className="block font-semibold mb-1 mt-2">Titlu 2</label>
                  <input type="text" value={acasa.avantaj2Titlu || ''} onChange={(e) => setAcasa({ ...acasa, avantaj2Titlu: e.target.value })} className="w-full border rounded px-3 py-2" />
                  <label className="block font-semibold mb-1 mt-2">Text 2</label>
                  <textarea value={acasa.avantaj2Text || ''} onChange={(e) => setAcasa({ ...acasa, avantaj2Text: e.target.value })} className="w-full border rounded px-3 py-2 h-16" />
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <label className="block font-semibold mb-1">Emoji 3</label>
                  <input type="text" value={acasa.avantaj3Emoji || ''} onChange={(e) => setAcasa({ ...acasa, avantaj3Emoji: e.target.value })} className="w-full border rounded px-3 py-2" />
                  <label className="block font-semibold mb-1 mt-2">Titlu 3</label>
                  <input type="text" value={acasa.avantaj3Titlu || ''} onChange={(e) => setAcasa({ ...acasa, avantaj3Titlu: e.target.value })} className="w-full border rounded px-3 py-2" />
                  <label className="block font-semibold mb-1 mt-2">Text 3</label>
                  <textarea value={acasa.avantaj3Text || ''} onChange={(e) => setAcasa({ ...acasa, avantaj3Text: e.target.value })} className="w-full border rounded px-3 py-2 h-16" />
                </div>
              </div>
            </div>

            {/* Servicii */}
            <div className="border-b pb-4">
              <h3 className="text-lg font-semibold text-blue-700 mb-3">🛠️ Secțiunea Servicii</h3>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Titlu servicii</label>
                  <input type="text" value={acasa.serviciiTitlu || ''} onChange={(e) => setAcasa({ ...acasa, serviciiTitlu: e.target.value })} className="w-full border rounded px-3 py-2" />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Text servicii</label>
                  <textarea value={acasa.serviciiText || ''} onChange={(e) => setAcasa({ ...acasa, serviciiText: e.target.value })} className="w-full border rounded px-3 py-2 h-24" />
                </div>
              </div>
            </div>

            {/* Valori & Angajament */}
            <div className="border-b pb-4">
              <h3 className="text-lg font-semibold text-blue-700 mb-3">💎 Valori și Angajament</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded">
                  <label className="block font-semibold mb-1">Titlu Valori</label>
                  <input type="text" value={acasa.valoriTitlu || ''} onChange={(e) => setAcasa({ ...acasa, valoriTitlu: e.target.value })} className="w-full border rounded px-3 py-2" />
                  <label className="block font-semibold mb-1 mt-2">Text Valori</label>
                  <textarea value={acasa.valoriText || ''} onChange={(e) => setAcasa({ ...acasa, valoriText: e.target.value })} className="w-full border rounded px-3 py-2 h-24" />
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <label className="block font-semibold mb-1">Titlu Angajament</label>
                  <input type="text" value={acasa.angajamentTitlu || ''} onChange={(e) => setAcasa({ ...acasa, angajamentTitlu: e.target.value })} className="w-full border rounded px-3 py-2" />
                  <label className="block font-semibold mb-1 mt-2">Text Angajament</label>
                  <textarea value={acasa.angajamentText || ''} onChange={(e) => setAcasa({ ...acasa, angajamentText: e.target.value })} className="w-full border rounded px-3 py-2 h-24" />
                </div>
              </div>
            </div>

            {/* Testimoniale */}
            <div className="border-b pb-4">
              <h3 className="text-lg font-semibold text-blue-700 mb-3">💬 Testimoniale</h3>
              <div>
                <label className="block font-semibold mb-1">Titlu secțiune</label>
                <input type="text" value={acasa.testimonialeTitlu || ''} onChange={(e) => setAcasa({ ...acasa, testimonialeTitlu: e.target.value })} className="w-full border rounded px-3 py-2 mb-3" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded">
                  <label className="block font-semibold mb-1">Testimonial 1</label>
                  <textarea value={acasa.testimonial1Text || ''} onChange={(e) => setAcasa({ ...acasa, testimonial1Text: e.target.value })} className="w-full border rounded px-3 py-2 h-16" />
                  <label className="block font-semibold mb-1 mt-2">Autor 1</label>
                  <input type="text" value={acasa.testimonial1Autor || ''} onChange={(e) => setAcasa({ ...acasa, testimonial1Autor: e.target.value })} className="w-full border rounded px-3 py-2" />
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <label className="block font-semibold mb-1">Testimonial 2</label>
                  <textarea value={acasa.testimonial2Text || ''} onChange={(e) => setAcasa({ ...acasa, testimonial2Text: e.target.value })} className="w-full border rounded px-3 py-2 h-16" />
                  <label className="block font-semibold mb-1 mt-2">Autor 2</label>
                  <input type="text" value={acasa.testimonial2Autor || ''} onChange={(e) => setAcasa({ ...acasa, testimonial2Autor: e.target.value })} className="w-full border rounded px-3 py-2" />
                </div>
              </div>
            </div>

            {/* Call to Action */}
            <div className="border-b pb-4">
              <h3 className="text-lg font-semibold text-blue-700 mb-3">📞 Call to Action</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold mb-1">Titlu CTA</label>
                  <input type="text" value={acasa.ctaTitlu || ''} onChange={(e) => setAcasa({ ...acasa, ctaTitlu: e.target.value })} className="w-full border rounded px-3 py-2" />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Text buton</label>
                  <input type="text" value={acasa.ctaButon || ''} onChange={(e) => setAcasa({ ...acasa, ctaButon: e.target.value })} className="w-full border rounded px-3 py-2" />
                </div>
              </div>
            </div>

            <button
              onClick={() => handleSave("acasa", acasa)}
              disabled={saving}
              className="bg-blue-600 text-white px-6 py-2 rounded font-semibold hover:bg-blue-700 disabled:bg-gray-400"
            >
              {saving ? "Se salvează..." : "Salvează modificările"}
            </button>
          </div>
        )}

        {/* DESPRE NOI */}
        {activeTab === "despre" && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Editare pagina Despre Noi</h2>
            
            {/* Titlu și Subtitlu */}
            <div className="bg-gray-50 p-4 rounded-lg border">
              <h3 className="font-bold text-gray-700 mb-3">Header pagină</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold mb-1">Titlu</label>
                  <input
                    type="text"
                    value={despre.titlu}
                    onChange={(e) => setDespre({ ...despre, titlu: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Subtitlu</label>
                  <input
                    type="text"
                    value={despre.subtitlu}
                    onChange={(e) => setDespre({ ...despre, subtitlu: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
              </div>
            </div>

            {/* Cine suntem */}
            <div className="bg-gray-50 p-4 rounded-lg border">
              <h3 className="font-bold text-gray-700 mb-3">Secțiunea "Cine suntem"</h3>
              <div className="space-y-3">
                <div>
                  <label className="block font-semibold mb-1">Paragraf 1</label>
                  <textarea
                    value={despre.cineSuntemP1}
                    onChange={(e) => setDespre({ ...despre, cineSuntemP1: e.target.value })}
                    className="w-full border rounded px-3 py-2 h-24"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Paragraf 2</label>
                  <textarea
                    value={despre.cineSuntemP2}
                    onChange={(e) => setDespre({ ...despre, cineSuntemP2: e.target.value })}
                    className="w-full border rounded px-3 py-2 h-24"
                  />
                </div>
              </div>
            </div>

            {/* Misiune, Viziune, Valori */}
            <div className="bg-gray-50 p-4 rounded-lg border">
              <h3 className="font-bold text-gray-700 mb-3">Misiune, Viziune, Valori (3 carduri)</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Misiune */}
                <div className="space-y-2 bg-white p-3 rounded border">
                  <h4 className="font-semibold text-blue-600">Card Misiune</h4>
                  <input type="text" placeholder="Emoji" value={despre.misiuneEmoji} onChange={(e) => setDespre({ ...despre, misiuneEmoji: e.target.value })} className="w-full border rounded px-2 py-1" />
                  <input type="text" placeholder="Titlu" value={despre.misiuneTitlu} onChange={(e) => setDespre({ ...despre, misiuneTitlu: e.target.value })} className="w-full border rounded px-2 py-1" />
                  <textarea placeholder="Text" value={despre.misiuneText} onChange={(e) => setDespre({ ...despre, misiuneText: e.target.value })} className="w-full border rounded px-2 py-1 h-20" />
                </div>
                {/* Viziune */}
                <div className="space-y-2 bg-white p-3 rounded border">
                  <h4 className="font-semibold text-blue-600">Card Viziune</h4>
                  <input type="text" placeholder="Emoji" value={despre.viziuneEmoji} onChange={(e) => setDespre({ ...despre, viziuneEmoji: e.target.value })} className="w-full border rounded px-2 py-1" />
                  <input type="text" placeholder="Titlu" value={despre.viziuneTitlu} onChange={(e) => setDespre({ ...despre, viziuneTitlu: e.target.value })} className="w-full border rounded px-2 py-1" />
                  <textarea placeholder="Text" value={despre.viziuneText} onChange={(e) => setDespre({ ...despre, viziuneText: e.target.value })} className="w-full border rounded px-2 py-1 h-20" />
                </div>
                {/* Valori */}
                <div className="space-y-2 bg-white p-3 rounded border">
                  <h4 className="font-semibold text-blue-600">Card Valori</h4>
                  <input type="text" placeholder="Emoji" value={despre.valoriEmoji} onChange={(e) => setDespre({ ...despre, valoriEmoji: e.target.value })} className="w-full border rounded px-2 py-1" />
                  <input type="text" placeholder="Titlu" value={despre.valoriTitlu} onChange={(e) => setDespre({ ...despre, valoriTitlu: e.target.value })} className="w-full border rounded px-2 py-1" />
                  <textarea placeholder="Text" value={despre.valoriText} onChange={(e) => setDespre({ ...despre, valoriText: e.target.value })} className="w-full border rounded px-2 py-1 h-20" />
                </div>
              </div>
            </div>

            {/* Abordare */}
            <div className="bg-gray-50 p-4 rounded-lg border">
              <h3 className="font-bold text-gray-700 mb-3">Secțiunea "Abordare"</h3>
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <label className="block font-semibold mb-1">Emoji</label>
                  <input type="text" value={despre.abordareEmoji} onChange={(e) => setDespre({ ...despre, abordareEmoji: e.target.value })} className="w-full border rounded px-3 py-2" />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Titlu</label>
                  <input type="text" value={despre.abordareTitlu} onChange={(e) => setDespre({ ...despre, abordareTitlu: e.target.value })} className="w-full border rounded px-3 py-2" />
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block font-semibold mb-1">Paragraf 1</label>
                  <textarea value={despre.abordareP1} onChange={(e) => setDespre({ ...despre, abordareP1: e.target.value })} className="w-full border rounded px-3 py-2 h-20" />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Paragraf 2</label>
                  <textarea value={despre.abordareP2} onChange={(e) => setDespre({ ...despre, abordareP2: e.target.value })} className="w-full border rounded px-3 py-2 h-20" />
                </div>
              </div>
            </div>

            {/* Valorile noastre și Angajament */}
            <div className="bg-gray-50 p-4 rounded-lg border">
              <h3 className="font-bold text-gray-700 mb-3">Valorile noastre & Angajament (2 carduri)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 bg-white p-3 rounded border">
                  <h4 className="font-semibold text-blue-600">Card Valorile noastre</h4>
                  <input type="text" placeholder="Emoji" value={despre.valorileNoastreEmoji} onChange={(e) => setDespre({ ...despre, valorileNoastreEmoji: e.target.value })} className="w-full border rounded px-2 py-1" />
                  <input type="text" placeholder="Titlu" value={despre.valorileNoastreTitlu} onChange={(e) => setDespre({ ...despre, valorileNoastreTitlu: e.target.value })} className="w-full border rounded px-2 py-1" />
                  <textarea placeholder="Text" value={despre.valorileNoastreText} onChange={(e) => setDespre({ ...despre, valorileNoastreText: e.target.value })} className="w-full border rounded px-2 py-1 h-20" />
                </div>
                <div className="space-y-2 bg-white p-3 rounded border">
                  <h4 className="font-semibold text-blue-600">Card Angajament</h4>
                  <input type="text" placeholder="Emoji" value={despre.angajamentEmoji} onChange={(e) => setDespre({ ...despre, angajamentEmoji: e.target.value })} className="w-full border rounded px-2 py-1" />
                  <input type="text" placeholder="Titlu" value={despre.angajamentTitlu} onChange={(e) => setDespre({ ...despre, angajamentTitlu: e.target.value })} className="w-full border rounded px-2 py-1" />
                  <textarea placeholder="Text" value={despre.angajamentText} onChange={(e) => setDespre({ ...despre, angajamentText: e.target.value })} className="w-full border rounded px-2 py-1 h-20" />
                </div>
              </div>
            </div>

            {/* Parteneriate și Relații */}
            <div className="bg-gray-50 p-4 rounded-lg border">
              <h3 className="font-bold text-gray-700 mb-3">Parteneriate & Relații (2 carduri)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 bg-white p-3 rounded border">
                  <h4 className="font-semibold text-blue-600">Card Parteneriate</h4>
                  <input type="text" placeholder="Emoji" value={despre.parteneriatEmoji} onChange={(e) => setDespre({ ...despre, parteneriatEmoji: e.target.value })} className="w-full border rounded px-2 py-1" />
                  <input type="text" placeholder="Titlu" value={despre.parteneriatTitlu} onChange={(e) => setDespre({ ...despre, parteneriatTitlu: e.target.value })} className="w-full border rounded px-2 py-1" />
                  <textarea placeholder="Text" value={despre.parteneriatText} onChange={(e) => setDespre({ ...despre, parteneriatText: e.target.value })} className="w-full border rounded px-2 py-1 h-20" />
                </div>
                <div className="space-y-2 bg-white p-3 rounded border">
                  <h4 className="font-semibold text-blue-600">Card Relații</h4>
                  <input type="text" placeholder="Emoji" value={despre.relatiiEmoji} onChange={(e) => setDespre({ ...despre, relatiiEmoji: e.target.value })} className="w-full border rounded px-2 py-1" />
                  <input type="text" placeholder="Titlu" value={despre.relatiiTitlu} onChange={(e) => setDespre({ ...despre, relatiiTitlu: e.target.value })} className="w-full border rounded px-2 py-1" />
                  <textarea placeholder="Text" value={despre.relatiiText} onChange={(e) => setDespre({ ...despre, relatiiText: e.target.value })} className="w-full border rounded px-2 py-1 h-20" />
                </div>
              </div>
            </div>

            <button
              onClick={() => handleSave("despre", despre)}
              disabled={saving}
              className="bg-blue-600 text-white px-6 py-2 rounded font-semibold hover:bg-blue-700 disabled:bg-gray-400"
            >
              {saving ? "Se salvează..." : "Salvează modificările"}
            </button>
          </div>
        )}

        {/* SERVICII */}
        {activeTab === "servicii" && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Editare pagina Servicii</h2>
            <div>
              <label className="block font-semibold mb-1">Titlu</label>
              <input
                type="text"
                value={servicii.titlu}
                onChange={(e) => setServicii({ ...servicii, titlu: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Descriere</label>
              <textarea
                value={servicii.descriere}
                onChange={(e) => setServicii({ ...servicii, descriere: e.target.value })}
                className="w-full border rounded px-3 py-2 h-24"
              />
            </div>
            <div>
              <label className="block font-semibold mb-2">Lista servicii</label>
              {servicii.lista.map((s, idx) => (
                <div key={idx} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={s.nume}
                    onChange={(e) => {
                      const updated = [...servicii.lista];
                      updated[idx].nume = e.target.value;
                      setServicii({ ...servicii, lista: updated });
                    }}
                    className="flex-1 border rounded px-3 py-2"
                    placeholder="Nume serviciu"
                  />
                  <input
                    type="text"
                    value={s.descriere}
                    onChange={(e) => {
                      const updated = [...servicii.lista];
                      updated[idx].descriere = e.target.value;
                      setServicii({ ...servicii, lista: updated });
                    }}
                    className="flex-2 border rounded px-3 py-2"
                    placeholder="Descriere serviciu"
                  />
                  <button
                    onClick={() => {
                      const updated = servicii.lista.filter((_, i) => i !== idx);
                      setServicii({ ...servicii, lista: updated });
                    }}
                    className="bg-red-500 text-white px-3 py-2 rounded hover:bg-red-600"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                onClick={() => {
                  setServicii({
                    ...servicii,
                    lista: [...servicii.lista, { nume: "", descriere: "" }],
                  });
                }}
                className="bg-green-600 text-white px-4 py-2 rounded font-semibold hover:bg-green-700"
              >
                + Adaugă serviciu
              </button>
            </div>
            <button
              onClick={() => handleSave("servicii", servicii)}
              disabled={saving}
              className="bg-blue-600 text-white px-6 py-2 rounded font-semibold hover:bg-blue-700 disabled:bg-gray-400"
            >
              {saving ? "Se salvează..." : "Salvează modificările"}
            </button>
          </div>
        )}

        {/* MAGAZIN ONLINE */}
        {activeTab === "magazin" && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Editare pagina Magazin Online</h2>
            <div>
              <label className="block font-semibold mb-1">Titlu</label>
              <input
                type="text"
                value={magazin.titlu}
                onChange={(e) => setMagazin({ ...magazin, titlu: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Descriere</label>
              <textarea
                value={magazin.descriere}
                onChange={(e) => setMagazin({ ...magazin, descriere: e.target.value })}
                className="w-full border rounded px-3 py-2 h-24"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Text banner</label>
              <input
                type="text"
                value={magazin.banner}
                onChange={(e) => setMagazin({ ...magazin, banner: e.target.value })}
                className="w-full border rounded px-3 py-2"
                placeholder="Ex: Livrare rapidă în toată țara!"
              />
            </div>
            <button
              onClick={() => handleSave("magazin", magazin)}
              disabled={saving}
              className="bg-blue-600 text-white px-6 py-2 rounded font-semibold hover:bg-blue-700 disabled:bg-gray-400"
            >
              {saving ? "Se salvează..." : "Salvează modificările"}
            </button>
          </div>
        )}

        {/* CONTACT */}
        {activeTab === "contact" && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Editare pagina Contact</h2>
            <div>
              <label className="block font-semibold mb-1">Titlu secțiune</label>
              <input
                type="text"
                value={contact.titlu}
                onChange={(e) => setContact({ ...contact, titlu: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold mb-1">📞 Telefon</label>
                <input
                  type="text"
                  value={contact.telefon}
                  onChange={(e) => setContact({ ...contact, telefon: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Ex: 0732 935 623"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">✉️ Email</label>
                <input
                  type="email"
                  value={contact.email}
                  onChange={(e) => setContact({ ...contact, email: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Ex: office@prev-cor-tpm.ro"
                />
              </div>
            </div>
            <div>
              <label className="block font-semibold mb-1">📍 Adresă</label>
              <input
                type="text"
                value={contact.adresa}
                onChange={(e) => setContact({ ...contact, adresa: e.target.value })}
                className="w-full border rounded px-3 py-2"
                placeholder="Ex: Strada Principala, nr.70, Stroesti, Mehedinti, România"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold mb-1">📮 Cod poștal</label>
                <input
                  type="text"
                  value={contact.codPostal}
                  onChange={(e) => setContact({ ...contact, codPostal: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Ex: 227208"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">🕐 Program</label>
                <input
                  type="text"
                  value={contact.program}
                  onChange={(e) => setContact({ ...contact, program: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Ex: Luni - Vineri: 08:00 - 17:00"
                />
              </div>
            </div>
            
            {/* Previzualizare */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-bold text-blue-900 mb-3">Previzualizare:</h3>
              <div className="bg-white p-4 rounded shadow">
                <h4 className="text-xl font-bold text-blue-800 mb-4">{contact.titlu || "Informații de Contact"}</h4>
                <div className="space-y-2 text-gray-700">
                  <p>📞 <strong>Telefon:</strong> <span className="text-blue-600">{contact.telefon}</span></p>
                  <p>✉️ <strong>Email:</strong> <span className="text-blue-600">{contact.email}</span></p>
                  <p>📍 <strong>Adresă:</strong> {contact.adresa}</p>
                  <p>📮 <strong>Cod poștal:</strong> {contact.codPostal}</p>
                  <p>🕐 <strong>Program:</strong> {contact.program}</p>
                </div>
              </div>
            </div>
            
            <button
              onClick={() => handleSave("contact", contact)}
              disabled={saving}
              className="bg-blue-600 text-white px-6 py-2 rounded font-semibold hover:bg-blue-700 disabled:bg-gray-400"
            >
              {saving ? "Se salvează..." : "Salvează modificările"}
            </button>
          </div>
        )}

        {/* COȘ */}
        {activeTab === "cos" && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Setări Coș de Cumpărături</h2>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <p className="text-yellow-800 text-sm">
                <strong>Notă:</strong> Aceste setări afectează calculul prețurilor în coșul de cumpărături și la checkout.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold mb-1">📊 TVA (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={cos.tva}
                  onChange={(e) => setCos({ ...cos, tva: Number(e.target.value) })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Ex: 19"
                />
                <p className="text-xs text-gray-500 mt-1">Procentul TVA aplicat la produse (implicit 19%)</p>
              </div>
              <div>
                <label className="block font-semibold mb-1">💰 Monedă</label>
                <select
                  value={cos.moneda}
                  onChange={(e) => setCos({ ...cos, moneda: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="RON">RON (Lei)</option>
                  <option value="EUR">EUR (Euro)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold mb-1">🚚 Prag livrare gratuită (RON)</label>
                <input
                  type="number"
                  min="0"
                  value={cos.livrareGratuita}
                  onChange={(e) => setCos({ ...cos, livrareGratuita: Number(e.target.value) })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Ex: 500"
                />
                <p className="text-xs text-gray-500 mt-1">Valoarea minimă pentru livrare gratuită</p>
              </div>
              <div>
                <label className="block font-semibold mb-1">📅 Termen livrare</label>
                <input
                  type="text"
                  value={cos.termenLivrare}
                  onChange={(e) => setCos({ ...cos, termenLivrare: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Ex: 2-5 zile lucrătoare"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1">📝 Text livrare gratuită</label>
              <input
                type="text"
                value={cos.textLivrare}
                onChange={(e) => setCos({ ...cos, textLivrare: e.target.value })}
                className="w-full border rounded px-3 py-2"
                placeholder="Ex: Livrare gratuită pentru comenzi peste 500 RON"
              />
            </div>

            {/* Previzualizare */}
            <div className="mt-6 p-4 bg-green-50 rounded-lg">
              <h3 className="font-bold text-green-900 mb-3">Previzualizare calcul:</h3>
              <div className="bg-white p-4 rounded shadow">
                <div className="space-y-2 text-gray-700">
                  <p><strong>Subtotal:</strong> 1000 {cos.moneda}</p>
                  <p><strong>TVA ({cos.tva}%):</strong> {(1000 * cos.tva / 100).toFixed(2)} {cos.moneda}</p>
                  <p className="text-lg font-bold text-green-700 border-t pt-2">
                    <strong>Total:</strong> {(1000 + 1000 * cos.tva / 100).toFixed(2)} {cos.moneda}
                  </p>
                  {cos.textLivrare && (
                    <p className="text-sm text-blue-600 mt-2">🚚 {cos.textLivrare}</p>
                  )}
                </div>
              </div>
            </div>
            
            <button
              onClick={() => handleSave("cos", cos)}
              disabled={saving}
              className="bg-blue-600 text-white px-6 py-2 rounded font-semibold hover:bg-blue-700 disabled:bg-gray-400"
            >
              {saving ? "Se salvează..." : "Salvează modificările"}
            </button>
          </div>
        )}

        {/* COMPANIE */}
        {activeTab === "companie" && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Date Companie (Config Central)</h2>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-blue-800 text-sm">
                <strong>Notă:</strong> Aceste date sunt folosite automat în tot site-ul: PDF-uri, email-uri, widget chat, pagini contact, facturi.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold mb-1">🏢 Nume companie complet</label>
                <input
                  type="text"
                  value={companie.name}
                  onChange={(e) => setCompanie({ ...companie, name: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Ex: S.C. PREV-COR TPM S.R.L."
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">🏷️ Nume scurt</label>
                <input
                  type="text"
                  value={companie.shortName}
                  onChange={(e) => setCompanie({ ...companie, shortName: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Ex: PREV-COR TPM"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold mb-1">📊 CUI / CIF</label>
                <input
                  type="text"
                  value={companie.cui}
                  onChange={(e) => setCompanie({ ...companie, cui: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Ex: RO43434739"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">📑 Reg. Com.</label>
                <input
                  type="text"
                  value={companie.regCom}
                  onChange={(e) => setCompanie({ ...companie, regCom: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Ex: J25/582/2020"
                />
              </div>
            </div>

            <h3 className="font-bold mt-6">Contact</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold mb-1">📞 Telefon</label>
                <input
                  type="text"
                  value={companie.phone}
                  onChange={(e) => setCompanie({ ...companie, phone: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Ex: 0732 935 623"
                />
                <p className="text-xs text-gray-500 mt-1">Link WhatsApp se generează automat</p>
              </div>
              <div>
                <label className="block font-semibold mb-1">✉️ Email</label>
                <input
                  type="email"
                  value={companie.email}
                  onChange={(e) => setCompanie({ ...companie, email: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Ex: office@prevcortpm.ro"
                />
              </div>
            </div>

            <h3 className="font-bold mt-6">Adresă</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block font-semibold mb-1">Stradă</label>
                <input
                  type="text"
                  value={companie.address.street}
                  onChange={(e) => setCompanie({ ...companie, address: { ...companie.address, street: e.target.value } })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Ex: Principala"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Număr</label>
                <input
                  type="text"
                  value={companie.address.number}
                  onChange={(e) => setCompanie({ ...companie, address: { ...companie.address, number: e.target.value } })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Ex: 70"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Localitate</label>
                <input
                  type="text"
                  value={companie.address.city}
                  onChange={(e) => setCompanie({ ...companie, address: { ...companie.address, city: e.target.value } })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Ex: Stroesti"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block font-semibold mb-1">Județ</label>
                <input
                  type="text"
                  value={companie.address.county}
                  onChange={(e) => setCompanie({ ...companie, address: { ...companie.address, county: e.target.value } })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Ex: Mehedinti"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Cod poștal</label>
                <input
                  type="text"
                  value={companie.address.postalCode}
                  onChange={(e) => setCompanie({ ...companie, address: { ...companie.address, postalCode: e.target.value } })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Ex: 227208"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Țară</label>
                <input
                  type="text"
                  value={companie.address.country}
                  onChange={(e) => setCompanie({ ...companie, address: { ...companie.address, country: e.target.value } })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Ex: Romania"
                />
              </div>
            </div>

            <h3 className="font-bold mt-6">Date bancare</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold mb-1">🏦 IBAN</label>
                <input
                  type="text"
                  value={companie.iban}
                  onChange={(e) => setCompanie({ ...companie, iban: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Ex: RO23BRDE360SV67547173600"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">🏦 Bancă (RO)</label>
                <input
                  type="text"
                  value={companie.bank}
                  onChange={(e) => setCompanie({ ...companie, bank: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Ex: BANCA ROMANA DE DEZVOLTARE"
                />
              </div>
            </div>
            <div>
              <label className="block font-semibold mb-1">🏦 Bancă (EN) - pentru clienți străini</label>
              <input
                type="text"
                value={companie.bankEn}
                onChange={(e) => setCompanie({ ...companie, bankEn: e.target.value })}
                className="w-full border rounded px-3 py-2"
                placeholder="Ex: ROMANIAN DEVELOPMENT BANK (BRD)"
              />
            </div>

            {/* Previzualizare */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-bold text-gray-900 mb-3">Previzualizare date companie:</h3>
              <div className="bg-white p-4 rounded shadow text-sm">
                <p><strong>{companie.name}</strong></p>
                <p>CUI: {companie.cui} | Reg. Com.: {companie.regCom}</p>
                <p>Str. {companie.address.street}, Nr. {companie.address.number}, {companie.address.city}, jud. {companie.address.county}, {companie.address.country}</p>
                <p>Cod poștal: {companie.address.postalCode}</p>
                <p>📞 {companie.phone} | ✉️ {companie.email}</p>
                <p>🏦 {companie.bank} | IBAN: {companie.iban}</p>
              </div>
            </div>
            
            <button
              onClick={async () => {
                setSaving(true);
                try {
                  const res = await fetch("/admin/api/companie", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(companie),
                  });
                  if (res.ok) {
                    showToast("Date companie salvate cu succes!");
                  } else {
                    showToast("Eroare la salvare!", "error");
                  }
                } catch (err) {
                  showToast("Eroare la salvare!", "error");
                }
                setSaving(false);
              }}
              disabled={saving}
              className="bg-blue-600 text-white px-6 py-2 rounded font-semibold hover:bg-blue-700 disabled:bg-gray-400"
            >
              {saving ? "Se salvează..." : "Salvează date companie"}
            </button>
          </div>
        )}
        
      </div>
    </div>
  );
}
