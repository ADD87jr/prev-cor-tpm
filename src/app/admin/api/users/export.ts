import { NextRequest, NextResponse } from "next/server";
import { getAllUsers } from "../../../account/usersDb";

export async function GET() {
  const users = getAllUsers();
  // Export CSV
  const header = ["ID","Nume","Email","Status"];
  const rows = users.map((u: any) => [u.id, u.name, u.email, u.blocked ? "Blocat" : "Activ"]);
  const csv = [header, ...rows].map(r => r.map(x => `"${String(x).replace(/"/g,'""')}"`).join(",")).join("\r\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": "attachment; filename=utilizatori.csv"
    }
  });
}
