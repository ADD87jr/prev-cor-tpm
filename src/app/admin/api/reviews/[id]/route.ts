import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminAuthMiddleware } from "@/lib/auth-middleware";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;
  const { id } = await params;
  const { approved } = await req.json();
  
  try {
    await prisma.review.update({
      where: { id: parseInt(id) },
      data: { approved }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Eroare la actualizare" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;
  const { id } = await params;
  
  try {
    await prisma.review.delete({
      where: { id: parseInt(id) }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Eroare la ștergere" }, { status: 500 });
  }
}
