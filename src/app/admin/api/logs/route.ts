import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminAuthMiddleware } from "@/lib/auth-middleware";

// GET: Returnează toate log-urile admin (sortate descrescător)
export async function GET(req: NextRequest) {
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;
  const url = new URL(req.url);
  const limit = parseInt(url.searchParams.get("limit") || "100");
  const entity = url.searchParams.get("entity");
  const action = url.searchParams.get("action");

  const where: any = {};
  if (entity) where.entity = entity;
  if (action) where.action = action;

  const logs = await prisma.adminLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return NextResponse.json(logs);
}

// POST: Adaugă un log nou
export async function POST(req: NextRequest) {
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;
  try {
    const body = await req.json();
    const { action, entity, entityId, details, adminEmail } = body;
    if (!action || !entity || !adminEmail) {
      return NextResponse.json({ error: "action, entity și adminEmail sunt obligatorii" }, { status: 400 });
    }
    const log = await prisma.adminLog.create({
      data: {
        action,
        entity,
        entityId: entityId ? parseInt(entityId) : null,
        details: details || null,
        adminEmail,
      },
    });
    return NextResponse.json(log, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Eroare la salvare log" }, { status: 500 });
  }
}
