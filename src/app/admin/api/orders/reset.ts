import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { execSync } from "child_process";

export async function POST(req: NextRequest) {
  // Protecție simplă: verifică header secret
  const adminSecret = req.headers.get("x-admin-secret");
  if (adminSecret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    await prisma.order.deleteMany({});
    await prisma.$disconnect();
    // Reset auto-increment pentru SQLite
    execSync(`sqlite3 ./prisma/dev.db "DELETE FROM sqlite_sequence WHERE name='Order';"`);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
