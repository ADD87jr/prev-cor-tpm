"use client";

import Link from "next/link";

interface AIFeature {
  name: string;
  description: string;
  path: string;
  icon: string;
  category: "analiza" | "automatizare" | "generare" | "predictie" | "comunicare";
  isNew?: boolean;
}

const aiFeatures: AIFeature[] = [
  // AI STUDIO - Prima categorie (top)
  { name: "AI Studio", description: "Generează soluții tehnice și oferte pentru proiecte", path: "/admin/ai-studio", icon: "🎨", category: "generare", isNew: true },
  { name: "Solicitări Oferte", description: "Gestionează cererile de ofertă de la clienți", path: "/admin/solicitari", icon: "📬", category: "comunicare", isNew: true },
  
  // ANALIZĂ
  { name: "Analiză Prețuri", description: "Compară prețurile cu piața și optimizează marjele", path: "/admin/analiza-preturi", icon: "💲", category: "analiza" },
  { name: "Analiză Competitori", description: "Compară prețurile cu concurența", path: "/admin/analiza-competitori", icon: "🔍", category: "analiza" },
  { name: "Analiză Reviews", description: "Sentiment analysis și insights din recenzii", path: "/admin/analiza-reviews", icon: "⭐", category: "analiza" },
  { name: "Segmentare Clienți", description: "Grupează clienții după comportament", path: "/admin/segmentare-clienti", icon: "👥", category: "analiza" },
  { name: "Audit Catalog", description: "Verifică calitatea datelor produselor", path: "/admin/audit-catalog", icon: "📋", category: "analiza" },
  { name: "Detectare Fraudă", description: "Identifică comenzi suspecte", path: "/admin/detectie-frauda", icon: "🚨", category: "analiza" },
  { name: "AI Fraud Detection", description: "Detectare AI a comenzilor frauduloase", path: "/admin/fraud-detection", icon: "🛡️", category: "analiza", isNew: true },
  { name: "Monitorizare Competitori", description: "Compară prețurile cu competiția în timp real", path: "/admin/competitori", icon: "👁️", category: "analiza" },
  { name: "Analiză Sezonalitate", description: "Detectează pattern-uri sezoniere în vânzări", path: "/admin/sezonalitate", icon: "📅", category: "analiza" },
  { name: "Lead Scoring AI", description: "Clasifică și scorifică clienții potențiali", path: "/admin/lead-scoring", icon: "📊", category: "analiza" },
  { name: "Analiză Coșuri AI", description: "Strategii AI pentru coșuri abandonate", path: "/admin/analiza-cosuri-ai", icon: "🛒", category: "analiza" },
  
  // AUTOMATIZARE
  { name: "Auto Promovare", description: "Generează campanii de marketing", path: "/admin/auto-promovare", icon: "📣", category: "automatizare" },
  { name: "Auto Reduceri", description: "Optimizează prețurile dinamic", path: "/admin/auto-reduceri", icon: "💰", category: "automatizare" },
  { name: "Dynamic Pricing", description: "Prețuri dinamice bazate pe cerere", path: "/admin/dynamic-pricing", icon: "📊", category: "automatizare" },
  { name: "Cross-Sell", description: "Recomandă produse complementare", path: "/admin/crosssell", icon: "🔗", category: "automatizare" },
  { name: "Bundling Produse", description: "Creează pachete profitabile", path: "/admin/bundling", icon: "📦", category: "automatizare" },
  { name: "AI Bundle Builder", description: "Generator AI pachete complementare", path: "/admin/bundle-builder", icon: "🎁", category: "automatizare", isNew: true },
  { name: "AI Usage Monitor", description: "Monitorizare rate limits și cache AI", path: "/admin/ai-usage", icon: "📊", category: "automatizare", isNew: true },
  { name: "Prioritizare Comenzi", description: "Prioritizează comenzile după urgență", path: "/admin/prioritizare-comenzi", icon: "🎯", category: "automatizare" },
  { name: "Optimizare Livrare", description: "Optimizează rutele de livrare", path: "/admin/optimizare-livrare", icon: "🚚", category: "automatizare" },
  
  // GENERARE
  { name: "Descoperă Produse", description: "Găsește produse noi pentru catalog", path: "/admin/descopera-produse", icon: "🔍", category: "generare" },
  { name: "Generare Imagini", description: "Creează imagini produse cu AI", path: "/admin/generare-imagini", icon: "🖼️", category: "generare" },
  { name: "Generare PDF", description: "Creează fișe tehnice PDF", path: "/admin/generare-pdf", icon: "📄", category: "generare" },
  { name: "Blog Generator", description: "Generează articole de blog", path: "/admin/blog-generator", icon: "✍️", category: "generare" },
  { name: "Generator Contracte", description: "Creează contracte B2B personalizate", path: "/admin/generator-contracte", icon: "📝", category: "generare" },
  { name: "AI SEO", description: "Optimizează meta tags și descrieri", path: "/admin/ai-seo", icon: "🔎", category: "generare" },
  { name: "Traduceri AI", description: "Traduce conținut automat", path: "/admin/traduceri-ai", icon: "🌍", category: "generare" },
  { name: "OCR Documente", description: "Extrage date din facturi/documente", path: "/admin/ocr-documente", icon: "📸", category: "generare" },
  { name: "AI Image Search", description: "Căutare produse prin descriere/poză", path: "/admin/cautare-imagine", icon: "🔍", category: "generare", isNew: true },
  { name: "Generator Oferte PDF", description: "Creează oferte personalizate cu AI", path: "/admin/generator-oferte", icon: "📋", category: "generare" },
  { name: "Generator Video AI", description: "Creează scripturi video pentru produse", path: "/admin/video-generator", icon: "🎬", category: "generare" },
  { name: "Traduceri Multilingve", description: "Traduce în 10 limbi europene", path: "/admin/multilingual", icon: "🌐", category: "generare" },
  
  // PREDICȚIE
  { name: "AI Inventory Forecast", description: "Predicție AI avansată stoc și aprovizionare", path: "/admin/predictie-stoc", icon: "📦", category: "predictie", isNew: true },
  { name: "Forecast Cerere", description: "Prognozează vânzările viitoare", path: "/admin/forecast-cerere", icon: "📉", category: "predictie" },
  { name: "Clasificare Produse", description: "Clasifică automat produsele", path: "/admin/clasificare", icon: "🏷️", category: "predictie" },
  { name: "Alternative Produse", description: "Găsește produse alternative", path: "/admin/alternative", icon: "🔄", category: "predictie" },
  { name: "Predicție Retururi", description: "Prezice comenzi cu risc de retur", path: "/admin/predictie-retururi", icon: "🔮", category: "predictie" },
  
  // COMUNICARE
  { name: "Răspunsuri Tehnice", description: "Răspunde la întrebări tehnice", path: "/admin/raspunsuri-tehnice", icon: "💬", category: "comunicare" },
  { name: "Răspuns Ofertă", description: "Generează răspunsuri la cereri de ofertă", path: "/admin/raspuns-oferta", icon: "📧", category: "comunicare" },
  { name: "Auto Răspuns Email", description: "Răspunsuri automate la email-uri", path: "/admin/auto-raspuns-email", icon: "✉️", category: "comunicare" },
  { name: "Email Follow-up", description: "Generează email-uri de follow-up", path: "/admin/email-followup", icon: "📨", category: "comunicare" },
  { name: "Notificări Personalizate", description: "Trimite notificări targetate", path: "/admin/notificari-personalizate", icon: "🔔", category: "comunicare" },
  { name: "Negociere Furnizori", description: "Strategii de negociere cu furnizorii", path: "/admin/negociere-furnizori", icon: "🤝", category: "comunicare" },
  { name: "Chatbot AI", description: "Asistent conversațional pentru clienți", path: "/admin/chatbot-ai", icon: "🤖", category: "comunicare", isNew: true },
  { name: "Asistent Tehnic RAG", description: "Răspunsuri tehnice bazate pe catalog", path: "/admin/asistent-tehnic", icon: "🧠", category: "comunicare", isNew: true },
  
  // NOU - 5 funcții extra
  { name: "Notificări Inteligente", description: "Alerte automate pentru acțiuni importante", path: "/admin/smart-notifications", icon: "🔔", category: "automatizare", isNew: true },
  { name: "Comparație Produse AI", description: "Compară produse și primește recomandări", path: "/admin/product-comparison", icon: "⚖️", category: "analiza", isNew: true },
  { name: "Predictor Garanții", description: "Monitorizare garanții și mentenanță preventivă", path: "/admin/warranty-predictor", icon: "🛡️", category: "predictie", isNew: true },
  { name: "Knowledge Base AI", description: "Bază de cunoștințe generată automat", path: "/admin/knowledge-base", icon: "📚", category: "generare", isNew: true },
  { name: "Negociere Oferte AI", description: "Strategii de negociere personalizate per client", path: "/admin/quote-negotiation", icon: "💬", category: "comunicare", isNew: true },
  
  // NOU - 5 funcții batch 10
  { name: "Detectare Anomalii", description: "Identifică automat probleme în date", path: "/admin/anomaly-detection", icon: "🔍", category: "analiza", isNew: true },
  { name: "Predictor Churn", description: "Prezice clienții cu risc de plecare", path: "/admin/churn-predictor", icon: "📉", category: "predictie", isNew: true },
  { name: "Analizator Facturi", description: "Extrage date din facturi cu AI", path: "/admin/invoice-analyzer", icon: "📄", category: "automatizare", isNew: true },
  { name: "Recomandări Produse", description: "Widget recomandări personalizate", path: "/admin/product-recommender", icon: "🎯", category: "automatizare", isNew: true },
  { name: "Evaluator Furnizori", description: "Scorifică și evaluează furnizorii", path: "/admin/supplier-evaluator", icon: "🏭", category: "analiza", isNew: true },
  
  // NOU - 15 funcții batch 11-12-13 (AI avansat)
  // Priority (Business Impact)
  { name: "Customer LTV", description: "Calculează valoarea pe viață a clienților", path: "/admin/customer-ltv", icon: "💎", category: "analiza", isNew: true },
  { name: "Reorder Predictor", description: "Prezice când clienții vor recomanda", path: "/admin/reorder-predictor", icon: "🔄", category: "predictie", isNew: true },
  { name: "Stock Alerts", description: "Alerte inteligente bazate pe viteză vânzare", path: "/admin/stock-alerts", icon: "📦", category: "automatizare", isNew: true },
  { name: "Revenue Forecast", description: "Predicție venituri cu scenarii", path: "/admin/revenue-forecast", icon: "📈", category: "predictie", isNew: true },
  { name: "Email Optimizer", description: "Optimizare campanii email cu AI", path: "/admin/email-optimizer", icon: "📧", category: "comunicare", isNew: true },
  
  // Experimental
  { name: "Voice Search", description: "Căutare produse prin comandă vocală", path: "/admin/voice-search", icon: "🎤", category: "generare", isNew: true },
  { name: "Product Q&A", description: "Bot Q&A pentru întrebări tehnice", path: "/admin/product-qa", icon: "❓", category: "comunicare", isNew: true },
  { name: "Social Media", description: "Generator postări social media", path: "/admin/social-media", icon: "📱", category: "generare", isNew: true },
  { name: "Price Elasticity", description: "Analiză sensibilitate la preț", path: "/admin/price-elasticity", icon: "📊", category: "analiza", isNew: true },
  { name: "Competitor Tracker", description: "Monitorizare prețuri competitori", path: "/admin/competitor-tracker", icon: "🔍", category: "analiza", isNew: true },
  
  // Futuristic
  { name: "Demand Sensing", description: "Detectare cerere din semnale externe", path: "/admin/demand-sensing", icon: "📡", category: "predictie", isNew: true },
  { name: "Carbon Footprint", description: "Monitorizare emisii CO2", path: "/admin/carbon-footprint", icon: "🌿", category: "analiza", isNew: true },
  { name: "Catalog Personalizat", description: "PDF-uri personalizate per client", path: "/admin/personalized-catalog", icon: "📖", category: "generare", isNew: true },
  { name: "Market Expansion", description: "Oportunități extindere piață", path: "/admin/market-expansion", icon: "🚀", category: "predictie", isNew: true },
  { name: "Supplier Negotiation", description: "Strategii negociere furnizori AI", path: "/admin/supplier-negotiation", icon: "🤝", category: "comunicare", isNew: true },
];

const categoryNames: Record<string, { name: string; color: string }> = {
  analiza: { name: "📊 Analiză & Insights", color: "border-blue-500" },
  automatizare: { name: "⚡ Automatizare", color: "border-purple-500" },
  generare: { name: "✨ Generare Conținut", color: "border-teal-500" },
  predictie: { name: "🔮 Predicție & Clasificare", color: "border-orange-500" },
  comunicare: { name: "💬 Comunicare & Vânzări", color: "border-pink-500" },
};

export default function AIHubPage() {
  const groupedFeatures = aiFeatures.reduce((acc, feature) => {
    if (!acc[feature.category]) acc[feature.category] = [];
    acc[feature.category].push(feature);
    return acc;
  }, {} as Record<string, AIFeature[]>);

  const newFeaturesCount = aiFeatures.filter(f => f.isNew).length;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">🤖 AI Hub</h1>
        <p className="text-gray-600">
          {aiFeatures.length} funcționalități AI pentru automatizarea magazinului
        </p>
        {newFeaturesCount > 0 && (
          <p className="text-sm text-pink-600 mt-1">
            🆕 {newFeaturesCount} funcționalități noi adăugate
          </p>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {Object.entries(categoryNames).map(([key, { name, color }]) => (
          <div key={key} className={`bg-white rounded-lg shadow p-4 border-l-4 ${color}`}>
            <p className="text-2xl font-bold text-gray-800">{groupedFeatures[key]?.length || 0}</p>
            <p className="text-xs text-gray-500">{name}</p>
          </div>
        ))}
      </div>

      {/* Categories */}
      {Object.entries(categoryNames).map(([category, { name, color }]) => (
        <div key={category} className="mb-8">
          <h2 className={`text-xl font-bold text-gray-700 mb-4 pb-2 border-b-2 ${color}`}>
            {name}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groupedFeatures[category]?.map((feature) => (
              <Link key={feature.path} href={feature.path}>
                <div className="bg-white rounded-lg shadow p-5 hover:shadow-lg transition-shadow cursor-pointer border border-gray-100 hover:border-gray-300 relative">
                  {feature.isNew && (
                    <span className="absolute top-2 right-2 bg-pink-500 text-white text-xs px-2 py-0.5 rounded-full">
                      NOU
                    </span>
                  )}
                  <div className="flex items-start gap-4">
                    <div className="text-3xl">{feature.icon}</div>
                    <div>
                      <h3 className="font-semibold text-gray-800">{feature.name}</h3>
                      <p className="text-sm text-gray-500 mt-1">{feature.description}</p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}

      {/* Footer */}
      <div className="text-center text-gray-400 text-sm mt-8">
        Powered by Google Gemini 2.5 Flash
      </div>
    </div>
  );
}
