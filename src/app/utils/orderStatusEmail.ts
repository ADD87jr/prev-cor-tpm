import { sendEmail } from "./email";
import { getCartSettings } from "@/lib/getTvaPercent";

const statusLabels: Record<string, string> = {
  pending: "În așteptare",
  confirmed: "Confirmată",
  processing: "În procesare",
  shipped: "Expediată",
  expediată: "Expediată",
  delivered: "Livrată",
  livrată: "Livrată",
  procesată: "Procesată",
  nouă: "Nouă",
  cancelled: "Anulată",
};

const statusEmojis: Record<string, string> = {
  pending: "⏳",
  confirmed: "✅",
  processing: "🔧",
  shipped: "📦",
  expediată: "📦",
  delivered: "🎉",
  livrată: "🎉",
  procesată: "🔧",
  nouă: "🆕",
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
  courierCost?: number;
  tvaPercent?: number;
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
    courierCost = 0,
    tvaPercent,
  } = data;

  // Citește setările de coș pentru TVA dacă nu e specificat
  const cartSettings = await getCartSettings();
  const TVA_PERCENT = tvaPercent ?? cartSettings.tva;

  const statusLabel = statusLabels[newStatus] || newStatus;
  const emoji = statusEmojis[newStatus] || "📋";

  const subject = `${emoji} Comanda #${orderNumber} - ${statusLabel}`;

  let trackingInfo = "";
  if ((newStatus === "shipped" || newStatus === "expediată") && awb) {
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
    // Calcul subtotal produse
    const subtotalProduse = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const courierVal = typeof courierCost === 'number' ? courierCost : 0;
    // Prețurile sunt FĂRĂ TVA - adăugăm TVA la final
    const subtotalFaraTVA = subtotalProduse + courierVal;
    const tvaValue = subtotalFaraTVA * (TVA_PERCENT / 100);
    const totalCuTVA = subtotalFaraTVA + tvaValue;

    const itemsHtml = items.map(i => `
      <tr>
        <td style="padding: 8px 12px; border: 1px solid #e5e7eb;">${i.name}</td>
        <td style="padding: 8px 12px; border: 1px solid #e5e7eb; text-align: center;">${i.quantity}</td>
        <td style="padding: 8px 12px; border: 1px solid #e5e7eb; text-align: right;">${i.price.toFixed(2)} RON</td>
        <td style="padding: 8px 12px; border: 1px solid #e5e7eb; text-align: right;">${(i.price * i.quantity).toFixed(2)} RON</td>
      </tr>
    `).join("");

    itemsList = `
      <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
        <thead>
          <tr style="background: #f3f4f6;">
            <th style="padding: 8px 12px; text-align: left; border: 1px solid #e5e7eb; font-weight: 600;">Produs</th>
            <th style="padding: 8px 12px; text-align: center; border: 1px solid #e5e7eb; font-weight: 600;">Cant.</th>
            <th style="padding: 8px 12px; text-align: right; border: 1px solid #e5e7eb; font-weight: 600;">Preț (fără TVA)</th>
            <th style="padding: 8px 12px; text-align: right; border: 1px solid #e5e7eb; font-weight: 600;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>
      
      <table style="width: 100%; border-collapse: collapse; margin-top: 0;">
        <tr>
          <td style="padding: 8px 12px; text-align: right; border: 1px solid #e5e7eb;">Subtotal produse:</td>
          <td style="padding: 8px 12px; text-align: right; border: 1px solid #e5e7eb; font-weight: 600;">${subtotalProduse.toFixed(2)} RON</td>
        </tr>
        ${courierVal > 0 ? `<tr>
          <td style="padding: 8px 12px; text-align: right; border: 1px solid #e5e7eb;">Cost curier:</td>
          <td style="padding: 8px 12px; text-align: right; border: 1px solid #e5e7eb; font-weight: 600;">${courierVal.toFixed(2)} RON</td>
        </tr>` : ''}
        <tr>
          <td style="padding: 8px 12px; text-align: right; border: 1px solid #e5e7eb;">TVA (${TVA_PERCENT}%):</td>
          <td style="padding: 8px 12px; text-align: right; border: 1px solid #e5e7eb; font-weight: 600;">${tvaValue.toFixed(2)} RON</td>
        </tr>
        <tr style="background: #f8fafc;">
          <td style="padding: 12px; text-align: right; border: 1px solid #e5e7eb; font-weight: 700; font-size: 1.1em;">TOTAL DE PLATĂ (cu TVA):</td>
          <td style="padding: 12px; text-align: right; border: 1px solid #e5e7eb; font-weight: 700; font-size: 1.1em; color: #2563eb;">${totalCuTVA.toFixed(2)} RON</td>
        </tr>
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
