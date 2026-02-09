import { NextRequest, NextResponse } from "next/server";
import { getAllOrders } from "../../../../account/usersDb";
import { adminAuthMiddleware } from "@/lib/auth-middleware";

export async function GET(req: NextRequest) {
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;
  const orders = getAllOrders();
  // Export CSV
  const header = ["ID","Data","Client","Email","Produse","Total"];
  const rows = orders.map(o => [
    o.id,
    o.date,
    o.user?.name || "",
    o.user?.email || "",
    o.items.map((i: any) => `${i.name} x${i.quantity}`).join("; "),
    o.total
  ]);
  const csv = [header, ...rows].map(r => r.map(x => `"${String(x).replace(/"/g,'""')}"`).join(",")).join("\r\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": "attachment; filename=comenzi.csv"
    }
  });
}
