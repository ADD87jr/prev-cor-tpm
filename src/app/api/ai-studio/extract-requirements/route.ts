import { NextRequest, NextResponse } from 'next/server';
import { callAI, callGeminiWithFile, hasAnyAIProvider } from '@/lib/ai-provider';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

const EXTRACTION_PROMPT = `Analizezi un caiet de sarcini sau document tehnic pentru un proiect de automatizare industrială.

EXTRAGE următoarele informații din document:

1. **Numele proiectului** - dacă e menționat
2. **Numele clientului/companiei** - dacă e menționat
3. **Descrierea proiectului** - rezumat în 2-3 propoziții
4. **Obiectivele** - ce trebuie să realizeze sistemul
5. **Intrări sistem** - senzori, butoane, switch-uri, semnale de intrare
6. **Ieșiri sistem** - motoare, cilindri, valve, semnale de ieșire
7. **Cerințe mecanice** - structuri, ghidaje, suporturi
8. **Cerințe electrice** - tablouri, alimentări, cablaje
9. **Cerințe pneumatice** - dacă există (cilindri, valve, compresor)
10. **Cerințe hidraulice** - dacă există (pompă, cilindri, rezervor)
11. **Tip PLC sugerat** - pe baza complexității
12. **HMI necesar** - da/nu
13. **Termene** - dacă sunt menționate
14. **Buget** - dacă e menționat
15. **Constrângeri** - spațiu, viteză, precizie, etc.

RĂSPUNDE DOAR cu JSON valid:
{
  "projectName": "string",
  "clientName": "string",
  "description": "string",
  "objectives": ["string"],
  "inputs": ["string"],
  "outputs": ["string"],
  "mechanicalNeeds": ["string"],
  "electricalNeeds": ["string"],
  "pneumaticNeeds": ["string"],
  "hydraulicNeeds": ["string"],
  "plcType": "string",
  "hmiRequired": boolean,
  "timeline": "string",
  "budget": "string",
  "constraints": ["string"]
}

Dacă o informație nu e în document, pune string gol sau array gol.`;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ success: false, error: 'Niciun fișier uploadat' }, { status: 400 });
    }

    if (!hasAnyAIProvider()) {
      return NextResponse.json({ success: false, error: 'Adaugă GEMINI_API_KEY sau GROQ_API_KEY în .env.local' }, { status: 500 });
    }

    // Read file content
    let textContent = '';
    
    if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
      textContent = await file.text();
    } else if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      // PDFs need Gemini (multimodal)
      if (!GEMINI_API_KEY) {
        return NextResponse.json({ success: false, error: 'Pentru PDF-uri e necesară cheia Gemini' }, { status: 500 });
      }
      
      const arrayBuffer = await file.arrayBuffer();
      const base64Data = Buffer.from(arrayBuffer).toString('base64');
      
      try {
        const result = await callGeminiWithFile(EXTRACTION_PROMPT, base64Data, 'application/pdf');
        
        if (!result.text) {
          return NextResponse.json({ success: false, error: result.error || 'Eroare la procesarea PDF' }, { status: 500 });
        }
        
        const jsonMatch = result.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const requirements = JSON.parse(jsonMatch[0]);
          return NextResponse.json({ success: true, requirements });
        }
      } catch (error) {
        console.error('PDF extraction error:', error);
        return NextResponse.json({ success: false, error: 'Eroare la procesarea PDF' }, { status: 500 });
      }
      
      return NextResponse.json({ success: false, error: 'Nu am găsit informații structurate' }, { status: 500 });
    } else {
      // For other file types, extract text if possible
      try {
        textContent = await file.text();
      } catch {
        return NextResponse.json({ 
          success: false, 
          error: 'Format de fișier nesuportat. Folosește PDF sau TXT.' 
        }, { status: 400 });
      }
    }

    // Process text content with AI (Gemini or Groq)
    if (textContent) {
      const result = await callAI(
        EXTRACTION_PROMPT,
        [{ role: 'user', content: `DOCUMENT:\n${textContent}` }],
        { temperature: 0.3, maxTokens: 4096 }
      );

      if (!result.text) {
        return NextResponse.json({ success: false, error: result.error || 'Eroare la procesare' }, { status: 500 });
      }
      
      console.log('Document extraction - AI provider used:', result.provider);
      
      const jsonMatch = result.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const requirements = JSON.parse(jsonMatch[0]);
          return NextResponse.json({ success: true, requirements });
        } catch {
          return NextResponse.json({ success: false, error: 'Nu am putut parsa răspunsul AI' }, { status: 500 });
        }
      }
    }

    return NextResponse.json({ success: false, error: 'Nu am găsit conținut în document' }, { status: 400 });

  } catch (error) {
    console.error('Extract requirements error:', error);
    return NextResponse.json({ success: false, error: 'Eroare la procesarea fișierului' }, { status: 500 });
  }
}
