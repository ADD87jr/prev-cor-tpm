import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyDPMtQTjaruCtql9qAFqcavAzKwXRdjsnA";

// GET - Pachete sugerate bazate pe date vânzări
export async function GET() {
  try {
    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        sku: true,
        type: true,
        manufacturer: true,
        price: true,
        stock: true
      }
    });

    // Analizează comenzi pentru pattern-uri
    const orders = await prisma.order.findMany({
      where: {
        status: { in: ["completed", "shipped", "processing"] }
      },
      select: { items: true },
      take: 300
    });

    // Găsește produse cumpărate împreună frecvent
    const coOccurrences: Record<string, Record<string, number>> = {};

    for (const order of orders) {
      const items = order.items as any[];
      if (!Array.isArray(items) || items.length < 2) continue;

      const productIds = items.map(i => i.productId || i.id).filter(Boolean);
      
      for (let i = 0; i < productIds.length; i++) {
        for (let j = i + 1; j < productIds.length; j++) {
          const key1 = productIds[i];
          const key2 = productIds[j];

          if (!coOccurrences[key1]) coOccurrences[key1] = {};
          if (!coOccurrences[key2]) coOccurrences[key2] = {};

          coOccurrences[key1][key2] = (coOccurrences[key1][key2] || 0) + 1;
          coOccurrences[key2][key1] = (coOccurrences[key2][key1] || 0) + 1;
        }
      }
    }

    // Generează pachete sugerate
    const bundles: any[] = [];
    const processedPairs = new Set<string>();

    for (const [productId, pairs] of Object.entries(coOccurrences)) {
      const topPairs = Object.entries(pairs)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);

      for (const [pairedId, count] of topPairs) {
        if (count < 2) continue;
        
        const pairKey = [productId, pairedId].sort().join("-");
        if (processedPairs.has(pairKey)) continue;
        processedPairs.add(pairKey);

        const product1 = products.find(p => String(p.id) === productId);
        const product2 = products.find(p => String(p.id) === pairedId);

        if (product1 && product2) {
          const totalPrice = (product1.price || 0) + (product2.price || 0);
          const bundlePrice = Math.round(totalPrice * 0.95); // 5% discount

          bundles.push({
            id: pairKey,
            products: [
              { id: product1.id, name: product1.name, sku: product1.sku, price: product1.price },
              { id: product2.id, name: product2.name, sku: product2.sku, price: product2.price }
            ],
            frequency: count,
            originalPrice: totalPrice,
            bundlePrice,
            savings: totalPrice - bundlePrice,
            savingsPercent: 5,
            reason: `Cumpărate împreună de ${count} ori`
          });
        }
      }
    }

    // Sortează după frecvență
    bundles.sort((a, b) => b.frequency - a.frequency);

    // Categorii de pachete recomandate
    const categoryBundles = [
      {
        category: "PLC + Cablu programare",
        description: "Toate PLC-urile ar trebui vândute cu cablu de programare",
        type: "ESSENTIAL"
      },
      {
        category: "Senzor + Conector",
        description: "Senzorii necesită conectori compatibili",
        type: "ESSENTIAL"
      },
      {
        category: "HMI + PLC + Software",
        description: "Pachete complete de automatizare",
        type: "PREMIUM"
      },
      {
        category: "Servo + Driver + Cablu",
        description: "Kit complet servo motion",
        type: "PREMIUM"
      }
    ];

    return NextResponse.json({
      stats: {
        totalBundles: bundles.length,
        ordersAnalyzed: orders.length,
        potentialRevenue: bundles.reduce((sum, b) => sum + b.bundlePrice, 0)
      },
      suggestedBundles: bundles.slice(0, 20),
      categoryRecommendations: categoryBundles
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Generare pachet AI personalizat
export async function POST(req: NextRequest) {
  try {
    const { productId, bundleType, targetPrice, maxProducts } = await req.json();

    const numericProductId = typeof productId === "string" ? parseInt(productId) : productId;

    const baseProduct = await prisma.product.findUnique({
      where: { id: numericProductId }
    });

    if (!baseProduct) {
      return NextResponse.json({ error: "Produs de bază negăsit" }, { status: 404 });
    }

    // Obține produse similare/complementare
    const relatedProducts = await prisma.product.findMany({
      where: {
        id: { not: numericProductId },
        OR: [
          { type: baseProduct.type },
          { manufacturer: baseProduct.manufacturer }
        ]
      },
      select: {
        id: true,
        name: true,
        sku: true,
        type: true,
        manufacturer: true,
        description: true,
        price: true,
        stock: true
      },
      take: 50
    });

    // Obține produse din alte categorii pt complementaritate
    const otherProducts = await prisma.product.findMany({
      where: {
        id: { not: numericProductId },
        type: { not: baseProduct.type || undefined }
      },
      select: {
        id: true,
        name: true,
        sku: true,
        type: true,
        manufacturer: true,
        description: true,
        price: true
      },
      take: 30
    });

    const allProducts = [...relatedProducts, ...otherProducts];

    const prompt = `Creează un pachet (bundle) de produse pentru automatizări industriale.

PRODUS PRINCIPAL:
- Nume: ${baseProduct.name}
- SKU: ${baseProduct.sku || "N/A"}
- Tip: ${baseProduct.type || "N/A"}
- Producător: ${baseProduct.manufacturer || "N/A"}
- Preț: ${baseProduct.price} RON
- Descriere: ${baseProduct.description?.substring(0, 300)}

TIP PACHET: ${bundleType || "STANDARD"}
${targetPrice ? `PREȚ ȚINTĂ: ~${targetPrice} RON` : ""}
${maxProducts ? `MAX PRODUSE: ${maxProducts}` : "MAX 5 produse"}

PRODUSE DISPONIBILE:
${JSON.stringify(allProducts.slice(0, 40), null, 2)}

Creează un pachet logic care să aibă sens tehnic.
Ex: PLC + cablu programare + alimentator
Ex: Senzor + conector + cablu

Returnează JSON:
{
  "bundleName": "Nume atractiv pentru pachet",
  "bundleDescription": "Descriere marketing scurtă",
  "products": [
    {
      "productId": "id",
      "productName": "nume",
      "role": "ce rol are în pachet (principal/accesoriu/opțional)",
      "reason": "de ce e inclus"
    }
  ],
  "pricing": {
    "originalTotal": number,
    "bundlePrice": number,
    "discountPercent": number,
    "savings": number
  },
  "targetAudience": "pentru cine e potrivit pachetul",
  "useCases": ["cazuri de utilizare"],
  "technicalNotes": "note tehnice importante",
  "upsellOpportunities": ["produse adiționale care ar completa pachetul"]
}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.6,
            maxOutputTokens: 2000
          }
        })
      }
    );

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    let bundle;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      bundle = jsonMatch ? JSON.parse(jsonMatch[0]) : { error: "Parse failed", raw: text };
    } catch {
      bundle = { error: "Parse failed", raw: text };
    }

    // Îmbogățește cu detalii complete
    if (bundle.products && Array.isArray(bundle.products)) {
      bundle.products = bundle.products.map((p: any) => {
        const fullProduct = allProducts.find(prod => prod.id === p.productId);
        return {
          ...p,
          details: fullProduct || null
        };
      });

      // Recalculează prețuri reale
      const realPrices = bundle.products
        .map((p: any) => p.details?.price || 0)
        .filter((price: number) => price > 0);

      const actualTotal = realPrices.reduce((sum: number, p: number) => sum + p, 0) + (baseProduct.price || 0);
      
      bundle.pricing = {
        ...bundle.pricing,
        actualOriginalTotal: actualTotal,
        actualBundlePrice: Math.round(actualTotal * 0.92), // 8% discount
        actualSavings: Math.round(actualTotal * 0.08)
      };
    }

    return NextResponse.json({
      baseProduct: {
        id: baseProduct.id,
        name: baseProduct.name,
        sku: baseProduct.sku,
        price: baseProduct.price,
        type: baseProduct.type
      },
      bundle
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
