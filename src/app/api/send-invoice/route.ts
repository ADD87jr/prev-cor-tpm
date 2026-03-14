import { NextResponse } from "next/server";
import { sendEmail } from "@/app/utils/email";
import { prisma } from "@/lib/prisma";
import { generateInvoicePdfBuffer } from "@/app/utils/invoicePdfLib";
import { COMPANY_CONFIG } from "@/lib/companyConfig";
import { getCartSettings } from "@/lib/getTvaPercent";
import fs from "fs";
import path from "path";

export async function POST(req: Request) {
  const { order } = await req.json();
  if (!order) return NextResponse.json({ error: "Order missing" }, { status: 400 });

  // Generează număr factură secvențial
  const orderId = order.orderId || order.id;
  
  // Verifică dacă există deja factură NORMALĂ pentru această comandă
  const existingInvoice = await prisma.invoice.findFirst({ where: { orderId, type: 'NORMAL' } });
  
  let invoiceNumberStr: string;
  
  if (existingInvoice) {
    // Folosește factura existentă
    invoiceNumberStr = `PCT-${String(existingInvoice.number).padStart(4, '0')}`;
  } else {
    // Creează factură nouă
    const lastInvoice = await prisma.invoice.findFirst({
      where: { series: 'PCT' },
      orderBy: { number: 'desc' }
    });
    const invoiceNumber = (lastInvoice?.number || 0) + 1;
    
    await prisma.invoice.create({
      data: {
        series: 'PCT',
        number: invoiceNumber,
        orderId,
      }
    });
    invoiceNumberStr = `PCT-${String(invoiceNumber).padStart(4, '0')}`;
  }

  // Pregătește datele pentru generator
  const clientData = order.clientData || {};
  const clientName = clientData.name || clientData.denumire || clientData.firstName || order.userEmail || 'Client';
  const orderItems = (order.items || []).map((item: any) => ({
    name: item.name || 'Produs',
    price: Number(item.price) || 0,
    qty: Number(item.quantity || item.qty) || 1,
    um: item.um || 'buc',
  }));

  const invoiceDate = order.date || new Date().toLocaleDateString('ro-RO');
  const orderNum = order.number || order.orderId || order.id;

  // Calculează termen scadent (configurabil din admin)
  const cartSettings = await getCartSettings();
  const termenZile = cartSettings.termenScadentZile || 30;
  const invoiceDateObj = (() => {
    if (order.date) {
      // Parsează formatul dd.mm.yyyy sau ISO
      const parts = order.date.split('.');
      if (parts.length === 3) return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
      return new Date(order.date);
    }
    return new Date();
  })();
  const dueDateObj = new Date(invoiceDateObj);
  dueDateObj.setDate(dueDateObj.getDate() + termenZile);
  const dueDate = `${String(dueDateObj.getDate()).padStart(2, '0')}.${String(dueDateObj.getMonth() + 1).padStart(2, '0')}.${dueDateObj.getFullYear()}`;

  // Generează PDF profesional
  const pdfBuffer = await generateInvoicePdfBuffer({
    invoiceNumber: invoiceNumberStr,
    invoiceDate,
    dueDate,
    exchangeRate: 'RON',
    orderNumber: String(orderNum),
    clientData,
    items: orderItems,
    courierCost: typeof order.courierCost === 'number' ? order.courierCost : 0,
    tvaPercent: typeof order.tva === 'number' ? order.tva : undefined,
  });

  // Salvează PDF pe disc
  const invoicesDir = path.join(process.cwd(), "public", "uploads", "invoices");
  if (!fs.existsSync(invoicesDir)) {
    fs.mkdirSync(invoicesDir, { recursive: true });
  }
  const pdfFilename = `factura-${invoiceNumberStr}.pdf`;
  const pdfPath = path.join(invoicesDir, pdfFilename);
  fs.writeFileSync(pdfPath, pdfBuffer);

  // Actualizează invoiceUrl pe comandă
  const invoiceUrl = `/api/download-invoice?file=${pdfFilename}`;
  await prisma.order.update({
    where: { id: orderId },
    data: { invoiceUrl },
  });

  // Trimite email cu PDF atașat
  const recipientEmail = clientData.email || order.userEmail;
  try {
    if (recipientEmail) {
      await sendEmail({
        to: recipientEmail,
        subject: `Factura ${invoiceNumberStr} - Comanda #${orderNum}`,
        text: `Buna ziua!\n\nAtasat gasiti factura fiscala ${invoiceNumberStr} pentru comanda #${orderNum} plasata la PREV-COR TPM.\n\nVa multumim pentru incredere!\n\nEchipa PREV-COR TPM`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px;">
            <h2 style="color: #2563eb;">Factura ${invoiceNumberStr}</h2>
            <p>Draga ${clientName},</p>
            <p>Atasat gasiti factura fiscala <strong>${invoiceNumberStr}</strong> pentru comanda <strong>#${orderNum}</strong>.</p>
            <p>Va multumim pentru incredere!</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #666; font-size: 12px;">Cu stima,<br>Echipa PREV-COR TPM<br><a href="mailto:${COMPANY_CONFIG.email}">${COMPANY_CONFIG.email}</a></p>
          </div>
        `,
        attachments: [
          {
            filename: `factura-${invoiceNumberStr}.pdf`,
            content: pdfBuffer,
          }
        ]
      });
    }
    const ab = pdfBuffer.buffer.slice(pdfBuffer.byteOffset, pdfBuffer.byteOffset + pdfBuffer.byteLength);
    return new Response(ab as ArrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=factura-${invoiceNumberStr}.pdf`,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
