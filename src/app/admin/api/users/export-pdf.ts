import { getAllUsers, User } from "../../../account/usersDb";
import "@/lib/pdfkit-fix";
import PDFDocument from "pdfkit";
import path from "path";
import { NextResponse } from "next/server";

export async function GET() {
  const users = getAllUsers();
  const doc = new PDFDocument({ margin: 30, size: 'A4', autoFirstPage: false });
  const fontPath = path.join(process.cwd(), "public", "fonts", "Roboto-Regular.ttf");
  const fontBoldPath = path.join(process.cwd(), "public", "fonts", "Roboto-Bold.ttf");
  doc.registerFont("Roboto", fontPath);
  doc.registerFont("Roboto-Bold", fontBoldPath);
  doc.font("Roboto");
  doc.addPage({ margin: 30, size: 'A4' });
  let buffers: Buffer[] = [];
  doc.on('data', buffers.push.bind(buffers));
  doc.on('end', () => {});

  doc.fontSize(18).font("Roboto-Bold").text('Lista utilizatori', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).font("Roboto-Bold");
  // Header
  doc.text('ID', 30, doc.y, { continued: true, width: 40 });
  doc.text('Nume', 70, doc.y, { continued: true, width: 120 });
  doc.text('Email', 190, doc.y, { continued: true, width: 180 });
  doc.text('Status', 370, doc.y);
  doc.moveDown(0.5);
  doc.moveTo(30, doc.y).lineTo(550, doc.y).stroke();
  // Rows
  users.forEach((u: User) => {
    doc.font("Roboto");
    doc.text(String(u.id), 30, doc.y, { continued: true, width: 40 });
    doc.text(u.name, 70, doc.y, { continued: true, width: 120 });
    doc.text(u.email, 190, doc.y, { continued: true, width: 180 });
    doc.text(u.blocked ? 'Blocat' : 'Activ', 370, doc.y);
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
      'Content-Disposition': 'attachment; filename=utilizatori.pdf',
    },
  });
}
