import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyDPMtQTjaruCtql9qAFqcavAzKwXRdjsnA";

// GET - Lista întrebări frecvente
export async function GET() {
  try {
    const products = await prisma.product.findMany({
      take: 50,
      select: {
        id: true,
        name: true,
        type: true,
        manufacturer: true,
        description: true,
        specs: true,
        advantages: true
      }
    });

    // Frecvent asked questions
    const commonQuestions = [
      "Ce certificări au produsele?",
      "Care este garanția?",
      "Cum se instalează corect?",
      "Ce diferență este între modelele X și Y?",
      "Este compatibil cu sistemul meu existent?",
      "Care sunt condițiile de mediu recomandate?",
      "Ce întreținere necesită?",
      "Care este timpul de livrare?",
      "Oferiți suport tehnic?",
      "Care sunt metodele de plată?"
    ];

    const categories = [...new Set(products.map(p => p.type).filter(Boolean))];
    const manufacturers = [...new Set(products.map(p => p.manufacturer).filter(Boolean))];

    return NextResponse.json({
      productsCount: products.length,
      categories,
      manufacturers,
      commonQuestions,
      systemCapabilities: [
        "Răspunsuri tehnice despre produse",
        "Comparații între produse",
        "Recomandări bazate pe nevoi",
        "Informații despre livrare și garanție",
        "Asistență pentru alegerea produselor"
      ]
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Răspuns la întrebare tehnică
export async function POST(req: NextRequest) {
  try {
    const { question, context } = await req.json();

    if (!question) {
      return NextResponse.json({ error: "Întrebarea este obligatorie" }, { status: 400 });
    }

    // Obține produse relevante pentru context
    const products = await prisma.product.findMany({
      take: 30,
      select: {
        id: true,
        name: true,
        sku: true,
        type: true,
        manufacturer: true,
        description: true,
        specs: true,
        advantages: true,
        price: true
      }
    });

    // Obține informații companie
    const companyInfo = {
      name: "Magazin Automatizări Industriale",
      warranty: "2 ani standard, extensie disponibilă",
      shipping: "Livrare în 1-3 zile lucrătoare",
      payment: "Transfer bancar, card, cash la livrare",
      support: "Suport tehnic gratuit, luni-vineri 9-18",
      returns: "Retur în 14 zile conform legii"
    };

    const prompt = `Ești un asistent RAG (Retrieval-Augmented Generation) pentru un magazin B2B de automatizări industriale.
Răspunzi la întrebări tehnice bazându-te EXCLUSIV pe informațiile din baza de cunoștințe.

BAZĂ DE CUNOȘTINȚE - PRODUSE:
${products.slice(0, 15).map(p => `
[${p.sku}] ${p.name}
- Producător: ${p.manufacturer || "N/A"}
- Tip: ${p.type || "N/A"}
- Preț: ${p.price} RON
- Descriere: ${(p.description || "").slice(0, 200)}
- Specificații: ${p.specs || "N/A"}
- Avantaje: ${p.advantages || "N/A"}
`).join("\n---\n")}

INFORMAȚII COMPANIE:
- Garanție: ${companyInfo.warranty}
- Livrare: ${companyInfo.shipping}
- Plată: ${companyInfo.payment}
- Suport: ${companyInfo.support}
- Retururi: ${companyInfo.returns}

CONTEXT CONVERSAȚIE (dacă există):
${context || "Prima interacțiune"}

ÎNTREBAREA UTILIZATORULUI:
${question}

INSTRUCȚIUNI:
1. Răspunde DOAR bazat pe informațiile disponibile în baza de cunoștințe
2. Dacă nu ai informația exactă, spune clar și sugerează să contacteze suportul
3. Citează produse specifice când e relevant (incluzând SKU)
4. Oferă răspunsuri utile și orientate spre soluții
5. Dacă întrebarea necesită specificații tehnice pe care nu le ai, menționează asta

Returnează JSON:
{
  "answer": "răspunsul complet în limba română",
  "confidence": "high/medium/low",
  "sourcedFrom": ["sursele informației: produs SKU sau politică companie"],
  "relatedProducts": [
    { "id": "...", "name": "...", "relevance": "de ce e relevant" }
  ],
  "suggestedQuestions": ["întrebări follow-up sugerate"],
  "needsHumanAssistance": true/false,
  "humanAssistanceReason": "dacă da, de ce are nevoie de om"
}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 1000, temperature: 0.5 }
        })
      }
    );

    if (!response.ok) {
      return NextResponse.json({ 
        answer: "Îmi pare rău, sistemul AI nu este disponibil momentan. Vă rugăm să contactați suportul tehnic direct.",
        confidence: "low",
        needsHumanAssistance: true,
        humanAssistanceReason: "Sistem AI indisponibil"
      });
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const cleaned = rawText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    const aiResponse = JSON.parse(cleaned);

    return NextResponse.json({
      ...aiResponse,
      timestamp: new Date().toISOString(),
      question
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
