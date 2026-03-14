import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyDPMtQTjaruCtql9qAFqcavAzKwXRdjsnA";

// POST - Răspunde la o întrebare tehnică despre un produs
export async function POST(request: NextRequest) {
  try {
    const { question, productId, context } = await request.json();

    if (!question) {
      return NextResponse.json({ error: "Întrebare obligatorie" }, { status: 400 });
    }

    let productContext = "";

    if (productId) {
      const product = await prisma.product.findUnique({
        where: { id: productId },
        select: {
          id: true,
          name: true,
          description: true,
          specs: true,
          advantages: true,
          type: true,
          domain: true,
          manufacturer: true,
          sku: true,
          pdfUrl: true
        }
      });

      if (product) {
        let specs = {};
        try {
          specs = typeof product.specs === "string" ? JSON.parse(product.specs) : product.specs || {};
        } catch {}

        let advantages = [];
        try {
          advantages = typeof product.advantages === "string" ? JSON.parse(product.advantages) : product.advantages || [];
        } catch {}

        productContext = `
PRODUS: ${product.name}
PRODUCĂTOR: ${product.manufacturer || "N/A"}
TIP: ${product.type || "N/A"}
DOMENIU: ${product.domain || "N/A"}
SKU: ${product.sku || "N/A"}

DESCRIERE:
${product.description || "N/A"}

SPECIFICAȚII TEHNICE:
${Object.entries(specs).map(([k, v]) => `- ${k}: ${v}`).join("\n") || "N/A"}

AVANTAJE:
${Array.isArray(advantages) ? advantages.map((a: string) => `- ${a}`).join("\n") : "N/A"}

${product.pdfUrl ? `Fișă tehnică PDF: ${product.pdfUrl}` : ""}
`;
      }
    }

    // Caută produse relevante dacă nu avem productId
    if (!productId && context?.searchProducts) {
      const searchTerms = question.split(" ").filter((w: string) => w.length > 3).slice(0, 3);
      
      const relatedProducts = await prisma.product.findMany({
        where: {
          OR: searchTerms.map((term: string) => ({
            OR: [
              { name: { contains: term } },
              { type: { contains: term } },
              { manufacturer: { contains: term } }
            ]
          }))
        },
        select: { id: true, name: true, type: true, manufacturer: true },
        take: 5
      });

      if (relatedProducts.length > 0) {
        productContext = `
PRODUSE POSIBIL RELEVANTE DIN CATALOG:
${relatedProducts.map(p => `- ${p.name} (${p.type}, ${p.manufacturer})`).join("\n")}
`;
      }
    }

    const prompt = `Ești expert tehnic în automatizări industriale (PLC-uri, HMI-uri, senzori, invertoare, module I/O, etc) pentru compania PREV-COR TPM.

${productContext}

ÎNTREBARE CLIENT:
${question}

${context?.additionalInfo ? `CONTEXT ADIȚIONAL: ${context.additionalInfo}` : ""}

Răspunde la întrebare profesional și tehnic. Dacă întrebarea e despre un produs specific și ai informații, folosește-le.
Dacă nu ai suficiente informații, spune asta clar și sugerează ce date ar fi necesare.

Pentru întrebări despre compatibilitate, instalare, programare - oferă ghidare tehnică precisă.
Menționează dacă e nevoie de consultare cu producătorul pentru detalii avansate.

Răspuns în română, 100-300 cuvinte, formatat clar.

Returnează JSON:
{
  "answer": "Răspunsul tehnic complet",
  "confidence": 85,
  "sources": ["surse folosite: documentație, specificații, etc"],
  "relatedTopics": ["topic 1", "topic 2"],
  "suggestedProducts": ["nume produse recomandate dacă e cazul"],
  "needsSpecialist": false,
  "followUpQuestions": ["întrebare follow-up 1", "întrebare 2"]
}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 1500, temperature: 0.4 }
        })
      }
    );

    if (!response.ok) {
      return NextResponse.json({ 
        error: "AI indisponibil",
        fallbackAnswer: "Ne pare rău, serviciul AI este temporar indisponibil. Vă rugăm să ne contactați direct pentru asistență tehnică."
      }, { status: 500 });
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
      // Fallback - tratează răspunsul ca text simplu
      result = {
        answer: responseText,
        confidence: 70,
        sources: ["AI general knowledge"],
        relatedTopics: [],
        suggestedProducts: [],
        needsSpecialist: false,
        followUpQuestions: []
      };
    }

    return NextResponse.json({
      success: true,
      question,
      productId: productId || null,
      ...result
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET - Obține întrebări frecvente sau sugestii
export async function GET() {
  try {
    // Întrebări frecvente predefinite pentru automatizări industriale
    const faqCategories = [
      {
        category: "PLC-uri",
        questions: [
          "Ce diferență este între un PLC și un microcontroller?",
          "Cum conectez un senzor la un PLC Siemens?",
          "Ce limbaje de programare suportă PLC-urile?",
          "Cum fac backup la programul din PLC?"
        ]
      },
      {
        category: "HMI",
        questions: [
          "Ce rezoluție ar trebui să aibă un HMI pentru aplicații industriale?",
          "Cum conectez un HMI la un PLC?",
          "Ce protocol de comunicație e mai bun: Modbus sau Profinet?"
        ]
      },
      {
        category: "Senzori",
        questions: [
          "Ce tip de senzor e potrivit pentru detectarea metalelor?",
          "Care e diferența între PNP și NPN?",
          "Cum calibrez un senzor de presiune?"
        ]
      },
      {
        category: "Invertoare",
        questions: [
          "Cum dimensionez un invertor pentru un motor?",
          "Ce este frâna dinamică la un invertor?",
          "Cum configurez rampa de accelerație?"
        ]
      }
    ];

    return NextResponse.json({
      faq: faqCategories,
      tip: "Folosiți POST cu { question: '...', productId: optional } pentru a primi răspunsuri AI"
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
