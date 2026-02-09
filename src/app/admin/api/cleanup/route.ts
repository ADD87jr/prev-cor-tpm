import { NextRequest, NextResponse } from "next/server";
import { adminAuthMiddleware } from "@/lib/auth-middleware";
import { clearAllRateLimits, cleanupRateLimitStore, getRateLimitStats } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";

/**
 * GET /admin/api/cleanup - Get cleanup stats
 */
export async function GET(req: NextRequest) {
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;

  try {
    const rateLimitStats = getRateLimitStats();
    
    // Count old audit logs (>30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const oldLogsCount = await prisma.auditLog.count({
      where: { timestamp: { lt: thirtyDaysAgo } }
    });
    
    const totalLogsCount = await prisma.auditLog.count();

    return NextResponse.json({
      rateLimit: rateLimitStats,
      auditLogs: {
        total: totalLogsCount,
        oldCount: oldLogsCount
      }
    });
  } catch (error) {
    console.error("[CLEANUP STATS] Error:", error);
    return NextResponse.json({ error: "Eroare la obținerea statisticilor" }, { status: 500 });
  }
}

/**
 * POST /admin/api/cleanup - Run cleanup operations
 */
export async function POST(req: NextRequest) {
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;

  try {
    const { action } = await req.json();
    
    const results: any = {};

    if (action === "rate-limit" || action === "all") {
      const cleanedKeys = cleanupRateLimitStore();
      results.rateLimit = { cleanedKeys };
    }

    if (action === "rate-limit-full" || action === "all-full") {
      clearAllRateLimits();
      results.rateLimit = { cleared: true };
    }

    if (action === "audit-logs" || action === "all") {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { count } = await prisma.auditLog.deleteMany({
        where: { timestamp: { lt: thirtyDaysAgo } }
      });
      results.auditLogs = { deletedCount: count };
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error("[CLEANUP] Error:", error);
    return NextResponse.json({ error: "Eroare la curățare" }, { status: 500 });
  }
}
