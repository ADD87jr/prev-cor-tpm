import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/app/utils/email';
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { checkHoneypot } from "@/lib/honeypot";

// POST - abonare la newsletter
export async function POST(req: NextRequest) {
  // Rate limit: max 10 abonări pe oră per IP
  const ip = getClientIp(req);
  const rateLimitError = checkRateLimit(req, `newsletter:${ip}`, 10, 60 * 60 * 1000);
  if (rateLimitError) return rateLimitError;

  try {
    const data = await req.json();

    // Honeypot check
    const honeypotCheck = checkHoneypot(data);
    if (honeypotCheck.isBot) {
      return NextResponse.json({ message: 'Te-ai abonat cu succes!' }, { status: 200 });
    }

    const { email, name, source } = data;

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Adresa de email este invalidă' },
        { status: 400 }
      );
    }

    // Verifică dacă există deja
    const existing = await (prisma as any).newsletter.findUnique({
      where: { email: email.toLowerCase().trim() }
    });

    if (existing) {
      if (existing.active) {
        return NextResponse.json(
          { message: 'Ești deja abonat la newsletter!' },
          { status: 200 }
        );
      } else {
        // Reactivează abonamentul
        await (prisma as any).newsletter.update({
          where: { email: email.toLowerCase().trim() },
          data: { active: true, subscribedAt: new Date() }
        });
        return NextResponse.json(
          { message: 'Te-am reabonat cu succes!' },
          { status: 200 }
        );
      }
    }


    // Creează abonat nou
    await (prisma as any).newsletter.create({
      data: {
        email: email.toLowerCase().trim(),
        name: name || null,
        source: source || 'footer',
        active: true
      }
    });

    // Trimite email de bun venit
    try {
      const siteUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://prevcortpm.ro';
      const unsubscribeUrl = `${siteUrl}/api/newsletter/unsubscribe?email=${encodeURIComponent(email.toLowerCase().trim())}`;
      await sendEmail({
        to: email,
        subject: 'Bun venit la newsletterul PREV-COR TPM!',
        text: `Salut${name ? ' ' + name : ''}!\n\nÎți mulțumim că te-ai abonat la newsletterul nostru. Vei primi periodic noutăți, oferte și informații utile.\n\nDacă nu ai cerut această abonare, poți ignora acest mesaj.\n\nPentru dezabonare: ${unsubscribeUrl}\n\nEchipa PREV-COR TPM`,
        html: `<div style='font-family:sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:8px;padding:24px;border:1px solid #e5e7eb;'><h2 style='color:#2563eb;'>Bun venit la newsletterul PREV-COR TPM!</h2><p>Salut${name ? ' <b>' + name + '</b>' : ''}!<br><br>Îți mulțumim că te-ai abonat la newsletterul nostru.<br>Vei primi periodic noutăți, oferte și informații utile.<br><br>Dacă nu ai cerut această abonare, poți ignora acest mesaj.<br><br><span style='color:#2563eb;font-weight:600;'>Echipa PREV-COR TPM</span></p><hr style='margin:20px 0;border:none;border-top:1px solid #e5e7eb;'/><p style='font-size:12px;color:#9ca3af;text-align:center;'>Nu mai dorești să primești emailuri? <a href='${unsubscribeUrl}' style='color:#6b7280;text-decoration:underline;'>Dezabonează-te aici</a></p></div>`
      });
    } catch (e) {
      console.error('[NEWSLETTER] Eroare la trimitere email confirmare:', e);
    }

    return NextResponse.json(
      { message: 'Te-ai abonat cu succes la newsletter!' },
      { status: 201 }
    );

  } catch (error) {
    console.error('Newsletter subscribe error:', error);
    return NextResponse.json(
      { error: 'Eroare la abonare' },
      { status: 500 }
    );
  }
}

// DELETE - dezabonare
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { error: 'Email necesar pentru dezabonare' },
        { status: 400 }
      );
    }

    await (prisma as any).newsletter.update({
      where: { email: email.toLowerCase().trim() },
      data: { active: false }
    });

    return NextResponse.json({ message: 'Te-ai dezabonat cu succes' });

  } catch (error) {
    console.error('Newsletter unsubscribe error:', error);
    return NextResponse.json(
      { error: 'Eroare la dezabonare' },
      { status: 500 }
    );
  }
}
