
import { NextRequest, NextResponse } from "next/server";
import { getAdminLog } from "../../adminLogDb";
import PDFDocument from "pdfkit";
import path from "path";

export async function GET() {
  const log = getAdminLog();
  const doc = new PDFDocument({ margin: 30, size: 'A4' });
  // Înregistrare și setare font Roboto
  const fontPath = path.join(process.cwd(), "public", "fonts", "Roboto-Regular.ttf");
  doc.registerFont("Roboto", fontPath);
  doc.font("Roboto");
  let buffers: Buffer[] = [];
  doc.on('data', buffers.push.bind(buffers));
  doc.on('end', () => {});

  doc.fontSize(18).text('Log activitate admin', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12);
  // Header
  doc.text('Data', 30, doc.y, { continued: true, width: 120 });
  doc.text('Acțiune', 150, doc.y, { continued: true, width: 120 });
  doc.text('Detalii', 270, doc.y);
  doc.moveDown(0.5);
  doc.moveTo(30, doc.y).lineTo(550, doc.y).stroke();
  // Rows
  log.forEach(l => {
    doc.text(l.time, 30, doc.y, { continued: true, width: 120 });
    doc.text(l.action, 150, doc.y, { continued: true, width: 120 });
    doc.text(l.details || '', 270, doc.y);
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
      'Content-Disposition': 'attachment; filename=log_admin.pdf',
    },
  });
}
