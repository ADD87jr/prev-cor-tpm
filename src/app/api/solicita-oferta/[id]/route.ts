import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@libsql/client';

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL || '',
  authToken: process.env.TURSO_AUTH_TOKEN || '',
});

// GET - o singură solicitare
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const result = await turso.execute({
      sql: 'SELECT * FROM OfertaSolicitari WHERE id = ?',
      args: [id],
    });

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Solicitare negăsită' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      solicitare: result.rows[0],
    });
  } catch (error) {
    console.error('Get solicitare error:', error);
    return NextResponse.json({ success: false, error: 'Eroare la încărcare' }, { status: 500 });
  }
}

// PUT - actualizare solicitare
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    const updates: string[] = [];
    const args: (string | number | null)[] = [];

    if (body.status !== undefined) {
      updates.push('status = ?');
      args.push(body.status);
    }
    if (body.notes !== undefined) {
      updates.push('notes = ?');
      args.push(body.notes);
    }
    if (body.assignedProjectId !== undefined) {
      updates.push('assignedProjectId = ?');
      args.push(body.assignedProjectId);
    }

    if (updates.length === 0) {
      return NextResponse.json({ success: false, error: 'Nimic de actualizat' }, { status: 400 });
    }

    updates.push('updatedAt = CURRENT_TIMESTAMP');
    args.push(id);

    await turso.execute({
      sql: `UPDATE OfertaSolicitari SET ${updates.join(', ')} WHERE id = ?`,
      args,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update solicitare error:', error);
    return NextResponse.json({ success: false, error: 'Eroare la actualizare' }, { status: 500 });
  }
}

// DELETE - șterge solicitare
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    await turso.execute({
      sql: 'DELETE FROM OfertaSolicitari WHERE id = ?',
      args: [id],
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete solicitare error:', error);
    return NextResponse.json({ success: false, error: 'Eroare la ștergere' }, { status: 500 });
  }
}
