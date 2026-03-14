import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@libsql/client';

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL || '',
  authToken: process.env.TURSO_AUTH_TOKEN || '',
});

// GET - Get project by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const result = await turso.execute({
      sql: 'SELECT * FROM AIStudioProjects WHERE id = ?',
      args: [id],
    });

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Proiect negăsit' }, { status: 404 });
    }

    const row = result.rows[0];
    const project = {
      id: row.id,
      name: row.name,
      client: row.client,
      description: row.description,
      requirements: row.requirements ? JSON.parse(row.requirements as string) : {},
      conversationHistory: row.conversationHistory ? JSON.parse(row.conversationHistory as string) : [],
      currentPhase: row.currentPhase,
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      technicalProposal: row.technicalProposal ? JSON.parse(row.technicalProposal as string) : null,
      mechanicalDesign: row.mechanicalDesign ? JSON.parse(row.mechanicalDesign as string) : null,
      electricalDesign: row.electricalDesign ? JSON.parse(row.electricalDesign as string) : null,
      pneumaticDesign: row.pneumaticDesign ? JSON.parse(row.pneumaticDesign as string) : null,
      hydraulicDesign: row.hydraulicDesign ? JSON.parse(row.hydraulicDesign as string) : null,
      plcCode: row.plcCode ? JSON.parse(row.plcCode as string) : null,
      hmiDesign: row.hmiDesign ? JSON.parse(row.hmiDesign as string) : null,
      testResults: row.testResults ? JSON.parse(row.testResults as string) : null,
      deliveryNotes: row.deliveryNotes,
    };

    return NextResponse.json({ project });
  } catch (error) {
    console.error('Error fetching project:', error);
    return NextResponse.json({ error: 'Eroare la încărcarea proiectului' }, { status: 500 });
  }
}

// PUT - Update project
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { currentPhase, status, ...data } = body;

    const updates: string[] = [];
    const args: (string | number)[] = [];

    if (currentPhase !== undefined) {
      updates.push('currentPhase = ?');
      args.push(currentPhase);
    }

    if (status !== undefined) {
      updates.push('status = ?');
      args.push(status);
    }

    // Handle JSON fields
    const jsonFields = ['requirements', 'technicalProposal', 'mechanicalDesign', 'electricalDesign', 
                        'pneumaticDesign', 'hydraulicDesign', 'plcCode', 'hmiDesign', 'testResults'];
    
    for (const field of jsonFields) {
      if (data[field] !== undefined) {
        updates.push(`${field} = ?`);
        args.push(JSON.stringify(data[field]));
      }
    }

    if (data.deliveryNotes !== undefined) {
      updates.push('deliveryNotes = ?');
      args.push(data.deliveryNotes);
    }

    updates.push('updatedAt = CURRENT_TIMESTAMP');
    args.push(id);

    await turso.execute({
      sql: `UPDATE AIStudioProjects SET ${updates.join(', ')} WHERE id = ?`,
      args,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating project:', error);
    return NextResponse.json({ error: 'Eroare la actualizarea proiectului' }, { status: 500 });
  }
}

// DELETE - Delete project
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    await turso.execute({
      sql: 'DELETE FROM AIStudioProjects WHERE id = ?',
      args: [id],
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json({ error: 'Eroare la ștergerea proiectului' }, { status: 500 });
  }
}
