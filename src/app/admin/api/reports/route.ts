import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminAuthMiddleware } from "@/lib/auth-middleware";

const CHELTUIELI_KEY = "cheltuieli_data";

async function loadCheltuieli() {
  try {
    const setting = await prisma.siteSettings.findUnique({ where: { key: CHELTUIELI_KEY } });
    if (setting?.value) {
      return JSON.parse(setting.value);
    }
  } catch (err) {
    console.error("Error loading cheltuieli:", err);
  }
  return [];
}

export async function GET(req: NextRequest) {
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;
  // Rapoarte: total vânzări, stocuri, clienți
  const orders = await prisma.order.findMany();
  const products = await prisma.product.findMany();
  const users = await prisma.user.findMany();

  // Total vânzări
  const totalRevenue = orders.reduce((sum: number, o: any) => sum + o.total, 0);
  // Stocuri
  const stockReport = products.map((p: any) => ({ name: p.name, stock: p.stock }));
  // Clienți
  const clientReport = users.map((u: any) => ({ name: u.name, email: u.email, orders: u.orders?.length ?? 0 }));

  // Cheltuieli - ultimele 10
  const allCheltuieli = await loadCheltuieli();
  const recentCheltuieli = allCheltuieli
    .sort((a: any, b: any) => new Date(b.data).getTime() - new Date(a.data).getTime())
    .slice(0, 10);
  const totalCheltuieli = allCheltuieli.reduce((sum: number, c: any) => sum + (c.suma || 0), 0);

  return NextResponse.json({
    totalRevenue,
    stockReport,
    clientReport,
    ordersCount: orders.length,
    productsCount: products.length,
    usersCount: users.length,
    recentCheltuieli,
    totalCheltuieli
  });
}
