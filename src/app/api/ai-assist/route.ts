import { NextRequest, NextResponse } from 'next/server';
import { callAI, callGeminiWithFile, callOpenAIWithFile, hasAnyAIProvider } from '../../../lib/ai-provider';
import * as XLSX from 'xlsx';

export const runtime = 'nodejs';

const EMPTY_EXTRACTED = {
  projectObjective: '',
  projectDescription: '',
  currentProcess: '',
  targetProcess: '',
  acceptanceCriteria: '',
  capacityPerformance: '',
  processType: '',
  existingEquipment: '',
  sensorsActuators: '',
  plcPreference: '',
  hmiRequirement: '',
  technicalConstraints: '',
  environmentConstraints: '',
  safetyRequirements: '',
  utilitiesAvailable: '',
  integrationNeeds: '',
  deadline: '',
};

const MAX_SHEETS = 8;
const MAX_ROWS_PER_SHEET = 2500;
const MAX_TEXT_ROWS = 2500;
const MAX_AI_ROWS = 700;

function isSpreadsheetFile(file: File) {
  return (
    file.type === 'application/vnd.ms-excel' ||
    file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    /\.(xls|xlsx)$/i.test(file.name)
  );
}

function isCsvOrTextFile(file: File) {
  return file.type === 'text/csv' || file.type === 'text/plain' || /\.(csv|txt)$/i.test(file.name);
}

function rowToLine(rowIndex: number, row: unknown[]) {
  const cells = row
    .map((cell) => String(cell ?? '').replace(/\s+/g, ' ').trim())
    .filter((cell) => cell.length > 0);

  if (!cells.length) return '';
  return `R${rowIndex}: ${cells.join(' | ')}`;
}

function buildSpreadsheetRows(buffer: Buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true, dense: true });
  const allRows: string[] = [];

  for (const sheetName of workbook.SheetNames.slice(0, MAX_SHEETS)) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;

    const rows = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      raw: false,
      defval: '',
      blankrows: false,
    }) as unknown[][];

    rows.slice(0, MAX_ROWS_PER_SHEET).forEach((row, idx) => {
      const line = rowToLine(idx + 1, row);
      if (!line) return;
      allRows.push(`${sheetName} | ${line}`);
    });
  }

  return allRows;
}

function buildTextRows(content: string) {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .slice(0, MAX_TEXT_ROWS);

  return lines.map((line, index) => `R${index + 1}: ${line}`);
}

function selectRowsForAI(rows: string[]) {
  if (rows.length <= MAX_AI_ROWS) return rows;

  const keywordRegex = /\b(plc|hmi|scada|servo|sensor|actuator|encoder|termen|deadline|buget|cost|cantit|qty|model|ip\d{2}|v\b|kw\b|bar\b|mm\b|kg\b|m3\/?h|piese\/?ora|sec\b|robot|conveyor)\b/i;
  const numericRegex = /\d/;

  const selected: string[] = [];
  const seen = new Set<string>();

  const pushUnique = (line: string) => {
    if (seen.has(line) || selected.length >= MAX_AI_ROWS) return;
    seen.add(line);
    selected.push(line);
  };

  rows.slice(0, 140).forEach(pushUnique);

  for (const row of rows) {
    if (selected.length >= MAX_AI_ROWS) break;
    if (keywordRegex.test(row) || (numericRegex.test(row) && row.length < 180)) {
      pushUnique(row);
    }
  }

  for (const row of rows) {
    if (selected.length >= MAX_AI_ROWS) break;
    pushUnique(row);
  }

  return selected;
}

async function extractFromTabularContent(tabularText: string) {
  const systemPrompt = 'Ești inginer automatist senior. Extragi cerințe tehnice din tabele și texte structurate, rând cu rând.';
  const userPrompt = `Analizează conținutul de mai jos rând cu rând și extrage informații tehnice relevante pentru ofertare.

Conținut tabelar:
${tabularText}

Returnează STRICT JSON valid în forma:
{
  "projectObjective": "",
  "projectDescription": "",
  "currentProcess": "",
  "targetProcess": "",
  "acceptanceCriteria": "",
  "capacityPerformance": "",
  "processType": "",
  "existingEquipment": "",
  "sensorsActuators": "",
  "plcPreference": "",
  "hmiRequirement": "",
  "technicalConstraints": "",
  "environmentConstraints": "",
  "safetyRequirements": "",
  "utilitiesAvailable": "",
  "integrationNeeds": "",
  "deadline": ""
}

Reguli:
- Corelează valorile cu contextul industrial.
- Dacă un câmp nu apare, lasă șir gol.
- Fără markdown, fără explicații extra.`;

  const ai = await callAI(systemPrompt, [{ role: 'user', content: userPrompt }], {
    temperature: 0.1,
    maxTokens: 2200,
  });

  const parsed = ai.text ? safeParseJsonObject(ai.text) : null;
  return { parsed, source: ai.provider };
}

function safeParseJsonObject(raw: string): Record<string, unknown> | null {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function fallbackQuestions(description: string) {
  return {
    success: true,
    mode: 'structured',
    projectType: 'Proiect de automatizare',
    questions: [
      {
        id: 1,
        category: 'Proces',
        question: 'Care este procesul principal care trebuie automatizat?',
        hint: 'Descrierea fluxului tehnologic actual.',
        importance: 'critical',
      },
      {
        id: 2,
        category: 'Performanta',
        question: 'Ce capacitate / timp de ciclu țintiți?',
        hint: 'ex: piese/oră, sec/ciclu, randament.',
        importance: 'critical',
      },
      {
        id: 3,
        category: 'Echipamente',
        question: 'Ce echipamente există deja și ce trebuie adăugat?',
        hint: 'PLC, senzori, actuatoare, roboți, HMI.',
        importance: 'important',
      },
      {
        id: 4,
        category: 'Constrangeri',
        question: 'Există constrângeri de spațiu, siguranță sau mediu?',
        hint: 'IP, temperatură, praf, ATEX, norme.',
        importance: 'important',
      },
      {
        id: 5,
        category: 'Termen/Buget',
        question: 'Care sunt termenul și bugetul estimativ?',
        hint: 'Pentru planificarea soluției și ofertare.',
        importance: 'optional',
      },
    ],
    source: description ? 'fallback' : 'fallback-empty',
  };
}

async function handleJsonRequest(request: NextRequest) {
  const payload = await request.json();
  const description = String(payload?.description || '').trim();
  const mode = String(payload?.mode || 'questions');

  if (mode === 'enhance') {
    if (!description) {
      return NextResponse.json({ success: false, error: 'Descriere lipsă.' }, { status: 400 });
    }

    if (!hasAnyAIProvider()) {
      return NextResponse.json({
        success: true,
        enhancedDescription: description,
        source: 'fallback-no-provider',
      });
    }

    const systemPrompt = 'Ești inginer de automatizări industriale. Îmbunătățește descrierea proiectului clar, tehnic, concis, fără exagerări.';
    const userPrompt = `Rescrie clar, tehnic și structurat următorul brief:\n\n${description}`;

    const ai = await callAI(systemPrompt, [{ role: 'user', content: userPrompt }], {
      temperature: 0.2,
      maxTokens: 1200,
    });

    if (!ai.text) {
      return NextResponse.json({ success: true, enhancedDescription: description, source: 'fallback-empty-ai' });
    }

    return NextResponse.json({ success: true, enhancedDescription: ai.text.trim(), source: ai.provider });
  }

  if (mode === 'questions') {
    if (!description) {
      return NextResponse.json(fallbackQuestions(description));
    }

    if (!hasAnyAIProvider()) {
      return NextResponse.json(fallbackQuestions(description));
    }

    const systemPrompt = 'Ești inginer de ofertare pentru automatizări industriale. Returnează strict JSON valid.';
    const userPrompt = `Pe baza descrierii de proiect de mai jos, generează întrebări de clarificare structurate.
Returnează JSON exact cu forma:
{
  "projectType": "...",
  "questions": [
    {"id": 1, "category": "...", "question": "...", "hint": "...", "importance": "critical|important|optional"}
  ]
}

Descriere proiect:
${description}`;

    const ai = await callAI(systemPrompt, [{ role: 'user', content: userPrompt }], {
      temperature: 0.2,
      maxTokens: 1800,
    });

    const parsed = ai.text ? safeParseJsonObject(ai.text) : null;
    if (!parsed || !Array.isArray(parsed.questions)) {
      return NextResponse.json(fallbackQuestions(description));
    }

    return NextResponse.json({
      success: true,
      mode: 'structured',
      projectType: String(parsed.projectType || 'Proiect de automatizare'),
      questions: parsed.questions,
      source: ai.provider,
    });
  }

  return NextResponse.json({ success: false, error: 'Mode invalid.' }, { status: 400 });
}

async function handleFormDataRequest(request: NextRequest) {
  const formData = await request.formData();
  const mode = String(formData.get('mode') || 'extract-specs');
  const file = formData.get('file') as File | null;

  if (mode !== 'extract-specs') {
    return NextResponse.json({ success: false, error: 'Mode invalid pentru form-data.' }, { status: 400 });
  }

  if (!file) {
    return NextResponse.json({ success: false, error: 'Fișier lipsă.' }, { status: 400 });
  }

  if (file.size > 50 * 1024 * 1024) {
    return NextResponse.json({ success: false, error: 'Fișier prea mare. Max 50MB.' }, { status: 400 });
  }

  const allowed = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'image/webp',
    'text/plain',
    'text/csv',
  ];

  if (!allowed.includes(file.type)) {
    return NextResponse.json({ success: false, error: `Tip fișier neacceptat: ${file.type}` }, { status: 400 });
  }

  if (!hasAnyAIProvider()) {
    return NextResponse.json({
      success: true,
      extracted: EMPTY_EXTRACTED,
      source: 'fallback-no-provider',
    });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  if (isSpreadsheetFile(file)) {
    const allRows = buildSpreadsheetRows(buffer);
    if (!allRows.length) {
      return NextResponse.json({
        success: true,
        extracted: EMPTY_EXTRACTED,
        source: 'empty-spreadsheet',
        extractionPreview: {
          sourceType: 'spreadsheet',
          totalRows: 0,
          rows: [],
          rowsUsedForAi: 0,
        },
      });
    }

    const rowsForAI = selectRowsForAI(allRows);
    const tabularText = rowsForAI.join('\n');
    const { parsed, source } = await extractFromTabularContent(tabularText);
    if (!parsed) {
      return NextResponse.json({
        success: true,
        extracted: EMPTY_EXTRACTED,
        source: source || 'fallback-empty-ai',
        extractionPreview: {
          sourceType: 'spreadsheet',
          totalRows: allRows.length,
          rows: allRows,
          rowsUsedForAi: rowsForAI.length,
        },
      });
    }

    return NextResponse.json({
      success: true,
      extracted: parsed,
      source: source || 'spreadsheet-ai',
      extractionPreview: {
        sourceType: 'spreadsheet',
        totalRows: allRows.length,
        rows: allRows,
        rowsUsedForAi: rowsForAI.length,
      },
    });
  }

  if (isCsvOrTextFile(file)) {
    const text = buffer.toString('utf8');
    const allRows = buildTextRows(text);

    if (!allRows.length) {
      return NextResponse.json({
        success: true,
        extracted: EMPTY_EXTRACTED,
        source: 'empty-text-file',
        extractionPreview: {
          sourceType: 'text',
          totalRows: 0,
          rows: [],
          rowsUsedForAi: 0,
        },
      });
    }

    const rowsForAI = selectRowsForAI(allRows);
    const tabularText = rowsForAI.join('\n');
    const { parsed, source } = await extractFromTabularContent(tabularText);
    if (!parsed) {
      return NextResponse.json({
        success: true,
        extracted: EMPTY_EXTRACTED,
        source: source || 'fallback-empty-ai',
        extractionPreview: {
          sourceType: 'text',
          totalRows: allRows.length,
          rows: allRows,
          rowsUsedForAi: rowsForAI.length,
        },
      });
    }

    return NextResponse.json({
      success: true,
      extracted: parsed,
      source: source || 'text-ai',
      extractionPreview: {
        sourceType: 'text',
        totalRows: allRows.length,
        rows: allRows,
        rowsUsedForAi: rowsForAI.length,
      },
    });
  }

  const prompt = `Ești inginer automatist senior. Analizează documentul tehnic încărcat și extrage strict JSON cu următoarele câmpuri:
{
  "projectObjective": "",
  "projectDescription": "",
  "currentProcess": "",
  "targetProcess": "",
  "acceptanceCriteria": "",
  "capacityPerformance": "",
  "processType": "",
  "existingEquipment": "",
  "sensorsActuators": "",
  "plcPreference": "",
  "hmiRequirement": "",
  "technicalConstraints": "",
  "environmentConstraints": "",
  "safetyRequirements": "",
  "utilitiesAvailable": "",
  "integrationNeeds": "",
  "deadline": ""
}
Reguli:
- Citește integral conținutul, inclusiv liste, poze și tabele din document.
- Pentru poze: extrage text vizibil, etichete, valori și relații dintre elemente.
- Pentru tabele: parcurge rând cu rând și mapează valorile relevante.
- Răspunde doar JSON valid, în română, fără markdown.`;

  const base64 = buffer.toString('base64');

  let aiText = '';
  let source = 'none';

  try {
    const gemini = await callGeminiWithFile(prompt, base64, file.type);
    aiText = gemini.text || '';
    source = gemini.provider;
  } catch {
    aiText = '';
  }

  if (!aiText && file.type.startsWith('image/')) {
    try {
      const openai = await callOpenAIWithFile(prompt, base64, file.type);
      aiText = openai.text || '';
      source = openai.provider;
    } catch {
      aiText = '';
    }
  }

  const parsed = aiText ? safeParseJsonObject(aiText) : null;

  if (!parsed) {
    return NextResponse.json({
      success: true,
      extracted: EMPTY_EXTRACTED,
      source: source || 'fallback-empty-ai',
    });
  }

  return NextResponse.json({ success: true, extracted: parsed, source });
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      return await handleFormDataRequest(request);
    }
    return await handleJsonRequest(request);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Eroare server.',
      },
      { status: 500 }
    );
  }
}
