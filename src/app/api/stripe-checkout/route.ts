import { NextResponse } from "next/server";

import Stripe from "stripe";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-08-16" as any,
});

export async function POST(req: Request) {
  const { orderId, amount, email, items, client, paymentMethod, deliveryType, courierCost } = await req.json();
  const amountNumber = Number(amount);
  try {
    // Stripe v19: folosim PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amountNumber * 100),
      currency: "ron",
      receipt_email: email,
      description: `Plată comandă #${orderId}`,
      metadata: {
        orderId,
        items: items ? JSON.stringify(items) : null,
        client: client ? JSON.stringify(client) : null,
        paymentMethod: paymentMethod || '',
        deliveryType: deliveryType || '',
        courierCost: courierCost !== undefined ? String(courierCost) : null,
        userEmail: email || '',
      },
    });
    // Returnăm client_secret pentru frontend
    return NextResponse.json({ clientSecret: paymentIntent.client_secret });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
