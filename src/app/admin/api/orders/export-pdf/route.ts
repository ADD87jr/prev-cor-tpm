
import { NextRequest, NextResponse } from "next/server";
import { getAllOrders } from "../../../../account/usersDb";
import PDFDocument from "pdfkit";
import path from "path";
import { adminAuthMiddleware } from "@/lib/auth-middleware";

export async function GET(req: NextRequest) {
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;
  const orders = getAllOrders();
  const doc = new PDFDocument({ margin: 30, size: 'A4' });
  // Înregistrare și setare font Roboto
  const fontPath = path.join(process.cwd(), "public", "fonts", "Roboto-Regular.ttf");
  doc.registerFont("Roboto", fontPath);
  doc.font('Roboto');
  let buffers: Buffer[] = [];
  doc.on('data', buffers.push.bind(buffers));
  doc.on('end', () => {});

  doc.fontSize(18).text('Lista comenzi', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12);
  // Header
  doc.text('ID', 30, doc.y, { continued: true, width: 40 });
  doc.text('Data', 70, doc.y, { continued: true, width: 80 });
  doc.text('Client', 150, doc.y, { continued: true, width: 100 });
  doc.text('Email', 250, doc.y, { continued: true, width: 120 });
  doc.text('Total', 370, doc.y, { continued: true, width: 60 });
  doc.text('Produse', 430, doc.y);
  doc.moveDown(0.5);
  doc.moveTo(30, doc.y).lineTo(550, doc.y).stroke();
  // Rows
  orders.forEach(o => {
    doc.text(String(o.id), 30, doc.y, { continued: true, width: 40 });
    doc.text(o.date, 70, doc.y, { continued: true, width: 80 });
    doc.text(o.user?.name || '', 150, doc.y, { continued: true, width: 100 });
    doc.text(o.user?.email || '', 250, doc.y, { continued: true, width: 120 });
    doc.text(String(o.total), 370, doc.y, { continued: true, width: 60 });
    doc.text(o.items.map((i: any) => `${i.name} x${i.quantity}`).join('; '), 430, doc.y);
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
      "Content-Type": "application/pdf",
      "Content-Disposition": "attachment; filename=comenzi.pdf"
    }
  });
}
