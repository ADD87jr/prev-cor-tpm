'use client';

import { useEffect, useMemo, useState } from 'react';
import jsPDF from 'jspdf';

interface Solicitare {
  id: number;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  projectDescription: string;
  capacityPerformance: string;
  deadline: string;
  budgetRange: string;
  budgetCustom: string;
  specificationFileName: string;
  attachments: string;
  status: string;
  notes: string;
  technicalDraft: string;
  createdAt: string;
}

interface TechnicalDraft {
  solutionSummary: string;
  proposedArchitecture: string;
  recommendedEquipment: string;
  assumptions: string;
  technicalRisks: string;
  implementationPhases: string;
  validationPlan: string;
  openQuestions: string;
  nextSteps: string;
}

type RequirementSource = 'formular' | 'caiet' | 'inferat';

interface RequirementItem {
  value: string;
  source: RequirementSource;
}

interface StructuredRequirements {
  objectives: RequirementItem[];
  constraints: RequirementItem[];
  inputs: RequirementItem[];
  outputs: RequirementItem[];
  acceptanceCriteria: RequirementItem[];
  score: number;
  total: number;
  missingCritical: string[];
}

const EMPTY_DRAFT: TechnicalDraft = {
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

function parseTechnicalDraft(raw: string): TechnicalDraft {
  if (!raw) return { ...EMPTY_DRAFT };
  try {
    const parsed = JSON.parse(raw) as Partial<TechnicalDraft>;
    return {
      solutionSummary: String(parsed.solutionSummary || ''),
      proposedArchitecture: String(parsed.proposedArchitecture || ''),
      recommendedEquipment: String(parsed.recommendedEquipment || ''),
      assumptions: String(parsed.assumptions || ''),
      technicalRisks: String(parsed.technicalRisks || ''),
      implementationPhases: String(parsed.implementationPhases || ''),
      validationPlan: String(parsed.validationPlan || ''),
      openQuestions: String(parsed.openQuestions || ''),
      nextSteps: String(parsed.nextSteps || ''),
    };
  } catch {
    return { ...EMPTY_DRAFT };
  }
}

function parseClientField(description: string, label: string) {
  const prefix = `${label}:`;
  const line = description
    .split('\n')
    .map((item) => item.trim())
    .find((item) => item.startsWith(prefix));

  if (!line) return '';
  return line.slice(prefix.length).trim();
}

function splitToItems(raw: string): string[] {
  return raw
    .split(/\n|;|\||,/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

function uniqueItems(values: string[]): string[] {
  return Array.from(new Set(values.map((item) => item.trim()).filter(Boolean)));
}

function sourceLabel(source: RequirementSource): string {
  if (source === 'formular') return 'Formular client';
  if (source === 'caiet') return 'Caiet + descriere';
  return 'Inferat AI';
}

export default function AdminSolicitariPage() {
  const [solicitari, setSolicitari] = useState<Solicitare[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [draft, setDraft] = useState<TechnicalDraft>({ ...EMPTY_DRAFT });
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('new');
  const [saveState, setSaveState] = useState('');
  const [generatingDraft, setGeneratingDraft] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isAutosaving, setIsAutosaving] = useState(false);
  const [autosaveInfo, setAutosaveInfo] = useState('');

  const selected = useMemo(
    () => solicitari.find((item) => item.id === selectedId) || null,
    [solicitari, selectedId]
  );

  const technicalReadiness = useMemo(() => {
    if (!selected) return { score: 0, total: 7, missing: [] as string[] };

    const entries = [
      { label: 'Obiectiv proiect', value: parseClientField(selected.projectDescription, 'Obiectiv proiect') },
      { label: 'Proces actual', value: parseClientField(selected.projectDescription, 'Proces actual') },
      { label: 'Proces țintă', value: parseClientField(selected.projectDescription, 'Proces țintă') },
      { label: 'Capacitate / performanță', value: selected.capacityPerformance || parseClientField(selected.projectDescription, 'Capacitate / performanță țintă') },
      {
        label: 'Constrângeri tehnice / mediu / safety',
        value:
          parseClientField(selected.projectDescription, 'Constrângeri tehnice') ||
          parseClientField(selected.projectDescription, 'Constrângeri de mediu') ||
          parseClientField(selected.projectDescription, 'Cerințe de safety'),
      },
      { label: 'Termen dorit', value: selected.deadline },
      { label: 'Buget orientativ', value: selected.budgetRange || selected.budgetCustom },
    ];

    const score = entries.filter((entry) => Boolean(entry.value?.trim())).length;
    const missing = entries.filter((entry) => !entry.value?.trim()).map((entry) => entry.label);

    return { score, total: entries.length, missing };
  }, [selected]);

  const structuredRequirements = useMemo<StructuredRequirements>(() => {
    if (!selected) {
      return {
        objectives: [],
        constraints: [],
        inputs: [],
        outputs: [],
        acceptanceCriteria: [],
        score: 0,
        total: 8,
        missingCritical: [],
      };
    }

    const description = selected.projectDescription || '';
    const hasSpec = Boolean(selected.specificationFileName?.trim());
    const descLines = description
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    const objectiveField = parseClientField(description, 'Obiectiv proiect');
    const targetProcessField = parseClientField(description, 'Proces țintă');
    const constraintsField = [
      parseClientField(description, 'Constrângeri tehnice'),
      parseClientField(description, 'Constrângeri de mediu'),
      parseClientField(description, 'Cerințe de safety'),
      parseClientField(description, 'Utilități disponibile'),
      parseClientField(description, 'Integrare IT/OT necesară'),
    ].join('; ');
    const acceptanceField = parseClientField(description, 'Criterii de acceptanță (FAT/SAT/KPI)');

    const inferredInputs = descLines.filter((line) => /intr[aă]ri|input|senzor|semnal/i.test(line));
    const inferredOutputs = descLines.filter((line) => /ie[sș]iri|output|actuator|produs|capacitate/i.test(line));

    const objectivesRaw = uniqueItems([
      ...splitToItems(objectiveField),
      ...splitToItems(targetProcessField),
    ]);
    const constraintsRaw = uniqueItems(splitToItems(constraintsField));
    const acceptanceRaw = uniqueItems(splitToItems(acceptanceField));
    const inputsRaw = uniqueItems(inferredInputs.flatMap(splitToItems));
    const outputsRaw = uniqueItems(inferredOutputs.flatMap(splitToItems));

    const sourceFor = (explicit: boolean): RequirementSource => {
      if (explicit) return 'formular';
      if (hasSpec) return 'caiet';
      return 'inferat';
    };

    const objectives = objectivesRaw.map((value) => ({ value, source: sourceFor(Boolean(objectiveField || targetProcessField)) }));
    const constraints = constraintsRaw.map((value) => ({ value, source: sourceFor(Boolean(constraintsField)) }));
    const acceptanceCriteria = acceptanceRaw.map((value) => ({ value, source: sourceFor(Boolean(acceptanceField)) }));
    const inputs = inputsRaw.map((value) => ({ value, source: sourceFor(false) }));
    const outputs = outputsRaw.map((value) => ({ value, source: sourceFor(false) }));

    const scoreChecks = [
      objectives.length > 0,
      constraints.length > 0,
      acceptanceCriteria.length > 0,
      inputs.length > 0,
      outputs.length > 0,
      Boolean(selected.capacityPerformance?.trim()),
      Boolean(selected.deadline?.trim()),
      Boolean((selected.budgetRange || selected.budgetCustom || '').trim()),
    ];

    const missingCritical: string[] = [];
    if (!objectives.length) missingCritical.push('Obiective proiect');
    if (!constraints.length) missingCritical.push('Constrângeri tehnice / safety / mediu');
    if (!acceptanceCriteria.length) missingCritical.push('Criterii de acceptanță FAT/SAT/KPI');
    if (!inputs.length) missingCritical.push('Intrări (semnale/materiale)');
    if (!outputs.length) missingCritical.push('Ieșiri (acțiuni/produse)');

    return {
      objectives,
      constraints,
      inputs,
      outputs,
      acceptanceCriteria,
      score: scoreChecks.filter(Boolean).length,
      total: scoreChecks.length,
      missingCritical,
    };
  }, [selected]);

  const clarificationQuestions = useMemo(() => {
    if (!selected) return [] as string[];

    const questions: string[] = [];
    if (!structuredRequirements.objectives.length) {
      questions.push('Care sunt obiectivele măsurabile ale proiectului (ex: OEE, scrap, timp ciclu)?');
    }
    if (!structuredRequirements.inputs.length) {
      questions.push('Ce intrări exacte are sistemul (senzori, semnale, materiale), cu tip și cantitate?');
    }
    if (!structuredRequirements.outputs.length) {
      questions.push('Ce ieșiri/funcții trebuie să livreze sistemul (actuatori, acțiuni, capacitate)?');
    }
    if (!structuredRequirements.acceptanceCriteria.length) {
      questions.push('Care sunt criteriile de acceptanță la FAT/SAT și KPI-urile minime?');
    }
    if (!parseClientField(selected.projectDescription, 'Integrare IT/OT necesară')) {
      questions.push('Există integrare necesară cu ERP/MES/SCADA/DB? Dacă da, ce interfețe/protocoale?');
    }
    if (!parseClientField(selected.projectDescription, 'Utilități disponibile')) {
      questions.push('Ce utilități sunt disponibile în locație (alimentare electrică, aer comprimat, rețea)?');
    }

    return questions;
  }, [selected, structuredRequirements]);

  const loadSolicitari = async () => {
    setLoading(true);
    setError('');
    setSaveState('');

    try {
      const response = await fetch('/api/solicita-oferta');
      const data = await response.json();
      if (!data.success) {
        setError(data.error || 'Nu am putut încărca solicitările.');
        return;
      }

      const rows = (data.solicitari || []) as Solicitare[];
      setSolicitari(rows);

      if (!rows.length) {
        setSelectedId(null);
        return;
      }

      const first = rows[0];
      setSelectedId(first.id);
      setDraft(parseTechnicalDraft(String(first.technicalDraft || '')));
      setNotes(String(first.notes || ''));
      setStatus(String(first.status || 'new'));
      setHasUnsavedChanges(false);
      setAutosaveInfo('');
    } catch {
      setError('Eroare de conexiune la încărcarea solicitărilor.');
    } finally {
      setLoading(false);
    }
  };

  const selectSolicitare = (row: Solicitare) => {
    setSelectedId(row.id);
    setDraft(parseTechnicalDraft(String(row.technicalDraft || '')));
    setNotes(String(row.notes || ''));
    setStatus(String(row.status || 'new'));
    setSaveState('');
    setHasUnsavedChanges(false);
    setAutosaveInfo('');
  };

  const updateDraftField = (field: keyof TechnicalDraft, value: string) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
    setSaveState('');
  };

  const updateStatus = (value: string) => {
    setStatus(value);
    setHasUnsavedChanges(true);
    setSaveState('');
  };

  const updateNotes = (value: string) => {
    setNotes(value);
    setHasUnsavedChanges(true);
    setSaveState('');
  };

  const persistDraft = async (mode: 'manual' | 'auto') => {
    if (!selected) return;

    if ((status === 'draft-ready' || status === 'sent') && structuredRequirements.missingCritical.length > 0) {
      const msg = `Statusul ${status} este blocat. Completați: ${structuredRequirements.missingCritical.join(', ')}`;
      if (mode === 'manual') {
        setSaveState(msg);
      } else {
        setAutosaveInfo(msg);
      }
      return;
    }

    if (mode === 'manual') {
      setSaveState('Se salvează...');
    } else {
      setIsAutosaving(true);
    }

    try {
      const response = await fetch('/api/solicita-oferta', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selected.id,
          status,
          notes,
          technicalDraft: draft,
        }),
      });

      const data = await response.json();
      if (!data.success) {
        if (mode === 'manual') {
          setSaveState(data.error || 'Eroare la salvare.');
        } else {
          setAutosaveInfo(data.error || 'Eroare la autosave.');
        }
        return;
      }

      const now = new Date().toLocaleTimeString('ro-RO');
      setSolicitari((prev) =>
        prev.map((item) =>
          item.id === selected.id
            ? {
                ...item,
                status,
                notes,
                technicalDraft: JSON.stringify(draft),
              }
            : item
        )
      );

      setHasUnsavedChanges(false);
      if (mode === 'manual') {
        setSaveState('Draft tehnic salvat.');
      }
      setAutosaveInfo(`Autosave: ${now}`);
    } catch {
      if (mode === 'manual') {
        setSaveState('Eroare de conexiune la salvare.');
      } else {
        setAutosaveInfo('Eroare de conexiune la autosave.');
      }
    } finally {
      if (mode === 'auto') {
        setIsAutosaving(false);
      }
    }
  };

  const saveDraft = async () => {
    await persistDraft('manual');
  };

  const handleBlurSave = () => {
    if (hasUnsavedChanges && !isAutosaving) {
      persistDraft('auto');
    }
  };

  const appendClarificationsToDraft = () => {
    if (!clarificationQuestions.length) return;
    const merged = uniqueItems([
      ...splitToItems(draft.openQuestions),
      ...clarificationQuestions,
    ]).join('\n');

    setDraft((prev) => ({ ...prev, openQuestions: merged }));
    setHasUnsavedChanges(true);
    setSaveState('Întrebările de clarificare au fost adăugate în draft.');
  };

  const draftBadge = useMemo(() => {
    if (isAutosaving) return { label: 'Se salvează...', color: '#1d4ed8', bg: '#dbeafe' };
    if (hasUnsavedChanges) return { label: 'Nesalvat', color: '#92400e', bg: '#fef3c7' };
    if (saveState.startsWith('Eroare') || autosaveInfo.startsWith('Eroare'))
      return { label: 'Eroare salvare', color: '#b91c1c', bg: '#fee2e2' };
    if (saveState === 'Draft tehnic salvat.' || autosaveInfo.startsWith('Autosave:'))
      return { label: 'Salvat ✓', color: '#065f46', bg: '#d1fae5' };
    return null;
  }, [isAutosaving, hasUnsavedChanges, saveState, autosaveInfo]);

  const buildClientBrief = (row: Solicitare) => {
    return [
      `Companie: ${row.companyName}`,
      `Contact: ${row.contactPerson}`,
      `Email: ${row.email}`,
      `Telefon: ${row.phone}`,
      `Termen: ${row.deadline || '-'}`,
      `Buget: ${row.budgetRange || row.budgetCustom || '-'}`,
      `Caiet: ${row.specificationFileName || '-'}`,
      `Capacitate: ${row.capacityPerformance || '-'}`,
      '',
      'Descriere client:',
      row.projectDescription || '-',
    ].join('\n');
  };

  const generateDraftWithAI = async () => {
    if (!selected) return;

    setGeneratingDraft(true);
    setSaveState('Generez draft tehnic AI...');

    try {
      const response = await fetch('/api/solicita-oferta/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: selected.companyName,
          clientBrief: buildClientBrief(selected),
        }),
      });

      const data = await response.json();
      if (!data.success || !data.draft) {
        setSaveState(data.error || 'Nu am putut genera draftul AI.');
        return;
      }

      setDraft({
        solutionSummary: String(data.draft.solutionSummary || ''),
        proposedArchitecture: String(data.draft.proposedArchitecture || ''),
        recommendedEquipment: String(data.draft.recommendedEquipment || ''),
        assumptions: String(data.draft.assumptions || ''),
        technicalRisks: String(data.draft.technicalRisks || ''),
        implementationPhases: String(data.draft.implementationPhases || ''),
        validationPlan: String(data.draft.validationPlan || ''),
        openQuestions: String(data.draft.openQuestions || ''),
        nextSteps: String(data.draft.nextSteps || ''),
      });

      setSaveState(`Draft AI generat (${String(data.source || 'none')}). Verificați și salvați.`);
    } catch {
      setSaveState('Eroare de conexiune la generarea draftului AI.');
    } finally {
      setGeneratingDraft(false);
    }
  };

  const exportTechnicalPdf = () => {
    if (!selected) return;

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageWidth = 210;
    const pageHeight = 297;
    const left = 12;
    const maxWidth = 186;
    let cursorY = 32;

    const initPage = () => {
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, pageWidth, 18, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('PREV-COR TPM - Technical Draft Intern', left, 11.5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text('office@prevcortpm.ro', pageWidth - 58, 11.5);
      doc.setTextColor(17, 24, 39);
      cursorY = 28;
    };

    initPage();

    const addSection = (title: string, content: string) => {
      const safeTitle = title || 'Sectiune';
      const safeContent = (content || '-').replace(/\t/g, '  ');
      const lines = doc.splitTextToSize(safeContent, maxWidth);

      if (cursorY > pageHeight - 18) {
        doc.addPage();
        initPage();
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(safeTitle, left, cursorY);
      cursorY += 5;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      lines.forEach((line: string) => {
        if (cursorY > pageHeight - 10) {
          doc.addPage();
          initPage();
        }
        doc.text(line, left, cursorY);
        cursorY += 4.5;
      });

      cursorY += 3;
    };

    addSection(
      'Meta solicitare',
      [
        `Solicitare: #${selected.id}`,
        `Companie: ${selected.companyName}`,
        `Contact: ${selected.contactPerson} (${selected.email}, ${selected.phone})`,
        `Status intern: ${status}`,
        `Data export: ${new Date().toLocaleString('ro-RO')}`,
      ].join('\n')
    );
    addSection('Date Client', buildClientBrief(selected));
    addSection('Rezumat solutie tehnica', draft.solutionSummary);
    addSection('Arhitectura propusa', draft.proposedArchitecture);
    addSection('Echipamente recomandate', draft.recommendedEquipment);
    addSection('Ipoteze', draft.assumptions);
    addSection('Riscuri tehnice', draft.technicalRisks);
    addSection('Fazare implementare', draft.implementationPhases);
    addSection('Plan validare FAT/SAT', draft.validationPlan);
    addSection('Intrebari deschise', draft.openQuestions);
    addSection('Pasi urmatori', draft.nextSteps);

    // Bloc semnatura si aprobare
    if (cursorY > pageHeight - 60) {
      doc.addPage();
      initPage();
    }
    cursorY += 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(17, 24, 39);
    doc.text('Semnaturi si aprobare', left, cursorY);
    cursorY += 8;

    const colW = 60;
    const gutter = 3;
    const colX = [left, left + colW + gutter, left + (colW + gutter) * 2];
    const sigLabels = ['Elaborat (PREV-COR TPM)', 'Verificat (Manager tehnic)', 'Aprobat (Client)'];
    sigLabels.forEach((label, i) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(17, 24, 39);
      doc.text(label, colX[i], cursorY);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      doc.text('Nume: ____________________', colX[i], cursorY + 9);
      doc.text('Data: ________________', colX[i], cursorY + 17);
      doc.text('Semnatura:', colX[i], cursorY + 26);
      doc.setDrawColor(180, 180, 180);
      doc.line(colX[i], cursorY + 40, colX[i] + colW - 2, cursorY + 40);
    });
    cursorY += 50;

    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i += 1) {
      doc.setPage(i);
      doc.setDrawColor(226, 232, 240);
      doc.line(left, pageHeight - 12, pageWidth - left, pageHeight - 12);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(`Pagina ${i}/${pageCount}`, pageWidth - 30, pageHeight - 7);
      doc.text('Document intern PREV-COR TPM', left, pageHeight - 7);
    }

    doc.save(`technical-draft-${selected.id}.pdf`);
  };

  useEffect(() => {
    if (!selected || !hasUnsavedChanges || generatingDraft) return;

    const timer = setTimeout(() => {
      persistDraft('auto');
    }, 1200);

    return () => clearTimeout(timer);
  }, [selected, draft, notes, status, hasUnsavedChanges, generatingDraft]);

  useEffect(() => {
    loadSolicitari();
  }, []);

  return (
    <main style={{ padding: 20, minHeight: '100vh', background: '#f4f7fb' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h1 style={{ margin: 0, color: '#0f172a' }}>Admin - Solicitări Ofertă</h1>
            <p style={{ margin: '6px 0 0', color: '#475569' }}>
              Date client + Draft tehnic intern pentru conturarea soluției finale.
            </p>
          </div>
          <button
            type="button"
            onClick={loadSolicitari}
            style={{ border: '1px solid #cbd5e1', borderRadius: 10, padding: '8px 12px', fontWeight: 700, cursor: 'pointer' }}
          >
            {loading ? 'Se încarcă...' : 'Reîncarcă'}
          </button>
        </header>

        {error && (
          <div style={{ marginBottom: 12, background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: 10, padding: 10 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 14 }}>
          <aside style={{ background: '#fff', border: '1px solid #dbe3ef', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: 12, borderBottom: '1px solid #e2e8f0', fontWeight: 800, color: '#1e293b' }}>
              Solicitări ({solicitari.length})
            </div>
            <div style={{ maxHeight: '75vh', overflow: 'auto' }}>
              {solicitari.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => selectSolicitare(row)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    border: 0,
                    borderBottom: '1px solid #edf2f7',
                    padding: 12,
                    background: selectedId === row.id ? '#ecf2ff' : '#fff',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontWeight: 800, color: '#1e293b' }}>#{row.id} - {row.companyName}</div>
                  <div style={{ color: '#475569', fontSize: 13 }}>{row.contactPerson}</div>
                  <div style={{ color: '#64748b', fontSize: 12 }}>{new Date(row.createdAt).toLocaleString('ro-RO')}</div>
                </button>
              ))}
            </div>
          </aside>

          <section style={{ background: '#fff', border: '1px solid #dbe3ef', borderRadius: 14, padding: 14 }}>
            {!selected ? (
              <p style={{ color: '#64748b' }}>Selectați o solicitare pentru detalii.</p>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 12 }}>
                    <h2 style={{ marginTop: 0, fontSize: 18 }}>Date Client</h2>
                    <p><strong>Companie:</strong> {selected.companyName}</p>
                    <p><strong>Contact:</strong> {selected.contactPerson} ({selected.email}, {selected.phone})</p>
                    <p><strong>Tip status:</strong> {selected.status}</p>
                    <p><strong>Caiet:</strong> {selected.specificationFileName || '-'}</p>
                    <p><strong>Termen:</strong> {selected.deadline || '-'}</p>
                    <p><strong>Buget:</strong> {selected.budgetRange || selected.budgetCustom || '-'}</p>
                    <p style={{ marginBottom: 0 }}><strong>Readiness:</strong> {technicalReadiness.score}/{technicalReadiness.total}</p>
                    {technicalReadiness.missing.length > 0 && (
                      <p style={{ color: '#c2410c', marginTop: 8, marginBottom: 0 }}>
                        Lipsesc: {technicalReadiness.missing.join(', ')}
                      </p>
                    )}
                  </div>

                  <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 12 }}>
                    <h2 style={{ marginTop: 0, fontSize: 18 }}>Descriere Client</h2>
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#334155', fontFamily: 'inherit', fontSize: 14 }}>
                      {selected.projectDescription || '(fără descriere)'}
                    </pre>
                  </div>
                </div>

                <div style={{ marginTop: 14, border: '1px solid #dbeafe', borderRadius: 12, padding: 12, background: '#f8fbff' }}>
                  <div style={{ border: '1px solid #cfe1ff', borderRadius: 12, padding: 12, background: '#ffffff', marginBottom: 12 }}>
                    <h2 style={{ marginTop: 0, marginBottom: 8, fontSize: 18, color: '#0f172a' }}>Cerințe structurate (auto)</h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
                      <strong style={{ color: '#1d4ed8' }}>Completitudine: {structuredRequirements.score}/{structuredRequirements.total}</strong>
                      {structuredRequirements.missingCritical.length > 0 ? (
                        <span style={{ color: '#b45309', fontWeight: 700 }}>
                          Lipsesc critice: {structuredRequirements.missingCritical.join(', ')}
                        </span>
                      ) : (
                        <span style={{ color: '#065f46', fontWeight: 700 }}>Set minim tehnic complet.</span>
                      )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      {[
                        { title: 'Obiective', items: structuredRequirements.objectives },
                        { title: 'Constrângeri', items: structuredRequirements.constraints },
                        { title: 'Intrări', items: structuredRequirements.inputs },
                        { title: 'Ieșiri', items: structuredRequirements.outputs },
                        { title: 'Criterii de acceptanță', items: structuredRequirements.acceptanceCriteria },
                      ].map((group) => (
                        <div key={group.title} style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 10 }}>
                          <div style={{ fontWeight: 800, color: '#1e293b', marginBottom: 6 }}>{group.title}</div>
                          {group.items.length ? (
                            <div style={{ display: 'grid', gap: 6 }}>
                              {group.items.map((item, idx) => (
                                <div key={`${group.title}-${idx}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                                  <span style={{ color: '#334155', fontSize: 14 }}>{item.value}</span>
                                  <span style={{ fontSize: 11, color: '#475569', whiteSpace: 'nowrap' }}>{sourceLabel(item.source)}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div style={{ color: '#94a3b8', fontSize: 13 }}>Nu există date mapate încă.</div>
                          )}
                        </div>
                      ))}
                    </div>

                    <div style={{ marginTop: 12, borderTop: '1px dashed #cbd5e1', paddingTop: 10 }}>
                      <div style={{ fontWeight: 800, color: '#1e293b', marginBottom: 8 }}>Întrebări de clarificare către client</div>
                      {clarificationQuestions.length ? (
                        <>
                          <ol style={{ margin: '0 0 10px 18px', color: '#334155', padding: 0 }}>
                            {clarificationQuestions.map((q, idx) => (
                              <li key={idx} style={{ marginBottom: 4 }}>{q}</li>
                            ))}
                          </ol>
                          <button
                            type="button"
                            onClick={appendClarificationsToDraft}
                            style={{ border: '1px solid #cbd5e1', background: '#fff', color: '#1e293b', borderRadius: 8, padding: '8px 12px', fontWeight: 700, cursor: 'pointer' }}
                          >
                            Adaugă întrebările în câmpul "Întrebări deschise"
                          </button>
                        </>
                      ) : (
                        <span style={{ color: '#065f46', fontWeight: 700 }}>Nu sunt întrebări critice deschise.</span>
                      )}
                    </div>
                  </div>

                  <h2 style={{ marginTop: 0, fontSize: 18, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    Technical Draft (intern Admin)
                    {draftBadge && (
                      <span style={{ fontSize: 12, fontWeight: 700, padding: '2px 10px', borderRadius: 20, background: draftBadge.bg, color: draftBadge.color }}>
                        {draftBadge.label}
                      </span>
                    )}
                    {!hasUnsavedChanges && !isAutosaving && autosaveInfo && !autosaveInfo.startsWith('Eroare') && (
                      <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 400 }}>{autosaveInfo}</span>
                    )}
                  </h2>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <label style={{ display: 'grid', gap: 6 }}>
                      <span>Rezumat soluție tehnică</span>
                      <textarea value={draft.solutionSummary} onChange={(e) => updateDraftField('solutionSummary', e.target.value)} onBlur={handleBlurSave} rows={4} />
                    </label>
                    <label style={{ display: 'grid', gap: 6 }}>
                      <span>Arhitectură propusă (PLC/HMI/SCADA/IT)</span>
                      <textarea value={draft.proposedArchitecture} onChange={(e) => updateDraftField('proposedArchitecture', e.target.value)} onBlur={handleBlurSave} rows={4} />
                    </label>
                    <label style={{ display: 'grid', gap: 6 }}>
                      <span>Echipamente recomandate (high-level BOM)</span>
                      <textarea value={draft.recommendedEquipment} onChange={(e) => updateDraftField('recommendedEquipment', e.target.value)} onBlur={handleBlurSave} rows={4} />
                    </label>
                    <label style={{ display: 'grid', gap: 6 }}>
                      <span>Ipoteze</span>
                      <textarea value={draft.assumptions} onChange={(e) => updateDraftField('assumptions', e.target.value)} onBlur={handleBlurSave} rows={4} />
                    </label>
                    <label style={{ display: 'grid', gap: 6 }}>
                      <span>Riscuri tehnice</span>
                      <textarea value={draft.technicalRisks} onChange={(e) => updateDraftField('technicalRisks', e.target.value)} onBlur={handleBlurSave} rows={4} />
                    </label>
                    <label style={{ display: 'grid', gap: 6 }}>
                      <span>Fazare implementare</span>
                      <textarea value={draft.implementationPhases} onChange={(e) => updateDraftField('implementationPhases', e.target.value)} onBlur={handleBlurSave} rows={4} />
                    </label>
                    <label style={{ display: 'grid', gap: 6 }}>
                      <span>Plan validare (FAT/SAT)</span>
                      <textarea value={draft.validationPlan} onChange={(e) => updateDraftField('validationPlan', e.target.value)} onBlur={handleBlurSave} rows={4} />
                    </label>
                    <label style={{ display: 'grid', gap: 6 }}>
                      <span>Întrebări deschise către client</span>
                      <textarea value={draft.openQuestions} onChange={(e) => updateDraftField('openQuestions', e.target.value)} onBlur={handleBlurSave} rows={4} />
                    </label>
                  </div>

                  <label style={{ display: 'grid', gap: 6, marginTop: 12 }}>
                    <span>Pași următori interni</span>
                    <textarea value={draft.nextSteps} onChange={(e) => updateDraftField('nextSteps', e.target.value)} onBlur={handleBlurSave} rows={3} />
                  </label>

                  <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 12, marginTop: 12 }}>
                    <label style={{ display: 'grid', gap: 6 }}>
                      <span>Status intern</span>
                      <select value={status} onChange={(e) => updateStatus(e.target.value)} onBlur={handleBlurSave}>
                        <option value="new">new</option>
                        <option value="triage">triage</option>
                        <option value="analysis">analysis</option>
                        <option value="draft-ready">draft-ready</option>
                        <option value="sent">sent</option>
                      </select>
                    </label>
                    <label style={{ display: 'grid', gap: 6 }}>
                      <span>Note interne</span>
                      <textarea value={notes} onChange={(e) => updateNotes(e.target.value)} onBlur={handleBlurSave} rows={3} />
                    </label>
                  </div>

                  <div style={{ marginTop: 12, display: 'flex', gap: 10, alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={generateDraftWithAI}
                      disabled={generatingDraft}
                      style={{ border: '1px solid #cbd5e1', background: '#fff', color: '#1e293b', borderRadius: 10, padding: '10px 14px', fontWeight: 800, cursor: 'pointer' }}
                    >
                      {generatingDraft ? 'Se generează...' : 'Generează Draft AI'}
                    </button>

                    <button
                      type="button"
                      onClick={saveDraft}
                      style={{ border: 0, background: '#1d4ed8', color: '#fff', borderRadius: 10, padding: '10px 14px', fontWeight: 800, cursor: 'pointer' }}
                    >
                      Salvează Draft Tehnic
                    </button>

                    <button
                      type="button"
                      onClick={exportTechnicalPdf}
                      style={{ border: '1px solid #cbd5e1', background: '#fff', color: '#1e293b', borderRadius: 10, padding: '10px 14px', fontWeight: 800, cursor: 'pointer' }}
                    >
                      Export PDF intern
                    </button>

                    {saveState && !saveState.startsWith('Eroare') && saveState !== 'Draft tehnic salvat.' && !isAutosaving && (
                      <span style={{ color: '#334155', fontWeight: 700, fontSize: 13 }}>{saveState}</span>
                    )}
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
