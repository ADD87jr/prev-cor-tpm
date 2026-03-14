import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminAuthMiddleware } from "@/lib/auth-middleware";

// GET /api/ai/admin-insights — Generează insights pentru admin
export async function GET(req: NextRequest) {
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;

  try {
    const [products, orders, abandonedCarts, newsletters, wishlists] = await Promise.all([
      prisma.product.findMany({ select: { id: true, name: true, price: true, stock: true, onDemand: true, domain: true, type: true } }),
      (prisma as any).order.findMany({
        select: { id: true, total: true, status: true, date: true, items: true },
        orderBy: { date: "desc" },
        take: 200,
      }),
      (prisma as any).abandonedCart.findMany({
        where: { recovered: false },
        select: { total: true, createdAt: true, email: true },
      }),
      (prisma as any).newsletter.count({ where: { active: true } }),
      (prisma as any).wishlist.findMany({ select: { items: true } }),
    ]);

    // === ANALIZĂ PRODUSE ===
    const lowStockProducts = products
      .filter((p: any) => p.stock > 0 && p.stock <= 5 && !p.onDemand)
      .map((p: any) => ({ id: p.id, name: p.name, stock: p.stock }));

    const outOfStockProducts = products
      .filter((p: any) => p.stock === 0 && !p.onDemand)
      .map((p: any) => ({ id: p.id, name: p.name }));

    // Produse populare (din wishlist-uri)
    const wishlistCounts: Record<number, { name: string; count: number }> = {};
    for (const wl of wishlists) {
      const items = Array.isArray(wl.items) ? wl.items : [];
      for (const item of items) {
        if (item.id) {
          if (!wishlistCounts[item.id]) {
            wishlistCounts[item.id] = { name: item.name || `Produs #${item.id}`, count: 0 };
          }
          wishlistCounts[item.id].count++;
        }
      }
    }
    const popularInWishlist = Object.entries(wishlistCounts)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 10)
      .map(([id, data]) => ({ id: Number(id), ...data }));

    // === ANALIZĂ COMENZI ===
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const recentOrders = orders.filter((o: any) => new Date(o.date) >= thirtyDaysAgo);
    const previousOrders = orders.filter((o: any) => {
      const d = new Date(o.date);
      return d >= sixtyDaysAgo && d < thirtyDaysAgo;
    });

    const recentRevenue = recentOrders.reduce((sum: number, o: any) => sum + (Number(o.total) || 0), 0);
    const previousRevenue = previousOrders.reduce((sum: number, o: any) => sum + (Number(o.total) || 0), 0);
    const revenueGrowth = previousRevenue > 0 ? ((recentRevenue - previousRevenue) / previousRevenue * 100) : 0;

    // Top produse vândute
    const productSales: Record<string, { name: string; qty: number; revenue: number }> = {};
    for (const order of orders) {
      const orderItems = Array.isArray(order.items) ? order.items : [];
      for (const item of orderItems) {
        const key = item.name || item.id || "Unknown";
        if (!productSales[key]) {
          productSales[key] = { name: key, qty: 0, revenue: 0 };
        }
        productSales[key].qty += Number(item.quantity || item.qty || 1);
        productSales[key].revenue += (Number(item.price) || 0) * (Number(item.quantity || item.qty || 1));
      }
    }
    const topSelling = Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Domenii performante
    const domainRevenue: Record<string, number> = {};
    for (const order of recentOrders) {
      const items = Array.isArray(order.items) ? order.items : [];
      for (const item of items) {
        const prod = products.find((p: any) => p.id === item.id || p.name === item.name);
        const domain = prod?.domain || "Altele";
        domainRevenue[domain] = (domainRevenue[domain] || 0) + (Number(item.price) || 0) * (Number(item.quantity || item.qty || 1));
      }
    }
    const topDomains = Object.entries(domainRevenue)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([domain, revenue]) => ({ domain, revenue: Math.round(revenue) }));

    // === COȘURI ABANDONATE ===
    const abandonedTotal = abandonedCarts.reduce((sum: number, c: any) => sum + (Number(c.total) || 0), 0);
    
    // === RECOMANDĂRI AI ===
    const recommendations: string[] = [];

    if (lowStockProducts.length > 0) {
      recommendations.push(`⚠️ ${lowStockProducts.length} produse au stoc sub 5 unități — recomand reaprovizionare urgent.`);
    }
    if (outOfStockProducts.length > 0) {
      recommendations.push(`🔴 ${outOfStockProducts.length} produse sunt fără stoc — clienții nu le pot cumpăra.`);
    }
    if (revenueGrowth > 10) {
      recommendations.push(`📈 Vânzările au crescut cu ${revenueGrowth.toFixed(0)}% față de luna anterioară — excelent!`);
    } else if (revenueGrowth < -10) {
      recommendations.push(`📉 Vânzările au scăzut cu ${Math.abs(revenueGrowth).toFixed(0)}% — recomand promoții sau campanii email.`);
    }
    if (abandonedCarts.length > 5) {
      recommendations.push(`🛒 ${abandonedCarts.length} coșuri abandonate (${abandonedTotal.toFixed(0)} RON) — activați emailurile automate de recuperare.`);
    }
    if (popularInWishlist.length > 0 && popularInWishlist[0].count >= 3) {
      recommendations.push(`❤️ "${popularInWishlist[0].name}" e în ${popularInWishlist[0].count} wishlist-uri — poate merita un preț promoțional.`);
    }
    if (topSelling.length > 0) {
      recommendations.push(`🏆 Cel mai vândut: "${topSelling[0].name}" (${topSelling[0].qty} buc, ${topSelling[0].revenue.toFixed(0)} RON) — asigurați stocul.`);
    }
    if (newsletters > 0) {
      recommendations.push(`📧 ${newsletters} abonați newsletter activi — trimiteți campanii regulate cu oferte.`);
    }

    return NextResponse.json({
      overview: {
        totalProducts: products.length,
        totalOrders: orders.length,
        recentOrders: recentOrders.length,
        recentRevenue: Math.round(recentRevenue),
        revenueGrowth: Math.round(revenueGrowth),
        activeNewsletters: newsletters,
        abandonedCarts: abandonedCarts.length,
        abandonedValue: Math.round(abandonedTotal),
      },
      alerts: {
        lowStock: lowStockProducts,
        outOfStock: outOfStockProducts,
      },
      analytics: {
        topSelling,
        topDomains,
        popularInWishlist,
      },
      recommendations,
    });
  } catch (error) {
    console.error("[AI ADMIN INSIGHTS] Error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
