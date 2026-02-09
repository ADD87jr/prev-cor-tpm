import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminAuthMiddleware } from "@/lib/auth-middleware";
import { auditDataChange } from "@/lib/audit-logger";
import { getClientIp } from "@/lib/rate-limit";

// Șterge toate datele de test pentru produse și comenzi
export async function POST(req: NextRequest) {
  // Protejare autentificare
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type');

  // Log acțiunea critică
  await auditDataChange("admin", "delete", "reset_data", type || "all",
    `Reset data triggered for: ${type || "all"}`,
    getClientIp(req)
  );

  if (type === 'products') {
    await prisma.product.deleteMany({});
    return NextResponse.json({ success: true, type: 'products' });
  }
  if (type === 'orders') {
    await prisma.order.deleteMany({});
    return NextResponse.json({ success: true, type: 'orders' });
  }
  // Dacă nu e specificat nimic, șterge tot (fallback)
  await prisma.order.deleteMany({});
  await prisma.product.deleteMany({});
  return NextResponse.json({ success: true, type: 'all' });
}
