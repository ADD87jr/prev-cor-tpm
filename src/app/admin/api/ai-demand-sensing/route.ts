import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const GEMINI_API_KEY = "AIzaSyDPMtQTjaruCtql9qAFqcavAzKwXRdjsnA";

export async function GET() {
  try {
    // Obținem date pentru analiză
    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        type: true,
        domain: true,
        price: true,
        stock: true
      }
    });

    const recentOrders = await prisma.order.findMany({
      select: {
        items: true,
        date: true,
        total: true
      },
      where: {
        date: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      },
      orderBy: { date: "desc" }
    });

    // Calculăm tendințe per categorie
    const categoryTrends = new Map<string, {
      category: string;
      recentSales: number;
      previousSales: number;
      trend: number;
    }>();

    recentOrders.forEach(order => {
      const items = (order.items as any[]) || [];
      items.forEach(item => {
        const category = item.category || "Uncategorized";
        if (!categoryTrends.has(category)) {
          categoryTrends.set(category, {
            category,
            recentSales: 0,
            previousSales: 0,
            trend: 0
          });
        }
        const trend = categoryTrends.get(category)!;
        
        // Ultimele 15 zile vs anterioarele 15
        const daysAgo = (Date.now() - new Date(order.date).getTime()) / (1000 * 60 * 60 * 24);
        if (daysAgo <= 15) {
          trend.recentSales += item.quantity || 1;
        } else {
          trend.previousSales += item.quantity || 1;
        }
      });
    });

    // Calculăm trend-ul
    categoryTrends.forEach(trend => {
      if (trend.previousSales > 0) {
        trend.trend = Math.round(((trend.recentSales - trend.previousSales) / trend.previousSales) * 100);
      } else if (trend.recentSales > 0) {
        trend.trend = 100; // Nou
      }
    });

    // Generăm semnale de cerere
    const demandSignals: any[] = [];

    // Signal 1: Categorii în creștere rapidă
    Array.from(categoryTrends.values())
      .filter(t => t.trend > 30)
      .forEach(t => {
        demandSignals.push({
          type: "TRENDING_UP",
          category: t.category,
          signal: `Creștere ${t.trend}% în ultimele 2 săptămâni`,
          confidence: Math.min(95, 60 + t.recentSales),
          recommendation: "Crește stocul și promovează",
          impact: "HIGH"
        });
      });

    // Signal 2: Categorii în scădere
    Array.from(categoryTrends.values())
      .filter(t => t.trend < -20)
      .forEach(t => {
        demandSignals.push({
          type: "TRENDING_DOWN",
          category: t.category,
          signal: `Scădere ${Math.abs(t.trend)}% în ultimele 2 săptămâni`,
          confidence: Math.min(90, 50 + t.previousSales),
          recommendation: "Reducere stoc sau promoție",
          impact: "MEDIUM"
        });
      });

    // Signal 3: Sezonalitate bazată pe lună
    const currentMonth = new Date().getMonth();
    const seasonalSignals: Record<number, string[]> = {
      0: ["Echipamente de încălzire", "Sisteme HVAC"], // Ianuarie
      1: ["Echipamente de încălzire"],
      2: ["Echipamente agricole", "Pompe"],
      3: ["Echipamente agricole", "Sisteme irigare"],
      4: ["Climatizare", "Ventilație"],
      5: ["Climatizare", "Ventilație", "Echipamente outdoor"],
      6: ["Climatizare"],
      7: ["Echipamente outdoor"],
      8: ["Echipamente încălzire", "Automatizări industriale"],
      9: ["Sisteme încălzire", "Automatizări"],
      10: ["Echipamente de iarnă", "Încălzire"],
      11: ["Proiecte finalizare an", "Automatizări"]
    };

    (seasonalSignals[currentMonth] || []).forEach(cat => {
      demandSignals.push({
        type: "SEASONAL",
        category: cat,
        signal: `Sezon de vârf pentru această categorie`,
        confidence: 75,
        recommendation: "Prioritizează stocul și marketing",
        impact: "HIGH"
      });
    });

    // Signal 4: Evenimente externe (simulat)
    const externalSignals = [
      {
        type: "EXTERNAL_EVENT",
        category: "General",
        signal: "Fonduri europene pentru automatizare industrială - potențial cerere crescută",
        confidence: 60,
        recommendation: "Pregătește oferte pentru proiecte finanțate",
        impact: "HIGH"
      }
    ];
    demandSignals.push(...externalSignals);

    // Sortăm după impact
    demandSignals.sort((a, b) => {
      const impactOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      return impactOrder[a.impact as keyof typeof impactOrder] - impactOrder[b.impact as keyof typeof impactOrder];
    });

    const stats = {
      totalSignals: demandSignals.length,
      trendingUp: demandSignals.filter(s => s.type === "TRENDING_UP").length,
      trendingDown: demandSignals.filter(s => s.type === "TRENDING_DOWN").length,
      seasonal: demandSignals.filter(s => s.type === "SEASONAL").length,
      external: demandSignals.filter(s => s.type === "EXTERNAL_EVENT").length,
      categoriesAnalyzed: categoryTrends.size
    };

    return NextResponse.json({
      signals: demandSignals,
      categoryTrends: Array.from(categoryTrends.values()).sort((a, b) => b.trend - a.trend),
      stats
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { signals, context } = await req.json();

    const prompt = `Analizează aceste semnale de cerere de piață și generează predicții și recomandări:

SEMNALE DETECTATE:
${(signals || []).slice(0, 10).map((s: any) => 
  `- [${s.type}] ${s.category}: ${s.signal} (încredere: ${s.confidence}%)`
).join("\n")}

CONTEXT ADIȚIONAL: ${context || "Magazin B2B echipamente industriale România"}

Răspunde STRICT în JSON:
{
  "marketOutlook": {
    "summary": "...",
    "sentiment": "BULLISH|NEUTRAL|BEARISH",
    "confidence": 0
  },
  "demandForecast": [
    { "category": "...", "prediction": "...", "timeline": "...", "probability": 0 }
  ],
  "inventoryRecommendations": [
    { "category": "...", "action": "INCREASE|MAINTAIN|DECREASE", "quantity": "...", "reason": "..." }
  ],
  "marketingPriorities": ["..."],
  "riskFactors": ["..."],
  "opportunities": [
    { "opportunity": "...", "potential": "...", "actionRequired": "..." }
  ],
  "externalFactors": {
    "economicTrends": ["..."],
    "industryNews": ["..."],
    "regulatoryChanges": ["..."]
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
