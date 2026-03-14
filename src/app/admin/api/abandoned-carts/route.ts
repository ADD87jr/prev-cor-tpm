import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
// GET - Lista coșuri abandonate
export async function GET() {
  try {
    const carts = await prisma.abandonedCart.findMany({
      orderBy: { createdAt: "desc" }
    });

    // Statistici
    const stats = {
      total: carts.length,
      notRecovered: carts.filter(c => !c.recovered).length,
      recovered: carts.filter(c => c.recovered).length,
      emailSent: carts.filter(c => c.emailSent).length,
      totalValue: carts.filter(c => !c.recovered).reduce((sum, c) => sum + c.total, 0),
      recoveredValue: carts.filter(c => c.recovered).reduce((sum, c) => sum + c.total, 0)
    };

    return NextResponse.json({ carts, stats });
  } catch (error: any) {
    console.error("Error fetching abandoned carts:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Șterge un coș abandonat
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID lipsă" }, { status: 400 });
    }

    await prisma.abandonedCart.delete({
      where: { id: parseInt(id) }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Marchează ca recuperat manual
export async function POST(req: NextRequest) {
  try {
    const { id, action } = await req.json();

    if (action === "markRecovered") {
      await prisma.abandonedCart.update({
        where: { id: parseInt(id) },
        data: { recovered: true }
      });
      return NextResponse.json({ success: true, message: "Marcat ca recuperat" });
    }

    if (action === "markEmailSent") {
      await prisma.abandonedCart.update({
        where: { id: parseInt(id) },
        data: { emailSent: true, emailSentAt: new Date() }
      });
      return NextResponse.json({ success: true, message: "Email marcat ca trimis" });
    }

    return NextResponse.json({ error: "Acțiune necunoscută" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
