import { prisma } from "@/lib/prisma";

const DEFAULT_SERIES = "FG";

/**
 * Generates the next invoice number for an order
 * Format: SERIES-YYYY-NNNN (e.g., FG-2026-0001)
 */
export async function generateInvoiceNumber(orderId: number, series?: string): Promise<string> {
  const invoiceSeries = series || DEFAULT_SERIES;
  const currentYear = new Date().getFullYear();
  
  // Check if invoice already exists for this order
  const existingInvoice = await prisma.invoice.findUnique({
    where: { orderId }
  });
  
  if (existingInvoice) {
    return `${existingInvoice.series}-${currentYear}-${String(existingInvoice.number).padStart(4, '0')}`;
  }
  
  // Get the last invoice number for this series and year
  const lastInvoice = await prisma.invoice.findFirst({
    where: {
      series: invoiceSeries,
      createdAt: {
        gte: new Date(`${currentYear}-01-01`),
        lt: new Date(`${currentYear + 1}-01-01`)
      }
    },
    orderBy: { number: 'desc' }
  });
  
  const nextNumber = lastInvoice ? lastInvoice.number + 1 : 1;
  
  // Create invoice record
  const invoice = await prisma.invoice.create({
    data: {
      series: invoiceSeries,
      number: nextNumber,
      orderId
    }
  });
  
  return `${invoice.series}-${currentYear}-${String(invoice.number).padStart(4, '0')}`;
}

/**
 * Get invoice number for an existing order (without creating new one)
 */
export async function getInvoiceNumber(orderId: number): Promise<string | null> {
  const invoice = await prisma.invoice.findUnique({
    where: { orderId }
  });
  
  if (!invoice) return null;
  
  const year = invoice.createdAt.getFullYear();
  return `${invoice.series}-${year}-${String(invoice.number).padStart(4, '0')}`;
}

/**
 * Get invoice statistics
 */
export async function getInvoiceStats() {
  const currentYear = new Date().getFullYear();
  
  const yearStart = new Date(`${currentYear}-01-01`);
  const yearEnd = new Date(`${currentYear + 1}-01-01`);
  
  const totalThisYear = await prisma.invoice.count({
    where: {
      createdAt: { gte: yearStart, lt: yearEnd }
    }
  });
  
  const lastInvoice = await prisma.invoice.findFirst({
    orderBy: { createdAt: 'desc' }
  });
  
  return {
    totalThisYear,
    lastNumber: lastInvoice ? `${lastInvoice.series}-${lastInvoice.createdAt.getFullYear()}-${String(lastInvoice.number).padStart(4, '0')}` : null,
    lastCreated: lastInvoice?.createdAt || null
  };
}
