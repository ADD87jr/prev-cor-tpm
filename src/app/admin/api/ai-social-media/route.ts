import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const GEMINI_API_KEY = "AIzaSyDPMtQTjaruCtql9qAFqcavAzKwXRdjsnA";

export async function POST(req: Request) {
  try {
    const { productId, platform, style, includeOffer } = await req.json();

    // Obținem produsul
    const product = productId ? await prisma.product.findUnique({
      where: { id: parseInt(productId) },
      select: {
        name: true,
        description: true,
        price: true,
        type: true,
        manufacturer: true,
        specs: true,
        advantages: true
      }
    }) : null;

    // Dacă nu avem produs, generăm post generic
    const targetPlatforms = platform ? [platform] : ["FACEBOOK", "INSTAGRAM", "LINKEDIN"];
    
    const prompt = `Generează posturi social media pentru promovarea ${product ? `produsului "${product.name}"` : "magazinului B2B"}.

${product ? `
PRODUS: ${product.name}
PREȚ: ${product.price} RON
PRODUCĂTOR: ${product.manufacturer || "N/A"}
DESCRIERE: ${product.description?.slice(0, 300) || "N/A"}
AVANTAJE: ${JSON.stringify(product.advantages)?.slice(0, 200) || "N/A"}
` : ""}

PLATFORME: ${targetPlatforms.join(", ")}
STIL: ${style || "Profesional B2B"}
INCLUDE OFERTĂ: ${includeOffer ? "Da" : "Nu"}

Generează conținut optimizat pentru fiecare platformă. Include hashtag-uri relevante.

Răspunde STRICT în JSON:
{
  "posts": [
    {
      "platform": "FACEBOOK|INSTAGRAM|LINKEDIN",
      "content": "...",
      "hashtags": ["..."],
      "callToAction": "...",
      "bestPostTime": "...",
      "imageDescription": "...",
      "engagement": {
        "estimatedReach": "...",
        "targetAudience": "..."
      }
    }
  ],
  "contentCalendar": [
    { "day": "Luni", "postType": "...", "theme": "..." }
  ],
  "trendingHashtags": ["..."],
  "contentTips": ["..."]
}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.8, maxOutputTokens: 2500 }
        })
      }
    );

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    return NextResponse.json({
      product: product ? { id: productId, name: product.name } : null,
      platforms: targetPlatforms,
      ...result
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET - sugestii de conținut pentru săptămâna curentă
export async function GET() {
  try {
    const products = await prisma.product.findMany({
      select: { id: true, name: true, type: true, price: true },
      take: 20,
      orderBy: { id: "desc" }
    });

    const prompt = `Creează un plan de conținut social media pentru o săptămână pentru un magazin B2B de echipamente industriale.

PRODUSE NOI ÎN CATALOG:
${products.slice(0, 5).map(p => `- ${p.name} (${p.type}): ${p.price} RON`).join("\n")}

CATEGORII PRINCIPALE: ${[...new Set(products.map(p => p.type))].join(", ")}

Răspunde STRICT în JSON:
{
  "weeklyPlan": [
    {
      "day": "Luni",
      "platform": "...",
      "postType": "EDUCATIONAL|PROMOTIONAL|ENGAGEMENT|BEHIND_THE_SCENES|TESTIMONIAL",
      "topic": "...",
      "suggestedContent": "...",
      "bestTime": "..."
    }
  ],
  "monthlyThemes": ["..."],
  "contentIdeas": [
    { "type": "...", "description": "...", "platform": "..." }
  ],
  "competitorInsights": ["..."],
  "industryTrends": ["..."]
}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.8, maxOutputTokens: 2000 }
        })
      }
    );

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
