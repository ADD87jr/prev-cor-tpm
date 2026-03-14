import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminAuthMiddleware } from "@/lib/auth-middleware";

// GET /admin/api/stocuri — Raport stocuri produse + variante
export async function GET(req: NextRequest) {
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const threshold = parseInt(searchParams.get("threshold") || "5", 10);
  const showAll = searchParams.get("all") === "true";

  // Produse fără variante cu stoc scăzut
  const products = await prisma.product.findMany({
    select: {
      id: true,
      name: true,
      sku: true,
      stock: true,
      price: true,
      onDemand: true,
      productVariants: {
        select: { id: true },
      },
    },
    orderBy: { stock: "asc" },
  });

  // Variante cu stoc scăzut
  const variants = await prisma.productVariant.findMany({
    where: { active: true },
    select: {
      id: true,
      code: true,
      stoc: true,
      pret: true,
      onDemand: true,
      productId: true,
      product: {
        select: { id: true, name: true, sku: true },
      },
    },
    orderBy: { stoc: "asc" },
  });

  // Construim lista combinată
  const items: any[] = [];

  // Produse fără variante (direct stock pe produs)
  for (const p of products) {
    if (p.productVariants.length > 0) continue; // skip dacă are variante
    if (!showAll && p.onDemand) continue;
    if (!showAll && p.stock > threshold) continue;
    items.push({
      type: "product",
      id: p.id,
      name: p.name,
      sku: p.sku || "-",
      stock: p.stock,
      price: p.price,
      onDemand: p.onDemand,
      status: p.onDemand ? "ondemand" : p.stock === 0 ? "out" : p.stock <= threshold ? "low" : "ok",
    });
  }

  // Variante
  for (const v of variants) {
    if (!showAll && v.onDemand) continue;
    if (!showAll && v.stoc > threshold) continue;
    items.push({
      type: "variant",
      id: v.id,
      productId: v.productId,
      name: `${v.product.name} — ${v.code}`,
      sku: v.product.sku || "-",
      stock: v.stoc,
      price: v.pret || 0,
      onDemand: v.onDemand,
      status: v.onDemand ? "ondemand" : v.stoc === 0 ? "out" : v.stoc <= threshold ? "low" : "ok",
    });
  }

  // Produse CU variante — afișăm ca sumar
  for (const p of products) {
    if (p.productVariants.length === 0) continue;
    if (!showAll && p.onDemand) continue;
    const pvIds = p.productVariants.map((pv) => pv.id);
    const pvs = variants.filter((v) => pvIds.includes(v.id));
    const totalStock = pvs.reduce((s, v) => s + v.stoc, 0);
    if (!showAll && totalStock > threshold) continue;
    items.push({
      type: "product",
      id: p.id,
      name: `${p.name} (${pvs.length} variante)`,
      sku: p.sku || "-",
      stock: totalStock,
      price: p.price,
      onDemand: p.onDemand,
      status: p.onDemand ? "ondemand" : totalStock === 0 ? "out" : totalStock <= threshold ? "low" : "ok",
    });
  }

  // Sortăm: stoc epuizat primul, apoi cele cu stoc mic
  items.sort((a, b) => a.stock - b.stock);

  const totalOut = items.filter((i) => i.status === "out").length;
  const totalLow = items.filter((i) => i.status === "low").length;

  return NextResponse.json({ items, totalOut, totalLow, threshold });
}
