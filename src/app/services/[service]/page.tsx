"use client";


import dynamic from "next/dynamic";


import { useParams } from "next/navigation";
import { useLanguage } from "../../_components/LanguageContext";
const Scene = dynamic(() => import("../../../components/Service3D"), { ssr: false });


const serviceDetailsRO: Record<string, { title: string; text: string; bullets: string[]; schemaLabel: string }> = {
  "modernizare-retrofit": {
    title: "Modernizare instalații și retrofit echipamente",
    text: "Modernizăm instalații industriale și realizăm retrofit pentru echipamente, crescând eficiența, siguranța și durata de viață a acestora. Oferim soluții personalizate pentru integrarea tehnologiilor noi în sisteme existente, cu impact direct în reducerea costurilor și creșterea productivității.",
    bullets: [
      "Analiză tehnică și audit instalații",
      "Proiectare soluții de modernizare",
      "Integrare automatizări și senzori noi",
      "Optimizare consum energetic",
      "Testare, validare și instruire personal"
    ],
    schemaLabel: "Modernizare și retrofit industrial",
  },
  "relocare-linii": {
    title: "Relocare Linii Producție",
    text: "Asigurăm relocarea completă a liniilor de producție, cu planificare detaliată, demontare, transport, montaj și repunere în funcțiune. Minimizăm timpii de oprire și garantăm reluarea rapidă a producției în noua locație.",
    bullets: [
      "Planificare și management proiect relocare",
      "Demontare profesională a echipamentelor",
      "Transport sigur și eficient",
      "Montaj și reconfigurare la destinație",
      "Testare, punere în funcțiune și suport post-relocare"
    ],
    schemaLabel: "Relocare linii industriale",
  },
  "mentenanta-service": {
    title: "Mentenanță preventivă, predictivă și service echipamente industriale",
    text: "Oferim servicii complete de mentenanță preventivă, predictivă și intervenții rapide pentru echipamente industriale. Prevenim defectările costisitoare și asigurăm funcționarea optimă a instalațiilor.",
    bullets: [
      "Inspecții periodice și diagnoză",
      "Mentenanță preventivă planificată",
      "Monitorizare predictivă cu senzori",
      "Intervenții rapide și reparații",
      "Raportare și recomandări de optimizare"
    ],
    schemaLabel: "Mentenanță industrială",
  },
  "componente-mecanice": {
    title: "Proiectare componente mecanice custom",
    text: "Proiectăm și realizăm componente mecanice personalizate pentru aplicații industriale diverse, folosind tehnologii moderne de proiectare și fabricație. Asigurăm calitate, precizie și integrare perfectă în sistemele existente.",
    bullets: [
      "Consultanță tehnică și identificare nevoi",
      "Proiectare CAD 2D/3D avansată",
      "Selecție materiale și tehnologii potrivite",
      "Fabricație și control calitate",
      "Montaj și asistență tehnică la implementare"
    ],
    schemaLabel: "Componente mecanice custom",
  },
  "consultanta-tehnica": {
    title: "Consultanță tehnică, proiectare și instruire personal",
    text: `<p class='mb-3'>PREV-COR TPM oferă servicii complete de consultanță tehnică, proiectare de sisteme industriale și instruire specializată pentru personalul companiilor din industrie.</p>
<p class='mb-3'>Echipa noastră multidisciplinară analizează procesele existente, identifică oportunități de optimizare și propune soluții inovatoare, adaptate fiecărui client.</p>
<p>Asigurăm transfer de know-how, training practic și suport continuu pentru implementarea celor mai moderne tehnologii de automatizare și management industrial.</p>`,
    bullets: [
      "Audit tehnic și evaluare procese industriale",
      "Proiectare sisteme automatizate și linii de producție",
      "Elaborare documentație tehnică și specificații",
      "Instruire personal operare și mentenanță",
      "Consultanță pentru digitalizare și Industry 4.0",
    ],
    schemaLabel: "Flux tehnologic industrial (bandă transportoare)",
  },
  "proiectare-statii-linii": {
    title: "Proiectare și execuție stații și linii industriale",
    text: "Proiectăm și implementăm stații și linii industriale la cheie, optimizate pentru eficiență, siguranță și flexibilitate. Soluțiile noastre integrează tehnologii moderne, automatizări și sisteme de control pentru a răspunde cerințelor specifice fiecărui client.",
    bullets: [
      "Analiză fluxuri de producție și layout",
      "Proiectare 3D și simulare funcțională",
      "Integrare echipamente și automatizări",
      "Testare, punere în funcțiune și instruire",
      "Documentație tehnică completă",
    ],
    schemaLabel: "Schemă linie de producție (bandă, cutii)",
  },
  "integrare-roboti": {
    title: "Integrarea Roboților Industriali",
    text: "Asigurăm integrarea completă a roboților industriali în fluxurile de producție, de la proiectare celulă robotizată până la programare, testare și instruire personal. Automatizarea cu roboți crește productivitatea, calitatea și siguranța proceselor.",
    bullets: [
      "Proiectare celule robotizate",
      "Integrare senzori, conveioare, sisteme de viziune",
      "Programare și optimizare cicluri de lucru",
      "Testare și validare funcțională",
      "Training operatori și mentenanță",
    ],
    schemaLabel: "Celulă robotizată 3D",
  },
  "tablouri-electrice": {
    title: "Producție tablouri electrice",
    text: "Proiectăm și producem tablouri electrice pentru automatizări industriale, distribuție și control. Fiecare tablou este realizat conform normelor, cu componente de calitate și testare riguroasă.",
    bullets: [
      "Proiectare electrică și alegere componente",
      "Execuție și cablare profesională",
      "Testare funcțională și siguranță",
      "Documentație și marcaje conforme",
      "Asistență la montaj și punere în funcțiune",
    ],
    schemaLabel: "Tablou electric 3D",
  },
};

const serviceDetailsEN: Record<string, { title: string; text: string; bullets: string[]; schemaLabel: string }> = {
  "modernizare-retrofit": {
    title: "Installation Modernization and Equipment Retrofit",
    text: "We modernize industrial installations and perform equipment retrofits, increasing efficiency, safety and lifespan. We offer customized solutions for integrating new technologies into existing systems, with direct impact on cost reduction and productivity increase.",
    bullets: [
      "Technical analysis and installation audit",
      "Design modernization solutions",
      "Automation and new sensor integration",
      "Energy consumption optimization",
      "Testing, validation and personnel training"
    ],
    schemaLabel: "Industrial modernization and retrofit",
  },
  "relocare-linii": {
    title: "Production Line Relocation",
    text: "We provide complete relocation of production lines, with detailed planning, disassembly, transport, assembly and recommissioning. We minimize downtime and guarantee rapid resumption of production at the new location.",
    bullets: [
      "Relocation project planning and management",
      "Professional equipment disassembly",
      "Safe and efficient transport",
      "Assembly and reconfiguration at destination",
      "Testing, commissioning and post-relocation support"
    ],
    schemaLabel: "Industrial line relocation",
  },
  "mentenanta-service": {
    title: "Preventive, Predictive Maintenance and Industrial Equipment Service",
    text: "We offer complete preventive, predictive maintenance services and rapid interventions for industrial equipment. We prevent costly breakdowns and ensure optimal operation of installations.",
    bullets: [
      "Periodic inspections and diagnosis",
      "Planned preventive maintenance",
      "Predictive monitoring with sensors",
      "Rapid interventions and repairs",
      "Reporting and optimization recommendations"
    ],
    schemaLabel: "Industrial maintenance",
  },
  "componente-mecanice": {
    title: "Custom Mechanical Component Design",
    text: "We design and manufacture customized mechanical components for various industrial applications, using modern design and manufacturing technologies. We ensure quality, precision and perfect integration into existing systems.",
    bullets: [
      "Technical consultancy and needs identification",
      "Advanced 2D/3D CAD design",
      "Material and technology selection",
      "Manufacturing and quality control",
      "Assembly and technical support for implementation"
    ],
    schemaLabel: "Custom mechanical components",
  },
  "consultanta-tehnica": {
    title: "Technical Consultancy, Design and Personnel Training",
    text: `<p class='mb-3'>PREV-COR TPM offers complete technical consultancy services, industrial system design and specialized training for company personnel in industry.</p>
<p class='mb-3'>Our multidisciplinary team analyzes existing processes, identifies optimization opportunities and proposes innovative solutions, adapted to each client.</p>
<p>We ensure know-how transfer, practical training and continuous support for implementing the most modern automation and industrial management technologies.</p>`,
    bullets: [
      "Technical audit and industrial process evaluation",
      "Design automated systems and production lines",
      "Develop technical documentation and specifications",
      "Train operation and maintenance personnel",
      "Consultancy for digitalization and Industry 4.0",
    ],
    schemaLabel: "Industrial technological flow (conveyor belt)",
  },
  "proiectare-statii-linii": {
    title: "Design and Execution of Industrial Stations and Lines",
    text: "We design and implement turnkey industrial stations and lines, optimized for efficiency, safety and flexibility. Our solutions integrate modern technologies, automation and control systems to meet each client's specific requirements.",
    bullets: [
      "Production flow and layout analysis",
      "3D design and functional simulation",
      "Equipment and automation integration",
      "Testing, commissioning and training",
      "Complete technical documentation",
    ],
    schemaLabel: "Production line diagram (belt, boxes)",
  },
  "integrare-roboti": {
    title: "Industrial Robot Integration",
    text: "We provide complete integration of industrial robots into production flows, from robotic cell design to programming, testing and personnel training. Robot automation increases productivity, quality and process safety.",
    bullets: [
      "Robotic cell design",
      "Sensor, conveyor, vision system integration",
      "Programming and work cycle optimization",
      "Functional testing and validation",
      "Operator training and maintenance",
    ],
    schemaLabel: "3D robotic cell",
  },
  "tablouri-electrice": {
    title: "Electrical Panel Production",
    text: "We design and produce electrical panels for industrial automation, distribution and control. Each panel is made according to standards, with quality components and rigorous testing.",
    bullets: [
      "Electrical design and component selection",
      "Professional execution and wiring",
      "Functional and safety testing",
      "Compliant documentation and markings",
      "Assembly assistance and commissioning",
    ],
    schemaLabel: "3D electrical panel",
  },
};

export default function ServiceDetail() {
  const params = useParams();
  const { language } = useLanguage();
  const serviceSlug = typeof params?.service === "string" ? params.service : Array.isArray(params?.service) ? params.service[0] : undefined;
  const serviceDetails = language === "en" ? serviceDetailsEN : serviceDetailsRO;
  const details = serviceSlug ? serviceDetails[serviceSlug] : undefined;
  
  const txt = {
    backToServices: language === "en" ? "Back to Our Services" : "Înapoi la Serviciile noastre",
    defaultTitle: language === "en" ? "Industrial Service" : "Serviciu industrial",
    defaultText: language === "en" ? "Professional service description will appear here." : "Descriere profesională a serviciului va apărea aici.",
  };
  // Iconițe pentru fiecare serviciu (poate fi extins)
  const benefitIcons: Record<string, string[]> = {
  "modernizare-retrofit": ["🔄", "⚡", "🛠️", "📈", "✅"],
  "relocare-linii": ["🚚", "🧰", "📦", "🏗️", "🔄"],
  "mentenanta-service": ["🛡️", "🔍", "📊", "⚙️", "📑"],
  "componente-mecanice": ["⚙️", "📐", "🔩", "🏭", "🛠️"],
    "consultanta-tehnica": ["🔍", "🛠️", "📄", "🎓", "💡"],
    "proiectare-statii-linii": ["📊", "🖥️", "⚙️", "✅", "📚"],
    "integrare-roboti": ["🤖", "🎯", "💻", "🔬", "👨‍🏫"],
    "tablouri-electrice": ["📐", "🔌", "🧲", "📑", "🛠️"],
  };
  const icons = serviceSlug && benefitIcons[serviceSlug] ? benefitIcons[serviceSlug] : ["⭐"];

  return (
    <main className="container mx-auto py-10 px-4">
      <div className="mb-4">
        <a href="/services" className="inline-flex items-center text-blue-600 hover:underline font-medium group">
          <span className="mr-2 text-xl group-hover:-translate-x-1 transition-transform">←</span>
          {txt.backToServices}
        </a>
      </div>
      <h1 className="text-3xl font-bold mb-4 text-blue-700">{details ? details.title : txt.defaultTitle}</h1>
      {serviceSlug === "consultanta-tehnica" && details?.text ? (
        <div className="mb-6 text-lg text-gray-700" dangerouslySetInnerHTML={{ __html: details.text }} />
      ) : (
        <p className="mb-6 text-lg text-gray-700">{details ? details.text : txt.defaultText}</p>
      )}
      {details && details.bullets && (
        <div className="mb-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {details.bullets.map((b: string, idx: number) => (
            <div key={b} className="flex flex-col items-center bg-white rounded-xl shadow-md p-6 border border-blue-100 hover:shadow-lg transition">
              <span className="text-4xl mb-2">{icons[idx % icons.length]}</span>
              <span className="font-semibold text-blue-700 text-center mb-1">{b.split(' ')[0]}</span>
              <span className="text-gray-600 text-center text-sm">{b}</span>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
