import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  // Keep maintenance mode disabled for this backup/dev environment.
  return NextResponse.json({ enabled: false });
}
