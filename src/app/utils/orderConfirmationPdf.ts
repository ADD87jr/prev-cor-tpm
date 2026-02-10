import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { getTvaPercent } from "@/lib/getTvaPercent";
import { COMPANY_CONFIG } from "@/lib/companyConfig";

export async function generateOrderConfirmationPdfBuffer(order: any, language?: string): Promise<Buffer> {
    const lang = language === 'en' ? 'en' : 'ro';
    
    // Traduceri pentru PDF
    const txt = {
      orderConfirmation: lang === 'en' ? 'Order confirmation' : 'Confirmare comandă',
      orderNumber: lang === 'en' ? 'Order number' : 'Număr comandă',
      orderDate: lang === 'en' ? 'Order date' : 'Data comenzii',
      currency: lang === 'en' ? 'Currency' : 'Moneda',
      supplier: lang === 'en' ? 'Supplier' : 'Furnizor',
      client: lang === 'en' ? 'Client' : 'Client',
      nr: lang === 'en' ? 'No.' : 'Nr.',
      product: lang === 'en' ? 'Product' : 'Produs',
      qty: lang === 'en' ? 'Qty.' : 'Cant.',
      price: lang === 'en' ? 'Price' : 'Preț',
      prodDiscount: lang === 'en' ? 'Prod. disc.' : 'Red. produs',
      couponDiscount: lang === 'en' ? 'Coupon disc.' : 'Red. cupon',
      final: lang === 'en' ? 'Final' : 'Final',
      subtotal: lang === 'en' ? 'Subtotal' : 'Subtotal',
      term: lang === 'en' ? 'Term' : 'Termen',
      subtotalSalePrice: lang === 'en' ? 'Subtotal sale price' : 'Subtotal preț de vânzare',
      totalProductDiscount: lang === 'en' ? 'Total product discount' : 'Reducere totală produse',
      totalCouponDiscount: lang === 'en' ? 'Total coupon discount' : 'Reducere totală cupon',
      subtotalAfterDiscounts: lang === 'en' ? 'Subtotal after discounts' : 'Subtotal după reduceri',
      courierCost: lang === 'en' ? 'Courier cost' : 'Cost curier',
      paymentMethod: lang === 'en' ? 'Payment method' : 'Metodă de plată',
      cardOnline: lang === 'en' ? 'card online' : 'card online',
      bankTransfer: lang === 'en' ? 'bank transfer' : 'transfer bancar',
      cashOnDelivery: lang === 'en' ? 'cash on delivery' : 'ramburs la livrare',
      installments: lang === 'en' ? 'installments' : 'plată în rate',
      totalNoVat: lang === 'en' ? 'Total without VAT' : 'Total fără TVA',
      vat: lang === 'en' ? 'VAT' : 'TVA',
      totalWithVat: lang === 'en' ? 'Total to pay (with VAT)' : 'Total de plată (cu TVA)',
      disclaimer: lang === 'en' ? 'This document confirms the registration of your order. It is not a fiscal invoice. The fiscal invoice will be issued separately by the accounting department.' : 'Acest document confirmă înregistrarea comenzii dumneavoastră. Nu ține loc de factură fiscală. Factura fiscală va fi emisă separat de către departamentul contabil.',
      postalCode: lang === 'en' ? 'Postal code' : 'Cod poștal',
      account: lang === 'en' ? 'Account' : 'Cont',
      bank: lang === 'en' ? 'Bank' : 'Banca',
      phoneLabel: lang === 'en' ? 'Phone' : 'Telefon',
      emailLabel: lang === 'en' ? 'Email' : 'Email',
      currencyUnit: lang === 'en' ? 'RON' : 'lei',
      pickup: lang === 'en' ? 'Pickup from office' : 'Ridicare de la sediu',
      clientShipping: lang === 'en' ? 'Client shipping account' : 'Expediere pe cont client',
      standard: lang === 'en' ? 'Standard' : 'Standard',
      rapid: lang === 'en' ? 'Rapid' : 'Rapid',
      express: lang === 'en' ? 'Express' : 'Express',
      easybox: lang === 'en' ? 'EasyBox' : 'EasyBox',
      // Address translations
      street: lang === 'en' ? 'Street' : 'Str.',
      no: lang === 'en' ? 'No.' : 'Nr.',
      county: lang === 'en' ? 'county' : 'jud.',
      days: lang === 'en' ? 'days' : 'zile',
    };
    
    let tipLivrare = order.deliveryLabel || order.courierType || '-';
    let costCurierVal = typeof order.courierCost === 'number' ? order.courierCost.toFixed(2) : '0.00';
    console.log('[DEBUG] Valoare courierCost la sumar PDF:', order.courierCost, typeof order.courierCost);
    // ...existing code...
      // ...existing code...
      // Mutăm apelurile summaryRow după inițializarea doc
      // ...existing code...
      // --- HEADER: LOGO & TITLU ---
      // ...existing code...
      // --- SUMAR COȘ ---
    // Fallback explicit pentru array-uri produse
    if (!Array.isArray(order.items)) order.items = Array.isArray(order.products) ? order.products : [];
    // Debug: vezi structura completă order primit
    console.log('[DEBUG] ORDER primit la PDF:', JSON.stringify(order, null, 2));
    console.log('[DEBUG] PDF produse primite:', JSON.stringify(order.products, null, 2));
    console.log('[DEBUG] PDF courierCost extras:', order.courierCost, typeof order.courierCost);
    // Variabile globale pentru sumar coș
    let costCurier = 0;
    let costCurierText = '';
    let deliveryType = '';
    let label = '';
    // eliminat redeclararea tipLivrare
    let paymentLabel = '';
    // eliminat redeclararea costCurierVal
  // --- LOGICA PDF COPIATĂ DIN generate-invoice.ts ---
  const fontPath = path.join(process.cwd(), "public", "fonts", "Roboto-Regular.ttf");
  const fontBoldPath = path.join(process.cwd(), "public", "fonts", "Roboto-Bold.ttf");
  // Folosim autoFirstPage: false pentru a evita încărcarea Helvetica implicit
  const doc = new PDFDocument({ margin: 20, size: 'A4', layout: 'landscape', autoFirstPage: false });
  doc.registerFont("Roboto", fontPath);
  doc.registerFont("Roboto-Bold", fontBoldPath);
  doc.font("Roboto");
  doc.addPage({ margin: 20, size: 'A4', layout: 'landscape' });
  let buffers: Buffer[] = [];
  doc.on("data", (d: Buffer) => buffers.push(d));

  // --- HEADER: LOGO & TITLU ---
  const logoPath = path.join(process.cwd(), "public", "logo.png");
  let y = 30;
  const logoW = 80, logoH = 80;
  const pageWidth = 842; // A4 landscape
  const contentWidth = 650;
  const contentX = Math.round((pageWidth - contentWidth) / 2);
  // Folosește mereu datele introduse la plasare comandă, indiferent de sursă
  const client = order.clientData && Object.keys(order.clientData).length > 0 ? order.clientData : (order.client || {});
  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, contentX, y, { width: logoW, height: logoH });
  }
  let antetX = contentX + logoW + 20;
  let antetY = y;
  doc.fontSize(26).font("Roboto-Bold").text(txt.orderConfirmation, antetX, antetY, { align: "left", width: 400 });
  antetY += 28;
  doc.fontSize(12).font("Roboto-Bold").text(`${txt.orderNumber}: ${order.id || order.number || "-"}`, antetX, antetY, { align: "left", width: 400 });
  antetY += 16;
  function formatDateDMY(val: string) {
    if (!val) return "-";
    const d = typeof val === "string" ? new Date(val) : val;
    if (isNaN(d.getTime())) return "-";
    const z = (n: number) => n.toString().padStart(2, '0');
    return `${z(d.getDate())}.${z(d.getMonth() + 1)}.${d.getFullYear()}`;
  }
  doc.fontSize(11).font("Roboto").text(`${txt.orderDate}: ${formatDateDMY(order.date || order.issueDate)}`, antetX, antetY, { align: "left" });
  // Poți adăuga și alte detalii dacă vrei, ex: status, metodă plată etc.
  doc.fontSize(11).font("Roboto").text(`${txt.currency}: ${order.currency || "RON"}`, antetX + 180, antetY, { align: "left" });
    // Mesaj metodă de plată vizibil sub antet
    let paymentMsg = '';
    if (order.paymentMethod === 'ramburs') paymentMsg = 'Comanda ta va fi achitată la livrare, direct curierului. Te vom contacta pentru detalii privind expedierea. Îți mulțumim pentru încredere!';
    else if (order.paymentMethod === 'rate') paymentMsg = 'Solicitarea ta de plată în rate a fost înregistrată. Un consultant PREV-COR TPM te va contacta telefonic sau pe email pentru finalizarea procesului de aprobare și semnarea contractului de credit. Îți mulțumim pentru încredere!';
    else if (order.paymentMethod === 'transfer') paymentMsg = 'Plata se va face prin transfer bancar. Veți primi detaliile de plată pe email. Îți mulțumim pentru încredere!';
    else if (order.paymentMethod === 'card') paymentMsg = 'Plata a fost facuta online cu cardul. Îți mulțumim pentru încredere!';
    if (paymentMsg) {
      // Eliminat textul colorat și fraza de plată online cu cardul
      y += 28;
    }
  y += logoH + 18;
  // Linie sub antet
  doc.save();
  doc.lineWidth(1.2);
  doc.moveTo(contentX, y).lineTo(contentX + contentWidth, y).stroke();
  doc.restore();
  y += 10;
  // Furnizor & Client centrat, structura identică
  doc.fontSize(12).font("Roboto-Bold").text(txt.supplier, contentX + 10, y);
  doc.fontSize(12).font("Roboto-Bold").text(txt.client, contentX + 370, y);
  y += 15;
  doc.fontSize(11).font("Roboto-Bold").text(order.supplier?.name || "S.C. PREV-COR TPM S.R.L.", contentX + 10, y);
  doc.fontSize(11).font("Roboto-Bold").text((client.denumire || client.name || ''), contentX + 370, y);
  y += 12;
  doc.fontSize(10).font("Roboto").text(`CIF: ${order.supplier?.cui || "RO43434739"}   RC: ${order.supplier?.reg || "J25/582/2020"}`, contentX + 10, y);
  doc.fontSize(10).font("Roboto").text(`CUI: ${client.cui || ''}   RC: ${client.reg || client.nrRegCom || ''}`, contentX + 370, y);
  y += 10;
  // Adaugă oraș și județ la furnizor
  const supplierCity = order.supplier?.city || "Stroesti";
  const supplierCounty = order.supplier?.county || order.supplier?.judet || "Mehedinti";
  const supplierCountry = lang === 'en' ? 'country Romania' : 'Romania';
  const supplierAddress = lang === 'en' 
    ? `${txt.street} Principala, ${txt.no} 70, ${supplierCity}, ${txt.county} ${supplierCounty}, ${supplierCountry}`
    : `Str. Principala, Nr.70, ${supplierCity}, jud. ${supplierCounty}`;
  doc.fontSize(10).font("Roboto").text(supplierAddress, contentX + 10, y);
  // Adaugă oraș și județ la client
  const clientCity = client.city || client.oras || '';
  let clientCounty = client.county || client.judet || '';
  // Strip "Judetul" prefix from county value
  if (typeof clientCounty === 'string') {
    clientCounty = clientCounty.replace(/^(Judetul|Județul|Jud\.?)\s*/i, '').trim();
  }
  let clientAddressLine = (client.address || client.adresaSediu || client.adresa || '');
  // Translate street and number labels in address string
  if (lang === 'en') {
    clientAddressLine = clientAddressLine
      .replace(/\bSRADA\b/gi, 'Street')
      .replace(/\bSTRADA\b/gi, 'Street')
      .replace(/\bSTR\.\s*/gi, 'Street ')
      .replace(/\bNR\.\s*/gi, 'No. ')
      .replace(/\bJudetul\b/gi, 'county')
      .replace(/\bJudețul\b/gi, 'county')
      .replace(/,\s*Romania\b/gi, ', country Romania');
  }
  if (clientCity) clientAddressLine += `, ${clientCity}`;
  if (clientCounty) clientAddressLine += `, ${txt.county} ${clientCounty}`;
  doc.fontSize(10).font("Roboto").text(clientAddressLine, contentX + 370, y);
  y += 10;
  doc.fontSize(10).font("Roboto").text(`${txt.postalCode}: ${order.supplier?.postalCode || "227208"}`, contentX + 10, y);
  doc.fontSize(10).font("Roboto").text(`${txt.postalCode}: ${client.postalCode || client.codPostal || ''}`, contentX + 370, y);
  y += 10;
  doc.fontSize(10).font("Roboto").text(`${txt.account}: ${order.supplier?.iban || "RO23BRDE360SV67547173600"}`, contentX + 10, y);
  doc.fontSize(10).font("Roboto").text(`${txt.account}: ${client.iban || client.contBancar || ''}`, contentX + 370, y);
  y += 10;
  const supplierBankName = lang === 'en' ? 'ROMANIAN DEVELOPMENT BANK (BRD)' : 'BANCA ROMANA DE DEZVOLTARE';
  doc.fontSize(10).font("Roboto").text(`${txt.bank}: ${order.supplier?.bank || supplierBankName}`, contentX + 10, y);
  // Translate client bank name if it matches Romanian bank names
  let clientBankName = client.bank || client.banca || '';
  if (lang === 'en' && clientBankName) {
    // Handle various forms of Romanian bank names - replace any variation containing BRD or BANCA ROMANA
    if (/BANCA|BRD|DEZVOLTARE/i.test(clientBankName)) {
      clientBankName = 'ROMANIAN DEVELOPMENT BANK (BRD)';
    }
  }
  doc.fontSize(10).font("Roboto").text(`${txt.bank}: ${clientBankName}`, contentX + 370, y);
  y += 10;
  doc.fontSize(10).font("Roboto").text(`${txt.phoneLabel}: ${order.supplier?.phone || COMPANY_CONFIG.phone}`, contentX + 10, y);
  doc.fontSize(10).font("Roboto").text(`${txt.phoneLabel}: ${client.phone || client.telefon || ''}`, contentX + 370, y);
  y += 10;
  doc.fontSize(10).font("Roboto").text(`${txt.emailLabel}: ${order.supplier?.email || COMPANY_CONFIG.email}`, contentX + 10, y);
  doc.fontSize(10).font("Roboto").text(`${txt.emailLabel}: ${client.email || ''}`, contentX + 370, y);
  y += 10;
  // ...existing code...
  // Eliminat orice linie .text(label + ' ' + value, summaryX, doc.y, ...) rămasă
  // --- SFÂRȘIT DATE CLIENT/FURNIZOR ---
  // --- TABEL PROFESIONAL ---
  const produse = Array.isArray(order.products) && order.products.length ? order.products : (Array.isArray(order.items) ? order.items : []);
  const tableHeaders = [
    txt.nr, txt.product, txt.qty, txt.price, txt.prodDiscount, txt.couponDiscount, txt.final, txt.subtotal, txt.term
  ];
  // Ajustare lățimi coloane pentru A4 landscape (~770px disponibil)
  const colW = [28, 140, 40, 55, 65, 65, 55, 60, 50];
  let tableY = doc.y + 10;
  let x = contentX + 10;
  doc.fontSize(10).font("Roboto-Bold").fillColor('#000');
  for (let i = 0; i < tableHeaders.length; i++) {
    doc.text(tableHeaders[i], x, tableY, { width: colW[i], align: i === 1 ? "left" : "center" });
    x += colW[i];
  }
  doc.moveTo(contentX + 10, tableY + 16).lineTo(contentX + 10 + colW.reduce((a, b) => a + b, 0), tableY + 16).stroke();
  doc.fontSize(9).font("Roboto").fillColor('#000'); // păstrat negru pentru text

    // --- Afișare rânduri produse completate ---
    let rowY = tableY + 20;
    // Folosește calculateCartSummary pentru stacking logic corect
    // Folosește stacking logic din calculateCartSummary pentru fiecare produs
    let summaryProducts = [];
    let totalProductDiscount = 0;
    let totalCouponDiscount = 0;
    let subtotal = 0;
    let subtotalDupaReduceri = 0;
    try {
      const { calculateCartSummary } = require("../utils/cartSummary");
      const mappedProducts = produse.map((item: any) => ({
        id: item.id,
        name: item.name,
        nameEn: item.nameEn || null,
        price: item.price,
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
      const summary = calculateCartSummary({ products: mappedProducts });
      summaryProducts = mappedProducts.map((item: any) => {
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
      totalProductDiscount = summary.totalProductDiscount;
      totalCouponDiscount = summary.totalCouponDiscount;
      subtotal = summary.subtotal;
      subtotalDupaReduceri = summary.subtotalDupaReduceri;
    } catch (e) {
      summaryProducts = produse;
      totalProductDiscount = 0;
      totalCouponDiscount = 0;
      subtotal = 0;
      subtotalDupaReduceri = 0;
    }
    for (let idx = 0; idx < summaryProducts.length; idx++) {
      const item = summaryProducts[idx];
      let productName = lang === 'en' && item.nameEn ? item.nameEn : (item.name || item.title || '');
      // Adaugă informații variantă dacă există
      const variantDetails = [];
      if (item.variantCode) variantDetails.push(item.variantCode);
      if (item.variantInfo) variantDetails.push(item.variantInfo);
      if (variantDetails.length > 0) {
        productName = `${productName} (${variantDetails.join(' - ')})`;
      }
      x = contentX + 10;
      doc.text(idx + 1, x, rowY, { width: colW[0], align: "center" }); x += colW[0];
      doc.text(productName, x, rowY, { width: colW[1], align: "left" }); x += colW[1];
      doc.text(item.quantity, x, rowY, { width: colW[2], align: "center" }); x += colW[2];
      doc.text(item.price.toFixed(2), x, rowY, { width: colW[3], align: "center" }); x += colW[3];
      doc.text(item.productDiscount !== 0 ? (item.productDiscount > 0 ? '-' + item.productDiscount.toFixed(2) + ' ' + txt.currencyUnit : item.productDiscount.toFixed(2) + ' ' + txt.currencyUnit) : '-', x, rowY, { width: colW[4], align: "center" }); x += colW[4];
      doc.text(item.couponDiscount !== 0 ? (item.couponDiscount > 0 ? '-' + item.couponDiscount.toFixed(2) + ' ' + txt.currencyUnit : item.couponDiscount.toFixed(2) + ' ' + txt.currencyUnit) : '-', x, rowY, { width: colW[5], align: "center" }); x += colW[5];
      doc.text(item.priceAfterCoupon.toFixed(2), x, rowY, { width: colW[6], align: "center" }); x += colW[6];
      doc.text(item.subtotal.toFixed(2), x, rowY, { width: colW[7], align: "center" }); x += colW[7];
      // Translate delivery term (zile -> days)
      let deliveryTermDisplay = item.deliveryTerm && item.deliveryTerm !== '-' ? item.deliveryTerm : (item.deliveryTime || '-');
      if (lang === 'en' && deliveryTermDisplay !== '-') {
        deliveryTermDisplay = deliveryTermDisplay.replace(/zile/gi, 'days').replace(/zi\b/gi, 'day');
      }
      doc.text(deliveryTermDisplay, x, rowY, { width: colW[8], align: "center" });
      rowY += 11;
    }

  // --- SUMAR COȘ IDENTIC CU FORMULARUL ---
  // Mut sumarul după tabel, fără dublare produse
  // Calculează sumarul corect
  // Folosește deliveryLabel din payload dacă există
  label = typeof order.deliveryLabel === 'string' && order.deliveryLabel ? order.deliveryLabel : (() => {
    if (typeof order.deliveryType === 'string') {
      switch (order.deliveryType.trim().toLowerCase()) {
        case 'pickup': return txt.pickup;
        case 'client': return txt.clientShipping;
        case 'standard': return txt.standard;
        case 'express': return txt.express;
        case 'easybox': return txt.easybox;
        case 'rapid': return txt.rapid;
        default: return order.deliveryType;
      }
    }
    return '-';
  })();
  costCurierText += ` (${label})`;
  // Subtotal, reduceri, total, TVA
  // Folosește exact valorile din payload (plasare comandă)
  // Folosește DOAR valorile calculate pentru sumar, nu fallback din order
  let subtotalPretVanzareFaraTVA = subtotal;
  let subtotalDupaReduceriFaraTVA = subtotalDupaReduceri;
  let reducereTotala = totalProductDiscount + totalCouponDiscount;
  let costCurierValPdf = typeof order.courierCost === 'number' ? order.courierCost : costCurier;
  // Folosește mereu cost curier din payload
  const totalFaraTVA = subtotalDupaReduceriFaraTVA + (typeof order.courierCost === 'number' ? order.courierCost : 0);
  // TVA din order sau din config admin
  const configTva = await getTvaPercent();
  let tvaPercent = typeof order.tva === 'number' && !isNaN(order.tva) ? order.tva : configTva;
  // TVA și total cu TVA corect, pe baza totalului fără TVA
  const tva = Math.round(totalFaraTVA * tvaPercent / 100 * 100) / 100;
  const totalCuTVA = Math.round((totalFaraTVA + tva) * 100) / 100;
  function summaryRow(label: string, value: string, color: string = '#000', fontSize = 12, fontWeight: 'normal' | 'bold' = 'bold') {
    doc.fontSize(fontSize)
      .font(fontWeight === 'bold' ? "Roboto-Bold" : "Roboto")
      .fillColor(color);
    doc.text(label + ' ' + value, contentX + 10 + colW.reduce((a, b) => a + b, 0) - 320, doc.y, { align: "left" });
    doc.y += 10;
  }
  doc.y += 8;
  summaryRow(`${txt.subtotalSalePrice}:`, `${subtotal.toFixed(2)} ${txt.currencyUnit}`);
  summaryRow(`${txt.totalProductDiscount}:`, `-${totalProductDiscount.toFixed(2)} ${txt.currencyUnit}`, 'orange', 12, 'normal');
  summaryRow(`${txt.totalCouponDiscount}:`, `-${totalCouponDiscount.toFixed(2)} ${txt.currencyUnit}`, 'blue', 12, 'normal');
  summaryRow(`${txt.subtotalAfterDiscounts}:`, `${subtotalDupaReduceri.toFixed(2)} ${txt.currencyUnit}`, 'green');
  // Cost curier cu sumă și tip (standard/express/easybox)
  const paymentMethodLabel = typeof order.paymentMethod === 'string' && order.paymentMethod.trim() ? order.paymentMethod.trim() : 'transfer';
  let paymentLabelText = paymentMethodLabel;
  if (paymentMethodLabel === 'transfer') paymentLabelText = txt.bankTransfer;
  else if (paymentMethodLabel === 'ramburs') paymentLabelText = txt.cashOnDelivery;
  else if (paymentMethodLabel === 'card') paymentLabelText = txt.cardOnline;
  else if (paymentMethodLabel === 'rate') paymentLabelText = txt.installments;
  paymentLabel = `${txt.paymentMethod}: ${paymentLabelText}`;
  tipLivrare = order.deliveryLabel || order.courierType || '-';
  costCurierVal = typeof order.courierCost === 'number' ? order.courierCost.toFixed(2) : '0.00';
  summaryRow(`${txt.courierCost}:`, `${costCurierVal} ${txt.currencyUnit}`, '#000', 12, 'bold');
  summaryRow(`${paymentLabel}`, '', '#000', 12, 'bold');
  // Total fără TVA = subtotal după reduceri + cost curier
  summaryRow(`${txt.totalNoVat}:`, `${totalFaraTVA.toFixed(2)} ${txt.currencyUnit}`, 'navy');
  summaryRow(`${txt.vat} (${tvaPercent}%):`, `${tva.toFixed(2)} ${txt.currencyUnit}`, 'navy');
  summaryRow(`${txt.totalWithVat}:`, `${totalCuTVA.toFixed(2)} ${txt.currencyUnit}`, '#000', 16);
  doc.y += 10;

  // --- METODĂ DE PLATĂ ȘI LIVRARE ---
  // Eliminat din PDF la cerere
  // doc.fontSize(10).font("Roboto-Bold").fillColor('#000').text(`Metodă de plată:`, contentX + 10, doc.y);
  // doc.fontSize(10).font("Roboto").fillColor('#000').text(`${order.paymentMethod || '-'}`, contentX + 120, doc.y);
  // doc.fontSize(10).font("Roboto-Bold").fillColor('#000').text(`Livrare:`, contentX + 250, doc.y);
  // doc.fontSize(10).font("Roboto").fillColor('#000').text(`${order.deliveryType || ''}`, contentX + 320, doc.y);
  // doc.y += 18;

  doc.fontSize(11).font("Roboto-Bold").fillColor('#000').text(txt.disclaimer, contentX + 10, doc.y, { align: "left" });
  doc.end();
  return await new Promise<Buffer>(resolve => {
    doc.on("end", () => {
      resolve(Buffer.concat(buffers));
    });
  });
}