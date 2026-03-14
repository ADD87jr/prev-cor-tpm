import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminAuthMiddleware } from "@/lib/auth-middleware";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Protejare autentificare
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;

  try {
    const { id } = await params;
    const orderId = parseInt(id, 10);
    
    if (isNaN(orderId)) {
      return NextResponse.json({ error: "ID invalid" }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true, product: true }
    });

    if (!order) {
      return NextResponse.json({ error: "Comanda nu a fost găsită" }, { status: 404 });
    }

    return NextResponse.json({
      ...order,
      clientData: order.clientData || null,
    });
  } catch (err) {
    console.error("[ORDER GET BY ID] Error:", err);
    return NextResponse.json({ error: "Eroare server" }, { status: 500 });
  }
}
