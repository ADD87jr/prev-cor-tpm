import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import webpush from 'web-push';

// Configurare VAPID - doar dacă cheile sunt setate
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL || 'mailto:office@prevcortpm.ro',
    vapidPublicKey,
    vapidPrivateKey
  );
}

// POST - salvează subscription
export async function POST(req: NextRequest) {
  try {
    const subscription = await req.json();

    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return NextResponse.json(
        { error: 'Date de abonare invalide' },
        { status: 400 }
      );
    }

    // Verifică dacă există deja
    const existing = await (prisma as any).pushSubscription.findUnique({
      where: { endpoint: subscription.endpoint }
    });

    if (existing) {
      return NextResponse.json({ message: 'Deja abonat la notificări' });
    }

    // Salvează subscription
    await (prisma as any).pushSubscription.create({
      data: {
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userAgent: req.headers.get('user-agent') || null,
        isAdmin: true
      }
    });

    return NextResponse.json({ message: 'Abonat cu succes la notificări!' });

  } catch (error) {
    console.error('Push subscribe error:', error);
    return NextResponse.json(
      { error: 'Eroare la abonare' },
      { status: 500 }
    );
  }
}

// DELETE - șterge subscription
export async function DELETE(req: NextRequest) {
  try {
    const { endpoint } = await req.json();

    if (!endpoint) {
      return NextResponse.json(
        { error: 'Endpoint necesar' },
        { status: 400 }
      );
    }

    await (prisma as any).pushSubscription.delete({
      where: { endpoint }
    });

    return NextResponse.json({ message: 'Dezabonat de la notificări' });

  } catch (error) {
    console.error('Push unsubscribe error:', error);
    return NextResponse.json(
      { error: 'Eroare la dezabonare' },
      { status: 500 }
    );
  }
}
