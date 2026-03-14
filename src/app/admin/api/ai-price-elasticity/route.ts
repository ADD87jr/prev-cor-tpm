import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const GEMINI_API_KEY = "AIzaSyDPMtQTjaruCtql9qAFqcavAzKwXRdjsnA";

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        price: true,
        type: true,
        domain: true
      }
    });

    // Obținem istoricul comenzilor pentru analiză
    const orders = await prisma.order.findMany({
      select: {
        items: true,
        date: true,
        total: true
      },
      where: {
        status: { in: ["DELIVERED", "COMPLETED", "SHIPPED"] }
      }
    });

    // Calculăm elasticitatea pentru fiecare produs
    const productSales = new Map<number, {
      prices: number[];
      quantities: number[];
      dates: Date[];
    }>();

    orders.forEach(order => {
      const items = (order.items as any[]) || [];
      items.forEach(item => {
        const productId = item.productId || item.id;
        const price = item.price || 0;
        const quantity = item.quantity || 1;

        if (!productSales.has(productId)) {
          productSales.set(productId, { prices: [], quantities: [], dates: [] });
        }
        const data = productSales.get(productId)!;
        data.prices.push(price);
        data.quantities.push(quantity);
        data.dates.push(order.date);
      });
    });

    // Calculăm elasticitatea pentru produsele cu suficiente date
    const elasticityAnalysis: any[] = [];

    productSales.forEach((data, productId) => {
      if (data.prices.length < 5) return; // minim 5 tranzacții

      const product = products.find(p => p.id === productId);
      if (!product) return;

      // Calculăm corelația preț-cantitate
      const avgPrice = data.prices.reduce((a, b) => a + b, 0) / data.prices.length;
      const avgQty = data.quantities.reduce((a, b) => a + b, 0) / data.quantities.length;
      
      // Covarianță și deviații standard
      let covariance = 0;
      let priceVariance = 0;
      let qtyVariance = 0;

      for (let i = 0; i < data.prices.length; i++) {
        const priceDiff = data.prices[i] - avgPrice;
        const qtyDiff = data.quantities[i] - avgQty;
        covariance += priceDiff * qtyDiff;
        priceVariance += priceDiff * priceDiff;
        qtyVariance += qtyDiff * qtyDiff;
      }

      const n = data.prices.length;
      covariance /= n;
      priceVariance /= n;
      qtyVariance /= n;

      // Elasticitate = (% schimbare cantitate) / (% schimbare preț)
      // Aproximare prin coeficient de corelație
      const correlation = Math.sqrt(priceVariance * qtyVariance) > 0 
        ? covariance / Math.sqrt(priceVariance * qtyVariance)
        : 0;

      // Interpretare elasticitate
      let elasticityType = "UNIT_ELASTIC";
      if (correlation < -0.5) elasticityType = "ELASTIC"; // Sensibil la preț
      else if (correlation > 0.3) elasticityType = "INELASTIC"; // Nu e sensibil la preț

      // Recomandare de preț
      let priceRecommendation = "MAINTAIN";
      let recommendedChange = 0;
      
      if (elasticityType === "INELASTIC") {
        priceRecommendation = "INCREASE";
        recommendedChange = 5; // +5%
      } else if (elasticityType === "ELASTIC" && product.price > avgPrice * 1.1) {
        priceRecommendation = "DECREASE";
        recommendedChange = -5; // -5%
      }

      elasticityAnalysis.push({
        productId: product.id,
        productName: product.name,
        type: product.type,
        currentPrice: product.price,
        avgSalePrice: Math.round(avgPrice),
        transactionCount: n,
        avgQuantityPerSale: Math.round(avgQty * 100) / 100,
        elasticityScore: Math.round(correlation * 100) / 100,
        elasticityType,
        priceRecommendation,
        recommendedChange,
        potentialRevenue: Math.round(
          product.price * (1 + recommendedChange / 100) * avgQty * 30 // lunar
        ),
        confidence: n >= 20 ? "HIGH" : n >= 10 ? "MEDIUM" : "LOW"
      });
    });

    // Sortăm după potențial de optimizare
    elasticityAnalysis.sort((a, b) => {
      if (a.priceRecommendation !== "MAINTAIN" && b.priceRecommendation === "MAINTAIN") return -1;
      if (a.priceRecommendation === "MAINTAIN" && b.priceRecommendation !== "MAINTAIN") return 1;
      return b.potentialRevenue - a.potentialRevenue;
    });

    const stats = {
      totalAnalyzed: elasticityAnalysis.length,
      elasticProducts: elasticityAnalysis.filter(p => p.elasticityType === "ELASTIC").length,
      inelasticProducts: elasticityAnalysis.filter(p => p.elasticityType === "INELASTIC").length,
      increaseRecommendations: elasticityAnalysis.filter(p => p.priceRecommendation === "INCREASE").length,
      decreaseRecommendations: elasticityAnalysis.filter(p => p.priceRecommendation === "DECREASE").length,
      potentialAdditionalRevenue: elasticityAnalysis
        .filter(p => p.priceRecommendation === "INCREASE")
        .reduce((sum, p) => sum + (p.currentPrice * 0.05 * p.avgQuantityPerSale * 30), 0)
    };

    return NextResponse.json({
      products: elasticityAnalysis.slice(0, 50),
      stats
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { products } = await req.json();

    const prompt = `Analizează aceste date de elasticitate de preț și generează o strategie de pricing:

PRODUSE CU CERERE INELASTICĂ (pot crește prețul):
${(products || []).filter((p: any) => p.elasticityType === "INELASTIC").slice(0, 5).map((p: any) => 
  `- ${p.productName}: ${p.currentPrice} RON (scor: ${p.elasticityScore})`
).join("\n")}

PRODUSE CU CERERE ELASTICĂ (sensibile la preț):
${(products || []).filter((p: any) => p.elasticityType === "ELASTIC").slice(0, 5).map((p: any) => 
  `- ${p.productName}: ${p.currentPrice} RON (scor: ${p.elasticityScore})`
).join("\n")}

Răspunde STRICT în JSON:
{
  "pricingStrategy": {
    "summary": "...",
    "approach": "PREMIUM|VALUE|COMPETITIVE|PENETRATION"
  },
  "priceIncreaseCandidates": [
    { "product": "...", "currentPrice": 0, "suggestedPrice": 0, "reasoning": "..." }
  ],
  "priceDecreaseCandidates": [
    { "product": "...", "currentPrice": 0, "suggestedPrice": 0, "reasoning": "..." }
  ],
  "bundleOpportunities": ["..."],
  "seasonalAdjustments": ["..."],
  "competitivePositioning": "...",
  "riskAssessment": {
    "risks": ["..."],
    "mitigations": ["..."]
  },
  "implementationPlan": [
    { "phase": 1, "action": "...", "timeline": "..." }
  ]
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
    const strategy = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    return NextResponse.json({ strategy });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
