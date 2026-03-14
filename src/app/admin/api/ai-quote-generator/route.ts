import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyDPMtQTjaruCtql9qAFqcavAzKwXRdjsnA";

// GET - Clienți pentru oferte
export async function GET() {
  try {
    const orders = await prisma.order.findMany({
      where: { status: { not: "cancelled" } },
      select: { clientData: true, total: true }
    });

    // Extrage clienți unici
    const clientsMap = new Map<string, { name: string; company: string; email: string; phone: string; totalValue: number; ordersCount: number }>();
    
    for (const order of orders) {
      const data = typeof order.clientData === "string" 
        ? JSON.parse(order.clientData) 
        : order.clientData;
      
      const email = data?.email || "";
      if (!email) continue;

      const existing = clientsMap.get(email);
      if (existing) {
        existing.totalValue += order.total;
        existing.ordersCount++;
      } else {
        clientsMap.set(email, {
          name: data?.name || "",
          company: data?.companyName || data?.company || "",
          email,
          phone: data?.phone || "",
          totalValue: order.total,
          ordersCount: 1
        });
      }
    }

    const clients = Array.from(clientsMap.values())
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 50);

    // Produse pentru oferte
    const products = await prisma.product.findMany({
      take: 100,
      orderBy: { price: "desc" },
      select: {
        id: true,
        name: true,
        sku: true,
        price: true,
        listPrice: true,
        stock: true,
        manufacturer: true,
        type: true
      }
    });

    return NextResponse.json({ clients, products });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Generează ofertă PDF
export async function POST(req: NextRequest) {
  try {
    const { clientEmail, selectedProducts, discount, validityDays, notes } = await req.json();

    // Obține datele clientului
    const orders = await prisma.order.findMany({
      where: { status: { not: "cancelled" } },
      select: { clientData: true, total: true, items: true }
    });

    let clientData: any = null;
    let clientHistory: any[] = [];

    for (const order of orders) {
      const data = typeof order.clientData === "string" 
        ? JSON.parse(order.clientData) 
        : order.clientData;
      
      if (data?.email === clientEmail) {
        clientData = data;
        clientHistory.push({ total: order.total, items: order.items });
      }
    }

    if (!clientData) {
      clientData = { name: "Client Nou", email: clientEmail };
    }

    // Obține produsele selectate
    const products = await prisma.product.findMany({
      where: { id: { in: selectedProducts.map((p: any) => p.productId) } },
      select: {
        id: true,
        name: true,
        sku: true,
        price: true,
        listPrice: true,
        manufacturer: true,
        description: true,
        type: true
      }
    });

    // Merge cu cantitățile
    const offerProducts = products.map(p => {
      const sel = selectedProducts.find((s: any) => s.productId === p.id);
      const quantity = sel?.quantity || 1;
      const customDiscount = sel?.discount || discount || 0;
      const finalPrice = p.price * (1 - customDiscount / 100);
      
      return {
        ...p,
        quantity,
        discount: customDiscount,
        originalPrice: p.price,
        finalPrice,
        lineTotal: finalPrice * quantity
      };
    });

    const subtotal = offerProducts.reduce((sum, p) => sum + p.lineTotal, 0);
    const tva = subtotal * 0.19;
    const total = subtotal + tva;

    const prompt = `Ești specialist în oferte comerciale pentru un magazin B2B de automatizări industriale.

CLIENT:
- Nume: ${clientData.name || clientData.companyName}
- Companie: ${clientData.companyName || "N/A"}
- Email: ${clientData.email}
- Istoric: ${clientHistory.length} comenzi anterioare

PRODUSE ÎN OFERTĂ:
${offerProducts.map(p => `- ${p.name} (${p.sku}): ${p.quantity} buc x ${p.finalPrice.toFixed(2)} RON (discount ${p.discount}%)`).join("\n")}

VALOARE:
- Subtotal: ${subtotal.toFixed(2)} RON
- TVA 19%: ${tva.toFixed(2)} RON
- TOTAL: ${total.toFixed(2)} RON

VALABILITATE: ${validityDays || 30} zile
NOTE SUPLIMENTARE: ${notes || "N/A"}

Generează o ofertă comercială profesională în română.

Returnează JSON:
{
  "title": "Titlu ofertă",
  "introduction": "Text introductiv personalizat pentru client (2-3 propoziții)",
  "productDescriptions": [
    { "sku": "...", "sellingPoints": "puncte tari ale produsului relevant pentru client" }
  ],
  "benefits": ["beneficiu 1 pentru client", "beneficiu 2"],
  "paymentTerms": "termeni de plată sugerați",
  "deliveryTerms": "termeni livrare",
  "warranty": "informații garanție",
  "callToAction": "îndemnuri pentru plasare comandă",
  "personalizedNote": "notă personalizată bazată pe istoricul clientului",
  "suggestedUpsells": [{"product": "produs complementar", "reason": "de ce ar fi util"}]
}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 1500, temperature: 0.7 }
        })
      }
    );

    if (!response.ok) {
      return NextResponse.json({ error: "AI indisponibil" }, { status: 500 });
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const cleaned = rawText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    const aiContent = JSON.parse(cleaned);

    return NextResponse.json({
      success: true,
      offer: {
        ...aiContent,
        client: clientData,
        products: offerProducts,
        subtotal,
        tva,
        total,
        validUntil: new Date(Date.now() + (validityDays || 30) * 24 * 60 * 60 * 1000).toISOString(),
        generatedAt: new Date().toISOString(),
        offerNumber: `OF-${Date.now().toString(36).toUpperCase()}`
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
