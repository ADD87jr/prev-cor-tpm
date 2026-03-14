import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyDPMtQTjaruCtql9qAFqcavAzKwXRdjsnA";

// GET - Lista categorii si tipuri disponibile
export async function GET() {
  try {
    // Obține toate categoriile unice
    const products = await prisma.product.findMany({
      select: { type: true, domain: true },
      distinct: ["type", "domain"]
    });

    const types = [...new Set(products.map(p => p.type))].filter(Boolean).sort();
    const domains = [...new Set(products.map(p => p.domain))].filter(Boolean).sort();

    return NextResponse.json({
      types,
      domains,
      stats: {
        typesCount: types.length,
        domainsCount: domains.length
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Clasifică un produs nou
export async function POST(request: NextRequest) {
  try {
    const { productName, productDescription, manufacturer, sku } = await request.json();

    if (!productName) {
      return NextResponse.json({ error: "Numele produsului este obligatoriu" }, { status: 400 });
    }

    // Obține categoriile existente pentru context
    const existingProducts = await prisma.product.findMany({
      select: { type: true, domain: true, name: true },
      distinct: ["type", "domain"],
      take: 100
    });

    const types = [...new Set(existingProducts.map(p => p.type))].filter(Boolean);
    const domains = [...new Set(existingProducts.map(p => p.domain))].filter(Boolean);

    const prompt = `Ești un expert în automatizări industriale și clasificare produse tehnice.

CATEGORII EXISTENTE ÎN CATALOG:
Tipuri: ${types.join(", ")}
Domenii: ${domains.join(", ")}

PRODUS NOU DE CLASIFICAT:
Nume: ${productName}
Descriere: ${productDescription || "N/A"}
Producător: ${manufacturer || "N/A"}
SKU: ${sku || "N/A"}

SARCINĂ:
1. Alege tipul potrivit din lista existentă SAU sugerează unul nou dacă nu se potrivește
2. Alege domeniul potrivit din lista existentă SAU sugerează unul nou
3. Sugerează keywords pentru SEO
4. Sugerează o descriere scurtă profesională dacă lipsește

Returnează DOAR JSON valid:
{
  "type": "tipul ales sau sugerat",
  "typeIsNew": false,
  "domain": "domeniul ales sau sugerat",
  "domainIsNew": false,
  "suggestedDescription": "descriere profesională dacă originalul lipsește",
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "confidence": 0.95,
  "reasoning": "explicație scurtă a alegerii"
}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 800, temperature: 0.3 }
        })
      }
    );

    if (!response.ok) {
      return NextResponse.json({ error: "Eroare la clasificare AI" }, { status: 500 });
    }

    const data = await response.json();
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    let classification;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        classification = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON");
      }
    } catch {
      return NextResponse.json({ error: "Nu am putut parsa răspunsul AI" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      classification,
      availableTypes: types,
      availableDomains: domains
    });
  } catch (error: any) {
    console.error("Error classifying product:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
