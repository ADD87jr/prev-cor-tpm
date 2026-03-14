import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyDPMtQTjaruCtql9qAFqcavAzKwXRdjsnA";

// GET - Lista comenzi care necesită follow-up
export async function GET() {
  try {
    const now = new Date();

    // Comenzi livrate acum 7-14 zile (pentru review/feedback)
    const deliveredStart = new Date(now);
    deliveredStart.setDate(deliveredStart.getDate() - 14);
    const deliveredEnd = new Date(now);
    deliveredEnd.setDate(deliveredEnd.getDate() - 7);

    const deliveredOrders = await prisma.order.findMany({
      where: {
        status: "delivered",
        statusUpdatedAt: {
          gte: deliveredStart,
          lte: deliveredEnd
        }
      },
      select: {
        id: true,
        number: true,
        clientData: true,
        items: true,
        total: true,
        date: true,
        statusUpdatedAt: true
      },
      take: 50
    });

    // Comenzi pending care nu au fost plătite (posibil abandon)
    const abandonedStart = new Date(now);
    abandonedStart.setDate(abandonedStart.getDate() - 7);
    const abandonedEnd = new Date(now);
    abandonedEnd.setDate(abandonedEnd.getDate() - 1);

    const abandonedOrders = await prisma.order.findMany({
      where: {
        status: "pending",
        date: {
          gte: abandonedStart,
          lte: abandonedEnd
        }
      },
      select: {
        id: true,
        number: true,
        clientData: true,
        items: true,
        total: true,
        date: true
      },
      take: 50
    });

    // Formatare clientData
    const formatOrder = (order: any, type: string) => {
      let client: any = {};
      try {
        client = typeof order.clientData === "string" ? JSON.parse(order.clientData) : order.clientData || {};
      } catch { }

      let items: any[] = [];
      try {
        items = typeof order.items === "string" ? JSON.parse(order.items) : order.items || [];
      } catch { }

      return {
        id: order.id,
        orderNumber: order.number,
        type,
        customerName: client.name || client.nume || client.firstName || "Client",
        customerEmail: client.email,
        customerPhone: client.phone || client.telefon,
        company: client.company || client.firma,
        items: items.slice(0, 5), // Primele 5 produse
        itemCount: items.length,
        total: order.total,
        createdAt: order.date,
        updatedAt: order.statusUpdatedAt,
        daysSinceOrder: Math.floor((now.getTime() - new Date(order.date).getTime()) / (1000 * 60 * 60 * 24))
      };
    };

    return NextResponse.json({
      forReview: deliveredOrders.map(o => formatOrder(o, "review")),
      abandoned: abandonedOrders.map(o => formatOrder(o, "abandoned")),
      stats: {
        forReviewCount: deliveredOrders.length,
        abandonedCount: abandonedOrders.length
      }
    });
  } catch (error: any) {
    console.error("Error fetching follow-up orders:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Generează email follow-up
export async function POST(request: NextRequest) {
  try {
    const { orderId, type, customNote } = await request.json();

    // Obține comanda
    const order = await prisma.order.findUnique({
      where: { id: orderId }
    });

    if (!order) {
      return NextResponse.json({ error: "Comanda nu există" }, { status: 404 });
    }

    let client: any = {};
    try {
      client = typeof order.clientData === "string" ? JSON.parse(order.clientData) : order.clientData || {};
    } catch { }

    let items: any[] = [];
    try {
      items = typeof order.items === "string" ? JSON.parse(order.items) : order.items || [];
    } catch { }

    let prompt = "";

    if (type === "review") {
      prompt = `Ești specialist în customer success pentru PREV-COR TPM S.R.L., magazin de automatizări industriale din România.
Generează un email de follow-up prietenos pentru a cere feedback după livrare.

Informații comandă:
- Client: ${client.name || client.nume || "Client"}
- Email: ${client.email}
- Companie: ${client.company || client.firma || "N/A"}
- Produse comandate: ${items.map((i: any) => i.name || i.productName).join(", ")}
- Total: ${order.total} RON
- Număr comandă: ${order.number || order.id}

${customNote ? `Notă suplimentară: ${customNote}` : ""}

Emailul trebuie să:
1. Mulțumească pentru comandă
2. Întrebe dacă produsele au ajuns în condiții bune
3. Invite clientul să lase un review
4. Ofere asistență dacă are întrebări tehnice
5. Menționeze că suntem disponibili pentru comenzi viitoare

Ton: Profesional dar prietenos, specific industriei B2B.

Returnează DOAR JSON:
{
  "subject": "...",
  "htmlBody": "<p>...</p>",
  "plainBody": "..."
}`;
    } else if (type === "abandoned") {
      prompt = `Ești specialist în conversii pentru PREV-COR TPM S.R.L., magazin de automatizări industriale.
Generează un email de recuperare pentru o comandă nefinalizată.

Informații:
- Client: ${client.name || client.nume || "Client"}
- Email: ${client.email}
- Companie: ${client.company || client.firma || "N/A"}
- Produse în comandă: ${items.map((i: any) => i.name || i.productName).join(", ")}
- Valoare: ${order.total} RON
- Comandă creată acum ${Math.floor((Date.now() - new Date(order.date).getTime()) / (1000 * 60 * 60 * 24))} zile

${customNote ? `Notă suplimentară: ${customNote}` : ""}

Emailul trebuie să:
1. Amintească despre comanda nefinalizată (fără a pune presiune)
2. Întrebe dacă a întâmpinat probleme
3. Ofere asistență pentru finalizare
4. Menționeze beneficiile (livrare rapidă, suport tehnic)
5. Includă un CTA subtil

Ton: Profesional, helpul, fără presiune agresivă.

Returnează DOAR JSON:
{
  "subject": "...",
  "htmlBody": "<p>...</p>",
  "plainBody": "..."
}`;
    } else {
      return NextResponse.json({ error: "Tip email invalid" }, { status: 400 });
    }

    // Call Gemini API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 1000, temperature: 0.7 }
        })
      }
    );

    if (!response.ok) {
      return NextResponse.json({ error: "Eroare la generare AI" }, { status: 500 });
    }

    const data = await response.json();
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    let email;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        email = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON");
      }
    } catch {
      return NextResponse.json({ error: "Nu am putut genera emailul" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      email,
      order: {
        id: order.id,
        orderNumber: order.number,
        customerEmail: client.email,
        customerName: client.name || client.nume,
        total: order.total
      }
    });
  } catch (error: any) {
    console.error("Error generating follow-up email:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
