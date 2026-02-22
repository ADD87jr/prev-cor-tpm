import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/app/utils/email";
import { generateOrderConfirmationPdfBuffer } from "@/app/utils/orderConfirmationPdfLib";
import { prisma } from "@/lib/prisma";
import { calculateCartSummary, CartSummaryProduct } from "@/app/utils/cartSummary";
import { getTvaPercent } from "@/lib/getTvaPercent";
import { notifyNewOrder } from "@/lib/push-notifications";
import Stripe from "stripe";
import { COMPANY_CONFIG } from "@/lib/companyConfig";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-10-29.clover" });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('[STRIPE-SUCCESS] Payload primit:', body);
    let { items, client, userEmail, courierCost, deliveryType, paymentMethod, manualOrderId, language, sessionId } = body;
    
    // Fallback: if items/client are empty but sessionId exists, fetch from Stripe metadata
    if (sessionId && (!items || items.length === 0 || !client || Object.keys(client).length === 0)) {
      console.log('[STRIPE-SUCCESS] LocalStorage empty, fetching from Stripe session:', sessionId);
      try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        const metadata = session.metadata || {};
        console.log('[STRIPE-SUCCESS] Stripe metadata:', metadata);
        
        // Parse data from Stripe metadata
        if (metadata.items && (!items || items.length === 0)) {
          try { items = JSON.parse(metadata.items); } catch { items = []; }
        }
        if (metadata.client && (!client || Object.keys(client).length === 0)) {
          try { client = JSON.parse(metadata.client); } catch { client = {}; }
        }
        if (!userEmail && metadata.userEmail) userEmail = metadata.userEmail;
        if ((courierCost === undefined || courierCost === 0) && metadata.courierCost) courierCost = parseFloat(metadata.courierCost) || 0;
        if (!deliveryType && metadata.deliveryType) deliveryType = metadata.deliveryType;
        if (!paymentMethod && metadata.paymentMethod) paymentMethod = metadata.paymentMethod;
        if (!language && metadata.language) language = metadata.language;
        if (!manualOrderId && metadata.manualOrderId) manualOrderId = metadata.manualOrderId;
        
        console.log('[STRIPE-SUCCESS] Data retrieved from Stripe:', { items: items?.length, client: Object.keys(client || {}), userEmail });
        
        // Reconstruiește items complet din DB dacă avem doar date minime (id, vid, qty, p)
        if (items && items.length > 0 && items[0].id && !items[0].name) {
          console.log('[STRIPE-SUCCESS] Reconstruiesc items din DB...');
          const reconstructedItems = [];
          for (const minItem of items) {
            const productId = Number(minItem.id);
            const variantId = minItem.vid ? Number(minItem.vid) : null;
            const qty = minItem.qty || 1;
            const price = minItem.p || 0;
            
            const product = await prisma.product.findUnique({ 
              where: { id: productId },
              include: { variants: true }
            });
            
            if (product) {
              const variant = variantId ? product.variants.find((v: any) => v.id === variantId) : null;
              reconstructedItems.push({
                id: product.id,
                name: product.name || product.denumire,
                nameEn: product.nameEn,
                price: price,
                discountedPrice: price,
                quantity: qty,
                variantId: variant?.id || null,
                variantCode: variant?.codVarianta || null,
                variantInfo: variant?.info || null,
                deliveryTime: variant?.deliveryTime || product.deliveryTime || null,
                productDiscount: 0,
                couponDiscount: 0
              });
            }
          }
          if (reconstructedItems.length > 0) {
            items = reconstructedItems;
            console.log('[STRIPE-SUCCESS] Items reconstruite:', items.length);
          }
        }
      } catch (stripeError) {
        console.error('[STRIPE-SUCCESS] Error fetching Stripe session:', stripeError);
      }
    }
    
    const lang = language === 'en' ? 'en' : 'ro';
    
    // Traduceri pentru email
    const txt = {
      orderConfirmation: lang === 'en' ? 'Order confirmation' : 'Confirmare comandă',
      hello: lang === 'en' ? 'Hello' : 'Bună',
      orderReceived: lang === 'en' ? 'Your order has been received successfully. Below are the details:' : 'Comanda ta a fost primită cu succes. Mai jos găsești detaliile:',
      orderPaid: lang === 'en' ? 'Your order has been paid successfully. Below are the details:' : 'Comanda ta a fost plătită cu succes. Mai jos găsești detaliile:',
      paidOnline: lang === 'en' ? 'Payment was made online by card. Thank you for your trust!' : 'Plata a fost facuta online cu cardul. Îți mulțumim pentru încredere!',
      nr: lang === 'en' ? 'No.' : 'Nr. crt.',
      product: lang === 'en' ? 'Product' : 'Produs',
      quantity: lang === 'en' ? 'Quantity' : 'Cantitate',
      salePrice: lang === 'en' ? 'Sale price' : 'Preț vânzare',
      productDiscount: lang === 'en' ? 'Product discount' : 'Reducere produs',
      couponDiscount: lang === 'en' ? 'Coupon discount' : 'Reducere cupon',
      finalPrice: lang === 'en' ? 'Final price' : 'Preț final',
      subtotal: lang === 'en' ? 'Subtotal' : 'Subtotal',
      deliveryTerm: lang === 'en' ? 'Delivery term' : 'Termen livrare',
      subtotalSalePrice: lang === 'en' ? 'Subtotal sale price' : 'Subtotal preț de vânzare',
      totalProductDiscount: lang === 'en' ? 'Total product discount' : 'Reducere totală produse',
      totalCouponDiscount: lang === 'en' ? 'Total coupon discount' : 'Reducere totală cupon',
      subtotalAfterDiscounts: lang === 'en' ? 'Subtotal after discounts' : 'Subtotal după reduceri',
      courierCostLabel: lang === 'en' ? 'Courier cost' : 'Cost curier',
      paymentMethod: lang === 'en' ? 'Payment method' : 'Metodă de plată',
      cardOnline: lang === 'en' ? 'card online' : 'card online',
      totalNoVat: lang === 'en' ? 'Total without VAT' : 'Total fără TVA',
      vat: lang === 'en' ? 'VAT' : 'TVA',
      totalWithVat: lang === 'en' ? 'Total to pay (with VAT)' : 'Total de plată (cu TVA)',
      deliveryAddress: lang === 'en' ? 'Delivery address' : 'Adresă livrare',
      phone: lang === 'en' ? 'Phone' : 'Telefon',
      thankYou: lang === 'en' ? 'Thank you for your trust!' : 'Îți mulțumim pentru încredere!',
      team: lang === 'en' ? 'PREV-COR TPM Team' : 'Echipa PREV-COR TPM',
      autoEmail: lang === 'en' ? 'This email is automatically generated. For questions, reply to this message or contact us at' : 'Acest email este generat automat. Pentru întrebări, răspunde la acest mesaj sau contactează-ne la',
      emailSubject: lang === 'en' ? 'Order confirmation PREV-COR TPM' : 'Confirmare comandă PREV-COR TPM',
      emailSubjectPaid: lang === 'en' ? 'Payment confirmation PREV-COR TPM' : 'Confirmare plată comandă PREV-COR TPM',
      pdfFilename: lang === 'en' ? 'order_confirmation.pdf' : 'confirmare_comanda.pdf',
      currency: lang === 'en' ? 'RON' : 'lei',
      // Address translations
      county: lang === 'en' ? 'county' : 'jud.',
      postalCodeLabel: lang === 'en' ? 'postal code' : 'cod poștal',
      streetLabel: lang === 'en' ? 'Street' : 'Str.',
      noLabel: lang === 'en' ? 'No.' : 'Nr.',
    };
    
    // TVA dinamic din admin
    const TVA_PERCENT = await getTvaPercent();
    
    // Pentru comenzi manuale, doar actualizează statusul și trimite email
    if (manualOrderId) {
      console.log('[STRIPE-SUCCESS] Comandă manuală detectată, ID:', manualOrderId);
      
      // Găsește și actualizează comanda manuală existentă
      const existingOrder = await prisma.order.findUnique({ where: { id: Number(manualOrderId) } });
      if (!existingOrder) {
        return NextResponse.json({ error: "Comanda manuală nu a fost găsită." }, { status: 404 });
      }
      
      // Actualizează statusul la "plătită online"
      const updatedOrder = await prisma.order.update({
        where: { id: Number(manualOrderId) },
        data: { 
          status: "plătită online",
          paymentMethod: "card"
        }
      });
      
      // Notifică adminul despre plata confirmată
      const manualClientName = (existingOrder.clientData as any)?.denumire || (existingOrder.clientData as any)?.name || userEmail;
      await notifyNewOrder(String(manualOrderId), existingOrder.total || 0, manualClientName);
      
      // Pregătește datele pentru email - folosim datele din comanda existentă
      const orderItems = Array.isArray(existingOrder.items) ? existingOrder.items as any[] : [];
      const orderClient = existingOrder.clientData as any || {};
      const orderEmail = orderClient.email || userEmail;
      
      if (!orderEmail) {
        return NextResponse.json({ error: "Email client lipsă pentru comandă manuală." }, { status: 400 });
      }
      
      // Generează PDF
      const pdfOrder = {
        ...updatedOrder,
        items: orderItems,
        products: orderItems,
        deliveryLabel: existingOrder.deliveryLabel || 'Standard',
      };
      const pdfBuffer = await generateOrderConfirmationPdfBuffer(pdfOrder, lang);
      
      // Folosește calculateCartSummary pentru stacking logic
      const productsRaw: (CartSummaryProduct & { variantCode?: string; variantInfo?: string; listPrice?: number })[] = orderItems.map((item: any) => ({
        id: item.id,
        name: item.name || item.denumire,
        price: item.price,
        listPrice: item.listPrice || null,
        quantity: item.quantity || item.qty || 1,
        discount: item.discount,
        discountType: item.discountType,
        appliedCoupon: item.appliedCoupon || null,
        deliveryTime: item.deliveryTime || '-',
        variantCode: item.variantCode || null,
        variantInfo: item.variantInfo || null,
        // Folosește valorile pre-calculate dacă există
        productDiscountValue: item.productDiscount || null,
        couponDiscountValue: item.couponDiscount || null
      }));
      const summary = calculateCartSummary({ products: productsRaw });
      
      // Verifică dacă există cupoane
      const hasCoupon = productsRaw.some(item => item.appliedCoupon);
      
      // Reconstruiește array-ul de produse - NU aplicăm discount suplimentar, prețul include deja reducerea
      const products = productsRaw.map((item) => {
        // Prețul deja include reducerea de produs
        let priceAfterProductDiscount = item.price;
        
        let couponDiscount = 0;
        let priceAfterCoupon = priceAfterProductDiscount;
        if (item.appliedCoupon) {
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
          couponDiscount,
          priceAfterCoupon,
          subtotal: priceAfterCoupon * item.quantity
        };
      });
      
      // Generează HTML pentru email - tabel simplificat fără coloane de reducere produs
      const tableHeaders = hasCoupon
        ? [txt.nr, txt.product, txt.quantity, txt.salePrice, txt.couponDiscount, txt.finalPrice, txt.subtotal, txt.deliveryTerm]
        : [txt.nr, txt.product, txt.quantity, txt.salePrice, txt.subtotal, txt.deliveryTerm];
      let tableHtml = `<table style='width:100%;border-collapse:collapse;margin-bottom:16px;'>`;
      tableHtml += `<thead style='background:#f3f3f3;'><tr>`;
      for (const header of tableHeaders) {
        if (header === txt.product) {
          tableHtml += `<th style='border:1px solid #ddd;padding:6px 18px;font-weight:bold;text-align:left;min-width:180px;'>${header}</th>`;
        } else {
          tableHtml += `<th style='border:1px solid #ddd;padding:6px;font-weight:bold;text-align:center;'>${header}</th>`;
        }
      }
      tableHtml += `</tr></thead><tbody>`;
      products.forEach((item, idx) => {
        let productName = lang === 'en' && item.nameEn ? item.nameEn : item.name;
        // Adaugă informații variantă dacă există
        const variantDetails = [];
        if (item.variantCode) variantDetails.push(item.variantCode);
        if (item.variantInfo) variantDetails.push(item.variantInfo);
        if (variantDetails.length > 0) {
          productName = `${productName} <br/><span style='font-size:0.9em;color:#666;'>(${variantDetails.join(' - ')})</span>`;
        }
        // Translate delivery term (zile -> days)
        let deliveryTermDisplay = item.deliveryTime || '-';
        if (lang === 'en' && deliveryTermDisplay !== '-') {
          deliveryTermDisplay = deliveryTermDisplay.replace(/zile/gi, 'days').replace(/zi\b/gi, 'day');
        }
        
        // Verifică dacă există discount de produs (listPrice > price)
        const hasProductDiscount = item.listPrice && item.listPrice > item.price;
        
        // Construiește celula de preț cu discount afișat ca în coș
        let priceCell = '';
        if (hasProductDiscount) {
          priceCell = `<span style='text-decoration:line-through;color:#9ca3af;font-size:0.9em;'>${item.listPrice!.toFixed(2)} ${txt.currency}</span><br/>` +
            `<span style='font-weight:600;'>${item.price.toFixed(2)} ${txt.currency}</span>`;
          if (item.discount && item.discount > 0) {
            priceCell += `<br/><span style='color:#16a34a;font-size:0.85em;'>(-${item.discount}%)</span>`;
          }
        } else {
          priceCell = `${item.price.toFixed(2)} ${txt.currency}`;
        }
        
        tableHtml += `<tr>`;
        tableHtml += `<td style='border:1px solid #ddd;padding:6px;text-align:center;'>${idx + 1}</td>`;
        tableHtml += `<td style='border:1px solid #ddd;padding:6px 18px;text-align:left;min-width:180px;'>${productName || '-'}</td>`;
        tableHtml += `<td style='border:1px solid #ddd;padding:6px;text-align:center;'>${item.quantity.toFixed(3)}</td>`;
        tableHtml += `<td style='border:1px solid #ddd;padding:6px;text-align:center;'>${priceCell}</td>`;
        if (hasCoupon) {
          tableHtml += `<td style='border:1px solid #ddd;padding:6px;text-align:center;color:#2563eb;'>${item.couponDiscount > 0 ? '-' + item.couponDiscount.toFixed(2) + ' ' + txt.currency : '-'}</td>`;
          tableHtml += `<td style='border:1px solid #ddd;padding:6px;text-align:center;'>${item.priceAfterCoupon.toFixed(2)} ${txt.currency}</td>`;
        }
        tableHtml += `<td style='border:1px solid #ddd;padding:6px;text-align:center;'>${item.subtotal.toFixed(2)} ${txt.currency}</td>`;
        tableHtml += `<td style='border:1px solid #ddd;padding:6px;text-align:center;'>${deliveryTermDisplay}</td>`;
        tableHtml += `</tr>`;
      });
      tableHtml += `</tbody></table>`;
      
      const courierCostVal = existingOrder.courierCost || 0;
      let salutNume = orderClient.denumire ? `<b>${orderClient.denumire}</b>` : (orderClient.name ? `<b>${orderClient.name}</b>` : '');
      
      // Sumar simplificat - fără linii de reducere când sunt 0
      let sumarHtml = `<div style='margin-bottom:8px;'><b>${txt.subtotalSalePrice}:</b> ${summary.subtotal.toFixed(2)} ${txt.currency}</div>`;
      if (summary.totalCouponDiscount > 0) {
        sumarHtml += `<div style='margin-bottom:8px;color:#2563eb;'><b>${txt.totalCouponDiscount}:</b> -${summary.totalCouponDiscount.toFixed(2)} ${txt.currency}</div>`;
        sumarHtml += `<div style='margin-bottom:8px;color:green;'><b>${txt.subtotalAfterDiscounts}:</b> ${summary.subtotalDupaReduceri.toFixed(2)} ${txt.currency}</div>`;
      }
      sumarHtml += `<div style='margin-bottom:8px;'><b>${txt.courierCostLabel}:</b> ${courierCostVal.toFixed(2)} ${txt.currency}</div>`;
      sumarHtml += `<div style='margin-bottom:8px;'><b>${txt.paymentMethod}:</b> ${txt.cardOnline}</div>`;
      sumarHtml += `<div style='margin-bottom:8px;'><b>${txt.totalNoVat}:</b> ${summary.totalFaraTVA.toFixed(2)} ${txt.currency}</div>`;
      sumarHtml += `<div style='margin-bottom:8px;'><b>${txt.vat} (21%):</b> ${summary.tva.toFixed(2)} ${txt.currency}</div>`;
      sumarHtml += `<div style='font-size:1.1rem; font-weight:700; margin-bottom:8px; color:#2563eb;'><b>${txt.totalWithVat}:</b> ${summary.totalCuTVA.toFixed(2)} ${txt.currency}</div>`;
      
      let html = `<div style='font-family: Arial, sans-serif; max-width: 980px; margin: 0 auto; border:1px solid #e5e7eb; border-radius:8px; overflow-x:auto; background:#fff;'>
      <div style='background:#2563eb; color:#fff; padding:24px 48px;'>
        <h1 style='margin:0; font-size:2rem; font-weight:700; letter-spacing:1px;'>PREV-COR TPM</h1>
        <p style='margin:0; font-size:1.1rem;'>${txt.orderConfirmation}</p>
      </div>
      <div style='padding:32px 48px 16px 48px; background:#fff;'>
        <p style='font-size:1.1rem; margin-bottom:16px;'>${txt.hello}${salutNume ? ', ' + salutNume : ''}!</p>
        <p style='margin-bottom:16px;'>${txt.orderPaid}</p>
        <div style='background:#f3f4f6; border-left:4px solid #2563eb; padding:12px 18px; margin-bottom:18px; color:#2563eb; font-size:1.08rem; font-weight:500;'>${txt.paidOnline}</div>
        <div style='overflow-x:auto;'>${tableHtml}</div>
        ${sumarHtml}
        <div style='margin-top:16px; color:#2563eb; font-weight:600;'>${txt.thankYou}<br/>${txt.team}</div>
      </div>
      <div style='background:#f3f4f6; color:#444; padding:12px 32px; font-size:0.95rem;'>
        ${txt.autoEmail} <a href='mailto:${COMPANY_CONFIG.email}' style='color:#2563eb;'>${COMPANY_CONFIG.email}</a>.
      </div>
    </div>`;
      
      await sendEmail({
        to: orderEmail,
        subject: lang === 'en' 
          ? `Payment confirmation #${manualOrderId} - PREV-COR TPM`
          : `Confirmare plată comandă #${manualOrderId} - PREV-COR TPM`,
        text: `${txt.orderPaid}\n\nTotal: ${updatedOrder.total?.toFixed(2) || '-'} ${txt.currency}\n\n${txt.team}`,
        html,
        attachments: [
          {
            filename: txt.pdfFilename,
            content: pdfBuffer,
          },
        ],
      });
      
      return NextResponse.json({ success: true, orderId: manualOrderId });
    }
    
    // Pentru comenzi online normale (nu manuale)
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Lipsă sau array gol pentru items." }, { status: 400 });
    }
    if (!client || typeof client !== 'object' || !client.email) {
      return NextResponse.json({ error: "Lipsă sau date incomplete pentru client." }, { status: 400 });
    }
    if (!userEmail || typeof userEmail !== 'string') {
      return NextResponse.json({ error: "Lipsă email client." }, { status: 400 });
    }

    // Încarcă nameEn din baza de date pentru fiecare produs
    const productIds = items.map((item: any) => Number(item.id)).filter(Boolean);
    const productsFromDb = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, nameEn: true }
    });
    const nameEnMap = new Map(productsFromDb.map(p => [p.id, p.nameEn]));
    
    // Îmbogățește items cu nameEn din DB
    const itemsWithNameEn = items.map((item: any) => ({
      ...item,
      nameEn: item.nameEn || nameEnMap.get(Number(item.id)) || ''
    }));

    // Eliminat verificarea de duplicate: emailul se va trimite la fiecare POST, chiar dacă există deja o comandă identică


    // Calculează sumarul din datele reale
    const subtotalPretVanzare = items.reduce((sum, item) => sum + (typeof item.price === 'number' ? item.price : 0) * (item.qty || item.quantity || 1), 0);
    // Prețul deja include reducerea de produs - nu aplicăm discount suplimentar
    const subtotalDupaProduseDiscount = subtotalPretVanzare;
    // Stacking: aplică cuponul peste subtotalul de vânzare
    const appliedCoupon = items[0]?.appliedCoupon || null;
    let subtotalDupaReduceri = subtotalDupaProduseDiscount;
    if (appliedCoupon) {
      if (appliedCoupon.type === 'percent') {
        subtotalDupaReduceri = subtotalDupaProduseDiscount * (1 - appliedCoupon.value / 100);
      } else if (appliedCoupon.type === 'fixed') {
        subtotalDupaReduceri = Math.max(0, subtotalDupaProduseDiscount - appliedCoupon.value);
      }
    }
    const reducereTotala = subtotalPretVanzare - subtotalDupaReduceri;
    const courierCostVal = typeof courierCost === 'number' ? courierCost : 0;
    const totalFaraTVA = subtotalDupaReduceri + courierCostVal;
    const tva = totalFaraTVA * (TVA_PERCENT / 100);
    const totalCuTVA = totalFaraTVA + tva;

    // Creează comanda în baza de date
    const order = await prisma.order.create({
      data: {
        items: Array.isArray(items) ? items : [],
        clientData: client,
        total: totalCuTVA,
        status: "plătită online",
        paymentMethod: paymentMethod || "card",
        courierCost: courierCostVal,
        source: "online",
      },
    });

    // Notifică adminul despre comandă nouă
    const clientName = client?.denumire || client?.name || client?.companyName || userEmail;
    await notifyNewOrder(String(order.id), totalCuTVA, clientName);

    // Marchează coșul abandonat ca recuperat
    try {
      await (prisma as any).abandonedCart.updateMany({
        where: { email: userEmail, recovered: false },
        data: { recovered: true }
      });
    } catch (e) {
      console.log('Error marking abandoned cart as recovered:', e);
    }

    // Scade automat stocul produselor/variantelor comandate (skip pentru produse pe comandă)
    for (const item of Array.isArray(items) ? items : []) {
      if (item.id && typeof item.quantity === 'number') {
        const variantId = item.variantId ? Number(item.variantId) : null;
        
        if (variantId) {
          // Scade stocul din varianta selectată
          const variant = await prisma.productVariant.findUnique({ where: { id: variantId } });
          // Skip verificare stoc dacă varianta este pe comandă (onDemand)
          const isOnDemand = (variant as any)?.onDemand === true;
          if (!isOnDemand && (!variant || typeof variant.stoc !== 'number' || variant.stoc < item.quantity)) {
            return NextResponse.json({
              error: `<div style='background:#d1fae5;border:1px solid #10b981;padding:24px 18px;margin:24px 0 0 0;border-radius:12px;text-align:center;'><div style='font-size:1.6rem;font-weight:bold;color:#059669;margin-bottom:10px;'>Comanda nu a putut fi procesată!</div><div style='font-size:1.1rem;color:#222;margin-bottom:8px;'>Stoc insuficient pentru varianta <b>${item.variantCode || variantId}<\/b> a produsului <b>${item.name || item.denumire || '-'}<\/b>. Disponibil: <b>${variant ? variant.stoc : 0}<\/b></div><div style='color:#444;'>Vă rugăm să verificați stocul sau să alegeți altă variantă.</div></div>`
            }, { status: 400 });
          }
          // Pentru onDemand, NU decrementăm stocul (nu există stoc fizic)
          if (!isOnDemand) {
            await prisma.productVariant.update({
              where: { id: variantId },
              data: { stoc: { decrement: item.quantity } }
            });
          }
        } else {
          // Scade stocul din produsul principal (fără variante)
          const prod = await prisma.product.findUnique({ where: { id: Number(item.id) } });
          // Skip verificare stoc dacă produsul este pe comandă (onDemand)
          const isOnDemand = prod?.onDemand === true;
          if (!isOnDemand && (!prod || typeof prod.stock !== 'number' || prod.stock < item.quantity)) {
            return NextResponse.json({
              error: `<div style='background:#d1fae5;border:1px solid #10b981;padding:24px 18px;margin:24px 0 0 0;border-radius:12px;text-align:center;'><div style='font-size:1.6rem;font-weight:bold;color:#059669;margin-bottom:10px;'>Comanda nu a putut fi procesată!</div><div style='font-size:1.1rem;color:#222;margin-bottom:8px;'>Stoc insuficient pentru produsul <b>${item.name || item.denumire || '-'}<\/b>. Disponibil: <b>${prod ? prod.stock : 0}<\/b></div><div style='color:#444;'>Vă rugăm să verificați stocul sau să alegeți alt produs.</div></div>`
            }, { status: 400 });
          }
          // Pentru onDemand, NU decrementăm stocul (nu există stoc fizic)
          if (!isOnDemand) {
            await prisma.product.update({
              where: { id: Number(item.id) },
              data: { stock: { decrement: item.quantity } }
            });
          }
        }
      }
    }
    // Generează PDF
    const produse = Array.isArray(itemsWithNameEn) ? itemsWithNameEn : [];
    // Etichetă pentru tip livrare
    let deliveryLabel = '';
    switch (typeof deliveryType === 'string' ? deliveryType.trim() : '') {
      case 'pickup': deliveryLabel = 'Ridicare de la sediu'; break;
      case 'client': deliveryLabel = 'Expediere pe cont client'; break;
      case 'standard': deliveryLabel = 'Standard'; break;
      case 'rapid': deliveryLabel = 'Rapid'; break;
      default: deliveryLabel = '';
    }
    const pdfOrder = {
      ...order,
      items: produse,
      products: produse,
      courierCost: typeof courierCost === 'number' ? courierCost : 0,
      deliveryType: typeof deliveryType === 'string' ? deliveryType.trim() : '',
      deliveryLabel,
      paymentMethod: paymentMethod || 'card',
    };
    // Asigură cheia 'products' pentru PDF
    if (!pdfOrder.products || !Array.isArray(pdfOrder.products) || pdfOrder.products.length === 0) {
      pdfOrder.products = produse;
    }
    const pdfBuffer = await generateOrderConfirmationPdfBuffer(pdfOrder, lang);
    // Folosește calculateCartSummary pentru stacking logic corect
      const productsRaw: (CartSummaryProduct & { nameEn?: string | null; variantCode?: string; variantInfo?: string; listPrice?: number })[] = (itemsWithNameEn || []).map((item: any) => ({
      id: item.id,
      name: item.name || item.denumire,
      nameEn: item.nameEn || null,
      price: item.price,
      listPrice: item.listPrice || null,
      quantity: item.quantity || item.qty || 1,
      discount: item.discount,
      discountType: item.discountType,
      appliedCoupon: item.appliedCoupon || null,
      deliveryTime: item.deliveryTime || item.deliveryTerm || '-',
      variantCode: item.variantCode || null,
      variantInfo: item.variantInfo || null,
      // Folosește valorile pre-calculate dacă există
      productDiscountValue: item.productDiscount || null,
      couponDiscountValue: item.couponDiscount || null
    }));
    const summary = calculateCartSummary({ products: productsRaw });
    
    // Verifică dacă există cupoane
    const hasCouponOnline = productsRaw.some(item => item.appliedCoupon || (typeof (item as any).couponDiscountValue === 'number' && (item as any).couponDiscountValue > 0));
    
    // Reconstruiește array-ul de produse - NU aplicăm discount suplimentar, prețul include deja reducerea
    const products = productsRaw.map((item) => {
      // Prețul deja include reducerea de produs
      let priceAfterProductDiscount = item.price;
      
      let couponDiscount = 0;
      let priceAfterCoupon = priceAfterProductDiscount;
      
      // Calculează doar cupon dacă există
      if (typeof (item as any).couponDiscountValue === 'number' && (item as any).couponDiscountValue > 0) {
        couponDiscount = (item as any).couponDiscountValue;
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
        couponDiscount,
        priceAfterCoupon,
        subtotal: priceAfterCoupon * item.quantity
      };
    });
    // Generează HTML simplificat - fără coloane de reducere produs
    const tableHeaders = hasCouponOnline
      ? [txt.nr, txt.product, txt.quantity, txt.salePrice, txt.couponDiscount, txt.finalPrice, txt.subtotal, txt.deliveryTerm]
      : [txt.nr, txt.product, txt.quantity, txt.salePrice, txt.subtotal, txt.deliveryTerm];
    let tableHtml = `<table style='width:100%;border-collapse:collapse;margin-bottom:16px;'>`;
    tableHtml += `<thead style='background:#f3f3f3;'><tr>`;
    for (const header of tableHeaders) {
      if (header === txt.product) {
        tableHtml += `<th style='border:1px solid #ddd;padding:6px 18px;font-weight:bold;text-align:left;min-width:180px;'>${header}</th>`;
      } else {
        tableHtml += `<th style='border:1px solid #ddd;padding:6px;font-weight:bold;text-align:center;'>${header}</th>`;
      }
    }
    tableHtml += `</tr></thead><tbody>`;
    products.forEach((item, idx) => {
      let productName = lang === 'en' && item.nameEn ? item.nameEn : item.name;
      // Adaugă informații variantă dacă există
      const variantDetails = [];
      if (item.variantCode) variantDetails.push(item.variantCode);
      if (item.variantInfo) variantDetails.push(item.variantInfo);
      if (variantDetails.length > 0) {
        productName = `${productName} <br/><span style='font-size:0.9em;color:#666;'>(${variantDetails.join(' - ')})</span>`;
      }
      // Translate delivery term (zile -> days)
      let deliveryTermDisplay = item.deliveryTime || '-';
      if (lang === 'en' && deliveryTermDisplay !== '-') {
        deliveryTermDisplay = deliveryTermDisplay.replace(/zile/gi, 'days').replace(/zi\b/gi, 'day');
      }
      
      // Verifică dacă există discount de produs (listPrice > price)
      const hasProductDiscount = item.listPrice && item.listPrice > item.price;
      
      // Construiește celula de preț cu discount afișat ca în coș
      let priceCell = '';
      if (hasProductDiscount) {
        priceCell = `<span style='text-decoration:line-through;color:#9ca3af;font-size:0.9em;'>${item.listPrice!.toFixed(2)} ${txt.currency}</span><br/>` +
          `<span style='font-weight:600;'>${item.price.toFixed(2)} ${txt.currency}</span>`;
        if (item.discount && item.discount > 0) {
          priceCell += `<br/><span style='color:#16a34a;font-size:0.85em;'>(-${item.discount}%)</span>`;
        }
      } else {
        priceCell = `${item.price.toFixed(2)} ${txt.currency}`;
      }
      
      tableHtml += `<tr>`;
      tableHtml += `<td style='border:1px solid #ddd;padding:6px;text-align:center;'>${idx + 1}</td>`;
      tableHtml += `<td style='border:1px solid #ddd;padding:6px 18px;text-align:left;min-width:180px;'>${productName || '-'}</td>`;
      tableHtml += `<td style='border:1px solid #ddd;padding:6px;text-align:center;'>${item.quantity.toFixed(3)}</td>`;
      tableHtml += `<td style='border:1px solid #ddd;padding:6px;text-align:center;'>${priceCell}</td>`;
      if (hasCouponOnline) {
        tableHtml += `<td style='border:1px solid #ddd;padding:6px;text-align:center;color:#2563eb;'>${item.couponDiscount > 0 ? '-' + item.couponDiscount.toFixed(2) + ' ' + txt.currency : '-'}</td>`;
        tableHtml += `<td style='border:1px solid #ddd;padding:6px;text-align:center;'>${item.priceAfterCoupon.toFixed(2)} ${txt.currency}</td>`;
      }
      tableHtml += `<td style='border:1px solid #ddd;padding:6px;text-align:center;'>${item.subtotal.toFixed(2)} ${txt.currency}</td>`;
      tableHtml += `<td style='border:1px solid #ddd;padding:6px;text-align:center;'>${deliveryTermDisplay}</td>`;
      tableHtml += `</tr>`;
    });
    tableHtml += `</tbody></table>`;

    // Calculează sumarul din datele reale
    // ...existing code...

    // Adresă și telefon din client
    // Extragere robustă adresă și telefon (toate variantele)
    let adresaLivrare = '';
    let adresaRaw = '';
    if (typeof client.adresaSediu === 'string' && client.adresaSediu.trim() !== '') adresaRaw = client.adresaSediu.trim();
    else if (typeof client.adresa === 'string' && client.adresa.trim() !== '') adresaRaw = client.adresa.trim();
    else if (typeof client.street === 'string' && client.street.trim() !== '') adresaRaw = client.street.trim();
    else if (typeof client.address === 'string' && client.address.trim() !== '') adresaRaw = client.address.trim();
    if (adresaRaw) adresaLivrare = adresaRaw;
    // Adaugă număr dacă există
    if (client.nr && typeof client.nr === 'string' && !adresaLivrare.includes(client.nr)) adresaLivrare += (adresaLivrare ? ', ' + txt.noLabel : txt.noLabel) + client.nr;
    // Adaugă oraș/city
    if (client.oras && typeof client.oras === 'string' && !adresaLivrare.includes(client.oras)) adresaLivrare += (adresaLivrare ? ', ' : '') + client.oras;
    if (client.city && typeof client.city === 'string' && !adresaLivrare.includes(client.city)) adresaLivrare += (adresaLivrare ? ', ' : '') + client.city;
    // Adaugă județ/county
    let judetVal = client.judet || client.county || '';
    // Strip existing prefix like "Judetul ", "Jud.", etc.
    if (typeof judetVal === 'string') {
      judetVal = judetVal.replace(/^(Judetul|Județul|Jud\.?)\s*/i, '').trim();
    }
    if (judetVal && !adresaLivrare.includes(judetVal)) adresaLivrare += (adresaLivrare ? ', ' + txt.county + ' ' : txt.county + ' ') + judetVal;
    // Adaugă cod poștal/postalCode
    if (client.codPostal && typeof client.codPostal === 'string' && !adresaLivrare.includes(client.codPostal)) adresaLivrare += (adresaLivrare ? ', ' + txt.postalCodeLabel + ' ' : txt.postalCodeLabel + ' ') + client.codPostal;
    if (client.postalCode && typeof client.postalCode === 'string' && !adresaLivrare.includes(client.postalCode)) adresaLivrare += (adresaLivrare ? ', ' + txt.postalCodeLabel + ' ' : txt.postalCodeLabel + ' ') + client.postalCode;
    adresaLivrare = (adresaLivrare || '').replace(/^[,\s]+|[,\s]+$/g, '');
    if (!adresaLivrare || adresaLivrare === ',') adresaLivrare = '-';
    // Translate street and number labels in address string
    if (lang === 'en') {
      adresaLivrare = adresaLivrare
        .replace(/\bSTRADA\b/gi, 'Street')
        .replace(/\bSTR\.\s*/gi, 'Street ')
        .replace(/\bNR\.\s*/gi, 'No. ')
        .replace(/\bJudetul\b/gi, 'county')
        .replace(/\bJudețul\b/gi, 'county')
        .replace(/,\s*Romania\b/gi, ', country Romania');
    }
    // Telefon robust
    let telefon = '';
    if (typeof client.telefon === 'string' && client.telefon.trim() !== '') telefon = client.telefon.trim();
    else if (typeof client.phone === 'string' && client.phone.trim() !== '') telefon = client.phone.trim();
    else if (typeof client.telefonContact === 'string' && client.telefonContact.trim() !== '') telefon = client.telefonContact.trim();
    if (!telefon && typeof client.mobile === 'string' && client.mobile.trim() !== '') telefon = client.mobile.trim();
    telefon = (telefon || '').toString().trim();
    if (!telefon) telefon = '-';
    let tipLivrareEmail = typeof deliveryType === 'string' ? deliveryType : '';

    let salutNume = '';
    if (client.denumire) {
      salutNume = `<b>${client.denumire}</b>`;
    } else if (client.name) {
      salutNume = `<b>${client.name}</b>`;
    }
    
    // Sumar simplificat - fără linii de reducere când sunt 0
    let sumarHtmlOnline = `<div style='margin-bottom:8px;'><b>${txt.subtotalSalePrice}:</b> ${summary.subtotal.toFixed(2)} ${txt.currency}</div>`;
    if (summary.totalCouponDiscount > 0) {
      sumarHtmlOnline += `<div style='margin-bottom:8px;color:#2563eb;'><b>${txt.totalCouponDiscount}:</b> -${summary.totalCouponDiscount.toFixed(2)} ${txt.currency}</div>`;
      sumarHtmlOnline += `<div style='margin-bottom:8px;color:green;'><b>${txt.subtotalAfterDiscounts}:</b> ${summary.subtotalDupaReduceri.toFixed(2)} ${txt.currency}</div>`;
    }
    sumarHtmlOnline += `<div style='margin-bottom:8px;'><b>${txt.courierCostLabel} (${tipLivrareEmail}):</b> ${courierCostVal.toFixed(2)} ${txt.currency}</div>`;
    sumarHtmlOnline += `<div style='margin-bottom:8px;'><b>${txt.paymentMethod}:</b> ${txt.cardOnline}</div>`;
    sumarHtmlOnline += `<div style='margin-bottom:8px;'><b>${txt.totalNoVat}:</b> ${summary.totalFaraTVA.toFixed(2)} ${txt.currency}</div>`;
    sumarHtmlOnline += `<div style='margin-bottom:8px;'><b>${txt.vat} (${TVA_PERCENT}%):</b> ${summary.tva.toFixed(2)} ${txt.currency}</div>`;
    sumarHtmlOnline += `<div style='font-size:1.1rem; font-weight:700; margin-bottom:8px; color:#2563eb;'><b>${txt.totalWithVat}:</b> ${summary.totalCuTVA.toFixed(2)} ${txt.currency}</div>`;
    
    let html = `<div style='font-family: Arial, sans-serif; max-width: 980px; margin: 0 auto; border:1px solid #e5e7eb; border-radius:8px; overflow-x:auto; background:#fff;'>
    <div style='background:#2563eb; color:#fff; padding:24px 48px;'>
      <h1 style='margin:0; font-size:2rem; font-weight:700; letter-spacing:1px;'>PREV-COR TPM</h1>
      <p style='margin:0; font-size:1.1rem;'>${txt.orderConfirmation}</p>
    </div>
    <div style='padding:32px 48px 16px 48px; background:#fff;'>
      <p style='font-size:1.1rem; margin-bottom:16px;'>${txt.hello}${salutNume ? ', ' + salutNume : ''}!</p>
      <p style='margin-bottom:16px;'>${txt.orderReceived}</p>
      <div style='background:#f3f4f6; border-left:4px solid #2563eb; padding:12px 18px; margin-bottom:18px; color:#2563eb; font-size:1.08rem; font-weight:500;'>${txt.paidOnline}</div>
      <div style='overflow-x:auto;'>${tableHtml}</div>
      ${sumarHtmlOnline}
      <div style='margin-bottom:4px;'><b>${txt.deliveryAddress}:</b> ${adresaLivrare}</div>
      <div style='margin-bottom:4px;'><b>${txt.phone}:</b> ${telefon}</div>
      <div style='margin-top:16px; color:#2563eb; font-weight:600;'><a href='#' style='color:#2563eb;text-decoration:none;'>${txt.thankYou}</a><br/>${txt.team}</div>
    </div>
    <div style='background:#f3f4f6; color:#444; padding:12px 32px; font-size:0.95rem;'>
      ${txt.autoEmail} <a href='mailto:${COMPANY_CONFIG.email}' style='color:#2563eb;'>${COMPANY_CONFIG.email}</a>.
    </div>
  </div>`;

    // Adaug text simplu cu mesajul de plată online
    let produseText = (itemsWithNameEn || []).map((item, idx) => {
      const qty = Number(item.qty || item.quantity || 1);
      const priceBase = typeof item.price === 'number' ? item.price : 0;
      let discount = typeof item.discount === 'number' ? item.discount : 0;
      if (discount > 1 && discount <= 100) discount = discount / 100;
      if (discount > 1) discount = 1;
      if (discount < 0) discount = 0;
      let priceWithDiscount = priceBase;
      if (item.discountType === 'percent' || (!item.discountType && discount > 0)) {
        priceWithDiscount = priceBase * (1 - discount);
      } else if (item.discountType === 'fixed') {
        priceWithDiscount = priceBase - discount;
      }
      if (priceWithDiscount < 0) priceWithDiscount = 0;
      const subtotal = priceWithDiscount * qty;
      const productName = lang === 'en' && item.nameEn ? item.nameEn : (item.name || item.denumire || '-');
      return `${lang === 'en' ? 'Product' : 'Produs'}: ${productName}\n${lang === 'en' ? 'Quantity' : 'Cantitate'}: ${qty.toFixed(3)}\n${lang === 'en' ? 'Sale price' : 'Preț de vânzare'}: ${priceBase.toFixed(2)} ${txt.currency}\n${lang === 'en' ? 'Price with discount' : 'Preț cu discount'}: ${priceWithDiscount.toFixed(2)} ${txt.currency}\n${lang === 'en' ? 'Applied discount' : 'Discount aplicat'}: ${(discount * 100).toFixed(0)}%\nSubtotal: ${subtotal.toFixed(2)} ${txt.currency}\n${lang === 'en' ? 'Delivery term' : 'Termen livrare'}: ${item.deliveryTime || '-'}`;
    }).join('\n\n');
    let adresaLivrareText = `${client.street ? client.street : ''}${client.nr ? ', Nr.' + client.nr : ''}${client.address && !client.street ? client.address : ''}${client.city ? ', ' + client.city : ''}${client.county ? ', jud. ' + client.county : ''}${client.postalCode ? ', cod poștal ' + client.postalCode : ''}`;
    let telefonText = client.phone || '';
    let tipLivrareText = typeof deliveryType === 'string' && deliveryType.trim() ? deliveryType.trim() : '';
    let text = `${txt.hello},\n\n${txt.paidOnline}\n\n${produseText}\n\n${txt.subtotalSalePrice}: ${subtotalPretVanzare.toFixed(2)} ${txt.currency}\n${txt.subtotalAfterDiscounts}: ${subtotalDupaReduceri.toFixed(2)} ${txt.currency}\n${txt.totalProductDiscount}: -${reducereTotala.toFixed(2)} ${txt.currency}\n${txt.courierCostLabel} (${tipLivrareText}): ${courierCostVal.toFixed(2)} ${txt.currency}\n${txt.totalNoVat}: ${totalFaraTVA.toFixed(2)} ${txt.currency}\n${txt.vat} (${TVA_PERCENT}%): ${tva.toFixed(2)} ${txt.currency}\n${txt.totalWithVat}: ${totalCuTVA.toFixed(2)} ${txt.currency}\n\n${txt.deliveryAddress}: ${adresaLivrareText}\n${txt.phone}: ${telefonText}\n\n${txt.team}\n\n${txt.autoEmail} ${COMPANY_CONFIG.email}.`;
    
    // Subiect cu număr comandă pentru a nu fi grupate în Gmail
    const emailSubjectWithId = lang === 'en' 
      ? `Order confirmation #${order.id} - PREV-COR TPM`
      : `Confirmare comandă #${order.id} - PREV-COR TPM`;
    
    await sendEmail({
      to: userEmail,
      subject: emailSubjectWithId,
      text,
      html,
      attachments: [
        {
          filename: txt.pdfFilename,
          content: pdfBuffer,
        },
      ],
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    let errorDetails = '';
    if (err instanceof Error) {
      errorDetails = err.stack || err.message;
    } else if (typeof err === 'object') {
      errorDetails = JSON.stringify(err);
    } else {
      errorDetails = String(err);
    }
    console.error('[EMAIL] Eroare la trimitere:', errorDetails);
    return NextResponse.json({ error: "Eroare la trimiterea emailului de confirmare.", details: errorDetails }, { status: 500 });
  }
}
