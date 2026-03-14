import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyDPMtQTjaruCtql9qAFqcavAzKwXRdjsnA";

// GET - Analiză furnizori (bazat pe producători din produse)
export async function GET() {
  try {
    // Grupează produse pe producător
    const products = await prisma.product.findMany({
      select: {
        manufacturer: true,
        purchasePrice: true,
        price: true,
        stock: true
      },
      where: {
        manufacturer: { not: { equals: "" } }
      }
    });

    const manufacturerStats = new Map<string, {
      productCount: number;
      totalPurchaseValue: number;
      avgMargin: number;
      lowStockCount: number;
    }>();

    for (const product of products) {
      const mfr = product.manufacturer || "Necunoscut";
      if (!manufacturerStats.has(mfr)) {
        manufacturerStats.set(mfr, {
          productCount: 0,
          totalPurchaseValue: 0,
          avgMargin: 0,
          lowStockCount: 0
        });
      }
      
      const stats = manufacturerStats.get(mfr)!;
      stats.productCount++;
      stats.totalPurchaseValue += product.purchasePrice || 0;
      if (product.purchasePrice && product.price) {
        stats.avgMargin = ((stats.avgMargin * (stats.productCount - 1)) + 
          ((product.price - product.purchasePrice) / product.price * 100)) / stats.productCount;
      }
      if ((product.stock || 0) < 5) stats.lowStockCount++;
    }

    const suppliers = Array.from(manufacturerStats.entries())
      .map(([name, stats]) => ({
        name,
        ...stats,
        avgMargin: stats.avgMargin.toFixed(1)
      }))
      .sort((a, b) => b.totalPurchaseValue - a.totalPurchaseValue)
      .slice(0, 30);

    return NextResponse.json({
      suppliers,
      stats: {
        totalSuppliers: suppliers.length,
        totalProducts: products.length
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Generează strategie de negociere
export async function POST(req: NextRequest) {
  try {
    const { supplierName, currentTerms, targetOutcome, negotiationContext } = await req.json();

    // Date despre furnizor
    const products = await prisma.product.findMany({
      where: { manufacturer: supplierName },
      select: {
        name: true,
        purchasePrice: true,
        price: true,
        stock: true
      }
    });

    const totalPurchaseValue = products.reduce((sum, p) => sum + (p.purchasePrice || 0), 0);
    const avgMargin = products.length > 0 && products.filter(p => p.purchasePrice && p.price).length > 0
      ? products.filter(p => p.purchasePrice && p.price)
          .reduce((sum, p) => sum + ((p.price - (p.purchasePrice || 0)) / p.price * 100), 0) / 
          products.filter(p => p.purchasePrice && p.price).length
      : 0;
    const lowStockProducts = products.filter(p => (p.stock || 0) < 5);

    const prompt = `Ești expert în negocieri B2B pentru achiziții de automatizări industriale.

FURNIZOR: ${supplierName}
PRODUSE ÎN PORTOFOLIU: ${products.length}
VALOARE ACHIZIȚII TOTALĂ: ~${totalPurchaseValue.toFixed(0)} RON (prețuri de achiziție)
MARJĂ MEDIE CURENTĂ: ${avgMargin.toFixed(1)}%
PRODUSE LOW STOCK: ${lowStockProducts.length}

TERMENI CURENȚI:
${currentTerms || "Nu sunt specificate. Presupune termeni standard: plată 30 zile, fără discount volum."}

OBIECTIV NEGOCIERE:
${targetOutcome || "Reducere prețuri achiziție cu 5-10%, termeni de plată mai buni."}

CONTEXT SUPLIMENTAR:
${negotiationContext || "Relație comercială de lungă durată, volum în creștere."}

Generează o strategie completă de negociere.

Returnează JSON:
{
  "negotiationStrategy": {
    "approach": "collaborative/competitive/compromise",
    "openingPosition": "poziția de start",
    "targetPosition": "obiectiv realist",
    "walkAwayPoint": "limită minimă acceptabilă"
  },
  "keyArguments": [
    { "argument": "argument", "evidence": "dovadă/date", "expectedResponse": "răspuns anticipat" }
  ],
  "leveragePoints": ["punct de pârghie 1"],
  "potentialConcessions": [
    { "concession": "ce poți oferi", "value": "valoare pentru furnizor" }
  ],
  "counterarguments": [
    { "theirArgument": "ce vor spune ei", "yourResponse": "răspunsul tău" }
  ],
  "negotiationTactics": ["tactică 1", "tactică 2"],
  "riskAssessment": {
    "risks": ["risc posibil"],
    "mitigations": ["strategie reducere risc"]
  },
  "timeline": "sugestie timing negociere",
  "alternativeSuppliers": "strategie backup",
  "expectedOutcome": {
    "bestCase": "scenariu optim",
    "realistic": "scenariu probabil",
    "worstCase": "scenariu pesimist"
  },
  "preparationChecklist": ["pas pregătire 1", "pas 2"]
}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 3000 }
        })
      }
    );

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    let strategy;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      strategy = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch {
      strategy = {
        negotiationStrategy: { approach: "collaborative" },
        keyArguments: [{ argument: text }]
      };
    }

    return NextResponse.json({
      supplierName,
      productsCount: products.length,
      totalPurchaseValue,
      avgMargin: avgMargin.toFixed(1),
      ...strategy
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
