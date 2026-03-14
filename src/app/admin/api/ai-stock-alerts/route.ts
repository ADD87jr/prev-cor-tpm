import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const GEMINI_API_KEY = "AIzaSyDPMtQTjaruCtql9qAFqcavAzKwXRdjsnA";

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        stock: true,
        price: true,
        type: true,
        manufacturer: true
      }
    });

    // Obținem istoricul vânzărilor din ultimele 90 zile
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const orders = await prisma.order.findMany({
      where: {
        date: { gte: ninetyDaysAgo },
        status: { in: ["DELIVERED", "SHIPPED", "COMPLETED", "PROCESSING"] }
      },
      select: {
        items: true,
        date: true
      }
    });

    // Calculăm viteza de vânzare pentru fiecare produs
    const salesVelocity = new Map<number, { totalSold: number; salesDates: Date[] }>();

    orders.forEach(order => {
      const items = (order.items as any[]) || [];
      items.forEach(item => {
        const productId = item.productId || item.id;
        if (!salesVelocity.has(productId)) {
          salesVelocity.set(productId, { totalSold: 0, salesDates: [] });
        }
        const velocity = salesVelocity.get(productId)!;
        velocity.totalSold += item.quantity || 1;
        velocity.salesDates.push(order.date);
      });
    });

    // Generăm alerte inteligente
    const alerts: any[] = [];

    products.forEach(product => {
      const velocity = salesVelocity.get(product.id);
      
      if (!velocity || velocity.totalSold === 0) {
        // Produs fără vânzări recente
        if (product.stock > 0) {
          alerts.push({
            productId: product.id,
            productName: product.name,
            type: product.type,
            currentStock: product.stock,
            alertType: "SLOW_MOVING",
            severity: "LOW",
            message: "Produs fără vânzări în ultimele 90 zile",
            recommendation: "Consideră promoție sau lichidare stoc",
            daysUntilStockout: null,
            avgDailySales: 0,
            stockValue: product.stock * product.price
          });
        }
        return;
      }

      // Calculăm viteza zilnică
      const avgDailySales = velocity.totalSold / 90;
      const daysUntilStockout = product.stock / avgDailySales;

      // Determinăm severitatea alertei
      let alertType = "HEALTHY";
      let severity = "NONE";
      let message = "";
      let recommendation = "";

      if (daysUntilStockout <= 3) {
        alertType = "CRITICAL";
        severity = "CRITICAL";
        message = `Stoc se termină în ${Math.ceil(daysUntilStockout)} zile!`;
        recommendation = "COMANDĂ URGENTĂ necesară";
      } else if (daysUntilStockout <= 7) {
        alertType = "URGENT";
        severity = "HIGH";
        message = `Stoc se termină în ~${Math.ceil(daysUntilStockout)} zile`;
        recommendation = "Plasează comandă către furnizor";
      } else if (daysUntilStockout <= 14) {
        alertType = "WARNING";
        severity = "MEDIUM";
        message = `Stoc pentru ~${Math.ceil(daysUntilStockout)} zile`;
        recommendation = "Verifică disponibilitate la furnizor";
      } else if (daysUntilStockout > 180) {
        alertType = "OVERSTOCK";
        severity = "LOW";
        message = `Stoc excedentar (${Math.ceil(daysUntilStockout)} zile)`;
        recommendation = "Consideră promoție pentru rotație stoc";
      }

      if (alertType !== "HEALTHY") {
        // Trend: accelerează sau încetinește?
        const recentSales = velocity.salesDates.filter(d => 
          d.getTime() > Date.now() - 30 * 24 * 60 * 60 * 1000
        ).length;
        const olderSales = velocity.salesDates.filter(d => 
          d.getTime() <= Date.now() - 30 * 24 * 60 * 60 * 1000 &&
          d.getTime() > Date.now() - 60 * 24 * 60 * 60 * 1000
        ).length;

        let trend = "STABLE";
        if (recentSales > olderSales * 1.3) trend = "ACCELERATING";
        else if (recentSales < olderSales * 0.7) trend = "DECELERATING";

        alerts.push({
          productId: product.id,
          productName: product.name,
          type: product.type,
          manufacturer: product.manufacturer,
          currentStock: product.stock,
          alertType,
          severity,
          message,
          recommendation,
          daysUntilStockout: Math.round(daysUntilStockout),
          avgDailySales: Math.round(avgDailySales * 100) / 100,
          totalSoldLast90Days: velocity.totalSold,
          trend,
          stockValue: Math.round(product.stock * product.price),
          suggestedReorderQty: Math.ceil(avgDailySales * 30) // 30 zile stoc
        });
      }
    });

    // Sortăm după severitate
    const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    alerts.sort((a, b) => severityOrder[a.severity as keyof typeof severityOrder] - severityOrder[b.severity as keyof typeof severityOrder]);

    const stats = {
      totalAlerts: alerts.length,
      critical: alerts.filter(a => a.severity === "CRITICAL").length,
      high: alerts.filter(a => a.severity === "HIGH").length,
      medium: alerts.filter(a => a.severity === "MEDIUM").length,
      low: alerts.filter(a => a.severity === "LOW").length,
      totalStockValue: alerts.reduce((sum, a) => sum + (a.stockValue || 0), 0),
      productsNeedingReorder: alerts.filter(a => ["CRITICAL", "HIGH", "MEDIUM"].includes(a.severity)).length
    };

    return NextResponse.json({ 
      alerts: alerts.slice(0, 100),
      stats 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { alerts } = await req.json();

    const prompt = `Analizează aceste alerte de stoc și generează un plan de acțiune prioritizat:

ALERTE:
${alerts.slice(0, 10).map((a: any) => 
  `- ${a.productName}: ${a.currentStock} buc, ${a.daysUntilStockout} zile până la stockout, vânzări: ${a.avgDailySales}/zi, trend: ${a.trend}`
).join("\n")}

Răspunde STRICT în JSON:
{
  "priorityActions": [
    { "productName": "...", "action": "...", "deadline": "...", "supplier": "..." }
  ],
  "purchaseOrderSuggestion": {
    "totalProducts": 0,
    "estimatedCost": "...",
    "urgentItems": ["..."]
  },
  "riskAssessment": {
    "revenueAtRisk": "...",
    "customerImpact": "...",
    "mitigationSteps": ["..."]
  },
  "inventoryOptimization": {
    "slowMoving": ["..."],
    "fastMoving": ["..."],
    "rebalancingSuggestions": ["..."]
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
