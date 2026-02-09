import { sendEmail } from "./email";

const statusLabels: Record<string, string> = {
  pending: "În așteptare",
  confirmed: "Confirmată",
  processing: "În procesare",
  shipped: "Expediată",
  delivered: "Livrată",
  cancelled: "Anulată",
};

const statusEmojis: Record<string, string> = {
  pending: "⏳",
  confirmed: "✅",
  processing: "🔧",
  shipped: "📦",
  delivered: "🎉",
  cancelled: "❌",
};

interface OrderStatusEmailData {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  newStatus: string;
  awb?: string;
  courierName?: string;
  trackingUrl?: string;
  items?: Array<{ name: string; quantity: number; price: number }>;
  total?: number;
}

export async function sendOrderStatusEmail(data: OrderStatusEmailData) {
  const {
    orderNumber,
    customerName,
    customerEmail,
    newStatus,
    awb,
    courierName,
    trackingUrl,
    items,
    total,
  } = data;

  const statusLabel = statusLabels[newStatus] || newStatus;
  const emoji = statusEmojis[newStatus] || "📋";

  const subject = `${emoji} Comanda #${orderNumber} - ${statusLabel}`;

  let trackingInfo = "";
  if (newStatus === "shipped" && awb) {
    trackingInfo = `
      <div style="background: #e8f5e9; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <h3 style="margin: 0 0 8px 0; color: #2e7d32;">📦 Informații expediere</h3>
        <p style="margin: 4px 0;"><strong>Curier:</strong> ${courierName || "N/A"}</p>
        <p style="margin: 4px 0;"><strong>AWB:</strong> ${awb}</p>
        ${trackingUrl ? `<p style="margin: 8px 0 0 0;"><a href="${trackingUrl}" style="color: #1565c0; text-decoration: none;">🔗 Urmărește coletul</a></p>` : ""}
      </div>
    `;
  }

  let itemsList = "";
  if (items && items.length > 0) {
    const itemsHtml = items.map(i => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${i.name}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${i.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${i.price} RON</td>
      </tr>
    `).join("");

    itemsList = `
      <h3 style="margin: 20px 0 10px 0;">Produse comandate:</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background: #f5f5f5;">
            <th style="padding: 8px; text-align: left;">Produs</th>
            <th style="padding: 8px; text-align: center;">Cantitate</th>
            <th style="padding: 8px; text-align: right;">Preț</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
        ${total ? `
          <tfoot>
            <tr>
              <td colspan="2" style="padding: 8px; font-weight: bold; text-align: right;">Total:</td>
              <td style="padding: 8px; font-weight: bold; text-align: right;">${total} RON</td>
            </tr>
          </tfoot>
        ` : ""}
      </table>
    `;
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
    </head>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; padding: 20px; background: linear-gradient(135deg, #1565c0, #42a5f5); border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0;">PREV-COR TPM</h1>
      </div>
      
      <div style="padding: 20px; background: #fff; border: 1px solid #e0e0e0; border-top: none;">
        <p>Dragă ${customerName || "Client"},</p>
        
        <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0; text-align: center;">
          <p style="margin: 0; font-size: 18px;">${emoji} Comanda ta <strong>#${orderNumber}</strong></p>
          <p style="margin: 8px 0 0 0; font-size: 24px; font-weight: bold; color: #1565c0;">
            ${statusLabel}
          </p>
        </div>
        
        ${trackingInfo}
        
        ${newStatus === "delivered" ? `
          <div style="background: #fff3e0; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p style="margin: 0;">🎉 Sperăm că ești mulțumit(ă) de produsele achiziționate!</p>
            <p style="margin: 8px 0 0 0;">Dacă ai întrebări sau feedback, nu ezita să ne contactezi.</p>
          </div>
        ` : ""}
        
        ${newStatus === "cancelled" ? `
          <div style="background: #ffebee; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p style="margin: 0;">Comanda ta a fost anulată.</p>
            <p style="margin: 8px 0 0 0;">Dacă ai întrebări legate de anulare, te rugăm să ne contactezi.</p>
          </div>
        ` : ""}
        
        ${itemsList}
        
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
        
        <p style="font-size: 14px; color: #666;">
          Poți verifica oricând statusul comenzii accesând:
          <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://prevcortpm.ro'}/track-order" style="color: #1565c0;">
            Urmărire comandă
          </a>
        </p>
        
        <p style="margin-top: 20px;">Cu stimă,<br><strong>Echipa PREV-COR TPM</strong></p>
      </div>
      
      <div style="text-align: center; padding: 16px; background: #f5f5f5; border-radius: 0 0 8px 8px; font-size: 12px; color: #666;">
        <p style="margin: 0;">© ${new Date().getFullYear()} PREV-COR TPM. Toate drepturile rezervate.</p>
      </div>
    </body>
    </html>
  `;

  const text = `
Dragă ${customerName || "Client"},

Comanda #${orderNumber} - ${statusLabel}

${trackingInfo ? `Curier: ${courierName || "N/A"}\nAWB: ${awb}\n` : ""}

Poți verifica statusul comenzii pe: ${process.env.NEXT_PUBLIC_BASE_URL || 'https://prevcortpm.ro'}/track-order

Cu stimă,
Echipa PREV-COR TPM
  `;

  try {
    await sendEmail({
      to: customerEmail,
      subject,
      text,
      html,
    });
    console.log(`[ORDER STATUS EMAIL] Email trimis pentru comanda #${orderNumber} (${newStatus}) către ${customerEmail}`);
    return { success: true };
  } catch (error) {
    console.error(`[ORDER STATUS EMAIL] Eroare la trimitere:`, error);
    return { success: false, error };
  }
}
