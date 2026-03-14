import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const GEMINI_API_KEY = "AIzaSyDPMtQTjaruCtql9qAFqcavAzKwXRdjsnA";

export async function GET() {
  try {
    const orders = await prisma.order.findMany({
      select: {
        clientData: true,
        total: true,
        date: true,
        status: true
      }
    });

    // Grupăm după email
    const clientMap = new Map<string, {
      email: string;
      name: string;
      company: string;
      orders: { total: number; date: Date; status: string }[];
      firstOrderDate: Date;
      lastOrderDate: Date;
    }>();

    orders.forEach(order => {
      const data = order.clientData as any;
      const email = data?.email || "unknown";
      
      if (!clientMap.has(email)) {
        clientMap.set(email, {
          email,
          name: data?.name || data?.nume || "",
          company: data?.company || data?.firma || "",
          orders: [],
          firstOrderDate: order.date,
          lastOrderDate: order.date
        });
      }
      
      const client = clientMap.get(email)!;
      client.orders.push({ 
        total: order.total, 
        date: order.date,
        status: order.status 
      });
      
      if (order.date < client.firstOrderDate) client.firstOrderDate = order.date;
      if (order.date > client.lastOrderDate) client.lastOrderDate = order.date;
    });

    // Calculăm LTV pentru fiecare client
    const clients = Array.from(clientMap.values()).map(client => {
      const totalRevenue = client.orders.reduce((sum, o) => sum + o.total, 0);
      const orderCount = client.orders.length;
      const avgOrderValue = totalRevenue / orderCount;
      
      const customerLifespanDays = Math.max(1, 
        (client.lastOrderDate.getTime() - client.firstOrderDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      // Frecvența de cumpărare (comenzi pe lună)
      const monthsActive = Math.max(1, customerLifespanDays / 30);
      const purchaseFrequency = orderCount / monthsActive;
      
      // LTV simplu = Revenue * (frecvență * 12 luni estimate în viitor)
      const estimatedFuturePurchases = purchaseFrequency * 12;
      const predictedLTV = avgOrderValue * estimatedFuturePurchases;
      
      // Customer Value Score (0-100)
      const recencyDays = (Date.now() - client.lastOrderDate.getTime()) / (1000 * 60 * 60 * 24);
      const recencyScore = Math.max(0, 100 - recencyDays);
      const frequencyScore = Math.min(100, purchaseFrequency * 20);
      const monetaryScore = Math.min(100, (avgOrderValue / 1000) * 10);
      
      const valueScore = Math.round((recencyScore * 0.3 + frequencyScore * 0.3 + monetaryScore * 0.4));
      
      // Segment
      let segment = "STANDARD";
      if (valueScore >= 80) segment = "VIP";
      else if (valueScore >= 60) segment = "HIGH_VALUE";
      else if (valueScore >= 40) segment = "GROWING";
      else if (recencyDays > 90) segment = "AT_RISK";
      else segment = "NEW";

      return {
        email: client.email,
        name: client.name,
        company: client.company,
        metrics: {
          totalRevenue: Math.round(totalRevenue),
          orderCount,
          avgOrderValue: Math.round(avgOrderValue),
          purchaseFrequency: Math.round(purchaseFrequency * 100) / 100,
          customerLifespanDays: Math.round(customerLifespanDays),
          daysSinceLastOrder: Math.round(recencyDays)
        },
        ltv: {
          currentLTV: Math.round(totalRevenue),
          predictedLTV: Math.round(predictedLTV),
          potentialLTV: Math.round(predictedLTV * 1.5) // cu up-sell
        },
        scores: {
          recency: Math.round(recencyScore),
          frequency: Math.round(frequencyScore),
          monetary: Math.round(monetaryScore),
          overall: valueScore
        },
        segment,
        acquisitionCostSuggestion: Math.round(predictedLTV * 0.1) // 10% din LTV
      };
    });

    // Sortăm după LTV predictiv
    clients.sort((a, b) => b.ltv.predictedLTV - a.ltv.predictedLTV);

    const stats = {
      totalClients: clients.length,
      totalLTV: clients.reduce((sum, c) => sum + c.ltv.currentLTV, 0),
      avgLTV: Math.round(clients.reduce((sum, c) => sum + c.ltv.currentLTV, 0) / clients.length),
      vipCount: clients.filter(c => c.segment === "VIP").length,
      atRiskCount: clients.filter(c => c.segment === "AT_RISK").length,
      segments: {
        VIP: clients.filter(c => c.segment === "VIP").length,
        HIGH_VALUE: clients.filter(c => c.segment === "HIGH_VALUE").length,
        GROWING: clients.filter(c => c.segment === "GROWING").length,
        NEW: clients.filter(c => c.segment === "NEW").length,
        AT_RISK: clients.filter(c => c.segment === "AT_RISK").length
      }
    };

    return NextResponse.json({ 
      clients: clients.slice(0, 50),
      stats 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { client } = await req.json();

    const prompt = `Analizează acest client B2B și generează strategii de maximizare LTV:

CLIENT:
- Nume: ${client.name}
- Companie: ${client.company}
- Total cheltuieli: ${client.metrics.totalRevenue} RON
- Număr comenzi: ${client.metrics.orderCount}
- Valoare medie comandă: ${client.metrics.avgOrderValue} RON
- Frecvență cumpărare: ${client.metrics.purchaseFrequency} comenzi/lună
- Zile de la ultima comandă: ${client.metrics.daysSinceLastOrder}
- Segment: ${client.segment}
- Scor valoare: ${client.scores.overall}/100
- LTV estimat: ${client.ltv.predictedLTV} RON

Răspunde STRICT în JSON:
{
  "growthStrategies": [
    { "strategy": "...", "expectedImpact": "...", "effort": "LOW|MEDIUM|HIGH", "timeline": "..." }
  ],
  "upsellOpportunities": ["..."],
  "crossSellProducts": ["..."],
  "retentionActions": ["..."],
  "communicationPlan": {
    "frequency": "...",
    "channels": ["..."],
    "keyMessages": ["..."]
  },
  "investmentRecommendation": {
    "maxAcquisitionCost": "...",
    "discountBudget": "...",
    "priorityLevel": "HIGH|MEDIUM|LOW"
  }
}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 2000 }
        })
      }
    );

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    return NextResponse.json({ analysis });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
