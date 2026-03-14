import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const GEMINI_API_KEY = "AIzaSyDPMtQTjaruCtql9qAFqcavAzKwXRdjsnA";

export async function POST(req: Request) {
  try {
    const { clientEmail, theme, limit } = await req.json();

    // Obținem istoricul clientului
    const clientOrders = clientEmail ? await prisma.order.findMany({
      where: {
        clientData: { path: "$.email", equals: clientEmail }
      },
      select: { items: true, total: true },
      take: 20
    }) : [];

    // Extragem preferințele clientului
    const purchasedCategories = new Set<string>();
    const purchasedProducts = new Set<number>();
    
    clientOrders.forEach(order => {
      const items = (order.items as any[]) || [];
      items.forEach(item => {
        if (item.category) purchasedCategories.add(item.category);
        if (item.productId || item.id) purchasedProducts.add(item.productId || item.id);
      });
    });

    // Obținem produse pentru catalog
    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        type: true,
        domain: true,
        manufacturer: true,
        specs: true,
        advantages: true
      },
      take: limit || 50
    });

    // Prioritizăm produsele bazat pe preferințe
    const scoredProducts = products.map(product => {
      let score = 0;
      
      // Bonus pentru categorii achiziționate anterior
      if (purchasedCategories.has(product.type || "")) score += 30;
      
      // Bonus pentru produse necumpărate (oportunitate nouă)
      if (!purchasedProducts.has(product.id)) score += 10;
      
      // Bonus pentru produse populare/cu preț mare (presupunem că sunt de interes B2B)
      if (product.price > 1000) score += 15;
      
      return { ...product, relevanceScore: score };
    });

    // Sortăm și grupăm
    scoredProducts.sort((a, b) => b.relevanceScore - a.relevanceScore);
    
    const selectedProducts = scoredProducts.slice(0, limit || 20);

    // Generăm conținut personalizat cu AI
    const catalogPrompt = `Generează conținut pentru un catalog PDF personalizat B2B:

CLIENT: ${clientEmail || "Client generic"}
CATEGORII DE INTERES: ${Array.from(purchasedCategories).join(", ") || "Diverse"}
TEMA CATALOG: ${theme || "General - Echipamente industriale"}

PRODUSE SELECTATE (${selectedProducts.length}):
${selectedProducts.slice(0, 10).map(p => `- ${p.name} (${p.type}): ${p.price} RON`).join("\n")}

Răspunde STRICT în JSON:
{
  "catalogTitle": "...",
  "subtitle": "...",
  "personalizedMessage": "...",
  "sections": [
    { "title": "...", "products": ["..."], "description": "..." }
  ],
  "highlights": ["..."],
  "specialOffers": [
    { "product": "...", "originalPrice": 0, "discountedPrice": 0, "validUntil": "..." }
  ],
  "contactInfo": {
    "salesPerson": "...",
    "directLine": "...",
    "personalMessage": "..."
  },
  "footer": "...",
  "designSuggestions": {
    "colorScheme": "...",
    "layout": "...",
    "imagery": "..."
  }
}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: catalogPrompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 2000 }
        })
      }
    );

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const catalogContent = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    return NextResponse.json({
      client: clientEmail || null,
      preferences: {
        categories: Array.from(purchasedCategories),
        orderHistory: clientOrders.length
      },
      products: selectedProducts.map(p => ({
        id: p.id,
        name: p.name,
        price: p.price,
        type: p.type,
        domain: p.domain,
        manufacturer: p.manufacturer,
        description: p.description?.slice(0, 200),
        relevanceScore: p.relevanceScore
      })),
      catalogContent
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET - obține opțiuni de teme pentru catalog
export async function GET() {
  try {
    const products = await prisma.product.findMany({
      select: { type: true },
    });

    const categories = [...new Set(products.map(p => p.type).filter(Boolean))];

    const themes = [
      { id: "all", name: "Catalog Complet", icon: "📚", description: "Toate produsele" },
      { id: "promo", name: "Oferte Speciale", icon: "🏷️", description: "Produse cu reduceri" },
      { id: "new", name: "Noutăți", icon: "🆕", description: "Produse noi în catalog" },
      { id: "bestseller", name: "Cele mai vândute", icon: "⭐", description: "Top vânzări" },
      ...categories.slice(0, 5).map(cat => ({
        id: cat?.toLowerCase().replace(/\s/g, "-") || "other",
        name: cat || "Altele",
        icon: "📦",
        description: `Toate produsele din ${cat}`
      }))
    ];

    return NextResponse.json({
      themes,
      totalProducts: products.length,
      categories: categories.slice(0, 10)
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
