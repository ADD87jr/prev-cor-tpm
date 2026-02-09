const express = require('express');
const fetch = require('node-fetch');
const bodyParser = require('body-parser');
const Stripe = require('stripe');
require('dotenv').config();

const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2022-11-15' });

app.post('/api/stripe-webhook', bodyParser.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Stripe webhook signature error:', err);
    return res.status(400).send('Webhook signature invalid');
  }

  // --- LOGICA DE PROCESARE EVENIMENT ---
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    console.log('[STRIPE-WEBHOOK][DEBUG] session.metadata (raw):', session.metadata);
    console.log('[STRIPE-WEBHOOK][DEBUG] session.metadata (stringified):', JSON.stringify(session.metadata, null, 2));
    const manualOrderId = session.metadata?.manualOrderId;
    const userEmail = session.metadata?.userEmail || session.customer_email || null;
    if (manualOrderId) {
      // Preia datele comenzii manuale din baza de date (API Next.js) cu retry dacă nu există încă
      try {
        const urlGet = `${process.env.NEXT_PUBLIC_BASE_URL}/admin/manual-orders/api?id=${manualOrderId}`;
        console.log('[STRIPE-WEBHOOK][DEBUG] Fetch manual order from:', urlGet);
        let order = null;
        let attempts = 0;
        const maxAttempts = 3;
        const delay = ms => new Promise(res => setTimeout(res, ms));
        while (attempts < maxAttempts) {
          const respGet = await fetch(urlGet);
          order = await respGet.json();
          console.log('[STRIPE-WEBHOOK][DEBUG] Răspuns API manual-orders:', JSON.stringify(order, null, 2));
          if (order && order.id && order.items && order.items.length > 0 && order.clientData && order.clientData.email) {
            break;
          }
          attempts++;
          if (attempts < maxAttempts) {
            console.warn(`[STRIPE-WEBHOOK][WARN] Comanda manuală nu e gata, retry in 300ms (incercare ${attempts+1}/${maxAttempts})`);
            await delay(300);
          }
        }
        if (!order || !order.id || !order.items || !order.clientData) {
          console.error('[STRIPE-WEBHOOK][ERROR] Nu s-a găsit comanda manuală cu id sau date lipsă:', manualOrderId);
          return res.status(404).json({ error: 'Comanda manuală nu există sau date lipsă' });
        }
        const { items, clientData, paymentMethod, deliveryType, courierCost, appliedCoupon } = order;
        // Decide endpointul în funcție de paymentMethod
        let endpoint = '/api/order-complete';
        let normalizedPaymentMethod = paymentMethod;
        if (paymentMethod && ['card', 'card online'].includes(paymentMethod.toLowerCase())) {
          endpoint = '/api/stripe-success';
          normalizedPaymentMethod = 'card';
        }
        const url = `${process.env.NEXT_PUBLIC_BASE_URL}${endpoint}`;
        const payload = {
          userEmail,
          client: clientData,
          items,
          paymentMethod: normalizedPaymentMethod,
          deliveryType,
          courierCost,
          appliedCoupon,
          manualOrderId
        };
        console.log(`[STRIPE-WEBHOOK][DEBUG] Trimit către ${endpoint}:`, url);
        console.log(`[STRIPE-WEBHOOK][DEBUG] userEmail transmis:`, userEmail);
        console.log(`[STRIPE-WEBHOOK][DEBUG] Payload trimis către ${endpoint}:`, JSON.stringify(payload, null, 2));
        const resp = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const respText = await resp.text();
        console.log(`[STRIPE-WEBHOOK][DEBUG] Răspuns ${endpoint}:`, resp.status, respText);
        try {
          const respJson = JSON.parse(respText);
          console.log(`[STRIPE-WEBHOOK][DEBUG] Răspuns ${endpoint} (JSON):`, respJson);
        } catch {}
      } catch (err) {
        console.error('[STRIPE-WEBHOOK][ERROR] Eroare la preluare sau trimitere comandă manuală:', err);
        return res.status(500).json({ error: "Eroare la procesare comandă manuală" });
      }
    } else {
      // Procesare comenzi online (fără manualOrderId)
      // Încearcă să extragă datele relevante din session.metadata și session.customer_email
      const userEmail = session.metadata?.userEmail || session.customer_email || null;
      if (!userEmail) {
        console.warn('[STRIPE-WEBHOOK][WARN] Sesiune Stripe fără email. Nu se procesează.');
        return res.json({ received: true });
      }
      // Încearcă să extragă date suplimentare din metadata dacă există (items, client, etc)
      let items = [];
      let client = {};
      let courierCost = 0;
      let deliveryType = '';
      let paymentMethod = 'card';
      try {
        if (session.metadata?.items) items = JSON.parse(session.metadata.items);
        if (session.metadata?.client) client = JSON.parse(session.metadata.client);
        if (session.metadata?.courierCost) courierCost = Number(session.metadata.courierCost);
        if (session.metadata?.deliveryType) deliveryType = session.metadata.deliveryType;
        if (session.metadata?.paymentMethod) paymentMethod = session.metadata.paymentMethod;
      } catch (e) {
        console.warn('[STRIPE-WEBHOOK][WARN] Nu s-au putut parsa toate metadata:', e);
      }
      // Dacă nu există items sau client, nu procesa
      if (!items.length || !client || !userEmail) {
        console.warn('[STRIPE-WEBHOOK][WARN] Lipsesc datele pentru comanda online.');
        return res.json({ received: true });
      }
      const payload = {
        userEmail,
        client,
        items,
        paymentMethod,
        deliveryType,
        courierCost
      };
      const url = `${process.env.NEXT_PUBLIC_BASE_URL}/api/stripe-success`;
      console.log(`[STRIPE-WEBHOOK][DEBUG] Trimit către /api/stripe-success:`, url);
      console.log(`[STRIPE-WEBHOOK][DEBUG] Payload trimis către /api/stripe-success:`, JSON.stringify(payload, null, 2));
      try {
        const resp = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const respText = await resp.text();
        console.log(`[STRIPE-WEBHOOK][DEBUG] Răspuns /api/stripe-success:`, resp.status, respText);
      } catch (err) {
        console.error('[STRIPE-WEBHOOK][ERROR] Eroare la trimitere comanda online:', err);
      }
    }
  }

  return res.json({ received: true });
});

app.listen(3001, () => console.log('Stripe webhook server running on port 3001'));
