import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyDPMtQTjaruCtql9qAFqcavAzKwXRdjsnA";

// GET - Lista produse cu istoric vânzări
export async function GET() {
  try {
    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        sku: true,
        stock: true,
        manufacturer: true,
        price: true,
      },
      orderBy: { name: "asc" }
    });

    // Obține comenzile din ultimele 90 zile
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const orders = await prisma.order.findMany({
      where: {
        date: { gte: ninetyDaysAgo },
        status: { not: "cancelled" }
      },
      select: {
        id: true,
        date: true,
        items: true
      }
    });

    // Calculează vânzările per produs
    const salesMap: Record<number, { quantity: number; orders: number; lastSale?: Date }> = {};

    for (const order of orders) {
      let items: any[] = [];
      try {
        items = typeof order.items === "string" ? JSON.parse(order.items) : order.items || [];
      } catch { continue; }

      for (const item of items) {
        const productId = item.productId || item.id;
        if (!productId) continue;

        if (!salesMap[productId]) {
          salesMap[productId] = { quantity: 0, orders: 0 };
        }
        salesMap[productId].quantity += item.quantity || 1;
        salesMap[productId].orders += 1;
        if (!salesMap[productId].lastSale || new Date(order.date) > salesMap[productId].lastSale) {
          salesMap[productId].lastSale = order.date;
        }
      }
    }

    // Combină datele
    const productsWithSales = products.map(p => ({
      ...p,
      soldQuantity: salesMap[p.id]?.quantity || 0,
      orderCount: salesMap[p.id]?.orders || 0,
      lastSale: salesMap[p.id]?.lastSale || null,
      avgPerMonth: Math.round((salesMap[p.id]?.quantity || 0) / 3 * 10) / 10 // 90 zile = 3 luni
    }));

    return NextResponse.json({
      products: productsWithSales,
      period: "90 zile"
    });
  } catch (error: any) {
    console.error("Error fetching stock data:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Analizează și prezice necesarul de stoc
export async function POST(request: NextRequest) {
  try {
    const { productIds } = await request.json();

    // Obține produsele
    const products = await prisma.product.findMany({
      where: productIds?.length > 0 ? { id: { in: productIds } } : undefined,
      select: {
        id: true,
        name: true,
        sku: true,
        stock: true,
        manufacturer: true,
        price: true,
        purchasePrice: true
      }
    });

    // Obține comenzile din ultimele 180 zile pentru trend
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setDate(sixMonthsAgo.getDate() - 180);

    const orders = await prisma.order.findMany({
      where: {
        date: { gte: sixMonthsAgo },
        status: { not: "cancelled" }
      },
      select: {
        id: true,
        date: true,
        items: true
      },
      orderBy: { date: "asc" }
    });

    // Calculează vânzări pe lună per produs
    const salesByMonth: Record<number, Record<string, number>> = {};

    for (const order of orders) {
      let items: any[] = [];
      try {
        items = typeof order.items === "string" ? JSON.parse(order.items) : order.items || [];
      } catch { continue; }

      const monthKey = new Date(order.date).toISOString().slice(0, 7); // YYYY-MM

      for (const item of items) {
        const productId = item.productId || item.id;
        if (!productId) continue;

        if (!salesByMonth[productId]) salesByMonth[productId] = {};
        if (!salesByMonth[productId][monthKey]) salesByMonth[productId][monthKey] = 0;
        salesByMonth[productId][monthKey] += item.quantity || 1;
      }
    }

    // Pregătește datele pentru AI
    const productData = products.map(p => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      currentStock: p.stock || 0,
      price: p.price,
      purchasePrice: p.purchasePrice,
      salesHistory: salesByMonth[p.id] || {}
    }));

    const prompt = `Ești un expert în supply chain pentru un magazin de automatizări industriale.
Analizează datele de vânzări pentru următoarele produse și prezice necesarul de stoc.

Date produse:
${JSON.stringify(productData, null, 2)}

Pentru fiecare produs, calculează:
1. Trend vânzări (crescător, stabil, descrescător)
2. Predicție vânzări următoarele 30 zile
3. Zile rămase până la epuizare stoc (bazat pe trend)
4. Cantitate recomandată de comandat
5. Urgență aprovizionare (critic, urgent, normal, ok)
6. Sezonalitate (dacă se observă)

Returnează DOAR JSON valid:
{
  "predictions": [
    {
      "productId": 1,
      "productName": "...",
      "currentStock": 10,
      "trend": "crescător|stabil|descrescător",
      "predicted30Days": 15,
      "daysUntilEmpty": 20,
      "recommendedOrder": 25,
      "urgency": "critic|urgent|normal|ok",
      "urgencyReason": "...",
      "seasonality": "..."
    }
  ],
  "summary": {
    "criticalCount": 2,
    "urgentCount": 3,
    "totalRecommendedInvestment": 5000,
    "topPriorities": ["Produs X", "Produs Y"],
    "generalRecommendation": "..."
  }
}`;

    // Call Gemini API directly
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 2000, temperature: 0.7 }
        })
      }
    );

    if (!response.ok) {
      return NextResponse.json({ error: "Eroare la generare AI" }, { status: 500 });
    }

    const data = await response.json();
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Parsează JSON
    let analysis;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found");
      }
    } catch {
      return NextResponse.json({ error: "Nu am putut parsa răspunsul AI" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      analysis,
      analyzedAt: new Date().toISOString()
    });
  } catch (error: any) {
    console.error("Error in stock prediction:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
