import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const number = searchParams.get("number");
  const email = searchParams.get("email");

  if (!number && !email) {
    return NextResponse.json({ error: "Parametru de căutare necesar (number sau email)" }, { status: 400 });
  }

  try {
    let orders;

    if (number) {
      // Căutare după număr comandă sau ID
      orders = await prisma.order.findMany({
        where: {
          OR: [
            { number: number },
            { id: isNaN(parseInt(number)) ? undefined : parseInt(number) },
          ],
        },
        orderBy: { date: "desc" },
        take: 10,
      });
    } else if (email) {
      // Căutare după email din clientData
      const allOrders = await prisma.order.findMany({
        orderBy: { date: "desc" },
      });
      
      // Filtrare manuală pentru email din clientData (JSON field)
      orders = allOrders.filter((order) => {
        if (order.clientData && typeof order.clientData === "object") {
          const clientEmail = (order.clientData as any).email;
          return clientEmail && clientEmail.toLowerCase() === email.toLowerCase();
        }
        return false;
      }).slice(0, 10);
    }

    if (!orders || orders.length === 0) {
      return NextResponse.json({ orders: [] });
    }

    // Returnează doar informațiile necesare (fără date sensibile)
    const safeOrders = orders.map((order) => ({
      id: order.id,
      number: order.number,
      date: order.date,
      status: order.status,
      total: order.total,
      items: order.items,
      awb: order.awb,
      courierName: order.courierName,
      paymentMethod: order.paymentMethod,
      deliveryType: order.deliveryType,
    }));

    return NextResponse.json({ orders: safeOrders });
  } catch (error: any) {
    console.error("Error tracking order:", error);
    return NextResponse.json({ error: "Eroare la căutare comandă" }, { status: 500 });
  }
}
