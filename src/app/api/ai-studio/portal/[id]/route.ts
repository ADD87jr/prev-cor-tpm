import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@libsql/client';
import { isPortalFeedbackAllowed } from '@/lib/ai-studio/portalRules';

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL || '',
  authToken: process.env.TURSO_AUTH_TOKEN || '',
});

async function ensureFeedbackTable() {
  await turso.execute(`
    CREATE TABLE IF NOT EXISTS ClientFeedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      projectId INTEGER NOT NULL,
      clientName TEXT,
      feedbackType TEXT DEFAULT 'comment',
      message TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function loadAiStudioByIdOrToken(idOrToken: string) {
  const byId = await turso.execute({
    sql: `SELECT id, name, client, description, status, currentPhase, createdAt, updatedAt, requirements, technicalProposal,
                 offerNumber, offerStatus, offerVersion, shareToken
          FROM AIStudioProjects WHERE id = ? LIMIT 1`,
    args: [idOrToken],
  });
  if (byId.rows.length > 0) return byId.rows[0];

  const byToken = await turso.execute({
    sql: `SELECT id, name, client, description, status, currentPhase, createdAt, updatedAt, requirements, technicalProposal,
                 offerNumber, offerStatus, offerVersion, shareToken
          FROM AIStudioProjects WHERE shareToken = ? LIMIT 1`,
    args: [idOrToken],
  });
  return byToken.rows[0] || null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Prefer AIStudio project lookup (supports numeric id and share token)
  const aiProject = await loadAiStudioByIdOrToken(id);
  if (aiProject) {
    const projectId = Number(aiProject.id);
    let requirements: Record<string, unknown> = {};
    let technicalProposal: Record<string, unknown> = {};
    try { requirements = aiProject.requirements ? JSON.parse(String(aiProject.requirements)) : {}; } catch { requirements = {}; }
    try { technicalProposal = aiProject.technicalProposal ? JSON.parse(String(aiProject.technicalProposal)) : {}; } catch { technicalProposal = {}; }

    const bom = Array.isArray(technicalProposal.bom) ? (technicalProposal.bom as Array<Record<string, unknown>>) : [];
    const bomSummary = {
      itemCount: bom.length,
      totalValue: bom.reduce((sum, it) => sum + (Number(it.qty || 0) * Number(it.price || 0)), 0),
      currency: String((bom[0]?.currency || 'EUR')),
    };

    await ensureFeedbackTable();
    const feedbackRes = await turso.execute({
      sql: 'SELECT id, clientName, feedbackType, message, createdAt FROM ClientFeedback WHERE projectId = ? ORDER BY createdAt DESC LIMIT 30',
      args: [projectId],
    });

    return NextResponse.json({
      id: projectId,
      name: String(aiProject.name || ''),
      client: String(aiProject.client || ''),
      description: String(aiProject.description || ''),
      status: String(aiProject.offerStatus || aiProject.status || 'draft'),
      currentPhase: Number(aiProject.currentPhase) || 1,
      createdAt: String(aiProject.createdAt || ''),
      offerNumber: aiProject.offerNumber ? String(aiProject.offerNumber) : null,
      offerStatus: aiProject.offerStatus ? String(aiProject.offerStatus) : 'draft',
      offerVersion: Number(aiProject.offerVersion) || 1,
      bomSummary,
      timeline: { estimatedDays: 0, startDate: String(aiProject.createdAt || '') },
      workflow: [],
      feedback: feedbackRes.rows,
      requirements,
      technicalSummary: typeof technicalProposal.summary === 'string' ? technicalProposal.summary : '',
    });
  }

  const result = await turso.execute({
    sql: 'SELECT rowid as id, * FROM AutomationProjects WHERE rowid = ?',
    args: [id],
  });

  if (result.rows.length === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const project = result.rows[0];

  // Parse BOM for summary (no detailed items/prices for security)
  let bomSummary = { itemCount: 0, totalValue: 0, currency: 'EUR' };
  try {
    const bom = JSON.parse(String(project.bomData || '{}'));
    const items = bom.items || [];
    bomSummary = {
      itemCount: items.length,
      totalValue: items.reduce((sum: number, it: { qty?: number; price?: number }) => sum + (it.qty || 0) * (it.price || 0), 0),
      currency: 'EUR',
    };
  } catch { /* empty */ }

  // Parse timeline
  let timeline = { estimatedDays: 0, startDate: '' };
  try {
    const t = JSON.parse(String(project.timeline || '{}'));
    timeline = {
      estimatedDays: t.estimatedDays || 0,
      startDate: t.startDate || project.createdAt || '',
    };
  } catch { /* empty */ }

  // Get workflow approvals
  let workflow: Array<{ step: string; status: string; approvedBy?: string; updatedAt?: string }> = [];
  try {
    const approvals = await turso.execute({
      sql: `SELECT step, status, approvedBy, updatedAt FROM ProjectApprovals WHERE projectId = ? ORDER BY id ASC`,
      args: [id],
    });
    workflow = approvals.rows.map(r => ({
      step: String(r.step),
      status: String(r.status),
      approvedBy: r.approvedBy ? String(r.approvedBy) : undefined,
      updatedAt: r.updatedAt ? String(r.updatedAt) : undefined,
    }));
  } catch { /* table may not exist */ }

  return NextResponse.json({
    id: Number(project.id),
    name: project.name,
    client: project.client || '',
    description: project.description || '',
    status: project.status || 'draft',
    currentPhase: Number(project.currentPhase) || 0,
    createdAt: project.createdAt || '',
    bomSummary,
    timeline,
    workflow,
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const payload = await request.json() as { action?: string; clientName?: string; message?: string };
    const action = String(payload.action || 'comment');
    const clientName = String(payload.clientName || 'Client').slice(0, 200);
    const message = String(payload.message || '').trim().slice(0, 5000);

    const aiProject = await loadAiStudioByIdOrToken(id);
    if (!aiProject) {
      return NextResponse.json({ error: 'Proiect AI Studio negăsit pentru token/id' }, { status: 404 });
    }

    const projectId = Number(aiProject.id);
    if (!Number.isFinite(projectId) || projectId <= 0) {
      return NextResponse.json({ error: 'projectId invalid' }, { status: 400 });
    }

    await ensureFeedbackTable();
    const feedbackType = ['approve', 'reject', 'revision', 'comment'].includes(action) ? action : 'comment';
    const currentOfferStatus = String(aiProject.offerStatus || 'draft');
    if (!isPortalFeedbackAllowed(currentOfferStatus, feedbackType)) {
      return NextResponse.json(
        {
          error: 'Actiunea este permisa doar cand oferta este in status sent.',
          offerStatus: currentOfferStatus,
        },
        { status: 409 }
      );
    }
    const finalMessage = message || (feedbackType === 'approve' ? 'Clientul a aprobat oferta.' : feedbackType === 'reject' ? 'Clientul a respins oferta.' : 'Comentariu client.');

    await turso.execute({
      sql: `INSERT INTO ClientFeedback (projectId, clientName, feedbackType, message, createdAt)
            VALUES (?, ?, ?, ?, ?)` ,
      args: [projectId, clientName, feedbackType, finalMessage, new Date().toISOString()],
    });

    if (feedbackType === 'approve') {
      await turso.execute({
        sql: `UPDATE AIStudioProjects SET offerStatus = 'accepted', status = 'approved', updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
        args: [projectId],
      });
    } else if (feedbackType === 'reject') {
      await turso.execute({
        sql: `UPDATE AIStudioProjects SET offerStatus = 'rejected', status = 'review', updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
        args: [projectId],
      });
    } else if (feedbackType === 'revision') {
      await turso.execute({
        sql: `UPDATE AIStudioProjects SET offerStatus = 'rejected', status = 'review', updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
        args: [projectId],
      });
    }

    return NextResponse.json({ success: true, projectId, feedbackType });
  } catch (error) {
    console.error('Portal action error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
