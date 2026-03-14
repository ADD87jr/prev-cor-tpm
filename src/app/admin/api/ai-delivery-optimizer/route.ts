import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyDPMtQTjaruCtql9qAFqcavAzKwXRdjsnA";

// Configurație curieri (poate fi mutat într-o bază de date)
const COURIERS = [
  { name: "Fan Courier", basePrice: 20, pricePerKg: 2, maxWeight: 50, deliveryDays: "1-2", regions: ["toate"] },
  { name: "Cargus", basePrice: 18, pricePerKg: 2.5, maxWeight: 30, deliveryDays: "2-3", regions: ["toate"] },
  { name: "Sameday", basePrice: 15, pricePerKg: 3, maxWeight: 20, deliveryDays: "1", regions: ["urban"] },
  { name: "GLS", basePrice: 22, pricePerKg: 1.8, maxWeight: 100, deliveryDays: "2-3", regions: ["toate"] },
  { name: "DPD", basePrice: 19, pricePerKg: 2.2, maxWeight: 50, deliveryDays: "2-3", regions: ["toate"] }
];

// GET - Analizează costurile de livrare din comenzile anterioare
export async function GET() {
  try {
    const orders = await prisma.order.findMany({
      where: { status: { in: ["delivered", "shipped", "completed"] } },
      select: {
        id: true,
        total: true,
        clientData: true,
        items: true,
        date: true
      },
      orderBy: { date: "desc" },
      take: 200
    });

    // Statistici livrări
    const deliveryStats = {
      totalOrders: orders.length,
      avgOrderValue: 0,
      byRegion: {} as Record<string, number>,
      estimatedDeliveryCosts: 0
    };

    let totalValue = 0;

    for (const order of orders) {
      totalValue += order.total || 0;

      let client: any = {};
      try {
        client = typeof order.clientData === "string" ? JSON.parse(order.clientData) : order.clientData || {};
      } catch {}

      // Extrage regiunea din adresă/județ
      const address = (client.address || "").toLowerCase();
      const county = client.county || client.judet || "";
      
      if (county) {
        deliveryStats.byRegion[county] = (deliveryStats.byRegion[county] || 0) + 1;
      }
    }

    deliveryStats.avgOrderValue = orders.length > 0 ? Math.round(totalValue / orders.length) : 0;

    // Sugestii de optimizare
    const suggestions = [];
    
    if (deliveryStats.avgOrderValue < 200) {
      suggestions.push("Comandă medie mică - consideră livrare gratuită peste 250 RON pentru a crește valoarea coșului");
    }

    const topRegions = Object.entries(deliveryStats.byRegion)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    if (topRegions.length > 0) {
      suggestions.push(`Regiuni principale: ${topRegions.map(r => r[0]).join(", ")} - negociază tarife cu curierii pentru aceste zone`);
    }

    return NextResponse.json({
      stats: deliveryStats,
      couriers: COURIERS,
      suggestions,
      topRegions
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Calculează cel mai bun curier pentru o comandă
export async function POST(request: NextRequest) {
  try {
    const { orderId, weight, county, items, useAI } = await request.json();

    let orderWeight = weight || 0;
    let orderCounty = county || "";
    let orderItems: any[] = items || [];
    let orderTotal = 0;

    // Dacă avem orderId, obținem datele comenzii
    if (orderId) {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: {
          total: true,
          clientData: true,
          items: true
        }
      });

      if (order) {
        orderTotal = order.total || 0;
        
        let client: any = {};
        try {
          client = typeof order.clientData === "string" ? JSON.parse(order.clientData) : order.clientData || {};
        } catch {}
        orderCounty = client.county || client.judet || orderCounty;

        try {
          orderItems = typeof order.items === "string" ? JSON.parse(order.items) : order.items || [];
        } catch {}
      }
    }

    // Estimare greutate dacă nu e specificată
    if (!orderWeight && orderItems.length > 0) {
      // Estimare: 0.5kg per articol (poate fi îmbunătățit cu greutăți reale per produs)
      orderWeight = orderItems.reduce((sum, item) => sum + ((item.quantity || 1) * 0.5), 0);
    }

    // Calculează prețul pentru fiecare curier
    const courierOptions = COURIERS.map(courier => {
      let price = courier.basePrice;
      
      if (orderWeight > 1) {
        price += (orderWeight - 1) * courier.pricePerKg;
      }

      // Verifică dacă greutatea e acceptată
      const isAvailable = orderWeight <= courier.maxWeight;

      return {
        ...courier,
        calculatedPrice: Math.round(price * 100) / 100,
        isAvailable,
        profitMargin: orderTotal > 0 ? ((orderTotal - price) / orderTotal * 100).toFixed(1) + "%" : "N/A"
      };
    })
    .filter(c => c.isAvailable)
    .sort((a, b) => a.calculatedPrice - b.calculatedPrice);

    const bestOption = courierOptions[0];
    const fastestOption = courierOptions.find(c => c.deliveryDays === "1") || courierOptions[0];

    // Analiză AI dacă cerută
    let aiAnalysis = null;
    if (useAI) {
      const prompt = `Ești expert în logistică pentru un magazin online de automatizări industriale din România.

DETALII COMANDĂ:
- Greutate estimată: ${orderWeight} kg
- Județ destinație: ${orderCounty || "nespecificat"}
- Valoare comandă: ${orderTotal} RON
- Număr articole: ${orderItems.length}

OPȚIUNI CURIERI:
${courierOptions.map(c => `- ${c.name}: ${c.calculatedPrice} RON, livrare în ${c.deliveryDays} zile`).join("\n")}

Analizează și recomandă cea mai bună opțiune considerând:
- Raport preț/viteză
- Fiabilitate (Fan Courier și Sameday sunt cei mai fiabili pentru echipamente industriale)
- Valoarea comenzii vs costul livrării

Returnează JSON:
{
  "recommendation": "numele curierului recomandat",
  "reason": "motivul recomandării",
  "alternatives": ["alternativa 1", "alternativa 2"],
  "tips": ["sfat 1 pentru optimizare"],
  "shouldOfferFreeDelivery": true/false
}`;

      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: prompt }] }],
              generationConfig: { maxOutputTokens: 500, temperature: 0.4 }
            })
          }
        );

        if (response.ok) {
          const data = await response.json();
          const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            aiAnalysis = JSON.parse(jsonMatch[0]);
          }
        }
      } catch (e) {
        console.error("AI analysis failed:", e);
      }
    }

    return NextResponse.json({
      success: true,
      orderDetails: {
        weight: orderWeight,
        county: orderCounty,
        total: orderTotal,
        itemCount: orderItems.length
      },
      options: courierOptions,
      bestPrice: bestOption,
      fastestDelivery: fastestOption,
      aiAnalysis,
      freeDeliveryThreshold: 500,
      eligibleForFreeDelivery: orderTotal >= 500
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
