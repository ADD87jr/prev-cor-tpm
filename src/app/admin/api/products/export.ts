import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const products = await prisma.product.findMany();
  // Export CSV
  const header = ["ID","Nume","Preț","Stoc","Tip","Domeniu","Descriere"];
  const rows = products.map((p: any) => [
    p.id,
    p.name,
    p.price,
    p.stock,
    p.type,
    p.domain,
    p.description
  ]);
  const csv = [header, ...rows].map(r => r.map((x: any) => `"${String(x).replace(/"/g,'""')}"`).join(",")).join("\r\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": "attachment; filename=produse.csv"
    }
  });
}
