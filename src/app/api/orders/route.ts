
import { NextResponse } from "next/server";
import { sendEmail } from "@/app/utils/email";
import { prisma } from "@/lib/prisma";
import { notifyNewOrder } from "@/lib/push-notifications";

export async function POST(req: Request) {
  try {
    const data = await req.json();
    // așteaptă: { userEmail, items, total, status? }
    if (!data.userEmail || !data.items || !data.total) {
      return NextResponse.json({ error: "Date lipsă" }, { status: 400 });
    }
    // Creează user dacă nu există
    let user = await prisma.user.findUnique({ where: { email: data.userEmail } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: data.userEmail,
          name: data.userEmail,
          password: Math.random().toString(36).slice(-8)
        }
      });
    }
    const order = await prisma.order.create({
      data: {
        user: { connect: { id: user.id } },
        items: data.items,
        total: data.total,
        date: new Date(),
        status: data.status || "nouă",
        courierCost: typeof data.courierCost === 'number' && !isNaN(data.courierCost) ? data.courierCost : Number(data.courierCost) || 0,
        paymentMethod: data.paymentMethod ? String(data.paymentMethod) : "transfer bancar",
        deliveryType: data.deliveryType ? String(data.deliveryType) : "standard"
      }
    });
    // Trimite email către admin la comandă nouă
    try {
      await sendEmail({
        to: process.env.ADMIN_EMAIL || "admin@prevcor.ro",
        subject: `Comandă nouă #${order.id}`,
        text: `A fost plasată o comandă nouă de către ${user.email} în data de ${order.date} cu totalul de ${order.total} lei.`
      });
    } catch (e) {
      // Nu bloca răspunsul dacă emailul nu merge
      console.error("Eroare trimitere email admin:", e);
    }
    // Trimite email către client cu sumar comandă
    try {
      await sendEmail({
        to: user.email,
        subject: `Comanda ta #${order.id} a fost înregistrată!`,
        text: `Salut!\n\nComanda ta a fost înregistrată cu succes.\n\nNumăr comandă: ${order.id}\nTotal: ${order.total} lei\nStatus: ${order.status}\n\nÎți mulțumim pentru comandă!\nEchipa Prevcor TPM`,
      });
    } catch (e) {
      console.error("Eroare trimitere email client:", e);
    }
    // Trimite notificare push către admin
    try {
      await notifyNewOrder(String(order.id), order.total, user.email);
    } catch (e) {
      console.error("Eroare trimitere push notification:", e);
    }
    // Creare automată DropshipOrder pentru produse legate de dropship
    try {
      const items = typeof data.items === 'string' ? JSON.parse(data.items) : data.items;
      if (Array.isArray(items)) {
        for (const item of items) {
          const productId = item.id || item.productId;
          if (productId) {
            const dropshipProduct = await prisma.dropshipProduct.findFirst({
              where: { productId: Number(productId), status: 'active' }
            });
            if (dropshipProduct) {
              const qty = item.quantity || item.qty || 1;
              const clientPrice = (item.price || item.unitPrice || dropshipProduct.yourPrice) * qty;
              const supplierPrice = dropshipProduct.supplierPrice * qty;
              await prisma.dropshipOrder.create({
                data: {
                  orderId: order.id,
                  dropshipProductId: dropshipProduct.id,
                  supplierId: dropshipProduct.supplierId,
                  quantity: qty,
                  supplierPrice: supplierPrice,
                  clientPrice: clientPrice,
                  profit: clientPrice - supplierPrice,
                  status: 'pending'
                }
              });
            }
          }
        }
      }
    } catch (e) {
      console.error("Eroare creare DropshipOrder:", e);
    }
    return NextResponse.json({ success: true, order });
  } catch (err: any) {
    console.error("Eroare la salvare comanda:", err);
    return NextResponse.json({ success: false, error: err.message || "Eroare necunoscută" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url!);
  const userEmail = searchParams.get("userEmail");
  const status = searchParams.get("status");
  const date = searchParams.get("date");
  let where: any = {};
  if (userEmail) where.user = { email: userEmail };
  if (status) where.status = status;
  if (date) where.date = new Date(date);
  const orders = await prisma.order.findMany({
    where,
    include: { user: true }
  });
  return NextResponse.json(orders);
}

// PATCH pentru modificare status
export async function PATCH(req: Request) {
  const data = await req.json();
  const { id, status, statusUpdatedAt } = data;
  if (!id || !status) return NextResponse.json({ error: "Date lipsă" }, { status: 400 });
  const updateData: any = { status };
  if (statusUpdatedAt) updateData.statusUpdatedAt = new Date(statusUpdatedAt);
  const order = await prisma.order.update({
    where: { id },
    data: updateData
  });
  return NextResponse.json({ success: true, order });
}

// DELETE pentru ștergere comandă
export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url!);
  const id = Number(searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "ID lipsă" }, { status: 400 });
  try {
    await prisma.order.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: "Comanda nu există" }, { status: 404 });
  }
}
