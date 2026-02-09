import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/app/utils/email";
import crypto from "crypto";

// Stocare temporară pentru token-uri de resetare (în producție ar trebui să fie în DB)
const resetTokens = new Map<string, { email: string; expires: Date }>();

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    
    if (!email) {
      return NextResponse.json({ error: "Email necesar" }, { status: 400 });
    }

    // Verifică dacă utilizatorul există
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Răspundem cu succes chiar dacă utilizatorul nu există (securitate)
    if (!user) {
      return NextResponse.json({ 
        success: true, 
        message: "Dacă emailul există în baza de date, vei primi un email." 
      });
    }

    // Generează token de resetare
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 3600000); // 1 oră validitate
    
    // Stochează token-ul
    resetTokens.set(token, { email: user.email, expires });

    // Trimite email cu link de resetare
    const resetUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
    
    await sendEmail({
      to: user.email,
      subject: "Resetare parolă - PREV-COR TPM",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2563eb;">Resetare parolă</h2>
          <p>Salut ${user.name || 'utilizator'},</p>
          <p>Ai solicitat resetarea parolei pentru contul tău pe PREV-COR TPM.</p>
          <p>Click pe butonul de mai jos pentru a seta o parolă nouă:</p>
          <a href="${resetUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold;">
            Resetează parola
          </a>
          <p style="font-size: 14px; color: #666;">
            Link-ul este valid pentru 1 oră. Dacă nu ai solicitat resetarea parolei, ignoră acest email.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #999;">PREV-COR TPM - Echipamente electrice și automatizări industriale</p>
        </div>
      `,
      text: `Resetare parolă PREV-COR TPM\n\nAccesează acest link pentru a reseta parola: ${resetUrl}\n\nLink-ul este valid pentru 1 oră.`,
    });

    return NextResponse.json({ 
      success: true, 
      message: "Email de resetare trimis" 
    });
  } catch (error: any) {
    console.error("Error in forgot password:", error);
    return NextResponse.json({ error: "Eroare la procesare" }, { status: 500 });
  }
}

// Export pentru validare token (folosit de reset-password)
export { resetTokens };
