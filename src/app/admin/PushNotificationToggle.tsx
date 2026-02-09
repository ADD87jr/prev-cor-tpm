'use client';

import { useState, useEffect } from 'react';

export default function PushNotificationToggle() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkSupport();
  }, []);

  const checkSupport = async () => {
    try {
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        setIsSupported(true);
        
        try {
          // Check if service worker is ready
          const registration = await navigator.serviceWorker.getRegistration('/sw.js');
          if (registration) {
            const subscription = await registration.pushManager.getSubscription();
            setIsSubscribed(!!subscription);
          }
        } catch (err) {
          console.error('Error checking subscription:', err);
        }
      } else {
        console.log('Push notifications not supported');
      }
    } catch (err) {
      console.error('Error in checkSupport:', err);
    }
    setLoading(false);
  };

  const subscribeToNotifications = async () => {
    setLoading(true);
    setError(null);

    try {
      // Înregistrează service worker dacă nu există
      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      // Cere permisiune
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        throw new Error('Permisiunea pentru notificări a fost refuzată');
      }

      // Subscrie la push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
        )
      });

      // Trimite subscription la server
      const response = await fetch('/api/push-subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription.toJSON())
      });

      if (!response.ok) {
        throw new Error('Eroare la salvarea abonamentului');
      }

      setIsSubscribed(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Eroare necunoscută';
      setError(message);
      console.error('Subscribe error:', err);
    } finally {
      setLoading(false);
    }
  };

  const unsubscribeFromNotifications = async () => {
    setLoading(true);
    setError(null);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Dezabonează local
        await subscription.unsubscribe();

        // Șterge de pe server
        await fetch('/api/push-subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint })
        });
      }

      setIsSubscribed(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Eroare necunoscută';
      setError(message);
      console.error('Unsubscribe error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isSupported) {
    return (
      <div className="bg-gray-100 rounded-lg p-4 text-gray-500 text-sm">
        Notificările push nu sunt suportate în acest browser.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-800">Notificări Push</h3>
          <p className="text-sm text-gray-500">
            {isSubscribed
              ? 'Primești notificări la comenzi noi'
              : 'Activează pentru a primi notificări instant'}
          </p>
        </div>
        {loading ? (
          <span className="px-4 py-2 bg-gray-200 text-gray-500 rounded">Se încarcă...</span>
        ) : (
          <button
            onClick={isSubscribed ? unsubscribeFromNotifications : subscribeToNotifications}
            className={`px-4 py-2 rounded font-medium transition-colors ${
              isSubscribed
                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isSubscribed ? '🔕 Dezactivează' : '🔔 Activează'}
          </button>
        )}
      </div>
      {error && (
        <p className="text-red-600 text-sm mt-2">{error}</p>
      )}
    </div>
  );
}

// Helper pentru convertirea cheii VAPID
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer;
}
