import { NextRequest, NextResponse } from "next/server";
import { adminAuthMiddleware } from "@/lib/auth-middleware";
import { generateTOTPSecret, generateTOTPUri, verifyTOTPCode, enable2FA, disable2FA, is2FAEnabled, get2FASecret } from "@/lib/totp-2fa";
import { auditDataChange } from "@/lib/audit-logger";
import { getClientIp } from "@/lib/rate-limit";
import QRCode from "qrcode";

/**
 * GET /admin/api/2fa - Get 2FA status
 */
export async function GET(req: NextRequest) {
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;

  const enabled = await is2FAEnabled();
  
  return NextResponse.json({ enabled });
}

/**
 * POST /admin/api/2fa - Setup/Enable 2FA
 * Body: { action: "setup" } - Generate new secret
 * Body: { action: "enable", code: "123456" } - Verify code and enable
 * Body: { action: "disable", code: "123456" } - Verify code and disable
 */
export async function POST(req: NextRequest) {
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;

  const ip = getClientIp(req);

  try {
    const { action, code } = await req.json();

    if (action === "setup") {
      // Generate new secret for setup
      const secret = generateTOTPSecret();
      const uri = generateTOTPUri(secret, "admin@prev-cor-tpm.ro");
      
      // Generate QR code as base64 image
      const qrCodeDataUrl = await QRCode.toDataURL(uri);
      
      // Store temporarily (in DB for this session)
      const { prisma } = await import("@/lib/prisma");
      await prisma.siteSettings.upsert({
        where: { key: "admin2FASetupSecret" },
        update: { value: secret },
        create: { key: "admin2FASetupSecret", value: secret },
      });
      
      return NextResponse.json({ 
        success: true, 
        secret, 
        uri,
        qrCode: qrCodeDataUrl,
        message: "Scanează codul QR cu Google Authenticator sau Authy"
      });
    }

    if (action === "enable") {
      if (!code) {
        return NextResponse.json({ error: "Cod 2FA necesar" }, { status: 400 });
      }

      // Get setup secret
      const { prisma } = await import("@/lib/prisma");
      const setupSecret = await prisma.siteSettings.findUnique({
        where: { key: "admin2FASetupSecret" },
      });

      if (!setupSecret?.value) {
        return NextResponse.json({ error: "Trebuie să generezi mai întâi un secret" }, { status: 400 });
      }

      // Verify code
      if (!verifyTOTPCode(setupSecret.value, code)) {
        return NextResponse.json({ error: "Cod 2FA invalid" }, { status: 400 });
      }

      // Enable 2FA with the verified secret
      await enable2FA(setupSecret.value);
      
      // Clear setup secret
      await prisma.siteSettings.delete({
        where: { key: "admin2FASetupSecret" },
      }).catch(() => {});
      
      await auditDataChange("admin", "enable", "2fa", "admin", "2FA enabled", ip);
      
      return NextResponse.json({ success: true, message: "2FA activat cu succes!" });
    }

    if (action === "disable") {
      if (!code) {
        return NextResponse.json({ error: "Cod 2FA necesar pentru dezactivare" }, { status: 400 });
      }

      const secret = await get2FASecret();
      if (!secret) {
        return NextResponse.json({ error: "2FA nu este activat" }, { status: 400 });
      }

      // Verify code before disabling
      if (!verifyTOTPCode(secret, code)) {
        return NextResponse.json({ error: "Cod 2FA invalid" }, { status: 400 });
      }

      await disable2FA();
      
      await auditDataChange("admin", "disable", "2fa", "admin", "2FA disabled", ip);
      
      return NextResponse.json({ success: true, message: "2FA dezactivat" });
    }

    return NextResponse.json({ error: "Acțiune invalidă" }, { status: 400 });

  } catch (error) {
    console.error("[2FA API] Error:", error);
    return NextResponse.json({ error: "Eroare server" }, { status: 500 });
  }
}
