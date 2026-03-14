import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyDPMtQTjaruCtql9qAFqcavAzKwXRdjsnA";

// GET - Analizează produse frecvent cumpărate împreună
export async function GET() {
  try {
    const orders = await prisma.order.findMany({
      where: { status: { not: "cancelled" } },
      select: { items: true },
      take: 500
    });

    // Analizează co-occurrence
    const pairCount = new Map<string, number>();
    const productNames = new Map<number, string>();

    for (const order of orders) {
      let items: any[] = [];
      try {
        items = typeof order.items === "string" ? JSON.parse(order.items) : order.items || [];
      } catch { continue; }

      const ids = items.map(i => i.productId || i.id).filter(Boolean);
      items.forEach(i => {
        if (i.productId || i.id) productNames.set(i.productId || i.id, i.name || i.productName || "");
      });

      // Generează perechi
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          const key = [ids[i], ids[j]].sort().join("-");
          pairCount.set(key, (pairCount.get(key) || 0) + 1);
        }
      }
    }

    // Top perechi
    const topPairs = Array.from(pairCount.entries())
      .map(([key, count]) => {
        const [id1, id2] = key.split("-").map(Number);
        return {
          product1Id: id1,
          product1Name: productNames.get(id1) || `Produs ${id1}`,
          product2Id: id2,
          product2Name: productNames.get(id2) || `Produs ${id2}`,
          coOccurrence: count
        };
      })
      .sort((a, b) => b.coOccurrence - a.coOccurrence)
      .slice(0, 30);

    return NextResponse.json({
      topPairs,
      stats: {
        ordersAnalyzed: orders.length,
        uniquePairs: pairCount.size
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Generează bundle recomandat
export async function POST(req: NextRequest) {
  try {
    const { productIds, bundleName } = await req.json();

    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        name: true,
        type: true,
        price: true,
        manufacturer: true
      }
    });

    if (products.length < 2) {
      return NextResponse.json({ error: "Selectează minim 2 produse" }, { status: 400 });
    }

    const totalPrice = products.reduce((sum, p) => sum + p.price, 0);

    const prompt = `Ești expert în vânzări B2B pentru automatizări industriale.

PRODUSE PENTRU BUNDLE:
${products.map(p => `- ${p.name} (${p.type || "N/A"}) - ${p.price} RON`).join("\n")}

Preț total individual: ${totalPrice} RON

Creează un pachet atractiv care să aibă sens tehnic și comercial.
Sugerează discount optim care să crească vânzările dar să păstreze marjă.

Returnează JSON:
{
  "bundleName": "Nume pachet atractiv",
  "bundleDescription": "descriere care evidențiază beneficiile tehnice",
  "suggestedDiscount": 15,
  "bundlePrice": ${totalPrice * 0.85},
  "savings": ${totalPrice * 0.15},
  "targetAudience": "pentru cine e potrivit",
  "useCases": ["caz utilizare 1", "caz 2"],
  "marketingCopy": "text promoțional scurt",
  "technicalSynergy": "de ce aceste produse merg împreună",
  "additionalProducts": ["produs suplimentar sugerat"],
  "estimatedDemand": "low/medium/high"
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

    let bundle;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      bundle = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch {
      bundle = {
        bundleName: bundleName || "Pachet Automatizare",
        bundleDescription: text,
        suggestedDiscount: 10,
        bundlePrice: totalPrice * 0.9,
        savings: totalPrice * 0.1
      };
    }

    return NextResponse.json({
      products,
      originalPrice: totalPrice,
      ...bundle
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
