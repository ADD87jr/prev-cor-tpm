import { sendEmail } from "./email";

/**
 * Trimite email de bun venit după înregistrare
 */
export async function sendWelcomeEmail(customerName: string, customerEmail: string) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: #fff; margin: 0; font-size: 24px;">Bine ai venit la PREV-COR TPM! 🎉</h1>
      </div>
      <div style="background: #fff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
        <p style="font-size: 16px; color: #374151;">Salut <strong>${customerName}</strong>,</p>
        <p style="color: #6b7280; line-height: 1.6;">
          Îți mulțumim că ți-ai creat un cont pe PREV-COR TPM! Suntem bucuroși să te avem alături.
        </p>
        <p style="color: #6b7280; line-height: 1.6;">Cu contul tău poți:</p>
        <ul style="color: #6b7280; line-height: 1.8;">
          <li>🛒 Urmări comenzile în timp real</li>
          <li>❤️ Salva produse la favorite</li>
          <li>📦 Accesa istoricul comenzilor</li>
          <li>⚡ Plasa comenzi mai rapid</li>
        </ul>
        <div style="text-align: center; margin: 25px 0;">
          <a href="https://prevcortpm.ro/shop" 
             style="background: #2563eb; color: #fff; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
            Explorează magazinul →
          </a>
        </div>
        <p style="color: #9ca3af; font-size: 13px; text-align: center; margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 15px;">
          PREV-COR TPM — Soluții Inteligente de Automatizare Industrială
        </p>
      </div>
    </div>
  `;

  return sendEmail({
    to: customerEmail,
    subject: "Bine ai venit la PREV-COR TPM! 🎉",
    html,
  });
}

/**
 * Trimite email de solicitare recenzie la 3 zile după livrare
 */
export async function sendReviewRequestEmail(
  customerName: string,
  customerEmail: string,
  orderNumber: string,
  items: Array<{ name: string; productId?: number }>
) {
  const productLinks = items
    .map((item) => {
      const link = item.productId
        ? `<a href="https://prevcortpm.ro/shop/${item.productId}" style="color: #2563eb; text-decoration: none;">${item.name}</a>`
        : item.name;
      return `<li style="padding: 4px 0;">${link}</li>`;
    })
    .join("");

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: #fff; margin: 0; font-size: 24px;">Cum a fost experiența ta? ⭐</h1>
      </div>
      <div style="background: #fff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
        <p style="font-size: 16px; color: #374151;">Salut <strong>${customerName}</strong>,</p>
        <p style="color: #6b7280; line-height: 1.6;">
          Sperăm că ți-au plăcut produsele din comanda <strong>#${orderNumber}</strong>! 
          Ne-ar ajuta enorm dacă ai lăsa o recenzie:
        </p>
        <ul style="color: #374151; line-height: 1.8; list-style-type: none; padding: 0;">
          ${productLinks}
        </ul>
        <p style="color: #6b7280; line-height: 1.6;">
          Recenziile tale ajută alți clienți să aleagă produsele potrivite și ne ajută pe noi să ne îmbunătățim serviciile.
        </p>
        <div style="text-align: center; margin: 25px 0;">
          <a href="https://prevcortpm.ro/shop" 
             style="background: #059669; color: #fff; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
            Lasă o recenzie ⭐
          </a>
        </div>
        <p style="color: #9ca3af; font-size: 13px; text-align: center; margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 15px;">
          PREV-COR TPM — Soluții Inteligente de Automatizare Industrială
        </p>
      </div>
    </div>
  `;

  return sendEmail({
    to: customerEmail,
    subject: `Cum au fost produsele din comanda #${orderNumber}? ⭐`,
    html,
  });
}
