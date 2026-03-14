import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/app/utils/email";
import { generateContactFormPdfBuffer } from "../../utils/contactFormPdf";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { sanitizeInput, sanitizeName, sanitizeEmail } from "@/lib/sanitize";
import { checkHoneypot } from "@/lib/honeypot";

export async function POST(req: NextRequest) {
  // Rate limit: max 5 mesaje pe oră per IP
  const ip = getClientIp(req);
  const rateLimitError = checkRateLimit(req, `contact:${ip}`, 5, 60 * 60 * 1000);
  if (rateLimitError) return rateLimitError;

  try {
    console.log("[CONTACT] Request primit la /api/contact");
    const data = await req.json();

    // Honeypot check - bot detection
    const honeypotCheck = checkHoneypot(data);
    if (honeypotCheck.isBot) {
      console.log("[CONTACT] Bot detected via honeypot");
      // Return success to not alert the bot
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }

    const { prenume, nume, email, companie, serviciu, mesaj } = data;
    console.log("[CONTACT] Date primite:", data);

    if (!prenume || !nume || !email || !serviciu || !mesaj) {
      console.log("[CONTACT] Lipsesc câmpuri obligatorii");
      return new Response(JSON.stringify({ error: "Toate câmpurile obligatorii trebuie completate." }), { status: 400 });
    }

    // Sanitize all inputs
    const cleanPrenume = sanitizeName(prenume);
    const cleanNume = sanitizeName(nume);
    const cleanEmail = sanitizeEmail(email);
    const cleanCompanie = companie ? sanitizeInput(companie) : "-";
    const cleanServiciu = sanitizeInput(serviciu);
    const cleanMesaj = sanitizeInput(mesaj);

    if (!cleanPrenume || !cleanNume || cleanPrenume.length < 2 || cleanNume.length < 2) {
      return new Response(JSON.stringify({ error: "Numele trebuie să aibă minim 2 caractere." }), { status: 400 });
    }

    if (!cleanEmail || !cleanEmail.includes("@")) {
      return new Response(JSON.stringify({ error: "Adresa de email este invalidă." }), { status: 400 });
    }

    const subject = `Cerere ofertă de la ${cleanPrenume} ${cleanNume}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a56db; border-bottom: 2px solid #1a56db; padding-bottom: 10px;">📬 Cerere Ofertă - Website</h2>
        
        <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 15px 0;">
          <h3 style="margin: 0 0 10px 0; color: #374151;">👤 Date solicitant</h3>
          <p style="margin: 5px 0;"><b>Nume:</b> ${cleanPrenume} ${cleanNume}</p>
          <p style="margin: 5px 0;"><b>Email:</b> <a href="mailto:${cleanEmail}">${cleanEmail}</a></p>
          <p style="margin: 5px 0;"><b>Companie:</b> ${cleanCompanie}</p>
        </div>
        
        <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #f59e0b;">
          <h3 style="margin: 0 0 10px 0; color: #92400e;">📋 Solicitare</h3>
          <p style="margin: 5px 0;"><b>Serviciu:</b> ${cleanServiciu}</p>
        </div>
        
        <div style="background: #fff; padding: 15px; border: 1px solid #e5e7eb; border-radius: 8px; margin: 15px 0;">
          <h3 style="margin: 0 0 10px 0; color: #374151;">💬 Detalii solicitare</h3>
          <div style="white-space: pre-line; color: #4b5563;">${cleanMesaj}</div>
        </div>
        
        <p style="font-size: 12px; color: #9ca3af; text-align: center; margin-top: 20px;">
          Acest mesaj a fost trimis automat de pe website-ul PREV-COR TPM.
        </p>
      </div>
    `;
    const text = `Cerere Ofertă - Website\n\nNume: ${cleanPrenume} ${cleanNume}\nEmail: ${cleanEmail}\nCompanie: ${cleanCompanie}\n\nServiciu: ${cleanServiciu}\n\nDetalii:\n${cleanMesaj}`;

    // Generează PDF cu datele formularului
    let pdfBuffer: Buffer;
    try {
      pdfBuffer = await generateContactFormPdfBuffer({ 
        prenume: cleanPrenume, 
        nume: cleanNume, 
        email: cleanEmail, 
        companie: cleanCompanie, 
        serviciu: cleanServiciu, 
        mesaj: cleanMesaj 
      });
      console.log("[CONTACT] PDF generat cu succes");
    } catch (pdfErr) {
      console.error("[CONTACT] Eroare la generare PDF:", pdfErr);
      return new Response(JSON.stringify({ error: "Eroare la generarea PDF-ului." }), { status: 500 });
    }

    try {
      await sendEmail({
        to: process.env.CONTACT_EMAIL || "office@prevcortpm.ro",
        subject,
        text,
        html,
        attachments: [
          {
            filename: `Formular-contact-${cleanPrenume}-${cleanNume}.pdf`,
            content: pdfBuffer,
          },
        ],
      });
      console.log("[CONTACT] Email trimis cu succes");
    } catch (mailErr) {
      console.error("[CONTACT] Eroare la trimitere email:", mailErr);
      return new Response(JSON.stringify({ error: "Eroare la trimiterea emailului." }), { status: 500 });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    console.error("[CONTACT] Eroare generală:", err);
    return new Response(JSON.stringify({ error: "Eroare la trimiterea emailului." }), { status: 500 });
  }
}
