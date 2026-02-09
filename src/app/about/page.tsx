"use client";
import { useState, useEffect } from "react";
import { useLanguage } from "../_components/LanguageContext";

export default function AboutPage() {
  const { language } = useLanguage();
  
  // Texte în engleză
  const enTexts = {
    titlu: "PREV-COR TPM",
    subtitlu: "Excellence, innovation and lasting partnerships in industry",
    cineSuntemLabel: "Who we are",
    cineSuntemP1: "PREV-COR TPM was born from a passion for engineering and the desire to bring added value to Romanian industry. Over the years, we have built a multidisciplinary team, consisting of engineers, technicians and consultants with vast experience in industrial automation, complex system design and equipment maintenance.",
    cineSuntemP2: "We have constantly developed, investing in technology, professional training and strategic partnerships with top suppliers. Today, we are recognized for our ability to deliver turnkey projects, tailored to the needs of each client, regardless of complexity or field of activity.",
    misiuneEmoji: "🎯",
    misiuneTitlu: "Our mission",
    misiuneText: "To be the engine of industrial progress, offering innovative, efficient and safe solutions that optimize processes, reduce costs and increase our customers' competitiveness.",
    viziuneEmoji: "🌍",
    viziuneTitlu: "Our vision",
    viziuneText: "To become a benchmark of excellence in the Romanian and European industry, to inspire future generations of specialists and to contribute to the sustainable development of the industrial environment.",
    valoriEmoji: "💡",
    valoriTitlu: "Our values",
    valoriText: "Customer orientation, Integrity and transparency, Quality and safety, Innovation and continuous development, Responsibility towards environment and community.",
    abordareEmoji: "🔧",
    abordareTitlu: "Our approach",
    abordareP1: "Each project is treated with maximum attention to detail, rigorous planning and constant communication with the client. We use modern project management methods, ensure total transparency and provide periodic reports on work progress.",
    abordareP2: "We are flexible and proactive, quickly adapting to market changes and technical challenges. We engage in developing custom solutions, testing and validating each stage to guarantee exceptional results.",
    valorileNoastreEmoji: "💡",
    valorileNoastreTitlu: "Our values",
    valorileNoastreText: "We guide our activity by solid principles: integrity, responsibility and customer orientation. Our mission is to offer partners efficient, innovative and safe solutions, adapted to real needs in the industry.",
    angajamentEmoji: "⭐",
    angajamentTitlu: "Our commitment",
    angajamentText: "We focus on collaboration, transparency and measurable results. We are dedicated to continuous development and supporting customers in achieving business objectives.",
    parteneriatEmoji: "🤝",
    parteneriatTitlu: "Partnerships and results",
    parteneriatText: "We collaborate with renowned suppliers and companies from various industries, from automotive to energy, food, logistics and production. Our portfolio includes complex projects, completed on time and on budget, with measurable results in increasing efficiency and reducing operational costs.",
    relatiiEmoji: "📈",
    relatiiTitlu: "Long-term relationships",
    relatiiText: "At PREV-COR TPM, the customer is at the center of attention. We offer dedicated consulting, quick technical support and personalized solutions for every challenge. We ensure that every collaboration ends successfully and with the complete satisfaction of the beneficiary."
  };

  const [p, setP] = useState({
    titlu: "PREV-COR TPM",
    subtitlu: "Excelență, inovație și parteneriate durabile în industrie",
    cineSuntemP1: "PREV-COR TPM a luat naștere din pasiunea pentru inginerie și dorința de a aduce un plus de valoare industriei românești. De-a lungul anilor, am construit o echipă multidisciplinară, formată din ingineri, tehnicieni și consultanți cu experiență vastă în domeniul automatizărilor industriale, proiectării de sisteme complexe și mentenanței echipamentelor.",
    cineSuntemP2: "Ne-am dezvoltat constant, investind în tehnologie, formare profesională și parteneriate strategice cu furnizori de top. Astăzi, suntem recunoscuți pentru capacitatea de a livra proiecte la cheie, adaptate nevoilor fiecărui client, indiferent de complexitate sau domeniu de activitate.",
    misiuneEmoji: "🎯",
    misiuneTitlu: "Misiunea noastră",
    misiuneText: "Să fim motorul progresului industrial, oferind soluții inovatoare, eficiente și sigure, care să optimizeze procesele, să reducă costurile și să crească competitivitatea clienților noștri.",
    viziuneEmoji: "🌍",
    viziuneTitlu: "Viziunea noastră",
    viziuneText: "Să devenim un reper de excelență în industria românească și europeană, să inspirăm generațiile viitoare de specialiști și să contribuim la dezvoltarea sustenabilă a mediului industrial.",
    valoriEmoji: "💡",
    valoriTitlu: "Valorile noastre",
    valoriText: "Orientare către client, Integritate și transparență, Calitate și siguranță, Inovație și dezvoltare continuă, Responsabilitate față de mediu și comunitate.",
    abordareEmoji: "🔧",
    abordareTitlu: "Abordarea noastră",
    abordareP1: "Fiecare proiect este tratat cu maximă atenție la detalii, planificare riguroasă și comunicare constantă cu clientul. Folosim metode moderne de management de proiect, asigurăm transparență totală și oferim rapoarte periodice privind progresul lucrărilor.",
    abordareP2: "Suntem flexibili și proactivi, adaptându-ne rapid la schimbările din piață și la provocările tehnice. Ne implicăm în dezvoltarea de soluții custom, testăm și validăm fiecare etapă pentru a garanta rezultate de excepție.",
    valorileNoastreEmoji: "💡",
    valorileNoastreTitlu: "Valorile noastre",
    valorileNoastreText: "Ne ghidăm activitatea după principii solide: integritate, responsabilitate și orientare către client. Misiunea noastră este să oferim partenerilor soluții eficiente, inovatoare și sigure, adaptate nevoilor reale din industrie.",
    angajamentEmoji: "⭐",
    angajamentTitlu: "Angajamentul nostru",
    angajamentText: "Punem accent pe colaborare, transparență și rezultate măsurabile. Suntem dedicați dezvoltării continue și susținerii clienților în atingerea obiectivelor de business.",
    parteneriatEmoji: "🤝",
    parteneriatTitlu: "Parteneriate și rezultate",
    parteneriatText: "Colaborăm cu furnizori de renume și cu companii din diverse industrii, de la automotive la energie, alimentație, logistică și producție. Portofoliul nostru include proiecte complexe, finalizate la timp și în buget, cu rezultate măsurabile în creșterea eficienței și reducerea costurilor operaționale.",
    relatiiEmoji: "📈",
    relatiiTitlu: "Relații pe termen lung",
    relatiiText: "La PREV-COR TPM, clientul este în centrul atenției. Oferim consultanță dedicată, suport tehnic rapid și soluții personalizate pentru fiecare provocare. Ne asigurăm că fiecare colaborare se finalizează cu succes și cu satisfacția deplină a beneficiarului."
  });

  useEffect(() => {
    fetch("/admin/api/pagini?pagina=despre")
      .then(res => res.json())
      .then(data => { if (data) setP(prev => ({ ...prev, ...data })); })
      .catch(() => {});
  }, []);

  // Selectează textele în funcție de limbă
  const t = language === "en" ? enTexts : p;

  const cardStyle = {
    background: 'linear-gradient(135deg, #e3eafc 0%, #b6c7e3 60%, #6b7fa7 100%)',
    boxShadow: '0 4px 24px 0 rgba(60, 90, 150, 0.08)'
  };

  return (
    <main className="container mx-auto py-10 px-4">
      <h1 className="text-4xl font-extrabold text-blue-700 mb-2 text-center">{t.titlu}</h1>
      <div className="text-center text-lg text-gray-600 mb-10">{t.subtitlu}</div>

      {/* Cine suntem */}
      <section className="mb-10 bg-blue-50 rounded-lg p-6 shadow border-2 border-blue-300 flex flex-col md:flex-row gap-8 items-center">
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-blue-800 mb-2 flex items-center gap-2"><span>🏭</span> {language === "en" ? "Who we are" : "Cine suntem"}</h2>
          <p className="mb-2">{t.cineSuntemP1}</p>
          <p>{t.cineSuntemP2}</p>
        </div>
        <div className="flex-1 flex justify-center">
          <img src="/logo.png" alt="Sigla PREV-COR TPM" className="w-32 h-32 md:w-48 md:h-48 object-contain" />
        </div>
      </section>

      {/* Misiune, Viziune, Valori */}
      <section className="mb-10 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="p-6 rounded shadow border-2 border-blue-300 flex flex-col items-center" style={cardStyle}>
          <span className="text-4xl mb-2">{t.misiuneEmoji}</span>
          <h3 className="font-semibold text-blue-700 mb-2">{t.misiuneTitlu}</h3>
          <p className="text-center">{t.misiuneText}</p>
        </div>
        <div className="p-6 rounded shadow border-2 border-blue-300 flex flex-col items-center" style={cardStyle}>
          <span className="text-4xl mb-2">{t.viziuneEmoji}</span>
          <h3 className="font-semibold text-blue-700 mb-2">{t.viziuneTitlu}</h3>
          <p className="text-center">{t.viziuneText}</p>
        </div>
        <div className="p-6 rounded shadow border-2 border-blue-300 flex flex-col items-center" style={cardStyle}>
          <span className="text-4xl mb-2">{t.valoriEmoji}</span>
          <h3 className="font-semibold text-blue-700 mb-2">{t.valoriTitlu}</h3>
          <p className="text-center">{t.valoriText}</p>
        </div>
      </section>

      {/* Abordare */}
      <section className="mb-10 p-6 rounded shadow border-2 border-blue-300" style={cardStyle}>
        <h2 className="text-xl font-bold text-blue-800 mb-2 flex items-center gap-2"><span>{t.abordareEmoji}</span> {t.abordareTitlu}</h2>
        <p className="mb-2">{t.abordareP1}</p>
        <p>{t.abordareP2}</p>
      </section>

      {/* Valorile noastre și Angajament */}
      <section className="mb-10 grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="p-6 rounded shadow border-2 border-blue-300 flex flex-col items-center" style={cardStyle}>
          <span className="text-4xl mb-2">{t.valorileNoastreEmoji}</span>
          <h3 className="font-semibold text-blue-700 mb-2">{t.valorileNoastreTitlu}</h3>
          <p className="text-center">{t.valorileNoastreText}</p>
        </div>
        <div className="p-6 rounded shadow border-2 border-blue-300 flex flex-col items-center" style={cardStyle}>
          <span className="text-4xl mb-2">{t.angajamentEmoji}</span>
          <h3 className="font-semibold text-blue-700 mb-2">{t.angajamentTitlu}</h3>
          <p className="text-center">{t.angajamentText}</p>
        </div>
      </section>

      {/* Parteneriate și Relații */}
      <section className="mb-10 grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="p-6 rounded shadow border-2 border-blue-300 flex flex-col items-center" style={cardStyle}>
          <span className="text-4xl mb-2">{t.parteneriatEmoji}</span>
          <h3 className="font-semibold text-blue-700 mb-2">{t.parteneriatTitlu}</h3>
          <p className="text-center">{t.parteneriatText}</p>
        </div>
        <div className="p-6 rounded shadow border-2 border-blue-300 flex flex-col items-center" style={cardStyle}>
          <span className="text-4xl mb-2">{t.relatiiEmoji}</span>
          <h3 className="font-semibold text-blue-700 mb-2">{t.relatiiTitlu}</h3>
          <p className="text-center">{t.relatiiText}</p>
        </div>
      </section>
    </main>
  );
}