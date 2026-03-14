import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const GEMINI_API_KEY = "AIzaSyDPMtQTjaruCtql9qAFqcavAzKwXRdjsnA";

export async function POST(req: Request) {
  try {
    const { productId, question } = await req.json();

    if (!productId || !question) {
      return NextResponse.json({ error: "productId and question required" }, { status: 400 });
    }

    // Obținem detaliile produsului
    const product = await prisma.product.findUnique({
      where: { id: parseInt(productId) },
      select: {
        name: true,
        description: true,
        specs: true,
        advantages: true,
        type: true,
        manufacturer: true,
        price: true
      }
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Obținem produse similare pentru context
    const similarProducts = await prisma.product.findMany({
      where: {
        type: product.type,
        id: { not: parseInt(productId) }
      },
      select: { name: true, price: true, specs: true },
      take: 3
    });

    const prompt = `Ești un expert tehnic pentru echipamente industriale. Răspunde la întrebarea clientului despre acest produs:

PRODUS: ${product.name}
PRODUCĂTOR: ${product.manufacturer || "N/A"}
CATEGORIE: ${product.type || "N/A"}
PREȚ: ${product.price} RON

DESCRIERE:
${product.description || "N/A"}

SPECIFICAȚII TEHNICE:
${JSON.stringify(product.specs, null, 2) || "N/A"}

AVANTAJE:
${JSON.stringify(product.advantages) || "N/A"}

PRODUSE SIMILARE (pentru comparație):
${similarProducts.map(p => `- ${p.name}: ${p.price} RON`).join("\n")}

ÎNTREBAREA CLIENTULUI: "${question}"

Răspunde STRICT în JSON:
{
  "answer": "...",
  "confidence": "HIGH|MEDIUM|LOW",
  "sources": ["specifications", "description", "general_knowledge"],
  "relatedQuestions": ["..."],
  "productComparison": null,
  "technicalDetails": {
    "relevantSpecs": {},
    "warnings": [],
    "recommendations": []
  },
  "callToAction": "..."
}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.5, maxOutputTokens: 1500 }
        })
      }
    );

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    return NextResponse.json({
      product: {
        id: productId,
        name: product.name,
        price: product.price
      },
      question,
      ...result
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET - obține întrebări frecvente pentru un produs
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("productId");

    if (!productId) {
      return NextResponse.json({ error: "productId required" }, { status: 400 });
    }

    const product = await prisma.product.findUnique({
      where: { id: parseInt(productId) },
      select: {
        name: true,
        type: true,
        specs: true,
        description: true
      }
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const prompt = `Generează 8 întrebări frecvente pe care clienții B2B le-ar pune despre acest produs industrial:

PRODUS: ${product.name}
CATEGORIE: ${product.type}
DESCRIERE: ${product.description?.slice(0, 500) || "N/A"}

Întrebările trebuie să fie tehnice, practice și relevante pentru decizia de achiziție.

Răspunde STRICT în JSON:
{
  "faqs": [
    { "question": "...", "category": "TECHNICAL|COMMERCIAL|COMPATIBILITY|DELIVERY|WARRANTY" }
  ]
}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 800 }
        })
      }
    );

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : { faqs: [] };

    return NextResponse.json({
      productName: product.name,
      faqs: result.faqs || []
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
