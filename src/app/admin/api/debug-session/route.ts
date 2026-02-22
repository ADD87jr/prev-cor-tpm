import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || "your-super-secret-key-change-this");

export async function GET(req: NextRequest) {
  const allCookies = req.cookies.getAll();
  const adminCookie = req.cookies.get("adminSession");
  
  let tokenValid = false;
  let tokenPayload: any = null;
  let tokenError: string | null = null;
  
  if (adminCookie?.value) {
    try {
      const verified = await jwtVerify(adminCookie.value, JWT_SECRET);
      tokenPayload = verified.payload;
      tokenValid = true;
    } catch (err) {
      tokenError = (err as Error).message;
    }
  }
  
  return NextResponse.json({
    cookies: allCookies.map(c => ({ name: c.name, valueLength: c.value.length })),
    hasAdminSession: !!adminCookie,
    adminSessionLength: adminCookie?.value?.length || 0,
    tokenValid,
    tokenPayload,
    tokenError,
    timestamp: new Date().toISOString(),
  });
}
