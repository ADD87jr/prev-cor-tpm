import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyDPMtQTjaruCtql9qAFqcavAzKwXRdjsnA";

// GET - Analizează clienții și sugerează notificări
export async function GET() {
  try {
    const orders = await prisma.order.findMany({
      where: { status: { not: "cancelled" } },
      select: {
        id: true,
        clientData: true,
        total: true,
        items: true,
        date: true,
        status: true
      },
      orderBy: { date: "desc" },
      take: 500
    });

    // Grupează clienții și analizează comportamentul
    const clientMap: Record<string, {
      email: string;
      name: string;
      company?: string;
      orders: any[];
      totalSpent: number;
      lastOrder: Date | null;
      purchasedCategories: Set<string>;
    }> = {};

    for (const order of orders) {
      let client: any = {};
      try {
        client = typeof order.clientData === "string" ? JSON.parse(order.clientData) : order.clientData || {};
      } catch { continue; }

      const email = client.email;
      if (!email) continue;

      if (!clientMap[email]) {
        clientMap[email] = {
          email,
          name: client.name || "",
          company: client.company,
          orders: [],
          totalSpent: 0,
          lastOrder: null,
          purchasedCategories: new Set()
        };
      }

      clientMap[email].orders.push(order);
      clientMap[email].totalSpent += order.total || 0;
      clientMap[email].lastOrder = order.date;

      // Categorii cumpărate
      let items: any[] = [];
      try {
        items = typeof order.items === "string" ? JSON.parse(order.items) : order.items || [];
      } catch {}

      for (const item of items) {
        if (item.type) clientMap[email].purchasedCategories.add(item.type);
      }
    }

    const clients = Object.values(clientMap);

    // Generează sugestii de notificări
    const notifications: any[] = [];

    for (const client of clients) {
      const daysSinceOrder = client.lastOrder 
        ? Math.floor((Date.now() - new Date(client.lastOrder).getTime()) / (1000 * 60 * 60 * 24))
        : 999;

      // Client inactiv > 60 zile
      if (daysSinceOrder > 60 && daysSinceOrder < 180) {
        notifications.push({
          type: "reactivation",
          priority: "medium",
          clientEmail: client.email,
          clientName: client.name,
          reason: `Inactiv de ${daysSinceOrder} zile`,
          suggestedAction: "Email reactivare cu ofertă specială",
          suggestedDiscount: "10%",
          template: "win_back"
        });
      }

      // Client VIP fără comandă > 30 zile
      if (client.totalSpent > 5000 && daysSinceOrder > 30) {
        notifications.push({
          type: "vip_followup",
          priority: "high",
          clientEmail: client.email,
          clientName: client.name,
          company: client.company,
          reason: `Client VIP (${client.totalSpent} RON) inactiv ${daysSinceOrder} zile`,
          suggestedAction: "Apel telefonic + email personalizat",
          template: "vip_care"
        });
      }

      // Cross-sell bazat pe categorii
      const categories = Array.from(client.purchasedCategories);
      if (categories.length === 1 && client.orders.length >= 2) {
        notifications.push({
          type: "cross_sell",
          priority: "low",
          clientEmail: client.email,
          clientName: client.name,
          reason: `Cumpără doar ${categories[0]} - potențial cross-sell`,
          suggestedAction: "Recomandă produse complementare",
          currentCategory: categories[0],
          template: "product_recommendation"
        });
      }

      // Aniversare primă comandă (dacă a trecut 1 an)
      if (client.orders.length > 0) {
        const firstOrderDate = new Date(client.orders[client.orders.length - 1].date);
        const daysSinceFirst = Math.floor((Date.now() - firstOrderDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysSinceFirst >= 360 && daysSinceFirst <= 370) {
          notifications.push({
            type: "anniversary",
            priority: "low",
            clientEmail: client.email,
            clientName: client.name,
            reason: "1 an de la prima comandă",
            suggestedAction: "Email aniversar cu discount",
            suggestedDiscount: "15%",
            template: "anniversary"
          });
        }
      }
    }

    // Sortare după prioritate
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    notifications.sort((a, b) => priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder]);

    return NextResponse.json({
      totalClients: clients.length,
      notificationsCount: notifications.length,
      byType: {
        reactivation: notifications.filter(n => n.type === "reactivation").length,
        vip_followup: notifications.filter(n => n.type === "vip_followup").length,
        cross_sell: notifications.filter(n => n.type === "cross_sell").length,
        anniversary: notifications.filter(n => n.type === "anniversary").length
      },
      notifications: notifications.slice(0, 50)
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Generează conținut notificare personalizată
export async function POST(request: NextRequest) {
  try {
    const { clientEmail, type, template, customMessage } = await request.json();

    if (!clientEmail || !type) {
      return NextResponse.json({ error: "clientEmail și type sunt obligatorii" }, { status: 400 });
    }

    // Caută informații despre client
    const orders = await prisma.order.findMany({
      where: { status: { not: "cancelled" } },
      select: {
        clientData: true,
        total: true,
        items: true,
        date: true
      },
      take: 200
    });

    let clientInfo: any = null;
    let clientOrders: any[] = [];
    let purchasedProducts: string[] = [];

    for (const order of orders) {
      let client: any = {};
      try {
        client = typeof order.clientData === "string" ? JSON.parse(order.clientData) : order.clientData || {};
      } catch { continue; }

      if (client.email === clientEmail) {
        if (!clientInfo) clientInfo = client;
        clientOrders.push(order);

        let items: any[] = [];
        try {
          items = typeof order.items === "string" ? JSON.parse(order.items) : order.items || [];
        } catch {}
        purchasedProducts.push(...items.map(i => i.name || i.productName).filter(Boolean));
      }
    }

    if (!clientInfo) {
      return NextResponse.json({ error: "Client negăsit" }, { status: 404 });
    }

    // Obține produse noi sau în promoție
    const newProducts = await prisma.product.findMany({
      where: { stock: { gt: 0 } },
      select: { id: true, name: true, price: true, type: true },
      orderBy: { id: "desc" },
      take: 5
    });

    const templateDescriptions: Record<string, string> = {
      win_back: "Email de reactivare pentru client inactiv",
      vip_care: "Email personalizat pentru client VIP",
      product_recommendation: "Recomandări de produse complementare",
      anniversary: "Email de aniversare primă comandă",
      new_products: "Notificare produse noi",
      special_offer: "Ofertă specială personalizată"
    };

    const prompt = `Ești specialist în marketing B2B pentru ${clientInfo.company || clientInfo.name}, client al PREV-COR TPM (automatizări industriale).

CLIENT:
- Nume: ${clientInfo.name}
- Companie: ${clientInfo.company || "N/A"}
- Email: ${clientInfo.email}
- Comenzi: ${clientOrders.length}
- Total cumpărat: ${clientOrders.reduce((s, o) => s + (o.total || 0), 0)} RON
- Ultima comandă: ${clientOrders[0]?.date || "N/A"}

PRODUSE CUMPĂRATE ANTERIOR:
${purchasedProducts.slice(0, 10).join(", ") || "N/A"}

PRODUSE NOI/RECOMANDATE:
${newProducts.map(p => `${p.name} - ${p.price} RON`).join(", ")}

TIP NOTIFICARE: ${type} (${templateDescriptions[template] || template})

${customMessage ? `MESAJ PERSONALIZAT: ${customMessage}` : ""}

Generează un email personalizat pentru acest client.
Tonul trebuie să fie profesional dar prietenos, specific B2B.
Include un call-to-action clar.

Returnează JSON:
{
  "subject": "Subiect email atractiv",
  "preheader": "Text preview 50 caractere",
  "greeting": "Salut personalizat",
  "body": "Corpul emailului cu paragrafe",
  "cta": {
    "text": "Text buton",
    "url": "/produse"
  },
  "closing": "Încheierea",
  "bestSendTime": "cel mai bun moment de trimitere",
  "estimatedOpenRate": 25
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
      return NextResponse.json({ error: "AI indisponibil" }, { status: 500 });
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
      result = {
        subject: "Ofertă specială pentru dumneavoastră",
        body: responseText,
        error: "Nu s-a putut structura răspunsul"
      };
    }

    return NextResponse.json({
      success: true,
      client: {
        email: clientInfo.email,
        name: clientInfo.name,
        company: clientInfo.company
      },
      notification: result,
      type,
      template
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
