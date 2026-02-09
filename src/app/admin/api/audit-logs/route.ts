import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminAuthMiddleware } from "@/lib/auth-middleware";

/**
 * GET /admin/api/audit-logs - Get audit logs with filtering and pagination
 */
export async function GET(req: NextRequest) {
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");
    const action = searchParams.get("action");
    const resource = searchParams.get("resource");

    const where: any = {};
    if (action) where.action = { contains: action };
    if (resource) where.resource = { contains: resource };

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: "desc" },
      skip: offset,
      take: limit,
    });

    const total = await prisma.auditLog.count({ where });

    return NextResponse.json({
      logs,
      total,
      page: Math.floor(offset / limit) + 1,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("[AUDIT LOGS] Error:", error);
    return NextResponse.json({ error: "Eroare la încărcarea log-urilor" }, { status: 500 });
  }
}

/**
 * DELETE /admin/api/audit-logs - Clear old audit logs (keep last 30 days)
 */
export async function DELETE(req: NextRequest) {
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;

  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { count } = await prisma.auditLog.deleteMany({
      where: {
        timestamp: { lt: thirtyDaysAgo },
      },
    });

    return NextResponse.json({ 
      success: true, 
      message: `${count} loguri vechi șterse`,
      deletedCount: count,
    });
  } catch (error) {
    console.error("[AUDIT LOGS DELETE] Error:", error);
    return NextResponse.json({ error: "Eroare la ștergerea logurilor" }, { status: 500 });
  }
}
