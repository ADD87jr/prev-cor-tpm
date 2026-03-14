import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyDPMtQTjaruCtql9qAFqcavAzKwXRdjsnA";

// GET - Recommendations pentru un produs specific sau client
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("productId");
    const clientEmail = searchParams.get("client");
    const type = searchParams.get("type") || "similar"; // similar, complementary, trending

    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        sku: true,
        type: true,
        manufacturer: true,
        price: true,
        description: true,
        stock: true
      }
    });

    const orders = await prisma.order.findMany({
      where: { status: { in: ["completed", "shipped"] } },
      select: {
        items: true,
        clientData: true,
        date: true
      }
    });

    let recommendations: any[] = [];

    if (productId) {
      // Recomandări bazate pe un produs specific
      const targetProduct = products.find(p => String(p.id) === productId);
      if (!targetProduct) {
        return NextResponse.json({ error: "Produs negăsit" }, { status: 404 });
      }

      // Găsește ce produse se cumpără împreună cu acest produs
      const coOccurrences: Record<string, { count: number; product: any }> = {};

      for (const order of orders) {
        const items = order.items as any[];
        if (!Array.isArray(items)) continue;

        const hasTarget = items.some(item => 
          String(item.productId) === productId || item.name === targetProduct.name
        );

        if (hasTarget) {
          for (const item of items) {
            const itemId = String(item.productId || item.id);
            if (itemId !== productId) {
              if (!coOccurrences[itemId]) {
                const prod = products.find(p => String(p.id) === itemId || p.name === item.name);
                coOccurrences[itemId] = { count: 0, product: prod || item };
              }
              coOccurrences[itemId].count++;
            }
          }
        }
      }

      // Sortează după frecvență
      recommendations = Object.values(coOccurrences)
        .filter(co => co.product && co.count >= 1)
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
        .map(co => ({
          ...co.product,
          recommendationType: "FREQUENTLY_BOUGHT_TOGETHER",
          score: co.count,
          reason: `Cumpărat împreună de ${co.count} ori`
        }));

      // Adaugă și produse similare (aceeași categorie)
      const similarProducts = products
        .filter(p => 
          String(p.id) !== productId && 
          p.type === targetProduct.type &&
          !recommendations.some(r => r.id === p.id)
        )
        .slice(0, 5)
        .map(p => ({
          ...p,
          recommendationType: "SIMILAR_CATEGORY",
          score: 0.5,
          reason: `Același tip: ${p.type}`
        }));

      recommendations = [...recommendations, ...similarProducts];

    } else if (clientEmail) {
      // Recomandări personalizate pentru un client
      const clientOrders = orders.filter(o => {
        const cd = o.clientData as any;
        return cd?.email === clientEmail;
      });

      // Produse cumpărate de client
      const purchasedIds = new Set<string>();
      const purchasedTypes = new Set<string>();

      for (const order of clientOrders) {
        const items = order.items as any[];
        if (!Array.isArray(items)) continue;
        for (const item of items) {
          purchasedIds.add(String(item.productId || item.id));
          if (item.type) purchasedTypes.add(item.type);
        }
      }

      // Recomandă produse din aceleași categorii dar necumpărate
      recommendations = products
        .filter(p => 
          !purchasedIds.has(String(p.id)) && 
          purchasedTypes.has(p.type || "") &&
          (p.stock || 0) > 0
        )
        .slice(0, 20)
        .map(p => ({
          ...p,
          recommendationType: "PERSONALIZED",
          score: 0.8,
          reason: `Bazat pe preferințele tale pentru ${p.type}`
        }));

    } else {
      // Trending - cele mai vândute recent
      const productSales: Record<string, { count: number; product: any }> = {};
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      for (const order of orders) {
        if (new Date(order.date) < thirtyDaysAgo) continue;
        const items = order.items as any[];
        if (!Array.isArray(items)) continue;

        for (const item of items) {
          const itemId = String(item.productId || item.id);
          if (!productSales[itemId]) {
            const prod = products.find(p => String(p.id) === itemId);
            productSales[itemId] = { count: 0, product: prod || item };
          }
          productSales[itemId].count += item.quantity || 1;
        }
      }

      recommendations = Object.values(productSales)
        .filter(ps => ps.product && ps.count >= 1)
        .sort((a, b) => b.count - a.count)
        .slice(0, 20)
        .map(ps => ({
          ...ps.product,
          recommendationType: "TRENDING",
          score: ps.count,
          reason: `${ps.count} vânzări în ultima lună`
        }));
    }

    return NextResponse.json({
      type,
      productId,
      clientEmail,
      count: recommendations.length,
      recommendations
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Generare recomandări AI avansate
export async function POST(req: NextRequest) {
  try {
    const { context, productIds, clientProfile } = await req.json();

    const products = await prisma.product.findMany({
      where: productIds ? {
        id: { in: productIds.map((id: string) => parseInt(id)) }
      } : undefined,
      take: 30,
      select: {
        id: true,
        name: true,
        type: true,
        manufacturer: true,
        price: true,
        description: true
      }
    });

    const prompt = `Ești un expert în automatizări industriale. Generează recomandări de produse.

CONTEXT: ${context || "Recomandări generale"}

PRODUSE REFERINȚĂ:
${JSON.stringify(products.slice(0, 15), null, 2)}

${clientProfile ? `PROFIL CLIENT: ${JSON.stringify(clientProfile)}` : ""}

Generează recomandări inteligente și returnează JSON:
{
  "recommendations": [
    {
      "productName": "nume produs recomandat din lista de mai sus",
      "reason": "de ce e recomandat",
      "useCase": "caz de utilizare",
      "priority": "HIGH" | "MEDIUM" | "LOW",
      "upsellPotential": "descriere potențial upsell"
    }
  ],
  "bundles": [
    {
      "name": "nume pachet",
      "products": ["produs 1", "produs 2"],
      "discount": "discount sugerat",
      "targetCustomer": "pentru cine e potrivit"
    }
  ],
  "crossSellOpportunities": [
    {
      "if_buys": "produs X",
      "recommend": "produs Y",
      "reason": "de ce"
    }
  ],
  "seasonalRecommendations": "recomandări sezoniere dacă e cazul"
}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 2500 }
        })
      }
    );

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    let aiRecommendations;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      aiRecommendations = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: text };
    } catch {
      aiRecommendations = { raw: text };
    }

    return NextResponse.json({ context, aiRecommendations });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
