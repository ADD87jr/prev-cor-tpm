import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const GEMINI_API_KEY = "AIzaSyDPMtQTjaruCtql9qAFqcavAzKwXRdjsnA";

// Simulăm date despre competitori (în producție, ar veni de la web scraping sau API)
interface CompetitorPrice {
  competitor: string;
  price: number;
  lastUpdated: Date;
  url?: string;
}

// În producție, aceste date ar veni de la un serviciu de monitorizare
const mockCompetitorData: Record<string, CompetitorPrice[]> = {};

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        price: true,
        domain: true,
        type: true,
        manufacturer: true
      }
    });

    // Simulăm date de competitori pentru demonstrație
    const competitors = ["TechStore.ro", "IndustrialPro.ro", "EquipmentWorld.ro", "B2BShop.ro"];
    
    const competitorAnalysis = products.slice(0, 30).map(product => {
      // Simulăm prețuri de la competitori (±15% variație)
      const competitorPrices = competitors.map(comp => ({
        competitor: comp,
        price: Math.round(product.price * (0.85 + Math.random() * 0.30)),
        lastUpdated: new Date(),
        difference: 0,
        differencePercent: 0
      }));

      // Calculăm diferențele
      competitorPrices.forEach(cp => {
        cp.difference = cp.price - product.price;
        cp.differencePercent = Math.round((cp.difference / product.price) * 100);
      });

      // Găsim prețul minim și maxim
      const prices = competitorPrices.map(cp => cp.price);
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const avgPrice = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);

      // Determinăm poziția noastră
      let position = "COMPETITIVE";
      if (product.price < minPrice) position = "CHEAPEST";
      else if (product.price > maxPrice) position = "MOST_EXPENSIVE";
      else if (product.price < avgPrice * 0.95) position = "BELOW_AVERAGE";
      else if (product.price > avgPrice * 1.05) position = "ABOVE_AVERAGE";

      // Alertă dacă suntem mult mai scumpi
      let alert = null;
      if (product.price > avgPrice * 1.15) {
        alert = {
          type: "OVERPRICED",
          severity: "HIGH",
          message: `Prețul nostru e cu ${Math.round((product.price / avgPrice - 1) * 100)}% peste medie`
        };
      } else if (product.price < avgPrice * 0.85) {
        alert = {
          type: "UNDERPRICED",
          severity: "MEDIUM",
          message: `Potențial de creștere preț - suntem cu ${Math.round((1 - product.price / avgPrice) * 100)}% sub medie`
        };
      }

      return {
        productId: product.id,
        productName: product.name,
        ourPrice: product.price,
        category: product.domain,
        manufacturer: product.manufacturer,
        competitorPrices,
        marketAnalysis: {
          minPrice,
          maxPrice,
          avgPrice,
          position
        },
        alert,
        recommendation: position === "MOST_EXPENSIVE" ? "Consideră reducere preț" :
                        position === "CHEAPEST" ? "Poți crește marja" : "Preț competitiv"
      };
    });

    // Alertele importante
    const alerts = competitorAnalysis
      .filter(p => p.alert)
      .sort((a, b) => (a.alert!.severity === "HIGH" ? 0 : 1) - (b.alert!.severity === "HIGH" ? 0 : 1));

    const stats = {
      totalTracked: competitorAnalysis.length,
      competitorsTracked: competitors.length,
      overpriced: competitorAnalysis.filter(p => p.marketAnalysis.position === "MOST_EXPENSIVE").length,
      underpriced: competitorAnalysis.filter(p => p.marketAnalysis.position === "CHEAPEST").length,
      competitive: competitorAnalysis.filter(p => p.marketAnalysis.position === "COMPETITIVE").length,
      alertsCount: alerts.length
    };

    return NextResponse.json({
      products: competitorAnalysis,
      alerts,
      competitors,
      stats,
      lastUpdated: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { products, competitorData } = await req.json();

    const prompt = `Analizează aceste date despre prețurile competitorilor și generează recomandări strategice:

PRODUSE CU ALERTE:
${(products || []).filter((p: any) => p.alert).slice(0, 10).map((p: any) => 
  `- ${p.productName}: Noi ${p.ourPrice} RON vs Medie ${p.marketAnalysis.avgPrice} RON (${p.marketAnalysis.position})`
).join("\n")}

COMPETITORI MONITORIZAȚI: ${(competitorData?.competitors || ["TechStore", "IndustrialPro"]).join(", ")}

Răspunde STRICT în JSON:
{
  "competitiveAnalysis": {
    "ourPosition": "LEADER|COMPETITIVE|FOLLOWER",
    "strengthAreas": ["..."],
    "weaknessAreas": ["..."]
  },
  "priceAdjustments": [
    { "product": "...", "currentPrice": 0, "suggestedPrice": 0, "reason": "...", "expectedImpact": "..." }
  ],
  "competitorInsights": [
    { "competitor": "...", "strategy": "...", "threat": "LOW|MEDIUM|HIGH" }
  ],
  "actionPlan": [
    { "priority": "HIGH|MEDIUM|LOW", "action": "...", "deadline": "..." }
  ],
  "pricingOpportunities": ["..."],
  "marketTrends": ["..."],
  "alertSummary": "..."
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
