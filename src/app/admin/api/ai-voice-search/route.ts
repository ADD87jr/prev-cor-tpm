import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const GEMINI_API_KEY = "AIzaSyDPMtQTjaruCtql9qAFqcavAzKwXRdjsnA";

export async function POST(req: Request) {
  try {
    const { voiceText, audioTranscript } = await req.json();

    // Folosim textul transcris (de la Speech-to-Text browser API)
    const searchQuery = voiceText || audioTranscript || "";

    if (!searchQuery) {
      return NextResponse.json({ error: "No voice input provided" }, { status: 400 });
    }

    // Obținem produsele
    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        type: true,
        price: true,
        manufacturer: true,
        specs: true
      }
    });

    // Interpretăm cererea vocală cu AI
    const interpretPrompt = `Analizează această cerere vocală pentru căutare produse industriale:

CERERE: "${searchQuery}"

CATEGORII DISPONIBILE: ${[...new Set(products.map(p => p.type))].join(", ")}
PRODUCĂTORI: ${[...new Set(products.map(p => p.manufacturer).filter(Boolean))].slice(0, 20).join(", ")}

Extrage intenția și parametrii de căutare.

Răspunde STRICT în JSON:
{
  "intent": "SEARCH|COMPARE|PRICE_CHECK|AVAILABILITY|SPECIFICATION",
  "searchTerms": ["..."],
  "filters": {
    "category": null,
    "manufacturer": null,
    "priceRange": { "min": null, "max": null },
    "specifications": {}
  },
  "clarificationNeeded": false,
  "clarificationQuestion": null,
  "naturalResponse": "..."
}`;

    const interpretResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: interpretPrompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 500 }
        })
      }
    );

    const interpretData = await interpretResponse.json();
    const interpretText = interpretData.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    const jsonMatch = interpretText.match(/\{[\s\S]*\}/);
    const interpretation = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    // Căutăm produse bazat pe interpretare
    const searchTerms = interpretation.searchTerms || [searchQuery];
    
    let filteredProducts = products.filter(p => {
      const searchableText = `${p.name} ${p.description || ""} ${p.type || ""} ${p.manufacturer || ""}`.toLowerCase();
      return searchTerms.some((term: string) => searchableText.includes(term.toLowerCase()));
    });

    // Aplicăm filtre
    if (interpretation.filters?.category) {
      filteredProducts = filteredProducts.filter(p => 
        p.type?.toLowerCase().includes(interpretation.filters.category.toLowerCase())
      );
    }
    if (interpretation.filters?.manufacturer) {
      filteredProducts = filteredProducts.filter(p => 
        p.manufacturer?.toLowerCase().includes(interpretation.filters.manufacturer.toLowerCase())
      );
    }
    if (interpretation.filters?.priceRange?.max) {
      filteredProducts = filteredProducts.filter(p => p.price <= interpretation.filters.priceRange.max);
    }

    // Sortăm după relevanță
    filteredProducts = filteredProducts.slice(0, 10);

    // Generăm răspuns vocal
    const responsePrompt = `Generează un răspuns vocal natural pentru rezultatele căutării:

CERERE ORIGINALĂ: "${searchQuery}"
PRODUSE GĂSITE: ${filteredProducts.length}
TOP REZULTATE:
${filteredProducts.slice(0, 3).map(p => `- ${p.name}: ${p.price} RON`).join("\n")}

Generează un răspuns scurt, natural, de citit cu voce (max 2 propoziții).`;

    const voiceResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: responsePrompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 100 }
        })
      }
    );

    const voiceData = await voiceResponse.json();
    const spokenResponse = voiceData.candidates?.[0]?.content?.parts?.[0]?.text || 
      `Am găsit ${filteredProducts.length} produse. Vrei să vezi rezultatele?`;

    return NextResponse.json({
      originalQuery: searchQuery,
      interpretation,
      results: filteredProducts.map(p => ({
        id: p.id,
        name: p.name,
        price: p.price,
        type: p.type,
        manufacturer: p.manufacturer
      })),
      spokenResponse: spokenResponse.replace(/[*#]/g, ""),
      totalResults: filteredProducts.length
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
