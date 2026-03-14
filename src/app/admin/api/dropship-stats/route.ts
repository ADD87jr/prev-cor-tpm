import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET - Statistici si rapoarte dropshipping
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "overview";
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    const dateFilter: Record<string, unknown> = {};
    if (dateFrom || dateTo) {
      dateFilter.createdAt = {};
      if (dateFrom) {
        (dateFilter.createdAt as Record<string, Date>).gte = new Date(dateFrom);
      }
      if (dateTo) {
        (dateFilter.createdAt as Record<string, Date>).lte = new Date(dateTo);
      }
    }

    if (type === "overview") {
      // Statistici generale
      const [products, orders, alerts] = await Promise.all([
        prisma.dropshipProduct.findMany(),
        prisma.dropshipOrder.findMany({ where: dateFilter }),
        prisma.dropshipAlert.findMany({ where: { resolved: false } }),
      ]);

      const totalProducts = products.length;
      const activeProducts = products.filter(p => p.status === "active").length;
      const outOfStockProducts = products.filter(p => p.status === "out_of_stock").length;
      
      const totalOrders = orders.length;
      const pendingOrders = orders.filter(o => o.status === "pending").length;
      const deliveredOrders = orders.filter(o => o.status === "delivered").length;
      
      const totalRevenue = orders.reduce((sum, o) => sum + (o.clientPrice || 0), 0);
      const totalCost = orders.reduce((sum, o) => sum + (o.supplierPrice || 0), 0);
      const totalProfit = orders.reduce((sum, o) => sum + (o.profit || 0), 0);
      
      const avgMargin = products.length > 0
        ? products.reduce((sum, p) => sum + ((p.yourPrice - p.supplierPrice) / p.supplierPrice * 100), 0) / products.length
        : 0;

      return NextResponse.json({
        products: { total: totalProducts, active: activeProducts, outOfStock: outOfStockProducts },
        orders: { total: totalOrders, pending: pendingOrders, delivered: deliveredOrders },
        financial: { revenue: totalRevenue, cost: totalCost, profit: totalProfit },
        avgMargin: avgMargin.toFixed(1),
        unresolvedAlerts: alerts.length,
      });
    }

    if (type === "by-product") {
      // Raport profit per produs
      const orders = await prisma.dropshipOrder.findMany({
        where: dateFilter,
        include: { product: true },
      });

      const byProduct: Record<number, { name: string; orders: number; revenue: number; cost: number; profit: number }> = {};
      
      for (const order of orders) {
        const pid = order.dropshipProductId;
        if (!byProduct[pid]) {
          byProduct[pid] = {
            name: order.product.name,
            orders: 0,
            revenue: 0,
            cost: 0,
            profit: 0,
          };
        }
        byProduct[pid].orders += 1;
        byProduct[pid].revenue += order.clientPrice || 0;
        byProduct[pid].cost += order.supplierPrice || 0;
        byProduct[pid].profit += order.profit || 0;
      }

      const sorted = Object.entries(byProduct)
        .map(([id, data]) => ({ id: parseInt(id), ...data }))
        .sort((a, b) => b.profit - a.profit);

      return NextResponse.json(sorted);
    }

    if (type === "by-supplier") {
      // Raport performanta per furnizor
      const orders = await prisma.dropshipOrder.findMany({
        where: dateFilter,
      });

      const suppliers = await prisma.supplier.findMany();
      const supplierMap = new Map(suppliers.map(s => [s.id, s.name]));

      const bySupplier: Record<number, { 
        name: string; 
        orders: number; 
        delivered: number;
        avgDeliveryDays: number;
        totalDeliveryDays: number;
        profit: number;
      }> = {};

      for (const order of orders) {
        const sid = order.supplierId;
        if (!bySupplier[sid]) {
          bySupplier[sid] = {
            name: supplierMap.get(sid) || `Furnizor ${sid}`,
            orders: 0,
            delivered: 0,
            avgDeliveryDays: 0,
            totalDeliveryDays: 0,
            profit: 0,
          };
        }
        bySupplier[sid].orders += 1;
        bySupplier[sid].profit += order.profit || 0;
        
        if (order.status === "delivered" && order.orderedAt && order.deliveredAt) {
          bySupplier[sid].delivered += 1;
          const days = Math.ceil((order.deliveredAt.getTime() - order.orderedAt.getTime()) / (1000 * 60 * 60 * 24));
          bySupplier[sid].totalDeliveryDays += days;
        }
      }

      // Calculeaza media zilelor de livrare
      for (const data of Object.values(bySupplier)) {
        if (data.delivered > 0) {
          data.avgDeliveryDays = Math.round(data.totalDeliveryDays / data.delivered);
        }
      }

      const sorted = Object.entries(bySupplier)
        .map(([id, data]) => ({ id: parseInt(id), ...data }))
        .sort((a, b) => b.profit - a.profit);

      return NextResponse.json(sorted);
    }

    return NextResponse.json({ error: "Tip raport necunoscut" }, { status: 400 });
  } catch (error) {
    console.error("Error fetching dropship stats:", error);
    return NextResponse.json({ error: "Eroare la generarea raportului" }, { status: 500 });
  }
}
