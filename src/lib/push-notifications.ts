import webpush from 'web-push';
import { prisma } from '@/lib/prisma';

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

interface NotificationPayload {
  title: string;
  body: string;
  url?: string;
}

interface PushSub {
  id: number;
  endpoint: string;
  p256dh: string;
  auth: string;
}

export async function sendPushNotification(payload: NotificationPayload) {
  try {
    // Obține toate subscriptions active (admin)
    const subscriptions = await (prisma as any).pushSubscription.findMany({
      where: { isAdmin: true }
    }) as PushSub[];

    if (subscriptions.length === 0) {
      console.log('Nu există abonați pentru notificări push');
      return { sent: 0, failed: 0 };
    }

    const results = await Promise.allSettled(
      subscriptions.map(async (sub: PushSub) => {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
          }
        };

        try {
          await webpush.sendNotification(
            pushSubscription,
            JSON.stringify(payload)
          );
          return { success: true, endpoint: sub.endpoint };
        } catch (error: unknown) {
          // Dacă subscription e invalid, îl ștergem
          const err = error as { statusCode?: number };
          if (err.statusCode === 410 || err.statusCode === 404) {
            await (prisma as any).pushSubscription.delete({
              where: { endpoint: sub.endpoint }
            }).catch(() => {});
          }
          throw error;
        }
      })
    );

    const sent = results.filter((r: PromiseSettledResult<unknown>) => r.status === 'fulfilled').length;
    const failed = results.filter((r: PromiseSettledResult<unknown>) => r.status === 'rejected').length;

    console.log(`Push notifications: ${sent} trimise, ${failed} eșuate`);
    return { sent, failed };

  } catch (error) {
    console.error('Error sending push notifications:', error);
    return { sent: 0, failed: 0 };
  }
}

// Funcție helper pentru notificarea comenzi noi
export async function notifyNewOrder(orderNumber: string, total: number, clientName?: string) {
  return sendPushNotification({
    title: '🛒 Comandă nouă!',
    body: `Comanda ${orderNumber}${clientName ? ` de la ${clientName}` : ''} - ${total.toFixed(2)} RON`,
    url: '/admin/orders'
  });
}
