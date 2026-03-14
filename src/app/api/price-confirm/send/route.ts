import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";
import { sendEmail } from "@/app/utils/email";

// Generează token unic pentru confirmare
function generateToken(): string {
  return randomBytes(32).toString("hex");
}

// Admin trimite oferta de preț către client
export async function POST(req: NextRequest) {
  try {
    const { orderId } = await req.json();

    if (!orderId) {
      return NextResponse.json({ error: "orderId lipsă" }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id: Number(orderId) },
    });

    if (!order) {
      return NextResponse.json({ error: "Comanda nu există" }, { status: 404 });
    }

    // Generează token și setează expirare la 7 zile
    const token = generateToken();
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 7);

    // Actualizează comanda
    await prisma.order.update({
      where: { id: Number(orderId) },
      data: {
        priceConfirmToken: token,
        priceConfirmExpiry: expiry,
        status: "awaiting_price",
      },
    });

    // Trimite email către client
    const clientData = order.clientData as {
      firstName?: string;
      lastName?: string;
      name?: string;
      denumire?: string;
      email?: string;
      phone?: string;
      company?: string;
    } | null;

    const clientEmail = clientData?.email;
    const clientName = clientData?.name || clientData?.denumire || clientData?.firstName || clientData?.company || "Client";

    if (!clientEmail) {
      return NextResponse.json(
        { error: "Clientul nu are email setat" },
        { status: 400 }
      );
    }

    const rawItems = order.items as Array<{
      name: string;
      qty?: number;
      quantity?: number;
      price: number;
      variant?: string;
      variantCode?: string;
      variantInfo?: string;
    }>;

    // Normalizează items
    const items = rawItems.map(item => ({
      name: item.name,
      qty: item.qty ?? item.quantity ?? 1,
      price: item.price,
      variant: item.variant || item.variantCode || item.variantInfo || ''
    }));

    // Calculează totaluri
    const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
    const courierCost = typeof order.courierCost === 'number' ? order.courierCost : 0;
    const tvaPercent = typeof (order as any).tva === 'number' ? (order as any).tva : 21;
    const totalFaraTVA = subtotal + courierCost;
    const tva = totalFaraTVA * (tvaPercent / 100);
    const totalCuTVA = totalFaraTVA + tva;

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const confirmUrl = `${baseUrl}/confirm-price/${token}`;

    // Construiește tabel cu produsele
    const productsHtml = items
      .map(
        (item) => `
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd;">${item.name}${item.variant ? ` - ${item.variant}` : ""}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${item.qty}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${item.price.toFixed(2)} RON</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${(item.price * item.qty).toFixed(2)} RON</td>
      </tr>
    `
      )
      .join("");

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Confirmare preț - Comandă #${order.number || order.id}</h2>
        
        <p>Dragă ${clientName},</p>
        
        <p>Vă mulțumim pentru comanda dumneavoastră. Am verificat disponibilitatea produselor și vă prezentăm prețurile finale:</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <thead>
            <tr style="background: #f5f5f5;">
              <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Produs</th>
              <th style="padding: 10px; border: 1px solid #ddd; text-align: center;">Cantitate</th>
              <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">Preț (fără TVA)</th>
              <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${productsHtml}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="3" style="padding: 8px; border: 1px solid #ddd; text-align: right;">Subtotal produse:</td>
              <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${subtotal.toFixed(2)} RON</td>
            </tr>
            ${courierCost > 0 ? `<tr>
              <td colspan="3" style="padding: 8px; border: 1px solid #ddd; text-align: right;">Cost curier:</td>
              <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${courierCost.toFixed(2)} RON</td>
            </tr>` : ''}
            <tr>
              <td colspan="3" style="padding: 8px; border: 1px solid #ddd; text-align: right;">TVA (${tvaPercent}%):</td>
              <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${tva.toFixed(2)} RON</td>
            </tr>
            <tr style="background: #f5f5f5; font-weight: bold;">
              <td colspan="3" style="padding: 10px; border: 1px solid #ddd; text-align: right;">TOTAL DE PLATĂ (cu TVA):</td>
              <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">${totalCuTVA.toFixed(2)} RON</td>
            </tr>
          </tfoot>
        </table>
        
        <p>Pentru a continua cu comanda, vă rugăm să confirmați prețul folosind butonul de mai jos:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${confirmUrl}" style="background: #22c55e; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
            ✓ Accept prețul
          </a>
        </div>
        
        <p style="color: #666; font-size: 14px;">
          Acest link este valabil 7 zile. Dacă doriți să refuzați sau să renunțați la comandă, 
          accesați linkul de mai sus și folosiți opțiunea de refuz.
        </p>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        
        <p style="color: #666; font-size: 12px;">
          Cu stimă,<br>
          Echipa PREV-COR TPM<br>
          <a href="mailto:office@prevcortpm.ro">office@prevcortpm.ro</a> | <a href="https://prevcortpm.ro">prevcortpm.ro</a>
        </p>
      </div>
    `;

    // Trimite email
    await sendEmail({
      to: clientEmail,
      subject: `Confirmare preț - Comandă #${order.number || order.id}`,
      html: emailHtml,
    });

    return NextResponse.json({
      success: true,
      message: "Email de confirmare trimis",
      token,
      expiry,
    });
  } catch (error) {
    console.error("Eroare trimitere confirmare preț:", error);
    return NextResponse.json(
      { error: "Eroare la trimitere" },
      { status: 500 }
    );
  }
}
