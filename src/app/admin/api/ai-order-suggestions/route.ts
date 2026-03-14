import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminAuthMiddleware } from "@/lib/auth-middleware";

const db = prisma as any;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

export async function POST(req: NextRequest) {
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;

  try {
    // 1. Colectez datele din baza de date în paralel
    const [products, orders, suppliers, supplierProducts] = await Promise.all([
      prisma.product.findMany({
        select: {
          id: true, name: true, price: true, purchasePrice: true, listPrice: true,
          stock: true, domain: true, type: true, brand: true, manufacturer: true,
          onDemand: true, sku: true,
        },
      }),
      db.order.findMany({
        where: { status: { not: "cancelled" } },
        select: { id: true, date: true, total: true, items: true, status: true },
        orderBy: { date: "desc" },
        take: 200,
      }),
      db.supplier.findMany({
        where: { active: true },
        select: { id: true, name: true, website: true, notes: true, rating: true },
      }),
      db.supplierProduct.findMany({
        include: { supplier: { select: { id: true, name: true } } },
      }),
    ]);

    // 2. Analizez stocul (inclusiv produse onDemand)
    const allProducts = products;
    const outOfStock = allProducts.filter((p: any) => p.stock === 0);
    const lowStock = allProducts.filter((p: any) => p.stock > 0 && p.stock <= 3);
    const goodStock = allProducts.filter((p: any) => p.stock > 3);

    // 3. Analizez vânzările — ce produse se vând cel mai bine
    const salesCount: Record<number, { name: string; count: number; revenue: number }> = {};
    for (const order of orders) {
      const items = Array.isArray(order.items) ? order.items : [];
      for (const item of items) {
        const pid = item.productId || item.id;
        if (!pid) continue;
        if (!salesCount[pid]) {
          salesCount[pid] = { name: item.name || `#${pid}`, count: 0, revenue: 0 };
        }
        salesCount[pid].count += item.quantity || 1;
        salesCount[pid].revenue += (item.price || 0) * (item.quantity || 1);
      }
    }
    const topSelling = Object.entries(salesCount)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 15)
      .map(([id, data]) => {
        const prod = products.find((p: any) => p.id === parseInt(id));
        return {
          id: parseInt(id),
          name: data.name,
          soldCount: data.count,
          revenue: Math.round(data.revenue),
          currentStock: prod?.stock ?? "?",
          purchasePrice: prod?.purchasePrice || null,
        };
      });

    // 4. Produse fără stoc care s-au vândut bine = urgente
    const urgentRestock = topSelling.filter(
      (p) => typeof p.currentStock === "number" && p.currentStock <= 2
    );

    // 5. Domenii/categorii cu cele mai multe vânzări
    const domainSales: Record<string, number> = {};
    for (const order of orders) {
      const items = Array.isArray(order.items) ? order.items : [];
      for (const item of items) {
        const prod = products.find((p: any) => p.id === (item.productId || item.id));
        if (prod) {
          domainSales[prod.domain] = (domainSales[prod.domain] || 0) + (item.quantity || 1);
        }
      }
    }
    const topDomains = Object.entries(domainSales)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // 6. Furnizori cu produse linkate
    const supplierMap: Record<number, { name: string; productCount: number; avgPrice: number }> = {};
    for (const sp of supplierProducts) {
      const sid = sp.supplier?.id;
      if (!sid) continue;
      if (!supplierMap[sid]) {
        supplierMap[sid] = { name: sp.supplier.name, productCount: 0, avgPrice: 0 };
      }
      supplierMap[sid].productCount++;
      supplierMap[sid].avgPrice += sp.supplierPrice || 0;
    }
    for (const s of Object.values(supplierMap)) {
      if (s.productCount > 0) s.avgPrice = Math.round(s.avgPrice / s.productCount);
    }

    // 7. Statistici generale
    const stats = {
      totalProducts: products.length,
      physicalProducts: allProducts.length,
      outOfStock: outOfStock.length,
      lowStock: lowStock.length,
      totalOrders: orders.length,
      totalRevenue: Math.round(orders.reduce((s: number, o: any) => s + (o.total || 0), 0)),
      activeSuppliers: suppliers.length,
      linkedProducts: supplierProducts.length,
    };

    // 8. Cer sugestii de la Gemini
    const analysis = {
      companyProfile: "PREV-COR TPM S.R.L. — firmă din România, vinde echipamente de automatizare industrială (senzori, PLC-uri, conectori, alimentatoare, componente industriale)",
      stats,
      topSellingProducts: topSelling,
      urgentRestock,
      outOfStockProducts: outOfStock.slice(0, 20).map((p: any) => ({ name: p.name, domain: p.domain, type: p.type })),
      lowStockProducts: lowStock.slice(0, 20).map((p: any) => ({ name: p.name, stock: p.stock, domain: p.domain })),
      topDomains,
      suppliers: suppliers.map((s: any) => ({ name: s.name, rating: s.rating })),
    };

    let aiRecommendations: any = null;

    if (GEMINI_API_KEY) {
      aiRecommendations = await getAIRecommendations(analysis);
    }

    // Fallback local dacă AI nu e disponibil
    if (!aiRecommendations) {
      aiRecommendations = generateLocalRecommendations(analysis);
    }

    return NextResponse.json({
      stats,
      topSelling,
      urgentRestock,
      topDomains,
      suppliers: Object.values(supplierMap),
      recommendations: aiRecommendations,
    });
  } catch (error) {
    console.error("[AI-ORDER-SUGGESTIONS] Error:", error);
    return NextResponse.json({ error: "Eroare server" }, { status: 500 });
  }
}

async function getAIRecommendations(analysis: any): Promise<any | null> {
  try {
    const prompt = `Ești consultant expert în achiziții pentru firma PREV-COR TPM S.R.L. din România, care vinde echipamente de automatizare industrială.

DATELE FIRMEI:
- Total produse: ${analysis.stats.totalProducts} (fizice: ${analysis.stats.physicalProducts})
- Fără stoc: ${analysis.stats.outOfStock} produse
- Stoc mic (1-3): ${analysis.stats.lowStock} produse
- Total comenzi procesate: ${analysis.stats.totalOrders}
- Venituri totale: ${analysis.stats.totalRevenue} RON
- Furnizori activi: ${analysis.stats.activeSuppliers}

TOP PRODUSE VÂNDUTE:
${analysis.topSellingProducts.map((p: any) => `- ${p.name}: ${p.soldCount} vândute, ${p.revenue} RON venituri, stoc actual: ${p.currentStock}`).join("\n")}

PRODUSE URGENTE (vândute bine dar stoc mic/0):
${analysis.urgentRestock.length > 0 ? analysis.urgentRestock.map((p: any) => `- ${p.name}: stoc ${p.currentStock}, vândute ${p.soldCount}`).join("\n") : "Niciunul momentan"}

FĂRĂ STOC:
${analysis.outOfStockProducts.slice(0, 10).map((p: any) => `- ${p.name} (${p.domain}/${p.type})`).join("\n")}

STOC MIC:
${analysis.lowStockProducts.slice(0, 10).map((p: any) => `- ${p.name}: stoc ${p.stock} (${p.domain})`).join("\n")}

TOP CATEGORII VÂNDUTE:
${analysis.topDomains.map(([d, c]: [string, number]) => `- ${d}: ${c} unități`).join("\n")}

FURNIZORI:
${analysis.suppliers.map((s: any) => `- ${s.name} (rating: ${s.rating}/10)`).join("\n")}

Generează un raport JSON cu recomandări de achiziții:
{
  "summary": "Rezumat în 2-3 propoziții",
  "urgentOrders": [
    {"product": "Nume produs", "reason": "De ce e urgent", "suggestedQty": 10, "priority": "CRITICĂ/MARE/MEDIE", "estimatedCost": "estimare cost RON"}
  ],
  "strategicOrders": [
    {"category": "Categorie", "products": "Ce produse", "reason": "De ce", "suggestedQty": 20, "priority": "MARE/MEDIE"}
  ],
  "newProductSuggestions": [
    {"product": "Produs nou de adăugat", "reason": "De ce ar merge bine", "category": "Categorie"}
  ],
  "costSavingTips": ["Sfat 1", "Sfat 2"],
  "seasonalAdvice": "Sfaturi sezoniere pentru luna curentă"
}

IMPORTANT: Răspunde DOAR cu JSON-ul, fără alte texte.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 3000, temperature: 0.4 },
        }),
      }
    );

    if (!response.ok) {
      console.error("[AI-ORDER-SUGGESTIONS] Gemini error:", response.status);
      return null;
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    const cleaned = rawText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    try {
      return JSON.parse(cleaned);
    } catch {
      const match = rawText.match(/\{[\s\S]*\}/);
      if (match) {
        try { return JSON.parse(match[0]); } catch { }
      }
      return { summary: cleaned, urgentOrders: [], strategicOrders: [], newProductSuggestions: [], costSavingTips: [], seasonalAdvice: "" };
    }
  } catch (error) {
    console.error("[AI-ORDER-SUGGESTIONS] AI error:", error);
    return null;
  }
}

function generateLocalRecommendations(analysis: any) {
  const urgent = analysis.urgentRestock.map((p: any) => ({
    product: p.name,
    reason: `Vândut ${p.soldCount}x dar stoc doar ${p.currentStock}`,
    suggestedQty: Math.max(10, p.soldCount * 2),
    priority: p.currentStock === 0 ? "CRITICĂ" : "MARE",
    estimatedCost: p.purchasePrice ? `~${p.purchasePrice * Math.max(10, p.soldCount * 2)} RON` : "N/A",
  }));

  const outOfStockOrders = analysis.outOfStockProducts.slice(0, 10).map((p: any) => ({
    product: p.name,
    reason: "Fără stoc — pierdere potențială de vânzări",
    suggestedQty: 5,
    priority: "MARE",
    estimatedCost: "N/A",
  }));

  const lowStockOrders = analysis.lowStockProducts.slice(0, 10).map((p: any) => ({
    product: p.name,
    reason: `Stoc doar ${p.stock} — risc de epuizare`,
    suggestedQty: 10,
    priority: "MEDIE",
    estimatedCost: "N/A",
  }));

  const topCat = analysis.topDomains[0];
  const strategic = topCat ? [{
    category: topCat[0],
    products: `Produse din domeniul ${topCat[0]}`,
    reason: `Cel mai vândut domeniu (${topCat[1]} unități) — merită diversificat stocul`,
    suggestedQty: 20,
    priority: "MARE",
  }] : [];

  return {
    summary: `Din ${analysis.stats.totalProducts} produse, ${analysis.stats.outOfStock} sunt fără stoc și ${analysis.stats.lowStock} au stoc mic. ${urgent.length > 0 ? `${urgent.length} produse sunt urgente (se vând bine dar stoc insuficient).` : "Nu sunt produse urgente momentan."} Recomand reaprovizionarea imediată.`,
    urgentOrders: [...urgent, ...outOfStockOrders.slice(0, 5)],
    strategicOrders: strategic,
    lowStockOrders,
    newProductSuggestions: [],
    costSavingTips: [
      "Negociază reduceri de volum cu furnizorii principali",
      "Compară prețurile între TME, RS Components și Automation24 înainte de comandă",
      "Comandă cantități mai mari pentru produsele cu vânzare constantă",
    ],
    seasonalAdvice: "Verifică stocul de senzori și componente de automatizare — cererea crește la început de an/trimestru când firmele fac investiții.",
    source: "local",
  };
}
