import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/app/utils/email";

function verifyCronSecret(req: NextRequest): boolean {
  const secret = req.nextUrl.searchParams.get("secret");
  return secret === (process.env.CRON_SECRET || "");
}

// GET /api/cron/price-drop-alerts?secret=...
export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Găsește reduceri de preț din ultimele 24 ore
    const recentDrops = await (prisma as any).priceHistory.findMany({
      where: {
        createdAt: { gte: oneDayAgo },
      },
    });

    // Filtrează doar scăderile reale de preț
    const priceDrops = recentDrops.filter(
      (ph: any) => ph.newPrice < ph.oldPrice
    );

    if (priceDrops.length === 0) {
      return NextResponse.json({ message: "No price drops found", sent: 0 });
    }

    // Obține toate produsele cu preț scăzut
    const droppedProductIds = [...new Set(priceDrops.map((ph: any) => ph.productId))];

    // Obține toate wishlist-urile
    const wishlists = await (prisma as any).wishlist.findMany();

    const siteUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://prevcortpm.ro";
    let sent = 0;

    for (const wishlist of wishlists) {
      const items = Array.isArray(wishlist.items) ? wishlist.items : [];
      const wishlistProductIds = items.map((item: any) => item.id);

      // Verifică dacă vreun produs din wishlist a avut scădere de preț
      const matchedDrops = priceDrops.filter((ph: any) =>
        wishlistProductIds.includes(ph.productId)
      );

      if (matchedDrops.length === 0) continue;

      const dropsList = matchedDrops
        .map((ph: any) => {
          const item = items.find((i: any) => i.id === ph.productId);
          const saving = ((ph.oldPrice - ph.newPrice) / ph.oldPrice * 100).toFixed(0);
          return `• ${item?.name || `Produs #${ph.productId}`}: <s>${ph.oldPrice} RON</s> → <b>${ph.newPrice} RON</b> (-${saving}%)`;
        })
        .join("<br>");

      try {
        await sendEmail({
          to: wishlist.email,
          subject: "Preț redus la produsele tale favorite! - PREV-COR TPM",
          text: `Salut!\n\nProduse din lista ta de favorite au acum preț redus!\n\nVezi ofertele: ${siteUrl}/shop\n\nEchipa PREV-COR TPM`,
          html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:8px;padding:24px;border:1px solid #e5e7eb;">
            <h2 style="color:#2563eb;">Reducere de preț la favoritele tale! 🎉</h2>
            <p>Salut!</p>
            <p>Produse din lista ta de favorite au acum preț mai mic:</p>
            <div style="background:#f0fdf4;border-radius:8px;padding:16px;margin:16px 0;border:1px solid #bbf7d0;">
              ${dropsList}
            </div>
            <a href="${siteUrl}/shop" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;">Vezi produsele</a>
            <p style="color:#2563eb;font-weight:600;margin-top:16px;">Echipa PREV-COR TPM</p>
          </div>`,
        });
        sent++;
      } catch (emailError) {
        console.error(`[PRICE-DROP] Failed to send to ${wishlist.email}:`, emailError);
      }
    }

    return NextResponse.json({
      message: `Found ${priceDrops.length} price drops, notified ${sent} users`,
      priceDrops: priceDrops.length,
      sent,
    });
  } catch (error) {
    console.error("[PRICE-DROP] Error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
