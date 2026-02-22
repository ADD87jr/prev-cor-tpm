import { NextResponse } from "next/server";
import { cookies } from "next/headers";

// Acest endpoint șterge doar cookie-urile NextAuth
// NU șterge adminSession - admin-ul rămâne conectat
export async function POST() {
  const cookieStore = await cookies();
  
  // Lista de cookie-uri NextAuth de șters (fără admin!)
  const cookiesToClear = [
    "next-auth.session-token",
    "__Secure-next-auth.session-token",
    "next-auth.csrf-token",
    "__Host-next-auth.csrf-token",
    "next-auth.callback-url",
    "__Secure-next-auth.callback-url"
  ];

  const response = NextResponse.json({ 
    success: true, 
    message: "Session cookies cleared" 
  });

  // Șterge fiecare cookie
  for (const name of cookiesToClear) {
    response.cookies.set(name, "", {
      expires: new Date(0),
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax"
    });
  }

  return response;
}

export async function GET() {
  return POST();
}
