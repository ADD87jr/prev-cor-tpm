import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const orders = await prisma.order.findMany({ include: { user: true } });
  // Export CSV
  const header = ["ID","Data","Client","Email","Produse","Total"];
  const rows = orders.map((o: any) => [
    o.id,
    o.date.toISOString(),
    o.user?.name || "",
    o.user?.email || "",
    Array.isArray(o.items) ? o.items.map((i: any) => `${i.name} x${i.quantity}`).join("; ") : JSON.stringify(o.items),
    o.total
  ]);
  const csv = [header, ...rows].map((r: any[]) => r.map((x: any) => `"${String(x).replace(/"/g,'""')}"`).join(",")).join("\r\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": "attachment; filename=comenzi.csv"
    }
  });
}
