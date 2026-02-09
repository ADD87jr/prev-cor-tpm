import { NextRequest, NextResponse } from 'next/server';

export function proxy(request: NextRequest) {
  // Permite requestul să treacă nemodificat pentru stripe-webhook
  return NextResponse.next();
}

export const config = {
  matcher: ['/api/stripe-webhook'],
};
