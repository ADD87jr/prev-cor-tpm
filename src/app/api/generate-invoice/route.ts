import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateOrderConfirmationPdfBuffer } from "@/app/utils/orderConfirmationPdfLib";
import { generateInvoiceNumber } from "@/app/utils/invoiceNumber";
import { COMPANY_CONFIG } from "@/lib/companyConfig";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId } = body;
    if (!orderId) return new Response(JSON.stringify({ error: "orderId missing" }), { status: 400 });
    // Citește comanda salvată din baza de date
    const order = await prisma.order.findUnique({ where: { id: Number(orderId) } });
    if (!order) return new Response(JSON.stringify({ error: "Order not found" }), { status: 404 });
    
    // Generează număr factură automat
    const invoiceNumber = await generateInvoiceNumber(Number(orderId));
    const [series, year, number] = invoiceNumber.split('-');
    
    // Fallback pentru courierCost și paymentMethod
    let courierCost = body.courierCost;
    if (courierCost === undefined || courierCost === null || courierCost === 0) {
      courierCost = order.courierCost;
    }
    let paymentMethod = body.paymentMethod;
    if (!paymentMethod || paymentMethod === '' || paymentMethod === null) {
      paymentMethod = order.paymentMethod;
    }
    // Construiește structura pentru PDF
    const pdfOrder = {
      series: series,
      number: parseInt(number),
      invoiceNumber: invoiceNumber,
      issueDate: order.date,
      dueDate: order.date,
      currency: "RON",
      supplier: {
        name: COMPANY_CONFIG.name,
        cui: COMPANY_CONFIG.cui,
        reg: COMPANY_CONFIG.regCom,
        address: `Str. ${COMPANY_CONFIG.address.street}, Nr.${COMPANY_CONFIG.address.number}, ${COMPANY_CONFIG.address.city}, ${COMPANY_CONFIG.address.county}`,
        iban: COMPANY_CONFIG.iban,
        bank: COMPANY_CONFIG.bank,
        phone: COMPANY_CONFIG.phone,
        email: COMPANY_CONFIG.email,
      },
      client: order.clientData,
      products: Array.isArray(order.items) ? order.items.map((item: any) => ({
        name: item.name,
        unit: item.unit || "BUC",
        qty: item.quantity || item.qty || 1,
        price: item.price,
        tva: item.tva || 19,
        discount: item.discount || 0,
        discountType: item.discountType || '',
        discountPercent: item.discountPercent || null,
        deliveryTerm: item.deliveryTerm || item.deliveryTime || '-',
        deliveryTime: item.deliveryTime || item.deliveryTerm || '-',
        appliedCoupon: item.appliedCoupon || null,
      })) : [],
      delivery: {},
      notes: (order as any).notes || "",
      courierCost,
      paymentMethod,
      tva: order.tva,
      subtotalPretVanzare: order.subtotalPretVanzare,
      subtotalDupaReduceri: order.subtotalDupaReduceri,
      reducereTotala: order.reducereTotala,
      deliveryType: order.deliveryType,
      deliveryLabel: order.deliveryLabel,
    };
    console.log('[DEBUG] Payload către PDF:', JSON.stringify(pdfOrder, null, 2));
    const pdfBuffer = await generateOrderConfirmationPdfBuffer(pdfOrder);
    console.log('[DEBUG] Răspuns PDF:', pdfBuffer ? 'PDF generat cu succes' : 'Eroare PDF');
    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=factura-${invoiceNumber}.pdf`
      }
    });
  } catch (err: any) {
    console.error('EROARE GENERARE PDF:', err);
    return new Response(JSON.stringify({ error: 'Eroare generare PDF', details: err && typeof err === 'object' && 'message' in err ? (err as any).message : String(err) }), { status: 500 });
  }
}
