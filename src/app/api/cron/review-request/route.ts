import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendReviewRequestEmail } from "@/app/utils/emailAutomation";

// Cron: trimite email review request la 3 zile după livrare
// Rulează zilnic via cron job extern (ex: Vercel Cron)
export async function GET() {
  try {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const fourDaysAgo = new Date();
    fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);

    // Caută comenzi livrate cu 3 zile în urmă (fereastra de 1 zi)
    const deliveredOrders = await prisma.order.findMany({
      where: {
        status: { in: ["livrată", "delivered"] },
        statusUpdatedAt: {
          gte: fourDaysAgo,
          lte: threeDaysAgo,
        },
      },
      include: { user: true },
    });

    let sent = 0;
    for (const order of deliveredOrders) {
      const clientData = (order.clientData as any) || {};
      const email = order.user?.email || clientData.email;
      const name = order.user?.name || clientData.name || clientData.nume || "Client";
      const orderNumber = order.number || order.id.toString();

      if (!email) continue;

      const items = ((order.items as any[]) || []).map((item: any) => ({
        name: item.name || item.productName || "Produs",
        productId: item.productId || item.id,
      }));

      try {
        await sendReviewRequestEmail(name, email, orderNumber, items);
        sent++;
      } catch (e) {
        console.error(`[CRON] Eroare review email pt comanda ${order.id}:`, e);
      }
    }

    return NextResponse.json({ success: true, emailsSent: sent, ordersChecked: deliveredOrders.length });
  } catch (error) {
    console.error("[CRON] Error in review request cron:", error);
    return NextResponse.json({ error: "Eroare la procesarea review requests" }, { status: 500 });
  }
}
