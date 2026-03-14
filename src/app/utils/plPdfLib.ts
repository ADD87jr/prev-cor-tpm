import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

interface PLData {
  totalVenituriFaraTVA: number;
  totalTVAColectat: number;
  totalVenituri: number;
  totalCheltuieli: number;
  profitNet: number;
  marjaProfit: number;
  nrFacturi: number;
  nrCheltuieli: number;
  lunile: {
    luna: string;
    venituriFaraTVA: number;
    tvaColectat: number;
    venituri: number;
    nrFacturi: number;
    cheltuieli: number;
    nrCheltuieli: number;
    profit: number;
  }[];
  cheltuieliPeCategorie: Record<string, number>;
}

const LUNA_LABELS: Record<string, string> = {
  "01": "Ianuarie", "02": "Februarie", "03": "Martie", "04": "Aprilie",
  "05": "Mai", "06": "Iunie", "07": "Iulie", "08": "August",
  "09": "Septembrie", "10": "Octombrie", "11": "Noiembrie", "12": "Decembrie",
};

function getLunaLabel(luna: string) {
  const [year, month] = luna.split("-");
  return `${LUNA_LABELS[month] || month} ${year}`;
}

function fmt(n: number) {
  return n.toLocaleString("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export async function generatePLPdfBuffer(data: PLData, from?: string, to?: string): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 595;
  const pageHeight = 842;
  const margin = 50;
  let page = doc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  const drawText = (text: string, x: number, yPos: number, size: number, bold = false, color = rgb(0, 0, 0)) => {
    page.drawText(text, { x, y: yPos, size, font: bold ? fontBold : font, color });
  };

  // Titlu
  drawText("RAPORT PROFIT & PIERDERE", margin, y, 16, true, rgb(0.1, 0.1, 0.5));
  y -= 20;

  // Perioadă
  const period = from && to ? `${from} - ${to}` : from ? `de la ${from}` : to ? `pana la ${to}` : "Toate perioadele";
  drawText(`Perioada: ${period}`, margin, y, 10, false, rgb(0.4, 0.4, 0.4));
  y -= 10;
  drawText(`Generat: ${new Date().toLocaleString("ro-RO")}`, margin, y, 8, false, rgb(0.5, 0.5, 0.5));
  y -= 25;

  // Linie separator
  page.drawLine({ start: { x: margin, y }, end: { x: pageWidth - margin, y }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });
  y -= 20;

  // Sumar
  drawText("SUMAR FINANCIAR", margin, y, 12, true);
  y -= 18;
  const summaryItems = [
    ["Facturi emise:", String(data.nrFacturi)],
    ["Venituri (fara TVA):", `${fmt(data.totalVenituriFaraTVA)} RON`],
    ["TVA colectat:", `${fmt(data.totalTVAColectat)} RON`],
    ["Cheltuieli totale:", `${fmt(data.totalCheltuieli)} RON`],
    ["Profit net:", `${fmt(data.profitNet)} RON`],
    ["Marja profit:", `${data.marjaProfit}%`],
  ];
  for (const [label, value] of summaryItems) {
    drawText(label, margin + 10, y, 10, false);
    drawText(value, 300, y, 10, true);
    y -= 14;
  }
  y -= 15;

  // Tabel lunar
  if (data.lunile.length > 0) {
    drawText("DETALII PE LUNI", margin, y, 12, true);
    y -= 18;

    // Header
    const cols = [margin, margin + 100, margin + 180, margin + 270, margin + 360, margin + 430];
    const headers = ["Luna", "Facturi", "Venituri (fara TVA)", "TVA", "Cheltuieli", "Profit"];
    for (let i = 0; i < headers.length; i++) {
      drawText(headers[i], cols[i], y, 8, true, rgb(0.3, 0.3, 0.3));
    }
    y -= 4;
    page.drawLine({ start: { x: margin, y }, end: { x: pageWidth - margin, y }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) });
    y -= 12;

    for (const l of data.lunile) {
      if (y < 80) {
        page = doc.addPage([pageWidth, pageHeight]);
        y = pageHeight - margin;
      }
      drawText(getLunaLabel(l.luna), cols[0], y, 9);
      drawText(String(l.nrFacturi), cols[1], y, 9);
      drawText(fmt(l.venituriFaraTVA), cols[2], y, 9);
      drawText(fmt(l.tvaColectat), cols[3], y, 9);
      drawText(fmt(l.cheltuieli), cols[4], y, 9, false, rgb(0.8, 0, 0));
      const profitColor = l.profit >= 0 ? rgb(0, 0.5, 0) : rgb(0.8, 0, 0);
      drawText(fmt(l.profit), cols[5], y, 9, true, profitColor);
      y -= 14;
    }

    // Total row
    y -= 4;
    page.drawLine({ start: { x: margin, y: y + 2 }, end: { x: pageWidth - margin, y: y + 2 }, thickness: 0.5, color: rgb(0.5, 0.5, 0.5) });
    y -= 2;
    drawText("TOTAL", cols[0], y, 9, true);
    drawText(String(data.nrFacturi), cols[1], y, 9, true);
    drawText(fmt(data.totalVenituriFaraTVA), cols[2], y, 9, true);
    drawText(fmt(data.totalTVAColectat), cols[3], y, 9, true);
    drawText(fmt(data.totalCheltuieli), cols[4], y, 9, true, rgb(0.8, 0, 0));
    const totalColor = data.profitNet >= 0 ? rgb(0, 0.5, 0) : rgb(0.8, 0, 0);
    drawText(fmt(data.profitNet), cols[5], y, 9, true, totalColor);
    y -= 25;
  }

  // Cheltuieli pe categorii
  const categories = Object.entries(data.cheltuieliPeCategorie).sort((a, b) => b[1] - a[1]);
  if (categories.length > 0) {
    if (y < 120) {
      page = doc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }
    drawText("CHELTUIELI PE CATEGORII", margin, y, 12, true);
    y -= 18;
    for (const [cat, suma] of categories) {
      if (y < 60) {
        page = doc.addPage([pageWidth, pageHeight]);
        y = pageHeight - margin;
      }
      const pct = data.totalCheltuieli > 0 ? Math.round((suma / data.totalCheltuieli) * 100) : 0;
      drawText(`${cat}:`, margin + 10, y, 9, false);
      drawText(`${fmt(suma)} RON (${pct}%)`, 250, y, 9, true, rgb(0.7, 0, 0));
      y -= 14;
    }
  }

  // Footer pe toate paginile
  const pages = doc.getPages();
  for (let i = 0; i < pages.length; i++) {
    pages[i].drawText(`PREV-COR TPM | Raport P&L | Pagina ${i + 1} din ${pages.length}`, {
      x: margin, y: 30, size: 7, font, color: rgb(0.5, 0.5, 0.5),
    });
  }

  const pdfBytes = await doc.save();
  return Buffer.from(pdfBytes);
}
