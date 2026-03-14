import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyDPMtQTjaruCtql9qAFqcavAzKwXRdjsnA";

// GET - Analizează segmentele de clienți existente
export async function GET() {
  try {
    const orders = await prisma.order.findMany({
      where: { status: { not: "cancelled" } },
      select: { 
        id: true, 
        clientData: true, 
        total: true, 
        items: true, 
        date: true 
      },
      orderBy: { date: "desc" },
      take: 500
    });

    // Grupare pe email
    const clientMap: Record<string, {
      email: string;
      name: string;
      company?: string;
      orders: number;
      totalSpent: number;
      avgOrderValue: number;
      lastOrder: Date | null;
      categories: Set<string>;
    }> = {};

    for (const order of orders) {
      let client: any = {};
      try {
        client = typeof order.clientData === "string" 
          ? JSON.parse(order.clientData) 
          : order.clientData || {};
      } catch { continue; }

      const email = client.email;
      if (!email) continue;

      if (!clientMap[email]) {
        clientMap[email] = {
          email,
          name: client.name || client.email,
          company: client.company,
          orders: 0,
          totalSpent: 0,
          avgOrderValue: 0,
          lastOrder: null,
          categories: new Set()
        };
      }

      clientMap[email].orders++;
      clientMap[email].totalSpent += order.total || 0;
      clientMap[email].lastOrder = order.date;

      // Categorii din items
      let items: any[] = [];
      try {
        items = typeof order.items === "string" ? JSON.parse(order.items) : order.items || [];
      } catch {}

      for (const item of items) {
        if (item.type) clientMap[email].categories.add(item.type);
      }
    }

    // Calculează medie și convertește Set
    const clients = Object.values(clientMap).map(c => ({
      ...c,
      avgOrderValue: c.orders > 0 ? Math.round(c.totalSpent / c.orders) : 0,
      categories: Array.from(c.categories)
    }));

    // Segmentare simplă
    const segments = {
      vip: clients.filter(c => c.totalSpent > 10000 || c.orders >= 5),
      regular: clients.filter(c => c.totalSpent >= 2000 && c.totalSpent <= 10000 && c.orders >= 2),
      occasional: clients.filter(c => c.orders === 1 || c.totalSpent < 2000),
      inactive: clients.filter(c => {
        if (!c.lastOrder) return true;
        const daysSinceOrder = (Date.now() - new Date(c.lastOrder).getTime()) / (1000 * 60 * 60 * 24);
        return daysSinceOrder > 90;
      })
    };

    return NextResponse.json({
      segments: {
        vip: { count: segments.vip.length, clients: segments.vip.slice(0, 10) },
        regular: { count: segments.regular.length, clients: segments.regular.slice(0, 10) },
        occasional: { count: segments.occasional.length, clients: segments.occasional.slice(0, 10) },
        inactive: { count: segments.inactive.length, clients: segments.inactive.slice(0, 10) }
      },
      totalClients: clients.length,
      totalOrders: orders.length
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Analiză AI detaliată pentru un segment
export async function POST(request: NextRequest) {
  try {
    const { segment, generateCampaign } = await request.json();

    // Obține date
    const orders = await prisma.order.findMany({
      where: { status: { not: "cancelled" } },
      select: { clientData: true, total: true, items: true, date: true },
      take: 500
    });

    // Grupare pe email
    const clientMap: Record<string, any> = {};

    for (const order of orders) {
      let client: any = {};
      try {
        client = typeof order.clientData === "string" 
          ? JSON.parse(order.clientData) 
          : order.clientData || {};
      } catch { continue; }

      const email = client.email;
      if (!email) continue;

      if (!clientMap[email]) {
        clientMap[email] = {
          email,
          name: client.name,
          company: client.company,
          orders: 0,
          totalSpent: 0,
          lastOrder: null,
          products: []
        };
      }

      clientMap[email].orders++;
      clientMap[email].totalSpent += order.total || 0;
      clientMap[email].lastOrder = order.date;

      let items: any[] = [];
      try {
        items = typeof order.items === "string" ? JSON.parse(order.items) : order.items || [];
      } catch {}
      clientMap[email].products.push(...items.map(i => i.name || i.productName).filter(Boolean));
    }

    const clients = Object.values(clientMap);

    // Selectează clienți din segment
    let segmentClients: any[] = [];
    switch (segment) {
      case "vip":
        segmentClients = clients.filter((c: any) => c.totalSpent > 10000 || c.orders >= 5);
        break;
      case "regular":
        segmentClients = clients.filter((c: any) => c.totalSpent >= 2000 && c.totalSpent <= 10000 && c.orders >= 2);
        break;
      case "occasional":
        segmentClients = clients.filter((c: any) => c.orders === 1 || c.totalSpent < 2000);
        break;
      case "inactive":
        segmentClients = clients.filter((c: any) => {
          if (!c.lastOrder) return true;
          const daysSince = (Date.now() - new Date(c.lastOrder).getTime()) / (1000 * 60 * 60 * 24);
          return daysSince > 90;
        });
        break;
      default:
        segmentClients = clients.slice(0, 20);
    }

    if (!generateCampaign) {
      return NextResponse.json({
        segment,
        clientCount: segmentClients.length,
        clients: segmentClients.slice(0, 20).map(c => ({
          email: c.email,
          name: c.name,
          company: c.company,
          orders: c.orders,
          totalSpent: c.totalSpent
        }))
      });
    }

    // Generează campanie cu AI
    const prompt = `Ești expert în marketing B2B pentru automatizări industriale (PLC-uri, senzori, HMI-uri, etc).

SEGMENT: ${segment.toUpperCase()}
NUMĂR CLIENȚI: ${segmentClients.length}

EXEMPLE CLIENȚI din acest segment:
${segmentClients.slice(0, 5).map(c => 
  `- ${c.name || c.email} | ${c.company || 'N/A'} | ${c.orders} comenzi | ${c.totalSpent} RON total | Produse: ${c.products.slice(0, 3).join(', ')}`
).join('\n')}

Creează o campanie de email marketing personalizată pentru acest segment.

Returnează JSON:
{
  "campaign": {
    "name": "Nume campanie",
    "subject": "Subiect email",
    "headline": "Titlu principal",
    "body": "Corpul email-ului, personalizat pentru segment",
    "cta": "Text buton call-to-action",
    "offer": "Ofertă specială dacă e cazul",
    "timing": "Când să trimitem (ex: marți dimineață)",
    "expectedOpenRate": 25
  },
  "insights": [
    "Insight 1 despre acest segment",
    "Insight 2"
  ],
  "recommendations": [
    "Recomandare 1 pentru creșterea engagement",
    "Recomandare 2"
  ]
}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 1500, temperature: 0.7 }
        })
      }
    );

    if (!response.ok) {
      return NextResponse.json({ 
        error: "AI indisponibil", 
        segment,
        clientCount: segmentClients.length 
      }, { status: 500 });
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
      result = { error: "Nu s-a putut parsa răspunsul AI" };
    }

    return NextResponse.json({
      success: true,
      segment,
      clientCount: segmentClients.length,
      ...result
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
