import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyDPMtQTjaruCtql9qAFqcavAzKwXRdjsnA";

// GET - Detectare anomalii în date
export async function GET() {
  try {
    const anomalies: any[] = [];
    const now = new Date();

    // 1. Anomalii în vânzări - comenzi cu valoare neobișnuită
    const orders = await prisma.order.findMany({
      where: {
        status: { in: ["completed", "shipped", "processing", "pending"] }
      },
      orderBy: { date: "desc" },
      take: 500,
      select: {
        id: true,
        number: true,
        date: true,
        total: true,
        items: true,
        clientData: true
      }
    });

    // Calculează media și deviația standard
    const totals = orders.map(o => o.total || 0).filter(t => t > 0);
    const avgOrder = totals.length > 0 ? totals.reduce((a, b) => a + b, 0) / totals.length : 0;
    const variance = totals.length > 0 ? totals.reduce((sum, t) => sum + Math.pow(t - avgOrder, 2), 0) / totals.length : 0;
    const stdDev = Math.sqrt(variance);

    // Comenzi cu valoare > 3x deviația standard
    for (const order of orders.slice(0, 100)) {
      if (order.total && order.total > avgOrder + 3 * stdDev) {
        const clientData = order.clientData as any;
        anomalies.push({
          id: `order-high-${order.id}`,
          type: "ORDER_UNUSUALLY_HIGH",
          severity: "HIGH",
          title: `Comandă cu valoare neobișnuit de mare`,
          description: `Comanda #${order.number} are ${order.total.toLocaleString()} RON (media: ${Math.round(avgOrder).toLocaleString()} RON)`,
          data: { orderId: order.id, orderNumber: order.number, total: order.total, average: avgOrder },
          detectedAt: new Date().toISOString(),
          recommendation: "Verifică comanda pentru posibilă fraudă sau eroare"
        });
      }
    }

    // 2. Anomalii în stoc - produse cu stoc negativ sau foarte mare
    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        sku: true,
        stock: true,
        price: true
      }
    });

    for (const product of products) {
      if (product.stock !== null && product.stock < 0) {
        anomalies.push({
          id: `stock-negative-${product.id}`,
          type: "NEGATIVE_STOCK",
          severity: "CRITICAL",
          title: `Stoc negativ detectat`,
          description: `${product.name} are stoc ${product.stock} (imposibil)`,
          data: { productId: product.id, sku: product.sku, stock: product.stock },
          detectedAt: new Date().toISOString(),
          recommendation: "Corectează imediat stocul - posibilă eroare de sincronizare"
        });
      }
    }

    // 3. Anomalii în prețuri - produse cu preț 0 sau foarte mic
    for (const product of products) {
      if (product.price !== null && product.price <= 0) {
        anomalies.push({
          id: `price-zero-${product.id}`,
          type: "ZERO_PRICE",
          severity: "HIGH",
          title: `Produs cu preț 0 sau negativ`,
          description: `${product.name} are preț ${product.price} RON`,
          data: { productId: product.id, sku: product.sku, price: product.price },
          detectedAt: new Date().toISOString(),
          recommendation: "Setează un preț valid pentru produs"
        });
      }
    }

    // 4. Anomalii în activitate - zile fără comenzi (dacă e ciudat)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentOrders = orders.filter(o => new Date(o.date) >= thirtyDaysAgo);
    const ordersByDay: Record<string, number> = {};

    for (let i = 0; i < 30; i++) {
      const day = new Date();
      day.setDate(day.getDate() - i);
      const dayStr = day.toISOString().split("T")[0];
      ordersByDay[dayStr] = 0;
    }

    for (const order of recentOrders) {
      const dayStr = new Date(order.date).toISOString().split("T")[0];
      if (ordersByDay[dayStr] !== undefined) {
        ordersByDay[dayStr]++;
      }
    }

    // Zile cu 0 comenzi în zile lucrătoare
    const daysWithNoOrders = Object.entries(ordersByDay)
      .filter(([day, count]) => {
        const d = new Date(day);
        const dayOfWeek = d.getDay();
        return dayOfWeek !== 0 && dayOfWeek !== 6 && count === 0;
      });

    if (daysWithNoOrders.length >= 3) {
      anomalies.push({
        id: `activity-low`,
        type: "LOW_ACTIVITY",
        severity: "MEDIUM",
        title: `Activitate redusă detectată`,
        description: `${daysWithNoOrders.length} zile lucrătoare fără comenzi în ultimele 30 zile`,
        data: { daysWithNoOrders: daysWithNoOrders.map(d => d[0]) },
        detectedAt: new Date().toISOString(),
        recommendation: "Verifică dacă site-ul funcționează corect sau dacă e o problemă de marketing"
      });
    }

    // 5. Anomalii în reviews - multe reviews negative într-o zi
    const reviews = await prisma.review.findMany({
      where: {
        rating: { lte: 2 }
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        rating: true,
        text: true,
        createdAt: true,
        productId: true
      }
    });

    // Grupează reviews negative pe zi
    const negativeReviewsByDay: Record<string, number> = {};
    for (const review of reviews) {
      const dayStr = new Date(review.createdAt).toISOString().split("T")[0];
      negativeReviewsByDay[dayStr] = (negativeReviewsByDay[dayStr] || 0) + 1;
    }

    for (const [day, count] of Object.entries(negativeReviewsByDay)) {
      if (count >= 3) {
        anomalies.push({
          id: `reviews-spike-${day}`,
          type: "NEGATIVE_REVIEW_SPIKE",
          severity: "HIGH",
          title: `Creștere bruscă reviews negative`,
          description: `${count} reviews negative în ${day}`,
          data: { day, count },
          detectedAt: new Date().toISOString(),
          recommendation: "Investighează cauza - posibil problemă calitate sau livrare"
        });
      }
    }

    // Sortează după severity
    const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    anomalies.sort((a, b) => severityOrder[a.severity as keyof typeof severityOrder] - severityOrder[b.severity as keyof typeof severityOrder]);

    const stats = {
      total: anomalies.length,
      critical: anomalies.filter(a => a.severity === "CRITICAL").length,
      high: anomalies.filter(a => a.severity === "HIGH").length,
      medium: anomalies.filter(a => a.severity === "MEDIUM").length,
      byType: {
        orderAnomalies: anomalies.filter(a => a.type.includes("ORDER")).length,
        stockAnomalies: anomalies.filter(a => a.type.includes("STOCK")).length,
        priceAnomalies: anomalies.filter(a => a.type.includes("PRICE")).length,
        activityAnomalies: anomalies.filter(a => a.type.includes("ACTIVITY")).length,
        reviewAnomalies: anomalies.filter(a => a.type.includes("REVIEW")).length
      }
    };

    return NextResponse.json({
      stats,
      anomalies,
      metadata: {
        avgOrderValue: Math.round(avgOrder),
        stdDeviation: Math.round(stdDev),
        analyzedOrders: orders.length,
        analyzedProducts: products.length
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Analiză AI pentru o anomalie specifică
export async function POST(req: NextRequest) {
  try {
    const { anomaly } = await req.json();

    const prompt = `Analizează această anomalie detectată într-un magazin B2B de automatizări industriale și oferă recomandări detaliate.

ANOMALIE DETECTATĂ:
- Tip: ${anomaly.type}
- Severitate: ${anomaly.severity}
- Descriere: ${anomaly.description}
- Date: ${JSON.stringify(anomaly.data)}

Returnează JSON:
{
  "rootCauseAnalysis": {
    "possibleCauses": ["cauze posibile"],
    "mostLikely": "cea mai probabilă cauză",
    "confidence": "HIGH" | "MEDIUM" | "LOW"
  },
  "immediateActions": ["acțiuni imediate de luat"],
  "longTermFixes": ["soluții pe termen lung"],
  "impactAssessment": {
    "financialImpact": "estimare impact financiar",
    "reputationRisk": "LOW" | "MEDIUM" | "HIGH",
    "urgency": "IMMEDIATE" | "SOON" | "CAN_WAIT"
  },
  "preventionMeasures": ["măsuri de prevenție pentru viitor"],
  "relatedChecks": ["alte verificări de făcut"]
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
      analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: text };
    } catch {
      analysis = { raw: text };
    }

    return NextResponse.json({ anomaly, analysis });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
