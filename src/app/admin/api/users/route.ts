import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { adminAuthMiddleware } from "@/lib/auth-middleware";

export async function GET(req: NextRequest) {
  // Protejare autentificare
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;

  const users = await prisma.user.findMany({ include: { orders: true } });
  return NextResponse.json(users);
}

export async function PUT(req: NextRequest) {
  // Protejare autentificare
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;

  const { userId, blocked, newPassword } = await req.json();
  let user = null;
  if (typeof blocked === "boolean") {
    user = await prisma.user.update({ where: { id: userId }, data: { blocked } });
  }
  if (typeof newPassword === "string" && newPassword.length > 0) {
    user = await prisma.user.update({ where: { id: userId }, data: { password: newPassword } });
  }
  return NextResponse.json(user);
}
