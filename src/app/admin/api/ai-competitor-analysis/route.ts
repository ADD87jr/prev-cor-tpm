import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyDPMtQTjaruCtql9qAFqcavAzKwXRdjsnA";

// GET - Listează produse pentru analiză competitori
export async function GET() {
  try {
    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        type: true,
        manufacturer: true,
        price: true,
        listPrice: true,
        purchasePrice: true
      },
      take: 100,
      orderBy: { id: "desc" }
    });

    // Calculează statistici
    const withMargin = products.filter(p => p.purchasePrice && p.price);
    const avgMargin = withMargin.length > 0
      ? withMargin.reduce((sum, p) => sum + ((p.price - (p.purchasePrice || 0)) / p.price * 100), 0) / withMargin.length
      : 0;

    return NextResponse.json({
      products,
      stats: {
        totalProducts: products.length,
        avgMargin: avgMargin.toFixed(1),
        productsWithPurchasePrice: withMargin.length
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Analizează prețuri vs competitori
export async function POST(req: NextRequest) {
  try {
    const { productId, competitorPrices } = await req.json();

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        type: true,
        manufacturer: true,
        price: true,
        listPrice: true,
        purchasePrice: true
      }
    });

    if (!product) {
      return NextResponse.json({ error: "Produs negăsit" }, { status: 404 });
    }

    // Competitori simulați dacă nu sunt furnizați
    const competitors = competitorPrices || [
      { name: "Competitor A", price: product.price * (0.9 + Math.random() * 0.2) },
      { name: "Competitor B", price: product.price * (0.85 + Math.random() * 0.3) },
      { name: "Competitor C", price: product.price * (0.95 + Math.random() * 0.15) }
    ];

    const prompt = `Ești expert în analiză competitivă pentru un magazin B2B de automatizări industriale.

PRODUS ANALIZAT:
- Nume: ${product.name}
- Tip: ${product.type || "N/A"}
- Producător: ${product.manufacturer || "N/A"}
- Preț curent: ${product.price} RON
- Preț listă: ${product.listPrice || "N/A"} RON
- Preț achiziție: ${product.purchasePrice || "N/A"} RON
- Marjă curentă: ${product.purchasePrice ? ((product.price - product.purchasePrice) / product.price * 100).toFixed(1) : "N/A"}%

PREȚURI COMPETITORI:
${competitors.map((c: any) => `- ${c.name}: ${c.price.toFixed(2)} RON`).join("\n")}

Analizează poziția competitivă și recomandă strategia de preț optimă.
Consideră: marjă minimă 15%, poziționare pe piață, valoare percepută.

Returnează JSON:
{
  "marketPosition": "below_market/at_market/above_market",
  "competitiveIndex": 85,
  "recommendedPrice": 250.00,
  "priceChange": "+5%/-10%/0%",
  "analysis": "analiză detaliată",
  "strengths": ["punct forte 1"],
  "threats": ["amenințare 1"],
  "strategy": "strategie recomandată",
  "urgency": "low/medium/high"
}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 1500 }
        })
      }
    );

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    let analysis;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch {
      analysis = {
        marketPosition: "at_market",
        competitiveIndex: 75,
        recommendedPrice: product.price,
        priceChange: "0%",
        analysis: text,
        strengths: [],
        threats: [],
        strategy: "Menține prețul curent",
        urgency: "low"
      };
    }

    return NextResponse.json({
      productId: product.id,
      productName: product.name,
      currentPrice: product.price,
      competitors,
      ...analysis
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
