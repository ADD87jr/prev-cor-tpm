import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getTvaPercent } from "@/lib/getTvaPercent";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-10-29.clover" });

export async function POST(req: NextRequest) {
    const body = await req.json();
    let { items, client, userEmail, paymentMethod, deliveryType, courierCost, appliedCoupon, orderId, tvaPercent, manualOrderId, language } = body;
    // Parsează dacă sunt stringuri (pentru fluxul manual)
    let parsedItems = items;
    let parsedClient = client;
    if (typeof items === 'string') {
      try { parsedItems = JSON.parse(items); } catch { parsedItems = []; }
    }
    if (typeof client === 'string') {
      try { parsedClient = JSON.parse(client); } catch { parsedClient = {}; }
    }
    // DEBUG: loghează structura itemelor primite
    console.log('[DEBUG] items primite la Stripe:', parsedItems);
  let subtotal = 0;
  // discountedPrice conține deja prețul cu ambele reduceri (produs + cupon) aplicate
  const line_items = [
    ...parsedItems.map((item: any) => {
      // Folosește discountedPrice dacă există, altfel price
      const priceWithDiscount = (typeof item.discountedPrice === 'number')
        ? item.discountedPrice
        : item.price;
      subtotal += priceWithDiscount * item.quantity;
      // Folosește nameEn dacă limba e EN
      let productName = (language === 'en' && item.nameEn) ? item.nameEn : item.name;
      // Adaugă informații variantă dacă există
      const variantDetails = [];
      if (item.variantCode) variantDetails.push(item.variantCode);
      if (item.variantInfo) variantDetails.push(item.variantInfo);
      if (variantDetails.length > 0) {
        productName = `${productName} (${variantDetails.join(' - ')})`;
      }
      return {
        price_data: {
          currency: "ron",
          product_data: { name: productName },
          unit_amount: Math.round(priceWithDiscount * 100),
        },
        quantity: item.quantity,
      };
    }),
    ...(typeof courierCost === 'number' && courierCost > 0 ? [{
      price_data: {
        currency: "ron",
        product_data: { name: language === 'en' ? "Courier cost" : "Cost curier" },
        unit_amount: Math.round(courierCost * 100),
      },
      quantity: 1,
    }] : [])
  ];
  // Discountul (produs + cupon) este deja inclus în discountedPrice, nu mai adăugăm separat
  // TVA
  let tvaValue = 0;
  // TVA default din config dacă nu este furnizat
  const configTva = await getTvaPercent();
  let tvaRate = typeof tvaPercent === 'number' ? tvaPercent : configTva;
  // TVA se calculează la subtotal + curier (discountul este deja aplicat în discountedPrice)
  tvaValue = ((subtotal + (courierCost || 0)) * tvaRate) / 100;
  if (tvaValue > 0) {
    line_items.push({
      price_data: {
        currency: "ron",
        product_data: { name: language === 'en' ? `VAT ${tvaRate}%` : `TVA ${tvaRate}%` },
        unit_amount: Math.round(tvaValue * 100),
      },
      quantity: 1,
    });
  }
  // Stripe metadata: pentru comenzi manuale trimite DOAR manualOrderId și userEmail (pentru a evita limitele Stripe)
  const orderMeta: Record<string, string> = {};
  // Always include language for translations
  orderMeta.language = language || 'ro';
  if (manualOrderId || orderId) {
    orderMeta.manualOrderId = String(manualOrderId || orderId);
    orderMeta.userEmail = userEmail || (parsedClient?.email || '');
  } else {
    // Pentru comenzi online normale, trimite toate datele necesare în metadata
    orderMeta.userEmail = userEmail || (parsedClient?.email || '');
    orderMeta.items = JSON.stringify(parsedItems);
    orderMeta.client = JSON.stringify(parsedClient);
    orderMeta.courierCost = String(courierCost ?? '');
    orderMeta.deliveryType = String(deliveryType ?? '');
    orderMeta.paymentMethod = String(paymentMethod ?? 'card');
  }
  // Folosește orderId sau manualOrderId pentru success URL
  const orderIdForUrl = orderId || manualOrderId;
  // Include session_id in success URL for fallback data retrieval
  const successUrl = orderIdForUrl
    ? `${process.env.NEXT_PUBLIC_BASE_URL}/checkout/stripe-success?orderId=${orderIdForUrl}&session_id={CHECKOUT_SESSION_ID}`
    : `${process.env.NEXT_PUBLIC_BASE_URL}/checkout/stripe-success?session_id={CHECKOUT_SESSION_ID}`;
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items,
    mode: "payment",
    customer_email: userEmail || (client?.email || ''),
    success_url: successUrl,
    cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/checkout/cancel`,
    metadata: orderMeta
  });
  return NextResponse.json({ url: session.url });
}
