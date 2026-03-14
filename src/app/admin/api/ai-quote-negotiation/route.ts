import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyDPMtQTjaruCtql9qAFqcavAzKwXRdjsnA";

// GET - Analiză clienți pentru negociere
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const clientEmail = searchParams.get("client");

    const orders = await prisma.order.findMany({
      where: {
        status: { in: ["completed", "shipped", "processing"] }
      },
      orderBy: { date: "desc" },
      select: {
        id: true,
        date: true,
        total: true,
        items: true,
        clientData: true
      }
    });

    // Grupează pe clienți
    const clientStats: Record<string, any> = {};

    for (const order of orders) {
      const cd = order.clientData as any;
      const email = cd?.email;
      if (!email) continue;

      if (!clientStats[email]) {
        clientStats[email] = {
          email,
          name: cd?.name || cd?.companyName || email,
          company: cd?.companyName,
          totalOrders: 0,
          totalValue: 0,
          avgOrderValue: 0,
          firstOrder: order.date,
          lastOrder: order.date,
          products: new Set(),
          categories: new Set()
        };
      }

      clientStats[email].totalOrders++;
      clientStats[email].totalValue += order.total || 0;
      
      if (order.date < clientStats[email].firstOrder) {
        clientStats[email].firstOrder = order.date;
      }
      if (order.date > clientStats[email].lastOrder) {
        clientStats[email].lastOrder = order.date;
      }

      const items = order.items as any[];
      if (Array.isArray(items)) {
        for (const item of items) {
          clientStats[email].products.add(item.name || item.productName);
          if (item.type || item.category) {
            clientStats[email].categories.add(item.type || item.category);
          }
        }
      }
    }

    // Calculează metrici și tier
    const clients = Object.values(clientStats).map((client: any) => {
      client.avgOrderValue = client.totalOrders > 0 ? Math.round(client.totalValue / client.totalOrders) : 0;
      client.productsCount = client.products.size;
      client.categoriesCount = client.categories.size;
      client.products = Array.from(client.products).slice(0, 10);
      client.categories = Array.from(client.categories);

      // Calculează tier
      let tier = "BRONZE";
      let maxDiscount = 3;
      
      if (client.totalValue > 50000) {
        tier = "PLATINUM";
        maxDiscount = 15;
      } else if (client.totalValue > 20000) {
        tier = "GOLD";
        maxDiscount = 10;
      } else if (client.totalValue > 5000) {
        tier = "SILVER";
        maxDiscount = 7;
      }

      client.tier = tier;
      client.maxDiscount = maxDiscount;

      return client;
    });

    // Sortează după valoare
    clients.sort((a, b) => b.totalValue - a.totalValue);

    // Dacă se cere un client specific
    if (clientEmail) {
      const client = clients.find(c => c.email === clientEmail);
      if (client) {
        return NextResponse.json({ client });
      }
      return NextResponse.json({ error: "Client negăsit" }, { status: 404 });
    }

    return NextResponse.json({
      stats: {
        totalClients: clients.length,
        platinum: clients.filter(c => c.tier === "PLATINUM").length,
        gold: clients.filter(c => c.tier === "GOLD").length,
        silver: clients.filter(c => c.tier === "SILVER").length,
        bronze: clients.filter(c => c.tier === "BRONZE").length
      },
      clients: clients.slice(0, 50)
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Generare strategie de negociere AI
export async function POST(req: NextRequest) {
  try {
    const { clientEmail, requestedProducts, requestedDiscount, dealContext } = await req.json();

    // Obține istoricul clientului
    const orders = await prisma.order.findMany({
      where: {
        status: { in: ["completed", "shipped", "processing"] }
      },
      select: {
        date: true,
        total: true,
        items: true,
        clientData: true
      }
    });

    const clientOrders = orders.filter(o => {
      const cd = o.clientData as any;
      return cd?.email === clientEmail;
    });

    // Calculează statistici client
    const totalValue = clientOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const avgOrder = clientOrders.length > 0 ? totalValue / clientOrders.length : 0;
    const firstOrder = clientOrders.length > 0 ? clientOrders[clientOrders.length - 1].date : null;
    
    // Determină tier
    let tier = "BRONZE";
    let baseMaxDiscount = 3;
    
    if (totalValue > 50000) { tier = "PLATINUM"; baseMaxDiscount = 15; }
    else if (totalValue > 20000) { tier = "GOLD"; baseMaxDiscount = 10; }
    else if (totalValue > 5000) { tier = "SILVER"; baseMaxDiscount = 7; }

    // Obține produsele cerute
    let productsInfo = "Nu specificate";
    if (requestedProducts && requestedProducts.length > 0) {
      const products = await prisma.product.findMany({
        where: {
          id: { in: requestedProducts.map((id: string) => typeof id === "string" ? parseInt(id) : id) }
        },
        select: {
          name: true,
          price: true,
          listPrice: true,
          manufacturer: true,
          type: true
        }
      });
      productsInfo = JSON.stringify(products);
    }

    const clientData = clientOrders[0]?.clientData as any;

    const prompt = `Ești un expert în negocieri B2B pentru un magazin de automatizări industriale. Generează o strategie de negociere.

PROFIL CLIENT:
- Nume: ${clientData?.name || clientData?.companyName || "Client"}
- Email: ${clientEmail}
- Tier: ${tier}
- Total achiziții: ${totalValue.toLocaleString()} RON
- Număr comenzi: ${clientOrders.length}
- Valoare medie comandă: ${Math.round(avgOrder).toLocaleString()} RON
- Client din: ${firstOrder ? new Date(firstOrder).toLocaleDateString("ro-RO") : "N/A"}

DISCOUNT CERUT: ${requestedDiscount || "Nespecificat"}%
DISCOUNT MAXIM PERMIS (bazat pe tier): ${baseMaxDiscount}%

PRODUSE SOLICITATE:
${productsInfo}

CONTEXT NEGOCIERE:
${dealContext || "Negociere standard"}

Generează o strategie de negociere care să:
1. Maximizeze profitul păstrând clientul
2. Ofere alternative dacă discountul cerut e prea mare
3. Sugereze upsell/cross-sell
4. Propună termeni de fidelizare

Returnează JSON:
{
  "recommendation": "ACCEPT" | "COUNTER" | "REJECT",
  "suggestedDiscount": number,
  "reasoning": "explicație strategie",
  "negotiationScript": {
    "opening": "ce să spui la început",
    "mainArguments": ["argumente de folosit"],
    "counterOffer": "ofertă counter dacă e cazul",
    "closing": "cum să închei negocierea"
  },
  "upsellOpportunities": [
    {
      "product": "produs",
      "reason": "de ce l-ar cumpăra",
      "discount": "discount special pentru bundle"
    }
  ],
  "loyaltyOffer": {
    "eligible": boolean,
    "offer": "descriere ofertă fidelitate",
    "condition": "condiție pentru ofertă"
  },
  "riskAssessment": {
    "churnRisk": "LOW" | "MEDIUM" | "HIGH",
    "competitorThreat": boolean,
    "strategicValue": "LOW" | "MEDIUM" | "HIGH"
  },
  "alternativeDeals": [
    {
      "description": "descriere deal alternativ",
      "discount": number,
      "conditions": "ce primește clientul"
    }
  ]
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
            maxOutputTokens: 2500
          }
        })
      }
    );

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    let strategy;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      strategy = jsonMatch ? JSON.parse(jsonMatch[0]) : { error: "Parse failed", raw: text };
    } catch {
      strategy = { error: "Parse failed", raw: text };
    }

    return NextResponse.json({
      client: {
        email: clientEmail,
        name: clientData?.name || clientData?.companyName,
        tier,
        totalValue,
        ordersCount: clientOrders.length,
        maxDiscount: baseMaxDiscount
      },
      requestedDiscount,
      strategy
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
