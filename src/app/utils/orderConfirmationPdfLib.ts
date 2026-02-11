import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { getTvaPercent } from '@/lib/getTvaPercent';
import { COMPANY_CONFIG } from '@/lib/companyConfig';

export async function generateOrderConfirmationPdfBuffer(order: any, language?: string): Promise<Buffer> {
  const lang = language === 'en' ? 'en' : 'ro';
  
  // Translations
  const txt = {
    orderConfirmation: lang === 'en' ? 'Order Confirmation' : 'Confirmare Comanda',
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
  y -= 30;
  
  // Order info
  page.drawText(`${txt.orderNumber}: ${order.number || order.id || '-'}`, {
    x: margin,
    y: y,
    size: 11,
    font: helveticaBold,
  });
  
  function formatDateDMY(val: string) {
    if (!val) return '-';
    const d = new Date(val);
    if (isNaN(d.getTime())) return '-';
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
  
  // Supplier header
  page.drawText(txt.supplier, {
    x: col1X,
    y: y,
    size: 12,
    font: helveticaBold,
  });
  
  // Client header
  page.drawText(txt.client, {
    x: col2X,
    y: y,
    size: 12,
    font: helveticaBold,
  });
  y -= 15;
  
  // Supplier name
  page.drawText('S.C. PREV-COR TPM S.R.L.', {
    x: col1X,
    y: y,
    size: 10,
    font: helveticaBold,
  });
  
  // Client name
  page.drawText(client.denumire || client.name || '-', {
    x: col2X,
    y: y,
    size: 10,
    font: helveticaBold,
  });
  y -= 12;
  
  // Supplier CUI/RC
  page.drawText('CIF: RO43434739   RC: J25/582/2020', {
    x: col1X,
    y: y,
    size: 9,
    font: helvetica,
  });
  
  // Client CUI/RC
  const clientCui = client.cui || '';
  const clientRc = client.reg || client.nrRegCom || '';
  if (clientCui || clientRc) {
    page.drawText(`CUI: ${clientCui}   RC: ${clientRc}`, {
      x: col2X,
      y: y,
      size: 9,
      font: helvetica,
    });
  }
  y -= 12;
  
  // Supplier address
  page.drawText('Str. Principala, Nr.70, Stroesti, jud. Mehedinti', {
    x: col1X,
    y: y,
    size: 9,
    font: helvetica,
  });
  
  // Client address
  const clientAddress = client.address || client.adresaSediu || client.adresa || '';
  const clientCity = client.city || client.oras || '';
  let clientCounty = client.county || client.judet || '';
  if (clientCounty) clientCounty = clientCounty.replace(/^(Judetul|Județul|Jud\.?)\s*/i, '').trim();
  let fullClientAddress = clientAddress;
  if (clientCity) fullClientAddress += `, ${clientCity}`;
  if (clientCounty) fullClientAddress += `, jud. ${clientCounty}`;
  
  // Truncate if too long
  if (fullClientAddress.length > 60) {
    fullClientAddress = fullClientAddress.substring(0, 57) + '...';
  }
  
  page.drawText(fullClientAddress || '-', {
    x: col2X,
    y: y,
    size: 9,
    font: helvetica,
  });
  y -= 12;
  
  // Phone
  page.drawText(`${txt.phoneLabel}: ${COMPANY_CONFIG.phone}`, {
    x: col1X,
    y: y,
    size: 9,
    font: helvetica,
  });
  
  page.drawText(`${txt.phoneLabel}: ${client.phone || client.telefon || '-'}`, {
    x: col2X,
    y: y,
    size: 9,
    font: helvetica,
  });
  y -= 12;
  
  // Email
  page.drawText(`${txt.emailLabel}: ${COMPANY_CONFIG.email}`, {
    x: col1X,
    y: y,
    size: 9,
    font: helvetica,
  });
  
  page.drawText(`${txt.emailLabel}: ${client.email || '-'}`, {
    x: col2X,
    y: y,
    size: 9,
    font: helvetica,
  });
  y -= 25;
  
  // === PRODUCTS TABLE ===
  const produse = Array.isArray(order.products) && order.products.length 
    ? order.products 
    : (Array.isArray(order.items) ? order.items : []);
  
  // Table headers
  const headers = [txt.nr, txt.product, txt.qty, txt.price, txt.prodDiscount, txt.couponDiscount, txt.final, txt.subtotal, txt.term];
  const colWidths = [30, 180, 40, 60, 70, 60, 60, 70, 60];
  
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
    
    let productDiscount = 0;
    if (typeof item.productDiscount === 'number') {
      productDiscount = item.productDiscount;
    } else if (typeof item.discount === 'number' && item.discount > 0) {
      if (item.discountType === 'percent' || !item.discountType) {
        const percent = item.discount <= 1 ? item.discount * 100 : item.discount;
        productDiscount = price * (percent / 100);
      } else {
        productDiscount = item.discount;
      }
    }
    
    const priceAfterProductDiscount = Math.max(0, price - productDiscount);
    
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
    const productName = (lang === 'en' && item.nameEn ? item.nameEn : (item.name || item.title || '-')).substring(0, 35);
    const deliveryTerm = item.deliveryTime || item.deliveryTerm || '-';
    
    tableX = margin + 5;
    
    // Nr
    page.drawText(String(idx + 1), { x: tableX, y, size: 8, font: helvetica });
    tableX += colWidths[0];
    
    // Product name
    page.drawText(productName, { x: tableX, y, size: 8, font: helvetica });
    tableX += colWidths[1];
    
    // Qty
    page.drawText(String(item.qty), { x: tableX, y, size: 8, font: helvetica });
    tableX += colWidths[2];
    
    // Price
    page.drawText(`${item.price.toFixed(2)}`, { x: tableX, y, size: 8, font: helvetica });
    tableX += colWidths[3];
    
    // Product discount
    page.drawText(item.productDiscount > 0 ? `-${item.productDiscount.toFixed(2)}` : '-', { 
      x: tableX, y, size: 8, font: helvetica 
    });
    tableX += colWidths[4];
    
    // Coupon discount
    page.drawText(item.couponDiscount > 0 ? `-${item.couponDiscount.toFixed(2)}` : '-', { 
      x: tableX, y, size: 8, font: helvetica 
    });
    tableX += colWidths[5];
    
    // Final price
    page.drawText(`${item.priceAfterCoupon.toFixed(2)}`, { x: tableX, y, size: 8, font: helvetica });
    tableX += colWidths[6];
    
    // Subtotal
    page.drawText(`${item.itemSubtotal.toFixed(2)}`, { x: tableX, y, size: 8, font: helvetica });
    tableX += colWidths[7];
    
    // Delivery term
    page.drawText(deliveryTerm.substring(0, 10), { x: tableX, y, size: 8, font: helvetica });
    
    y -= 14;
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
  
  // Product discount
  page.drawText(`${txt.totalProductDiscount}: -${totalProductDiscount.toFixed(2)} ${txt.currencyUnit}`, {
    x: summaryX,
    y: y,
    size: 10,
    font: helvetica,
    color: rgb(1, 0.5, 0),
  });
  y -= 14;
  
  // Coupon discount
  page.drawText(`${txt.totalCouponDiscount}: -${totalCouponDiscount.toFixed(2)} ${txt.currencyUnit}`, {
    x: summaryX,
    y: y,
    size: 10,
    font: helvetica,
    color: rgb(0, 0, 1),
  });
  y -= 14;
  
  // Subtotal after discounts
  page.drawText(`${txt.subtotalAfterDiscounts}: ${subtotalDupaReduceri.toFixed(2)} ${txt.currencyUnit}`, {
    x: summaryX,
    y: y,
    size: 10,
    font: helveticaBold,
    color: rgb(0, 0.5, 0),
  });
  y -= 14;
  
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
  
  // Total without VAT
  const totalFaraTVA = subtotalDupaReduceri + courierCost;
  page.drawText(`${txt.totalNoVat}: ${totalFaraTVA.toFixed(2)} ${txt.currencyUnit}`, {
    x: summaryX,
    y: y,
    size: 10,
    font: helvetica,
  });
  y -= 14;
  
  // VAT
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
