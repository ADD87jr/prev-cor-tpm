"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useLanguage } from "./_components/LanguageContext";

export default function Home() {
  const { language } = useLanguage();
  
  // Texte în engleză
  const enTexts = {
    titlu: "Welcome to PREV-COR TPM",
    subtitlu: "Complete solutions for electrical installations and industrial automation",
    descriere: "We offer professional design, installation and maintenance services for electrical systems and automation.",
    textB2B: "We also offer B2B services for companies. Contact us for a personalized offer!",
    avantaj1Emoji: "🚀", avantaj1Titlu: "Speed", avantaj1Text: "Fast implementation and delivery of solutions.",
    avantaj2Emoji: "🔒", avantaj2Titlu: "Security", avantaj2Text: "We protect customer data and confidentiality.",
    avantaj3Emoji: "🤝", avantaj3Titlu: "Partnership", avantaj3Text: "We are with you throughout the collaboration.",
    serviciiTitlu: "Collaborate with industry professionals",
    serviciiText: "At PREV-COR TPM, we believe in strong partnerships and solutions tailored to each client. We invite you to discover how our expertise can transform technical challenges into growth opportunities. Contact us for consulting, customized projects or dedicated support - we are here to help you evolve!",
    valoriTitlu: "Our values",
    valoriText: "We guide our activity by solid principles: integrity, responsibility and customer orientation. Our mission is to offer partners efficient, innovative and safe solutions, adapted to real needs in the industry.",
    angajamentTitlu: "Our commitment",
    angajamentText: "We focus on collaboration, transparency and measurable results. We are dedicated to continuous development and supporting customers in achieving business objectives.",
    testimonialeTitlu: "What our customers say",
    testimonial1Text: "Excellent services and quality products!",
    testimonial1Autor: "Andrei P.",
    testimonial2Text: "I recommend this company with confidence!",
    testimonial2Autor: "Maria L.",
    ctaTitlu: "Contact us for a personalized offer!",
    ctaButon: "Send message"
  };

  // Date editabile din admin - toate secțiunile
  const [p, setP] = useState({
    titlu: "Bine ați venit la PREV-COR TPM",
    subtitlu: "Solutii Inteligente de Automatizare Industriala",
    descriere: "Oferim servicii profesionale de proiectare, instalare și mentenanță pentru sisteme electrice și automatizări.",
    textB2B: "Oferim și servicii B2B pentru companii. Contactează-ne pentru o ofertă personalizată!",
    avantaj1Emoji: "🚀", avantaj1Titlu: "Rapiditate", avantaj1Text: "Implementare și livrare rapidă a soluțiilor.",
    avantaj2Emoji: "🔒", avantaj2Titlu: "Siguranță", avantaj2Text: "Protejăm datele și confidențialitatea clienților.",
    avantaj3Emoji: "🤝", avantaj3Titlu: "Parteneriat", avantaj3Text: "Suntem alături de tine pe tot parcursul colaborării.",
    serviciiTitlu: "Colaborează cu profesioniștii industriei",
    serviciiText: "La PREV-COR TPM, credem în parteneriate solide și soluții adaptate fiecărui client. Te invităm să descoperi cum expertiza noastră poate transforma provocările tehnice în oportunități de creștere. Contactează-ne pentru consultanță, proiecte personalizate sau suport dedicat – suntem aici să te ajutăm să evoluezi!",
    valoriTitlu: "Valorile noastre",
    valoriText: "Ne ghidăm activitatea după principii solide: integritate, responsabilitate și orientare către client. Misiunea noastră este să oferim partenerilor soluții eficiente, inovatoare și sigure, adaptate nevoilor reale din industrie.",
    angajamentTitlu: "Angajamentul nostru",
    angajamentText: "Punem accent pe colaborare, transparență și rezultate măsurabile. Suntem dedicați dezvoltării continue și susținerii clienților în atingerea obiectivelor de business.",
    testimonialeTitlu: "Ce spun clienții noștri",
    testimonial1Text: "Servicii excelente și produse de calitate!",
    testimonial1Autor: "Andrei P.",
    testimonial2Text: "Recomand cu încredere această companie!",
    testimonial2Autor: "Maria L.",
    ctaTitlu: "Contactează-ne pentru o ofertă personalizată!",
    ctaButon: "Trimite mesaj"
  });

  useEffect(() => {
    fetch('/api/pages?pagina=acasa')
      .then(res => res.json())
      .then(data => {
        if (data) {
          setP(prev => ({ ...prev, ...data }));
        }
      })
      .catch(() => {});
  }, []);

  // Selectează textele în funcție de limbă
  const t = language === "en" ? enTexts : p;

  const cardStyle = {background: 'linear-gradient(135deg, #e3eafc 0%, #b6c7e3 60%, #6b7fa7 100%)', boxShadow: '0 4px 24px 0 rgba(60, 90, 150, 0.08)', border: '2px solid #2563eb'};

  return (
    <main className="container mx-auto py-10 px-4">
      {/* Hero Section */}
      <section className="text-center mb-12 p-8 rounded-xl border-2 border-blue-300 bg-gradient-to-br from-blue-50 to-white">
        <h1 className="text-4xl font-bold mb-4 text-blue-700">{t.titlu}</h1>
        <div className="text-lg text-gray-600 mb-2">{t.subtitlu}</div>
        <div className="text-lg text-green-700 font-semibold mb-2">{t.textB2B}</div>
        <p className="text-lg mb-6">{t.descriere}</p>
      </section>

      {/* Avantaje */}
      <section className="mb-12 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="p-6 rounded shadow text-center" style={cardStyle}>
          <div className="text-3xl mb-2">{t.avantaj1Emoji}</div>
          <h2 className="font-semibold mb-1">{t.avantaj1Titlu}</h2>
          <p>{t.avantaj1Text}</p>
        </div>
        <div className="p-6 rounded shadow text-center" style={cardStyle}>
          <div className="text-3xl mb-2">{t.avantaj2Emoji}</div>
          <h2 className="font-semibold mb-1">{t.avantaj2Titlu}</h2>
          <p>{t.avantaj2Text}</p>
        </div>
        <div className="p-6 rounded shadow text-center" style={cardStyle}>
          <div className="text-3xl mb-2">{t.avantaj3Emoji}</div>
          <h2 className="font-semibold mb-1">{t.avantaj3Titlu}</h2>
          <p>{t.avantaj3Text}</p>
        </div>
      </section>

      {/* Servicii */}
      <section className="mb-12">
        <div className="p-8 rounded shadow text-center" style={cardStyle}>
          <h2 className="text-2xl font-bold mb-4 text-blue-700">{t.serviciiTitlu}</h2>
          <p className="text-lg text-gray-700">{t.serviciiText}</p>
        </div>
      </section>

      {/* Valorile noastre */}
      <section className="mb-8">
        <div className="p-8 rounded shadow text-center" style={cardStyle}>
          <h2 className="text-2xl font-bold mb-4 text-blue-700">{t.valoriTitlu}</h2>
          <p className="text-lg text-gray-700 mb-0">{t.valoriText}</p>
        </div>
      </section>

      {/* Angajamentul nostru */}
      <section className="mb-12">
        <div className="p-8 rounded shadow text-center" style={cardStyle}>
          <h2 className="text-2xl font-bold mb-4 text-blue-700">{t.angajamentTitlu}</h2>
          <p className="text-lg text-gray-700 mb-0">{t.angajamentText}</p>
        </div>
      </section>

      {/* Testimoniale */}
      <section className="mb-12 p-6 rounded-xl border-2 border-blue-200 bg-blue-50/30">
        <h2 className="text-2xl font-bold mb-6 text-center">{t.testimonialeTitlu}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="p-6 rounded-lg shadow" style={cardStyle}>
            <p className="italic mb-2">"{t.testimonial1Text}"</p>
            <div className="font-semibold">- {t.testimonial1Autor}</div>
          </div>
          <div className="p-6 rounded-lg shadow" style={cardStyle}>
            <p className="italic mb-2">"{t.testimonial2Text}"</p>
            <div className="font-semibold">- {t.testimonial2Autor}</div>
          </div>
        </div>
      </section>

      {/* Call to action */}
      <section className="text-center p-8 rounded-xl border-2 border-green-300 bg-gradient-to-br from-green-50 to-white">
        <h2 className="text-2xl font-bold mb-4">{t.ctaTitlu}</h2>
        <Link href="/contact" className="bg-blue-600 text-white px-6 py-3 rounded shadow hover:bg-blue-700 transition">{t.ctaButon}</Link>
      </section>
    </main>
  );
}
