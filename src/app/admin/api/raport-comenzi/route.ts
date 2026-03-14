import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminAuthMiddleware } from "@/lib/auth-middleware";

// GET /admin/api/raport-comenzi — Raport comenzi pe perioadă
export async function GET(req: NextRequest) {
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const where: any = {};
  if (from || to) {
    where.date = {};
    if (from) where.date.gte = new Date(from + "T00:00:00");
    if (to) where.date.lte = new Date(to + "T23:59:59");
  }

  const orders = await prisma.order.findMany({
    where,
    orderBy: { date: "desc" },
    select: {
      id: true,
      number: true,
      total: true,
      date: true,
      status: true,
      paymentMethod: true,
      source: true,
      deliveryType: true,
      courierCost: true,
      clientData: true,
    },
  });

  // Statistici pe status
  const statusCount: Record<string, number> = {};
  const statusRevenue: Record<string, number> = {};
  // Pe luni
  const monthlyData: Record<string, { count: number; revenue: number }> = {};
  // Pe metode de plată
  const paymentData: Record<string, { count: number; revenue: number }> = {};
  // Pe surse
  const sourceData: Record<string, number> = {};

  let totalRevenue = 0;

  for (const o of orders) {
    // Status
    statusCount[o.status] = (statusCount[o.status] || 0) + 1;
    statusRevenue[o.status] = (statusRevenue[o.status] || 0) + o.total;

    totalRevenue += o.total;

    // Luna
    const monthKey = `${o.date.getFullYear()}-${String(o.date.getMonth() + 1).padStart(2, "0")}`;
    if (!monthlyData[monthKey]) monthlyData[monthKey] = { count: 0, revenue: 0 };
    monthlyData[monthKey].count += 1;
    monthlyData[monthKey].revenue += o.total;

    // Plată
    const pm = o.paymentMethod || "necunoscut";
    if (!paymentData[pm]) paymentData[pm] = { count: 0, revenue: 0 };
    paymentData[pm].count += 1;
    paymentData[pm].revenue += o.total;

    // Sursă
    const src = o.source || "website";
    sourceData[src] = (sourceData[src] || 0) + 1;
  }

  // Sortăm lunile
  const months = Object.entries(monthlyData)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([luna, d]) => ({ luna, ...d }));

  return NextResponse.json({
    totalOrders: orders.length,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    avgOrder: orders.length > 0 ? Math.round((totalRevenue / orders.length) * 100) / 100 : 0,
    statusCount,
    statusRevenue,
    months,
    paymentData,
    sourceData,
  });
}
