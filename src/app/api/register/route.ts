import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { sendEmail } from "@/app/utils/email";
import { getWelcomeEmailHtml } from "@/app/utils/emailTemplates";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { validatePassword, getPasswordRequirements } from "@/lib/password-policy";
import { sanitizeName, sanitizeEmail } from "@/lib/sanitize";
import { checkHoneypot } from "@/lib/honeypot";

export async function POST(req: NextRequest) {
  // Rate limit: max 5 înregistrări pe oră per IP
  const ip = getClientIp(req);
  const rateLimitError = checkRateLimit(req, `register:${ip}`, 5, 60 * 60 * 1000);
  if (rateLimitError) return rateLimitError;

  try {
    const data = await req.json();

    // Honeypot check - bot detection
    const honeypotCheck = checkHoneypot(data);
    if (honeypotCheck.isBot) {
      return NextResponse.json({ success: true, user: { id: 0, name: "", email: "" } });
    }

    const { name, email, password } = data;

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Toate câmpurile sunt obligatorii" }, { status: 400 });
    }

    // Validate password with policy
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return NextResponse.json({ 
        error: passwordValidation.errors.join(". "),
        hint: getPasswordRequirements()
      }, { status: 400 });
    }

    // Sanitize inputs
    const cleanName = sanitizeName(name);
    const cleanEmail = sanitizeEmail(email);

    if (!cleanName || cleanName.length < 2) {
      return NextResponse.json({ error: "Numele trebuie să aibă minim 2 caractere" }, { status: 400 });
    }

    if (!cleanEmail || !cleanEmail.includes("@")) {
      return NextResponse.json({ error: "Adresa de email este invalidă" }, { status: 400 });
    }

    // Verifică dacă emailul există deja
    const existingUser = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existingUser) {
      return NextResponse.json({ error: "Există deja un cont cu acest email" }, { status: 400 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crează utilizatorul
    const user = await prisma.user.create({
      data: {
        name: cleanName,
        email: cleanEmail,
        password: hashedPassword,
        isAdmin: false,
        blocked: false,
      },
    });

    // Trimite email de bun venit (async, nu blocăm răspunsul)
    sendEmail({
      to: cleanEmail,
      subject: "Bine ai venit la PREV-COR TPM! 🎉",
      html: getWelcomeEmailHtml(cleanName),
    }).catch(err => console.error("Eroare la trimiterea email-ului de bun venit:", err));

    return NextResponse.json({ 
      success: true, 
      user: { id: user.id, name: user.name, email: user.email } 
    });
  } catch (error) {
    console.error("Eroare la înregistrare:", error);
    return NextResponse.json({ error: "Eroare la crearea contului" }, { status: 500 });
  }
}
