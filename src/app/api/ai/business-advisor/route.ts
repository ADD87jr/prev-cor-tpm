import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminAuthMiddleware } from "@/lib/auth-middleware";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const db = prisma as any;

// GET /api/ai/business-advisor — Consilier AI de afaceri
export async function GET(req: NextRequest) {
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;

  try {
    // Adună toate datele din baza de date
    const [products, variants, orders, abandonedCarts, wishlists, newsletters] = await Promise.all([
      prisma.product.findMany({
        select: {
          id: true, name: true, price: true, listPrice: true, purchasePrice: true,
          stock: true, onDemand: true, domain: true, type: true, brand: true,
          manufacturer: true, discount: true, discountType: true,
        },
      }),
      db.productVariant.findMany({
        select: {
          id: true, productId: true, code: true, pret: true, listPrice: true,
          purchasePrice: true, stoc: true, active: true, onDemand: true,
        },
      }),
      db.order.findMany({
        select: { id: true, total: true, status: true, date: true, items: true, paymentMethod: true },
        orderBy: { date: "desc" },
        take: 500,
      }),
      db.abandonedCart.findMany({
        where: { recovered: false },
        select: { total: true, items: true, createdAt: true },
      }),
      db.wishlist.findMany({ select: { items: true } }),
      db.newsletter.count({ where: { active: true } }),
    ]);

    // === ANALIZA MARJELOR ===
    // Exclude produsele onDemand din analiza marjelor (sunt servicii/licențe cu preț pe cerere)
    const marginAnalysis = products
      .filter((p: any) => p.purchasePrice && p.purchasePrice > 0 && !p.onDemand)
      .map((p: any) => {
        const margin = p.price - p.purchasePrice;
        const marginPercent = (margin / p.purchasePrice) * 100;
        return {
          id: p.id,
          name: p.name,
          purchasePrice: p.purchasePrice,
          salePrice: p.price,
          listPrice: p.listPrice,
          margin: Math.round(margin * 100) / 100,
          marginPercent: Math.round(marginPercent * 10) / 10,
          domain: p.domain,
          type: p.type,
          stock: p.stock,
        };
      })
      .sort((a: any, b: any) => a.marginPercent - b.marginPercent);

    const lowMarginProducts = marginAnalysis.filter((p: any) => p.marginPercent < 15);
    const highMarginProducts = marginAnalysis.filter((p: any) => p.marginPercent > 50);
    const avgMargin = marginAnalysis.length > 0
      ? Math.round(marginAnalysis.reduce((sum: number, p: any) => sum + p.marginPercent, 0) / marginAnalysis.length * 10) / 10
      : 0;

    // Produse fără preț de achiziție setat (exclude onDemand)
    const noPurchasePrice = products.filter((p: any) => (!p.purchasePrice || p.purchasePrice === 0) && !p.onDemand);

    // === ANALIZA VÂNZĂRILOR ===
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    const last30 = orders.filter((o: any) => new Date(o.date) >= thirtyDaysAgo);
    const prev30 = orders.filter((o: any) => {
      const d = new Date(o.date);
      return d >= sixtyDaysAgo && d < thirtyDaysAgo;
    });
    const last90 = orders.filter((o: any) => new Date(o.date) >= ninetyDaysAgo);

    const revenue30 = last30.reduce((s: number, o: any) => s + (Number(o.total) || 0), 0);
    const revenue60 = prev30.reduce((s: number, o: any) => s + (Number(o.total) || 0), 0);
    const revenueGrowth = revenue60 > 0 ? ((revenue30 - revenue60) / revenue60 * 100) : 0;

    // Ce produse se vând cel mai bine (ultimele 90 zile)
    const salesByProduct: Record<string, { name: string; qty: number; revenue: number; productId?: number }> = {};
    for (const order of last90) {
      const items = Array.isArray(order.items) ? order.items : [];
      for (const item of items) {
        const key = item.name || item.id || "Unknown";
        if (!salesByProduct[key]) {
          salesByProduct[key] = { name: key, qty: 0, revenue: 0, productId: item.id };
        }
        salesByProduct[key].qty += Number(item.quantity || item.qty || 1);
        salesByProduct[key].revenue += (Number(item.price) || 0) * (Number(item.quantity || item.qty || 1));
      }
    }
    const topSelling = Object.values(salesByProduct).sort((a, b) => b.revenue - a.revenue).slice(0, 15);
    const slowProducts = products.filter((p: any) => {
      const sold = Object.values(salesByProduct).find((s: any) => s.productId === p.id);
      return !sold && p.stock > 0 && !p.onDemand;
    });

    // Vânzări pe domeniu
    const domainAnalysis: Record<string, { orders: number; revenue: number; products: number }> = {};
    for (const p of products) {
      if (!domainAnalysis[p.domain]) domainAnalysis[p.domain] = { orders: 0, revenue: 0, products: 0 };
      domainAnalysis[p.domain].products++;
    }
    for (const order of last90) {
      const items = Array.isArray(order.items) ? order.items : [];
      for (const item of items) {
        const prod = products.find((p: any) => p.id === item.id || p.name === item.name);
        const domain = prod?.domain || "Altele";
        if (!domainAnalysis[domain]) domainAnalysis[domain] = { orders: 0, revenue: 0, products: 0 };
        domainAnalysis[domain].orders += Number(item.quantity || item.qty || 1);
        domainAnalysis[domain].revenue += (Number(item.price) || 0) * (Number(item.quantity || item.qty || 1));
      }
    }

    // Wishlist analysis - ce vor clienții
    const wishlistDemand: Record<number, { name: string; count: number }> = {};
    for (const wl of wishlists) {
      const items = Array.isArray(wl.items) ? wl.items : [];
      for (const item of items) {
        if (item.id) {
          if (!wishlistDemand[item.id]) wishlistDemand[item.id] = { name: item.name || `#${item.id}`, count: 0 };
          wishlistDemand[item.id].count++;
        }
      }
    }
    const topWishlist = Object.entries(wishlistDemand)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 10)
      .map(([id, data]) => {
        const prod = products.find((p: any) => p.id === Number(id));
        return { ...data, id: Number(id), stock: prod?.stock || 0, price: prod?.price || 0 };
      });

    // Coșuri abandonate - ce produse se pierd 
    const abandonedProducts: Record<string, { name: string; count: number; lostRevenue: number }> = {};
    for (const cart of abandonedCarts) {
      const items = Array.isArray(cart.items) ? cart.items : [];
      for (const item of items) {
        const key = item.name || "Unknown";
        if (!abandonedProducts[key]) abandonedProducts[key] = { name: key, count: 0, lostRevenue: 0 };
        abandonedProducts[key].count += Number(item.quantity || 1);
        abandonedProducts[key].lostRevenue += (Number(item.price) || 0) * (Number(item.quantity || 1));
      }
    }
    const topAbandoned = Object.values(abandonedProducts)
      .sort((a, b) => b.lostRevenue - a.lostRevenue)
      .slice(0, 10);

    // === CONSTRUIEȘTE CONTEXTUL PENTRU GEMINI ===
    const businessData = {
      totalProducts: products.length,
      totalVariants: variants.length,
      totalOrders: orders.length,
      avgMargin: avgMargin + "%",
      revenue30days: Math.round(revenue30) + " RON",
      revenue60days: Math.round(revenue60) + " RON",
      revenueGrowth: Math.round(revenueGrowth) + "%",
      activeNewsletters: newsletters,
      abandonedCartsCount: abandonedCarts.length,
      abandonedCartsValue: Math.round(abandonedCarts.reduce((s: number, c: any) => s + (Number(c.total) || 0), 0)) + " RON",
      lowMarginCount: lowMarginProducts.length,
      highMarginCount: highMarginProducts.length,
      noPurchasePriceCount: noPurchasePrice.length,
      slowProductsCount: slowProducts.length,
      topDomains: Object.entries(domainAnalysis)
        .sort(([, a], [, b]) => b.revenue - a.revenue)
        .slice(0, 5)
        .map(([d, v]) => `${d}: ${v.products} produse, ${Math.round(v.revenue)} RON venit, ${v.orders} vândute`),
      top5Selling: topSelling.slice(0, 5).map((p) => `${p.name}: ${p.qty} buc, ${Math.round(p.revenue)} RON`),
      top5LowMargin: lowMarginProducts.slice(0, 5).map((p: any) => `${p.name}: cumpărat ${p.purchasePrice} RON, vândut ${p.salePrice} RON, marjă ${p.marginPercent}%`),
      top5HighMargin: highMarginProducts.slice(-5).reverse().map((p: any) => `${p.name}: cumpărat ${p.purchasePrice} RON, vândut ${p.salePrice} RON, marjă ${p.marginPercent}%`),
      top5Wishlist: topWishlist.slice(0, 5).map((p) => `${p.name}: ${p.count} wishlist-uri, stoc: ${p.stock}, preț: ${p.price} RON`),
      top5Abandoned: topAbandoned.slice(0, 5).map((p) => `${p.name}: pierdut ${p.count} buc, ${Math.round(p.lostRevenue)} RON`),
      slowProducts: slowProducts.slice(0, 10).map((p: any) => `${p.name}: stoc ${p.stock}, preț ${p.price} RON, domeniu ${p.domain}`),
    };

    // Dacă avem Gemini API, generăm sfaturi personalizate
    let aiAdvice = null;
    if (GEMINI_API_KEY) {
      aiAdvice = await getGeminiAdvice(businessData);
    }

    return NextResponse.json({
      margins: {
        average: avgMargin,
        lowMargin: lowMarginProducts.slice(0, 10),
        highMargin: highMarginProducts.slice(-10).reverse(),
        noPurchasePrice: noPurchasePrice.map((p: any) => ({ id: p.id, name: p.name, price: p.price })).slice(0, 20),
      },
      sales: {
        revenue30days: Math.round(revenue30),
        revenue60days: Math.round(revenue60),
        revenueGrowth: Math.round(revenueGrowth),
        orders30days: last30.length,
        topSelling,
        slowProducts: slowProducts.slice(0, 15).map((p: any) => ({
          id: p.id, name: p.name, stock: p.stock, price: p.price, domain: p.domain,
        })),
        domainPerformance: Object.entries(domainAnalysis)
          .sort(([, a], [, b]) => b.revenue - a.revenue)
          .map(([domain, data]) => ({ domain, ...data })),
      },
      demand: {
        topWishlist,
        topAbandoned,
        abandonedTotal: Math.round(abandonedCarts.reduce((s: number, c: any) => s + (Number(c.total) || 0), 0)),
      },
      aiAdvice,
      newsletters,
    });
  } catch (error) {
    console.error("[AI BUSINESS ADVISOR] Error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// POST /api/ai/business-advisor — Întrebare specifică către AI
export async function POST(req: NextRequest) {
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;

  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: "Cheia Gemini API nu este configurată" }, { status: 400 });
  }

  try {
    const { question, context } = await req.json();
    if (!question) {
      return NextResponse.json({ error: "Întrebarea lipsește" }, { status: 400 });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            role: "user",
            parts: [{ text: `Ești un consultant expert în e-commerce și automatizare industrială. 
Compania: S.C. PREV-COR TPM S.R.L. — vinde echipamente de automatizare industrială (senzori, PLC-uri, protecții electrice, etc.).

Date afacere:
${JSON.stringify(context, null, 2)}

Întrebarea administratorului: ${question}

Răspunde în română, concis și cu sfaturi concrete și acționabile. Include cifre specifice unde poți. Format răspunsul cu bullet points.` }],
          }],
          generationConfig: { maxOutputTokens: 1000, temperature: 0.7 },
        }),
      }
    );

    if (!response.ok) {
      return NextResponse.json({ error: "Eroare Gemini API" }, { status: 500 });
    }

    const data = await response.json();
    const answer = data.candidates?.[0]?.content?.parts?.[0]?.text || "Nu am putut genera un răspuns.";
    return NextResponse.json({ answer });
  } catch (error) {
    console.error("[AI BUSINESS ADVISOR] POST Error:", error);
    return NextResponse.json({ error: "Eroare server" }, { status: 500 });
  }
}

async function getGeminiAdvice(data: any): Promise<string | null> {
  try {
    const prompt = `Ești un consultant expert în e-commerce și automatizare industrială din România.
Analizează datele afacerii PREV-COR TPM (echipamente automatizare industrială) și dă SFATURI CONCRETE:

DATELE AFACERII:
- Total produse: ${data.totalProducts}, variante: ${data.totalVariants}
- Total comenzi: ${data.totalOrders}
- Venit ultimele 30 zile: ${data.revenue30days} | Venit 30-60 zile: ${data.revenue60days}
- Creștere venituri: ${data.revenueGrowth}
- Marjă medie: ${data.avgMargin}
- Produse cu marjă mică (<15%): ${data.lowMarginCount}
- Produse cu marjă mare (>50%): ${data.highMarginCount}
- Produse fără preț de achiziție setat: ${data.noPurchasePriceCount}
- Produse nevândute (cu stoc): ${data.slowProductsCount}
- Coșuri abandonate: ${data.abandonedCartsCount} (valoare: ${data.abandonedCartsValue})
- Abonați newsletter: ${data.activeNewsletters}

TOP DOMENII (vânzări 90 zile):
${data.topDomains.join("\n")}

TOP 5 PRODUSE VÂNDUTE:
${data.top5Selling.join("\n")}

PRODUSE CU MARJĂ MICĂ (riscante):
${data.top5LowMargin.join("\n")}

PRODUSE CU MARJĂ MARE (profitabile):
${data.top5HighMargin.join("\n")}

PRODUSE DORITE ÎN WISHLIST-URI:
${data.top5Wishlist.join("\n")}

PRODUSE PIERDUTE DIN COȘURI ABANDONATE:
${data.top5Abandoned.join("\n")}

PRODUSE NEVÂNDUTE (STOC MORT):
${data.slowProducts.join("\n")}

Dă sfaturi în ROMÂNĂ, organizate pe categorii:
1. 💰 STRATEGIA DE PREȚURI — Ce produse trebuie să crească/scadă prețul, cum optimizezi marjele
2. 📦 CE SĂ CUMPERI — Pe ce produse/domenii să investești, de la ce furnizori (generic), ce stoc să menții
3. 🚀 CUM SĂ VINZI MAI MULT — Strategii de marketing, promoții, bundling
4. ⚠️ PROBLEME DE REZOLVAT — Stoc mort, marje mici, coșuri abandonate
5. 📈 PLAN DE ACȚIUNE LUNA ACEASTA — Top 5 acțiuni concrete, prioritizate

Fii SPECIFIC cu nume de produse și cifre reale din date. Nu da sfaturi generice.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 2000, temperature: 0.7 },
        }),
      }
    );

    if (!response.ok) return null;
    const result = await response.json();
    return result.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch (error) {
    console.error("[GEMINI ADVICE] Error:", error);
    return null;
  }
}
