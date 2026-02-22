import { jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";

const JWT_SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || "your-super-secret-key-change-this");

// Sesiunea durează 1 an și se reînnoiește automat
const SESSION_DURATION_MS = 365 * 24 * 60 * 60 * 1000; // 1 an

export interface AdminSession {
  adminId: string;
  authenticatedAt: number;
  expiresAt: number;
}

/**
 * Verifică dacă requestul are o sesiune admin validă
 * Caută JWT în: cookie (adminSession), sau header (Authorization: Bearer <token>)
 * Returnează { valid: true, session } sau { valid: false, error }
 */
export async function verifyAdminSession(req: NextRequest): Promise<{ valid: boolean; session?: AdminSession; error?: string }> {
  try {
    // Caută JWT în cookies direct din request
    const token = req.cookies.get("adminSession")?.value;

    if (!token) {
      return { valid: false, error: "No session found" };
    }

    // Verifică validitatea JWT
    const verified = await jwtVerify(token, JWT_SECRET);
    const session = verified.payload as unknown as AdminSession;

    // Verifică expirare
    if (session.expiresAt < Date.now()) {
      return { valid: false, error: "Session expired" };
    }

    return { valid: true, session };
  } catch (err) {
    return { valid: false, error: `Invalid session: ${(err as Error).message}` };
  }
}

/**
 * Middleware pentru protejarea endpoint-urilor admin
 * Trebuie folosit la începutul fiecărui handler admin API
 * Reînnoiește automat sesiunea la fiecare request valid
 */
export async function adminAuthMiddleware(req: NextRequest): Promise<NextResponse | null> {
  const { valid, error, session } = await verifyAdminSession(req);

  if (!valid) {
    // Construiește răspunsul de eroare
    const response = NextResponse.json(
      { error: error || "Unauthorized", requiresReauth: true },
      { status: 401 }
    );
    
    // Dacă eroarea e de verificare semnătură, șterge cookie-ul invalid
    if (error?.includes("signature") || error?.includes("Invalid session")) {
      response.cookies.set("adminSession", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 0,
        path: "/",
      });
    }
    
    return response;
  }

  // Sesiune validă - NU mai reînnoim token-ul (sesiunea e setată la 1 an)
  return null; // null = autentificare reușită, continuă execuția
}

/**
 * Exportă parolei admin din env sau siteSettings
 * OBS: Ar trebui să fie stocată hash-uită în baza de date, nu în env
 */
export function getAdminPassword(): string {
  return process.env.ADMIN_PASSWORD || "admin123"; // SCHIMBĂ ACEASTA!
}
