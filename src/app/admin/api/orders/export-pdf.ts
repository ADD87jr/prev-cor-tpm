import { prisma } from "@/lib/prisma";
import "@/lib/pdfkit-fix";
import PDFDocument from "pdfkit";
import path from "path";

import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  // Exemplu: exportă doar prima comandă din baza de date (poți extinde pentru toate sau selectate)
  const { generateOrderConfirmationPdfBuffer } = await import("@/app/utils/orderConfirmationPdf");
  const order = await prisma.order.findFirst({ orderBy: { id: 'desc' } });
  if (!order) {
    return new NextResponse('Nu există comenzi.', { status: 404 });
  }
  const pdfOrder = {
    ...order,
    items: order.items,
    products: order.items,
    clientData: order.clientData || {},
    courierCost: order.courierCost,
    deliveryType: order.deliveryType || '',
    paymentMethod: order.paymentMethod || 'transfer bancar',
  };
  const pdfBuffer = await generateOrderConfirmationPdfBuffer(pdfOrder);
  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename=order.pdf',
    },
  });
}
