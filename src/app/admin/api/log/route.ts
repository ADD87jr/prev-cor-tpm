import { NextRequest, NextResponse } from "next/server";
import { getAdminLog } from "../../adminLogDb";
import { adminAuthMiddleware } from "@/lib/auth-middleware";

export async function GET(req: NextRequest) {
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;
  return NextResponse.json(getAdminLog());
}
