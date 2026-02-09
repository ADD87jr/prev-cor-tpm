import { NextRequest, NextResponse } from "next/server";
import { getAdminLog } from "../../adminLogDb";

export async function GET() {
  const log = getAdminLog();
  // Export CSV
  const header = ["Data","Acțiune","Detalii"];
  const rows = log.map(l => [
    l.time,
    l.action,
    l.details || ""
  ]);
  const csv = [header, ...rows].map(r => r.map(x => `"${String(x).replace(/"/g,'""')}"`).join(",")).join("\r\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": "attachment; filename=log_admin.csv"
    }
  });
}
