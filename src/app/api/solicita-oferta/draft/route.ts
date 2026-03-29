import { NextRequest, NextResponse } from 'next/server';
import { callAI, hasAnyAIProvider } from '../../../../lib/ai-provider';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const EMPTY_DRAFT = {
  solutionSummary: '',
  proposedArchitecture: '',
  recommendedEquipment: '',
  assumptions: '',
  technicalRisks: '',
  implementationPhases: '',
  validationPlan: '',
  openQuestions: '',
  nextSteps: '',
};

function safeParseJsonObject(raw: string): Record<string, unknown> | null {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function normalizeDraft(input: Record<string, unknown> | null) {
  if (!input) return { ...EMPTY_DRAFT };
  return {
    solutionSummary: String(input.solutionSummary || ''),
    proposedArchitecture: String(input.proposedArchitecture || ''),
    recommendedEquipment: String(input.recommendedEquipment || ''),
    assumptions: String(input.assumptions || ''),
    technicalRisks: String(input.technicalRisks || ''),
    implementationPhases: String(input.implementationPhases || ''),
    validationPlan: String(input.validationPlan || ''),
    openQuestions: String(input.openQuestions || ''),
    nextSteps: String(input.nextSteps || ''),
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const clientBrief = String(body?.clientBrief || '').trim();
    const companyName = String(body?.companyName || '').trim();

    if (!clientBrief) {
      return NextResponse.json(
        { success: false, error: 'Date client insuficiente pentru generare draft.' },
        { status: 400 }
      );
    }

    if (!hasAnyAIProvider()) {
      return NextResponse.json({
        success: true,
        draft: {
          ...EMPTY_DRAFT,
          solutionSummary: `Draft preliminar pentru ${companyName || 'client'}: analiza inițială pe baza datelor primite.`,
          openQuestions: 'Confirmați constrângerile de mediu, safety și interfețele IT/OT.',
          nextSteps: 'Revizie internă, clarificări client, estimare tehnico-comercială.',
        },
        source: 'fallback-no-provider',
      });
    }

    const systemPrompt = 'Ești inginer senior de ofertare în automatizări industriale. Generezi draft tehnic intern profesionist, concis și acționabil.';
    const userPrompt = `Pe baza datelor clientului de mai jos, generează un draft tehnic intern.

Date client:
${clientBrief}

Returnează STRICT JSON valid în forma:
{
  "solutionSummary": "",
  "proposedArchitecture": "",
  "recommendedEquipment": "",
  "assumptions": "",
  "technicalRisks": "",
  "implementationPhases": "",
  "validationPlan": "",
  "openQuestions": "",
  "nextSteps": ""
}

Reguli:
- Nu inventa date care nu apar; marchează explicit ipotezele.
- Fii orientat pe implementare și ofertare.
- Limbă română, fără markdown.`;

    const ai = await callAI(systemPrompt, [{ role: 'user', content: userPrompt }], {
      temperature: 0.15,
      maxTokens: 2600,
    });

    const parsed = ai.text ? safeParseJsonObject(ai.text) : null;
    const draft = normalizeDraft(parsed);

    return NextResponse.json({ success: true, draft, source: ai.provider || 'none' });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Eroare la generarea draftului tehnic.',
      },
      { status: 500 }
    );
  }
}
