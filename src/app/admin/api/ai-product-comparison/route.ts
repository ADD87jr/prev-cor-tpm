import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyDPMtQTjaruCtql9qAFqcavAzKwXRdjsnA";

// GET - Lista produse disponibile pentru comparație
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");

    const products = await prisma.product.findMany({
      where: category ? { type: category } : undefined,
      select: {
        id: true,
        name: true,
        sku: true,
        type: true,
        manufacturer: true,
        price: true,
        description: true
      },
      take: 100
    });

    const categories = [...new Set(products.map(p => p.type).filter(Boolean))];
    const manufacturers = [...new Set(products.map(p => p.manufacturer).filter(Boolean))];

    return NextResponse.json({
      totalProducts: products.length,
      categories,
      manufacturers,
      products: products.slice(0, 50)
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Generare comparație AI
export async function POST(req: NextRequest) {
  try {
    const { productIds, comparisonType } = await req.json();

    if (!productIds || productIds.length < 2) {
      return NextResponse.json({ error: "Selectează cel puțin 2 produse pentru comparație" }, { status: 400 });
    }

    if (productIds.length > 5) {
      return NextResponse.json({ error: "Maximum 5 produse pentru comparație" }, { status: 400 });
    }

    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds.map((id: string) => typeof id === "string" ? parseInt(id) : id) }
      },
      select: {
        id: true,
        name: true,
        sku: true,
        type: true,
        manufacturer: true,
        price: true,
        listPrice: true,
        description: true,
        specs: true,
        advantages: true,
        stock: true
      }
    });

    if (products.length < 2) {
      return NextResponse.json({ error: "Produse negăsite" }, { status: 404 });
    }

    const productsData = products.map(p => ({
      name: p.name,
      sku: p.sku,
      manufacturer: p.manufacturer,
      price: p.price,
      listPrice: p.listPrice,
      description: p.description?.substring(0, 500),
      specs: p.specs,
      advantages: p.advantages,
      inStock: (p.stock || 0) > 0
    }));

    const prompt = `Creează o comparație detaliată între aceste produse de automatizări industriale.

PRODUSE DE COMPARAT:
${JSON.stringify(productsData, null, 2)}

TIP COMPARAȚIE: ${comparisonType || "GENERAL"}

Analizează și returnează JSON:
{
  "summary": "rezumat comparație în 2-3 propoziții",
  "comparisonTable": {
    "criteria": [
      {
        "name": "nume criteriu (ex: Performanță, Preț, Fiabilitate)",
        "values": ["valoare produs 1", "valoare produs 2", ...],
        "winner": 0 sau 1 sau 2... (indexul produsului câștigător pentru acest criteriu)
      }
    ]
  },
  "prosAndCons": [
    {
      "productIndex": 0,
      "pros": ["avantaje"],
      "cons": ["dezavantaje"]
    }
  ],
  "recommendations": {
    "bestOverall": {
      "productIndex": number,
      "reason": "de ce este cel mai bun în general"
    },
    "bestValue": {
      "productIndex": number,
      "reason": "de ce oferă cel mai bun raport calitate-preț"
    },
    "bestForBeginners": {
      "productIndex": number,
      "reason": "de ce e potrivit pentru începători"
    },
    "bestForProfessionals": {
      "productIndex": number,
      "reason": "de ce e potrivit pentru profesioniști"
    }
  },
  "useCaseRecommendations": [
    {
      "useCase": "descriere caz de utilizare",
      "recommendedProductIndex": number,
      "reason": "de ce"
    }
  ],
  "technicalNotes": "note tehnice importante pentru decizie"
}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.5,
            maxOutputTokens: 3000
          }
        })
      }
    );

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    let comparison;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      comparison = jsonMatch ? JSON.parse(jsonMatch[0]) : { error: "Parse failed", raw: text };
    } catch {
      comparison = { error: "Parse failed", raw: text };
    }

    return NextResponse.json({
      products: products.map(p => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        manufacturer: p.manufacturer,
        price: p.price,
        inStock: (p.stock || 0) > 0
      })),
      comparison
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
