import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/app/utils/email";
import { COMPANY_CONFIG } from "@/lib/companyConfig";

// Cast pentru modelul AbandonedCart
const db = prisma as any;

// API pentru trimitere email-uri coșuri abandonate
// Rulează via cron job (ex: Vercel Cron, sau manual din admin)
export async function POST(req: NextRequest) {
  try {
    // Verifică secret key pentru securitate
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get("secret");
    
    if (secret !== process.env.CRON_SECRET && secret !== "manual-trigger") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Găsește coșurile abandonate:
    // - create acum cel puțin 1 oră
    // - nu au primit email
    // - nu sunt recovered
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    
    const carts = await db.abandonedCart.findMany({
      where: {
        emailSent: false,
        recovered: false,
        createdAt: {
          lte: oneHourAgo,
          gte: threeDaysAgo // nu mai vechi de 3 zile
        }
      },
      take: 10 // procesează max 10 per apel
    });
    
    if (carts.length === 0) {
      return NextResponse.json({ message: "No abandoned carts to process", count: 0 });
    }
    
    let sent = 0;
    let errors = 0;
    
    for (const cart of carts) {
      try {
        const items = cart.items as any[];
        
        // Generează HTML pentru produse
        const productsHtml = items.map((item: any) => `
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #eee;">
              <img src="${item.image || '/products/placeholder.jpg'}" alt="${item.name}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px;" />
            </td>
            <td style="padding: 12px; border-bottom: 1px solid #eee;">
              <strong>${item.name}</strong><br>
              <span style="color: #666;">Cantitate: ${item.quantity || 1}</span>
            </td>
            <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">
              ${((item.price || 0) * (item.quantity || 1)).toFixed(2)} RON
            </td>
          </tr>
        `).join("");
        
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); padding: 30px 20px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Ai uitat ceva în coș! 🛒</h1>
            </div>
            
            <div style="padding: 30px 20px; background: #fff;">
              <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
                Bună! Am observat că ai adăugat produse în coș, dar nu ai finalizat comanda.
              </p>
              
              <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
                Le-am păstrat pentru tine:
              </p>
              
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                ${productsHtml}
              </table>
              
              <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <p style="margin: 0; font-size: 18px; font-weight: bold; color: #1e40af;">
                  Total: ${cart.total.toFixed(2)} RON
                </p>
              </div>
              
              <div style="text-align: center; margin-top: 30px;">
                <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://prev-cor-tpm.ro'}/cart" 
                   style="display: inline-block; background: #2563eb; color: white; padding: 15px 40px; 
                          text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: bold;">
                  Finalizează comanda →
                </a>
              </div>
              
              <p style="font-size: 14px; color: #666; margin-top: 30px; text-align: center;">
                Ai întrebări? Contactează-ne:<br>
                📞 ${COMPANY_CONFIG.phone} | ✉️ ${COMPANY_CONFIG.email}
              </p>
            </div>
            
            <div style="background: #f1f5f9; padding: 20px; text-align: center; font-size: 12px; color: #64748b;">
              <p style="margin: 0;">
                Acest email a fost trimis automat deoarece ai adăugat produse în coș.<br>
                Dacă nu dorești să mai primești astfel de email-uri, ignoră acest mesaj.
              </p>
            </div>
          </div>
        `;
        
        await sendEmail({
          to: cart.email,
          subject: "🛒 Produsele tale te așteaptă în coș!",
          text: `Ai uitat produse în coș. Finalizează comanda aici: ${process.env.NEXT_PUBLIC_SITE_URL || 'https://prev-cor-tpm.ro'}/cart`,
          html,
        });
        
        // Marchează ca trimis
        await db.abandonedCart.update({
          where: { id: cart.id },
          data: { emailSent: true, emailSentAt: new Date() }
        });
        
        sent++;
      } catch (error) {
        console.error(`Error sending email to ${cart.email}:`, error);
        errors++;
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `Sent ${sent} emails, ${errors} errors`,
      sent,
      errors,
      total: carts.length
    });
  } catch (error) {
    console.error("Error in abandoned cart cron:", error);
    return NextResponse.json({ error: "Failed to process" }, { status: 500 });
  }
}
