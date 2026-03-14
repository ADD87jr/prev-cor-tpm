import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyDPMtQTjaruCtql9qAFqcavAzKwXRdjsnA";

// GET - Analizează și sugerează ajustări de preț
export async function GET() {
  try {
    // Obține produse cu date relevante
    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        price: true,
        listPrice: true,
        purchasePrice: true,
        stock: true,
        type: true,
        manufacturer: true
      },
      where: {
        price: { gt: 0 }
      }
    });

    // Obține date vânzări din ultimele 90 zile
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const orders = await prisma.order.findMany({
      where: {
        date: { gte: ninetyDaysAgo },
        status: { not: "cancelled" }
      },
      select: { items: true }
    });

    // Calculează vânzări per produs
    const salesCount: Record<number, number> = {};
    
    for (const order of orders) {
      let items: any[] = [];
      try {
        items = typeof order.items === "string" ? JSON.parse(order.items) : order.items || [];
      } catch { continue; }

      for (const item of items) {
        const pid = item.productId || item.id;
        if (pid) {
          salesCount[pid] = (salesCount[pid] || 0) + (item.quantity || 1);
        }
      }
    }

    // Analiză și sugestii
    const suggestions: any[] = [];

    for (const product of products) {
      const sales = salesCount[product.id] || 0;
      const margin = product.purchasePrice 
        ? ((product.price - product.purchasePrice) / product.price) * 100 
        : null;

      // Produs cu stoc mare și vânzări mici - reducere
      if (product.stock && product.stock > 10 && sales < 2) {
        suggestions.push({
          productId: product.id,
          productName: product.name,
          currentPrice: product.price,
          stock: product.stock,
          sales90days: sales,
          margin: margin ? margin.toFixed(1) : null,
          suggestion: "reduce",
          reason: "Stoc ridicat, vânzări scăzute",
          suggestedDiscount: 10,
          suggestedPrice: Math.round(product.price * 0.9),
          priority: "medium"
        });
      }

      // Produs cu stoc mic și vânzări mari - creștere de preț
      if (product.stock && product.stock < 3 && sales > 5) {
        suggestions.push({
          productId: product.id,
          productName: product.name,
          currentPrice: product.price,
          stock: product.stock,
          sales90days: sales,
          margin: margin ? margin.toFixed(1) : null,
          suggestion: "increase",
          reason: "Stoc scăzut, cerere ridicată",
          suggestedIncrease: 5,
          suggestedPrice: Math.round(product.price * 1.05),
          priority: "high"
        });
      }

      // Marjă prea mică
      if (margin !== null && margin < 10) {
        suggestions.push({
          productId: product.id,
          productName: product.name,
          currentPrice: product.price,
          purchasePrice: product.purchasePrice,
          currentMargin: margin.toFixed(1) + "%",
          suggestion: "increase",
          reason: "Marjă de profit sub 10%",
          suggestedPrice: Math.round(product.purchasePrice! * 1.2),
          priority: "critical"
        });
      }
    }

    // Sortare după prioritate
    const priorityOrder = { critical: 0, high: 1, medium: 2 };
    suggestions.sort((a, b) => priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder]);

    return NextResponse.json({
      period: "90 zile",
      totalProducts: products.length,
      productsWithSales: Object.keys(salesCount).length,
      suggestionsCount: suggestions.length,
      suggestions: suggestions.slice(0, 30),
      stats: {
        reduceSuggestions: suggestions.filter(s => s.suggestion === "reduce").length,
        increaseSuggestions: suggestions.filter(s => s.suggestion === "increase").length,
        criticalPriority: suggestions.filter(s => s.priority === "critical").length
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Aplică ajustări de preț sau analizează cu AI
export async function POST(request: NextRequest) {
  try {
    const { action, productId, newPrice, analyzeCategory } = await request.json();

    if (action === "apply" && productId && newPrice) {
      // Aplică noul preț
      const product = await prisma.product.update({
        where: { id: productId },
        data: { price: newPrice },
        select: { id: true, name: true, price: true }
      });

      return NextResponse.json({
        success: true,
        message: "Preț actualizat",
        product
      });
    }

    if (action === "analyze-category" && analyzeCategory) {
      // Analiză AI pentru o categorie
      const products = await prisma.product.findMany({
        where: { type: analyzeCategory },
        select: {
          id: true,
          name: true,
          price: true,
          listPrice: true,
          purchasePrice: true,
          stock: true,
          manufacturer: true
        }
      });

      if (products.length === 0) {
        return NextResponse.json({ error: "Nicio produs în această categorie" }, { status: 404 });
      }

      const prompt = `Ești expert în pricing pentru automatizări industriale B2B.

CATEGORIE: ${analyzeCategory}
PRODUSE (${products.length} total):
${products.slice(0, 15).map(p => 
  `- ${p.name} | ${p.manufacturer || 'N/A'} | Preț: ${p.price} RON | ${p.listPrice ? `List: ${p.listPrice} RON` : ''} | ${p.purchasePrice ? `Cost: ${p.purchasePrice} RON` : ''} | Stoc: ${p.stock || 0}`
).join("\n")}

Analizează strategia de prețuri pentru această categorie:
1. Identifică produse cu prețuri neoptimizate
2. Sugerează ajustări concrete
3. Recomandă strategii de bundle/pachet

Returnează JSON:
{
  "categoryAnalysis": {
    "avgPrice": 1000,
    "avgMargin": "25%",
    "competitiveness": "bun/moderat/slab"
  },
  "recommendations": [
    {
      "productId": 1,
      "productName": "...",
      "currentPrice": 1000,
      "suggestedPrice": 1100,
      "reason": "motiv"
    }
  ],
  "bundleSuggestions": [
    {
      "name": "Nume pachet",
      "products": ["produs1", "produs2"],
      "bundlePrice": 1500,
      "savings": "10%"
    }
  ],
  "insights": ["insight 1", "insight 2"]
}`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 1500, temperature: 0.5 }
          })
        }
      );

      if (!response.ok) {
        return NextResponse.json({ error: "AI indisponibil" }, { status: 500 });
      }

      const data = await response.json();
      const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

      let result;
      try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          result = JSON.parse(jsonMatch[0]);
        }
      } catch {
        result = { error: "Nu s-a putut parsa răspunsul AI", rawResponse: responseText.substring(0, 500) };
      }

      return NextResponse.json({
        success: true,
        category: analyzeCategory,
        productsAnalyzed: products.length,
        ...result
      });
    }

    return NextResponse.json({ 
      error: "Acțiune necunoscută",
      validActions: ["apply (cu productId, newPrice)", "analyze-category (cu analyzeCategory)"]
    }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
