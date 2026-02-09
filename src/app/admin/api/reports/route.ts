import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";
import { adminAuthMiddleware } from "@/lib/auth-middleware";

const CHELTUIELI_FILE = path.join(process.cwd(), "data", "cheltuieli.json");

function loadCheltuieli() {
  try {
    if (fs.existsSync(CHELTUIELI_FILE)) {
      return JSON.parse(fs.readFileSync(CHELTUIELI_FILE, "utf-8"));
    }
  } catch (err) {}
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
  const allCheltuieli = loadCheltuieli();
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
