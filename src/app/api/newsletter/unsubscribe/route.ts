import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/newsletter/unsubscribe?email=...&token=...
export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email");
  const token = req.nextUrl.searchParams.get("token");

  if (!email) {
    return new NextResponse(
      "<html><body style='font-family:sans-serif;text-align:center;padding:40px;'><h2>Link invalid</h2><p>Adresa de email lipsește.</p></body></html>",
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  try {
    // Verifică dacă abonatul există
    const subscriber = await (prisma as any).newsletter.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!subscriber) {
      return new NextResponse(
        "<html><body style='font-family:sans-serif;text-align:center;padding:40px;'><h2>Email negăsit</h2><p>Această adresă de email nu este abonată la newsletter.</p><a href='/'>Înapoi la site</a></body></html>",
        { headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    if (!subscriber.active) {
      return new NextResponse(
        "<html><body style='font-family:sans-serif;text-align:center;padding:40px;'><h2>Deja dezabonat</h2><p>Ești deja dezabonat de la newsletter.</p><a href='/'>Înapoi la site</a></body></html>",
        { headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    // Dezabonare
    await (prisma as any).newsletter.update({
      where: { email: email.toLowerCase().trim() },
      data: { active: false },
    });

    return new NextResponse(
      `<html><body style='font-family:sans-serif;text-align:center;padding:40px;'>
        <h2 style='color:#2563eb;'>Dezabonare reușită</h2>
        <p>Adresa <b>${email}</b> a fost dezabonată de la newsletterul PREV-COR TPM.</p>
        <p style='color:#666;margin-top:20px;'>Ne pare rău că pleci! Dacă te-ai răzgândit, te poți reabona oricând de pe site.</p>
        <a href='/' style='display:inline-block;margin-top:20px;padding:10px 20px;background:#2563eb;color:#fff;border-radius:6px;text-decoration:none;'>Înapoi la site</a>
      </body></html>`,
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  } catch (error) {
    console.error("[UNSUBSCRIBE] Error:", error);
    return new NextResponse(
      "<html><body style='font-family:sans-serif;text-align:center;padding:40px;'><h2>Eroare</h2><p>A apărut o eroare. Încercați din nou.</p><a href='/'>Înapoi la site</a></body></html>",
      { headers: { "Content-Type": "text/html; charset=utf-8" }, status: 500 }
    );
  }
}
