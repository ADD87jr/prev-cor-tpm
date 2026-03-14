import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminAuthMiddleware } from "@/lib/auth-middleware";

// GET /admin/api/top-clienti — Top clienți după valoare totală comenzi
export async function GET(req: NextRequest) {
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") || "50", 10);

  const orders = await prisma.order.findMany({
    select: {
      id: true,
      total: true,
      date: true,
      clientData: true,
      status: true,
      userId: true,
    },
  });

  // Grupare pe email client
  const clientMap = new Map<string, {
    email: string;
    name: string;
    phone: string;
    totalSpent: number;
    orderCount: number;
    firstOrder: string;
    lastOrder: string;
    avgOrder: number;
  }>();

  for (const order of orders) {
    const cd: any = typeof order.clientData === "string" ? JSON.parse(order.clientData) : (order.clientData || {});
    const email = (cd.email || cd.Email || "").toLowerCase().trim();
    if (!email) continue;

    const existing = clientMap.get(email);
    const orderDate = order.date.toISOString();

    if (existing) {
      existing.totalSpent += order.total;
      existing.orderCount += 1;
      if (orderDate < existing.firstOrder) existing.firstOrder = orderDate;
      if (orderDate > existing.lastOrder) existing.lastOrder = orderDate;
      existing.avgOrder = existing.totalSpent / existing.orderCount;
    } else {
      clientMap.set(email, {
        email,
        name: cd.name || cd.Name || cd.nume || cd.Nume || "-",
        phone: cd.phone || cd.Phone || cd.telefon || cd.Telefon || "-",
        totalSpent: order.total,
        orderCount: 1,
        firstOrder: orderDate,
        lastOrder: orderDate,
        avgOrder: order.total,
      });
    }
  }

  // Sortează după totalSpent descrescător
  const clients = Array.from(clientMap.values())
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, limit);

  const totalRevenue = clients.reduce((s, c) => s + c.totalSpent, 0);
  const totalOrders = clients.reduce((s, c) => s + c.orderCount, 0);

  return NextResponse.json({ clients, totalRevenue, totalOrders, totalClients: clientMap.size });
}
