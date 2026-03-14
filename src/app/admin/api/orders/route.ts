import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/app/utils/email";
import { sendOrderStatusEmail } from "@/app/utils/orderStatusEmail";
import { logAdminAction } from "@/app/utils/adminLog";
import { adminAuthMiddleware } from "@/lib/auth-middleware";

export async function GET(req: NextRequest) {
  // Protejare autentificare
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;

  try {
    const orders = await prisma.order.findMany({ include: { user: true, product: true } });
    // Încarcă toate DropshipOrder-urile pentru a marca comenzile cu produse dropship
    const dropshipOrders = await prisma.dropshipOrder.findMany({
      select: { orderId: true, status: true }
    });
    const dropshipOrderMap = new Map<number, string[]>();
    for (const dso of dropshipOrders) {
      if (!dropshipOrderMap.has(dso.orderId)) dropshipOrderMap.set(dso.orderId, []);
      dropshipOrderMap.get(dso.orderId)!.push(dso.status);
    }
    // Include clientData și hasDropship în răspuns
    const ordersWithClient = orders.map(order => ({
      ...order,
      clientData: order.clientData || null,
      hasDropship: dropshipOrderMap.has(order.id),
      dropshipStatuses: dropshipOrderMap.get(order.id) || []
    }));
    return NextResponse.json(ordersWithClient);
  } catch (err) {
    console.error("[ORDERS GET] Error:", err);
    return NextResponse.json({ error: "Eroare server" }, { status: 500 });
  }
}

// PATCH: schimbă status comandă, AWB sau alte câmpuri și notifică clientul
export async function PATCH(req: NextRequest) {
  // Protejare autentificare
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;

  const { orderId, status, userEmail, awb, courierName, courierCost, total, items, clientData } = await req.json();
  let order = null;
  if (orderId) {
    // Construiește obiectul de date pentru update
    const updateData: Record<string, unknown> = {};
    if (status) {
      updateData.status = status;
      updateData.statusUpdatedAt = new Date();
    }
    if (awb !== undefined) {
      updateData.awb = awb;
    }
    if (courierName !== undefined) {
      updateData.courierName = courierName;
    }
    if (courierCost !== undefined) {
      updateData.courierCost = courierCost;
    }
    if (total !== undefined) {
      updateData.total = total;
    }
    if (items !== undefined) {
      updateData.items = items;
    }
    if (clientData !== undefined) {
      // Merge cu datele existente
      const existingOrder = await prisma.order.findUnique({ where: { id: orderId } });
      const existingClientData = (existingOrder?.clientData as Record<string, unknown>) || {};
      updateData.clientData = { ...existingClientData, ...clientData };
    }
    
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "Nimic de actualizat" }, { status: 400 });
    }
    
    order = await prisma.order.update({
      where: { id: orderId },
      data: updateData,
    });

    // Log admin action
    await logAdminAction({
      action: 'UPDATE',
      entity: 'order',
      entityId: orderId,
      details: updateData,
      adminEmail: 'admin' // TODO: get from session
    });

    // Trimite email tranzacțional la schimbare status
    try {
      const clientData = order.clientData as any || {};
      const to = userEmail || clientData.email;
      // Nu trimite email automat pentru awaiting_price - emailul se trimite separat prin /api/price-confirm/send
      if (to && status && status !== 'awaiting_price') {
        // Parse items from order
        const orderItems = (order.items as any[]) || [];
        const itemsForEmail = orderItems.map((item: any) => ({
          name: item.name || item.productName || 'Produs',
          quantity: item.quantity || item.qty || 1,
          price: item.price || 0
        }));

        await sendOrderStatusEmail({
          orderNumber: order.number || order.id.toString(),
          customerName: clientData.name || clientData.firstName || clientData.nume || '',
          customerEmail: to,
          newStatus: status,
          awb: order.awb || undefined,
          courierName: order.courierName || undefined,
          items: itemsForEmail,
          total: order.total || undefined,
          courierCost: typeof order.courierCost === 'number' ? order.courierCost : 0,
          tvaPercent: typeof order.tva === 'number' ? order.tva : undefined
        });
      }
    } catch (e) {
      console.error('[ORDERS] Eroare la trimitere email status comandă:', e);
    }

    // Trimite automat factura când statusul devine "livrată" (cu delay 3 secunde)
    if (status === 'livrată') {
      const invoiceOrder = {
        orderId: order.id,
        id: order.id,
        number: order.number,
        date: order.date ? new Date(order.date).toLocaleDateString('ro-RO') : new Date().toLocaleDateString('ro-RO'),
        items: order.items,
        userEmail: userEmail || (order.clientData as any)?.email,
        clientData: order.clientData as any || {},
        deliveryType: order.deliveryType || 'standard',
        courierCost: order.courierCost || 0,
      };
      if (invoiceOrder.userEmail) {
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
        setTimeout(async () => {
          try {
            const invoiceRes = await fetch(`${siteUrl}/api/send-invoice`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ order: invoiceOrder })
            });
            if (invoiceRes.ok) {
              console.log(`[ORDERS] Factura trimisă automat pentru comanda #${invoiceOrder.number || invoiceOrder.id}`);
            } else {
              console.error(`[ORDERS] Eroare la trimitere automată factură:`, await invoiceRes.text());
            }
          } catch (invoiceErr) {
            console.error('[ORDERS] Eroare la trimitere automată factură:', invoiceErr);
          }
        }, 3000);
      }
    }

    return NextResponse.json({ success: true, order });
  }
  return NextResponse.json({ error: "Date lipsă" }, { status: 400 });
}

// POST: adaugă o comandă nouă (manuală sau din checkout)
export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const order = await prisma.order.create({
      data: {
        number: data.number || undefined,
        date: data.date ? new Date(data.date) : new Date(),
        total: data.products?.reduce((sum: number, p: any) => sum + Number(p.qty) * Number(p.price) * (1 + (Number(p.tva) || 0) / 100), 0) || 0,
        items: data.items || data.products || [],
        clientData: data.client || {},
        status: data.status || "pending",
        courierCost: typeof data.courierCost === 'number' ? data.courierCost : 0,
        paymentMethod: data.paymentMethod || "transfer bancar",
        deliveryType: data.deliveryType || "standard",
        invoiceUrl: null,
        user: undefined,
        product: undefined,
      },
    });
    return NextResponse.json({ success: true, order, orderId: order.id });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
