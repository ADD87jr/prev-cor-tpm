import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont } from 'pdf-lib';
import { COMPANY_CONFIG, getFormattedAddress } from '@/lib/companyConfig';
import { getTvaPercent } from '@/lib/getTvaPercent';

// Sanitize text for PDF - replace Romanian diacritics with ASCII equivalents
function sanitizeForPdf(text: string): string {
  if (!text) return '';
  return text
    .replace(/ă/g, 'a').replace(/Ă/g, 'A')
    .replace(/â/g, 'a').replace(/Â/g, 'A')
    .replace(/î/g, 'i').replace(/Î/g, 'I')
    .replace(/ș/g, 's').replace(/Ș/g, 'S')
    .replace(/ț/g, 't').replace(/Ț/g, 'T')
    .replace(/ş/g, 's').replace(/Ş/g, 'S')  // variant with cedilla
    .replace(/ţ/g, 't').replace(/Ţ/g, 'T'); // variant with cedilla
}

interface InvoiceItem {
  name: string;
  price: number;
  qty: number;
  um?: string; // unitate de masura
}

interface InvoiceData {
  invoiceNumber: string;   // ex: "FG-0001"
  invoiceDate: string;     // ex: "24.02.2026"
  dueDate?: string;        // termen scadent ex: "10.03.2026"
  exchangeRate?: string;   // curs de referinta ex: "1 EUR = 4.97 RON"
  orderNumber: string;     // referinta comanda
  clientData: {
    name?: string;
    denumire?: string;
    firstName?: string;
    cui?: string;
    regCom?: string;
    nrRegCom?: string;
    reg?: string;
    address?: string;
    adresa?: string;
    adresaSediu?: string;
    city?: string;
    oras?: string;
    county?: string;
    judet?: string;
    postalCode?: string;
    codPostal?: string;
    phone?: string;
    telefon?: string;
    email?: string;
    iban?: string;
    contBancar?: string;
    bank?: string;
    banca?: string;
  };
  items: InvoiceItem[];
  courierCost?: number;
  tvaPercent?: number;
  isStorno?: boolean;
  stornoOfInvoice?: string; // nr facturii originale stornate, ex: "PCT-0001"
}

// Helper: draw text right-aligned
function drawTextRight(page: PDFPage, text: string, x: number, y: number, width: number, font: PDFFont, size: number, color = rgb(0, 0, 0)) {
  const safeText = sanitizeForPdf(text);
  const textWidth = font.widthOfTextAtSize(safeText, size);
  page.drawText(safeText, { x: x + width - textWidth, y, size, font, color });
}

// Helper: draw text center-aligned
function drawTextCenter(page: PDFPage, text: string, x: number, y: number, width: number, font: PDFFont, size: number, color = rgb(0, 0, 0)) {
  const safeText = sanitizeForPdf(text);
  const textWidth = font.widthOfTextAtSize(safeText, size);
  page.drawText(safeText, { x: x + (width - textWidth) / 2, y, size, font, color });
}

// Helper: draw bordered cell
function drawCell(page: PDFPage, x: number, y: number, w: number, h: number, bgColor?: { r: number; g: number; b: number }) {
  if (bgColor) {
    page.drawRectangle({ x, y, width: w, height: h, color: rgb(bgColor.r, bgColor.g, bgColor.b) });
  }
  page.drawRectangle({ x, y, width: w, height: h, borderColor: rgb(0.7, 0.7, 0.7), borderWidth: 0.5 });
}

export async function generateInvoicePdfBuffer(data: InvoiceData): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 portrait
  
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  const { width, height } = page.getSize();
  const margin = 40;
  let y = height - margin;
  
  const client = data.clientData || {};
  const clientName = client.denumire || client.name || client.firstName || '-';
  const isStorno = data.isStorno === true;
  const sign = isStorno ? -1 : 1;

  // ========================================
  // HEADER - blue bar (red for storno)
  // ========================================
  const headerHeight = 50;
  const headerColor = isStorno ? rgb(0.6, 0.05, 0.05) : rgb(0.02, 0.27, 0.53);
  page.drawRectangle({
    x: 0, y: height - headerHeight, width, height: headerHeight,
    color: headerColor,
  });
  
  const headerTitle = isStorno ? 'FACTURA DE STORNARE' : 'FACTURA FISCALA';
  page.drawText(headerTitle, {
    x: margin, y: height - 33,
    size: 22, font: helveticaBold, color: rgb(1, 1, 1),
  });
  
  drawTextRight(page, `Nr: ${data.invoiceNumber}`, margin, height - 25, width - 2 * margin, helveticaBold, 12, rgb(1, 1, 1));
  drawTextRight(page, `Data: ${data.invoiceDate}`, margin, height - 40, width - 2 * margin, helvetica, 10, rgb(0.8, 0.9, 1));
  
  y = height - headerHeight - 10;
  
  // Termen scadent & curs de referinta
  const dueDate = data.dueDate || '';
  const exchangeRate = data.exchangeRate || '';
  
  if (dueDate || exchangeRate) {
    const infoItems: string[] = [];
    if (dueDate) infoItems.push(`Termen scadent: ${dueDate}`);
    if (exchangeRate) infoItems.push(`Curs de referinta: ${exchangeRate}`);
    infoItems.push(`Ref. comanda: #${data.orderNumber}`);
    
    page.drawText(infoItems.join('   |   '), {
      x: margin, y, size: 8, font: helvetica, color: rgb(0.3, 0.3, 0.3),
    });
    y -= 15;
  } else {
    page.drawText(`Referinta comanda: #${data.orderNumber}`, {
      x: margin, y, size: 8, font: helvetica, color: rgb(0.3, 0.3, 0.3),
    });
    y -= 15;
  }

  // Referință storno
  if (isStorno && data.stornoOfInvoice) {
    page.drawText(`STORNARE a facturii: ${data.stornoOfInvoice}`, {
      x: margin, y, size: 10, font: helveticaBold, color: rgb(0.7, 0, 0),
    });
    y -= 15;
  }

  // ========================================
  // FURNIZOR & CLIENT - two columns
  // ========================================
  const colWidth = (width - 2 * margin - 20) / 2;
  const col1X = margin;
  const col2X = margin + colWidth + 20;
  
  // --- Prepare client data ---
  const cAddr = client.address || client.adresa || client.adresaSediu || '';
  const cCity = client.city || client.oras || '';
  let cCounty = client.county || client.judet || '';
  if (cCounty) cCounty = cCounty.replace(/^(Judetul|Județul|Jud\.?)\s*/i, '').trim();
  let fullAddr = cAddr;
  if (cCity) fullAddr += `, ${cCity}`;
  if (cCounty) fullAddr += `, jud. ${cCounty}`;
  if (fullAddr.length > 50) fullAddr = fullAddr.substring(0, 47) + '...';

  const cPostal = client.postalCode || client.codPostal || '';
  const cIban = client.iban || client.contBancar || '';
  const cBank = client.bank || client.banca || '';
  const cPhone = client.phone || client.telefon || '';

  // Define aligned rows: [label, furnizorValue, clientValue]
  const boxRows: [string, string, string, boolean][] = [
    // [prefix, furnizor, client, isBoldName]
    ['', COMPANY_CONFIG.name, clientName, true],
    ['CUI: ', COMPANY_CONFIG.cui, client.cui || '', false],
    ['Reg.Com: ', COMPANY_CONFIG.regCom, client.regCom || client.nrRegCom || client.reg || '', false],
    ['', getFormattedAddress('ro'), fullAddr, false],
    ['Cod postal: ', COMPANY_CONFIG.address.postalCode, cPostal, false],
    ['IBAN: ', COMPANY_CONFIG.iban, cIban, false],
    ['Banca: ', COMPANY_CONFIG.bank, cBank, false],
    ['Tel: ', COMPANY_CONFIG.phone, cPhone, false],
    ['Email: ', COMPANY_CONFIG.email, client.email || '', false],
  ];

  const lineHeight = 12;
  const firstLineOffset = 32;
  const boxHeight = firstLineOffset + boxRows.length * lineHeight + 8; // 8px bottom padding

  // --- Furnizor box ---
  page.drawRectangle({
    x: col1X, y: y - boxHeight, width: colWidth, height: boxHeight,
    borderColor: rgb(0.02, 0.27, 0.53), borderWidth: 1,
  });
  page.drawRectangle({
    x: col1X, y: y - 18, width: colWidth, height: 18,
    color: rgb(0.02, 0.27, 0.53),
  });
  page.drawText('FURNIZOR', {
    x: col1X + 8, y: y - 14, size: 9, font: helveticaBold, color: rgb(1, 1, 1),
  });

  // --- Client box ---
  page.drawRectangle({
    x: col2X, y: y - boxHeight, width: colWidth, height: boxHeight,
    borderColor: rgb(0.02, 0.27, 0.53), borderWidth: 1,
  });
  page.drawRectangle({
    x: col2X, y: y - 18, width: colWidth, height: 18,
    color: rgb(0.02, 0.27, 0.53),
  });
  page.drawText('CLIENT', {
    x: col2X + 8, y: y - 14, size: 9, font: helveticaBold, color: rgb(1, 1, 1),
  });

  // --- Draw rows aligned on the same Y ---
  for (let i = 0; i < boxRows.length; i++) {
    const [prefix, furnVal, clientVal, isBold] = boxRows[i];
    const lineY = y - firstLineOffset - i * lineHeight;
    const fontSize = isBold ? 9 : 8;
    const fontFace = isBold ? helveticaBold : helvetica;

    // Furnizor side
    if (furnVal) {
      const fText = isBold ? furnVal : `${prefix}${furnVal}`;
      page.drawText(sanitizeForPdf(fText), { x: col1X + 8, y: lineY, size: fontSize, font: fontFace });
    }

    // Client side
    if (clientVal) {
      const cText = isBold ? clientVal : `${prefix}${clientVal}`;
      page.drawText(sanitizeForPdf(cText), { x: col2X + 8, y: lineY, size: fontSize, font: fontFace });
    }
  }

  y = y - boxHeight - 15;

  // ========================================
  // PRODUCTS TABLE
  // ========================================
  const tableWidth = width - 2 * margin;
  const rowHeight = 22;
  const headerRowHeight = 24;
  
  // Column widths: Nr | Denumire produs | U.M. | Cant. | Pret unitar | Valoare
  const cols = [24, 235, 32, 36, 80, 108];
  const colLabels = ['Nr.', 'Denumire produs / serviciu', 'U.M.', 'Cant.', 'Preț unitar', 'Valoare'];
  
  // Table header
  let cellX = margin;
  for (let i = 0; i < cols.length; i++) {
    drawCell(page, cellX, y - headerRowHeight, cols[i], headerRowHeight, { r: 0.02, g: 0.27, b: 0.53 });
    drawTextCenter(page, colLabels[i], cellX, y - headerRowHeight + 8, cols[i], helveticaBold, 8, rgb(1, 1, 1));
    cellX += cols[i];
  }
  y -= headerRowHeight;
  
  // Table rows
  let subtotal = 0;
  for (let idx = 0; idx < data.items.length; idx++) {
    const item = data.items[idx];
    const qty = item.qty * sign;
    const valoare = item.price * qty;
    subtotal += valoare;
    
    const isEven = idx % 2 === 0;
    const bgColor = isEven ? { r: 0.97, g: 0.97, b: 0.97 } : undefined;
    
    cellX = margin;
    
    // Nr
    drawCell(page, cellX, y - rowHeight, cols[0], rowHeight, bgColor);
    drawTextCenter(page, String(idx + 1), cellX, y - rowHeight + 7, cols[0], helvetica, 8);
    cellX += cols[0];
    
    // Produs
    drawCell(page, cellX, y - rowHeight, cols[1], rowHeight, bgColor);
    const prodName = item.name.length > 60 ? item.name.substring(0, 57) + '...' : item.name;
    page.drawText(sanitizeForPdf(prodName), { x: cellX + 4, y: y - rowHeight + 7, size: 8, font: helvetica });
    cellX += cols[1];
    
    // U.M.
    drawCell(page, cellX, y - rowHeight, cols[2], rowHeight, bgColor);
    drawTextCenter(page, item.um || 'buc', cellX, y - rowHeight + 7, cols[2], helvetica, 8);
    cellX += cols[2];
    
    // Cant.
    drawCell(page, cellX, y - rowHeight, cols[3], rowHeight, bgColor);
    drawTextCenter(page, String(qty), cellX, y - rowHeight + 7, cols[3], helvetica, 8);
    cellX += cols[3];
    
    // Pret unitar
    drawCell(page, cellX, y - rowHeight, cols[4], rowHeight, bgColor);
    drawTextRight(page, `${item.price.toFixed(2)} RON`, cellX, y - rowHeight + 7, cols[4] - 4, helvetica, 8);
    cellX += cols[4];
    
    // Valoare
    drawCell(page, cellX, y - rowHeight, cols[5], rowHeight, bgColor);
    drawTextRight(page, `${valoare.toFixed(2)} RON`, cellX, y - rowHeight + 7, cols[5] - 4, helveticaBold, 8);
    
    y -= rowHeight;
    
    // Verifică dacă mai e loc pe pagină
    if (y < 180) break;
  }
  
  y -= 10;
  
  // ========================================
  // TOTALURI - lărgite pe ultimele 2 coloane
  // ========================================
  const totalsX = margin + cols[0] + cols[1] + cols[2] + cols[3];
  const totalsFullW = cols[4] + cols[5];
  const totalsLabelW = Math.round(totalsFullW * 0.50);
  const totalsValW = totalsFullW - totalsLabelW;
  const totRowH = 20;
  
  const courierCost = (data.courierCost || 0) * sign;
  const configTva = await getTvaPercent();
  const tvaPercent = typeof data.tvaPercent === 'number' ? data.tvaPercent : configTva;
  const totalFaraTVA = subtotal + courierCost;
  const tvaValue = Math.round(totalFaraTVA * tvaPercent / 100 * 100) / 100;
  const totalCuTVA = Math.round((totalFaraTVA + tvaValue) * 100) / 100;
  
  // Subtotal produse
  drawCell(page, totalsX, y - totRowH, totalsLabelW, totRowH);
  drawTextRight(page, 'Subtotal produse:', totalsX, y - totRowH + 6, totalsLabelW - 4, helvetica, 8);
  drawCell(page, totalsX + totalsLabelW, y - totRowH, totalsValW, totRowH);
  drawTextRight(page, `${subtotal.toFixed(2)} RON`, totalsX + totalsLabelW, y - totRowH + 6, totalsValW - 4, helvetica, 8);
  y -= totRowH;
  
  // Cost curier (dacă există)
  if (courierCost > 0) {
    drawCell(page, totalsX, y - totRowH, totalsLabelW, totRowH);
    drawTextRight(page, 'Cost curier:', totalsX, y - totRowH + 6, totalsLabelW - 4, helvetica, 8);
    drawCell(page, totalsX + totalsLabelW, y - totRowH, totalsValW, totRowH);
    drawTextRight(page, `${courierCost.toFixed(2)} RON`, totalsX + totalsLabelW, y - totRowH + 6, totalsValW - 4, helvetica, 8);
    y -= totRowH;
  }
  
  // Total fara TVA
  drawCell(page, totalsX, y - totRowH, totalsLabelW, totRowH, { r: 0.95, g: 0.95, b: 0.95 });
  drawTextRight(page, 'Total fara TVA:', totalsX, y - totRowH + 6, totalsLabelW - 4, helveticaBold, 9);
  drawCell(page, totalsX + totalsLabelW, y - totRowH, totalsValW, totRowH, { r: 0.95, g: 0.95, b: 0.95 });
  drawTextRight(page, `${totalFaraTVA.toFixed(2)} RON`, totalsX + totalsLabelW, y - totRowH + 6, totalsValW - 4, helveticaBold, 9);
  y -= totRowH;
  
  // TVA
  drawCell(page, totalsX, y - totRowH, totalsLabelW, totRowH);
  drawTextRight(page, `TVA (${tvaPercent}%):`, totalsX, y - totRowH + 6, totalsLabelW - 4, helvetica, 9);
  drawCell(page, totalsX + totalsLabelW, y - totRowH, totalsValW, totRowH);
  drawTextRight(page, `${tvaValue.toFixed(2)} RON`, totalsX + totalsLabelW, y - totRowH + 6, totalsValW - 4, helvetica, 9);
  y -= totRowH;
  
  // TOTAL CU TVA - blue/red background, pe toată lățimea tabelului
  const totalRowH = 28;
  const totalFullX = margin;
  const totalFullW = width - 2 * margin;
  const totalLabelW = totalFullW - totalsValW;
  const totalBgColor = isStorno ? { r: 0.6, g: 0.05, b: 0.05 } : { r: 0.02, g: 0.27, b: 0.53 };
  const totalLabel = isStorno ? 'TOTAL STORNARE (cu TVA):' : 'TOTAL DE PLATA (cu TVA):';
  drawCell(page, totalFullX, y - totalRowH, totalLabelW, totalRowH, totalBgColor);
  drawTextRight(page, totalLabel, totalFullX, y - totalRowH + 9, totalLabelW - 8, helveticaBold, 12, rgb(1, 1, 1));
  drawCell(page, totalFullX + totalLabelW, y - totalRowH, totalsValW, totalRowH, totalBgColor);
  drawTextRight(page, `${totalCuTVA.toFixed(2)} RON`, totalFullX + totalLabelW, y - totalRowH + 9, totalsValW - 6, helveticaBold, 12, rgb(1, 1, 1));
  y -= totalRowH + 20;
  
  // ========================================
  // FOOTER
  // ========================================
  // Separator line
  page.drawLine({
    start: { x: margin, y: 80 },
    end: { x: width - margin, y: 80 },
    thickness: 0.5, color: rgb(0.7, 0.7, 0.7),
  });
  
  page.drawText('Factura este valabila fara semnatura si stampila conform art. 319 alin. 29 din Codul Fiscal.', {
    x: margin, y: 65, size: 7, font: helvetica, color: rgb(0.4, 0.4, 0.4),
  });
  
  page.drawText(sanitizeForPdf(`${COMPANY_CONFIG.name} | ${COMPANY_CONFIG.email} | ${COMPANY_CONFIG.phone}`), {
    x: margin, y: 52, size: 7, font: helvetica, color: rgb(0.5, 0.5, 0.5),
  });
  
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
