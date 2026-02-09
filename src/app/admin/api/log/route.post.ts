import { NextRequest, NextResponse } from "next/server";
import { addAdminLog } from "../../adminLogDb";

export async function POST(req: NextRequest) {
  try {
    const { action, details } = await req.json();
    if (!action) return NextResponse.json({ error: "Missing action" }, { status: 400 });
    addAdminLog(action, details);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
