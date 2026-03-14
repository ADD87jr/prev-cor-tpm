import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/app/utils/email";

// Protecție cu secret key pentru cron jobs
function verifyCronSecret(req: NextRequest): boolean {
  const secret = req.nextUrl.searchParams.get("secret");
  return secret === (process.env.CRON_SECRET || "");
}

// GET /api/cron/abandoned-cart?secret=...
export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    // Găsește coșurile abandonate mai vechi de 1 oră, care nu au primit email
    const abandonedCarts = await (prisma as any).abandonedCart.findMany({
      where: {
        emailSent: false,
        recovered: false,
        createdAt: { lt: oneHourAgo },
      },
      take: 20,
    });

    let sent = 0;
    const siteUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://prevcortpm.ro";

    for (const cart of abandonedCarts) {
      if (!cart.email) continue;

      const items = Array.isArray(cart.items) ? cart.items : [];
      const itemsList = items
        .map((item: any) => `• ${item.name || "Produs"} x${item.quantity || 1} — ${item.price || "?"} RON`)
        .join("<br>");

      try {
        await sendEmail({
          to: cart.email,
          subject: "Ai uitat ceva în coșul de cumpărături - PREV-COR TPM",
          text: `Salut!\n\nAi produse în coș care te așteaptă. Finalizează comanda acum!\n\nTotal: ${cart.total} RON\n\nAccesează: ${siteUrl}/shop\n\nEchipa PREV-COR TPM`,
          html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:8px;padding:24px;border:1px solid #e5e7eb;">
            <h2 style="color:#2563eb;">Ai uitat ceva în coș! 🛒</h2>
            <p>Salut!</p>
            <p>Am observat că ai produse în coșul de cumpărături. Nu le lăsa să aștepte!</p>
            <div style="background:#f9fafb;border-radius:8px;padding:16px;margin:16px 0;">
              ${itemsList}
              <hr style="margin:12px 0;border:none;border-top:1px solid #e5e7eb;">
              <p style="font-weight:bold;font-size:18px;">Total: ${cart.total} RON</p>
            </div>
            <a href="${siteUrl}/shop" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;">Finalizează comanda</a>
            <p style="color:#9ca3af;font-size:12px;margin-top:20px;">Dacă ai finalizat deja comanda, poți ignora acest mesaj.</p>
            <p style="color:#2563eb;font-weight:600;margin-top:12px;">Echipa PREV-COR TPM</p>
          </div>`,
        });

        await (prisma as any).abandonedCart.update({
          where: { id: cart.id },
          data: { emailSent: true, emailSentAt: new Date() },
        });

        sent++;
      } catch (emailError) {
        console.error(`[ABANDONED-CART] Failed to send email to ${cart.email}:`, emailError);
      }
    }

    return NextResponse.json({
      message: `Processed ${abandonedCarts.length} abandoned carts, sent ${sent} emails`,
      processed: abandonedCarts.length,
      sent,
    });
  } catch (error) {
    console.error("[ABANDONED-CART] Error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
