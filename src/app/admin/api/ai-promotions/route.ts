import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminAuthMiddleware } from "@/lib/auth-middleware";

const db = prisma as any;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

// GET — listează promoțiile generate
export async function GET(req: NextRequest) {
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;

  try {
    const promos = await db.aIPromotion.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json(promos);
  } catch (error) {
    console.error("[AI-PROMOTIONS] GET Error:", error);
    return NextResponse.json({ error: "Eroare server" }, { status: 500 });
  }
}

// POST — generează promoții AI
export async function POST(req: NextRequest) {
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;

  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: "Cheia Gemini API nu este configurată" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const action = body.action || "generate";

    if (action === "generate") {
      return await generatePromotions(body.type || "all");
    }

    if (action === "approve") {
      const { promoId } = body;
      const promo = await db.aIPromotion.update({
        where: { id: parseInt(promoId) },
        data: { status: "approved" },
      });
      return NextResponse.json(promo);
    }

    if (action === "delete") {
      const { promoId } = body;
      await db.aIPromotion.delete({ where: { id: parseInt(promoId) } });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Acțiune necunoscută" }, { status: 400 });
  } catch (error) {
    console.error("[AI-PROMOTIONS] POST Error:", error);
    return NextResponse.json({ error: "Eroare server" }, { status: 500 });
  }
}

async function generatePromotions(type: string) {
  // Adună date pentru context
  const [products, orders, wishlists] = await Promise.all([
    prisma.product.findMany({
      select: { id: true, name: true, price: true, listPrice: true, stock: true, domain: true, type: true, discount: true },
    }),
    db.order.findMany({
      select: { items: true, date: true },
      orderBy: { date: "desc" },
      take: 100,
    }),
    db.wishlist.findMany({ select: { items: true } }),
  ]);

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Top sellers
  const salesCount: Record<string, number> = {};
  for (const order of orders) {
    const items = Array.isArray(order.items) ? order.items : [];
    for (const item of items) {
      salesCount[item.name || item.id] = (salesCount[item.name || item.id] || 0) + (Number(item.quantity || 1));
    }
  }
  const topSellers = Object.entries(salesCount).sort(([, a], [, b]) => b - a).slice(0, 10);

  // Slow stock
  const soldIds = new Set<number>();
  const recentOrders = orders.filter((o: any) => new Date(o.date) >= thirtyDaysAgo);
  for (const order of recentOrders) {
    const items = Array.isArray(order.items) ? order.items : [];
    for (const item of items) if (item.id) soldIds.add(item.id);
  }
  const slowStock = products.filter((p: any) => p.stock > 0 && !soldIds.has(p.id)).slice(0, 10);

  // Wishlist popular
  const wishCounts: Record<number, number> = {};
  for (const wl of wishlists) {
    const items = Array.isArray(wl.items) ? wl.items : [];
    for (const item of items) if (item.id) wishCounts[item.id] = (wishCounts[item.id] || 0) + 1;
  }

  const prompt = `Ești un expert în marketing pentru un magazin online de automatizare industrială (PREV-COR TPM).
Compania vinde: senzori industriali, PLC-uri, protecții electrice, echipamente de automatizare.
Clienți: firme de producție, integratori de sisteme, electricieni industriali.

DATELE:
- Top produse vândute: ${topSellers.slice(0, 5).map(([name, qty]) => `${name} (${qty} buc)`).join(", ")}
- Produse cu stoc mort (nevândute 30 zile): ${slowStock.map((p: any) => `${p.name} (${p.stock} buc, ${p.price} RON)`).join(", ")}
- Total produse: ${products.length}
- Produse cu reducere: ${products.filter((p: any) => p.discount && p.discount > 0).length}

${type === "email" || type === "all" ? `
GENEREAZĂ un email marketing:
- Subject line atractiv
- Corp email (HTML simplu) cu oferta lunii
- Include 3-5 produse recomandate
- Call-to-action clar
- Tonul: profesional dar prietenos, B2B
` : ""}

${type === "social" || type === "all" ? `
GENEREAZĂ 3 postări social media:
1. O postare de promovare produs bestseller
2. O postare pentru stoc mort (reducere specială)
3. O postare educațională (sfat tehnic legat de automatizare)
Fiecare cu hashtag-uri relevante.
` : ""}

${type === "discount" || type === "all" ? `
SUGEREAZĂ reduceri inteligente:
- Ce produse merită reducere (stoc mort)
- Ce procent de reducere (realist)
- Ce bundle-uri de produse s-ar potrivi
- Ce oferte cross-sell fac sens
` : ""}

Răspunde structurat cu secțiuni clare, în română. Folosește nume reale de produse din date.`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 2000, temperature: 0.8 },
      }),
    }
  );

  if (!response.ok) {
    return NextResponse.json({ error: "Eroare Gemini API" }, { status: 500 });
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

  // Salvează promoțiile generate
  const targetProducts = [...slowStock.slice(0, 3), ...products.filter((p: any) => topSellers.some(([name]) => name === p.name)).slice(0, 2)]
    .map((p: any) => ({ id: p.id, name: p.name }));

  const promoTypes = type === "all" ? ["email", "social", "discount"] : [type];

  const createdPromos = [];
  for (const t of promoTypes) {
    const promo = await db.aIPromotion.create({
      data: {
        type: t,
        title: `Promoție AI — ${t === "email" ? "Email Marketing" : t === "social" ? "Social Media" : "Reduceri Inteligente"} — ${new Date().toLocaleDateString("ro-RO")}`,
        content,
        targetProducts,
        status: "draft",
      },
    });
    createdPromos.push(promo);
  }

  return NextResponse.json({
    message: `${createdPromos.length} promoții generate cu succes`,
    promotions: createdPromos,
    content,
  });
}
