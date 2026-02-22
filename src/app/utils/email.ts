import { Resend } from 'resend';

// Inițializare Resend doar dacă avem API key (pentru dezvoltare locală fără email)
const resend = process.env.RESEND_API_KEY 
  ? new Resend(process.env.RESEND_API_KEY) 
  : null;

export async function sendEmail({ to, subject, text, html, attachments }: {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  attachments?: { filename: string; content: Buffer }[];
}) {
  try {
    // Skip email sending in development if no API key
    if (!resend) {
      console.log('[EMAIL] Skipping email (no RESEND_API_KEY):', { to, subject });
      return { id: 'dev-skipped', message: 'Email skipped in development' };
    }

    const fromEmail = process.env.EMAIL_FROM || 'office@prevcortpm.ro';
    const fromName = process.env.EMAIL_FROM_NAME || 'Prev-Cor TPM';
    
    const emailData: any = {
      from: `${fromName} <${fromEmail}>`,
      to: [to],
      subject,
    };
    
    if (html) emailData.html = html;
    if (text) emailData.text = text;
    
    // Convert attachments to Resend format
    if (attachments && attachments.length > 0) {
      emailData.attachments = attachments.map(att => ({
        filename: att.filename,
        content: att.content,
      }));
    }
    
    const { data, error } = await resend.emails.send(emailData);
    
    if (error) {
      console.error('[EMAIL] Eroare Resend:', error);
      throw new Error(error.message);
    }
    
    console.log('[EMAIL] Email trimis cu succes via Resend:', data);
    return data;
  } catch (err) {
    console.error('[EMAIL] Eroare la trimitere:', err);
    throw err;
  }
}
