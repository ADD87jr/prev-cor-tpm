import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminAuthMiddleware } from "@/lib/auth-middleware";
import { generatePLPdfBuffer } from "@/app/utils/plPdfLib";

// GET /admin/api/raport-pl — Raport Profit & Pierdere
export async function GET(req: NextRequest) {
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  // Facturi (venituri)
  const invoiceWhere: any = {};
  if (from || to) {
    invoiceWhere.createdAt = {};
    if (from) invoiceWhere.createdAt.gte = new Date(from + "T00:00:00");
    if (to) invoiceWhere.createdAt.lte = new Date(to + "T23:59:59");
  }
  const invoices = await prisma.invoice.findMany({ where: invoiceWhere });
  const invoiceOrderIds = invoices.map((i) => i.orderId);
  const orders = await prisma.order.findMany({
    where: { id: { in: invoiceOrderIds } },
  });
  const orderMap = new Map(orders.map((o) => [o.id, o]));

  // Calculăm venitul din facturi
  let totalVenituriFaraTVA = 0;
  let totalTVAColectat = 0;
  let totalVenituri = 0;
  const venituriPeLuni: Record<string, { faraTVA: number; tva: number; cuTVA: number; nrFacturi: number }> = {};

  for (const inv of invoices) {
    const order = orderMap.get(inv.orderId);
    if (!order) continue;

    const items: any[] = typeof order.items === "string" ? JSON.parse(order.items) : (order.items as any[] || []);
    const tvaPercent = typeof order.tva === "number" ? order.tva : 19;
    const courierCost = typeof order.courierCost === "number" ? order.courierCost : 0;

    const subtotalProduse = items.reduce((sum, it) => {
      return sum + (Number(it.price) || 0) * (Number(it.quantity || it.qty) || 1);
    }, 0);
    const subtotal = subtotalProduse + courierCost;
    const tva = subtotal * (tvaPercent / 100);
    const total = subtotal + tva;

    totalVenituriFaraTVA += subtotal;
    totalTVAColectat += tva;
    totalVenituri += total;

    // Grupăm pe luni
    const lunaKey = `${inv.createdAt.getFullYear()}-${String(inv.createdAt.getMonth() + 1).padStart(2, "0")}`;
    if (!venituriPeLuni[lunaKey]) venituriPeLuni[lunaKey] = { faraTVA: 0, tva: 0, cuTVA: 0, nrFacturi: 0 };
    venituriPeLuni[lunaKey].faraTVA += subtotal;
    venituriPeLuni[lunaKey].tva += tva;
    venituriPeLuni[lunaKey].cuTVA += total;
    venituriPeLuni[lunaKey].nrFacturi += 1;
  }

  // Cheltuieli (din SiteSettings JSON)
  let cheltuieli: any[] = [];
  try {
    const cheltuieliSetting = await prisma.siteSettings.findUnique({
      where: { key: "cheltuieli" },
    });
    if (cheltuieliSetting) {
      cheltuieli = JSON.parse(cheltuieliSetting.value);
    }
  } catch { /* ignore */ }

  // Filtrează cheltuieli pe perioadă
  if (from || to) {
    cheltuieli = cheltuieli.filter((c: any) => {
      if (!c.data) return false;
      const d = new Date(c.data);
      if (from && d < new Date(from + "T00:00:00")) return false;
      if (to && d > new Date(to + "T23:59:59")) return false;
      return true;
    });
  }

  const totalCheltuieli = cheltuieli.reduce((s: number, c: any) => s + (Number(c.suma) || 0), 0);

  // Cheltuieli pe luni
  const cheltuieliPeLuni: Record<string, { total: number; count: number }> = {};
  for (const c of cheltuieli) {
    if (!c.data) continue;
    const d = new Date(c.data);
    const lunaKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!cheltuieliPeLuni[lunaKey]) cheltuieliPeLuni[lunaKey] = { total: 0, count: 0 };
    cheltuieliPeLuni[lunaKey].total += Number(c.suma) || 0;
    cheltuieliPeLuni[lunaKey].count += 1;
  }

  // Cheltuieli pe categorii
  const cheltuieliPeCategorie: Record<string, number> = {};
  for (const c of cheltuieli) {
    const cat = c.tip || "Necategorisit";
    cheltuieliPeCategorie[cat] = (cheltuieliPeCategorie[cat] || 0) + (Number(c.suma) || 0);
  }

  // Combinăm lunile
  const allMonths = new Set([...Object.keys(venituriPeLuni), ...Object.keys(cheltuieliPeLuni)]);
  const lunile = Array.from(allMonths).sort().map((luna) => {
    const v = venituriPeLuni[luna] || { faraTVA: 0, tva: 0, cuTVA: 0, nrFacturi: 0 };
    const ch = cheltuieliPeLuni[luna] || { total: 0, count: 0 };
    return {
      luna,
      venituriFaraTVA: Math.round(v.faraTVA * 100) / 100,
      tvaColectat: Math.round(v.tva * 100) / 100,
      venituri: Math.round(v.cuTVA * 100) / 100,
      nrFacturi: v.nrFacturi,
      cheltuieli: Math.round(ch.total * 100) / 100,
      nrCheltuieli: ch.count,
      profit: Math.round((v.faraTVA - ch.total) * 100) / 100,
    };
  });

  const profitNet = totalVenituriFaraTVA - totalCheltuieli;

  const responseData = {
    totalVenituriFaraTVA: Math.round(totalVenituriFaraTVA * 100) / 100,
    totalTVAColectat: Math.round(totalTVAColectat * 100) / 100,
    totalVenituri: Math.round(totalVenituri * 100) / 100,
    totalCheltuieli: Math.round(totalCheltuieli * 100) / 100,
    profitNet: Math.round(profitNet * 100) / 100,
    marjaProfit: totalVenituriFaraTVA > 0 ? Math.round((profitNet / totalVenituriFaraTVA) * 10000) / 100 : 0,
    nrFacturi: invoices.length,
    nrCheltuieli: cheltuieli.length,
    lunile,
    cheltuieliPeCategorie,
  };

  // Export PDF
  const format = searchParams.get("format");
  if (format === "pdf") {
    const pdfBuffer = await generatePLPdfBuffer(responseData, from || undefined, to || undefined);
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="raport-pl-${from || "start"}-${to || "end"}.pdf"`,
      },
    });
  }

  return NextResponse.json(responseData);
}
