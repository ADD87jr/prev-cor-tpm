import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { getTvaPercent } from '@/lib/getTvaPercent';
import { COMPANY_CONFIG } from '@/lib/companyConfig';

export async function generateOrderConfirmationPdfBuffer(order: any, language?: string): Promise<Buffer> {
  const lang = language === 'en' ? 'en' : 'ro';
  
  // Translations
  const txt = {
    orderConfirmation: lang === 'en' ? 'Order Received' : 'Primire Comanda',
    priceDisclaimer: lang === 'en' 
      ? 'The prices shown are indicative. A PREV-COR TPM consultant will contact you shortly to confirm the final price before processing.'
      : 'Preturile afisate sunt orientative. Un consultant PREV-COR TPM te va contacta in scurt timp pentru a confirma pretul final inainte de procesare.',
    orderNumber: lang === 'en' ? 'Order number' : 'Numar comanda',
    orderDate: lang === 'en' ? 'Order date' : 'Data comenzii',
    currency: lang === 'en' ? 'Currency' : 'Moneda',
    supplier: lang === 'en' ? 'Supplier' : 'Furnizor',
    client: lang === 'en' ? 'Client' : 'Client',
    nr: lang === 'en' ? 'No.' : 'Nr.',
    product: lang === 'en' ? 'Product' : 'Produs',
    qty: lang === 'en' ? 'Qty' : 'Cant',
    price: lang === 'en' ? 'Price' : 'Pret',
    prodDiscount: lang === 'en' ? 'Prod.disc.' : 'Red.produs',
    couponDiscount: lang === 'en' ? 'Coupon' : 'Cupon',
    final: lang === 'en' ? 'Final' : 'Final',
    subtotal: lang === 'en' ? 'Subtotal' : 'Subtotal',
    term: lang === 'en' ? 'Term' : 'Termen',
    subtotalSalePrice: lang === 'en' ? 'Subtotal sale price' : 'Subtotal pret de vanzare',
    totalProductDiscount: lang === 'en' ? 'Total product discount' : 'Reducere totala produse',
    totalCouponDiscount: lang === 'en' ? 'Total coupon discount' : 'Reducere totala cupon',
    subtotalAfterDiscounts: lang === 'en' ? 'Subtotal after discounts' : 'Subtotal dupa reduceri',
    courierCost: lang === 'en' ? 'Courier cost' : 'Cost curier',
    paymentMethod: lang === 'en' ? 'Payment method' : 'Metoda de plata',
    bankTransfer: lang === 'en' ? 'bank transfer' : 'transfer bancar',
    cashOnDelivery: lang === 'en' ? 'cash on delivery' : 'ramburs la livrare',
    cardOnline: lang === 'en' ? 'card online' : 'card online',
    installments: lang === 'en' ? 'installments' : 'plata in rate',
    totalNoVat: lang === 'en' ? 'Total without VAT' : 'Total fara TVA',
    vat: lang === 'en' ? 'VAT' : 'TVA',
    totalWithVat: lang === 'en' ? 'Total to pay (with VAT)' : 'Total de plata (cu TVA)',
    disclaimer: lang === 'en' 
      ? 'This document confirms the registration of your order. It is not a fiscal invoice.' 
      : 'Acest document confirma inregistrarea comenzii dumneavoastra. Nu tine loc de factura fiscala.',
    postalCode: lang === 'en' ? 'Postal code' : 'Cod postal',
    account: lang === 'en' ? 'Account' : 'Cont',
    bank: lang === 'en' ? 'Bank' : 'Banca',
    phoneLabel: lang === 'en' ? 'Phone' : 'Telefon',
    emailLabel: lang === 'en' ? 'Email' : 'Email',
    currencyUnit: lang === 'en' ? 'RON' : 'lei',
  };

  // Create PDF document - A4 landscape
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([842, 595]); // A4 landscape
  
  // Load fonts (standard fonts work without external files)
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  const { width, height } = page.getSize();
  const margin = 40;
  let y = height - margin;
  
  // Client data
  const client = order.clientData && Object.keys(order.clientData).length > 0 
    ? order.clientData 
    : (order.client || {});

  // === HEADER ===
  page.drawText(txt.orderConfirmation, {
    x: margin,
    y: y,
    size: 24,
    font: helveticaBold,
    color: rgb(0, 0.32, 0.61),
  });
  y -= 18;
  
  // Prețuri orientative banner
  page.drawRectangle({
    x: margin,
    y: y - 28,
    width: width - 2 * margin,
    height: 26,
    color: rgb(1, 0.95, 0.82),
    borderColor: rgb(0.96, 0.62, 0.04),
    borderWidth: 1,
  });
  page.drawText(`ATENTIE! ${txt.priceDisclaimer}`, {
    x: margin + 8,
    y: y - 20,
    size: 8,
    font: helveticaBold,
    color: rgb(0.57, 0.25, 0.05),
  });
  y -= 40;
  
  // Order info
  page.drawText(`${txt.orderNumber}: ${order.number || order.id || '-'}`, {
    x: margin,
    y: y,
    size: 11,
    font: helveticaBold,
  });
  
  function formatDateDMY(val: any) {
    if (!val) return '-';
    // Handle Date object
    if (val instanceof Date || (typeof val === 'object' && val.getTime)) {
      const z = (n: number) => n.toString().padStart(2, '0');
      return `${z(val.getDate())}.${z(val.getMonth() + 1)}.${val.getFullYear()}`;
    }
    const str = String(val);
    // Handle dd.mm.yyyy format
    const parts = str.split('.');
    if (parts.length === 3 && parts[0].length <= 2) {
      return `${parts[0].padStart(2, '0')}.${parts[1].padStart(2, '0')}.${parts[2]}`;
    }
    // Handle ISO string
    const d = new Date(str);
    if (isNaN(d.getTime())) return str;
    const z = (n: number) => n.toString().padStart(2, '0');
    return `${z(d.getDate())}.${z(d.getMonth() + 1)}.${d.getFullYear()}`;
  }
  
  page.drawText(`${txt.orderDate}: ${formatDateDMY(order.date)}`, {
    x: margin + 200,
    y: y,
    size: 11,
    font: helvetica,
  });
  
  page.drawText(`${txt.currency}: RON`, {
    x: margin + 400,
    y: y,
    size: 11,
    font: helvetica,
  });
  y -= 25;
  
  // Separator line
  page.drawLine({
    start: { x: margin, y: y },
    end: { x: width - margin, y: y },
    thickness: 1,
    color: rgb(0.8, 0.8, 0.8),
  });
  y -= 20;
  
  // === SUPPLIER & CLIENT INFO ===
  const col1X = margin;
  const col2X = width / 2 + 20;
  
  // --- Prepare client data ---
  const clientName = client.denumire || client.name || '-';
  const clientCui = client.cui || '';
  const clientRc = client.reg || client.nrRegCom || '';
  const clientAddress = client.address || client.adresaSediu || client.adresa || '';
  const clientCity = client.city || client.oras || '';
  let clientCounty = client.county || client.judet || '';
  if (clientCounty) clientCounty = clientCounty.replace(/^(Judetul|Județul|Jud\.?)\s*/i, '').trim();
  let fullClientAddress = clientAddress;
  if (clientCity) fullClientAddress += `, ${clientCity}`;
  if (clientCounty) fullClientAddress += `, jud. ${clientCounty}`;
  if (fullClientAddress.length > 60) fullClientAddress = fullClientAddress.substring(0, 57) + '...';
  const clientPostalCode = client.postalCode || client.codPostal || '';
  const clientIban = client.iban || client.contBancar || '';
  const clientBank = client.bank || client.banca || '';
  const clientPhone = client.phone || client.telefon || '';
  const clientEmail = client.email || '';

  // Headers
  page.drawText(txt.supplier, { x: col1X, y, size: 12, font: helveticaBold });
  page.drawText(txt.client, { x: col2X, y, size: 12, font: helveticaBold });
  y -= 15;

  // Define aligned rows: [furnizorText, clientText, isBoldName]
  const infoRows: [string, string, boolean][] = [
    [COMPANY_CONFIG.name, clientName, true],
    [`CIF: ${COMPANY_CONFIG.cui}   RC: ${COMPANY_CONFIG.regCom}`, clientCui || clientRc ? `CUI: ${clientCui}   RC: ${clientRc}` : '', false],
    ['Str. Principala, Nr.70, Stroesti, jud. Mehedinti', fullClientAddress || '-', false],
    [`${txt.postalCode}: ${COMPANY_CONFIG.address.postalCode}`, clientPostalCode ? `${txt.postalCode}: ${clientPostalCode}` : '', false],
    [`${txt.account}: ${COMPANY_CONFIG.iban}`, clientIban ? `${txt.account}: ${clientIban}` : '', false],
    [`${txt.bank}: BRD - Groupe Societe Generale`, clientBank ? `${txt.bank}: ${clientBank}` : '', false],
    [`${txt.phoneLabel}: ${COMPANY_CONFIG.phone}`, `${txt.phoneLabel}: ${clientPhone || '-'}`, false],
    [`${txt.emailLabel}: ${COMPANY_CONFIG.email}`, `${txt.emailLabel}: ${clientEmail || '-'}`, false],
  ];

  for (const [furnVal, clientVal, isBold] of infoRows) {
    const fontSize = isBold ? 10 : 9;
    const fontFace = isBold ? helveticaBold : helvetica;

    if (furnVal) {
      page.drawText(furnVal, { x: col1X, y, size: fontSize, font: fontFace });
    }
    if (clientVal) {
      page.drawText(clientVal, { x: col2X, y, size: fontSize, font: fontFace });
    }
    y -= 12;
  }
  y -= 13;
  
  // === PRODUCTS TABLE ===
  const produse = Array.isArray(order.products) && order.products.length 
    ? order.products 
    : (Array.isArray(order.items) ? order.items : []);
  
  // Verifică dacă există cupoane aplicate
  const hasCoupon = produse.some((item: any) => 
    item.appliedCoupon || (typeof item.couponDiscount === 'number' && item.couponDiscount > 0)
  );
  
  // Table headers - fără coloane de reducere (prețul include deja reducerea)
  // Adăugăm coloana cupon doar dacă există cupoane
  const headers = hasCoupon 
    ? [txt.nr, txt.product, txt.qty, txt.price, txt.couponDiscount, txt.final, txt.subtotal, txt.term]
    : [txt.nr, txt.product, txt.qty, txt.price, txt.subtotal, txt.term];
  const colWidths = hasCoupon 
    ? [22, 300, 35, 55, 55, 55, 65, 55]
    : [22, 350, 40, 65, 80, 70];
  
  // Draw table header background
  page.drawRectangle({
    x: margin,
    y: y - 5,
    width: width - 2 * margin,
    height: 18,
    color: rgb(0.95, 0.95, 0.95),
  });
  
  let tableX = margin + 5;
  for (let i = 0; i < headers.length; i++) {
    page.drawText(headers[i], {
      x: tableX,
      y: y,
      size: 8,
      font: helveticaBold,
    });
    tableX += colWidths[i];
  }
  y -= 20;
  
  // Calculate products with discounts
  let totalProductDiscount = 0;
  let totalCouponDiscount = 0;
  let subtotal = 0;
  let subtotalDupaReduceri = 0;
  
  const summaryProducts = produse.map((item: any) => {
    const price = Number(item.price) || 0;
    const qty = Number(item.quantity || item.qty) || 1;
    
    // NU aplicăm item.discount sau item.productDiscount suplimentar - prețul deja include reducerea
    // Reducerea de produs e deja reflectată în item.price la adăugarea în coș
    let productDiscount = 0;
    
    const priceAfterProductDiscount = price;
    
    let couponDiscount = 0;
    if (typeof item.couponDiscount === 'number') {
      couponDiscount = item.couponDiscount;
    } else if (item.appliedCoupon) {
      if (item.appliedCoupon.type === 'percent') {
        const percent = item.appliedCoupon.value <= 1 ? item.appliedCoupon.value * 100 : item.appliedCoupon.value;
        couponDiscount = priceAfterProductDiscount * (percent / 100);
      } else {
        couponDiscount = item.appliedCoupon.value;
      }
    }
    
    const priceAfterCoupon = Math.max(0, priceAfterProductDiscount - couponDiscount);
    const itemSubtotal = priceAfterCoupon * qty;
    
    subtotal += price * qty;
    totalProductDiscount += productDiscount * qty;
    totalCouponDiscount += couponDiscount * qty;
    subtotalDupaReduceri += itemSubtotal;
    
    return {
      ...item,
      price,
      qty,
      productDiscount,
      couponDiscount,
      priceAfterCoupon,
      itemSubtotal,
    };
  });
  
  // Draw product rows
  for (let idx = 0; idx < summaryProducts.length && y > 120; idx++) {
    const item = summaryProducts[idx];
    const productName = (lang === 'en' && item.nameEn ? item.nameEn : (item.name || item.title || '-'));
    
    // Linia a doua: cod variantă + info (ca în email)
    const variantLine = item.variantCode 
      ? `(${item.variantCode}${item.variantInfo ? ` - ${item.variantInfo}` : ''})` 
      : '';
    
    const deliveryTerm = item.deliveryTime || item.deliveryTerm || '-';
    
    tableX = margin + 5;
    let colIdx = 0;
    
    // Nr
    page.drawText(String(idx + 1), { x: tableX, y, size: 8, font: helvetica });
    tableX += colWidths[colIdx++];
    
    // Product name - linia 1
    page.drawText(productName, { x: tableX, y, size: 8, font: helvetica });
    // Variant info - linia 2 (mai mic)
    if (variantLine) {
      page.drawText(variantLine, { x: tableX, y: y - 10, size: 7, font: helvetica });
    }
    tableX += colWidths[colIdx++];
    
    // Qty
    page.drawText(String(item.qty), { x: tableX, y, size: 8, font: helvetica });
    tableX += colWidths[colIdx++];
    
    // Price - afișează discount de produs dacă există (listPrice > price)
    const hasProductDiscount = item.listPrice && item.listPrice > item.price;
    if (hasProductDiscount) {
      // Preț vechi tăiat (gri, mai mic)
      const oldPriceText = `${item.listPrice.toFixed(2)}`;
      page.drawText(oldPriceText, { x: tableX, y: y + 6, size: 7, font: helvetica, color: rgb(0.6, 0.6, 0.6) });
      // Linie orizontală peste prețul vechi (simuleaza line-through)
      const textWidth = helvetica.widthOfTextAtSize(oldPriceText, 7);
      page.drawLine({
        start: { x: tableX, y: y + 8 },
        end: { x: tableX + textWidth, y: y + 8 },
        thickness: 0.5,
        color: rgb(0.6, 0.6, 0.6),
      });
      // Preț actual (bold)
      page.drawText(`${item.price.toFixed(2)}`, { x: tableX, y, size: 8, font: helveticaBold });
      // Procent discount dacă există
      if (item.discount && item.discount > 0) {
        page.drawText(`(-${item.discount}%)`, { x: tableX, y: y - 8, size: 6, font: helvetica, color: rgb(0.09, 0.64, 0.26) });
      }
    } else {
      page.drawText(`${item.price.toFixed(2)}`, { x: tableX, y, size: 8, font: helvetica });
    }
    tableX += colWidths[colIdx++];
    
    // Coupon discount - doar dacă există cupoane
    if (hasCoupon) {
      page.drawText(item.couponDiscount > 0 ? `-${item.couponDiscount.toFixed(2)}` : '-', { 
        x: tableX, y, size: 8, font: helvetica 
      });
      tableX += colWidths[colIdx++];
      
      // Final price (după cupon)
      page.drawText(`${item.priceAfterCoupon.toFixed(2)}`, { x: tableX, y, size: 8, font: helvetica });
      tableX += colWidths[colIdx++];
    }
    
    // Subtotal
    page.drawText(`${item.itemSubtotal.toFixed(2)}`, { x: tableX, y, size: 8, font: helvetica });
    tableX += colWidths[colIdx++];
    
    // Delivery term - sanitize diacritics for WinAnsi
    const termSafe = deliveryTerm
      .replace(/[ăĂ]/g, 'a').replace(/[âÂ]/g, 'a')
      .replace(/[îÎ]/g, 'i').replace(/[șȘ]/g, 's').replace(/[țȚ]/g, 't');
    page.drawText(termSafe.substring(0, 18), { x: tableX, y, size: 7, font: helvetica });
    
    y -= 24; // Spațiu pentru 2 linii: nume produs + variantă
  }
  
  y -= 10;
  
  // === SUMMARY ===
  const summaryX = width - margin - 250;
  
  // Subtotal sale price
  page.drawText(`${txt.subtotalSalePrice}: ${subtotal.toFixed(2)} ${txt.currencyUnit}`, {
    x: summaryX,
    y: y,
    size: 10,
    font: helvetica,
  });
  y -= 14;
  
  // Coupon discount - doar dacă există
  if (totalCouponDiscount > 0) {
    page.drawText(`${txt.totalCouponDiscount}: -${totalCouponDiscount.toFixed(2)} ${txt.currencyUnit}`, {
      x: summaryX,
      y: y,
      size: 10,
      font: helvetica,
      color: rgb(0, 0, 1),
    });
    y -= 14;
    
    // Subtotal after discounts - doar dacă există reduceri
    page.drawText(`${txt.subtotalAfterDiscounts}: ${subtotalDupaReduceri.toFixed(2)} ${txt.currencyUnit}`, {
      x: summaryX,
      y: y,
      size: 10,
      font: helveticaBold,
      color: rgb(0, 0.5, 0),
    });
    y -= 14;
  }
  
  // Courier cost
  const courierCost = typeof order.courierCost === 'number' ? order.courierCost : 0;
  page.drawText(`${txt.courierCost}: ${courierCost.toFixed(2)} ${txt.currencyUnit}`, {
    x: summaryX,
    y: y,
    size: 10,
    font: helvetica,
  });
  y -= 14;
  
  // Payment method
  let paymentLabel = order.paymentMethod || 'transfer';
  if (paymentLabel === 'transfer') paymentLabel = txt.bankTransfer;
  else if (paymentLabel === 'ramburs') paymentLabel = txt.cashOnDelivery;
  else if (paymentLabel === 'card') paymentLabel = txt.cardOnline;
  else if (paymentLabel === 'rate') paymentLabel = txt.installments;
  
  page.drawText(`${txt.paymentMethod}: ${paymentLabel}`, {
    x: summaryX,
    y: y,
    size: 10,
    font: helvetica,
  });
  y -= 14;
  
  // Prețurile sunt FĂRĂ TVA - adăugăm TVA la final
  // Total fără TVA = subtotal + curier
  const totalFaraTVA = subtotalDupaReduceri + courierCost;
  
  // Total without VAT
  page.drawText(`${txt.totalNoVat}: ${totalFaraTVA.toFixed(2)} ${txt.currencyUnit}`, {
    x: summaryX,
    y: y,
    size: 10,
    font: helvetica,
  });
  y -= 14;
  
  // TVA
  const configTva = await getTvaPercent();
  const tvaPercent = typeof order.tva === 'number' && !isNaN(order.tva) ? order.tva : configTva;
  const tva = Math.round(totalFaraTVA * tvaPercent / 100 * 100) / 100;
  
  page.drawText(`${txt.vat} (${tvaPercent}%): ${tva.toFixed(2)} ${txt.currencyUnit}`, {
    x: summaryX,
    y: y,
    size: 10,
    font: helvetica,
  });
  y -= 18;
  
  // Total with VAT
  const totalCuTVA = Math.round((totalFaraTVA + tva) * 100) / 100;
  page.drawText(`${txt.totalWithVat}: ${totalCuTVA.toFixed(2)} ${txt.currencyUnit}`, {
    x: summaryX,
    y: y,
    size: 14,
    font: helveticaBold,
    color: rgb(0, 0.32, 0.61),
  });
  y -= 30;
  
  // === DISCLAIMER ===
  page.drawText(txt.disclaimer, {
    x: margin,
    y: Math.min(y, 50),
    size: 9,
    font: helvetica,
    color: rgb(0.4, 0.4, 0.4),
  });
  
  // Generate PDF bytes
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
