import { NextRequest, NextResponse } from 'next/server';
import { callAI, hasAnyAIProvider } from '@/lib/ai-provider';

const SYSTEM_PROMPT = `Ești un inginer de automatizări industriale expert la PREV-COR TPM, specializat în:
- Automatizări industriale cu PLC (Siemens, Schneider, Mitsubishi)
- Proiectare tablouri electrice
- Sisteme pneumatice și hidraulice
- Proiectare mecanică
- Interfețe HMI

ROLUL TĂU:
Ajuți clienții să definească cerințele pentru proiectele lor de automatizare.
Extragi informații tehnice din descrierile lor și le structurezi.

ÎNTREBĂRI CHEIE pe care trebuie să le afli:
1. Ce proces/mașină/sistem vrea să automatizeze?
2. Care este tact time-ul sau capacitatea dorită?
3. Ce senzori/intrări sunt necesare (optici, inductivi, de presiune, etc.)?
4. Ce actuatoare/ieșiri sunt necesare (motoare, cilindri, valve, etc.)?
5. Ce tip de PLC preferă? (sau să recomandăm noi)
6. Are nevoie de HMI/panou operator?
7. Sunt necesare sisteme pneumatice sau hidraulice?
8. Care sunt constrângerile de spațiu?
9. Care este bugetul aproximativ?
10. Care este termenul de livrare?

STIL DE COMUNICARE:
- Vorbește în română, profesional dar prietenos
- Folosește emoji-uri moderat pentru claritate
- Pune câte 2-3 întrebări pe rând, nu mai mult
- Confirmă informațiile pe care le extragi
- Oferă sugestii tehnice când e cazul

RĂSPUNSUL TĂU:
Răspunde DOAR cu un JSON valid în formatul:
{
  "message": "Mesajul tău către utilizator",
  "requirements": {
    "projectName": "nume proiect dacă menționat",
    "clientName": "nume client dacă menționat", 
    "description": "descriere scurtă a proiectului",
    "objectives": ["obiectiv 1", "obiectiv 2"],
    "constraints": ["constrângere 1"],
    "inputs": ["senzor 1", "buton 2"],
    "outputs": ["motor 1", "cilindru 2"],
    "plcType": "tip PLC sugerat",
    "hmiRequired": true/false,
    "mechanicalNeeds": ["structură", "ghidaje"],
    "electricalNeeds": ["tablou", "cabluri"],
    "pneumaticNeeds": ["cilindri", "valve"] sau [],
    "hydraulicNeeds": ["pompă", "cilindri"] sau [],
    "timeline": "termen dacă menționat",
    "budget": "buget dacă menționat"
  }
}

IMPORTANT: 
- Actualizează doar câmpurile pentru care ai informații noi
- Păstrează informațiile anterioare din currentRequirements
- Nu inventa informații - pune doar ce spune utilizatorul
- Câmpurile goale rămân "" sau []`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, currentRequirements } = body;

    if (!hasAnyAIProvider()) {
      return NextResponse.json({
        message: '⚠️ API-ul AI nu este configurat. Adaugă GEMINI_API_KEY sau GROQ_API_KEY în .env.local',
        requirements: currentRequirements,
      });
    }

    // Add context about current requirements to the last message
    const contextMessage = `
Cerințe extrase până acum:
${JSON.stringify(currentRequirements, null, 2)}

Continuă conversația și actualizează cerințele pe baza răspunsului utilizatorului.
`;

    const enhancedMessages = messages.map((msg: { role: string; content: string }, idx: number) => ({
      role: msg.role as 'user' | 'assistant',
      content: idx === messages.length - 1 && msg.role === 'user' 
        ? `${msg.content}\n\n[Context intern: ${contextMessage}]`
        : msg.content,
    }));

    const result = await callAI(SYSTEM_PROMPT, enhancedMessages, {
      temperature: 0.7,
      maxTokens: 2048,
    });

    if (!result.text) {
      return NextResponse.json({
        message: `⚠️ ${result.error || 'Eroare temporară la AI. Poți continua să descrii proiectul.'}`,
        requirements: currentRequirements,
      });
    }

    console.log('AI provider used:', result.provider);

    // Try to parse JSON from response
    try {
      const jsonMatch = result.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        // Merge with existing requirements
        const mergedRequirements = {
          ...currentRequirements,
          ...parsed.requirements,
          objectives: [...new Set([...(currentRequirements.objectives || []), ...(parsed.requirements?.objectives || [])])],
          inputs: [...new Set([...(currentRequirements.inputs || []), ...(parsed.requirements?.inputs || [])])],
          outputs: [...new Set([...(currentRequirements.outputs || []), ...(parsed.requirements?.outputs || [])])],
          mechanicalNeeds: [...new Set([...(currentRequirements.mechanicalNeeds || []), ...(parsed.requirements?.mechanicalNeeds || [])])],
          electricalNeeds: [...new Set([...(currentRequirements.electricalNeeds || []), ...(parsed.requirements?.electricalNeeds || [])])],
          pneumaticNeeds: [...new Set([...(currentRequirements.pneumaticNeeds || []), ...(parsed.requirements?.pneumaticNeeds || [])])],
          hydraulicNeeds: [...new Set([...(currentRequirements.hydraulicNeeds || []), ...(parsed.requirements?.hydraulicNeeds || [])])],
          constraints: [...new Set([...(currentRequirements.constraints || []), ...(parsed.requirements?.constraints || [])])],
        };

        return NextResponse.json({
          message: parsed.message,
          requirements: mergedRequirements,
        });
      }
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
    }

    // Fallback if JSON parsing fails
    return NextResponse.json({
      message: result.text.replace(/```json|```/g, '').trim(),
      requirements: currentRequirements,
    });

  } catch (error) {
    console.error('Intake chat error:', error);
    return NextResponse.json({
      message: '❌ Eroare de conexiune. Te rog încearcă din nou.',
      requirements: {},
    });
  }
}
