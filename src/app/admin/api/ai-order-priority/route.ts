import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyDPMtQTjaruCtql9qAFqcavAzKwXRdjsnA";

// GET - Listează comenzi pentru prioritizare
export async function GET() {
  try {
    const pendingOrders = await prisma.order.findMany({
      where: {
        status: { in: ["pending", "processing", "confirmed"] }
      },
      select: {
        id: true,
        number: true,
        date: true,
        total: true,
        status: true,
        clientData: true,
        items: true,
        paymentMethod: true
      },
      orderBy: { date: "desc" },
      take: 50
    });

    const ordersWithPriority = pendingOrders.map(order => {
      let client: any = {};
      try {
        client = typeof order.clientData === "string" ? JSON.parse(order.clientData) : order.clientData || {};
      } catch {}

      let items: any[] = [];
      try {
        items = typeof order.items === "string" ? JSON.parse(order.items) : order.items || [];
      } catch {}

      // Calcul prioritate simplă
      let priorityScore = 50;
      
      // Valoare mare = prioritate
      if (order.total > 10000) priorityScore += 30;
      else if (order.total > 5000) priorityScore += 20;
      else if (order.total > 1000) priorityScore += 10;
      
      // Plată în avans = prioritate
      if (order.paymentMethod === "card" || order.paymentMethod === "transfer") priorityScore += 10;
      
      // Vechime comandă
      const daysSinceOrder = Math.floor((Date.now() - new Date(order.date).getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceOrder > 3) priorityScore += 15;
      if (daysSinceOrder > 5) priorityScore += 10;

      return {
        orderId: order.id,
        orderNumber: order.number,
        date: order.date,
        total: order.total,
        status: order.status,
        customerName: client.name || "N/A",
        customerCompany: client.company || "",
        itemCount: items.length,
        paymentMethod: order.paymentMethod,
        daysPending: daysSinceOrder,
        priorityScore,
        priorityLevel: priorityScore >= 80 ? "urgent" : priorityScore >= 60 ? "high" : priorityScore >= 40 ? "medium" : "low"
      };
    });

    // Sortează după prioritate
    ordersWithPriority.sort((a, b) => b.priorityScore - a.priorityScore);

    return NextResponse.json({
      orders: ordersWithPriority,
      stats: {
        total: ordersWithPriority.length,
        urgent: ordersWithPriority.filter(o => o.priorityLevel === "urgent").length,
        high: ordersWithPriority.filter(o => o.priorityLevel === "high").length,
        medium: ordersWithPriority.filter(o => o.priorityLevel === "medium").length,
        low: ordersWithPriority.filter(o => o.priorityLevel === "low").length
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Analiză AI pentru prioritizare
export async function POST(req: NextRequest) {
  try {
    const { orderId } = await req.json();

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        number: true,
        date: true,
        total: true,
        status: true,
        clientData: true,
        items: true,
        paymentMethod: true
      }
    });

    if (!order) {
      return NextResponse.json({ error: "Comandă negăsită" }, { status: 404 });
    }

    let client: any = {};
    try {
      client = typeof order.clientData === "string" ? JSON.parse(order.clientData) : order.clientData || {};
    } catch {}

    let items: any[] = [];
    try {
      items = typeof order.items === "string" ? JSON.parse(order.items) : order.items || [];
    } catch {}

    // Istoricul clientului - numărăm comenzile cu același email în clientData
    const allOrders = await prisma.order.findMany({
      where: { status: { not: "cancelled" } },
      select: { clientData: true }
    });
    const clientOrders = allOrders.filter(o => {
      try {
        const data = typeof o.clientData === "string" ? JSON.parse(o.clientData) : o.clientData;
        return data?.email === client.email;
      } catch { return false; }
    }).length;

    const prompt = `Ești manager de comenzi pentru un magazin B2B de automatizări industriale.

COMANDĂ DE ANALIZAT:
- Număr: #${order.number}
- Data: ${order.date}
- Valoare: ${order.total} RON
- Status: ${order.status}
- Metodă plată: ${order.paymentMethod || "N/A"}
- Zile de la comandă: ${Math.floor((Date.now() - new Date(order.date).getTime()) / (1000 * 60 * 60 * 24))}

CLIENT:
- Nume: ${client.name || "N/A"}
- Companie: ${client.company || "N/A"}
- Istoric: ${clientOrders} comenzi anterioare

PRODUSE (${items.length}):
${items.map(i => `- ${i.name || i.productName}: ${i.quantity}x`).join("\n")}

Analizează și prioritizează această comandă.

Returnează JSON:
{
  "priorityScore": 85,
  "priorityLevel": "urgent/high/medium/low",
  "urgencyFactors": ["factor 1", "factor 2"],
  "processingOrder": 1,
  "estimatedProcessingTime": "2-4 ore",
  "recommendedActions": [
    { "action": "acțiune", "reason": "motiv", "deadline": "timing" }
  ],
  "customerImportance": "VIP/regular/new",
  "riskAssessment": "low/medium/high",
  "notes": "observații suplimentare"
}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.5, maxOutputTokens: 1500 }
        })
      }
    );

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    let analysis;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch {
      analysis = {
        priorityScore: 50,
        priorityLevel: "medium",
        recommendedActions: [{ action: text }]
      };
    }

    return NextResponse.json({
      orderId: order.id,
      orderNumber: order.number,
      ...analysis
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
