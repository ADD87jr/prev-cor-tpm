import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminAuthMiddleware } from "@/lib/auth-middleware";

export async function POST(req: NextRequest) {
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;
  try {
    const data = await req.json();
    const invoice = await prisma.order.create({
      data: {
        date: new Date(),
        total: data.products?.reduce((sum: number, p: any) => sum + Number(p.qty) * Number(p.price) * (1 + (Number(p.tva) || 0) / 100), 0) || 0,
        items: data,
        // Eliminat status manual_comanda
        invoiceUrl: null,
        user: undefined,
        product: undefined,
      },
    });
    return NextResponse.json({ success: true, invoice });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ success: false, error: "ID lipsă" }, { status: 400 });
  try {
    await prisma.order.delete({ where: { id: Number(id) } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
