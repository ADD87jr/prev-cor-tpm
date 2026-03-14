import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyDPMtQTjaruCtql9qAFqcavAzKwXRdjsnA";

// GET - Predicție stoc pentru toate produsele
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get("days") || "30");

    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        sku: true,
        stock: true,
        price: true,
        type: true,
        manufacturer: true
      }
    });

    // Obține comenzile din ultimele 90 zile pentru analiză
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const orders = await prisma.order.findMany({
      where: {
        date: { gte: ninetyDaysAgo },
        status: { in: ["completed", "shipped", "processing"] }
      },
      select: {
        id: true,
        date: true,
        items: true
      }
    });

    // Calculează vânzări per produs
    const salesData: Record<string, { total: number; orders: { date: Date; qty: number }[] }> = {};

    for (const order of orders) {
      const items = order.items as any[];
      if (!Array.isArray(items)) continue;

      for (const item of items) {
        const productId = item.productId || item.id;
        const qty = item.quantity || 1;

        if (!salesData[productId]) {
          salesData[productId] = { total: 0, orders: [] };
        }
        salesData[productId].total += qty;
        salesData[productId].orders.push({ date: order.date, qty });
      }
    }

    // Calculează predicții pentru fiecare produs
    const forecasts = products.map(product => {
      const sales = salesData[product.id] || { total: 0, orders: [] };
      const dailyAvg = sales.total / 90;
      const predictedDemand = Math.ceil(dailyAvg * days);
      const currentStock = product.stock || 0;
      const daysUntilStockout = dailyAvg > 0 ? Math.floor(currentStock / dailyAvg) : 999;

      // Detectare trend
      const recentOrders = sales.orders.filter(o => {
        const orderDate = new Date(o.date);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return orderDate >= thirtyDaysAgo;
      });
      const recentSales = recentOrders.reduce((sum, o) => sum + o.qty, 0);
      const recentDailyAvg = recentSales / 30;

      let trend: "UP" | "DOWN" | "STABLE" = "STABLE";
      if (recentDailyAvg > dailyAvg * 1.2) trend = "UP";
      else if (recentDailyAvg < dailyAvg * 0.8) trend = "DOWN";

      // Status recomandare
      let status: "OK" | "LOW" | "CRITICAL" | "OVERSTOCK" = "OK";
      let recommendation = "";

      if (daysUntilStockout <= 7) {
        status = "CRITICAL";
        recommendation = `URGENT: Comandă ${predictedDemand} buc în următoarele 2 zile`;
      } else if (daysUntilStockout <= 14) {
        status = "LOW";
        recommendation = `Comandă ${predictedDemand} buc în următoarea săptămână`;
      } else if (currentStock > predictedDemand * 3) {
        status = "OVERSTOCK";
        recommendation = `Stoc mare - consideră promoție`;
      } else {
        recommendation = "Stoc OK pentru perioada analizată";
      }

      return {
        productId: product.id,
        name: product.name,
        sku: product.sku,
        manufacturer: product.manufacturer,
        currentStock,
        dailyAvgSales: Math.round(dailyAvg * 100) / 100,
        predictedDemand,
        daysUntilStockout: daysUntilStockout > 365 ? ">1 an" : `${daysUntilStockout} zile`,
        trend,
        status,
        recommendation,
        salesLast90Days: sales.total
      };
    });

    // Sortează după urgență
    const sortedForecasts = forecasts.sort((a, b) => {
      const statusOrder = { CRITICAL: 0, LOW: 1, OVERSTOCK: 2, OK: 3 };
      return statusOrder[a.status] - statusOrder[b.status];
    });

    const stats = {
      totalProducts: products.length,
      critical: forecasts.filter(f => f.status === "CRITICAL").length,
      low: forecasts.filter(f => f.status === "LOW").length,
      overstock: forecasts.filter(f => f.status === "OVERSTOCK").length,
      ok: forecasts.filter(f => f.status === "OK").length
    };

    return NextResponse.json({
      forecastPeriod: `${days} zile`,
      stats,
      forecasts: sortedForecasts.slice(0, 50), // Top 50 cele mai urgente
      recommendations: [
        ...forecasts.filter(f => f.status === "CRITICAL").map(f => ({
          type: "CRITICAL",
          product: f.name,
          action: f.recommendation
        })),
        ...forecasts.filter(f => f.status === "LOW").slice(0, 5).map(f => ({
          type: "WARNING",
          product: f.name,
          action: f.recommendation
        }))
      ]
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Predicție AI detaliată pentru un produs
export async function POST(req: NextRequest) {
  try {
    const { productId, forecastMonths = 3 } = await req.json();

    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      return NextResponse.json({ error: "Produs negăsit" }, { status: 404 });
    }

    // Obține istoricul comenzilor cu acest produs
    const orders = await prisma.order.findMany({
      where: {
        status: { in: ["completed", "shipped", "processing"] }
      },
      orderBy: { date: "desc" },
      take: 500
    });

    // Extrage vânzările per lună
    const monthlySales: Record<string, number> = {};
    for (const order of orders) {
      const items = order.items as any[];
      if (!Array.isArray(items)) continue;

      const productItem = items.find(i => i.productId === productId || i.id === productId);
      if (productItem) {
        const monthKey = new Date(order.date).toISOString().slice(0, 7);
        monthlySales[monthKey] = (monthlySales[monthKey] || 0) + (productItem.quantity || 1);
      }
    }

    const salesHistory = Object.entries(monthlySales)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, qty]) => ({ month, quantity: qty }));

    const prompt = `Analizează istoricul vânzărilor pentru acest produs industrial și fă predicții.

PRODUS:
- Nume: ${product.name}
- SKU: ${product.sku || "N/A"}
- Tip: ${product.type || "N/A"}
- Producător: ${product.manufacturer || "N/A"}
- Stoc actual: ${product.stock || 0} buc
- Preț: ${product.price} RON

ISTORIC VÂNZĂRI (per lună):
${salesHistory.map(s => `${s.month}: ${s.quantity} buc`).join("\n")}

PERIOADA PREDICȚIE: ${forecastMonths} luni

Analizează pattern-uri sezoniere, trend-uri, și returnează JSON:
{
  "analysis": {
    "avgMonthlySales": number,
    "trend": "GROWING" | "DECLINING" | "STABLE",
    "seasonality": "text descriere sezonalitate detectată",
    "peakMonths": ["lista lunilor cu vânzări mari"],
    "lowMonths": ["lista lunilor cu vânzări mici"]
  },
  "forecast": [
    { "month": "2026-03", "predicted": number, "confidence": "HIGH" | "MEDIUM" | "LOW" }
  ],
  "recommendations": {
    "orderQuantity": number_recomandat,
    "orderBy": "data până când să comande",
    "safetyStock": number_stoc_siguranță,
    "reasoning": "explicație"
  },
  "alerts": ["alerte importante dacă e cazul"]
}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 2000
          }
        })
      }
    );

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    let forecast;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      forecast = jsonMatch ? JSON.parse(jsonMatch[0]) : { error: "Parse failed", raw: text };
    } catch {
      forecast = { error: "Parse failed", raw: text };
    }

    return NextResponse.json({
      product: {
        id: product.id,
        name: product.name,
        sku: product.sku,
        currentStock: product.stock,
        price: product.price
      },
      salesHistory,
      forecast
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
