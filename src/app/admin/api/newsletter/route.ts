import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { adminAuthMiddleware } from "@/lib/auth-middleware";

// GET - lista toți abonații
export async function GET(req: NextRequest) {
  // Protejare autentificare
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const active = searchParams.get('active');

    const where = active !== null ? { active: active === 'true' } : {};

    const subscribers = await (prisma as any).newsletter.findMany({
      where,
      orderBy: { subscribedAt: 'desc' }
    });

    return NextResponse.json(subscribers);

  } catch (error) {
    console.error('Get newsletter subscribers error:', error);
    return NextResponse.json({ error: 'Eroare la încărcare' }, { status: 500 });
  }
}

// DELETE - șterge abonat
export async function DELETE(req: NextRequest) {
  // Protejare autentificare
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;

  try {
    const { id } = await req.json();

    await (prisma as any).newsletter.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'Abonat șters' });

  } catch (error) {
    console.error('Delete subscriber error:', error);
    return NextResponse.json({ error: 'Eroare la ștergere' }, { status: 500 });
  }
}

// PATCH - toggle active
export async function PATCH(req: NextRequest) {
  // Protejare autentificare
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;

  try {
    const { id, active } = await req.json();

    await (prisma as any).newsletter.update({
      where: { id },
      data: { active }
    });

    return NextResponse.json({ message: 'Status actualizat' });

  } catch (error) {
    console.error('Update subscriber error:', error);
    return NextResponse.json({ error: 'Eroare la actualizare' }, { status: 500 });
  }
}
