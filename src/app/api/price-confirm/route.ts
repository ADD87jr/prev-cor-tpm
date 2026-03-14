import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/app/utils/email";
import { generateOrderConfirmationPdfBuffer } from "@/app/utils/orderConfirmationPdfLib";

// Funcție pentru calcularea sumelor - prețurile sunt FĂRĂ TVA
function calculateOrderSummary(items: Array<{name: string; qty: number; price: number}>, courierCost = 0, tvaPercent = 21) {
  // Subtotal produse (fără TVA)
  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  // Total fără TVA = subtotal + cost curier
  const totalFaraTVA = subtotal + courierCost;
  // Adăugăm TVA
  const tvaValue = totalFaraTVA * (tvaPercent / 100);
  const totalCuTVA = totalFaraTVA + tvaValue;
  return { subtotal, courierCost, totalFaraTVA, tvaValue, totalCuTVA };
}

// Client confirmă sau refuză prețul
export async function POST(req: NextRequest) {
  try {
    const { token, action, reason } = await req.json();

    if (!token || !action) {
      return NextResponse.json(
        { error: "Token sau acțiune lipsă" },
        { status: 400 }
      );
    }

    if (!["accept", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "Acțiune invalidă" },
        { status: 400 }
      );
    }

    const order = await prisma.order.findFirst({
      where: { priceConfirmToken: token },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Token invalid sau comandă inexistentă" },
        { status: 404 }
      );
    }

    // Verifică dacă tokenul a expirat
    if (order.priceConfirmExpiry && new Date() > order.priceConfirmExpiry) {
      return NextResponse.json(
        { error: "Linkul de confirmare a expirat" },
        { status: 410 }
      );
    }

    // Verifică dacă prețul a fost deja confirmat
    if (order.priceConfirmedAt) {
      return NextResponse.json(
        { error: "Prețul pentru această comandă a fost deja confirmat" },
        { status: 400 }
      );
    }

    const clientData = order.clientData as {
      firstName?: string;
      lastName?: string;
      name?: string;
      denumire?: string;
      email?: string;
      company?: string;
    } | null;

    const clientName = clientData?.name || clientData?.denumire || clientData?.firstName || clientData?.company || "Client";
    const clientEmail = clientData?.email;

    if (action === "accept") {
      // Confirmă prețul și setează status pending
      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: "pending",
          priceConfirmedAt: new Date(),
          priceConfirmToken: null, // Invalidează tokenul
        },
      });

      // Trimite notificare către admin
      const adminEmail = process.env.CONTACT_EMAIL || 'office@prevcortpm.ro';
      
      if (adminEmail) {
        // Calculează sumele pentru email admin
        const rawItemsAdmin = order.items as Array<{name: string; qty?: number; quantity?: number; price: number; variant?: string; variantCode?: string}>;
        const itemsAdmin = rawItemsAdmin.map(it => ({
          name: it.name,
          qty: it.qty ?? it.quantity ?? 1,
          price: it.price,
          variant: it.variant || it.variantCode || ''
        }));
        const summaryAdmin = calculateOrderSummary(itemsAdmin, order.courierCost || 0, order.tva || 21);
        const tvaPercentAdmin = order.tva || 21;
        
        const productsHtmlAdmin = itemsAdmin.map(item => `
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;">${item.name}${item.variant ? ` - ${item.variant}` : ''}</td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${item.qty}</td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${item.price.toFixed(2)} RON</td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${(item.price * item.qty).toFixed(2)} RON</td>
          </tr>
        `).join('');
        
        await sendEmail({
          to: adminEmail,
          subject: `✓ Preț confirmat - Comandă #${order.number || order.id}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px;">
              <h2 style="color: #22c55e;">Preț confirmat!</h2>
              <p>Clientul <strong>${clientName}</strong> a confirmat prețul pentru comanda <strong>#${order.number || order.id}</strong>.</p>
              
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <thead>
                  <tr style="background: #f5f5f5;">
                    <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Produs</th>
                    <th style="padding: 10px; border: 1px solid #ddd; text-align: center;">Cant.</th>
                    <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">Preț (fără TVA)</th>
                    <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${productsHtmlAdmin}
                </tbody>
                <tfoot>
                  <tr>
                    <td colspan="3" style="padding: 8px; border: 1px solid #ddd; text-align: right;">Subtotal produse:</td>
                    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${summaryAdmin.subtotal.toFixed(2)} RON</td>
                  </tr>
                  ${summaryAdmin.courierCost > 0 ? `<tr>
                    <td colspan="3" style="padding: 8px; border: 1px solid #ddd; text-align: right;">Cost curier:</td>
                    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${summaryAdmin.courierCost.toFixed(2)} RON</td>
                  </tr>` : ''}
                  <tr>
                    <td colspan="3" style="padding: 8px; border: 1px solid #ddd; text-align: right;">TVA (${tvaPercentAdmin}%):</td>
                    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${summaryAdmin.tvaValue.toFixed(2)} RON</td>
                  </tr>
                  <tr style="background: #f5f5f5; font-weight: bold;">
                    <td colspan="3" style="padding: 10px; border: 1px solid #ddd; text-align: right;">TOTAL DE PLATĂ (cu TVA):</td>
                    <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">${summaryAdmin.totalCuTVA.toFixed(2)} RON</td>
                  </tr>
                </tfoot>
              </table>
              
              <p style="background: #d1fae5; padding: 12px; border-radius: 6px;">Status: <strong>Pending</strong> - Se poate procesa comanda.</p>
              <p><a href="${process.env.NEXT_PUBLIC_SITE_URL}/admin/orders?edit=${order.id}" style="display: inline-block; background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px;">Vezi comanda în admin</a></p>
            </div>
          `,
        });
      }

      // Trimite email cu detalii plată către client (dacă plata e prin transfer)
      if (clientEmail && order.paymentMethod === "transfer") {
        const rawItems = order.items as Array<{name: string; qty?: number; quantity?: number; price: number; variant?: string; variantCode?: string}>;
        const items = rawItems.map(it => ({
          name: it.name,
          qty: it.qty ?? it.quantity ?? 1,
          price: it.price,
          variant: it.variant || it.variantCode || ''
        }));
        
        const summary = calculateOrderSummary(items, order.courierCost || 0, order.tva || 21);
        
        // Generează PDF proforma
        let pdfBuffer: Buffer | null = null;
        try {
          const pdfOrder = {
            id: order.id,
            number: order.number,
            date: order.date,
            items: items,
            products: items.map(it => ({ ...it, quantity: it.qty })),
            clientData: clientData,
            courierCost: order.courierCost || 0,
            paymentMethod: order.paymentMethod,
            tva: order.tva || 21,
            subtotalPretVanzare: summary.subtotal,
            totalFaraTVA: summary.totalFaraTVA,
            tvaValoare: summary.tvaValue,
            totalCuTVA: summary.totalCuTVA
          };
          pdfBuffer = await generateOrderConfirmationPdfBuffer(pdfOrder, 'ro');
        } catch (pdfError) {
          console.error('[PRICE-CONFIRM] Eroare generare PDF proforma:', pdfError);
        }
        
        const productsHtml = items.map(item => `
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;">${item.name}${item.variant ? ` - ${item.variant}` : ''}</td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${item.qty}</td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${item.price.toFixed(2)} RON</td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${(item.price * item.qty).toFixed(2)} RON</td>
          </tr>
        `).join('');

        await sendEmail({
          to: clientEmail,
          subject: `Detalii plată - Comandă #${order.number || order.id}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #2563eb;">Mulțumim pentru confirmarea comenzii!</h2>
              
              <p>Dragă ${clientName},</p>
              
              <p>Vă mulțumim că ați confirmat prețul pentru comanda <strong>#${order.number || order.id}</strong>.</p>
              
              <h3 style="color: #333; border-bottom: 2px solid #2563eb; padding-bottom: 8px;">📋 Rezumat comandă</h3>
              
              <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
                <thead>
                  <tr style="background: #f5f5f5;">
                    <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Produs</th>
                    <th style="padding: 10px; border: 1px solid #ddd; text-align: center;">Cant.</th>
                    <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">Preț</th>
                    <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">Total</th>
                  </tr>
                </thead>
                <tbody>${productsHtml}</tbody>
              </table>
              
              <table style="width: 100%; margin: 15px 0; font-size: 14px;">
                <tr>
                  <td style="padding: 5px;">Subtotal produse:</td>
                  <td style="padding: 5px; text-align: right;">${summary.subtotal.toFixed(2)} RON</td>
                </tr>
                ${summary.courierCost > 0 ? `
                <tr>
                  <td style="padding: 5px;">Cost curier:</td>
                  <td style="padding: 5px; text-align: right;">${summary.courierCost.toFixed(2)} RON</td>
                </tr>
                ` : ''}
                <tr>
                  <td style="padding: 5px;">TVA (${order.tva || 21}%):</td>
                  <td style="padding: 5px; text-align: right;">${summary.tvaValue.toFixed(2)} RON</td>
                </tr>
                <tr style="font-weight: bold; font-size: 16px; background: #e6f4ff;">
                  <td style="padding: 10px;">TOTAL DE PLATĂ:</td>
                  <td style="padding: 10px; text-align: right; color: #2563eb;">${summary.totalCuTVA.toFixed(2)} RON</td>
                </tr>
              </table>
              
              <div style="background: #fef3c7; border: 2px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <h3 style="color: #92400e; margin-top: 0;">💳 Detalii plată prin transfer bancar</h3>
                <table style="width: 100%; font-size: 14px;">
                  <tr>
                    <td style="padding: 5px; color: #666;">Beneficiar:</td>
                    <td style="padding: 5px; font-weight: bold;">S.C. PREV-COR TPM S.R.L.</td>
                  </tr>
                  <tr>
                    <td style="padding: 5px; color: #666;">Bancă:</td>
                    <td style="padding: 5px; font-weight: bold;">BRD - Groupe Societe Generale</td>
                  </tr>
                  <tr>
                    <td style="padding: 5px; color: #666;">IBAN:</td>
                    <td style="padding: 5px; font-weight: bold; font-family: monospace;">RO23BRDE360SV67547173600</td>
                  </tr>
                  <tr>
                    <td style="padding: 5px; color: #666;">CUI:</td>
                    <td style="padding: 5px; font-weight: bold;">RO43434739</td>
                  </tr>
                  <tr>
                    <td style="padding: 5px; color: #666;">Sumă de plată:</td>
                    <td style="padding: 5px; font-weight: bold; color: #2563eb; font-size: 16px;">${summary.totalCuTVA.toFixed(2)} RON</td>
                  </tr>
                  <tr>
                    <td style="padding: 5px; color: #666;">Referință plată:</td>
                    <td style="padding: 5px; font-weight: bold;">Comandă #${order.number || order.id}</td>
                  </tr>
                </table>
              </div>
              
              <p style="color: #666;">
                După efectuarea plății, comanda dumneavoastră va fi procesată și expediată în cel mai scurt timp.
                Veți primi un email de confirmare când comanda va fi expediată, cu detaliile de tracking.
              </p>
              
              <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
              
              <p style="color: #666; font-size: 12px;">
                Cu stimă,<br>
                Echipa PREV-COR TPM<br>
                <a href="mailto:office@prevcortpm.ro">office@prevcortpm.ro</a> | <a href="https://prevcortpm.ro">prevcortpm.ro</a>
              </p>
            </div>
          `,
          attachments: pdfBuffer ? [
            {
              filename: `proforma-comanda-${order.number || order.id}.pdf`,
              content: pdfBuffer
            }
          ] : undefined
        });
      }

      return NextResponse.json({
        success: true,
        message: "Prețul a fost confirmat. Vă mulțumim!",
        status: "pending",
      });
    } else {
      // Refuză prețul și anulează comanda
      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: "cancelled",
          priceConfirmToken: null,
        },
      });

      // Trimite notificare către admin
      const adminEmail = process.env.CONTACT_EMAIL || 'office@prevcortpm.ro';
      
      if (adminEmail) {
        // Calculează sumele pentru email admin
        const rawItemsReject = order.items as Array<{name: string; qty?: number; quantity?: number; price: number; variant?: string; variantCode?: string}>;
        const itemsReject = rawItemsReject.map(it => ({
          name: it.name,
          qty: it.qty ?? it.quantity ?? 1,
          price: it.price,
          variant: it.variant || it.variantCode || ''
        }));
        const summaryReject = calculateOrderSummary(itemsReject, order.courierCost || 0, order.tva || 21);
        const tvaPercentReject = order.tva || 21;

        const productsHtmlReject = itemsReject.map(item => `
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;">${item.name}${item.variant ? ` - ${item.variant}` : ''}</td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${item.qty}</td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${item.price.toFixed(2)} RON</td>
            <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${(item.price * item.qty).toFixed(2)} RON</td>
          </tr>
        `).join('');

        await sendEmail({
          to: adminEmail,
          subject: `✗ Preț refuzat - Comandă #${order.number || order.id}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px;">
              <h2 style="color: #ef4444;">Preț refuzat</h2>
              <p>Clientul <strong>${clientName}</strong> a refuzat prețul pentru comanda <strong>#${order.number || order.id}</strong>.</p>
              ${reason ? `<p>Motiv: <em>${reason}</em></p>` : ""}
              
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <thead>
                  <tr style="background: #f5f5f5;">
                    <th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Produs</th>
                    <th style="padding: 10px; border: 1px solid #ddd; text-align: center;">Cant.</th>
                    <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">Preț (fără TVA)</th>
                    <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${productsHtmlReject}
                </tbody>
                <tfoot>
                  <tr>
                    <td colspan="3" style="padding: 8px; border: 1px solid #ddd; text-align: right;">Subtotal produse:</td>
                    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${summaryReject.subtotal.toFixed(2)} RON</td>
                  </tr>
                  ${summaryReject.courierCost > 0 ? `<tr>
                    <td colspan="3" style="padding: 8px; border: 1px solid #ddd; text-align: right;">Cost curier:</td>
                    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${summaryReject.courierCost.toFixed(2)} RON</td>
                  </tr>` : ''}
                  <tr>
                    <td colspan="3" style="padding: 8px; border: 1px solid #ddd; text-align: right;">TVA (${tvaPercentReject}%):</td>
                    <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${summaryReject.tvaValue.toFixed(2)} RON</td>
                  </tr>
                  <tr style="background: #f5f5f5; font-weight: bold;">
                    <td colspan="3" style="padding: 10px; border: 1px solid #ddd; text-align: right;">TOTAL DE PLATĂ (cu TVA):</td>
                    <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">${summaryReject.totalCuTVA.toFixed(2)} RON</td>
                  </tr>
                </tfoot>
              </table>
              
              <p style="background: #fee2e2; padding: 12px; border-radius: 6px;">Comanda a fost anulată automat.</p>
              ${clientEmail ? `<p>Contact client: ${clientEmail}</p>` : ""}
              <p><a href="${process.env.NEXT_PUBLIC_SITE_URL}/admin/orders?edit=${order.id}" style="display: inline-block; background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px;">Vezi comanda în admin</a></p>
            </div>
          `,
        });
      }

      return NextResponse.json({
        success: true,
        message: "Comanda a fost anulată conform solicitării.",
        status: "cancelled",
      });
    }
  } catch (error) {
    console.error("Eroare confirmare preț:", error);
    return NextResponse.json(
      { error: "Eroare la procesare" },
      { status: 500 }
    );
  }
}

// GET - verifică status token
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Token lipsă" }, { status: 400 });
  }

  const order = await prisma.order.findFirst({
    where: { priceConfirmToken: token },
  });

  if (!order) {
    return NextResponse.json(
      { error: "Token invalid" },
      { status: 404 }
    );
  }

  // Verifică dacă tokenul a expirat
  const expired = order.priceConfirmExpiry && new Date() > order.priceConfirmExpiry;

  const rawItems = order.items as Array<{
    name: string;
    qty?: number;
    quantity?: number;
    price: number;
    variant?: string;
    variantCode?: string;
    variantInfo?: string;
  }>;

  // Normalizează qty/quantity și variant
  const items = rawItems.map(item => ({
    name: item.name,
    qty: item.qty ?? item.quantity ?? 1,
    price: item.price,
    variant: item.variant || item.variantCode || item.variantInfo || ''
  }));

  const clientData = order.clientData as {
    firstName?: string;
    lastName?: string;
    name?: string;
    email?: string;
    company?: string;
    denumire?: string;
  } | null;

  return NextResponse.json({
    orderId: order.id,
    orderNumber: order.number,
    total: order.total,
    items,
    courierCost: typeof order.courierCost === 'number' ? order.courierCost : 0,
    tvaPercent: typeof (order as any).tva === 'number' ? (order as any).tva : 21,
    clientName: clientData?.name || clientData?.firstName || clientData?.denumire || clientData?.company || "Client",
    status: order.status,
    expired,
    alreadyConfirmed: !!order.priceConfirmedAt,
  });
}
