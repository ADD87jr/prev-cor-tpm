import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { adminAuthMiddleware } from "@/lib/auth-middleware";
import { auditDataChange } from "@/lib/audit-logger";
import { getClientIp } from "@/lib/rate-limit";
import { verifyCsrfMiddleware } from "@/lib/csrf-token";
import { validatePassword, getPasswordRequirements } from "@/lib/password-policy";
import { sanitizeEmail } from "@/lib/sanitize";
import { alertPasswordChange } from "@/lib/security-alerts";

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
    const { email, parolaNoua } = await req.json();

    if (!email || !parolaNoua) {
      return NextResponse.json(
        { error: "Email și parola sunt obligatorii" },
        { status: 400 }
      );
    }

    // Validate password with policy
    const passwordValidation = validatePassword(parolaNoua);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: passwordValidation.errors.join(". "), hint: getPasswordRequirements() },
        { status: 400 }
      );
    }

    const cleanEmail = sanitizeEmail(email);

    // Verifică dacă utilizatorul există
    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Utilizatorul nu a fost găsit" },
        { status: 404 }
      );
    }

    // Hash-uiește noua parolă
    const hashedPassword = await bcrypt.hash(parolaNoua, 10);

    // Actualizează parola în baza de date
    await prisma.user.update({
      where: { email: cleanEmail },
      data: { password: hashedPassword },
    });

    // Log the change
    await auditDataChange("admin", "update", "user_password", String(user.id),
      `Password changed for user: ${cleanEmail}`,
      getClientIp(req)
    );

    // Send security alert
    await alertPasswordChange(cleanEmail, getClientIp(req));

    return NextResponse.json({ success: true, message: "Parola a fost schimbată" });
  } catch (error) {
    console.error("[ADMIN] Eroare la schimbarea parolei:", error);
    return NextResponse.json(
      { error: "Eroare la schimbarea parolei" },
      { status: 500 }
    );
  }
}
