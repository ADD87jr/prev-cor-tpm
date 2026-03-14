import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyDPMtQTjaruCtql9qAFqcavAzKwXRdjsnA";

// GET - Analiză garanții și predicție service
export async function GET() {
  try {
    const orders = await prisma.order.findMany({
      where: {
        status: { in: ["completed", "shipped"] }
      },
      orderBy: { date: "desc" },
      select: {
        id: true,
        number: true,
        date: true,
        items: true,
        clientData: true
      },
      take: 500
    });

    const now = new Date();
    const warrantyAlerts: any[] = [];
    const serviceRecommendations: any[] = [];

    // Analizează fiecare comandă pentru garanții
    for (const order of orders) {
      const items = order.items as any[];
      if (!Array.isArray(items)) continue;

      const orderDate = new Date(order.date);
      const clientData = order.clientData as any;

      for (const item of items) {
        // Presupunem garanție standard de 24 luni pentru produse industriale
        const warrantyMonths = item.warrantyMonths || 24;
        const warrantyEndDate = new Date(orderDate);
        warrantyEndDate.setMonth(warrantyEndDate.getMonth() + warrantyMonths);

        const daysUntilExpiry = Math.floor((warrantyEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const monthsSincePurchase = Math.floor((now.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24 * 30));

        // Alertă pentru garanții care expiră în 30 zile
        if (daysUntilExpiry > 0 && daysUntilExpiry <= 30) {
          warrantyAlerts.push({
            id: `warranty-${order.id}-${item.productId || item.id}`,
            type: "WARRANTY_EXPIRING",
            priority: daysUntilExpiry <= 7 ? "HIGH" : "MEDIUM",
            productName: item.name || item.productName,
            productId: item.productId || item.id,
            orderNumber: order.number,
            purchaseDate: orderDate.toISOString().split("T")[0],
            warrantyEndDate: warrantyEndDate.toISOString().split("T")[0],
            daysUntilExpiry,
            clientName: clientData?.name || clientData?.companyName,
            clientEmail: clientData?.email,
            suggestion: "Oferă extensie garanție sau contract service"
          });
        }

        // Recomandări service bazate pe tipul produsului și vechime
        if (monthsSincePurchase >= 12) {
          // Produse care necesită mentenanță preventivă
          const productType = (item.type || item.category || "").toLowerCase();
          let serviceInterval = 24; // default 2 ani
          let serviceType = "Verificare generală";

          if (productType.includes("plc") || productType.includes("controller")) {
            serviceInterval = 12;
            serviceType = "Verificare firmware și backup configurație";
          } else if (productType.includes("servo") || productType.includes("motor")) {
            serviceInterval = 6;
            serviceType = "Verificare mecanică și lubrifiere";
          } else if (productType.includes("senzor") || productType.includes("sensor")) {
            serviceInterval = 12;
            serviceType = "Calibrare și verificare precizie";
          } else if (productType.includes("hmi") || productType.includes("panel")) {
            serviceInterval = 18;
            serviceType = "Update software și verificare display";
          }

          if (monthsSincePurchase % serviceInterval === 0 || monthsSincePurchase >= serviceInterval) {
            serviceRecommendations.push({
              id: `service-${order.id}-${item.productId || item.id}`,
              productName: item.name || item.productName,
              productId: item.productId || item.id,
              type: productType,
              monthsSincePurchase,
              recommendedService: serviceType,
              urgency: monthsSincePurchase >= serviceInterval * 2 ? "HIGH" : "MEDIUM",
              clientName: clientData?.name || clientData?.companyName,
              clientEmail: clientData?.email,
              orderNumber: order.number
            });
          }
        }
      }
    }

    // Sortează după urgență
    warrantyAlerts.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
    serviceRecommendations.sort((a, b) => {
      const urgencyOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      return (urgencyOrder[a.urgency as keyof typeof urgencyOrder] || 2) - (urgencyOrder[b.urgency as keyof typeof urgencyOrder] || 2);
    });

    const stats = {
      warrantyExpiringSoon: warrantyAlerts.length,
      serviceRecommended: serviceRecommendations.length,
      criticalWarranty: warrantyAlerts.filter(w => w.daysUntilExpiry <= 7).length,
      highPriorityService: serviceRecommendations.filter(s => s.urgency === "HIGH").length
    };

    return NextResponse.json({
      stats,
      warrantyAlerts: warrantyAlerts.slice(0, 30),
      serviceRecommendations: serviceRecommendations.slice(0, 30)
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Generare plan de mentenanță AI pentru un client
export async function POST(req: NextRequest) {
  try {
    const { clientEmail, productIds } = await req.json();

    // Găsește comenzile clientului
    const orders = await prisma.order.findMany({
      where: {
        status: { in: ["completed", "shipped"] }
      },
      select: {
        id: true,
        date: true,
        items: true,
        clientData: true
      }
    });

    // Filtrează comenzile clientului
    const clientOrders = orders.filter(o => {
      const cd = o.clientData as any;
      return cd?.email === clientEmail;
    });

    if (clientOrders.length === 0) {
      return NextResponse.json({ error: "Client fără comenzi" }, { status: 404 });
    }

    // Extrage toate produsele achiziționate
    const purchasedProducts: any[] = [];
    for (const order of clientOrders) {
      const items = order.items as any[];
      if (!Array.isArray(items)) continue;

      for (const item of items) {
        purchasedProducts.push({
          name: item.name || item.productName,
          type: item.type || item.category,
          purchaseDate: order.date,
          quantity: item.quantity || 1
        });
      }
    }

    const clientData = clientOrders[0].clientData as any;

    const prompt = `Creează un plan de mentenanță preventivă pentru un client B2B de automatizări industriale.

DATE CLIENT:
- Nume: ${clientData?.name || clientData?.companyName}
- Email: ${clientEmail}

PRODUSE ACHIZIȚIONATE:
${JSON.stringify(purchasedProducts, null, 2)}

Creează un plan de mentenanță personalizat care include:
- Calendar de verificări preventive
- Recomandări specifice per tip de produs
- Estimare costuri mentenanță
- Sugestii de upgrade/înlocuire

Returnează JSON:
{
  "summary": "rezumat plan mentenanță",
  "maintenanceSchedule": [
    {
      "month": "YYYY-MM",
      "products": ["lista produse"],
      "actions": ["acțiuni de mentenanță"],
      "estimatedDuration": "ore",
      "priority": "HIGH" | "MEDIUM" | "LOW"
    }
  ],
  "productRecommendations": [
    {
      "productName": "nume produs",
      "currentAge": "vechime",
      "condition": "GOOD" | "NEEDS_ATTENTION" | "REPLACE_SOON",
      "recommendation": "descriere recomandare",
      "estimatedCost": "cost estimat"
    }
  ],
  "annualMaintenanceCost": "cost anual estimat",
  "warrantyExtensionOffer": {
    "eligible": boolean,
    "products": ["produse eligibile"],
    "suggestedPrice": "preț sugerat"
  },
  "upgradeOpportunities": [
    {
      "currentProduct": "produs actual",
      "suggestedUpgrade": "produs recomandat",
      "benefits": ["beneficii upgrade"]
    }
  ]
}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.5,
            maxOutputTokens: 2500
          }
        })
      }
    );

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    let maintenancePlan;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      maintenancePlan = jsonMatch ? JSON.parse(jsonMatch[0]) : { error: "Parse failed", raw: text };
    } catch {
      maintenancePlan = { error: "Parse failed", raw: text };
    }

    return NextResponse.json({
      client: {
        name: clientData?.name || clientData?.companyName,
        email: clientEmail,
        totalOrders: clientOrders.length,
        totalProducts: purchasedProducts.length
      },
      maintenancePlan
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
