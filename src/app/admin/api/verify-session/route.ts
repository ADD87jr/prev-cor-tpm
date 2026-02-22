import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/auth-middleware";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { valid } = await verifyAdminSession(req);
  return NextResponse.json({ valid });
}
