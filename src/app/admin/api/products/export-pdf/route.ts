
import { NextRequest, NextResponse } from "next/server";
import { getProducts } from "../../../productsDb";
import PDFDocument from "pdfkit";
import path from "path";
import { adminAuthMiddleware } from "@/lib/auth-middleware";

export async function GET(req: NextRequest) {
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;
  const products = getProducts();
  const doc = new PDFDocument({ margin: 30, size: 'A4', autoFirstPage: false });
  // Înregistrare și setare font Roboto
  const fontPath = path.join(process.cwd(), "public", "fonts", "Roboto-Regular.ttf");
  doc.registerFont("Roboto", fontPath);
  doc.font('Roboto');
  doc.addPage({ margin: 30, size: 'A4' });
  let buffers: Buffer[] = [];
  doc.on('data', buffers.push.bind(buffers));
  doc.on('end', () => {});

    doc.fontSize(18).text('Lista produse', { align: 'center' });
  doc.moveDown();
    doc.fontSize(12);
  // Header
    doc.text('ID', 30, doc.y, { continued: true, width: 40 });
    doc.text('Nume', 80, doc.y, { continued: true, width: 120 });
    doc.text('Preț', 200, doc.y, { continued: true, width: 60 });
    doc.text('Stoc', 260, doc.y, { continued: true, width: 40 });
    doc.text('Tip', 300, doc.y, { continued: true, width: 80 });
    doc.text('Domeniu', 380, doc.y, { continued: true, width: 80 });
    doc.text('Descriere', 460, doc.y);
  doc.moveDown(0.5);
  doc.moveTo(30, doc.y).lineTo(550, doc.y).stroke();
  // Rows
  products.forEach(p => {
      doc.text(String(p.id), 30, doc.y, { continued: true, width: 40 });
      doc.text(p.name, 80, doc.y, { continued: true, width: 120 });
      doc.text(String(p.price), 200, doc.y, { continued: true, width: 60 });
      doc.text(String(p.stock), 260, doc.y, { continued: true, width: 40 });
      doc.text(p.type, 300, doc.y, { continued: true, width: 80 });
      doc.text(p.domain, 380, doc.y, { continued: true, width: 80 });
      doc.text(p.description, 460, doc.y);
    doc.moveDown(0.2);
  });
  doc.end();
  const pdfBuffer = await new Promise<Buffer>(resolve => {
    const bufs: Buffer[] = [];
    doc.on('data', (d: Buffer) => bufs.push(d));
    doc.on('end', () => resolve(Buffer.concat(bufs)));
  });
  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename=produse.pdf',
    },
  });
}
