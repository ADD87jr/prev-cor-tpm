import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyDPMtQTjaruCtql9qAFqcavAzKwXRdjsnA";

// GET - Sugestii de articole bazate pe produse și căutări
export async function GET() {
  try {
    // Obține produsele populare și categoriile
    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        type: true,
        domain: true,
        manufacturer: true
      },
      take: 50
    });

    // Grupare pe tipuri și domenii
    const types = [...new Set(products.map(p => p.type).filter(Boolean))];
    const domains = [...new Set(products.map(p => p.domain).filter(Boolean))];
    const manufacturers = [...new Set(products.map(p => p.manufacturer).filter(Boolean))];

    // Sugestii de topicuri pentru articole
    const topicSuggestions = [
      ...types.slice(0, 5).map(t => `Ghid complet: Cum să alegi ${t} potrivit`),
      ...types.slice(0, 3).map(t => `Top 5 greșeli la instalarea ${t}`),
      ...manufacturers.slice(0, 3).map(m => `Review: Produse ${m} - Avantaje și dezavantaje`),
      ...domains.slice(0, 3).map(d => `Automatizări în ${d}: Tendințe 2026`),
      "Cum să reduci costurile cu automatizări industriale",
      "Întreținerea preventivă a echipamentelor industriale",
      "Comparație: PLC vs Microcontroller în aplicații industriale"
    ];

    return NextResponse.json({
      suggestedTopics: topicSuggestions,
      categories: {
        types: types.slice(0, 10),
        domains: domains.slice(0, 10),
        manufacturers: manufacturers.slice(0, 10)
      },
      tip: "POST cu { topic, keywords, length } pentru a genera articolul complet"
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Generează articol complet
export async function POST(request: NextRequest) {
  try {
    const { topic, keywords, length, includeProducts, tone } = await request.json();

    if (!topic) {
      return NextResponse.json({ error: "topic obligatoriu" }, { status: 400 });
    }

    // Caută produse relevante pentru articol
    let relatedProducts: any[] = [];
    if (includeProducts) {
      const searchTerms = topic.split(" ").filter((w: string) => w.length > 4).slice(0, 3);
      
      relatedProducts = await prisma.product.findMany({
        where: {
          OR: searchTerms.flatMap((term: string) => [
            { name: { contains: term } },
            { type: { contains: term } },
            { domain: { contains: term } }
          ])
        },
        select: {
          id: true,
          name: true,
          price: true,
          type: true
        },
        take: 5
      });
    }

    const wordCount = length === "short" ? "500-800" : length === "long" ? "1500-2000" : "800-1200";
    const articleTone = tone || "profesional, tehnic, informativ";

    const prompt = `Ești expert în automatizări industriale și copywriter SEO pentru blogul PREV-COR TPM.

TOPIC: ${topic}

CUVINTE CHEIE PENTRU SEO: ${keywords?.join(", ") || "automatizări industriale, PLC, senzori, HMI"}

LUNGIME: ${wordCount} cuvinte

TON: ${articleTone}

${relatedProducts.length > 0 ? `
PRODUSE DE MENȚIONAT (link-uri interne):
${relatedProducts.map(p => `- ${p.name} (${p.price} RON)`).join("\n")}
` : ""}

Scrie un articol complet pentru blog, optimizat SEO.
Include:
- Titlu captivant (H1)
- Meta descriere (155 caractere)
- Introducere care captează atenția
- Subtitluri (H2, H3) pentru structură
- Paragrafe informative cu date tehnice
- Bullet points pentru claritate
- Concluzie cu call-to-action

Articolul trebuie să fie în ROMÂNĂ și să poziționeze PREV-COR TPM ca expert.

Returnează JSON:
{
  "title": "Titlul articolului",
  "metaDescription": "Meta descriere SEO, max 155 caractere",
  "slug": "url-slug-articol",
  "content": "Conținutul complet HTML cu headings, paragrafe, liste",
  "readingTime": "5 min",
  "tags": ["tag1", "tag2"],
  "relatedProductIds": [1, 2, 3]
}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 4000, temperature: 0.7 }
        })
      }
    );

    if (!response.ok) {
      return NextResponse.json({ error: "AI indisponibil" }, { status: 500 });
    }

    const data = await response.json();
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    let result;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      }
    } catch {
      // Fallback - returnează textul brut
      result = {
        title: topic,
        content: responseText,
        error: "Nu s-a putut structura răspunsul"
      };
    }

    return NextResponse.json({
      success: true,
      article: result,
      relatedProducts: relatedProducts.map(p => ({
        id: p.id,
        name: p.name,
        price: p.price
      }))
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
