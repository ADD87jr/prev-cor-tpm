import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { auditLoginFailure, auditLoginSuccess } from "@/lib/audit-logger";
import { checkIPBlockMiddleware, recordFailedAttempt, clearFailedAttempts, getFailedAttemptsCount } from "@/lib/ip-blocking";
import { alertMultipleFailedLogins, alertAdminLogin } from "@/lib/security-alerts";
import { is2FAEnabled, get2FASecret, verifyTOTPCode } from "@/lib/totp-2fa";

const JWT_SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || "your-super-secret-key-change-this");
const ENV_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

export async function POST(req: NextRequest) {
  const clientIp = getClientIp(req);
  const userAgent = req.headers.get("user-agent") || "unknown";

  try {
    // Check if IP is blocked
    const ipBlockError = checkIPBlockMiddleware(req);
    if (ipBlockError) {
      await auditLoginFailure("IP blocked", clientIp, userAgent);
      return ipBlockError;
    }
    
    // Rate limit: max 5 attempt-uri pe 15 minute per IP
    const rateLimitCheck = checkRateLimit(req, `admin-login:${clientIp}`, 5, 15 * 60 * 1000);
    if (rateLimitCheck) {
      await auditLoginFailure("Rate limit exceeded", clientIp, userAgent);
      return rateLimitCheck;
    }

    const { password, totpCode } = await req.json();

    if (!password) {
      await auditLoginFailure("No password provided", clientIp, userAgent);
      return NextResponse.json({ error: "Parolă necesară" }, { status: 400 });
    }

    // Check database first for hashed password
    const adminSetting = await prisma.siteSettings.findUnique({
      where: { key: "adminPassword" },
    });

    let isValid = false;

    if (adminSetting?.value) {
      // Compare with hashed password from DB
      isValid = await bcrypt.compare(password, adminSetting.value);
    } else {
      // Fallback to .env password
      isValid = password === ENV_ADMIN_PASSWORD;
    }

    if (!isValid) {
      // Record failed attempt for IP blocking
      const shouldBlock = recordFailedAttempt(clientIp, "invalid_password");
      const attempts = getFailedAttemptsCount(clientIp);
      
      await auditLoginFailure("Invalid password", clientIp, userAgent);
      
      // Send alert if multiple failed attempts
      await alertMultipleFailedLogins(clientIp, attempts, userAgent);
      
      if (shouldBlock) {
        return NextResponse.json({ error: "Prea multe încercări. IP-ul a fost blocat temporar." }, { status: 403 });
      }
      
      return NextResponse.json({ error: "Parolă greșită" }, { status: 401 });
    }

    // Check 2FA if enabled
    const twoFAEnabled = await is2FAEnabled();
    if (twoFAEnabled) {
      if (!totpCode) {
        return NextResponse.json({ 
          error: "Cod 2FA necesar", 
          requires2FA: true 
        }, { status: 401 });
      }

      const secret = await get2FASecret();
      if (!secret || !verifyTOTPCode(secret, totpCode)) {
        await auditLoginFailure("Invalid 2FA code", clientIp, userAgent);
        return NextResponse.json({ error: "Cod 2FA invalid" }, { status: 401 });
      }
    }

    // Clear failed attempts on successful login
    clearFailedAttempts(clientIp);

    // Generează JWT token (valid 30 minute pentru securitate)
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minute
    const adminId = "admin"; // OBS: Ar trebui să folosești un ID real

    const token = await new SignJWT({ adminId, authenticatedAt: Date.now(), expiresAt: expiresAt.getTime() })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime(expiresAt)
      .sign(JWT_SECRET);

    // Stocheaza sesiunea în baza de date
    await prisma.adminSession.create({
      data: {
        adminId,
        token,
        expiresAt,
        ipAddress: clientIp,
        userAgent,
      },
    });

    // Logheza succesul
    await auditLoginSuccess(adminId, clientIp, userAgent);
    
    // Send security alert for successful login
    await alertAdminLogin(clientIp, userAgent);

    // Setează cookie HTTP-only cu token-ul JWT
    const response = NextResponse.json({ success: true, message: "Autentificat cu succes" });
    response.cookies.set("adminSession", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 30 * 60, // 30 minute
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("[AUTH] Error:", error);
    const clientIp = getClientIp(req);
    await auditLoginFailure(`Server error: ${(error as Error).message}`, clientIp);
    return NextResponse.json({ error: "Eroare server" }, { status: 500 });
  }
}

/**
 * GET /admin/api/auth - Verifică dacă userul e autentificat
 */
export async function GET(req: NextRequest) {
  try {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const token = cookieStore.get("adminSession")?.value;

    if (!token) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    // Verifică validitatea token-ul din DB
    const session = await prisma.adminSession.findUnique({
      where: { token },
    });

    if (!session || session.expiresAt < new Date()) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    return NextResponse.json({ authenticated: true, adminId: session.adminId });
  } catch (error) {
    console.error("[AUTH GET] Error:", error);
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}

/**
 * DELETE /admin/api/auth - Logout
 */
export async function DELETE(req: NextRequest) {
  try {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const token = cookieStore.get("adminSession")?.value;

    if (token) {
      // Șterge sesiunea din baza de date
      await prisma.adminSession.delete({
        where: { token },
      }).catch(() => {}); // Ignora dacă nu există
    }

    const response = NextResponse.json({ success: true, message: "Deconectat cu succes" });
    response.cookies.delete("adminSession");

    return response;
  } catch (error) {
    console.error("[LOGOUT] Error:", error);
    return NextResponse.json({ error: "Eroare server" }, { status: 500 });
  }
}

