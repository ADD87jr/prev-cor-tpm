import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminAuthMiddleware } from "@/lib/auth-middleware";

// GET /admin/api/search?q=... — Căutare globală admin
export async function GET(req: NextRequest) {
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();

  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const results: { type: string; id: number; title: string; subtitle?: string; url: string }[] = [];

  // Caută produse
  const products = await prisma.product.findMany({
    where: {
      OR: [
        { name: { contains: q } },
        { sku: { contains: q } },
        { brand: { contains: q } },
      ],
    },
    select: { id: true, name: true, sku: true, price: true },
    take: 5,
  });
  for (const p of products) {
    results.push({
      type: "product",
      id: p.id,
      title: p.name,
      subtitle: `SKU: ${p.sku || "-"} | ${p.price} RON`,
      url: `/admin/adauga-produs-ro?edit=${p.id}`,
    });
  }

  // Caută comenzi
  const isNumeric = /^\d+$/.test(q);
  if (isNumeric || q.startsWith("CMD") || q.startsWith("cmd")) {
    const orders = await prisma.order.findMany({
      where: {
        OR: [
          { number: { contains: q } },
          ...(isNumeric ? [{ id: parseInt(q) }] : []),
        ],
      },
      select: { id: true, number: true, total: true, status: true, date: true },
      take: 5,
    });
    for (const o of orders) {
      results.push({
        type: "order",
        id: o.id,
        title: `Comandă #${o.number || o.id}`,
        subtitle: `${o.total} RON | ${o.status} | ${o.date.toLocaleDateString("ro-RO")}`,
        url: `/admin/orders`,
      });
    }
  }

  // Caută utilizatori
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { email: { contains: q } },
        { name: { contains: q } },
      ],
    },
    select: { id: true, email: true, name: true },
    take: 5,
  });
  for (const u of users) {
    results.push({
      type: "user",
      id: u.id,
      title: u.name,
      subtitle: u.email,
      url: `/admin/utilizatori`,
    });
  }

  // Caută facturi
  if (q.startsWith("PCT") || q.startsWith("pct") || isNumeric) {
    const invoices = await prisma.invoice.findMany({
      where: isNumeric ? { number: parseInt(q) } : undefined,
      select: { id: true, series: true, number: true, type: true, createdAt: true },
      take: 5,
    });
    for (const inv of invoices) {
      results.push({
        type: "invoice",
        id: inv.id,
        title: `${inv.series}-${String(inv.number).padStart(4, "0")}`,
        subtitle: `${inv.type} | ${inv.createdAt.toLocaleDateString("ro-RO")}`,
        url: `/admin/facturi`,
      });
    }
  }

  return NextResponse.json({ results });
}
