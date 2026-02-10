

import PDFDocument from "pdfkit";
import path from "path";
import { COMPANY_CONFIG } from "@/lib/companyConfig";

// Funcție pentru a elimina diacritice și caractere non-ASCII
function normalizeText(str: string) {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // elimină diacritice
    .replace(/[^\x00-\x7F]/g, '')   // elimină caractere non-ASCII
    .replace(/\s+/g, ' ')            // spații multiple la unul singur
    .trim();
}

export async function generateContactFormPdfBuffer(data: {
  prenume: string;
  nume: string;
  email: string;
  companie?: string;
  serviciu: string;
  mesaj: string;
}): Promise<Buffer> {
  const fontPath = path.join(process.cwd(), "public", "fonts", "Roboto-Regular.ttf");
  const fontBoldPath = path.join(process.cwd(), "public", "fonts", "Roboto-Bold.ttf");
  const doc = new PDFDocument({ margin: 36, size: 'A4', autoFirstPage: false });
  doc.registerFont("Roboto", fontPath);
  doc.registerFont("Roboto-Bold", fontBoldPath);
  doc.font("Roboto");
  doc.addPage({ margin: 36, size: 'A4' });
  let buffers: Buffer[] = [];
  doc.on("data", (d: Buffer) => buffers.push(d));
  doc.on("end", () => {});

  // Logo și antet firmă (fallback dacă logo nu există)
  const logoPath = path.join(process.cwd(), "public", "logo.png");
  let logoDrawn = false;
  try {
    doc.image(logoPath, 36, 24, { width: 70 });
    logoDrawn = true;
  } catch (e) {
    // Logo lipsă sau corupt, continuă fără el
  }
  doc.font("Roboto-Bold");
  doc.fontSize(18).text("PREV-COR TPM S.R.L.", logoDrawn ? 120 : 36, 32, { continued: false });
  doc.fontSize(10).font("Roboto").text("Strada Principala, nr.70, Stroesti, Mehedinti, România", logoDrawn ? 120 : 36, 52);
  doc.text("CUI: RO43434739   RC: J25/582/2020", logoDrawn ? 120 : 36, 66);
  doc.text(`Telefon: ${COMPANY_CONFIG.phone}   Email: ${COMPANY_CONFIG.email}`, logoDrawn ? 120 : 36, 80);
  doc.moveDown(2);

  // Linie sub antet
  doc.moveTo(36, 100).lineTo(559, 100).lineWidth(1.2).stroke();

  // Titlu formular
  doc.moveDown(1.5);
  doc.fontSize(20).font("Roboto-Bold");
  doc.text("Formular Contact Website", { align: "center" });
  doc.moveDown(1);

  // Dată generare
  const now = new Date();
  const z = (n: number) => n.toString().padStart(2, '0');
  const dataGen = `${z(now.getDate())}.${z(now.getMonth() + 1)}.${now.getFullYear()} ${z(now.getHours())}:${z(now.getMinutes())}`;
  doc.fontSize(10).font("Roboto").text(`Data generare: ${dataGen}`, { align: "right" });
  doc.moveDown(1);

  // Secțiune date client
  doc.fontSize(13).font("Roboto-Bold");
  doc.text("Date solicitant", { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(12).font("Roboto").text(`Nume: ${normalizeText(data.prenume)} ${normalizeText(data.nume)}`);
  doc.text(`Email: ${normalizeText(data.email)}`);
  doc.text(`Companie: ${normalizeText(data.companie || '-')}`);
  doc.moveDown(1);

  // Secțiune serviciu și mesaj
  doc.fontSize(13).font("Roboto-Bold");
  doc.text("Detalii solicitare", { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(12).font("Roboto").text(`Serviciu dorit: ${normalizeText(data.serviciu)}`);
  doc.moveDown(0.5);
  doc.fontSize(12).font("Roboto").text("Mesaj:");
  doc.font("Roboto");
  doc.text(normalizeText(data.mesaj), { indent: 20 });
  doc.moveDown(2);

  // GDPR/disclaimer
  doc.fontSize(9).font("Roboto").fillColor("#666").text(
    "Prin completarea acestui formular, sunteti de acord cu prelucrarea datelor cu caracter personal conform politicii GDPR a companiei PREV-COR TPM SRL.",
    { align: "center" }
  );

  doc.end();
  return await new Promise((resolve) => {
    doc.on("end", () => {
      resolve(Buffer.concat(buffers));
    });
  });
}
