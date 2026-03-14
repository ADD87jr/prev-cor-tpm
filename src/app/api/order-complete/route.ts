// ...existing code...
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateOrderConfirmationPdfBuffer } from "@/app/utils/orderConfirmationPdfLib";
import { calculateCartSummary, CartSummaryProduct } from "@/app/utils/cartSummary";
import { sendEmail } from "@/app/utils/email";
import { getCartSettings } from "@/lib/getTvaPercent";
import { notifyNewOrder } from "@/lib/push-notifications";
import { COMPANY_CONFIG } from "@/lib/companyConfig";


export async function POST(req: NextRequest) {
    console.log('[ORDER-COMPLETE] --- INTRARE ---');
  console.log('[DEBUG] INTRARE în funcția POST /api/order-complete');
  let html = `<div style='font-family: Arial, sans-serif; max-width: 980px; margin: 0 auto; border:1px solid #e5e7eb; border-radius:8px; overflow-x:auto; background:#fff;'>`;
  try {
    let { userId, userEmail, client, items, paymentMethod, deliveryType, courierCost, manualOrderId, language } = await req.json();
    const lang = language === 'en' ? 'en' : 'ro';
    // Translations
    const txt = {
      subject: lang === 'en' ? 'Order confirmation PREV-COR TPM' : 'Confirmare comandă PREV-COR TPM',
      greeting: lang === 'en' ? 'Hello' : 'Bună',
      orderReceived: lang === 'en' ? 'Your order has been received successfully. Below you will find the details:' : 'Comanda ta a fost primită cu succes. Mai jos găsești detaliile:',
      thankYou: lang === 'en' ? 'Thank you for your trust!' : 'Îți mulțumim pentru încredere!',
      team: lang === 'en' ? 'The PREV-COR TPM Team' : 'Echipa PREV-COR TPM',
      autoEmail: lang === 'en' ? 'This email is automatically generated. For questions, reply to this message or contact us at' : 'Acest email este generat automat. Pentru întrebări, răspunde la acest mesaj sau contactează-ne la',
      // Payment phrases
      paymentRamburs: lang === 'en' ? 'Payment will be made at delivery, directly to the courier. Thank you for your trust!' : 'Plata va fi făcută la livrare, direct curierului. Îți mulțumim pentru încredere!',
      paymentCard: lang === 'en' ? 'Payment was made online by card. Thank you for your trust!' : 'Plata a fost făcută online cu cardul. Îți mulțumim pentru încredere!',
      paymentRate: lang === 'en' ? 'Payment will be made in installments. A PREV-COR TPM consultant will contact you for finalization.' : 'Plata va fi făcută în rate. Un consultant PREV-COR TPM te va contacta pentru finalizare.',
      paymentTransfer: lang === 'en' ? 'Payment will be made by bank transfer. You will receive the details via email.' : 'Plata va fi făcută prin transfer bancar. Vei primi detaliile pe email.',
      // Table headers
      headerNo: lang === 'en' ? 'No.' : 'Nr. crt.',
      headerProduct: lang === 'en' ? 'Product' : 'Produs',
      headerQty: lang === 'en' ? 'Quantity' : 'Cantitate',
      headerPrice: lang === 'en' ? 'Sale price' : 'Preț vânzare',
      headerProductDiscount: lang === 'en' ? 'Product discount' : 'Reducere produs',
      headerCouponDiscount: lang === 'en' ? 'Coupon discount' : 'Reducere cupon',
      headerFinalPrice: lang === 'en' ? 'Final price' : 'Preț final',
      headerSubtotal: lang === 'en' ? 'Subtotal' : 'Subtotal',
      headerDelivery: lang === 'en' ? 'Delivery term' : 'Termen livrare',
      // Summary labels
      subtotalLabel: lang === 'en' ? 'Sale price subtotal' : 'Subtotal preț de vânzare',
      totalProductDiscount: lang === 'en' ? 'Total product discount' : 'Reducere totală produse',
      totalCouponDiscount: lang === 'en' ? 'Total coupon discount' : 'Reducere totală cupon',
      subtotalAfterDiscounts: lang === 'en' ? 'Subtotal after discounts' : 'Subtotal după reduceri',
      courierCostLabel: lang === 'en' ? 'Courier cost' : 'Cost curier',
      paymentMethodLabel: lang === 'en' ? 'Payment method' : 'Metodă de plată',
      totalWithoutVAT: lang === 'en' ? 'Total without VAT' : 'Total fără TVA',
      vat: lang === 'en' ? 'VAT' : 'TVA',
      totalToPay: lang === 'en' ? 'Total to pay (with VAT)' : 'Total de plată (cu TVA)',
      deliveryAddress: lang === 'en' ? 'Delivery address' : 'Adresă livrare',
      phoneLabel: lang === 'en' ? 'Phone' : 'Telefon',
      // Payment method names
      paymentCashOnDelivery: lang === 'en' ? 'cash on delivery' : 'ramburs la livrare',
      paymentCardOnline: lang === 'en' ? 'online card' : 'card online',
      paymentInstallments: lang === 'en' ? 'installments' : 'plată în rate',
      paymentBankTransfer: lang === 'en' ? 'bank transfer' : 'transfer bancar',
      currencyUnit: lang === 'en' ? 'RON' : 'lei',
      productsOrdered: lang === 'en' ? 'Ordered products' : 'Produse comandate',
      // Address translations
      county: lang === 'en' ? 'county' : 'jud.',
      postalCodeLabel: lang === 'en' ? 'postal code' : 'cod poștal',
      // Prețuri orientative
      priceDisclaimer: lang === 'en' ? 'The prices shown are indicative. A PREV-COR TPM consultant will contact you shortly to confirm the final price before processing.' : 'Prețurile afișate sunt orientative. Un consultant PREV-COR TPM te va contacta în scurt timp pentru a confirma prețul final înainte de procesare.',
    };
    const subject = txt.subject;
    console.log('[ORDER-COMPLETE] Payload primit:', { userId, userEmail, manualOrderId, paymentMethod, items });
    if (typeof manualOrderId === 'string' && manualOrderId.match(/^\d+$/)) manualOrderId = Number(manualOrderId);
    console.log('[ORDER-COMPLETE] manualOrderId primit:', manualOrderId, typeof manualOrderId);
    if (!userId && !userEmail) {
      return NextResponse.json({ error: "Date lipsă (userId sau userEmail)" }, { status: 400 });
    }
    // Fallback robust pentru nume client
    const isEmpty = (val: any) => !val || (typeof val === 'string' && val.trim() === '');
    if (isEmpty(client.denumire) && isEmpty(client.name)) {
      if (!isEmpty(client.companyName)) {
        client.denumire = client.companyName;
      } else if (client.clientType === 'companie' && !isEmpty(client.email)) {
        client.denumire = client.email;
      } else if (!isEmpty(client.email)) {
        client.name = client.email;
      } else {
        if (client.clientType === 'companie') client.denumire = 'Client necunoscut';
        else client.name = 'Client necunoscut';
      }
    }
    if (client.clientType === 'companie' && isEmpty(client.denumire) && !isEmpty(client.name)) {
      client.denumire = client.name;
    }
    if (client.clientType !== 'companie' && isEmpty(client.name) && !isEmpty(client.denumire)) {
      client.name = client.denumire;
    }
    // Validare date client
    if (client.clientType !== 'companie') {
      if (!client.name || !client.email || !client.phone || !client.address) {
        return NextResponse.json({ error: "Date client lipsă (nume, email, telefon, adresă)" }, { status: 400 });
      }
    } else {
      if (!client.companyName || !client.email || !client.phone || !client.address) {
        return NextResponse.json({ error: "Date client companie lipsă (denumire, email, telefon, adresă)" }, { status: 400 });
      }
    }
    // Validare produse
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: 'Nu există produse pentru email.' }, { status: 200 });
    }
    // Verificare stoc pentru fiecare produs/variantă (skip pentru produse pe comandă)
    const productIds = items.map((item: any) => item.id).filter(Boolean);
    const productsDb = await prisma.product.findMany({ where: { id: { in: productIds } } });
    const variantIds = items.map((item: any) => item.variantId).filter(Boolean).map(Number);
    const variantsDb = variantIds.length > 0 ? await prisma.productVariant.findMany({ where: { id: { in: variantIds } } }) : [];
    for (const item of items) {
      const dbProd = productsDb.find(p => p.id === item.id);
      const qty = Number(item.qty || item.quantity || 1);
      const variantId = item.variantId ? Number(item.variantId) : null;
      
      if (variantId) {
        // Verifică varianta
        const dbVariant = variantsDb.find(v => v.id === variantId);
        // Skip verificare stoc dacă varianta este pe comandă (onDemand)
        if ((dbVariant as any)?.onDemand === true) continue;
        if (!dbVariant || typeof dbVariant.stoc !== 'number' || dbVariant.stoc < qty) {
          return NextResponse.json({ success: false, error: `Stoc insuficient pentru varianta "${item.variantCode || variantId}" a produsului "${item.name || item.denumire || '-'}". Disponibil: ${dbVariant ? dbVariant.stoc : 0}` }, { status: 400 });
        }
      } else {
        // Skip verificare stoc dacă produsul este pe comandă (onDemand)
        if (dbProd?.onDemand === true) continue;
        if (!dbProd || typeof dbProd.stock !== 'number' || dbProd.stock < qty) {
          return NextResponse.json({ success: false, error: `Stoc insuficient pentru produsul "${item.name || item.denumire || '-'}". Disponibil: ${dbProd ? dbProd.stock : 0}` }, { status: 400 });
        }
      }
    }
    // Adresă și telefon din client - fallback robust pentru orice flux
    let adresaLivrare = '';
    if (client.adresaSediu && String(client.adresaSediu).trim() !== '') adresaLivrare = String(client.adresaSediu).trim();
    else if (client.adresa && String(client.adresa).trim() !== '') adresaLivrare = String(client.adresa).trim();
    else if (client.street && String(client.street).trim() !== '') adresaLivrare = String(client.street).trim();
    else if (client.address && String(client.address).trim() !== '') adresaLivrare = String(client.address).trim();
    // Adaugă oraș, județ, cod poștal dacă există
    if (client.oras && !adresaLivrare.includes(client.oras)) adresaLivrare += (adresaLivrare ? ', ' : '') + client.oras;
    // Strip "Judetul" prefix from county value
    let judetVal = client.judet || client.county || '';
    if (typeof judetVal === 'string') {
      judetVal = judetVal.replace(/^(Judetul|Județul|Jud\.?)\s*/i, '').trim();
    }
    if (judetVal && !adresaLivrare.includes(judetVal)) adresaLivrare += (adresaLivrare ? ', ' + txt.county + ' ' : txt.county + ' ') + judetVal;
    if (client.city && !adresaLivrare.includes(client.city)) adresaLivrare += (adresaLivrare ? ', ' : '') + client.city;
    if (client.codPostal && !adresaLivrare.includes(client.codPostal)) adresaLivrare += (adresaLivrare ? ', ' + txt.postalCodeLabel + ' ' : txt.postalCodeLabel + ' ') + client.codPostal;
    if (client.postalCode && !adresaLivrare.includes(client.postalCode)) adresaLivrare += (adresaLivrare ? ', ' + txt.postalCodeLabel + ' ' : txt.postalCodeLabel + ' ') + client.postalCode;
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
    let telefon = '';
    if (client.telefon && String(client.telefon).trim() !== '') telefon = String(client.telefon).trim();
    else if (client.phone && String(client.phone).trim() !== '') telefon = String(client.phone).trim();
    else if (client.telefonContact && String(client.telefonContact).trim() !== '') telefon = String(client.telefonContact).trim();
    telefon = (telefon || '').toString().trim();
    if (!telefon) telefon = '-';
    // Calcule sumare
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
    // Citește setările de coș din admin
    const cartSettings = await getCartSettings();
    const TVA_PERCENT = cartSettings.tva;
    // Prețurile sunt FĂRĂ TVA - adăugăm TVA la final
    const totalFaraTVA = subtotalDupaReduceri + courierCostVal;
    const tva = totalFaraTVA * (TVA_PERCENT / 100);
    const totalCuTVA = totalFaraTVA + tva;
    // Email fraza plată - robust și explicit pentru orice metodă
    let frazaPlata = '';
    const payMethodNorm = (paymentMethod || '').toString().trim().toLowerCase().replace(/\s+/g, ' ');
    if (payMethodNorm === 'ramburs') {
      frazaPlata = `<div style="background:#f3f4f6;padding:12px 18px;border-left:4px solid #2563eb;font-size:1.1rem;margin-bottom:18px;">${txt.paymentRamburs}</div>`;
    } else if (payMethodNorm === 'card' || payMethodNorm === 'card online') {
      frazaPlata = `<div style="background:#f3f4f6;padding:12px 18px;border-left:4px solid #2563eb;font-size:1.1rem;margin-bottom:18px;">${txt.paymentCard}</div>`;
    } else if (payMethodNorm === 'rate' || payMethodNorm === 'plata in rate' || payMethodNorm === 'plată în rate') {
      frazaPlata = `<div style="background:#f3f4f6;padding:12px 18px;border-left:4px solid #2563eb;font-size:1.1rem;margin-bottom:18px;">${txt.paymentRate}</div>`;
    } else if (payMethodNorm === 'transfer' || payMethodNorm === 'transfer bancar') {
      frazaPlata = `<div style="background:#f3f4f6;padding:12px 18px;border-left:4px solid #2563eb;font-size:1.1rem;margin-bottom:18px;">${txt.paymentTransfer}</div>`;
    }
    // Folosește calculateCartSummary pentru stacking logic corect
    // Map product nameEn și listPrice from database for translation
    const productNameEnMap = new Map(productsDb.map(p => [p.id, p.nameEn]));
    const productListPriceMap = new Map(productsDb.map(p => [p.id, p.listPrice]));
    const productDiscountMap = new Map(productsDb.map(p => [p.id, p.discount]));
    const products: (CartSummaryProduct & { nameEn?: string | null; deliveryTime?: string; variantCode?: string; variantInfo?: string; productDiscountValue?: number; couponDiscountValue?: number; listPrice?: number })[] = (items || []).map((item: any) => ({
      id: item.id,
      name: item.name,
      nameEn: productNameEnMap.get(Number(item.id)) || item.nameEn || null,
      price: item.price,
      listPrice: item.listPrice || productListPriceMap.get(Number(item.id)) || null,
      quantity: item.quantity || item.qty || 1,
      discount: item.discount ?? productDiscountMap.get(Number(item.id)) ?? null,
      discountType: item.discountType,
      appliedCoupon: item.appliedCoupon || null,
      deliveryTime: item.deliveryTime || item.deliveryTerm || '-',
      variantCode: item.variantCode || null,
      variantInfo: item.variantInfo || null,
      // Folosește valorile pre-calculate dacă există
      productDiscountValue: item.productDiscount || null,
      couponDiscountValue: item.couponDiscount || null
    }));
    const summary = calculateCartSummary({
      products,
      deliveryType,
      TVA_PERCENT: cartSettings.tva,
      livrareGratuita: cartSettings.livrareGratuita,
      costCurierStandard: cartSettings.costCurierStandard,
      costCurierExpress: cartSettings.costCurierExpress,
      costPerKg: cartSettings.costPerKg,
    });
    
    // Verifică dacă există cupoane
    const hasCoupon = products.some(item => item.appliedCoupon || (typeof item.couponDiscountValue === 'number' && item.couponDiscountValue > 0));
    
    // Tabel simplificat - fără coloane de reducere produs (prețul include deja reducerea)
    const tableHeaders = hasCoupon 
      ? [txt.headerNo, txt.headerProduct, txt.headerQty, txt.headerPrice, txt.headerCouponDiscount, txt.headerFinalPrice, txt.headerSubtotal, txt.headerDelivery]
      : [txt.headerNo, txt.headerProduct, txt.headerQty, txt.headerPrice, txt.headerSubtotal, txt.headerDelivery];
    let tableHtml = `<table style='width:100%;border-collapse:collapse;margin-bottom:16px;'>`;
    tableHtml += `<tr>` + tableHeaders.map(h => `<th style='border:1px solid #e5e7eb;padding:6px 8px;background:#f3f4f6;font-weight:600;'>${h}</th>`).join('') + `</tr>`;
    products.forEach((item, idx) => {
      let productName = lang === 'en' && item.nameEn ? item.nameEn : (item.name || '-');
      // Adaugă informații variantă dacă există
      const variantDetails = [];
      if (item.variantCode) variantDetails.push(item.variantCode);
      if (item.variantInfo) variantDetails.push(item.variantInfo);
      if (variantDetails.length > 0) {
        productName = `${productName}<br/><span style='font-size:0.9em;color:#666;'>(${variantDetails.join(' - ')})</span>`;
      }
      
      // Verifică dacă există discount de produs (listPrice > price)
      const hasProductDiscount = item.listPrice && item.listPrice > item.price;
      
      // Construiește celula de preț cu discount afișat ca în coș
      let priceCell = '';
      if (hasProductDiscount) {
        priceCell = `<span style='text-decoration:line-through;color:#9ca3af;font-size:0.9em;'>${item.listPrice!.toFixed(2)} ${txt.currencyUnit}</span><br/>` +
          `<span style='font-weight:600;'>${item.price.toFixed(2)} ${txt.currencyUnit}</span>`;
        if (item.discount && item.discount > 0) {
          priceCell += `<br/><span style='color:#16a34a;font-size:0.85em;'>(-${item.discount}%)</span>`;
        }
      } else {
        priceCell = `${item.price.toFixed(2)} ${txt.currencyUnit}`;
      }
      
      // Prețul deja include reducerea de produs
      const priceAfterProductDiscount = item.price;
      
      let couponDiscount = 0;
      let priceAfterCoupon = priceAfterProductDiscount;
      
      // Calculează reducerea cupon doar dacă există
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
      const subtotalFinal = priceAfterCoupon * item.quantity;
      // Translate delivery term (zile -> days)
      let deliveryTermDisplay = item.deliveryTime || '-';
      if (lang === 'en' && deliveryTermDisplay !== '-') {
        deliveryTermDisplay = deliveryTermDisplay.replace(/zile/gi, 'days').replace(/zi\b/gi, 'day');
      }
      
      if (hasCoupon) {
        tableHtml += `<tr>` +
          `<td style='border:1px solid #e5e7eb;padding:6px 8px;text-align:center;'>${idx + 1}</td>` +
          `<td style='border:1px solid #e5e7eb;padding:6px 8px;'>${productName}</td>` +
          `<td style='border:1px solid #e5e7eb;padding:6px 8px;text-align:center;'>${item.quantity.toFixed(3)}</td>` +
          `<td style='border:1px solid #e5e7eb;padding:6px 8px;text-align:right;'>${priceCell}</td>` +
          `<td style='border:1px solid #e5e7eb;padding:6px 8px;text-align:right;color:#2563eb;'>${couponDiscount > 0 ? '-' + couponDiscount.toFixed(2) + ' ' + txt.currencyUnit : '-'}</td>` +
          `<td style='border:1px solid #e5e7eb;padding:6px 8px;text-align:right;'>${priceAfterCoupon.toFixed(2)} ${txt.currencyUnit}</td>` +
          `<td style='border:1px solid #e5e7eb;padding:6px 8px;text-align:right;'>${subtotalFinal.toFixed(2)} ${txt.currencyUnit}</td>` +
          `<td style='border:1px solid #e5e7eb;padding:6px 8px;text-align:center;'>${deliveryTermDisplay}</td>` +
          `</tr>`;
      } else {
        tableHtml += `<tr>` +
          `<td style='border:1px solid #e5e7eb;padding:6px 8px;text-align:center;'>${idx + 1}</td>` +
          `<td style='border:1px solid #e5e7eb;padding:6px 8px;'>${productName}</td>` +
          `<td style='border:1px solid #e5e7eb;padding:6px 8px;text-align:center;'>${item.quantity.toFixed(3)}</td>` +
          `<td style='border:1px solid #e5e7eb;padding:6px 8px;text-align:right;'>${priceCell}</td>` +
          `<td style='border:1px solid #e5e7eb;padding:6px 8px;text-align:right;'>${subtotalFinal.toFixed(2)} ${txt.currencyUnit}</td>` +
          `<td style='border:1px solid #e5e7eb;padding:6px 8px;text-align:center;'>${deliveryTermDisplay}</td>` +
          `</tr>`;
      }
    });
    tableHtml += `</table>`;
    // Sumar comanda - adresa și telefonul apar pentru orice metodă de plată
    const paymentMethodDisplay = payMethodNorm === 'ramburs' ? txt.paymentCashOnDelivery : payMethodNorm === 'card' || payMethodNorm === 'card online' ? txt.paymentCardOnline : payMethodNorm === 'rate' || payMethodNorm === 'plata in rate' || payMethodNorm === 'plată în rate' ? txt.paymentInstallments : payMethodNorm === 'transfer' || payMethodNorm === 'transfer bancar' ? txt.paymentBankTransfer : paymentMethod;
    
    // Sumar în format tabel (similar cu pagina de confirmare preț)
    let sumarHtml = `<table style="width:100%;border-collapse:collapse;margin-top:16px;">`;
    
    // Subtotal produse
    sumarHtml += `<tr>
      <td style="padding:8px 12px;text-align:right;border:1px solid #e5e7eb;">${txt.subtotalLabel}:</td>
      <td style="padding:8px 12px;text-align:right;border:1px solid #e5e7eb;font-weight:600;">${summary.subtotalDupaReduceri.toFixed(2)} ${txt.currencyUnit}</td>
    </tr>`;
    
    // Cost curier
    sumarHtml += `<tr>
      <td style="padding:8px 12px;text-align:right;border:1px solid #e5e7eb;">${txt.courierCostLabel}:</td>
      <td style="padding:8px 12px;text-align:right;border:1px solid #e5e7eb;font-weight:600;">${summary.courierCost.toFixed(2)} ${txt.currencyUnit}</td>
    </tr>`;
    
    // TVA
    sumarHtml += `<tr>
      <td style="padding:8px 12px;text-align:right;border:1px solid #e5e7eb;">${txt.vat} (${TVA_PERCENT}%):</td>
      <td style="padding:8px 12px;text-align:right;border:1px solid #e5e7eb;font-weight:600;">${summary.tva.toFixed(2)} ${txt.currencyUnit}</td>
    </tr>`;
    
    // TOTAL DE PLATĂ (cu TVA) - bold și evidențiat
    sumarHtml += `<tr style="background:#f8fafc;">
      <td style="padding:12px;text-align:right;border:1px solid #e5e7eb;font-weight:700;font-size:1.1em;">${txt.totalToPay}:</td>
      <td style="padding:12px;text-align:right;border:1px solid #e5e7eb;font-weight:700;font-size:1.1em;color:#2563eb;">${summary.totalCuTVA.toFixed(2)} ${txt.currencyUnit}</td>
    </tr>`;
    
    sumarHtml += `</table>`;
    
    // Informații livrare și plată sub tabel
    sumarHtml += `
      <div style='margin-top:16px;padding:12px;background:#f9fafb;border-radius:6px;'>
        <div style='margin-bottom:8px;'>${txt.paymentMethodLabel}: <b>${paymentMethodDisplay}</b></div>
        <div style='margin-bottom:8px;'>${txt.deliveryAddress}: <b>${adresaLivrare}</b></div>
        <div>${txt.phoneLabel}: <b>${telefon}</b></div>
      </div>
    `;
    // Unificare logică pentru toate metodele de plată
    let orderRecord = null;
    let user = null;
    if (userEmail) {
      user = await prisma.user.findUnique({ where: { email: userEmail } });
      if (!user) {
        user = await prisma.user.create({ data: { email: userEmail, name: userEmail, password: Math.random().toString(36).slice(-8) } });
      }
    }
    // manualOrderId este deja extras din body mai sus
    let existingManualOrder = null;
    if (manualOrderId) {
      existingManualOrder = await prisma.order.findUnique({ where: { id: Number(manualOrderId) } });
      console.log('[ORDER-COMPLETE] Caută manualOrderId:', manualOrderId, 'Găsit:', !!existingManualOrder);
      if (!existingManualOrder) {
        console.warn('[ORDER-COMPLETE] manualOrderId transmis dar nu există comandă cu acest id. NU se creează dublură!');
        return NextResponse.json({ error: "Comanda manuală nu există pentru acest manualOrderId" }, { status: 409 });
      }
    }
    if (existingManualOrder) {
        console.log('[ORDER-COMPLETE] Update comandă manuală EXISTENTĂ:', existingManualOrder.id);
      // Update doar dacă există deja comanda manuală
      orderRecord = await prisma.order.update({
        where: { id: existingManualOrder.id },
        data: {
          items,
          total: totalCuTVA,
          clientData: client,
          courierCost: courierCostVal,
          paymentMethod: paymentMethod,
          deliveryType: deliveryType,
          status: "plătită",
        }
      });
    } else if (!manualOrderId) {
      // Caută o comandă manuală existentă cu același clientData, items și status 'nouă' sau 'manuală'
      // Nu mai filtra pe subcâmpuri JSON în Prisma! Ia toate comenzile candidate și filtrează în memorie.
      const candidateOrders = await prisma.order.findMany({
        where: {
          status: { in: ["nouă", "manuală"] },
          paymentMethod: { in: ["Card online", "card", "card online"] }
        }
      });
      // Compară clientData și items manual (deep compare)
      function deepEqual(a: any, b: any) {
        return JSON.stringify(a) === JSON.stringify(b);
      }
      const possibleManualOrder = candidateOrders.find(o => deepEqual(o.clientData, client) && deepEqual(o.items, items));
      if (possibleManualOrder) {
        console.log('[ORDER-COMPLETE] Update comandă manuală EXISTENTĂ (fără manualOrderId):', possibleManualOrder.id);
        orderRecord = await prisma.order.update({
          where: { id: possibleManualOrder.id },
          data: {
            items,
            total: totalCuTVA,
            clientData: client,
            courierCost: courierCostVal,
            paymentMethod: paymentMethod,
            deliveryType: deliveryType,
            status: "plătită",
          }
        });
      } else {
        console.log('[ORDER-COMPLETE] Creează comandă nouă (online)');
        orderRecord = await prisma.order.create({
          data: {
            user: user ? { connect: { id: user.id } } : undefined,
            items,
            total: totalCuTVA,
            clientData: client,
            courierCost: courierCostVal,
            paymentMethod: paymentMethod,
            deliveryType: deliveryType,
            status: "nouă",
            source: "online"
          }
        });
      }
    } else {
      // Dacă există manualOrderId dar nu există comandă, nu face nimic (sau poți loga)
      console.warn('[ORDER-COMPLETE] manualOrderId transmis dar nu există comandă cu acest id. Nu se creează dublură.');
      return NextResponse.json({ error: "Comanda manuală nu există pentru acest manualOrderId" }, { status: 409 });
    }
    // Scade stocul pentru toate metodele de plată
    // Scade stocul cu protecție atomică (tranzacție)
    // Suportă variante produs - scade din varianta selectată sau din produs
    await prisma.$transaction(async (tx) => {
      for (const item of items) {
        const qty = Number(item.qty || item.quantity);
        const variantId = item.variantId ? Number(item.variantId) : null;
        
        if (item.id && qty) {
          if (variantId) {
            // Scade stocul din varianta selectată
            const variant = await tx.productVariant.findUnique({ where: { id: variantId } });
            // Skip verificare stoc dacă varianta este pe comandă (onDemand)
            const isOnDemand = (variant as any)?.onDemand === true;
            if (!isOnDemand && (!variant || typeof variant.stoc !== 'number' || variant.stoc < qty)) {
              throw new Error(`Stoc insuficient pentru varianta "${item.variantCode || variantId}" a produsului "${item.name || item.denumire || '-'}". Disponibil: ${variant ? variant.stoc : 0}`);
            }
            // Pentru onDemand, NU decrementăm stocul (nu există stoc fizic)
            if (!isOnDemand) {
              const updatedVariant = await tx.productVariant.update({
                where: { id: variantId },
                data: { stoc: { decrement: qty } }
              });
              console.log('[DEBUG] Stoc variantă actualizat:', {
                variantId: updatedVariant.id,
                code: updatedVariant.code,
                stoc_nou: updatedVariant.stoc
              });
            } else {
              console.log('[DEBUG] Variantă onDemand - stoc nedecremantat:', variantId);
            }
          } else {
            // Scade stocul din produsul principal (fără variante)
            const prod = await tx.product.findUnique({ where: { id: Number(item.id) } });
            // Skip verificare stoc dacă produsul este pe comandă (onDemand)
            const isOnDemand = prod?.onDemand === true;
            if (!isOnDemand && (!prod || typeof prod.stock !== 'number' || prod.stock < qty)) {
              throw new Error(`Stoc insuficient pentru produsul "${item.name || item.denumire || '-'}". Disponibil: ${prod ? prod.stock : 0}`);
            }
            // Pentru onDemand, NU decrementăm stocul (nu există stoc fizic)
            if (!isOnDemand) {
              const updatedProduct = await tx.product.update({
                where: { id: Number(item.id) },
                data: { stock: { decrement: qty } }
              });
              console.log('[DEBUG] Stoc produs actualizat:', {
                id: updatedProduct.id,
                nume: updatedProduct.name,
                stoc_nou: updatedProduct.stock
              });
            } else {
              console.log('[DEBUG] Produs onDemand - stoc nedecremantat:', item.id);
            }
          }
        } else {
          console.warn('[WARN] Item fără id sau qty/quantity:', item);
        }
      }
    });
    // Acordă puncte de fidelitate (1 punct la fiecare 10 RON)
    if (orderRecord && user) {
      const pointsEarned = Math.floor(totalCuTVA / 10);
      if (pointsEarned > 0) {
        await prisma.loyaltyPoints.create({
          data: {
            userId: user.id,
            points: pointsEarned,
            reason: "purchase",
            orderId: orderRecord.id,
          },
        });
        console.log(`[LOYALTY] +${pointsEarned} puncte pentru user ${user.id}, comanda ${orderRecord.id}`);
      }
    }
    // Email HTML complet - frazaPlata (caseta evidențiată) apare pentru orice metodă de plată, ca în imaginea 2
    // Fraza prețuri orientative (banner vizibil)
    const priceDisclaimerHtml = `<div style="background:#fef3c7;border:1px solid #f59e0b;padding:12px 18px;border-radius:6px;margin-bottom:18px;color:#92400e;font-size:1rem;"><strong>⚠️ ${txt.priceDisclaimer}</strong></div>`;
    
    html += `
      <div style='padding:32px 32px 0 32px;'>
        <div style='font-size:1.15rem;font-weight:500;margin-bottom:8px;'>${txt.greeting}, <b>${client.denumire || client.name || ''}</b>!</div>
        <div style='font-size:1.05rem;color:#444;margin-bottom:18px;'>${txt.orderReceived}</div>
        ${priceDisclaimerHtml}
        ${frazaPlata}
        ${tableHtml}
        ${sumarHtml}
        <div style='margin-top:24px;font-weight:600;color:#2563eb;'>${txt.thankYou}<br>${txt.team}</div>
      </div>
      <div style='background:#f3f4f6;padding:18px 32px 18px 32px;margin-top:32px;border-radius:0 0 8px 8px;font-size:0.98rem;color:#444;'>
        ${txt.autoEmail} <a href='mailto:${COMPANY_CONFIG.email}'>${COMPANY_CONFIG.email}</a>.
      </div>
    </div>
    `;
    // Generează variantă plain text pentru email
    let text = `${txt.greeting}, ${(client.denumire || client.name || '').toString()}!\n`;
    text += `${txt.orderReceived}\n\n`;
    text += `⚠️ ${txt.priceDisclaimer}\n\n`;
    if (paymentMethod === 'ramburs') {
      text += txt.paymentRamburs + '\n\n';
    } else if (paymentMethod === 'card') {
      text += txt.paymentCard + '\n\n';
    } else if (paymentMethod === 'rate') {
      text += txt.paymentRate + '\n\n';
    } else if (paymentMethod === 'transfer') {
      text += txt.paymentTransfer + '\n\n';
    }
    text += txt.productsOrdered + ':\n';
    products.forEach((item, idx) => {
      const qty = Number(item.quantity || 1);
      const productName = lang === 'en' && item.nameEn ? item.nameEn : (item.name || '-');
      text += `${idx + 1}. ${productName} x${qty} - ${(typeof item.price === 'number' ? item.price.toFixed(2) : '-')} ${txt.currencyUnit}\n`;
    });
    text += `\n${txt.subtotalLabel}: ${subtotalPretVanzare.toFixed(2)} ${txt.currencyUnit}\n`;
    text += `${txt.subtotalAfterDiscounts}: ${subtotalDupaReduceri.toFixed(2)} ${txt.currencyUnit}\n`;
    text += `${txt.totalProductDiscount}: -${reducereTotala.toFixed(2)} ${txt.currencyUnit}\n`;
    text += `${txt.courierCostLabel} (${deliveryType || ''}): ${courierCostVal.toFixed(2)} ${txt.currencyUnit}\n`;
    text += `${txt.paymentMethodLabel}: ${payMethodNorm === 'ramburs' ? txt.paymentCashOnDelivery : payMethodNorm === 'card' ? txt.paymentCardOnline : paymentMethod}\n`;
    text += `${txt.totalWithoutVAT}: ${totalFaraTVA.toFixed(2)} ${txt.currencyUnit}\n`;
    text += `${txt.vat} (${TVA_PERCENT}%): ${tva.toFixed(2)} ${txt.currencyUnit}\n`;
    text += `${txt.totalToPay}: ${totalCuTVA.toFixed(2)} ${txt.currencyUnit}\n`;
    text += `${txt.deliveryAddress}: ${adresaLivrare}\n`;
    text += `${txt.phoneLabel}: ${telefon}\n`;
    text += `\n${txt.thankYou}\n${txt.team}\n`;
    text += `\n${txt.autoEmail} ${COMPANY_CONFIG.email}.\n`;

    // Generează PDF cu id și dată comandă
    const pdfOrder = {
      items: products,
      products: products,
      clientData: client,
      courierCost: courierCostVal,
      deliveryType: typeof deliveryType === 'string' ? deliveryType.trim() : '',
      paymentMethod: typeof paymentMethod === 'string' && paymentMethod.trim() ? paymentMethod.trim() : '-',
      subtotalPretVanzare,
      subtotalDupaReduceri,
      reducereTotala,
      tva: TVA_PERCENT,
      totalFaraTVA,
      tvaValoare: tva,
      totalCuTVA,
      deliveryLabel: typeof deliveryType === 'string' ? deliveryType.trim() : '',
      id: orderRecord?.id,
      number: orderRecord?.number,
      date: orderRecord?.date
    };
    
    // Try to generate PDF, but don't block order if it fails
    let pdfBuffer: Buffer | null = null;
    try {
      pdfBuffer = await generateOrderConfirmationPdfBuffer(pdfOrder, lang);
    } catch (pdfError) {
      console.error('[PDF] Error generating PDF (order will continue without attachment):', pdfError);
    }
    
    const pdfFilename = lang === 'en' ? `order-confirmation-${Date.now()}.pdf` : `confirmare-comanda-${Date.now()}.pdf`;
    
    // Subiect cu număr comandă pentru a nu fi grupate în Gmail
    const orderNumber = orderRecord?.number || orderRecord?.id || Date.now();
    const emailSubject = lang === 'en' 
      ? `New order #${orderNumber} - PREV-COR TPM`
      : `Comandă nouă #${orderNumber} - PREV-COR TPM`;
    
    // Send email with or without PDF attachment
    const emailOptions: Parameters<typeof sendEmail>[0] = {
      to: userEmail,
      subject: emailSubject,
      text,
      html,
    };
    
    if (pdfBuffer) {
      emailOptions.attachments = [
        {
          filename: pdfFilename,
          content: pdfBuffer
        }
      ];
    }
    
    await sendEmail(emailOptions);
    
    // Trimite email notificare la admin (asincron, fără a bloca răspunsul)
    const adminEmail = process.env.CONTACT_EMAIL || process.env.SMTP_USER;
    if (adminEmail) {
      const adminOrderUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/admin/orders?edit=${orderRecord?.id}`;
      const adminHtml = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
          <h2 style="color:#2563eb;">✅ Confirmare comandă #${orderNumber}</h2>
          <p><strong>Client:</strong> ${client.denumire || client.name || userEmail}</p>
          <p><strong>Email:</strong> ${userEmail}</p>
          <p><strong>Telefon:</strong> ${telefon}</p>
          <p><strong>Metodă plată:</strong> ${paymentMethodDisplay}</p>
          <p><strong>Adresă:</strong> ${adresaLivrare}</p>
          
          <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
            <tr>
              <td style="padding: 8px 12px; text-align: right; border: 1px solid #e5e7eb;">Subtotal produse:</td>
              <td style="padding: 8px 12px; text-align: right; border: 1px solid #e5e7eb; font-weight: 600;">${subtotalDupaReduceri.toFixed(2)} RON</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; text-align: right; border: 1px solid #e5e7eb;">Cost curier:</td>
              <td style="padding: 8px 12px; text-align: right; border: 1px solid #e5e7eb; font-weight: 600;">${courierCostVal.toFixed(2)} RON</td>
            </tr>
            <tr>
              <td style="padding: 8px 12px; text-align: right; border: 1px solid #e5e7eb;">TVA (${TVA_PERCENT}%):</td>
              <td style="padding: 8px 12px; text-align: right; border: 1px solid #e5e7eb; font-weight: 600;">${tva.toFixed(2)} RON</td>
            </tr>
            <tr style="background: #f8fafc;">
              <td style="padding: 12px; text-align: right; border: 1px solid #e5e7eb; font-weight: 700;">TOTAL DE PLATĂ (cu TVA):</td>
              <td style="padding: 12px; text-align: right; border: 1px solid #e5e7eb; font-weight: 700; color: #2563eb;">${totalCuTVA.toFixed(2)} RON</td>
            </tr>
          </table>
          
          <hr style="margin:20px 0;border:none;border-top:1px solid #e5e7eb;" />
          <p style="color:#f59e0b;"><strong>⚠️ Prețurile sunt orientative - verifică și trimite oferta de preț clientului!</strong></p>
          <p><a href="${adminOrderUrl}" style="display:inline-block;background:#2563eb;color:white;padding:10px 20px;text-decoration:none;border-radius:6px;">Vezi comenzile</a></p>
        </div>
      `;
      // Fire and forget - nu blochează răspunsul
      sendEmail({
        to: adminEmail,
        subject: `[CONFIRMARE COMANDĂ] #${orderNumber} - ${client.denumire || client.name || userEmail} - ${totalCuTVA.toFixed(2)} RON`,
        html: adminHtml,
        text: `Confirmare comandă #${orderNumber}\nClient: ${client.denumire || client.name || userEmail}\nSubtotal: ${subtotalDupaReduceri.toFixed(2)} RON\nCurier: ${courierCostVal.toFixed(2)} RON\nTVA (${TVA_PERCENT}%): ${tva.toFixed(2)} RON\nTotal: ${totalCuTVA.toFixed(2)} RON\nVerifică și trimite oferta de preț!`
      }).then(() => console.log('[ORDER-COMPLETE] Email admin trimis')).catch(err => console.error('[ORDER-COMPLETE] Eroare email admin:', err));
    }
    
    // Trimite notificare push către admin (asincron)
    notifyNewOrder(
      orderRecord?.number || String(orderRecord?.id) || 'N/A',
      totalCuTVA,
      client.denumire || client.name || userEmail
    ).catch(e => console.error('Eroare trimitere push notification:', e));
    // Marchează coșul abandonat ca recuperat
    try {
      await (prisma as any).abandonedCart.updateMany({
        where: { email: userEmail, recovered: false },
        data: { recovered: true }
      });
    } catch (e) {
      console.log('Error marking abandoned cart as recovered:', e);
    }
    return NextResponse.json({ message: "Comandă creată cu succes", orderId: orderRecord?.id }, { status: 200 });
  } catch (error) {
    console.error('[DEBUG] Eroare in blocul catch principal:', error);
    const errorMsg = typeof error === 'object' && error !== null && 'message' in error ? (error as any).message : String(error);
    console.error('Eroare la crearea comenzii:', errorMsg);
    return NextResponse.json({ error: 'Eroare la crearea comenzii: ' + errorMsg }, { status: 500 });
  }
}
