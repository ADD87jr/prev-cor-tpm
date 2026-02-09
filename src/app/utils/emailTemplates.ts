// Email templates pentru site

export function getWelcomeEmailHtml(userName: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f4f4f4;">
      <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;margin-top:20px;">
        <div style="background:linear-gradient(135deg,#1e40af,#3b82f6);padding:30px;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:28px;">Bine ai venit!</h1>
        </div>
        <div style="padding:30px;">
          <h2 style="color:#1e40af;margin-top:0;">Salut, ${userName}! 👋</h2>
          <p style="color:#333;line-height:1.6;">
            Îți mulțumim că te-ai înregistrat pe <strong>PREV-COR TPM</strong>!
          </p>
          <p style="color:#333;line-height:1.6;">
            Acum poți beneficia de:
          </p>
          <ul style="color:#333;line-height:1.8;">
            <li>✓ Urmărirea comenzilor în timp real</li>
            <li>✓ Istoric complet al achizițiilor</li>
            <li>✓ Lista de favorite personalizată</li>
            <li>✓ Checkout rapid cu datele salvate</li>
            <li>✓ Oferte și promoții exclusive</li>
          </ul>
          <div style="text-align:center;margin:30px 0;">
            <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://prev-cor-tpm.ro'}/magazin" 
               style="display:inline-block;background:#1e40af;color:#fff;padding:14px 30px;border-radius:8px;text-decoration:none;font-weight:bold;">
              Explorează Magazinul
            </a>
          </div>
          <p style="color:#666;font-size:14px;border-top:1px solid #eee;padding-top:20px;margin-top:30px;">
            Dacă ai întrebări, ne poți contacta oricând la 
            <a href="mailto:office@prev-cor-tpm.ro" style="color:#1e40af;">office@prev-cor-tpm.ro</a> 
            sau telefonic la <strong>0735 623 509</strong>.
          </p>
        </div>
        <div style="background:#f8f9fa;padding:20px;text-align:center;font-size:12px;color:#666;">
          <p style="margin:0;">© ${new Date().getFullYear()} PREV-COR TPM - Soluții Inteligente de Automatizare Industrială</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function getShippingEmailHtml(
  userName: string,
  orderNumber: string,
  awb: string,
  courierName: string,
  trackingUrl: string,
  items: Array<{ name: string; quantity: number }>
): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f4f4f4;">
      <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;margin-top:20px;">
        <div style="background:linear-gradient(135deg,#7c3aed,#a855f7);padding:30px;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:28px;">📦 Comanda ta e pe drum!</h1>
        </div>
        <div style="padding:30px;">
          <h2 style="color:#7c3aed;margin-top:0;">Salut, ${userName}!</h2>
          <p style="color:#333;line-height:1.6;">
            Vești bune! Comanda ta <strong>#${orderNumber}</strong> a fost expediată și este în drum spre tine.
          </p>
          
          <div style="background:#f3e8ff;border-radius:8px;padding:20px;margin:20px 0;">
            <h3 style="color:#7c3aed;margin-top:0;">Detalii expediere:</h3>
            <table style="width:100%;border-collapse:collapse;">
              <tr>
                <td style="padding:8px 0;color:#666;">Curier:</td>
                <td style="padding:8px 0;font-weight:bold;color:#333;">${courierName}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;color:#666;">AWB:</td>
                <td style="padding:8px 0;font-weight:bold;color:#333;font-family:monospace;">${awb}</td>
              </tr>
            </table>
          </div>
          
          <div style="text-align:center;margin:30px 0;">
            <a href="${trackingUrl}" 
               target="_blank"
               style="display:inline-block;background:#7c3aed;color:#fff;padding:14px 30px;border-radius:8px;text-decoration:none;font-weight:bold;">
              🔍 Urmărește Coletul
            </a>
          </div>
          
          <div style="background:#f9fafb;border-radius:8px;padding:15px;margin:20px 0;">
            <h4 style="color:#333;margin-top:0;">Produse în colet:</h4>
            ${items.map(item => `
              <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #eee;">
                <span style="color:#333;">${item.name}</span>
                <span style="color:#666;">x${item.quantity}</span>
              </div>
            `).join('')}
          </div>
          
          <p style="color:#666;font-size:14px;line-height:1.6;">
            <strong>Timp estimat de livrare:</strong> 1-3 zile lucrătoare<br>
            Curierul te va contacta telefonic înainte de livrare.
          </p>
          
          <p style="color:#666;font-size:14px;border-top:1px solid #eee;padding-top:20px;margin-top:30px;">
            Pentru orice întrebare, contactează-ne la 
            <a href="mailto:office@prev-cor-tpm.ro" style="color:#7c3aed;">office@prev-cor-tpm.ro</a>
          </p>
        </div>
        <div style="background:#f8f9fa;padding:20px;text-align:center;font-size:12px;color:#666;">
          <p style="margin:0;">© ${new Date().getFullYear()} PREV-COR TPM - Soluții Inteligente de Automatizare Industrială</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function getPasswordResetEmailHtml(userName: string, resetLink: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f4f4f4;">
      <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;margin-top:20px;">
        <div style="background:linear-gradient(135deg,#dc2626,#f87171);padding:30px;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:28px;">🔐 Resetare parolă</h1>
        </div>
        <div style="padding:30px;">
          <h2 style="color:#dc2626;margin-top:0;">Salut, ${userName}!</h2>
          <p style="color:#333;line-height:1.6;">
            Ai solicitat resetarea parolei pentru contul tău PREV-COR TPM.
          </p>
          <p style="color:#333;line-height:1.6;">
            Apasă butonul de mai jos pentru a-ți seta o parolă nouă:
          </p>
          <div style="text-align:center;margin:30px 0;">
            <a href="${resetLink}" 
               style="display:inline-block;background:#dc2626;color:#fff;padding:14px 30px;border-radius:8px;text-decoration:none;font-weight:bold;">
              Resetează Parola
            </a>
          </div>
          <p style="color:#666;font-size:14px;">
            Acest link este valabil 1 oră. Dacă nu ai solicitat resetarea parolei, poți ignora acest email.
          </p>
          <p style="color:#666;font-size:14px;border-top:1px solid #eee;padding-top:20px;margin-top:30px;">
            Pentru securitatea contului tău, nu partaja acest link cu nimeni.
          </p>
        </div>
        <div style="background:#f8f9fa;padding:20px;text-align:center;font-size:12px;color:#666;">
          <p style="margin:0;">© ${new Date().getFullYear()} PREV-COR TPM</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
