import { NextRequest, NextResponse } from "next/server";

// Simulare calcul cost curier rapid (ex: Fan Courier, Sameday, Cargus)
export async function POST(req: NextRequest) {
  const { address, items } = await req.json();
  if (!address || !items) {
    return NextResponse.json({ error: "Date lipsă" }, { status: 400 });
  }
  // Simulare: cost fix + cost per kg (greutate simulată după preț)
  const base = 25; // lei
  const kg = items.reduce((sum: number, item: any) => sum + Math.max(1, Math.round(item.price / 100)), 0);
  const cost = base + kg * 2.5;
  // Simulare AWB
  const awb = "AWB" + Math.floor(Math.random() * 1000000);
  return NextResponse.json({ cost, awb });
}
