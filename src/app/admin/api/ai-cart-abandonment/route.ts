import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyDPMtQTjaruCtql9qAFqcavAzKwXRdjsnA";

// GET - Analiză coșuri abandonate
export async function GET() {
  try {
    // În implementare reală ar fi o tabelă separată pentru cart tracking
    // Simulăm date cu comenzi anulate sau în așteptare
    const orders = await prisma.order.findMany({
      select: { 
        id: true, 
        clientData: true, 
        total: true, 
        items: true, 
        status: true, 
        date: true,
        paymentMethod: true
      }
    });

    // Simulăm coșuri abandonate (comenzi cancelled sau foarte vechi pending)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const abandonedCarts = orders
      .filter(o => o.status === "cancelled" || 
        (o.status === "pending" && new Date(o.date) < thirtyDaysAgo))
      .map(order => {
        const clientData = typeof order.clientData === "string" 
          ? JSON.parse(order.clientData) 
          : order.clientData;
        const items = typeof order.items === "string" 
          ? JSON.parse(order.items) 
          : order.items;
        
        return {
          id: order.id,
          clientEmail: clientData?.email || "N/A",
          clientName: clientData?.name || "N/A",
          company: clientData?.companyName || "",
          total: order.total,
          itemsCount: Array.isArray(items) ? items.length : 0,
          items: Array.isArray(items) ? items.slice(0, 5) : [],
          date: order.date,
          status: order.status,
          daysSinceAbandonment: Math.floor((Date.now() - new Date(order.date).getTime()) / (1000 * 60 * 60 * 24))
        };
      })
      .sort((a, b) => b.total - a.total);

    // Statistici
    const totalAbandoned = abandonedCarts.length;
    const totalLostValue = abandonedCarts.reduce((sum, c) => sum + c.total, 0);
    const completedOrders = orders.filter(o => o.status === "completed" || o.status === "shipped" || o.status === "delivered").length;
    const abandonmentRate = totalAbandoned > 0 
      ? Math.round((totalAbandoned / (totalAbandoned + completedOrders)) * 100) 
      : 0;

    // Produse cel mai des abandonate
    const abandonedProducts: Record<string, { name: string; count: number; value: number }> = {};
    for (const cart of abandonedCarts) {
      for (const item of cart.items) {
        const name = item.name || item.productName || "Necunoscut";
        if (!abandonedProducts[name]) {
          abandonedProducts[name] = { name, count: 0, value: 0 };
        }
        abandonedProducts[name].count += item.quantity || 1;
        abandonedProducts[name].value += (item.price || 0) * (item.quantity || 1);
      }
    }

    const topAbandonedProducts = Object.values(abandonedProducts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return NextResponse.json({
      abandonedCarts: abandonedCarts.slice(0, 30),
      stats: {
        totalAbandoned,
        totalLostValue,
        abandonmentRate,
        avgCartValue: totalAbandoned > 0 ? Math.round(totalLostValue / totalAbandoned) : 0,
        recoveryPotential: Math.round(totalLostValue * 0.15) // 15% recovery rate typical
      },
      topAbandonedProducts
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Analiză și strategii recuperare coș
export async function POST(req: NextRequest) {
  try {
    const { cartId } = await req.json();

    const order = await prisma.order.findUnique({
      where: { id: cartId },
      select: { 
        id: true, 
        clientData: true, 
        total: true, 
        items: true, 
        status: true, 
        date: true,
        paymentMethod: true
      }
    });

    if (!order) {
      return NextResponse.json({ error: "Coș negăsit" }, { status: 404 });
    }

    const clientData = typeof order.clientData === "string" 
      ? JSON.parse(order.clientData) 
      : order.clientData;
    const items = typeof order.items === "string" 
      ? JSON.parse(order.items) 
      : order.items;

    // Verifică istoricul clientului
    const allOrders = await prisma.order.findMany({
      select: { clientData: true, total: true, status: true }
    });

    let clientHistory = { orders: 0, completed: 0, totalSpent: 0 };
    for (const o of allOrders) {
      const data = typeof o.clientData === "string" ? JSON.parse(o.clientData) : o.clientData;
      if (data?.email === clientData?.email) {
        clientHistory.orders++;
        if (["completed", "shipped", "delivered"].includes(o.status)) {
          clientHistory.completed++;
          clientHistory.totalSpent += o.total;
        }
      }
    }

    const prompt = `Ești specialist în recuperare coșuri abandonate pentru un magazin B2B de automatizări industriale.

COȘ ABANDONAT:
- Valoare: ${order.total} RON
- Data abandonării: ${new Date(order.date).toLocaleDateString("ro-RO")}
- Zile de la abandonare: ${Math.floor((Date.now() - new Date(order.date).getTime()) / (1000 * 60 * 60 * 24))}
- Status: ${order.status}

CLIENT:
- Nume: ${clientData?.name || "N/A"}
- Email: ${clientData?.email || "N/A"}
- Companie: ${clientData?.companyName || "N/A"}
- Istoric: ${clientHistory.orders} comenzi anterioare, ${clientHistory.completed} finalizate, ${clientHistory.totalSpent} RON cheltuiți

PRODUSE ÎN COȘ:
${(items || []).map((i: any) => `- ${i.name || i.productName}: ${i.quantity || 1} buc x ${i.price || 0} RON`).join("\n")}

Analizează motivele probabile ale abandonării și strategii de recuperare.

Returnează JSON:
{
  "abandonmentAnalysis": {
    "probableCauses": [
      { "cause": "motiv posibil", "probability": "high/medium/low", "evidence": "de ce crezi asta" }
    ],
    "clientProfile": "tip client și comportament",
    "urgency": "high/medium/low pentru recuperare"
  },
  "recoveryStrategies": [
    {
      "strategy": "Nume strategie",
      "description": "Ce presupune",
      "channel": "email/sms/telefon/retargeting",
      "timing": "Când să o aplici",
      "incentive": "Ce oferi (discount, free shipping, etc)",
      "successRate": "probabilitate succes estimată"
    }
  ],
  "emailTemplates": [
    {
      "type": "reminder/urgency/incentive",
      "subject": "Subiect email",
      "previewText": "Preview text",
      "keyMessage": "Mesajul principal",
      "cta": "Call to action"
    }
  ],
  "recommendedActions": [
    { "action": "...", "priority": "1-5", "expectedROI": "impactul așteptat" }
  ],
  "retentionInsights": {
    "preventionTips": ["cum să previi abandonarea în viitor"],
    "websiteImprovements": ["ce să îmbunătățești pe site"]
  }
}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 1500, temperature: 0.7 }
        })
      }
    );

    let aiAnalysis = null;
    if (response.ok) {
      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const cleaned = rawText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      aiAnalysis = JSON.parse(cleaned);
    }

    return NextResponse.json({
      cart: {
        id: order.id,
        total: order.total,
        date: order.date,
        status: order.status,
        items,
        client: clientData
      },
      clientHistory,
      aiAnalysis
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
