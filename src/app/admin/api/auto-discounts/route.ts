import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminAuthMiddleware } from "@/lib/auth-middleware";

const db = prisma as any;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

// GET — analizează și sugerează reduceri inteligente
export async function GET(req: NextRequest) {
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;

  try {
    const [products, orders, wishlists, abandonedCarts] = await Promise.all([
      prisma.product.findMany({
        select: {
          id: true, name: true, price: true, listPrice: true, purchasePrice: true,
          stock: true, onDemand: true, domain: true, type: true, discount: true, discountType: true,
        },
      }),
      db.order.findMany({
        select: { items: true, date: true },
        orderBy: { date: "desc" },
        take: 200,
      }),
      db.wishlist.findMany({ select: { items: true } }),
      db.abandonedCart.findMany({ where: { recovered: false }, select: { items: true, total: true } }),
    ]);

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    // Produse vândute în ultimele 90 zile
    const salesMap: Record<number, number> = {};
    const recent90 = orders.filter((o: any) => new Date(o.date) >= ninetyDaysAgo);
    for (const order of recent90) {
      const items = Array.isArray(order.items) ? order.items : [];
      for (const item of items) {
        if (item.id) salesMap[item.id] = (salesMap[item.id] || 0) + Number(item.quantity || 1);
      }
    }

    // Wishlist counts
    const wishMap: Record<number, number> = {};
    for (const wl of wishlists) {
      const items = Array.isArray(wl.items) ? wl.items : [];
      for (const item of items) if (item.id) wishMap[item.id] = (wishMap[item.id] || 0) + 1;
    }

    // Abandoned cart counts
    const abandonMap: Record<number, number> = {};
    for (const cart of abandonedCarts) {
      const items = Array.isArray(cart.items) ? cart.items : [];
      for (const item of items) if (item.id) abandonMap[item.id] = (abandonMap[item.id] || 0) + 1;
    }

    // Generează sugestii de reduceri
    const suggestions = products
      .filter((p: any) => p.stock > 0 && !p.onDemand)
      .map((p: any) => {
        const soldQty = salesMap[p.id] || 0;
        const wishCount = wishMap[p.id] || 0;
        const abandonCount = abandonMap[p.id] || 0;
        const margin = p.purchasePrice ? ((p.price - p.purchasePrice) / p.purchasePrice * 100) : null;
        const hasDiscount = p.discount && p.discount > 0;

        let reason = "";
        let suggestedDiscount = 0;
        let priority = 0;

        // Stoc mort — nevândut în 90 zile cu stoc > 0
        if (soldQty === 0 && p.stock > 3) {
          reason = "Stoc mort — nevândut în 90 zile";
          suggestedDiscount = 15;
          priority = 3;
        }
        // Stoc mare + puține vânzări
        else if (soldQty <= 2 && p.stock > 5) {
          reason = "Vânzări slabe, stoc mare";
          suggestedDiscount = 10;
          priority = 2;
        }
        // Produse în coșuri abandonate — preț prea mare
        if (abandonCount >= 2) {
          reason = `Abandonat de ${abandonCount} ori — preț posibil prea mare`;
          suggestedDiscount = Math.max(suggestedDiscount, 8);
          priority = Math.max(priority, 2);
        }
        // Produse populare în wishlist dar nevândute — reducere mică stimulează
        if (wishCount >= 2 && soldQty < 3) {
          reason = `${wishCount} wishlist-uri, doar ${soldQty} vânzări — reducere mică stimulează`;
          suggestedDiscount = Math.max(suggestedDiscount, 5);
          priority = Math.max(priority, 1);
        }

        // Ajustează reducerea bazat pe marjă
        if (margin !== null && margin < 20) {
          suggestedDiscount = Math.min(suggestedDiscount, 5); // Nu da reducere mare pe marjă mică
        }

        // Nu sugera reducere dacă raport vânzări/stoc bun
        if (soldQty > 5 && suggestedDiscount < 10) return null;
        if (suggestedDiscount === 0) return null;

        const newPrice = Math.round(p.price * (1 - suggestedDiscount / 100) * 100) / 100;

        return {
          id: p.id,
          name: p.name,
          currentPrice: p.price,
          purchasePrice: p.purchasePrice,
          suggestedDiscount,
          newPrice,
          margin: margin ? Math.round(margin) : null,
          stock: p.stock,
          soldQty,
          wishCount,
          abandonCount,
          reason,
          priority,
          hasDiscount,
          domain: p.domain,
        };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => b.priority - a.priority || b.stock - a.stock);

    // AI analysis
    let aiAnalysis = null;
    if (GEMINI_API_KEY && suggestions.length > 0) {
      aiAnalysis = await getDiscountAdvice(suggestions.slice(0, 15) as any[]);
    }

    return NextResponse.json({
      suggestions,
      totalPotentialRevenue: (suggestions as any[]).reduce((s, p: any) => s + (p.newPrice * p.stock), 0),
      currentStockValue: (suggestions as any[]).reduce((s, p: any) => s + (p.currentPrice * p.stock), 0),
      aiAnalysis,
    });
  } catch (error) {
    console.error("[AUTO-DISCOUNTS] GET Error:", error);
    return NextResponse.json({ error: "Eroare server" }, { status: 500 });
  }
}

// POST — aplică reducerile selectate
export async function POST(req: NextRequest) {
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;

  try {
    const { discounts } = await req.json();
    // discounts = [{productId, discount, discountType: "percent"}]

    if (!discounts || !Array.isArray(discounts) || discounts.length === 0) {
      return NextResponse.json({ error: "Selectează cel puțin o reducere" }, { status: 400 });
    }

    let applied = 0;
    for (const d of discounts) {
      await prisma.product.update({
        where: { id: d.productId },
        data: {
          discount: d.discount,
          discountType: "percent",
        },
      });
      applied++;
    }

    return NextResponse.json({ success: true, applied });
  } catch (error) {
    console.error("[AUTO-DISCOUNTS] POST Error:", error);
    return NextResponse.json({ error: "Eroare server" }, { status: 500 });
  }
}

async function getDiscountAdvice(suggestions: any[]): Promise<string | null> {
  try {
    const list = suggestions.map((s) =>
      `- ${s.name}: preț ${s.currentPrice} RON, stoc ${s.stock}, vândute ${s.soldQty}/90zile, marjă ${s.margin || "?"}%, sugestie -${s.suggestedDiscount}%, motiv: ${s.reason}`
    ).join("\n");

    const prompt = `Ești un consultant de prețuri pentru un magazin de automatizare industrială.
Analizează aceste sugestii de reduceri și dă sfatul tău expert:

${list}

Răspunde concis în română:
1. Care reduceri sunt OK de aplicat imediat?
2. Care trebuie gândite mai bine (și de ce)?
3. Ce strategii alternative recomanzi (bundling, transport gratuit, etc.)?
4. Care produse ar trebui scoase din ofertă (stoc mort nerealista de vândut)?`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 1000, temperature: 0.7 },
        }),
      }
    );

    if (!response.ok) return null;
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch {
    return null;
  }
}
