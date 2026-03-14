import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyDPMtQTjaruCtql9qAFqcavAzKwXRdjsnA";

// GET - Lista produse cu stoc 0 sau fără alternative setate
export async function GET() {
  try {
    // Produse fără stoc
    const outOfStock = await prisma.product.findMany({
      where: { stock: 0, onDemand: false },
      select: {
        id: true,
        name: true,
        type: true,
        domain: true,
        manufacturer: true,
        price: true,
        sku: true
      },
      take: 50
    });

    // Toate produsele cu stoc pentru potrivire
    const inStock = await prisma.product.findMany({
      where: { OR: [{ stock: { gt: 0 } }, { onDemand: true }] },
      select: {
        id: true,
        name: true,
        type: true,
        domain: true,
        manufacturer: true,
        price: true,
        stock: true
      }
    });

    return NextResponse.json({
      outOfStock,
      inStockCount: inStock.length,
      stats: {
        outOfStockCount: outOfStock.length
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Găsește alternative pentru un produs
export async function POST(request: NextRequest) {
  try {
    const { productId } = await request.json();

    if (!productId) {
      return NextResponse.json({ error: "productId obligatoriu" }, { status: 400 });
    }

    // Obține produsul
    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      return NextResponse.json({ error: "Produsul nu există" }, { status: 404 });
    }

    // Obține produse similare (același tip sau domeniu, cu stoc)
    const candidates = await prisma.product.findMany({
      where: {
        id: { not: productId },
        OR: [{ stock: { gt: 0 } }, { onDemand: true }],
        AND: [
          { OR: [{ type: product.type }, { domain: product.domain }] }
        ]
      },
      select: {
        id: true,
        name: true,
        type: true,
        domain: true,
        manufacturer: true,
        price: true,
        stock: true,
        description: true
      },
      take: 20
    });

    const prompt = `Ești expert în automatizări industriale. Găsește cele mai bune alternative pentru un produs indisponibil.

PRODUS INDISPONIBIL:
- Nume: ${product.name}
- Tip: ${product.type}
- Domeniu: ${product.domain}
- Producător: ${product.manufacturer || "N/A"}
- Preț: ${product.price} RON
- Descriere: ${product.description?.substring(0, 200) || "N/A"}

CANDIDAȚI DISPONIBILI:
${candidates.map((c, i) => `[${i + 1}] ID:${c.id} | ${c.name} | ${c.type} | ${c.manufacturer || "N/A"} | ${c.price} RON | Stoc: ${c.stock}`).join("\n")}

Analizează și returnează TOP 3 alternative ordonate după compatibilitate.
Consideră: specificații tehnice similare, aceeași gamă de preț, același producător e un bonus.

Returnează DOAR JSON:
{
  "alternatives": [
    {
      "productId": 1,
      "productName": "...",
      "matchScore": 95,
      "reason": "explicație scurtă de ce e o alternativă bună",
      "priceDiff": "+5%"
    }
  ],
  "noGoodMatch": false,
  "suggestion": "dacă nu găsești alternative bune, sugerează ce ar trebui adăugat în catalog"
}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 800, temperature: 0.5 }
        })
      }
    );

    if (!response.ok) {
      return NextResponse.json({ error: "Eroare AI" }, { status: 500 });
    }

    const data = await response.json();
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    let result;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON");
      }
    } catch {
      return NextResponse.json({ error: "Nu am putut parsa răspunsul" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      product: { id: product.id, name: product.name },
      ...result
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
