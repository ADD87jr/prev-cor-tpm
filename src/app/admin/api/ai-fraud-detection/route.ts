import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyDPMtQTjaruCtql9qAFqcavAzKwXRdjsnA";

interface FraudIndicator {
  type: string;
  severity: "low" | "medium" | "high";
  description: string;
  score: number;
}

// GET - Analizează comenzile pentru fraudă
export async function GET() {
  try {
    const orders = await prisma.order.findMany({
      where: { status: { not: "cancelled" } },
      select: {
        id: true,
        number: true,
        clientData: true,
        total: true,
        items: true,
        date: true,
        status: true,
        paymentMethod: true
      },
      orderBy: { date: "desc" },
      take: 100
    });

    const suspiciousOrders: any[] = [];

    for (const order of orders) {
      let client: any = {};
      try {
        client = typeof order.clientData === "string" 
          ? JSON.parse(order.clientData) 
          : order.clientData || {};
      } catch { continue; }

      const indicators: FraudIndicator[] = [];
      let totalScore = 0;

      // Verificare email suspect
      const email = client.email || "";
      if (email.includes("+") || email.match(/\d{5,}/)) {
        indicators.push({
          type: "email_suspect",
          severity: "medium",
          description: "Email cu caractere neobișnuite sau multe cifre",
          score: 20
        });
        totalScore += 20;
      }

      // Email temporar
      const tempDomains = ["tempmail", "guerrilla", "10minute", "throwaway", "mailinator"];
      if (tempDomains.some(d => email.toLowerCase().includes(d))) {
        indicators.push({
          type: "email_temporar",
          severity: "high",
          description: "Email de la serviciu temporar",
          score: 40
        });
        totalScore += 40;
      }

      // Comandă foarte mare pentru client nou
      if (order.total > 5000) {
        // Verifică dacă e prima comandă a clientului
        const previousOrders = orders.filter(o => {
          try {
            const c = typeof o.clientData === "string" ? JSON.parse(o.clientData) : o.clientData;
            return c?.email === email && o.id !== order.id;
          } catch { return false; }
        });

        if (previousOrders.length === 0) {
          indicators.push({
            type: "valoare_mare_client_nou",
            severity: "medium",
            description: `Prima comandă cu valoare mare: ${order.total} RON`,
            score: 25
          });
          totalScore += 25;
        }
      }

      // Telefon invalid
      const phone = client.phone || "";
      if (phone.length < 9 || phone.match(/^0{5,}/)) {
        indicators.push({
          type: "telefon_invalid",
          severity: "low",
          description: "Număr de telefon incomplet sau invalid",
          score: 15
        });
        totalScore += 15;
      }

      // Adresă incompletă
      const address = client.address || "";
      if (address.length < 15 || !address.match(/\d/)) {
        indicators.push({
          type: "adresa_incompleta",
          severity: "low",
          description: "Adresa pare incompletă (fără număr)",
          score: 10
        });
        totalScore += 10;
      }

      // Plată ramburs pentru sumă mare
      if (order.paymentMethod === "ramburs" && order.total > 3000) {
        indicators.push({
          type: "ramburs_valoare_mare",
          severity: "medium",
          description: "Comandă ramburs cu valoare > 3000 RON",
          score: 20
        });
        totalScore += 20;
      }

      if (indicators.length > 0) {
        suspiciousOrders.push({
          orderId: order.id,
          orderNumber: order.number,
          date: order.date,
          total: order.total,
          status: order.status,
          client: {
            name: client.name,
            email: client.email,
            phone: client.phone
          },
          fraudScore: Math.min(100, totalScore),
          riskLevel: totalScore >= 50 ? "high" : totalScore >= 25 ? "medium" : "low",
          indicators
        });
      }
    }

    // Sortare după scor
    suspiciousOrders.sort((a, b) => b.fraudScore - a.fraudScore);

    return NextResponse.json({
      ordersAnalyzed: orders.length,
      suspiciousCount: suspiciousOrders.length,
      highRisk: suspiciousOrders.filter(o => o.riskLevel === "high").length,
      mediumRisk: suspiciousOrders.filter(o => o.riskLevel === "medium").length,
      lowRisk: suspiciousOrders.filter(o => o.riskLevel === "low").length,
      suspiciousOrders: suspiciousOrders.slice(0, 30)
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Analiză AI detaliată pentru o comandă
export async function POST(request: NextRequest) {
  try {
    const { orderId } = await request.json();

    if (!orderId) {
      return NextResponse.json({ error: "orderId obligatoriu" }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        number: true,
        clientData: true,
        total: true,
        items: true,
        date: true,
        status: true,
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

    const prompt = `Ești expert în detecția fraudelor pentru un magazin online B2B de automatizări industriale.

COMANDĂ #${order.number}
Data: ${order.date}
Total: ${order.total} RON
Metoda plată: ${order.paymentMethod || "N/A"}
Status: ${order.status}

CLIENT:
- Nume: ${client.name || "N/A"}
- Email: ${client.email || "N/A"}
- Telefon: ${client.phone || "N/A"}
- Adresă: ${client.address || "N/A"}
- Companie: ${client.company || "N/A"}
- CUI: ${client.cui || "N/A"}

PRODUSE COMANDATE:
${items.map(i => `- ${i.name || i.productName}: ${i.quantity}x ${i.price} RON`).join("\n")}

Analizează această comandă pentru indicatori de fraudă.
Consideră: pattern-uri de fraudă B2B, date incomplete, inconsistențe, red flags.

Returnează JSON:
{
  "riskAssessment": "low/medium/high",
  "fraudProbability": 25,
  "analysis": "analiza detaliată a comenzii",
  "redFlags": ["flag 1", "flag 2"],
  "greenFlags": ["aspect pozitiv 1"],
  "recommendation": "acțiune recomandată",
  "verificationSteps": ["pas 1 de verificare", "pas 2"]
}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 1000, temperature: 0.3 }
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
        riskAssessment: "unknown",
        analysis: "Nu s-a putut analiza comanda",
        recommendation: "Verificare manuală recomandată"
      };
    }

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        number: order.number,
        total: order.total
      },
      ...result
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
