import { NextResponse } from 'next/server';
import Stripe from 'stripe';


let stripe: Stripe | null = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-10-29.clover',
  });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { amount, currency, email } = body;

  if (!stripe) {
    return NextResponse.json({ error: 'Stripe nu este configurat. Cheia secretă lipsește.' }, { status: 500 });
  }
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: currency || 'ron',
      receipt_email: email,
    });
    return NextResponse.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
