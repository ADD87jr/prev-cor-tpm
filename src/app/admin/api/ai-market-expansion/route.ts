import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const GEMINI_API_KEY = "AIzaSyDPMtQTjaruCtql9qAFqcavAzKwXRdjsnA";

export async function GET() {
  try {
    // Analizăm datele existente pentru a identifica oportunități de expansiune
    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        type: true,
        domain: true,
        price: true
      }
    });

    const orders = await prisma.order.findMany({
      select: {
        clientData: true,
        total: true,
        items: true
      },
      where: {
        status: { in: ["DELIVERED", "COMPLETED", "SHIPPED"] }
      }
    });

    // Analizăm distribuția geografică
    const regionDistribution = new Map<string, number>();
    const industryDistribution = new Map<string, number>();
    
    orders.forEach(order => {
      const clientData = order.clientData as any;
      const address = clientData?.address || clientData?.adresa || "";
      const company = clientData?.company || clientData?.firma || "";
      
      // Extragem regiunea
      const regions = ["București", "Cluj", "Timiș", "Iași", "Constanța", "Brașov", "Sibiu", "Bihor"];
      regions.forEach(region => {
        if (address.toLowerCase().includes(region.toLowerCase())) {
          regionDistribution.set(region, (regionDistribution.get(region) || 0) + order.total);
        }
      });

      // Detectăm industria din numele companiei
      const industries = ["Construct", "Auto", "Agri", "Food", "Pharma", "Energy", "IT", "Metal", "Plastic"];
      industries.forEach(ind => {
        if (company.toLowerCase().includes(ind.toLowerCase())) {
          industryDistribution.set(ind, (industryDistribution.get(ind) || 0) + 1);
        }
      });
    });

    // Analizăm categoriile de produse
    const categoryPerformance = new Map<string, { revenue: number; orders: number }>();
    orders.forEach(order => {
      const items = (order.items as any[]) || [];
      items.forEach(item => {
        const category = item.category || "Uncategorized";
        if (!categoryPerformance.has(category)) {
          categoryPerformance.set(category, { revenue: 0, orders: 0 });
        }
        const perf = categoryPerformance.get(category)!;
        perf.revenue += (item.price || 0) * (item.quantity || 1);
        perf.orders++;
      });
    });

    // Identificăm oportunități
    const opportunities = [
      {
        type: "GEOGRAPHIC",
        title: "Expansiune Regională",
        description: "Regiuni cu potențial de creștere",
        potential: "HIGH",
        underservedRegions: ["Iași", "Craiova", "Galați", "Oradea"].filter(
          r => !regionDistribution.has(r) || (regionDistribution.get(r) || 0) < 10000
        )
      },
      {
        type: "VERTICAL",
        title: "Industrii Noi",
        description: "Sectoare industriale neexplorate",
        potential: "MEDIUM",
        targetIndustries: ["Pharma", "Food & Beverage", "Renewable Energy"].filter(
          i => !industryDistribution.has(i.split(" ")[0])
        )
      },
      {
        type: "CATEGORY",
        title: "Categorii de Produse",
        description: "Categorii cu potențial de extindere",
        potential: "MEDIUM",
        suggestedCategories: ["IoT Industrial", "Robotică", "Echipamente eco-friendly"]
      },
      {
        type: "SERVICE",
        title: "Servicii Adiționale",
        description: "Oportunități de servicii noi",
        potential: "HIGH",
        services: ["Instalare", "Mentenanță", "Training", "Consultanță"]
      }
    ];

    const stats = {
      totalRevenue: orders.reduce((sum, o) => sum + o.total, 0),
      totalCustomers: new Set(orders.map(o => (o.clientData as any)?.email)).size,
      activeRegions: regionDistribution.size,
      productCategories: categoryPerformance.size,
      topRegions: Array.from(regionDistribution.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([region, revenue]) => ({ region, revenue: Math.round(revenue) })),
      topCategories: Array.from(categoryPerformance.entries())
        .sort((a, b) => b[1].revenue - a[1].revenue)
        .slice(0, 5)
        .map(([category, data]) => ({ category, ...data }))
    };

    return NextResponse.json({
      opportunities,
      currentMarket: {
        regionDistribution: Object.fromEntries(regionDistribution),
        industryDistribution: Object.fromEntries(industryDistribution),
        categoryPerformance: Object.fromEntries(categoryPerformance)
      },
      stats
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { currentMarket, targetArea } = await req.json();

    const prompt = `Analizează piața curentă a unui business B2B de echipamente industriale și generează strategie de expansiune:

PIAȚA CURENTĂ:
- Regiuni active: ${Object.keys(currentMarket?.regionDistribution || {}).join(", ")}
- Industrii servite: ${Object.keys(currentMarket?.industryDistribution || {}).join(", ")}
- Categorii principale: ${Object.keys(currentMarket?.categoryPerformance || {}).slice(0, 5).join(", ")}

ZONĂ ȚINTĂ DE EXPANSIUNE: ${targetArea || "România - regiuni neacoperite"}

Răspunde STRICT în JSON:
{
  "expansionStrategy": {
    "summary": "...",
    "approach": "AGGRESSIVE|GRADUAL|SELECTIVE",
    "timeline": "..."
  },
  "targetMarkets": [
    {
      "market": "...",
      "type": "GEOGRAPHIC|VERTICAL|PRODUCT",
      "potential": "HIGH|MEDIUM|LOW",
      "entryStrategy": "...",
      "estimatedRevenue": "...",
      "requiredInvestment": "...",
      "keyActions": ["..."]
    }
  ],
  "competitorAnalysis": {
    "mainCompetitors": ["..."],
    "ourAdvantages": ["..."],
    "gaps": ["..."]
  },
  "productStrategy": {
    "newProductsNeeded": ["..."],
    "bundleOpportunities": ["..."],
    "pricingStrategy": "..."
  },
  "partnershipOpportunities": ["..."],
  "riskAssessment": {
    "risks": ["..."],
    "mitigations": ["..."]
  },
  "kpis": ["..."],
  "budgetAllocation": {
    "marketing": "...",
    "sales": "...",
    "inventory": "...",
    "operations": "..."
  }
}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 2500 }
        })
      }
    );

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const strategy = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    return NextResponse.json({ strategy });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
