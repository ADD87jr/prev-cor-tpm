import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

// System prompt care definește comportamentul AI-ului
function getSystemPrompt(products: any[], language: string) {
  const productList = products
    .slice(0, 100) // max 100 produse pentru context
    .map((p) => {
      const name = language === "en" && p.nameEn ? p.nameEn : p.name;
      const desc = language === "en" && p.descriptionEn ? p.descriptionEn : p.description;
      return `- [ID:${p.id}] ${name} | ${p.domain} / ${p.type} | ${p.price} RON | Stoc: ${p.stock > 0 ? p.stock : "la cerere"} | ${desc?.substring(0, 120)}`;
    })
    .join("\n");

  if (language === "en") {
    return `You are the AI assistant of PREV-COR TPM, a company specialized in industrial automation solutions.

ROLE: Help customers choose the right products and services for their industrial automation needs.

COMPANY PROFILE:
- S.C. PREV-COR TPM S.R.L. - Industrial automation, electrical equipment, sensors, PLCs, protection systems
- Services: consulting, design, installation, maintenance
- Phone: 0732 935 623 | Email: office@prevcortpm.ro

AVAILABLE PRODUCTS:
${productList}

INSTRUCTIONS:
1. Understand the customer's needs (industry, application, technical requirements)
2. Recommend specific products from the catalog above using their exact names
3. Explain WHY each product fits their needs
4. If the customer needs something not in the catalog, suggest contacting us at office@prevcortpm.ro
5. Always be helpful, professional, and concise
6. When recommending products, include the product link format: /shop/[ID]
7. If asked about prices, always mention that prices are without VAT
8. For complex projects, recommend requesting a custom quote via the contact page
9. Answer ONLY about products, services, and industrial automation topics
10. Do not discuss competitors or non-related topics`;
  }

  return `Ești asistentul AI al companiei PREV-COR TPM, specializată în soluții de automatizare industrială.

ROL: Ajuți clienții să aleagă produsele și serviciile potrivite pentru nevoile lor de automatizare industrială.

PROFIL COMPANIE:
- S.C. PREV-COR TPM S.R.L. - Automatizări industriale, echipamente electrice, senzori, PLC-uri, sisteme de protecție
- Servicii: consultanță, proiectare, instalare, mentenanță
- Telefon: 0732 935 623 | Email: office@prevcortpm.ro

PRODUSE DISPONIBILE:
${productList}

INSTRUCȚIUNI:
1. Înțelege nevoile clientului (industrie, aplicație, cerințe tehnice)
2. Recomandă produse specifice din catalogul de mai sus, folosind numele exact
3. Explică DE CE fiecare produs se potrivește nevoilor lor
4. Dacă clientul are nevoie de ceva ce nu e în catalog, sugerează contactarea la office@prevcortpm.ro
5. Fii mereu util, profesional și concis
6. Când recomanzi produse, include link-ul: /shop/[ID]
7. Dacă e întrebat despre prețuri, menționează că sunt fără TVA
8. Pentru proiecte complexe, recomandă cererea unei oferte personalizate prin pagina de contact
9. Răspunde DOAR despre produse, servicii și automatizare industrială
10. Nu discuta despre concurență sau subiecte nerelevante`;
}

export async function POST(req: NextRequest) {
  try {
    const { messages, language = "ro" } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Mesaj lipsă" }, { status: 400 });
    }

    // Limitează la ultimele 10 mesaje pentru context
    const recentMessages = messages.slice(-10);

    // Încarcă produsele pentru context
    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        nameEn: true,
        price: true,
        description: true,
        descriptionEn: true,
        type: true,
        domain: true,
        stock: true,
        brand: true,
        manufacturer: true,
        onDemand: true,
      },
    });

    // Dacă nu avem API key Gemini, folosim răspunsuri inteligente locale
    if (!GEMINI_API_KEY) {
      const result = getLocalResponse(recentMessages, products, language);
      return NextResponse.json({ 
        reply: result.reply, 
        source: "local",
        recommendedProducts: result.recommendedProducts 
      });
    }

    // Apel Google Gemini API (gratuit)
    const systemPrompt = getSystemPrompt(products, language);

    const geminiMessages = [
      ...recentMessages.map((m: any) => ({
        role: m.isUser ? "user" : "model",
        parts: [{ text: m.text }],
      })),
    ];

    // Adaugă system prompt la primul mesaj user
    if (geminiMessages.length > 0 && geminiMessages[0].role === "user") {
      geminiMessages[0].parts[0].text = `${systemPrompt}\n\nUser message: ${geminiMessages[0].parts[0].text}`;
    } else {
      geminiMessages.unshift({
        role: "user",
        parts: [{ text: systemPrompt + "\n\nSalut!" }],
      });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: geminiMessages,
          generationConfig: {
            maxOutputTokens: 800,
            temperature: 0.7,
          },
        }),
      }
    );

    if (!response.ok) {
      console.error("[AI CHAT] Gemini error:", response.status);
      const result = getLocalResponse(recentMessages, products, language);
      return NextResponse.json({ 
        reply: result.reply, 
        source: "local-fallback",
        recommendedProducts: result.recommendedProducts 
      });
    }

    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || (language === "en" 
      ? "Sorry, I couldn't process your request. Please try again."
      : "Scuze, nu am putut procesa cererea. Încearcă din nou.");

    // Extrage ID-uri de produse menționate în răspuns și returnează date pentru carduri
    const productIdMatches = reply.match(/\/shop\/(\d+)/g) || [];
    const productIds = productIdMatches.map((m: string) => parseInt(m.replace("/shop/", ""))).filter((id: number) => !isNaN(id));
    
    let recommendedProducts: any[] = [];
    if (productIds.length > 0) {
      recommendedProducts = products
        .filter((p) => productIds.includes(p.id))
        .slice(0, 4)
        .map((p) => ({
          id: p.id,
          name: language === "en" && p.nameEn ? p.nameEn : p.name,
          price: p.price,
          image: `/products/${p.id}.webp`,
          stock: p.stock,
          onDemand: p.onDemand
        }));
    }

    return NextResponse.json({ reply, source: "gemini", recommendedProducts });
  } catch (error) {
    console.error("[AI CHAT] Error:", error);
    return NextResponse.json(
      { error: "Eroare server" },
      { status: 500 }
    );
  }
}

// Răspunsuri inteligente locale (fără OpenAI) - bazate pe keyword matching
function getLocalResponse(messages: any[], products: any[], language: string): { reply: string; recommendedProducts: any[] } {
  const lastMessage = messages[messages.length - 1]?.text?.toLowerCase() || "";
  const lang = language === "en" ? "en" : "ro";

  // Caută produse relevante bazat pe cuvinte cheie
  const keywords = lastMessage
    .replace(/[?!.,]/g, "")
    .split(/\s+/)
    .filter((w: string) => w.length > 2);

  const matchedProducts = products
    .filter((p) => {
      const searchText = `${p.name} ${p.nameEn || ""} ${p.description} ${p.type} ${p.domain} ${p.brand || ""} ${p.manufacturer || ""}`.toLowerCase();
      return keywords.some((kw: string) => searchText.includes(kw));
    })
    .slice(0, 5);

  // Helper pentru a formata produsele recomandate
  const formatRecommended = (prods: any[]) => prods.slice(0, 4).map((p) => ({
    id: p.id,
    name: lang === "en" && p.nameEn ? p.nameEn : p.name,
    price: p.price,
    image: `/products/${p.id}.webp`,
    stock: p.stock,
    onDemand: p.onDemand
  }));

  // Salut / greeting
  if (lastMessage.match(/^(salut|buna|hello|hi|hey|bună)/i)) {
    return {
      reply: lang === "en"
        ? "Hello! I'm the PREV-COR TPM AI assistant. How can I help you? Tell me what you need for your project and I'll recommend the best products."
        : "Bună ziua! Sunt asistentul AI PREV-COR TPM. Cu ce vă pot ajuta? Spuneți-mi ce aveți nevoie pentru proiectul dumneavoastră și vă recomand cele mai potrivite produse.",
      recommendedProducts: []
    };
  }

  // Întrebare despre preț
  if (lastMessage.match(/pret|pric|cost|cat costa|how much/i)) {
    if (matchedProducts.length > 0) {
      const list = matchedProducts
        .map((p) => `• ${lang === "en" && p.nameEn ? p.nameEn : p.name} — ${p.price} RON (fără TVA) → [Vezi produs](/shop/${p.id})`)
        .join("\n");
      return {
        reply: lang === "en"
          ? `Here are the prices for matching products (without VAT):\n${list}\n\nFor custom quotes, contact us at office@prevcortpm.ro`
          : `Iată prețurile produselor găsite (fără TVA):\n${list}\n\nPentru oferte personalizate, contactați-ne la office@prevcortpm.ro`,
        recommendedProducts: formatRecommended(matchedProducts)
      };
    }
  }

  // Întrebare despre stoc / disponibilitate
  if (lastMessage.match(/stoc|stock|disponi|availab/i)) {
    if (matchedProducts.length > 0) {
      const list = matchedProducts
        .map((p) => {
          const status = p.stock > 0 ? `${p.stock} buc` : p.onDemand ? "pe comandă" : "indisponibil";
          return `• ${lang === "en" && p.nameEn ? p.nameEn : p.name} — ${status}`;
        })
        .join("\n");
      return {
        reply: lang === "en"
          ? `Stock availability:\n${list}`
          : `Disponibilitate stoc:\n${list}`,
        recommendedProducts: formatRecommended(matchedProducts)
      };
    }
  }

  // Întrebare despre servicii
  if (lastMessage.match(/servic|instalare|mentenant|proiect|consult/i)) {
    return {
      reply: lang === "en"
        ? "PREV-COR TPM offers complete services:\n• **Consulting** — analysis and recommendations for your project\n• **Design** — custom automation solutions\n• **Installation** — professional on-site installation\n• **Maintenance** — preventive and corrective maintenance\n\nContact us at 0732 935 623 or office@prevcortpm.ro for a free consultation!"
        : "PREV-COR TPM oferă servicii complete:\n• **Consultanță** — analiză și recomandări pentru proiectul tău\n• **Proiectare** — soluții personalizate de automatizare\n• **Instalare** — montaj profesional la sediul clientului\n• **Mentenanță** — întreținere preventivă și corectivă\n\nContactează-ne la 0732 935 623 sau office@prevcortpm.ro pentru o consultație gratuită!",
      recommendedProducts: []
    };
  }

  // Contact
  if (lastMessage.match(/contact|telefon|phone|email|suna|call/i)) {
    return {
      reply: lang === "en"
        ? "You can reach us:\n📞 **Phone**: 0732 935 623\n📧 **Email**: office@prevcortpm.ro\n🌐 **Website**: [Contact page](/contact)\n🕐 Monday - Friday: 08:00 - 17:00"
        : "Ne puteți contacta:\n📞 **Telefon**: 0732 935 623\n📧 **Email**: office@prevcortpm.ro\n🌐 **Website**: [Pagina de contact](/contact)\n🕐 Luni - Vineri: 08:00 - 17:00",
      recommendedProducts: []
    };
  }

  // Dacă am găsit produse relevante
  if (matchedProducts.length > 0) {
    const list = matchedProducts
      .map((p) => `• **${lang === "en" && p.nameEn ? p.nameEn : p.name}** — ${p.price} RON → [Vezi](/shop/${p.id})`)
      .join("\n");
    return {
      reply: lang === "en"
        ? `Based on your request, I recommend:\n${list}\n\nWould you like more details about any of these products?`
        : `Bazat pe cererea ta, îți recomand:\n${list}\n\nDorești mai multe detalii despre vreunul din aceste produse?`,
      recommendedProducts: formatRecommended(matchedProducts)
    };
  }

  // Răspuns generic
  return {
    reply: lang === "en"
      ? "I'd be happy to help! Could you tell me more about:\n• What **industry** are you in? (manufacturing, food, pharma, etc.)\n• What **application** do you need automation for?\n• Any specific **technical requirements**?\n\nThis way I can recommend the best products for your needs."
      : "Cu drag vă ajut! Puteți să-mi spuneți mai multe despre:\n• În ce **industrie** activați? (producție, alimentar, farma, etc.)\n• Pentru ce **aplicație** aveți nevoie de automatizare?\n• Aveți **cerințe tehnice** specifice?\n\nAstfel vă pot recomanda cele mai potrivite produse.",
    recommendedProducts: []
  };
}
