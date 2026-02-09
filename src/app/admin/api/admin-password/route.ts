import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { adminAuthMiddleware } from "@/lib/auth-middleware";
import { auditDataChange } from "@/lib/audit-logger";
import { getClientIp } from "@/lib/rate-limit";
import { verifyCsrfMiddleware } from "@/lib/csrf-token";

const ENV_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

// POST: Change admin password
export async function POST(req: NextRequest) {
  // Protejare autentificare
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;

  // Protejare CSRF
  const csrfError = await verifyCsrfMiddleware(req, "admin");
  if (!csrfError.valid) {
    return NextResponse.json(
      { error: csrfError.error || "CSRF validation failed" },
      { status: 403 }
    );
  }

  try {
    const { currentPassword, newPassword } = await req.json();
    
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Toate câmpurile sunt obligatorii" },
        { status: 400 }
      );
    }
    
    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "Parola nouă trebuie să aibă minim 6 caractere" },
        { status: 400 }
      );
    }
    
    // Verify current password
    const adminSetting = await prisma.siteSettings.findUnique({
      where: { key: "adminPassword" }
    });
    
    let isCurrentValid = false;
    
    if (adminSetting?.value) {
      // Compare with hashed password from DB
      isCurrentValid = await bcrypt.compare(currentPassword, adminSetting.value);
    } else {
      // Compare with .env password
      isCurrentValid = currentPassword === ENV_ADMIN_PASSWORD;
    }
    
    if (!isCurrentValid) {
      await auditDataChange("admin", "update", "admin_password", "admin",
        "Failed - incorrect current password",
        getClientIp(req)
      );
      return NextResponse.json(
        { error: "Parola curentă este greșită" },
        { status: 401 }
      );
    }
    
    // Hash new password and save
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    await prisma.siteSettings.upsert({
      where: { key: "adminPassword" },
      update: { value: hashedPassword, updatedAt: new Date() },
      create: { key: "adminPassword", value: hashedPassword }
    });

    // Log the change
    await auditDataChange("admin", "update", "admin_password", "admin",
      "Admin password changed successfully",
      getClientIp(req)
    );
    
    return NextResponse.json({ 
      success: true, 
      message: "Parola admin a fost schimbată cu succes" 
    });
  } catch (error) {
    console.error("[ADMIN PASSWORD] Error:", error);
    return NextResponse.json(
      { error: "Eroare la schimbarea parolei" },
      { status: 500 }
    );
  }
}
