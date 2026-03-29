import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@libsql/client';
import { put } from '@vercel/blob';
import { callGeminiWithFile, callOpenAIWithFile } from '../../../../lib/ai-provider';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function cleanEnv(v: string | undefined) {
  return (v || '').trim().replace(/^['"]|['"]$/g, '');
}

let tursoClient: ReturnType<typeof createClient> | null = null;

function getTurso() {
  if (!tursoClient) {
    tursoClient = createClient({
      url: cleanEnv(process.env.TURSO_DATABASE_URL),
      authToken: cleanEnv(process.env.TURSO_AUTH_TOKEN),
    });
  }
  return tursoClient;
}

function getGeminiKey() {
  return (process.env.GEMINI_API_KEY || '').replace(/^["']|["']$/g, '');
}
function getOpenAIKey() {
  return (process.env.OPENAI_API_KEY || '').replace(/^["']|["']$/g, '');
}

// Asigură coloana referenceDocuments în tabel
async function ensureColumn() {
  const turso = getTurso();
  try {
    await turso.execute(`ALTER TABLE AIStudioProjects ADD COLUMN referenceDocuments TEXT`);
  } catch { /* deja există */ }
}

const DISCIPLINE_LABELS: Record<string, string> = {
  mechanical: 'Mecanic (3D/2D)',
  electrical: 'Electric',
  pneumatic: 'Pneumatic',
  hydraulic: 'Hidraulic',
  plc: 'PLC / Software',
  general: 'General',
};

function buildExtractionPrompt(discipline: string, fileName: string): string {
  const label = DISCIPLINE_LABELS[discipline] || discipline;
  return `Ești inginer senior de automatizări industriale la PREVCOR TPM. Analizezi un document tehnic de referință (${label}) pentru un proiect de automatizare.

Fișier: ${fileName}
Disciplină: ${label}

EXTRAGE și STRUCTUREAZĂ toate informațiile tehnice relevante:

1. **REZUMAT TEHNIC** (5-8 propoziții) — ce descrie documentul, echipamente, sisteme, parametri cheie
2. **COMPONENTE IDENTIFICATE** — liste cu: echipamente, modele, cantități, specificații
3. **PARAMETRI TEHNICI** — dimensiuni, presiuni, tensiuni, puteri, curse, viteze, toleranțe
4. **CERINȚE / CONSTRÂNGERI** — ce trebuie respectat în proiectul nou
5. **IMPLICAȚII FINANCIARE** — estimare complexitate și cost relativ (simplu/mediu/complex/foarte complex), justificare
6. **COMPATIBILITATE** — ce sisteme/standarde trebuie respectate, interfețe cu alte discipline

Răspunde în format JSON:
{
  "summary": "rezumat tehnic detaliat",
  "components": [{ "name": "...", "model": "...", "qty": 1, "specs": "..." }],
  "parameters": { "cheie": "valoare cu unitate" },
  "constraints": ["constrângere 1", "constrângere 2"],
  "financialComplexity": "simplu|mediu|complex|foarte-complex",
  "financialJustification": "de ce acea complexitate",
  "compatibility": ["standard/sistem 1", "standard/sistem 2"],
  "keyPoints": ["punct cheie 1 pentru ofertare", "punct cheie 2"]
}`;
}

// POST — upload fișier + extragere AI
export async function POST(request: NextRequest) {
  try {
    await ensureColumn();
    const turso = getTurso();

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const projectId = formData.get('projectId') as string | null;
    const discipline = (formData.get('discipline') as string) || 'general';

    if (!file || !projectId) {
      return NextResponse.json({ success: false, error: 'Lipsesc file sau projectId' }, { status: 400 });
    }

    // Validare tip fișier
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg', 'image/png', 'image/webp', 'image/gif',
      'text/csv', 'text/plain',
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ success: false, error: `Tip fișier neacceptat: ${file.type}` }, { status: 400 });
    }
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: 'Fișier prea mare (max 50MB)' }, { status: 400 });
    }

    // Upload la Vercel Blob
    const blobToken = cleanEnv(process.env.BLOB_READ_WRITE_TOKEN);
    if (!blobToken) {
      return NextResponse.json({ success: false, error: 'BLOB_READ_WRITE_TOKEN lipsește' }, { status: 500 });
    }

    const ext = file.name.split('.').pop() || 'bin';
    const blobName = `ai-studio/p${projectId}/${Date.now()}_${discipline}.${ext}`;
    const blob = await put(blobName, file, { access: 'public', token: blobToken });

    // Extragere AI
    let aiExtract: Record<string, unknown> = {};
    let aiRawText = '';

    try {
      const arrayBuffer = await file.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      const mimeType = file.type;
      const prompt = buildExtractionPrompt(discipline, file.name);

      let result = { text: '' };
      if (getGeminiKey()) {
        result = await callGeminiWithFile(prompt, base64, mimeType);
      }
      if (!result.text && getOpenAIKey()) {
        result = await callOpenAIWithFile(prompt, base64, mimeType);
      }

      aiRawText = result.text || '';

      if (aiRawText) {
        // Extrage JSON din răspuns
        const jsonMatch = aiRawText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            aiExtract = JSON.parse(jsonMatch[0]);
          } catch {
            aiExtract = { summary: aiRawText.substring(0, 2000) };
          }
        } else {
          aiExtract = { summary: aiRawText.substring(0, 2000) };
        }
      }
    } catch (aiErr) {
      console.error('[project-documents] AI extraction error:', aiErr);
      aiExtract = { summary: 'Extracție AI indisponibilă momentan.' };
    }

    // Citește documentele existente din DB
    const projRes = await turso.execute({
      sql: `SELECT referenceDocuments FROM AIStudioProjects WHERE id = ?`,
      args: [Number(projectId)],
    });
    const existing: Array<Record<string, unknown>> = (() => {
      try {
        const raw = projRes.rows[0]?.referenceDocuments as string | null;
        return raw ? JSON.parse(raw) : [];
      } catch { return []; }
    })();

    const newDoc = {
      id: `${Date.now()}`,
      name: file.name,
      discipline,
      url: blob.url,
      mimeType: file.type,
      uploadedAt: new Date().toISOString(),
      aiExtract,
    };

    const updated = [...existing, newDoc];
    await turso.execute({
      sql: `UPDATE AIStudioProjects SET referenceDocuments = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
      args: [JSON.stringify(updated), Number(projectId)],
    });

    return NextResponse.json({ success: true, document: newDoc });
  } catch (error) {
    console.error('[project-documents] POST error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Eroare server' },
      { status: 500 }
    );
  }
}

// DELETE — șterge un document
export async function DELETE(request: NextRequest) {
  try {
    const turso = getTurso();
    const { projectId, docId } = await request.json() as { projectId: number; docId: string };

    const projRes = await turso.execute({
      sql: `SELECT referenceDocuments FROM AIStudioProjects WHERE id = ?`,
      args: [Number(projectId)],
    });
    const existing: Array<Record<string, unknown>> = (() => {
      try {
        const raw = projRes.rows[0]?.referenceDocuments as string | null;
        return raw ? JSON.parse(raw) : [];
      } catch { return []; }
    })();

    const updated = existing.filter(d => d.id !== docId);
    await turso.execute({
      sql: `UPDATE AIStudioProjects SET referenceDocuments = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
      args: [JSON.stringify(updated), Number(projectId)],
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Eroare server' },
      { status: 500 }
    );
  }
}
