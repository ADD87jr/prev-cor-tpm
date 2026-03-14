import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const GEMINI_API_KEY = "AIzaSyDPMtQTjaruCtql9qAFqcavAzKwXRdjsnA";

export async function GET() {
  try {
    const orders = await prisma.order.findMany({
      select: {
        clientData: true,
        items: true,
        date: true,
        status: true
      },
      where: {
        status: { in: ["DELIVERED", "SHIPPED", "COMPLETED"] }
      }
    });

    const products = await prisma.product.findMany({
      select: { id: true, name: true, price: true, type: true }
    });

    const productMap = new Map(products.map(p => [String(p.id), p]));

    // Analizăm pattern-uri de recomandă
    const clientPurchases = new Map<string, {
      email: string;
      name: string;
      company: string;
      purchases: { productId: string; productName: string; date: Date; quantity: number }[];
    }>();

    orders.forEach(order => {
      const data = order.clientData as any;
      const email = data?.email || "unknown";
      const items = (order.items as any[]) || [];

      if (!clientPurchases.has(email)) {
        clientPurchases.set(email, {
          email,
          name: data?.name || data?.nume || "",
          company: data?.company || data?.firma || "",
          purchases: []
        });
      }

      const client = clientPurchases.get(email)!;
      items.forEach(item => {
        client.purchases.push({
          productId: String(item.productId || item.id),
          productName: item.name || productMap.get(String(item.productId))?.name || "Unknown",
          date: order.date,
          quantity: item.quantity || 1
        });
      });
    });

    // Identificăm produse cu pattern de recomandă
    const predictions: any[] = [];

    clientPurchases.forEach(client => {
      // Grupăm achizițiile per produs
      const productHistory = new Map<string, Date[]>();
      
      client.purchases.forEach(p => {
        if (!productHistory.has(p.productId)) {
          productHistory.set(p.productId, []);
        }
        productHistory.get(p.productId)!.push(p.date);
      });

      // Căutăm produse cumpărate de mai multe ori
      productHistory.forEach((dates, productId) => {
        if (dates.length >= 2) {
          dates.sort((a, b) => a.getTime() - b.getTime());
          
          // Calculăm intervalul mediu între achiziții
          const intervals: number[] = [];
          for (let i = 1; i < dates.length; i++) {
            intervals.push((dates[i].getTime() - dates[i - 1].getTime()) / (1000 * 60 * 60 * 24));
          }
          
          const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
          const lastPurchase = dates[dates.length - 1];
          const daysSinceLastPurchase = (Date.now() - lastPurchase.getTime()) / (1000 * 60 * 60 * 24);
          
          // Predicție: când va recomanda
          const daysUntilReorder = avgInterval - daysSinceLastPurchase;
          const predictedReorderDate = new Date(Date.now() + daysUntilReorder * 24 * 60 * 60 * 1000);
          
          // Calculăm urgența
          let urgency = "LOW";
          if (daysUntilReorder <= 0) urgency = "OVERDUE";
          else if (daysUntilReorder <= 7) urgency = "URGENT";
          else if (daysUntilReorder <= 14) urgency = "SOON";
          else if (daysUntilReorder <= 30) urgency = "MEDIUM";

          const product = productMap.get(productId);
          
          predictions.push({
            clientEmail: client.email,
            clientName: client.name,
            clientCompany: client.company,
            productId,
            productName: product?.name || "Unknown",
            productPrice: product?.price || 0,
            purchaseCount: dates.length,
            avgIntervalDays: Math.round(avgInterval),
            lastPurchaseDate: lastPurchase.toISOString().split("T")[0],
            daysSinceLastPurchase: Math.round(daysSinceLastPurchase),
            predictedReorderDate: predictedReorderDate.toISOString().split("T")[0],
            daysUntilReorder: Math.round(daysUntilReorder),
            urgency,
            confidence: Math.min(100, dates.length * 20 + 40)
          });
        }
      });
    });

    // Sortăm după urgență
    const urgencyOrder = { OVERDUE: 0, URGENT: 1, SOON: 2, MEDIUM: 3, LOW: 4 };
    predictions.sort((a, b) => urgencyOrder[a.urgency as keyof typeof urgencyOrder] - urgencyOrder[b.urgency as keyof typeof urgencyOrder]);

    const stats = {
      totalPredictions: predictions.length,
      overdue: predictions.filter(p => p.urgency === "OVERDUE").length,
      urgent: predictions.filter(p => p.urgency === "URGENT").length,
      soon: predictions.filter(p => p.urgency === "SOON").length,
      potentialRevenue: predictions
        .filter(p => p.daysUntilReorder <= 30)
        .reduce((sum, p) => sum + p.productPrice, 0)
    };

    return NextResponse.json({ 
      predictions: predictions.slice(0, 100),
      stats 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { prediction } = await req.json();

    const prompt = `Generează un email de follow-up pentru recomandarea unui produs B2B:

CLIENT: ${prediction.clientName} (${prediction.clientCompany})
PRODUS: ${prediction.productName}
PREȚ: ${prediction.productPrice} RON
ULTIMA ACHIZIȚIE: ${prediction.lastPurchaseDate} (acum ${prediction.daysSinceLastPurchase} zile)
INTERVAL NORMAL: ${prediction.avgIntervalDays} zile
STATUS: ${prediction.urgency}

Răspunde STRICT în JSON:
{
  "emailSubject": "...",
  "emailBody": "...",
  "callScript": "...",
  "specialOffer": {
    "type": "DISCOUNT|FREE_SHIPPING|BUNDLE",
    "value": "...",
    "validUntil": "..."
  },
  "alternativeProducts": ["..."],
  "bestContactTime": "..."
}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 1500 }
        })
      }
    );

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const outreach = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    return NextResponse.json({ outreach });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
