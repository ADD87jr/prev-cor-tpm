import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyDPMtQTjaruCtql9qAFqcavAzKwXRdjsnA";

// GET - Status monitorizare competitori
export async function GET() {
  try {
    // Obține produsele cu preț
    const products = await prisma.product.findMany({
      where: { price: { gt: 0 } },
      take: 100,
      orderBy: { price: "desc" },
      select: {
        id: true,
        name: true,
        sku: true,
        price: true,
        listPrice: true,
        manufacturer: true,
        type: true
      }
    });

    // Simulăm date competitori (într-o implementare reală ar fi web scraping)
    const competitors = [
      { name: "AutomatizariPro.ro", priceModifier: 0.95 },
      { name: "IndustrialShop.ro", priceModifier: 1.05 },
      { name: "TechAutomation.ro", priceModifier: 0.98 },
      { name: "ControlSystems.ro", priceModifier: 1.02 }
    ];

    const competitorData = products.slice(0, 20).map(product => {
      const competitorPrices = competitors.map(comp => ({
        competitor: comp.name,
        price: Math.round(product.price * comp.priceModifier * (0.9 + Math.random() * 0.2)),
        inStock: Math.random() > 0.3,
        lastChecked: new Date(Date.now() - Math.random() * 86400000).toISOString()
      }));

      const minCompetitorPrice = Math.min(...competitorPrices.map(c => c.price));
      const avgCompetitorPrice = competitorPrices.reduce((sum, c) => sum + c.price, 0) / competitorPrices.length;

      return {
        product: {
          id: product.id,
          name: product.name,
          sku: product.sku,
          ourPrice: product.price,
          listPrice: product.listPrice
        },
        competitorPrices,
        analysis: {
          minPrice: minCompetitorPrice,
          avgPrice: Math.round(avgCompetitorPrice),
          ourPosition: product.price < minCompetitorPrice ? "cheapest" : 
                       product.price < avgCompetitorPrice ? "competitive" : "expensive",
          priceDiffPercent: Math.round((product.price / avgCompetitorPrice - 1) * 100)
        }
      };
    });

    // Statistici generale
    const stats = {
      cheapest: competitorData.filter(c => c.analysis.ourPosition === "cheapest").length,
      competitive: competitorData.filter(c => c.analysis.ourPosition === "competitive").length,
      expensive: competitorData.filter(c => c.analysis.ourPosition === "expensive").length,
      monitored: competitorData.length,
      competitors: competitors.length
    };

    return NextResponse.json({ competitorData, stats, competitors: competitors.map(c => c.name) });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Analiză detaliată produs vs competiție
export async function POST(req: NextRequest) {
  try {
    const { productId } = await req.json();

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        sku: true,
        price: true,
        listPrice: true,
        purchasePrice: true,
        manufacturer: true,
        type: true,
        description: true,
        stock: true,
        advantages: true,
        specs: true
      }
    });

    if (!product) {
      return NextResponse.json({ error: "Produs negăsit" }, { status: 404 });
    }

    // Simulăm date competitori detaliate
    const competitors = [
      { 
        name: "AutomatizariPro.ro", 
        price: Math.round(product.price * 0.95), 
        shipping: 25, 
        warranty: "2 ani",
        inStock: true,
        delivery: "3-5 zile",
        rating: 4.2
      },
      { 
        name: "IndustrialShop.ro", 
        price: Math.round(product.price * 1.05), 
        shipping: 0, 
        warranty: "2 ani",
        inStock: true,
        delivery: "1-2 zile",
        rating: 4.5
      },
      { 
        name: "TechAutomation.ro", 
        price: Math.round(product.price * 0.98), 
        shipping: 15, 
        warranty: "1 an",
        inStock: false,
        delivery: "7-10 zile",
        rating: 3.8
      },
      { 
        name: "ControlSystems.ro", 
        price: Math.round(product.price * 1.02), 
        shipping: 30, 
        warranty: "3 ani",
        inStock: true,
        delivery: "2-3 zile",
        rating: 4.0
      }
    ];

    const prompt = `Ești analist de piață pentru produse de automatizări industriale.

PRODUSUL NOSTRU:
- Nume: ${product.name}
- SKU: ${product.sku}
- Preț: ${product.price} RON
- Preț listă: ${product.listPrice || "N/A"} RON
- Producător: ${product.manufacturer}
- Stoc: ${product.stock} unități
- Avantaje: ${product.advantages || "N/A"}

PREȚURI COMPETITORI:
${competitors.map(c => `- ${c.name}: ${c.price} RON + ${c.shipping} RON shipping, ${c.delivery}, garanție ${c.warranty}, rating ${c.rating}/5, ${c.inStock ? "în stoc" : "indisponibil"}`).join("\n")}

ANALIZA COSTULUI TOTAL:
${competitors.map(c => `- ${c.name}: ${c.price + c.shipping} RON total`).join("\n")}
- NOI: ${product.price} RON (transport calculat la comandă)

Analizează și returnează JSON:
{
  "marketPosition": "unde ne plasăm (lider preț/valoare bună/premium/scump)",
  "competitiveAdvantages": ["avantaj nostru 1", "avantaj 2"],
  "competitiveDisadvantages": ["dezavantaj nostru 1"],
  "pricingRecommendation": {
    "action": "păstrează/reduce/crește",
    "suggestedPrice": 0,
    "reasoning": "explicație"
  },
  "threatAnalysis": [
    { "competitor": "nume", "threatLevel": "ridicat/mediu/scăzut", "reason": "de ce" }
  ],
  "differentiation": {
    "howToStandOut": "cum să ne diferențiem",
    "valueProposition": "propunere de valoare unică"
  },
  "actionItems": [
    { "priority": "urgent/important/nice-to-have", "action": "ce să facem" }
  ]
}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 1200, temperature: 0.7 }
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
      product,
      competitors,
      aiAnalysis,
      summary: {
        ourPrice: product.price,
        minCompetitorPrice: Math.min(...competitors.map(c => c.price)),
        avgCompetitorPrice: Math.round(competitors.reduce((sum, c) => sum + c.price, 0) / competitors.length),
        minTotalPrice: Math.min(...competitors.map(c => c.price + c.shipping)),
        competitorsInStock: competitors.filter(c => c.inStock).length
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
