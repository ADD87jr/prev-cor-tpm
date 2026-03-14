import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminAuthMiddleware } from "@/lib/auth-middleware";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

// POST — analizează prețurile vs competiție
export async function POST(req: NextRequest) {
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;

  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: "Cheia Gemini API nu este configurată" }, { status: 400 });
  }

  try {
    const { productIds } = await req.json();

    // Obțin produsele selectate
    const products = await prisma.product.findMany({
      where: productIds?.length ? { id: { in: productIds } } : {},
      select: {
        id: true,
        name: true,
        price: true,
        listPrice: true,
        purchasePrice: true,
        manufacturer: true,
        brand: true,
        sku: true,
        type: true
      },
      take: 20 // Limităm la 20 produse
    });

    const prompt = `Ești analist de piață specializat în automatizări industriale în România.

PRODUSELE NOASTRE (PREV-COR TPM):
${products.map(p => `- ${p.name} | SKU: ${p.sku || "N/A"} | Preț nostru: ${p.price} RON | Producător: ${p.manufacturer || p.brand || "N/A"}`).join("\n")}

COMPETITORI PRINCIPALI în România:
- TME (tme.eu/ro) - distribuitor componente electronice
- Automation24.ro - automatizări industriale
- Farnell.com - distribuitor global
- RS Components (ro.rsdelivers.com)
- Elfa Distrelec
- Mouser Electronics

ANALIZEAZĂ și estimează pentru FIECARE produs:
1. Prețul mediu estimat la competitori (în RON)
2. Poziționarea noastră: sub piață / la piață / peste piață
3. Recomandare: păstrează preț / scade preț / crește preț
4. Motivație scurtă

Răspunde STRICT în format JSON:
{
  "analysis": [
    {
      "productId": 1,
      "productName": "Nume produs",
      "ourPrice": 100,
      "estimatedMarketPrice": 95,
      "competitorPrices": {
        "TME": 90,
        "Automation24": 95,
        "RS": 105
      },
      "positioning": "peste_piata|la_piata|sub_piata",
      "recommendation": "pastreaza|scade|creste",
      "suggestedPrice": 95,
      "reason": "Motivație scurtă"
    }
  ],
  "summary": {
    "underpriced": 2,
    "competitive": 5,
    "overpriced": 3,
    "potentialRevenue": 1234,
    "recommendation": "Recomandare generală"
  }
}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 3000, temperature: 0.5 },
        }),
      }
    );

    if (!response.ok) {
      console.error("[AI-PRICE] Gemini error:", response.status);
      return NextResponse.json({ error: "Eroare Gemini API" }, { status: 500 });
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const cleaned = rawText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    try {
      const result = JSON.parse(cleaned);
      return NextResponse.json({ 
        analysis: result,
        products: products.length
      });
    } catch {
      return NextResponse.json({ 
        error: "Eroare parsare răspuns AI",
        raw: rawText.slice(0, 500)
      }, { status: 500 });
    }
  } catch (error) {
    console.error("[AI-PRICE] Error:", error);
    return NextResponse.json({ error: "Eroare server" }, { status: 500 });
  }
}

// GET — listează produsele pentru analiză
export async function GET(req: NextRequest) {
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;

  try {
    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        price: true,
        listPrice: true,
        purchasePrice: true,
        manufacturer: true,
        sku: true,
        type: true
      },
      orderBy: { id: "asc" }
    });

    // Calculăm marja pentru fiecare produs
    const withMargin = products.map(p => ({
      ...p,
      margin: p.purchasePrice ? Math.round((p.price - p.purchasePrice) / p.price * 100) : null
    }));

    return NextResponse.json({ products: withMargin });
  } catch (error) {
    console.error("[AI-PRICE] GET Error:", error);
    return NextResponse.json({ error: "Eroare server" }, { status: 500 });
  }
}
