import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyDPMtQTjaruCtql9qAFqcavAzKwXRdjsnA";

// GET - Comenzi cu risc de retur
export async function GET() {
  try {
    const orders = await prisma.order.findMany({
      where: { status: { not: "cancelled" } },
      orderBy: { date: "desc" },
      take: 100,
      select: {
        id: true,
        number: true,
        total: true,
        status: true,
        date: true,
        clientData: true,
        items: true,
        paymentMethod: true
      }
    });

    // Calculează scor risc pentru fiecare comandă
    const ordersWithRisk = orders.map(order => {
      let riskScore = 0;
      let riskFactors: string[] = [];

      // Comandă mare = risc mai mare
      if (order.total > 5000) {
        riskScore += 20;
        riskFactors.push("Valoare mare");
      }

      // Plată la livrare = risc mai mare
      if (order.paymentMethod === "ramburs") {
        riskScore += 25;
        riskFactors.push("Plată ramburs");
      }

      // Client nou (simulat)
      const clientData = typeof order.clientData === "string" 
        ? JSON.parse(order.clientData) 
        : order.clientData;
      
      // Dacă nu are istoric
      riskScore += 15;
      riskFactors.push("Client nou");

      // Multe produse diferite
      let items: any[] = [];
      try {
        items = typeof order.items === "string" ? JSON.parse(order.items) : order.items || [];
      } catch {}
      
      if (items.length > 5) {
        riskScore += 10;
        riskFactors.push("Multe articole");
      }

      return {
        ...order,
        clientName: clientData?.name || clientData?.companyName || "N/A",
        clientEmail: clientData?.email || "N/A",
        itemsCount: items.length,
        riskScore: Math.min(100, riskScore),
        riskLevel: riskScore >= 50 ? "high" : riskScore >= 30 ? "medium" : "low",
        riskFactors
      };
    });

    // Sortează după risc
    ordersWithRisk.sort((a, b) => b.riskScore - a.riskScore);

    return NextResponse.json({
      orders: ordersWithRisk,
      summary: {
        highRisk: ordersWithRisk.filter(o => o.riskLevel === "high").length,
        mediumRisk: ordersWithRisk.filter(o => o.riskLevel === "medium").length,
        lowRisk: ordersWithRisk.filter(o => o.riskLevel === "low").length
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Analiză detaliată AI pentru o comandă
export async function POST(req: NextRequest) {
  try {
    const { orderId } = await req.json();

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        number: true,
        total: true,
        status: true,
        date: true,
        clientData: true,
        items: true,
        paymentMethod: true
      }
    });

    if (!order) {
      return NextResponse.json({ error: "Comandă negăsită" }, { status: 404 });
    }

    const clientData = typeof order.clientData === "string" 
      ? JSON.parse(order.clientData) 
      : order.clientData;

    let items: any[] = [];
    try {
      items = typeof order.items === "string" ? JSON.parse(order.items) : order.items || [];
    } catch {}

    const prompt = `Ești analist de risc pentru un magazin B2B de automatizări industriale.

COMANDĂ DE ANALIZAT:
- Număr: #${order.number}
- Data: ${order.date}
- Valoare: ${order.total} RON
- Status: ${order.status}
- Metodă plată: ${order.paymentMethod || "N/A"}

CLIENT:
- Nume: ${clientData?.name || clientData?.companyName || "N/A"}
- Email: ${clientData?.email || "N/A"}
- Telefon: ${clientData?.phone || "N/A"}
- Adresă: ${clientData?.address || "N/A"}

PRODUSE COMANDATE (${items.length}):
${items.map((i: any) => `- ${i.name || i.productName}: ${i.quantity} x ${i.price} RON`).join("\n")}

Analizează riscul de retur/reclamație și oferă predicții.

Returnează JSON:
{
  "returnProbability": 15,
  "complaintProbability": 10,
  "riskLevel": "low/medium/high",
  "riskFactors": [
    { "factor": "factor risc", "impact": "high/medium/low", "explanation": "..." }
  ],
  "preventiveActions": [
    { "action": "acțiune preventivă", "priority": "immediate/soon/optional", "expectedImpact": "..." }
  ],
  "customerInsights": "observații despre client",
  "productRisks": [
    { "product": "nume produs", "risk": "risc specific", "mitigation": "..." }
  ],
  "recommendedFollowUp": "ce ar trebui făcut după livrare",
  "estimatedSatisfaction": 85
}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 1200, temperature: 0.5 }
        })
      }
    );

    if (!response.ok) {
      return NextResponse.json({ error: "AI indisponibil" }, { status: 500 });
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const cleaned = rawText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    const result = JSON.parse(cleaned);
    return NextResponse.json({
      success: true,
      orderId,
      orderNumber: order.number,
      ...result
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
