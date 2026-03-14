import { NextRequest, NextResponse } from 'next/server';
import { callAI, hasAnyAIProvider } from '@/lib/ai-provider';

const SYSTEM_PROMPT = `Ești un inginer consultant expert în automatizări industriale de la PREV-COR TPM, cu peste 20 de ani de experiență.

ROLUL TĂU: Analizezi descrierea proiectului clientului și generezi întrebări tehnice precise care te ajută să înțelegi exact ce are nevoie pentru a putea întocmi o ofertă profesională.

TIPURI DE PROIECTE PE CARE LE GESTIONEZI:
- Stații de automatizare și linii de producție
- Sisteme HVAC și BMS (Building Management Systems)
- Tablouri electrice și de automatizare
- Sisteme de control PLC (Siemens, Allen-Bradley, Schneider, etc.)
- Interfețe HMI și SCADA
- Sisteme pneumatice și hidraulice industriale
- Retrofitting și modernizare echipamente existente

INSTRUCȚIUNI:
1. Analizează descrierea primită și identifică tipul de proiect
2. Generează EXACT 6 întrebări tehnice relevante, specifice pentru acel tip de proiect
3. Întrebările trebuie să acopere aspecte critice pentru estimarea costurilor și timpilor de execuție
4. Folosește un ton profesional dar accesibil
5. Răspunde DOAR în limba română

FORMAT RĂSPUNS (JSON strict):
{
  "projectType": "tipul proiectului identificat",
  "questions": [
    {
      "id": 1,
      "category": "categoria întrebării",
      "question": "textul întrebării",
      "hint": "sugestie scurtă pentru răspuns",
      "importance": "critical|important|optional"
    }
  ]
}

CATEGORII POSIBILE: "Specificații tehnice", "Alimentare electrică", "Comunicații", "Mediu de lucru", "Dimensiuni", "Integrare", "Timeline", "Siguranță"`;

export async function POST(request: NextRequest) {
  try {
    const { description, mode } = await request.json();

    // Mod: "questions" pentru întrebări, "enhance" pentru îmbunătățire descriere
    const isEnhanceMode = mode === 'enhance';

    if (!description || description.trim().length < 5) {
      return NextResponse.json(
        { success: false, error: 'Vă rugăm să descrieți proiectul (minim câteva cuvinte).' },
        { status: 400 }
      );
    }

    if (!hasAnyAIProvider()) {
      return NextResponse.json(
        { success: false, error: 'Serviciul AI nu este disponibil momentan. Încercați mai târziu.' },
        { status: 503 }
      );
    }

    if (isEnhanceMode) {
      // Mod îmbunătățire descriere
      const enhancePrompt = `Ești un inginer consultant care ajută clienții să descrie proiectele tehnice profesional.

Primești o descriere scurtă și o transformi într-o descriere tehnică completă și profesională, păstrând ideea originală dar adăugând detalii relevante.

Descriere originală: "${description}"

Generează o descriere îmbunătățită (2-3 paragrafe) care include:
- Context și obiectivul proiectului
- Posibile cerințe tehnice deduse
- Aspecte de luat în considerare

Răspunde DOAR cu descrierea îmbunătățită, fără alte comentarii. În limba română.`;

      const result = await callAI(enhancePrompt, [
        { role: 'user', content: 'Îmbunătățește descrierea proiectului.' }
      ], { temperature: 0.7, maxTokens: 1024 });

      if (result.error || !result.text) {
        return NextResponse.json(
          { success: false, error: 'Nu s-a putut îmbunătăți descrierea.' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        mode: 'enhance',
        enhancedDescription: result.text.trim()
      });
    }

    // Mod întrebări (implicit)
    const result = await callAI(SYSTEM_PROMPT, [
      { 
        role: 'user', 
        content: `Descrierea proiectului de la client:\n\n"${description}"\n\nAnalizează și generează întrebările în format JSON.` 
      }
    ], {
      temperature: 0.5,
      maxTokens: 2048
    });

    if (result.error || !result.text) {
      return NextResponse.json(
        { success: false, error: 'Nu s-au putut genera întrebări. Încercați din nou.' },
        { status: 500 }
      );
    }

    // Parse JSON from response
    let parsed;
    try {
      // Extrage JSON din răspuns (poate fi înconjurat de markdown ```json)
      const jsonMatch = result.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found');
      }
    } catch {
      // Fallback - returnează text simplu
      return NextResponse.json({
        success: true,
        mode: 'text',
        questions: result.text.trim()
      });
    }

    return NextResponse.json({
      success: true,
      mode: 'structured',
      projectType: parsed.projectType || 'Proiect de automatizare',
      questions: parsed.questions || []
    });

  } catch (error) {
    console.error('AI Assist error:', error);
    return NextResponse.json(
      { success: false, error: 'Eroare la procesarea cererii.' },
      { status: 500 }
    );
  }
}
