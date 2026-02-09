import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "../send-email";
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

    const subject = `Cerere contact de la ${cleanPrenume} ${cleanNume}`;
    const html = `
      <h2>Formular Contact Website</h2>
      <p><b>Nume:</b> ${cleanPrenume} ${cleanNume}</p>
      <p><b>Email:</b> ${cleanEmail}</p>
      <p><b>Companie:</b> ${cleanCompanie}</p>
      <p><b>Serviciu dorit:</b> ${cleanServiciu}</p>
      <p><b>Mesaj:</b><br/>${cleanMesaj.replace(/\n/g, '<br/>')}</p>
    `;
    const text = `Formular Contact Website\nNume: ${cleanPrenume} ${cleanNume}\nEmail: ${cleanEmail}\nCompanie: ${cleanCompanie}\nServiciu dorit: ${cleanServiciu}\nMesaj:\n${cleanMesaj}`;

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
        to: process.env.CONTACT_EMAIL || "office@prev-cor-tpm.ro",
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
