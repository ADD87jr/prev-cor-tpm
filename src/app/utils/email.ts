import nodemailer from "nodemailer";

export async function sendEmail({ to, subject, text, html, attachments }: {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  attachments?: any[];
}) {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.ethereal.email",
      port: Number(process.env.SMTP_PORT) || 587,
      auth: {
        user: process.env.SMTP_USER || "demo@ethereal.email",
        pass: process.env.SMTP_PASS || "demo"
      }
    });
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@prevcor.ro',
      to,
      subject,
      text,
      html,
      attachments
    });
    console.log('[EMAIL] Email trimis:', info);
    if (info.rejected && info.rejected.length > 0) {
      console.error('[EMAIL] Email REJECTED de serverul SMTP:', info.rejected);
    }
    if (info.response) {
      console.log('[EMAIL] Răspuns SMTP:', info.response);
    }
    return info;
  } catch (err) {
    console.error('[EMAIL] Eroare la trimitere:', err);
    if (err && typeof err === 'object' && 'response' in err) {
      console.error('[EMAIL] Detalii răspuns SMTP:', (err as any).response);
    }
    throw err;
  }
}
