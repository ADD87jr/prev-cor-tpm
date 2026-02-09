import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminAuthMiddleware } from "@/lib/auth-middleware";

export async function GET(req: NextRequest) {
  // Protejare autentificare
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;

  const reviews = await prisma.review.findMany({
    orderBy: { createdAt: "desc" }
  });
  return NextResponse.json(reviews);
}

export async function POST(req: NextRequest) {
  // Protejare autentificare
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;

  const { action, id } = await req.json();
  
  if (action === 'delete' && id) {
    await prisma.review.delete({ where: { id: parseInt(id) } });
    const reviews = await prisma.review.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json({ success: true, reviews });
  }
  
  if (action === 'toggle' && id) {
    const review = await prisma.review.findUnique({ where: { id: parseInt(id) } });
    if (review) {
      await prisma.review.update({
        where: { id: parseInt(id) },
        data: { approved: !review.approved }
      });
    }
    const reviews = await prisma.review.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json({ success: true, reviews });
  }
  
  return NextResponse.json({ error: 'Acțiune invalidă' }, { status: 400 });
}
