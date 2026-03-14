import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/stock-notification — Subscribe to stock notification
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, productId, variantId } = body;

    if (!email || !productId) {
      return NextResponse.json({ error: "Email și productId sunt obligatorii." }, { status: 400 });
    }

    // Validare email simplă
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Email invalid." }, { status: 400 });
    }

    // Verifică dacă nu e deja abonat
    const existing = await prisma.stockNotification.findFirst({
      where: {
        email: email.toLowerCase().trim(),
        productId: Number(productId),
        variantId: variantId ? Number(variantId) : null,
        notified: false,
      },
    });

    if (existing) {
      return NextResponse.json({ message: "Sunteți deja abonat pentru acest produs." });
    }

    await prisma.stockNotification.create({
      data: {
        email: email.toLowerCase().trim(),
        productId: Number(productId),
        variantId: variantId ? Number(variantId) : null,
      },
    });

    return NextResponse.json({ message: "Veți fi notificat când produsul revine în stoc." });
  } catch (error) {
    console.error("[STOCK-NOTIFICATION] Error:", error);
    return NextResponse.json({ error: "Eroare la abonare." }, { status: 500 });
  }
}
