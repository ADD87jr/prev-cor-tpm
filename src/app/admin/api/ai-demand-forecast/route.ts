import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyDPMtQTjaruCtql9qAFqcavAzKwXRdjsnA";

// GET - Statistici istorice pentru forecast
export async function GET() {
  try {
    const now = new Date();
    const last12Months = new Date(now);
    last12Months.setMonth(last12Months.getMonth() - 12);

    const orders = await prisma.order.findMany({
      where: {
        date: { gte: last12Months },
        status: { not: "cancelled" }
      },
      select: {
        date: true,
        total: true,
        items: true
      },
      orderBy: { date: "asc" }
    });

    // Grupează pe luni
    const monthlyData: Record<string, { revenue: number; orders: number; products: number }> = {};

    for (const order of orders) {
      const month = order.date.toISOString().slice(0, 7);
      if (!monthlyData[month]) {
        monthlyData[month] = { revenue: 0, orders: 0, products: 0 };
      }
      monthlyData[month].revenue += order.total;
      monthlyData[month].orders++;

      try {
        const items = typeof order.items === "string" ? JSON.parse(order.items) : order.items || [];
        monthlyData[month].products += items.reduce((sum: number, i: any) => sum + (i.quantity || 1), 0);
      } catch {}
    }

    const history = Object.entries(monthlyData)
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month));

    return NextResponse.json({
      history,
      stats: {
        totalOrders: orders.length,
        totalRevenue: orders.reduce((sum, o) => sum + o.total, 0),
        avgMonthlyRevenue: history.length > 0 
          ? history.reduce((sum, h) => sum + h.revenue, 0) / history.length 
          : 0
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Generează forecast
export async function POST(req: NextRequest) {
  try {
    const { period, productType } = await req.json();

    // Date istorice
    const now = new Date();
    const last12Months = new Date(now);
    last12Months.setMonth(last12Months.getMonth() - 12);

    const orders = await prisma.order.findMany({
      where: {
        date: { gte: last12Months },
        status: { not: "cancelled" }
      },
      select: { date: true, total: true, items: true }
    });

    // Grupează lunar
    const monthlyRevenue: Record<string, number> = {};
    for (const order of orders) {
      const month = order.date.toISOString().slice(0, 7);
      monthlyRevenue[month] = (monthlyRevenue[month] || 0) + order.total;
    }

    const historyText = Object.entries(monthlyRevenue)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, rev]) => `${month}: ${rev.toFixed(0)} RON`)
      .join("\n");

    const prompt = `Ești analist de date pentru un magazin B2B de automatizări industriale.

ISTORIC VÂNZĂRI (ultimele 12 luni):
${historyText || "Date insuficiente"}

Perioadă forecast cerută: ${period || "3 luni"}
${productType ? `Focus pe categoria: ${productType}` : ""}

Analizează trendul și generează predicția cererii.
Consideră: sezonalitate industrială, cicluri economice, tendințe.

Returnează JSON:
{
  "forecast": [
    { "period": "2026-03", "predictedRevenue": 50000, "predictedOrders": 45, "confidence": 85 },
    { "period": "2026-04", "predictedRevenue": 55000, "predictedOrders": 50, "confidence": 80 },
    { "period": "2026-05", "predictedRevenue": 48000, "predictedOrders": 42, "confidence": 75 }
  ],
  "trend": "growing/stable/declining",
  "seasonality": "descriere patern sezonier",
  "growthRate": 5.2,
  "insights": ["insight 1", "insight 2"],
  "recommendations": ["recomandare stoc 1", "recomandare marketing"],
  "risks": ["risc potențial"],
  "opportunities": ["oportunitate identificată"]
}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.6, maxOutputTokens: 2000 }
        })
      }
    );

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    let forecast;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      forecast = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch {
      forecast = {
        forecast: [],
        trend: "stable",
        seasonality: "Nu s-a putut determina",
        insights: [text],
        recommendations: []
      };
    }

    return NextResponse.json({
      historicalData: monthlyRevenue,
      ...forecast
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
