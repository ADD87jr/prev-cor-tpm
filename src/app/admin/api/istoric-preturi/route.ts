import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminAuthMiddleware } from "@/lib/auth-middleware";

// GET /admin/api/istoric-preturi?productId=X — Istoric modificări prețuri
export async function GET(req: NextRequest) {
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const productId = searchParams.get("productId");

  const where: any = {};
  if (productId) where.productId = parseInt(productId, 10);

  const history = await prisma.priceHistory.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  // Adăugăm numele produselor
  const productIds = [...new Set(history.map((h) => h.productId))];
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true, sku: true },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));

  const items = history.map((h) => ({
    id: h.id,
    productId: h.productId,
    productName: productMap.get(h.productId)?.name || "N/A",
    productSku: productMap.get(h.productId)?.sku || "-",
    variantId: h.variantId,
    oldPrice: h.oldPrice,
    newPrice: h.newPrice,
    oldListPrice: h.oldListPrice,
    newListPrice: h.newListPrice,
    changedBy: h.changedBy,
    createdAt: h.createdAt.toISOString(),
  }));

  return NextResponse.json({ items });
}

// POST /admin/api/istoric-preturi — Înregistrează manual o modificare de preț
export async function POST(req: NextRequest) {
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;

  const body = await req.json();
  const { productId, variantId, oldPrice, newPrice, oldListPrice, newListPrice, changedBy } = body;

  if (!productId || oldPrice === undefined || newPrice === undefined) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const record = await prisma.priceHistory.create({
    data: {
      productId: parseInt(productId, 10),
      variantId: variantId ? parseInt(variantId, 10) : null,
      oldPrice: parseFloat(oldPrice),
      newPrice: parseFloat(newPrice),
      oldListPrice: oldListPrice ? parseFloat(oldListPrice) : null,
      newListPrice: newListPrice ? parseFloat(newListPrice) : null,
      changedBy: changedBy || "admin",
    },
  });

  return NextResponse.json({ success: true, id: record.id });
}
