

export async function GET(req: NextRequest) {
  const prismaModule = await import('@/lib/prisma');
  const prisma = prismaModule.prisma || prismaModule;
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (id) {
    // Returnează doar comanda cu id-ul respectiv
    const order = await prisma.order.findUnique({ where: { id: Number(id), source: 'manual' } });
    return NextResponse.json(order);
  }
  const orders = await prisma.order.findMany({ where: { source: 'manual' } });
  return NextResponse.json(orders);
}
// ...existing code...

// All email/text/pdf generation code must be inside the POST function, after order is created.
// ...existing code...


import { NextRequest, NextResponse } from "next/server";
import { getTvaPercent } from "@/lib/getTvaPercent";
import { COMPANY_CONFIG } from "@/lib/companyConfig";

export async function POST(req: NextRequest) {
  try {
    const prismaModule = await import('@/lib/prisma');
    const prisma = prismaModule.prisma || prismaModule;
    const data = await req.json();

    // Salvează comanda în baza de date
    // Calculează totalul dacă nu este trimis din frontend
    let total = 0;
    if (Array.isArray(data.items)) {
      total = data.items.reduce((sum: number, item: any) => {
        const qty = typeof item.quantity === 'number' ? item.quantity : (item.qty || 1);
        const price = typeof item.price === 'number' ? item.price : 0;
        return sum + qty * price;
      }, 0);
    }
    if (typeof data.total === 'number') total = data.total;

    // TVA default din config dacă nu e furnizat
    const configTva = await getTvaPercent();
    const tvaToSave = typeof data.tva === 'number' ? data.tva : configTva;

    const createdOrder = await prisma.order.create({
      data: {
        paymentMethod: data.paymentMethod || 'ramburs',
        deliveryType: data.deliveryType || '',
        courierCost: data.courierCost || 0,
        courierType: data.courierType || '',
        deliveryLabel: data.deliveryLabel || '',
        clientData: data.clientData || {},
        items: data.items || [],
        total,
        tva: tvaToSave,
        subtotalPretVanzare: typeof data.subtotalPretVanzare === 'number' ? data.subtotalPretVanzare : 0,
        subtotalDupaReduceri: typeof data.subtotalDupaReduceri === 'number' ? data.subtotalDupaReduceri : 0,
        reducereTotala: typeof data.reducereTotala === 'number' ? data.reducereTotala : 0,
        status: data.status || 'nouă',
        source: 'manual',
        userId: data.userId ?? null,
      }
    });

    // Actualizare stoc produse (dacă există items)
    // Suportă variante produs - scade din varianta selectată sau din produs
    if (Array.isArray(data.items)) {
      await prisma.$transaction(async (tx: any) => {
        for (const item of data.items as any[]) {
          if (item.id && typeof item.quantity === 'number') {
            const variantId = item.variantId ? Number(item.variantId) : null;
            
            if (variantId) {
              // Scade stocul din varianta selectată
              const variant = await tx.productVariant.findUnique({ where: { id: variantId } });
              if (!variant || typeof variant.stoc !== 'number' || variant.stoc < item.quantity) {
                throw new Error(`Stoc insuficient pentru varianta "${item.variantCode || variantId}" a produsului "${item.name || item.denumire || '-'}". Disponibil: ${variant ? variant.stoc : 0}. Vă rugăm să verificați stocul sau să alegeți altă variantă.`);
              }
              await tx.productVariant.update({
                where: { id: variantId, stoc: { gte: item.quantity } },
                data: { stoc: { decrement: item.quantity } }
              });
            } else {
              // Scade stocul din produsul principal (fără variante)
              const prod = await tx.product.findUnique({ where: { id: Number(item.id) } });
              if (!prod || typeof prod.stock !== 'number' || prod.stock < item.quantity) {
                throw new Error(`Stoc insuficient pentru produsul "${item.name || item.denumire || '-'}". Disponibil: ${prod ? prod.stock : 0}. Vă rugăm să verificați stocul sau să alegeți alt produs.`);
              }
              await tx.product.update({
                where: { id: Number(item.id), stock: { gte: item.quantity } },
                data: { stock: { decrement: item.quantity } }
              });
            }
          }
        }
      });
    }

    // Trimite email de confirmare cu HTML și PDF atașat
    // NU trimite email pentru comenzi cu "așteptare plată" (Card online) - se trimite după plată
    if (createdOrder.status !== 'așteptare plată') {
    try {
      const { sendEmail } = await import("@/app/utils/email");
      const { generateOrderConfirmationPdfBuffer } = await import("@/app/utils/orderConfirmationPdf");
      const clientData = createdOrder.clientData && typeof createdOrder.clientData === "object" && !Array.isArray(createdOrder.clientData) ? createdOrder.clientData : {};
      const email = typeof (clientData as any).email === "string" ? (clientData as any).email : null;
      if (email) {
        // Generează PDF
        const pdfBuffer = await generateOrderConfirmationPdfBuffer(createdOrder);
        const itemsArr = Array.isArray(createdOrder.items) ? createdOrder.items : [];
        // Import calculateCartSummary pentru stacking logic
        const { calculateCartSummary } = await import("@/app/utils/cartSummary");
        // Calcule pentru totaluri și discount cu stacking logic identic cu comenzile online
        const productsForSummary = itemsArr.map((it: any) => ({
          id: it.id,
          name: it.name || it.denumire,
          price: typeof it.price === 'number' ? it.price : 0,
          quantity: typeof it.quantity === 'number' ? it.quantity : 1,
          discount: it.discount,
          discountType: it.discountType,
          appliedCoupon: it.appliedCoupon || null,
          deliveryTime: it.deliveryTime || it.deliveryTerm || '-',
          variantCode: it.variantCode || null,
          variantInfo: it.variantInfo || null,
          // Folosește valorile pre-calculate dacă există
          productDiscountValue: it.productDiscount || null,
          couponDiscountValue: it.couponDiscount || null
        }));
        const summary = calculateCartSummary({ products: productsForSummary });
        // Reconstruiește array-ul cu stacking logic pe fiecare rând
        const itemsWithDiscount = productsForSummary.map((item: any) => {
          let priceAfterProductDiscount = item.price;
          let productDiscount = 0;
          
          // Folosește valoarea pre-calculată dacă există, altfel calculează
          if (typeof item.productDiscountValue === 'number' && item.productDiscountValue > 0) {
            productDiscount = item.productDiscountValue;
            priceAfterProductDiscount = item.price - productDiscount;
          } else if (typeof item.discount === 'number' && item.discount > 0) {
            if (item.discountType === 'percent' || !item.discountType) {
              const percent = item.discount <= 1 ? item.discount * 100 : item.discount;
              productDiscount = item.price * (percent / 100);
            } else {
              productDiscount = item.discount;
            }
            priceAfterProductDiscount = item.price - productDiscount;
          }
          if (priceAfterProductDiscount < 0) priceAfterProductDiscount = 0;
          
          let couponDiscount = 0;
          let priceAfterCoupon = priceAfterProductDiscount;
          
          // Folosește valoarea pre-calculată pentru cupon dacă există
          if (typeof item.couponDiscountValue === 'number' && item.couponDiscountValue > 0) {
            couponDiscount = item.couponDiscountValue;
            priceAfterCoupon = priceAfterProductDiscount - couponDiscount;
          } else if (item.appliedCoupon) {
            if (item.appliedCoupon.type === 'percent') {
              const percent = item.appliedCoupon.value <= 1 ? item.appliedCoupon.value * 100 : item.appliedCoupon.value;
              couponDiscount = priceAfterProductDiscount * (percent / 100);
            } else {
              couponDiscount = item.appliedCoupon.value;
            }
            priceAfterCoupon = priceAfterProductDiscount - couponDiscount;
          }
          if (priceAfterCoupon < 0) priceAfterCoupon = 0;
          return {
            ...item,
            productDiscount,
            couponDiscount,
            priceAfterProductDiscount,
            priceAfterCoupon,
            subtotal: priceAfterCoupon * item.quantity
          };
        });
        const subtotalVanzare = summary.subtotal;
        const subtotalDupaReduceri = summary.subtotalDupaReduceri;
        const reducereTotalaProduse = summary.totalProductDiscount;
        const reducereTotalaCupon = summary.totalCouponDiscount;
        const courier = typeof createdOrder.courierCost === 'number' ? createdOrder.courierCost : 0;
        const totalFaraTVA = subtotalDupaReduceri + courier;
        const tvaPercent = typeof createdOrder.tva === 'number' ? createdOrder.tva : configTva;
        const tvaValoare = Math.round(totalFaraTVA * tvaPercent / 100 * 100) / 100;
        const totalCuTVA = Math.round((totalFaraTVA + tvaValoare) * 100) / 100;
        const html = `
<div style="font-family: Arial, sans-serif; background: #f7f7f7; padding: 0; margin: 0;">
  <div style="max-width: 1000px; margin: 40px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px #0001;">
    <div style="background: #2563eb; color: #fff; padding: 32px 0; text-align: center;">
      <h1 style="margin: 0; font-size: 2.2rem; letter-spacing: 1px;">PREV-COR TPM</h1>
      <div style="font-size: 1.1rem; margin-top: 8px;">Confirmare comandă</div>
    </div>
    <div style="padding: 32px;">
      <p style="font-size: 1.1rem;">Bună, <b>${clientData.denumire || clientData.name || ''}!</b></p>
      <p>Comanda ta a fost primită cu succes. Mai jos găsești detaliile:</p>
      ${createdOrder.paymentMethod === 'transfer bancar'
        ? `<div style=\"background: #f5f8ff; color: #2563eb; padding: 12px 18px; border-radius: 6px; margin: 18px 0 24px 0; font-weight: 500;\">Plata va fi făcută prin transfer bancar. Vei primi detaliile pe email.</div>`
        : (createdOrder.paymentMethod && createdOrder.paymentMethod.toLowerCase().includes('card'))
          ? `<div style=\"background: #f5f8ff; color: #2563eb; padding: 12px 18px; border-radius: 6px; margin: 18px 0 24px 0; font-weight: 500;\">Plata a fost făcută online cu cardul. Îți mulțumim pentru încredere!</div>`
          : (createdOrder.paymentMethod && createdOrder.paymentMethod.toLowerCase().includes('rate'))
            ? `<div style=\"background: #f5f8ff; color: #2563eb; padding: 12px 18px; border-radius: 6px; margin: 18px 0 24px 0; font-weight: 500;\">Plata va fi efectuată <b>în rate</b> prin procesatorul agreat. Vei primi detaliile pe email sau vei fi contactat pentru finalizare.</div>`
            : `<div style=\"background: #f5f8ff; color: #2563eb; padding: 12px 18px; border-radius: 6px; margin: 18px 0 24px 0; font-weight: 500;\">Plata se va face <b>ramburs</b> la livrare, direct către curier.</div>`}
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 18px; font-size: 13px;">
        <thead>
          <tr style="background: #f1f5fb;">
            <th style="padding: 8px 6px; border: 1px solid #e5e7eb; white-space: nowrap;">Nr.</th>
            <th style="padding: 8px 6px; border: 1px solid #e5e7eb; white-space: nowrap;">Produs</th>
            <th style="padding: 8px 6px; border: 1px solid #e5e7eb; white-space: nowrap;">Cant.</th>
            <th style="padding: 8px 6px; border: 1px solid #e5e7eb; white-space: nowrap;">Preț</th>
            <th style="padding: 8px 6px; border: 1px solid #e5e7eb; white-space: nowrap;">Red. produs</th>
            <th style="padding: 8px 6px; border: 1px solid #e5e7eb; white-space: nowrap;">Red. cupon</th>
            <th style="padding: 8px 6px; border: 1px solid #e5e7eb; white-space: nowrap;">Final</th>
            <th style="padding: 8px 6px; border: 1px solid #e5e7eb; white-space: nowrap;">Subtotal</th>
            <th style="padding: 8px 6px; border: 1px solid #e5e7eb; white-space: nowrap;">Livrare</th>
          </tr>
        </thead>
        <tbody>
          ${itemsWithDiscount.map((item: any, idx: number) => `
            <tr>
              <td style="padding: 6px; border: 1px solid #e5e7eb; text-align: center;">${idx + 1}</td>
              <td style="padding: 6px; border: 1px solid #e5e7eb; white-space: nowrap;">${item.name || '-'}${item.variantCode ? `<br/><span style='font-size:11px;color:#666;'>(${item.variantCode}${item.variantInfo ? ' - ' + item.variantInfo : ''})</span>` : ''}</td>
              <td style="padding: 6px; border: 1px solid #e5e7eb; text-align: center;">${item.quantity || 1}</td>
              <td style="padding: 6px; border: 1px solid #e5e7eb; white-space: nowrap;">${typeof item.price === 'number' ? item.price.toFixed(2) : '-'} lei</td>
              <td style="padding: 6px; border: 1px solid #e5e7eb; color: #ea580c; white-space: nowrap;">${item.productDiscount !== 0 ? (item.productDiscount > 0 ? '-' + item.productDiscount.toFixed(2) + ' lei' : item.productDiscount.toFixed(2) + ' lei') : '-'}</td>
              <td style="padding: 6px; border: 1px solid #e5e7eb; color: #2563eb; white-space: nowrap;">${item.couponDiscount !== 0 ? (item.couponDiscount > 0 ? '-' + item.couponDiscount.toFixed(2) + ' lei' : item.couponDiscount.toFixed(2) + ' lei') : '-'}</td>
              <td style="padding: 6px; border: 1px solid #e5e7eb; white-space: nowrap;">${item.priceAfterCoupon.toFixed(2)} lei</td>
              <td style="padding: 6px; border: 1px solid #e5e7eb; white-space: nowrap;">${item.subtotal.toFixed(2)} lei</td>
              <td style="padding: 6px; border: 1px solid #e5e7eb; white-space: nowrap;">${item.deliveryTime || '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div style="margin-bottom: 8px;">Subtotal preț de vânzare: <b>${subtotalVanzare.toFixed(2)} lei</b></div>
      <div style="margin-bottom: 8px; color: #ea580c;">Reducere totală produse: <b>-${reducereTotalaProduse.toFixed(2)} lei</b></div>
      <div style="margin-bottom: 8px; color: #2563eb;">Reducere totală cupon: <b>-${reducereTotalaCupon.toFixed(2)} lei</b></div>
      <div style="margin-bottom: 8px; color: #16a34a;">Subtotal după reduceri: <b>${subtotalDupaReduceri.toFixed(2)} lei</b></div>
      <div style=\"margin-bottom: 8px;\">Cost curier (standard): <b>${courier.toFixed(2)} lei</b></div>
      <div style=\"margin-bottom: 8px;\">Metodă de plată: <b>${createdOrder.paymentMethod || '-'}</b></div>
      <div style=\"margin-bottom: 8px;\">Total fără TVA: <b>${totalFaraTVA.toFixed(2)} lei</b></div>
      <div style=\"margin-bottom: 8px;\">TVA (${tvaPercent}%): <b>${tvaValoare.toFixed(2)} lei</b></div>
      <div style=\"font-size: 1.2rem; font-weight: bold; color: #2563eb; margin: 18px 0 8px 0;\">Total de plată (cu TVA): ${totalCuTVA.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} lei</div>
      <!-- adresă livrare completă -->
      <div style=\"margin-bottom: 8px;\">Adresă livrare: <b>${[
        clientData.adresa || clientData.adress || clientData.adresaSediu,
        clientData.nr || clientData.numar,
        clientData.bloc ? `Bl. ${clientData.bloc}` : '',
        clientData.scara ? `Sc. ${clientData.scara}` : '',
        clientData.etaj ? `Et. ${clientData.etaj}` : '',
        clientData.ap ? `Ap. ${clientData.ap}` : '',
        clientData.oras || clientData.localitate,
        clientData.judet,
        clientData.codPostal || clientData.cod_postal
      ].filter(Boolean).join(', ') || '-'}<\/b><\/div>
      <div style=\"margin-bottom: 8px;\">Telefon: <b>${clientData.telefon || clientData.phone || '-'}<\/b><\/div>
<div style="margin-top: 18px; color: #2563eb; font-weight: 500;"><a href="mailto:${COMPANY_CONFIG.email}" style="color: #2563eb; text-decoration: underline;">Îți mulțumim pentru încredere!</a><br>Echipa PREV-COR TPM</div>
    </div>
    <div style="background: #f7f7f7; color: #888; text-align: center; padding: 12px 0; font-size: 0.95rem;">Acest email este generat automat. Pentru întrebări, răspunde la acest mesaj sau contactează-ne la <a href="mailto:${COMPANY_CONFIG.email}">${COMPANY_CONFIG.email}</a>.</div>
  </div>
</div>
        `;
        await sendEmail({
          to: email,
          subject: 'Confirmare comandă PREV-COR TPM',
          text: 'Comanda ta a fost înregistrată cu succes! Vezi detalii în atașamentul PDF.',
          html,
          attachments: [
            {
              filename: `comanda-${createdOrder.id || 'manual'}.pdf`,
              content: pdfBuffer,
              contentType: 'application/pdf'
            }
          ]
        });
      }
    } catch (e) {
      console.error('[MANUAL ORDER] Eroare la trimitere email:', e);
    }
    } // Închide if pentru status !== 'așteptare plată'

    return NextResponse.json({ success: true, order: createdOrder, message: 'Comanda a fost finalizată cu succes.' });
  } catch (e: any) {
    console.error('[MANUAL ORDER] Eroare la salvare:', e);
    return NextResponse.json({ success: false, error: e?.message || 'Eroare la salvare' }, { status: 500 });
  }
}
    // Type guard strict pentru clientData
