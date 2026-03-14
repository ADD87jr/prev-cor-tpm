import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyDPMtQTjaruCtql9qAFqcavAzKwXRdjsnA";

// GET - Listează review-uri pentru analiză
export async function GET() {
  try {
    const reviews = await prisma.review.findMany({
      select: {
        id: true,
        productId: true,
        userName: true,
        rating: true,
        text: true,
        createdAt: true,
        approved: true
      },
      orderBy: { createdAt: "desc" },
      take: 100
    });

    // Obține nume produse
    const productIds = [...new Set(reviews.map(r => r.productId))];
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, type: true }
    });
    const productMap = new Map(products.map(p => [p.id, p]));

    // Statistici
    const avgRating = reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;
    
    const ratingDist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach(r => ratingDist[r.rating as keyof typeof ratingDist]++);

    return NextResponse.json({
      reviews: reviews.map(r => {
        const product = productMap.get(r.productId);
        return {
          id: r.id,
          productId: r.productId,
          productName: product?.name || "N/A",
          productType: product?.type || "",
          reviewer: r.userName,
          rating: r.rating,
          comment: r.text,
          date: r.createdAt,
          approved: r.approved
        };
      }),
      stats: {
        total: reviews.length,
        avgRating: avgRating.toFixed(1),
        distribution: ratingDist,
        pending: reviews.filter(r => !r.approved).length
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Analizează review-uri cu AI
export async function POST(req: NextRequest) {
  try {
    const { productId, analyzeAll } = await req.json();

    let reviews;
    if (productId) {
      reviews = await prisma.review.findMany({
        where: { productId },
        select: { rating: true, text: true, userName: true, productId: true }
      });
    } else if (analyzeAll) {
      reviews = await prisma.review.findMany({
        select: { rating: true, text: true, userName: true, productId: true },
        take: 50
      });
    }

    // Obține numele produselor pentru prompt
    const prodIds = [...new Set((reviews || []).map((r: any) => r.productId))];
    const prods = await prisma.product.findMany({
      where: { id: { in: prodIds } },
      select: { id: true, name: true }
    });
    const prodMap = new Map(prods.map(p => [p.id, p.name]));
    
    if (!reviews) {
      return NextResponse.json({ error: "Specifică productId sau analyzeAll" }, { status: 400 });
    }

    if (reviews.length === 0) {
      return NextResponse.json({ error: "Nu există review-uri de analizat" }, { status: 404 });
    }

    const prompt = `Ești analist de sentiment și feedback pentru un magazin B2B de automatizări industriale.

REVIEW-URI DE ANALIZAT (${reviews.length}):
${reviews.map((r: any, i: number) => `
Review ${i + 1}:
- Rating: ${r.rating}/5
- Comentariu: "${r.text || 'Fără comentariu'}"
- Produs: ${prodMap.get(r.productId) || 'N/A'}
`).join("\n")}

Analizează feedback-ul și extrage insight-uri acționabile.

Returnează JSON:
{
  "overallSentiment": "positive/neutral/negative",
  "sentimentScore": 78,
  "keyThemes": [
    { "theme": "calitate produs", "mentions": 5, "sentiment": "positive" },
    { "theme": "timp livrare", "mentions": 3, "sentiment": "negative" }
  ],
  "positiveHighlights": ["aspect pozitiv 1", "aspect 2"],
  "issuesIdentified": ["problemă 1", "problemă 2"],
  "productInsights": ["insight despre produse"],
  "serviceInsights": ["insight despre servicii"],
  "actionableRecommendations": [
    { "priority": "high", "action": "acțiune recomandată", "impact": "impact așteptat" }
  ],
  "competitiveAdvantages": ["avantaj competitiv identificat"],
  "improvementAreas": ["zonă de îmbunătățit"]
}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.5, maxOutputTokens: 2000 }
        })
      }
    );

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    let analysis;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch {
      analysis = {
        overallSentiment: "neutral",
        sentimentScore: 50,
        keyThemes: [],
        positiveHighlights: [],
        issuesIdentified: [],
        actionableRecommendations: [{ action: text }]
      };
    }

    return NextResponse.json({
      reviewsAnalyzed: reviews.length,
      ...analysis
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
