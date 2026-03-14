import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyDPMtQTjaruCtql9qAFqcavAzKwXRdjsnA";

// GET - Analizează comenzile și generează recomandări cross-sell
export async function GET() {
  try {
    // Obține ultimele 200 comenzi pentru analiză
    const orders = await prisma.order.findMany({
      where: { status: { not: "cancelled" } },
      select: { id: true, items: true, total: true },
      orderBy: { date: "desc" },
      take: 200
    });

    // Parsează și analizează combinațiile de produse
    const productPairs: Record<string, { count: number; products: [number, number] }> = {};
    const productFrequency: Record<number, number> = {};

    for (const order of orders) {
      let items: any[] = [];
      try {
        items = typeof order.items === "string" ? JSON.parse(order.items) : order.items || [];
      } catch { continue; }

      const productIds = items.map(i => i.productId || i.id).filter(Boolean);

      // Frecvența produselor
      for (const pid of productIds) {
        productFrequency[pid] = (productFrequency[pid] || 0) + 1;
      }

      // Perechi de produse
      for (let i = 0; i < productIds.length; i++) {
        for (let j = i + 1; j < productIds.length; j++) {
          const key = [productIds[i], productIds[j]].sort().join("-");
          if (!productPairs[key]) {
            productPairs[key] = { count: 0, products: [productIds[i], productIds[j]] };
          }
          productPairs[key].count++;
        }
      }
    }

    // Top perechi
    const topPairs = Object.values(productPairs)
      .filter(p => p.count >= 2)
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    // Obține detalii produse
    const allProductIds = new Set<number>();
    topPairs.forEach(p => {
      allProductIds.add(p.products[0]);
      allProductIds.add(p.products[1]);
    });

    const products = await prisma.product.findMany({
      where: { id: { in: Array.from(allProductIds) } },
      select: { id: true, name: true, price: true, type: true }
    });

    const productMap = Object.fromEntries(products.map(p => [p.id, p]));

    const crossSellData = topPairs.map(pair => ({
      count: pair.count,
      product1: productMap[pair.products[0]] || { id: pair.products[0], name: "Unknown" },
      product2: productMap[pair.products[1]] || { id: pair.products[1], name: "Unknown" }
    }));

    return NextResponse.json({
      crossSellPairs: crossSellData,
      ordersAnalyzed: orders.length,
      stats: {
        totalPairs: Object.keys(productPairs).length,
        frequentPairs: topPairs.length
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Generează recomandări cross-sell pentru un produs specific
export async function POST(request: NextRequest) {
  try {
    const { productId } = await request.json();

    if (!productId) {
      return NextResponse.json({ error: "productId obligatoriu" }, { status: 400 });
    }

    // Obține produsul
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true, type: true, domain: true, price: true, description: true }
    });

    if (!product) {
      return NextResponse.json({ error: "Produs negăsit" }, { status: 404 });
    }

    // Analizează comenzile care conțin acest produs
    const orders = await prisma.order.findMany({
      where: { status: { not: "cancelled" } },
      select: { items: true },
      take: 500
    });

    const coProducts: Record<number, number> = {};

    for (const order of orders) {
      let items: any[] = [];
      try {
        items = typeof order.items === "string" ? JSON.parse(order.items) : order.items || [];
      } catch { continue; }

      const productIds = items.map(i => i.productId || i.id).filter(Boolean);

      if (productIds.includes(productId)) {
        for (const pid of productIds) {
          if (pid !== productId) {
            coProducts[pid] = (coProducts[pid] || 0) + 1;
          }
        }
      }
    }

    // Top co-produse
    const topCoProducts = Object.entries(coProducts)
      .map(([id, count]) => ({ id: parseInt(id), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Obține detalii
    const coProductDetails = await prisma.product.findMany({
      where: { id: { in: topCoProducts.map(p => p.id) } },
      select: { id: true, name: true, price: true, type: true, stock: true }
    });

    const detailMap = Object.fromEntries(coProductDetails.map(p => [p.id, p]));

    // Combinăm cu AI pentru recomandări inteligente
    const candidates = topCoProducts.map(cp => ({
      ...detailMap[cp.id],
      purchasedTogether: cp.count
    })).filter(c => c.name);

    if (candidates.length === 0) {
      // Dacă nu avem date, folosim AI să sugereze
      const similarProducts = await prisma.product.findMany({
        where: {
          id: { not: productId },
          OR: [{ type: product.type }, { domain: product.domain }]
        },
        select: { id: true, name: true, price: true, type: true },
        take: 10
      });

      return NextResponse.json({
        success: true,
        product,
        recommendations: similarProducts.map(p => ({
          ...p,
          reason: "Produs similar din aceeași categorie",
          score: 70
        })),
        source: "similar_category"
      });
    }

    const prompt = `Ești expert în vânzări B2B pentru automatizări industriale.

PRODUS PRINCIPAL:
${product.name} (${product.type}) - ${product.price} RON

PRODUSE CUMPĂRATE FRECVENT ÎMPREUNĂ (date reale din comenzi):
${candidates.map((c, i) => `${i + 1}. ${c.name} | ${c.price} RON | Împreună de ${c.purchasedTogether}x`).join("\n")}

Analizează și ordonează după relevanță pentru cross-sell.
Explică de ce fiecare produs e o recomandare bună.

Returnează DOAR JSON:
{
  "recommendations": [
    {
      "productId": 1,
      "productName": "...",
      "score": 95,
      "reason": "explicație scurtă",
      "crossSellMessage": "mesaj pentru client, ex: 'Clienții care au cumpărat X au luat și Y'"
    }
  ]
}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 1000, temperature: 0.5 }
        })
      }
    );

    if (!response.ok) {
      // Fallback fără AI
      return NextResponse.json({
        success: true,
        product,
        recommendations: candidates.slice(0, 5).map(c => ({
          productId: c.id,
          productName: c.name,
          price: c.price,
          score: Math.min(95, 50 + c.purchasedTogether * 10),
          reason: `Cumpărat împreună de ${c.purchasedTogether} ori`
        })),
        source: "data_only"
      });
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
      // Fallback
      result = {
        recommendations: candidates.slice(0, 5).map(c => ({
          productId: c.id,
          productName: c.name,
          score: 80,
          reason: `Cumpărat împreună de ${c.purchasedTogether} ori`
        }))
      };
    }

    return NextResponse.json({
      success: true,
      product,
      ...result,
      source: "ai_enhanced"
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
