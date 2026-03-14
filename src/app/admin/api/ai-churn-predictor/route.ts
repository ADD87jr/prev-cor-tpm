import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyDPMtQTjaruCtql9qAFqcavAzKwXRdjsnA";

// GET - Predicție clienți cu risc de plecare
export async function GET() {
  try {
    const now = new Date();

    const orders = await prisma.order.findMany({
      where: {
        status: { in: ["completed", "shipped"] }
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
    const clientData: Record<string, any> = {};

    for (const order of orders) {
      const cd = order.clientData as any;
      const email = cd?.email;
      if (!email) continue;

      if (!clientData[email]) {
        clientData[email] = {
          email,
          name: cd?.name || cd?.companyName || email,
          company: cd?.companyName,
          orders: [],
          totalSpent: 0,
          firstOrder: order.date,
          lastOrder: order.date
        };
      }

      clientData[email].orders.push({
        date: order.date,
        total: order.total,
        itemCount: Array.isArray(order.items) ? order.items.length : 0
      });
      clientData[email].totalSpent += order.total || 0;

      if (order.date < clientData[email].firstOrder) {
        clientData[email].firstOrder = order.date;
      }
      if (order.date > clientData[email].lastOrder) {
        clientData[email].lastOrder = order.date;
      }
    }

    // Calculează metrici de churn pentru fiecare client
    const clients = Object.values(clientData).map((client: any) => {
      const daysSinceLastOrder = Math.floor(
        (now.getTime() - new Date(client.lastOrder).getTime()) / (1000 * 60 * 60 * 24)
      );
      const customerLifetimeDays = Math.floor(
        (new Date(client.lastOrder).getTime() - new Date(client.firstOrder).getTime()) / (1000 * 60 * 60 * 24)
      );
      const avgOrderValue = client.orders.length > 0 ? client.totalSpent / client.orders.length : 0;
      const orderFrequency = customerLifetimeDays > 0 ? client.orders.length / (customerLifetimeDays / 30) : 0;

      // Calculează scorul de risc (0-100)
      let churnScore = 0;

      // Factor 1: Zile de la ultima comandă (max 40 puncte)
      if (daysSinceLastOrder > 180) churnScore += 40;
      else if (daysSinceLastOrder > 90) churnScore += 30;
      else if (daysSinceLastOrder > 60) churnScore += 20;
      else if (daysSinceLastOrder > 30) churnScore += 10;

      // Factor 2: Frecvența comenzilor scade (max 30 puncte)
      // Compară ultimele 3 luni cu perioada anterioară
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const recentOrders = client.orders.filter((o: any) => new Date(o.date) >= threeMonthsAgo).length;
      const previousOrders = client.orders.filter((o: any) => 
        new Date(o.date) >= sixMonthsAgo && new Date(o.date) < threeMonthsAgo
      ).length;

      if (previousOrders > 0 && recentOrders < previousOrders * 0.5) {
        churnScore += 30;
      } else if (previousOrders > 0 && recentOrders < previousOrders * 0.75) {
        churnScore += 15;
      }

      // Factor 3: Valoare comenzi scade (max 20 puncte)
      const recentTotal = client.orders
        .filter((o: any) => new Date(o.date) >= threeMonthsAgo)
        .reduce((sum: number, o: any) => sum + (o.total || 0), 0);
      const previousTotal = client.orders
        .filter((o: any) => new Date(o.date) >= sixMonthsAgo && new Date(o.date) < threeMonthsAgo)
        .reduce((sum: number, o: any) => sum + (o.total || 0), 0);

      if (previousTotal > 0 && recentTotal < previousTotal * 0.5) {
        churnScore += 20;
      } else if (previousTotal > 0 && recentTotal < previousTotal * 0.75) {
        churnScore += 10;
      }

      // Factor 4: Client cu o singură comandă (max 10 puncte)
      if (client.orders.length === 1 && daysSinceLastOrder > 60) {
        churnScore += 10;
      }

      // Determină nivelul de risc
      let riskLevel: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" = "LOW";
      if (churnScore >= 70) riskLevel = "CRITICAL";
      else if (churnScore >= 50) riskLevel = "HIGH";
      else if (churnScore >= 30) riskLevel = "MEDIUM";

      // Generează motive de risc
      const riskFactors: string[] = [];
      if (daysSinceLastOrder > 90) riskFactors.push(`Nu a comandat de ${daysSinceLastOrder} zile`);
      if (previousOrders > 0 && recentOrders < previousOrders * 0.5) riskFactors.push("Frecvență comenzi scăzută dramatic");
      if (previousTotal > 0 && recentTotal < previousTotal * 0.5) riskFactors.push("Valoare comenzi scăzută");
      if (client.orders.length === 1) riskFactors.push("Client cu o singură comandă");

      return {
        ...client,
        daysSinceLastOrder,
        orderCount: client.orders.length,
        avgOrderValue: Math.round(avgOrderValue),
        orderFrequency: Math.round(orderFrequency * 100) / 100,
        churnScore,
        riskLevel,
        riskFactors,
        recentOrders,
        previousOrders
      };
    });

    // Filtrează doar clienții cu risc și sortează
    const atRiskClients = clients
      .filter(c => c.churnScore >= 30 && c.totalSpent > 1000)
      .sort((a, b) => b.churnScore - a.churnScore);

    const stats = {
      totalClients: clients.length,
      atRisk: atRiskClients.length,
      critical: atRiskClients.filter(c => c.riskLevel === "CRITICAL").length,
      high: atRiskClients.filter(c => c.riskLevel === "HIGH").length,
      medium: atRiskClients.filter(c => c.riskLevel === "MEDIUM").length,
      potentialLostRevenue: atRiskClients.reduce((sum, c) => sum + c.avgOrderValue * 4, 0) // 4 comenzi/an estimate
    };

    return NextResponse.json({
      stats,
      clients: atRiskClients.slice(0, 50)
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Generare strategii de reținere AI
export async function POST(req: NextRequest) {
  try {
    const { client } = await req.json();

    const prompt = `Creează o strategie personalizată de reținere pentru un client B2B de automatizări industriale cu risc de plecare.

PROFIL CLIENT:
- Nume: ${client.name}
- Companie: ${client.company || "N/A"}
- Email: ${client.email}
- Total cheltuieli: ${client.totalSpent?.toLocaleString()} RON
- Număr comenzi: ${client.orderCount}
- Valoare medie comandă: ${client.avgOrderValue?.toLocaleString()} RON
- Zile de la ultima comandă: ${client.daysSinceLastOrder}
- Scor risc churn: ${client.churnScore}/100 (${client.riskLevel})

FACTORI DE RISC:
${client.riskFactors?.join("\n") || "Nu sunt factori specifici"}

Generează o strategie de reținere personalizată:

Returnează JSON:
{
  "urgency": "IMMEDIATE" | "THIS_WEEK" | "THIS_MONTH",
  "retentionStrategy": {
    "approach": "abordare generală",
    "channel": "email" | "telefon" | "vizită" | "combinat",
    "timing": "cel mai bun moment pentru contact"
  },
  "personalizedOffer": {
    "type": "discount" | "free_shipping" | "extended_warranty" | "bundle" | "credit",
    "value": "valoare ofertă",
    "condition": "condiție pentru ofertă",
    "expiry": "valabilitate"
  },
  "communicationScript": {
    "subject": "subiect email dacă e cazul",
    "opening": "deschidere conversație",
    "mainMessage": "mesaj principal",
    "closing": "încheiere",
    "callToAction": "acțiune cerută"
  },
  "alternativeStrategies": [
    {
      "name": "nume strategie alternativă",
      "description": "descriere",
      "bestFor": "când e potrivită"
    }
  ],
  "successMetrics": ["cum măsori succesul"],
  "followUpPlan": {
    "if_no_response": "ce faci dacă nu răspunde",
    "if_declines": "ce faci dacă refuză",
    "timeline": "timeline follow-up"
  }
}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.6, maxOutputTokens: 2500 }
        })
      }
    );

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    let strategy;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      strategy = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: text };
    } catch {
      strategy = { raw: text };
    }

    return NextResponse.json({ client, retentionStrategy: strategy });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
