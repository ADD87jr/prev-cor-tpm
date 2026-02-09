"use client";
import { useLanguage } from "../_components/LanguageContext";

export default function Servicii() {
  const { language } = useLanguage();
  
  const txt = language === "en" ? {
    title: "Our Services",
    audit: "Audit",
    auditDesc: "Technical audit and industrial process evaluation",
    design: "Design",
    designDesc: "Custom design for industrial process automation",
    elaboration: "Elaboration",
    elaborationDesc: "Technical documentation and industrial solutions development",
    training: "Training",
    trainingDesc: "Specialized training for technical personnel",
    consultancy: "Consultancy",
    consultancyDesc: "Specialized technical consultancy for industrial solutions",
    advantagesTitle: "Advantages of working with us",
    speed: "Speed",
    speedDesc: "We implement industrial solutions promptly, respecting delivery deadlines and quickly adapting to customer requirements. Our team optimizes processes so your business benefits from immediate results.",
    safety: "Safety",
    safetyDesc: "We prioritize data and industrial process security. We use advanced technologies and respect confidentiality standards, ensuring complete protection of your information and equipment.",
    partnership: "Partnership",
    partnershipDesc: "We build long-term trust relationships, offering continuous support and personalized consultancy. We are with you at every stage, so your projects are successful.",
    contactUs: "Contact us for a personalized offer!",
  } : {
    title: "Serviciile noastre",
    audit: "Audit",
    auditDesc: "Audit tehnic și evaluare procese industriale",
    design: "Proiectare",
    designDesc: "Proiectare personalizată pentru automatizarea proceselor industriale",
    elaboration: "Elaborare",
    elaborationDesc: "Elaborare documentații tehnice și soluții industriale",
    training: "Instruire",
    trainingDesc: "Instruire specializată pentru personal tehnic",
    consultancy: "Consultanță",
    consultancyDesc: "Consultanță tehnică specializată pentru soluții industriale",
    advantagesTitle: "Avantajele colaborării cu noi",
    speed: "Rapiditate",
    speedDesc: "Implementăm soluții industriale cu promptitudine, respectând termenele de livrare și adaptându-ne rapid la cerințele clienților. Echipa noastră optimizează procesele pentru ca afacerea ta să beneficieze de rezultate imediate.",
    safety: "Siguranță",
    safetyDesc: "Prioritizăm securitatea datelor și a proceselor industriale. Folosim tehnologii avansate și respectăm standardele de confidențialitate, asigurând protecția completă a informațiilor și a echipamentelor tale.",
    partnership: "Parteneriat",
    partnershipDesc: "Construim relații de încredere pe termen lung, oferind suport continuu și consultanță personalizată. Suntem alături de tine în fiecare etapă, pentru ca proiectele tale să fie un succes.",
    contactUs: "Contactează-ne pentru ofertă personalizată!",
  };

  return (
    <main className="container mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-6 text-blue-700 text-center">{txt.title}</h1>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-8 mb-8" style={{background: 'none'}}>
        <div className="bg-gradient-to-br from-blue-100 via-blue-300 to-blue-700 shadow-lg rounded-2xl p-6 text-white text-center">
            <div style={{fontSize: '2.5rem', marginBottom: '0.5rem'}}>🔍</div>
            <h2 style={{fontWeight: 600, marginBottom: '0.5rem', color: '#2563eb'}}>{txt.audit}</h2>
            <p style={{color: '#e0e7ef'}}>{txt.auditDesc}</p>
        </div>
        <div className="bg-gradient-to-br from-blue-100 via-blue-300 to-blue-700 shadow-lg rounded-2xl p-6 text-white text-center">
            <div style={{fontSize: '2.5rem', marginBottom: '0.5rem'}}>📐</div>
            <h2 style={{fontWeight: 600, marginBottom: '0.5rem', color: '#2563eb'}}>{txt.design}</h2>
            <p style={{color: '#e0e7ef'}}>{txt.designDesc}</p>
        </div>
        <div className="bg-gradient-to-br from-blue-100 via-blue-300 to-blue-700 shadow-lg rounded-2xl p-6 text-white text-center">
            <div style={{fontSize: '2.5rem', marginBottom: '0.5rem'}}>📝</div>
            <h2 style={{fontWeight: 600, marginBottom: '0.5rem', color: '#2563eb'}}>{txt.elaboration}</h2>
            <p style={{color: '#e0e7ef'}}>{txt.elaborationDesc}</p>
        </div>
        <div className="bg-gradient-to-br from-blue-100 via-blue-300 to-blue-700 shadow-lg rounded-2xl p-6 text-white text-center">
            <div style={{fontSize: '2.5rem', marginBottom: '0.5rem'}}>🎓</div>
            <h2 style={{fontWeight: 600, marginBottom: '0.5rem', color: '#2563eb'}}>{txt.training}</h2>
            <p style={{color: '#e0e7ef'}}>{txt.trainingDesc}</p>
        </div>
        <div className="bg-gradient-to-br from-blue-100 via-blue-300 to-blue-700 shadow-lg rounded-2xl p-6 text-white text-center">
            <div style={{fontSize: '2.5rem', marginBottom: '0.5rem'}}>💼</div>
            <h2 style={{fontWeight: 600, marginBottom: '0.5rem', color: '#2563eb'}}>{txt.consultancy}</h2>
            <p style={{color: '#e0e7ef'}}>{txt.consultancyDesc}</p>
        </div>
      </div>
      <h2 className="text-2xl font-bold mb-6 text-center">{txt.advantagesTitle}</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
        <div style={{backgroundImage: 'linear-gradient(135deg, #e3eafc 0%, #b6c7e3 60%, #6b7fa7 100%) !important', boxShadow: '0 4px 24px 0 rgba(60, 90, 150, 0.08)', borderRadius: '16px', padding: '24px', textAlign: 'center', border: '1px solid #b6c7e3'}}>
          <h3 className="font-semibold mb-2">{txt.speed}</h3>
          <p>{txt.speedDesc}</p>
        </div>
        <div style={{backgroundImage: 'linear-gradient(135deg, #e3eafc 0%, #b6c7e3 60%, #6b7fa7 100%) !important', boxShadow: '0 4px 24px 0 rgba(60, 90, 150, 0.08)', borderRadius: '16px', padding: '24px', textAlign: 'center', border: '1px solid #b6c7e3'}}>
          <h3 className="font-semibold mb-2">{txt.safety}</h3>
          <p>{txt.safetyDesc}</p>
        </div>
        <div style={{backgroundImage: 'linear-gradient(135deg, #e3eafc 0%, #b6c7e3 60%, #6b7fa7 100%) !important', boxShadow: '0 4px 24px 0 rgba(60, 90, 150, 0.08)', borderRadius: '16px', padding: '24px', textAlign: 'center', border: '1px solid #b6c7e3', color: '#fff'}}>
          <h3 style={{fontWeight: 600, marginBottom: '0.5rem'}}>{txt.partnership}</h3>
          <p>{txt.partnershipDesc}</p>
        </div>
      </div>
      <p className="text-lg text-center mb-8">{txt.contactUs}</p>
    </main>
  );
}
