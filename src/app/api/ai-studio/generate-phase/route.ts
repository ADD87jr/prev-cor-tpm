import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@libsql/client';
import { callAI, hasAnyAIProvider } from '@/lib/ai-provider';

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL || '',
  authToken: process.env.TURSO_AUTH_TOKEN || '',
});

const PHASE_PROMPTS: Record<number, string> = {
  2: `Ești inginer de automatizări la PREV-COR TPM. Generează o PROPUNERE TEHNICĂ pentru acest proiect.

STRUCTURA PROPUNERII:
1. **REZUMAT EXECUTIV** - 2-3 paragrafe despre soluția propusă
2. **SOLUȚIA TEHNICĂ**
   - Arhitectura sistemului
   - Componente hardware principale
   - Tip PLC recomandat cu justificare
   - Interfață operator (HMI)
3. **LISTA COMPONENTE (BOM)**
   - Controlere
   - Senzori
   - Actuatoare
   - Componente electrice
   - Componente pneumatice/hidraulice
4. **ESTIMARE COSTURI**
   - Hardware: xxx EUR
   - Proiectare: xxx EUR
   - Programare: xxx EUR
   - Montaj: xxx EUR
   - TOTAL: xxx EUR
5. **TERMENE**
   - Proiectare: X săptămâni
   - Execuție: X săptămâni
   - Testare: X zile
6. **RISCURI ȘI MITIGĂRI**

RĂSPUNDE cu JSON:
{
  "summary": "rezumat executiv",
  "solution": {
    "architecture": "descriere arhitectură",
    "plc": "tip PLC și model",
    "hmi": "interfață operator",
    "components": ["component 1", "component 2"]
  },
  "bom": [
    {"item": "nume", "qty": 1, "unit": "buc", "price": 100, "currency": "EUR"}
  ],
  "costs": {
    "hardware": 0,
    "engineering": 0,
    "programming": 0,
    "installation": 0,
    "total": 0
  },
  "timeline": {
    "design": "X săptămâni",
    "execution": "X săptămâni",
    "testing": "X zile",
    "total": "X săptămâni"
  },
  "risks": [
    {"risk": "descriere", "mitigation": "soluție"}
  ]
}`,

  3: `Ești proiectant mecanic la PREV-COR TPM. Generează SPECIFICAȚII DE PROIECTARE MECANICĂ.

INCLUDE:
1. **STRUCTURĂ PRINCIPALĂ**
   - Cadru suport
   - Ghidaje liniare
   - Axe de mișcare
2. **COMPONENTE MECANICE**
   - Actuatoare liniare
   - Motoare și reductoare
   - Cuplaje și transmisii
3. **MATERIALE**
   - Tip material pentru fiecare componentă
   - Tratamente termice necesare
4. **TOLERANȚE ȘI AJUSTAJE**
5. **DIAGRAMA BLOC MECANICĂ** (descrisă textual)

RĂSPUNDE cu JSON:
{
  "structure": {
    "frame": "descriere cadru",
    "guides": ["ghidaj 1", "ghidaj 2"],
    "axes": ["axa X", "axa Y", "axa Z"]
  },
  "components": [
    {"name": "nume", "type": "tip", "specs": "specificații", "qty": 1}
  ],
  "materials": [
    {"component": "nume", "material": "material", "treatment": "tratament"}
  ],
  "tolerances": "specificații toleranțe",
  "blockDiagram": "descriere textuală a diagramei"
}`,

  4: `Ești inginer electric la PREV-COR TPM. Generează PROIECTUL ELECTRIC pentru tablou și instalație.

INCLUDE:
1. **TABLOU ELECTRIC**
   - Dimensiuni
   - Componentele din tablou
   - Schema de montaj
2. **ALIMENTARE**
   - Tensiune de alimentare
   - Putere instalată
   - Protecții
3. **CABLAJE**
   - Tipuri de cabluri
   - Secțiuni
   - Trasee
4. **SENZORI ȘI ACTUATOARE**
   - Lista cu adrese I/O
5. **SCHEMA ELECTRICĂ** (descriere textuală)

RĂSPUNDE cu JSON:
{
  "cabinet": {
    "dimensions": "LxHxD mm",
    "ip_rating": "IP65",
    "components": ["întrerupător", "PLC", "contactoare"]
  },
  "power": {
    "voltage": "400V AC",
    "power": "X kW",
    "protection": ["protecție 1", "protecție 2"]
  },
  "wiring": [
    {"type": "tip cablu", "section": "X mm²", "length": "X m", "purpose": "scop"}
  ],
  "io_list": [
    {"address": "I0.0", "type": "DI", "description": "senzor 1"},
    {"address": "Q0.0", "type": "DO", "description": "motor 1"}
  ],
  "schematic": "descriere schemă electrică"
}`,

  5: `Ești inginer pneumatic la PREV-COR TPM. Generează SCHEMA PNEUMATICĂ.

INCLUDE:
1. **UNITATE PREGĂTIRE AER**
   - Filtru, regulator, lubrifiant (FRL)
   - Presiune de lucru
2. **DISTRIBUITOARE**
   - Tip (3/2, 5/2, 5/3)
   - Comandă (electrică, pneumatică)
3. **CILINDRI**
   - Tip (simplu efect, dublu efect)
   - Dimensiuni (alezaj x cursă)
   - Forță teoretică
4. **TUBULATURA**
   - Diametre
   - Material
5. **SCHEMA PNEUMATICĂ** (descriere ISO)

RĂSPUNDE cu JSON:
{
  "airPreparation": {
    "frl": "tip FRL",
    "pressure": "X bar",
    "flowRate": "X l/min"
  },
  "valves": [
    {"id": "1V1", "type": "5/2", "actuation": "elektrisch", "coil": "24V DC"}
  ],
  "cylinders": [
    {"id": "1A1", "type": "dublu efect", "bore": 50, "stroke": 200, "force": "X N"}
  ],
  "tubing": {
    "material": "poliuretan",
    "diameters": ["6mm", "8mm"]
  },
  "schematic": "descriere schemă pneumatică ISO"
}`,

  6: `Ești inginer hidraulic la PREV-COR TPM. Generează SCHEMA HIDRAULICĂ.

INCLUDE:
1. **GRUP HIDRAULIC**
   - Pompă (tip, debit, presiune)
   - Rezervor
   - Răcire/filtrare
2. **DISTRIBUITOARE**
   - Tip
   - Comandă
3. **CILINDRI HIDRAULICI**
   - Dimensiuni
   - Forțe
4. **ACUMULATOARE** (dacă e cazul)
5. **SCHEMA HIDRAULICĂ** (descriere)

RĂSPUNDE cu JSON:
{
  "powerUnit": {
    "pump": {"type": "tip", "flow": "X l/min", "pressure": "X bar"},
    "tank": {"capacity": "X litri"},
    "cooling": "descriere",
    "filtration": "descriere"
  },
  "valves": [
    {"id": "1V1", "type": "tip", "size": "NG6", "actuation": "24V DC"}
  ],
  "cylinders": [
    {"id": "1A1", "bore": 100, "rod": 70, "stroke": 500, "force": "X kN"}
  ],
  "accumulators": [],
  "schematic": "descriere schemă hidraulică"
}`,

  7: `Ești programator PLC la PREV-COR TPM. Generează CODUL PLC în Structured Text (ST) și design HMI.

INCLUDE:
1. **STRUCTURA PROGRAMULUI**
   - Main (OB1)
   - Secvențe (FB)
   - Funcții ajutătoare (FC)
2. **VARIABILE**
   - Intrări (I)
   - Ieșiri (Q)
   - Memorie (M)
   - DB-uri
3. **COD STRUCTURED TEXT**
   - Inițializare
   - Secvență principală
   - Gestionare alarme
4. **ECRANE HMI**
   - Ecran principal
   - Ecran manual
   - Alarme

RĂSPUNDE cu JSON:
{
  "structure": {
    "main": "descriere OB1",
    "fbs": ["FB1 - Secvență", "FB2 - Manual"],
    "fcs": ["FC1 - Calcule"]
  },
  "variables": {
    "inputs": [{"name": "Start", "address": "I0.0", "type": "BOOL"}],
    "outputs": [{"name": "Motor1", "address": "Q0.0", "type": "BOOL"}],
    "memory": [{"name": "Step", "address": "MW0", "type": "INT"}]
  },
  "code": {
    "initialization": "// Cod ST inițializare",
    "mainSequence": "// Cod ST secvență principală",
    "alarms": "// Cod ST alarme"
  },
  "hmi": {
    "screens": [
      {"name": "Main", "elements": ["sinoptic", "start/stop", "status"]},
      {"name": "Manual", "elements": ["butoane manuale"]},
      {"name": "Alarms", "elements": ["listă alarme"]}
    ]
  }
}`,

  8: `Ești inginer de testare la PREV-COR TPM. Generează PLANUL DE TESTARE.

INCLUDE:
1. **TESTE HARDWARE**
   - Verificare cablaje
   - Test I/O
   - Test motoare
2. **TESTE SOFTWARE**
   - Test ciclu automat
   - Test moduri operare
   - Test alarme
3. **FIȘĂ DE TESTARE**
   - Pas, descriere, rezultat așteptat, OK/NOK
4. **CRITERII DE ACCEPTANȚĂ**

RĂSPUNDE cu JSON:
{
  "hardwareTests": [
    {"id": "HW1", "name": "Verificare cablaje", "procedure": "descriere", "expected": "rezultat"}
  ],
  "softwareTests": [
    {"id": "SW1", "name": "Ciclu automat", "procedure": "descriere", "expected": "rezultat"}
  ],
  "checklist": [
    {"step": 1, "description": "descriere", "expected": "rezultat", "result": ""}
  ],
  "acceptanceCriteria": ["criteriu 1", "criteriu 2"]
}`,

  9: `Ești project manager la PREV-COR TPM. Generează DOCUMENTAȚIA DE LIVRARE.

INCLUDE:
1. **PROCES VERBAL PREDARE-PRIMIRE**
2. **DOCUMENTAȚIE INCLUSĂ**
   - Scheme electrice
   - Scheme pneumatice
   - Program PLC
   - Manual operare
3. **TRAINING**
   - Durată
   - Participanți
   - Conținut
4. **GARANȚIE ȘI SUPORT**

RĂSPUNDE cu JSON:
{
  "handover": {
    "date": "data predării",
    "location": "locație",
    "participants": ["nume 1", "nume 2"]
  },
  "documentation": [
    {"type": "Manual operare", "format": "PDF", "pages": 50},
    {"type": "Scheme electrice", "format": "PDF", "sheets": 10}
  ],
  "training": {
    "duration": "X ore",
    "participants": ["operator 1", "tehnician 1"],
    "content": ["operare", "mentenanță", "troubleshooting"]
  },
  "warranty": {
    "period": "12 luni",
    "coverage": "descriere",
    "support": "email/telefon"
  }
}`
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, phaseId, requirements } = body;

    if (!hasAnyAIProvider()) {
      return NextResponse.json({ success: false, error: 'Adaugă GEMINI_API_KEY sau GROQ_API_KEY în .env.local' }, { status: 500 });
    }

    const phasePrompt = PHASE_PROMPTS[phaseId];
    if (!phasePrompt) {
      return NextResponse.json({ success: false, error: 'Fază nevalidă' }, { status: 400 });
    }

    // Build context from requirements
    const context = `
CERINȚE PROIECT:
- Nume: ${requirements.projectName || 'Nespecificat'}
- Client: ${requirements.clientName || 'Nespecificat'}
- Descriere: ${requirements.description || 'Nespecificat'}
- Obiective: ${requirements.objectives?.join(', ') || 'Nespecificate'}
- Intrări: ${requirements.inputs?.join(', ') || 'Nespecificate'}
- Ieșiri: ${requirements.outputs?.join(', ') || 'Nespecificate'}
- PLC: ${requirements.plcType || 'De stabilit'}
- HMI: ${requirements.hmiRequired ? 'Da' : 'Nu'}
- Nevoi mecanice: ${requirements.mechanicalNeeds?.join(', ') || 'Nespecificate'}
- Nevoi electrice: ${requirements.electricalNeeds?.join(', ') || 'Nespecificate'}
- Nevoi pneumatice: ${requirements.pneumaticNeeds?.join(', ') || 'Nu'}
- Nevoi hidraulice: ${requirements.hydraulicNeeds?.join(', ') || 'Nu'}
- Termen: ${requirements.timeline || 'Nespecificat'}
- Buget: ${requirements.budget || 'Nespecificat'}
`;

    const result = await callAI(phasePrompt, [{ role: 'user', content: context }], {
      temperature: 0.7,
      maxTokens: 8192,
    });

    if (!result.text) {
      return NextResponse.json({ success: false, error: result.error || 'Eroare AI' }, { status: 500 });
    }

    console.log('Phase generation - AI provider used:', result.provider);

    // Parse JSON from response
    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ success: false, error: 'Nu am putut parsa răspunsul AI' }, { status: 500 });
    }

    const phaseOutput = JSON.parse(jsonMatch[0]);

    // Map phase to database field
    const fieldMap: Record<number, string> = {
      2: 'technicalProposal',
      3: 'mechanicalDesign',
      4: 'electricalDesign',
      5: 'pneumaticDesign',
      6: 'hydraulicDesign',
      7: 'plcCode',
      8: 'testResults',
      9: 'deliveryNotes',
    };

    const field = fieldMap[phaseId];
    if (field) {
      await turso.execute({
        sql: `UPDATE AIStudioProjects SET ${field} = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
        args: [JSON.stringify(phaseOutput), projectId],
      });
    }

    return NextResponse.json({ 
      success: true, 
      phaseOutput,
      message: `Faza ${phaseId} generată cu succes`,
    });

  } catch (error) {
    console.error('Generate phase error:', error);
    return NextResponse.json({ success: false, error: 'Eroare la generare' }, { status: 500 });
  }
}
