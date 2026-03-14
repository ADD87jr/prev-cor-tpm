import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@libsql/client';

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL || '',
  authToken: process.env.TURSO_AUTH_TOKEN || '',
});

// Ensure table exists
async function ensureTable() {
  await turso.execute(`
    CREATE TABLE IF NOT EXISTS AIStudioProjects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      client TEXT,
      description TEXT,
      requirements TEXT,
      conversationHistory TEXT,
      currentPhase INTEGER DEFAULT 1,
      status TEXT DEFAULT 'intake',
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
      
      -- Phase outputs
      technicalProposal TEXT,
      mechanicalDesign TEXT,
      electricalDesign TEXT,
      pneumaticDesign TEXT,
      hydraulicDesign TEXT,
      plcCode TEXT,
      hmiDesign TEXT,
      testResults TEXT,
      deliveryNotes TEXT
    )
  `);
}

// GET - List all projects
export async function GET() {
  try {
    await ensureTable();
    
    const result = await turso.execute(`
      SELECT id, name, client, status, currentPhase, createdAt, updatedAt
      FROM AIStudioProjects
      ORDER BY updatedAt DESC
      LIMIT 20
    `);

    const projects = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      client: row.client,
      status: row.status,
      currentPhase: row.currentPhase,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));

    // Stats
    const statsResult = await turso.execute(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status != 'completed' THEN 1 ELSE 0 END) as inProgress,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
      FROM AIStudioProjects
    `);

    const stats = {
      total: Number(statsResult.rows[0]?.total || 0),
      inProgress: Number(statsResult.rows[0]?.inProgress || 0),
      completed: Number(statsResult.rows[0]?.completed || 0),
    };

    return NextResponse.json({ projects, stats });
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json({ projects: [], stats: { total: 0, inProgress: 0, completed: 0 } });
  }
}

// POST - Create new project
export async function POST(request: NextRequest) {
  try {
    await ensureTable();
    
    const body = await request.json();
    const { requirements, conversationHistory } = body;

    if (!requirements?.projectName) {
      return NextResponse.json({ success: false, error: 'Lipsește numele proiectului' }, { status: 400 });
    }

    const result = await turso.execute({
      sql: `
        INSERT INTO AIStudioProjects (name, client, description, requirements, conversationHistory, status)
        VALUES (?, ?, ?, ?, ?, 'intake')
      `,
      args: [
        requirements.projectName,
        requirements.clientName || '',
        requirements.description || '',
        JSON.stringify(requirements),
        JSON.stringify(conversationHistory || []),
      ],
    });

    return NextResponse.json({ 
      success: true, 
      projectId: Number(result.lastInsertRowid),
      message: 'Proiect creat cu succes',
    });
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json({ success: false, error: 'Eroare la crearea proiectului' }, { status: 500 });
  }
}
