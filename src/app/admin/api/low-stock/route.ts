import { NextRequest, NextResponse } from "next/server";
import { getLowStockProducts } from "../../productsDb";
import { sendEmail } from "../../../utils/email";
import { adminAuthMiddleware } from "@/lib/auth-middleware";

export async function GET(req: NextRequest) {
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;
  const lowStock = getLowStockProducts();
  return NextResponse.json(lowStock);
}

export async function POST(req: NextRequest) {
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;
  const { email } = await req.json();
  const lowStock = getLowStockProducts();
  if (email && lowStock.length > 0) {
    await sendEmail({
      to: email,
      subject: "Avertizare stoc scăzut produse",
      text: `Următoarele produse au stoc scăzut: \n` + lowStock.map(p => `${p.name} (stoc: ${p.stock})`).join("\n")
    });
    return NextResponse.json({ success: true });
  }
  return NextResponse.json({ error: "Nicio notificare trimisă" }, { status: 400 });
}
