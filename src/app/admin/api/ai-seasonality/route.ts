import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyDPMtQTjaruCtql9qAFqcavAzKwXRdjsnA";

// GET - Analiză sezonalitate vânzări
export async function GET() {
  try {
    // Obține toate comenzile cu date
    const orders = await prisma.order.findMany({
      where: { status: { not: "cancelled" } },
      select: { date: true, total: true, items: true },
      orderBy: { date: "asc" }
    });

    // Grupează pe luni
    const monthlyData: Record<string, { revenue: number; orders: number; products: Record<string, number> }> = {};
    
    for (const order of orders) {
      const month = new Date(order.date).toISOString().slice(0, 7);
      
      if (!monthlyData[month]) {
        monthlyData[month] = { revenue: 0, orders: 0, products: {} };
      }
      
      monthlyData[month].revenue += order.total;
      monthlyData[month].orders++;
      
      const items = typeof order.items === "string" ? JSON.parse(order.items) : order.items;
      if (Array.isArray(items)) {
        for (const item of items) {
          const productName = item.name || item.productName || "N/A";
          monthlyData[month].products[productName] = (monthlyData[month].products[productName] || 0) + (item.quantity || 1);
        }
      }
    }

    // Obține categoriile de produse
    const products = await prisma.product.findMany({
      select: { type: true, manufacturer: true }
    });

    const categories = [...new Set(products.map(p => p.type).filter(Boolean))];
    const manufacturers = [...new Set(products.map(p => p.manufacturer).filter(Boolean))];

    // Transformă în array sortat
    const monthlyStats = Object.entries(monthlyData)
      .map(([month, data]) => ({
        month,
        ...data,
        topProducts: Object.entries(data.products)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([name, qty]) => ({ name, quantity: qty }))
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Calculează media pe lună a anului
    const monthAverages: Record<number, { revenues: number[]; orders: number[] }> = {};
    for (const stat of monthlyStats) {
      const monthNum = parseInt(stat.month.split("-")[1]);
      if (!monthAverages[monthNum]) {
        monthAverages[monthNum] = { revenues: [], orders: [] };
      }
      monthAverages[monthNum].revenues.push(stat.revenue);
      monthAverages[monthNum].orders.push(stat.orders);
    }

    const seasonalPattern = Object.entries(monthAverages).map(([monthNum, data]) => ({
      month: parseInt(monthNum),
      monthName: ["", "Ian", "Feb", "Mar", "Apr", "Mai", "Iun", "Iul", "Aug", "Sep", "Oct", "Nov", "Dec"][parseInt(monthNum)],
      avgRevenue: data.revenues.reduce((a, b) => a + b, 0) / data.revenues.length,
      avgOrders: data.orders.reduce((a, b) => a + b, 0) / data.orders.length,
      samples: data.revenues.length
    })).sort((a, b) => a.month - b.month);

    // Generează analiză AI
    const prompt = `Ești analist de date pentru un magazin B2B de automatizări industriale.

DATE LUNARE:
${monthlyStats.slice(-12).map(m => `${m.month}: ${m.revenue.toFixed(0)} RON, ${m.orders} comenzi`).join("\n")}

PATTERN SEZONIER (medii pe lună):
${seasonalPattern.map(s => `${s.monthName}: ${s.avgRevenue.toFixed(0)} RON avg, ${s.avgOrders.toFixed(1)} comenzi avg`).join("\n")}

CATEGORII: ${categories.slice(0, 10).join(", ")}
PRODUCĂTORI: ${manufacturers.slice(0, 10).join(", ")}

Analizează și returnează JSON:
{
  "peakMonths": [{ "month": 1-12, "reason": "explicație" }],
  "lowMonths": [{ "month": 1-12, "reason": "explicație" }],
  "yearOverYearTrend": "creștere/scădere/stabil cu procent estimat",
  "seasonalFactors": [
    { "factor": "factor sezonier", "impact": "pozitiv/negativ", "months": [1,2,3], "explanation": "..." }
  ],
  "recommendations": [
    { "action": "ce să faci", "timing": "când", "expectedImpact": "impact așteptat" }
  ],
  "stockingAdvice": {
    "increaseStock": ["categorii produse pentru sezon de vârf"],
    "reduceStock": ["categorii de redus în sezonul slab"],
    "optimalTiming": "când să faci comenzile mari la furnizori"
  },
  "marketingCalendar": [
    { "month": 1-12, "campaign": "tip campanie", "focus": "pe ce să te concentrezi" }
  ],
  "nextQuarterForecast": {
    "expectedRevenue": "valoare estimată RON",
    "confidence": "ridicată/medie/scăzută",
    "risks": ["riscuri potențiale"]
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
      monthlyStats,
      seasonalPattern,
      categories,
      totalOrders: orders.length,
      totalRevenue: orders.reduce((sum, o) => sum + o.total, 0),
      aiAnalysis
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
