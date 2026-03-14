import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const GEMINI_API_KEY = "AIzaSyDPMtQTjaruCtql9qAFqcavAzKwXRdjsnA";

export async function GET() {
  try {
    const orders = await prisma.order.findMany({
      select: {
        total: true,
        date: true,
        status: true
      },
      where: {
        status: { notIn: ["CANCELLED", "REFUNDED"] }
      },
      orderBy: { date: "asc" }
    });

    // Grupăm veniturile pe luni
    const monthlyRevenue = new Map<string, { revenue: number; orderCount: number }>();
    
    orders.forEach(order => {
      const monthKey = order.date.toISOString().slice(0, 7); // YYYY-MM
      if (!monthlyRevenue.has(monthKey)) {
        monthlyRevenue.set(monthKey, { revenue: 0, orderCount: 0 });
      }
      const month = monthlyRevenue.get(monthKey)!;
      month.revenue += order.total;
      month.orderCount++;
    });

    // Convertim la array și sortăm
    const historicalData = Array.from(monthlyRevenue.entries())
      .map(([month, data]) => ({
        month,
        revenue: Math.round(data.revenue),
        orderCount: data.orderCount,
        avgOrderValue: Math.round(data.revenue / data.orderCount)
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Calculăm metrici
    const last3Months = historicalData.slice(-3);
    const last6Months = historicalData.slice(-6);
    const last12Months = historicalData.slice(-12);

    const avgRevenueL3M = last3Months.reduce((s, m) => s + m.revenue, 0) / last3Months.length;
    const avgRevenueL6M = last6Months.reduce((s, m) => s + m.revenue, 0) / last6Months.length;

    // Trend: creștere sau scădere?
    const recentTrend = last3Months.length >= 2 
      ? (last3Months[last3Months.length - 1].revenue - last3Months[0].revenue) / last3Months[0].revenue * 100
      : 0;

    // Predicție simplă pentru următoarele 3 luni
    const growthRate = recentTrend / 100 / 3; // pe lună
    const predictions: any[] = [];
    const now = new Date();

    for (let i = 1; i <= 6; i++) {
      const futureMonth = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const monthKey = futureMonth.toISOString().slice(0, 7);
      
      // Predicție cu 3 scenarii
      const baseRevenue = avgRevenueL3M * Math.pow(1 + growthRate, i);
      
      predictions.push({
        month: monthKey,
        pessimistic: Math.round(baseRevenue * 0.8),
        realistic: Math.round(baseRevenue),
        optimistic: Math.round(baseRevenue * 1.2),
        confidence: Math.max(30, 90 - i * 10) // scade cu cât e mai departe
      });
    }

    // Sezonalitate (dacă avem date suficiente)
    const seasonality: Record<string, number> = {};
    if (historicalData.length >= 12) {
      historicalData.forEach(m => {
        const monthNum = m.month.slice(5, 7);
        if (!seasonality[monthNum]) seasonality[monthNum] = 0;
        seasonality[monthNum] += m.revenue;
      });
      // Normalizăm
      const avgSeason = Object.values(seasonality).reduce((a, b) => a + b, 0) / 12;
      Object.keys(seasonality).forEach(k => {
        seasonality[k] = Math.round((seasonality[k] / avgSeason - 1) * 100);
      });
    }

    // KPIs
    const currentMonth = now.toISOString().slice(0, 7);
    const currentMonthData = monthlyRevenue.get(currentMonth);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 7);
    const lastMonthData = monthlyRevenue.get(lastMonth);

    const stats = {
      currentMonthRevenue: currentMonthData?.revenue || 0,
      lastMonthRevenue: lastMonthData?.revenue || 0,
      monthOverMonth: lastMonthData 
        ? Math.round(((currentMonthData?.revenue || 0) / lastMonthData.revenue - 1) * 100) 
        : 0,
      avgRevenueL3M: Math.round(avgRevenueL3M),
      avgRevenueL6M: Math.round(avgRevenueL6M),
      totalRevenueYTD: last12Months.reduce((s, m) => s + m.revenue, 0),
      projectedAnnual: Math.round(avgRevenueL3M * 12),
      trend: recentTrend > 5 ? "GROWING" : recentTrend < -5 ? "DECLINING" : "STABLE",
      trendPercent: Math.round(recentTrend)
    };

    return NextResponse.json({
      historical: historicalData.slice(-12),
      predictions,
      seasonality,
      stats
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { historical, predictions, stats } = await req.json();

    const prompt = `Analizează aceste date financiare și generează insights strategice:

DATE ISTORICE (ultimele luni):
${(historical || []).slice(-6).map((h: any) => `${h.month}: ${h.revenue} RON (${h.orderCount} comenzi)`).join("\n")}

PREDICȚII:
${(predictions || []).map((p: any) => `${p.month}: ${p.pessimistic}-${p.optimistic} RON (încredere: ${p.confidence}%)`).join("\n")}

KPIs:
- Venit luna curentă: ${stats?.currentMonthRevenue} RON
- Creștere MoM: ${stats?.monthOverMonth}%
- Trend: ${stats?.trend} (${stats?.trendPercent}%)
- Proiecție anuală: ${stats?.projectedAnnual} RON

Răspunde STRICT în JSON:
{
  "executiveSummary": "...",
  "keyInsights": ["..."],
  "growthDrivers": ["..."],
  "risks": ["..."],
  "recommendations": [
    { "action": "...", "impact": "...", "timeline": "...", "priority": "HIGH|MEDIUM|LOW" }
  ],
  "targets": {
    "nextMonth": { "target": 0, "stretch": 0 },
    "quarter": { "target": 0, "stretch": 0 },
    "year": { "target": 0, "stretch": 0 }
  },
  "scenarioAnalysis": {
    "bestCase": { "description": "...", "revenue": 0 },
    "worstCase": { "description": "...", "revenue": 0 }
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
