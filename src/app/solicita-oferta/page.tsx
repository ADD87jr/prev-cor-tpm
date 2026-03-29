'use client';

import Link from 'next/link';
import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';

interface FormData {
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  projectType: string;
  projectObjective: string;
  projectDescription: string;
  currentProcess: string;
  targetProcess: string;
  acceptanceCriteria: string;
  capacityPerformance: string;
  processType: string;
  existingEquipment: string;
  sensorsActuators: string;
  plcPreference: string;
  hmiRequirement: string;
  technicalConstraints: string;
  environmentConstraints: string;
  safetyRequirements: string;
  utilitiesAvailable: string;
  integrationNeeds: string;
  deadline: string;
  budgetRange: string;
  budgetCustom: string;
  attachments: string[];
  specificationFileName: string;
}

interface AIQuestion {
  id: number;
  category: string;
  question: string;
  hint: string;
  importance: 'critical' | 'important' | 'optional';
  answer?: string;
}

interface ExtractionPreview {
  sourceType: string;
  totalRows: number;
  rows: string[];
  rowsUsedForAi?: number;
}

const budgetRanges = [
  'Sub 5.000 EUR',
  '5.000 - 15.000 EUR',
  '15.000 - 50.000 EUR',
  '50.000 - 100.000 EUR',
  'Peste 100.000 EUR',
  'Nespecificat - aștept ofertă',
];

const projectTypeOptions = [
  { value: 'automatizare-linie-productie', label: 'Automatizare linii de producție' },
  { value: 'programare-plc-hmi-scada', label: 'Programare PLC / HMI / SCADA' },
  { value: 'statie-robotizata', label: 'Stație robotizată' },
  { value: 'retrofit-modernizare', label: 'Retrofit / modernizare utilaje existente' },
  { value: 'tablouri-electrice-automate', label: 'Tablouri electrice de automatizare' },
  { value: 'punere-in-functiune-optimizare', label: 'Punere în funcțiune / optimizare proces' },
  { value: 'mentenanta-suport-tehnic', label: 'Mentenanță și suport tehnic' },
  { value: 'alt-serviciu', label: 'Alt serviciu' },
];

export default function SolicitaOfertaPage() {
  const [formData, setFormData] = useState<FormData>({
    companyName: '',
    contactPerson: '',
    email: '',
    phone: '',
    projectType: '',
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
    budgetRange: '',
    budgetCustom: '',
    attachments: [],
    specificationFileName: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [uploadingSpec, setUploadingSpec] = useState(false);
  const [extractingSpec, setExtractingSpec] = useState(false);
  const [specMode, setSpecMode] = useState<'document' | 'manual'>('document');
  const [currentStep, setCurrentStep] = useState(1);

  const [aiAssisting, setAiAssisting] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiProjectType, setAiProjectType] = useState('');
  const [aiQuestions, setAiQuestions] = useState<AIQuestion[]>([]);
  const [enhancing, setEnhancing] = useState(false);
  const [extractionPreview, setExtractionPreview] = useState<ExtractionPreview | null>(null);
  const [lastExtractionSource, setLastExtractionSource] = useState('');
  const [previewExportMessage, setPreviewExportMessage] = useState('');

  const specFileRef = useRef<HTMLInputElement>(null);

  const qualityFlags = {
    description: Boolean(formData.projectDescription.trim()),
    capacity: Boolean(formData.capacityPerformance.trim()),
    specs: specMode === 'document'
      ? Boolean(formData.specificationFileName)
      : Boolean(formData.processType.trim() || formData.existingEquipment.trim() || formData.sensorsActuators.trim()),
    deadline: Boolean(formData.deadline.trim()),
    budget: Boolean(formData.budgetRange || formData.budgetCustom),
  };
  const qualityScore = Object.values(qualityFlags).filter(Boolean).length;
  const qualityPercentage = Math.round((qualityScore / 5) * 100);
  const totalSteps = 4;
  const hasBudget = Boolean(formData.budgetRange || formData.budgetCustom.trim());

  const technicalMustHave = [
    { label: 'Obiectiv măsurabil', ok: Boolean(formData.projectObjective.trim()) },
    { label: 'Proces actual', ok: Boolean(formData.currentProcess.trim()) },
    { label: 'Proces țintă', ok: Boolean(formData.targetProcess.trim()) },
    { label: 'Capacitate / performanță', ok: Boolean(formData.capacityPerformance.trim()) },
    {
      label: 'Constrângeri tehnice / mediu / safety',
      ok: Boolean(
        formData.technicalConstraints.trim() ||
        formData.environmentConstraints.trim() ||
        formData.safetyRequirements.trim()
      ),
    },
    { label: 'Termen dorit', ok: Boolean(formData.deadline.trim()) },
    { label: 'Buget orientativ', ok: hasBudget },
  ];
  const technicalReadinessScore = technicalMustHave.filter((item) => item.ok).length;
  const missingTechnicalPoints = technicalMustHave.filter((item) => !item.ok).map((item) => item.label);

  const stepFlow = [
    { stage: 1, label: 'Contact', icon: '✅' },
    { stage: 2, label: 'Tip Proiect', icon: '✅' },
    { stage: 3, label: 'Detalii', icon: '📋' },
    { stage: 4, label: 'Review', icon: '✅' },
  ].map((step) => ({
    ...step,
    state: step.stage < currentStep ? ('done' as const) : step.stage === currentStep ? ('active' as const) : ('pending' as const),
  }));

  const validateStep = (step: number) => {
    if (step === 1) {
      if (!formData.companyName.trim() || !formData.contactPerson.trim() || !formData.email.trim() || !formData.phone.trim()) {
        setError('Completați câmpurile obligatorii din Contact înainte de a continua.');
        return false;
      }
    }

    if (step === 3) {
      if (!formData.projectDescription.trim()) {
        setError('Completați descrierea proiectului înainte de Review.');
        return false;
      }

      if (technicalReadinessScore < technicalMustHave.length) {
        setError(`Pentru ofertare profesionistă lipsesc date critice: ${missingTechnicalPoints.join(', ')}.`);
        return false;
      }
    }

    return true;
  };

  const goToNextStep = () => {
    setError('');
    if (!validateStep(currentStep)) return;
    setCurrentStep((prev) => Math.min(totalSteps, prev + 1));
  };

  const goToPreviousStep = () => {
    setError('');
    setCurrentStep((prev) => Math.max(1, prev - 1));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const technicalAppendix = [
        formData.projectObjective.trim() ? `Obiectiv proiect: ${formData.projectObjective.trim()}` : '',
        formData.currentProcess.trim() ? `Proces actual: ${formData.currentProcess.trim()}` : '',
        formData.targetProcess.trim() ? `Proces țintă: ${formData.targetProcess.trim()}` : '',
        formData.acceptanceCriteria.trim() ? `Criterii de acceptanță (FAT/SAT/KPI): ${formData.acceptanceCriteria.trim()}` : '',
        formData.capacityPerformance.trim() ? `Capacitate / performanță țintă: ${formData.capacityPerformance.trim()}` : '',
        formData.processType.trim() ? `Tip proces: ${formData.processType.trim()}` : '',
        formData.existingEquipment.trim() ? `Echipamente existente: ${formData.existingEquipment.trim()}` : '',
        formData.sensorsActuators.trim() ? `Senzori / actuatoare: ${formData.sensorsActuators.trim()}` : '',
        formData.plcPreference.trim() ? `Preferință PLC: ${formData.plcPreference.trim()}` : '',
        formData.hmiRequirement.trim() ? `Necesitate HMI: ${formData.hmiRequirement.trim()}` : '',
        formData.technicalConstraints.trim() ? `Constrângeri tehnice: ${formData.technicalConstraints.trim()}` : '',
        formData.environmentConstraints.trim() ? `Constrângeri de mediu: ${formData.environmentConstraints.trim()}` : '',
        formData.safetyRequirements.trim() ? `Cerințe de safety: ${formData.safetyRequirements.trim()}` : '',
        formData.utilitiesAvailable.trim() ? `Utilități disponibile: ${formData.utilitiesAvailable.trim()}` : '',
        formData.integrationNeeds.trim() ? `Integrare IT/OT necesară: ${formData.integrationNeeds.trim()}` : '',
      ].filter(Boolean).join('\n');

      const submissionDescription = technicalAppendix
        ? `${formData.projectDescription.trim()}\n\n${technicalAppendix}`
        : formData.projectDescription;

      const response = await fetch('/api/solicita-oferta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          projectDescription: submissionDescription,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setSubmitted(true);
      } else {
        setError(data.error || 'A apărut o eroare. Încercați din nou.');
      }
    } catch {
      setError('Eroare de conexiune. Verificați internetul și încercați din nou.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSpecificationUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png',
    ];

    if (!allowedTypes.includes(file.type)) {
      setError('Tip de fișier neacceptat. Folosiți PDF, DOC, DOCX, XLS, XLSX, JPG sau PNG.');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setError('Fișierul este prea mare. Dimensiunea maximă este 50MB.');
      return;
    }

    setUploadingSpec(true);
    setError('');

    try {
      const payload = new FormData();
      payload.append('file', file);
      payload.append('type', 'specification');

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: payload,
      });

      const data = await response.json();
      if (data.success) {
        setFormData((prev) => ({
          ...prev,
          specificationFileName: data.fileName || file.name,
          attachments: [...prev.attachments, data.url || data.path],
        }));
        setExtractionPreview(null);
        setLastExtractionSource('');
      } else {
        setError(data.error || 'Eroare la încărcarea fișierului.');
      }
    } catch {
      setError('Eroare la încărcarea fișierului. Încercați din nou.');
    } finally {
      setUploadingSpec(false);
    }
  };

  const handleExtractFromSpecification = async () => {
    const file = specFileRef.current?.files?.[0];
    if (!file) {
      setError('Încărcați mai întâi caietul de sarcini pentru extragere automată.');
      return;
    }

    setExtractingSpec(true);
    setError('');

    try {
      const payload = new FormData();
      payload.append('mode', 'extract-specs');
      payload.append('file', file);

      const response = await fetch('/api/ai-assist', {
        method: 'POST',
        body: payload,
      });

      const data = await response.json();
      if (!data.success || !data.extracted) {
        setError(data.error || 'Nu am putut extrage automat datele din caiet.');
        return;
      }

      if (data.extractionPreview) {
        setExtractionPreview(data.extractionPreview as ExtractionPreview);
      } else {
        setExtractionPreview(null);
      }
      setLastExtractionSource(String(data.source || ''));

      const extracted = data.extracted as Record<string, string>;
      const hasExtractedData = Object.values(extracted).some((value) =>
        typeof value === 'string' && value.trim().length > 0
      );

      if (!hasExtractedData) {
        const spreadsheetUpload =
          file.type === 'application/vnd.ms-excel' ||
          file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
          /\.(xls|xlsx)$/i.test(file.name);

        setError(
          spreadsheetUpload
            ? 'Fișierul a fost încărcat, dar AI nu a extras câmpuri din XLS/XLSX. Recomandare: exportați caietul în PDF sau DOCX și rulați din nou extracția.'
            : 'Fișierul a fost încărcat, dar AI nu a extras câmpuri utile. Încercați un PDF/DOCX mai clar sau completați manual câmpurile tehnice.'
        );
        return;
      }

      setFormData((prev) => ({
        ...prev,
        projectObjective: extracted.projectObjective || prev.projectObjective,
        projectDescription: extracted.projectDescription || prev.projectDescription,
        currentProcess: extracted.currentProcess || prev.currentProcess,
        targetProcess: extracted.targetProcess || prev.targetProcess,
        acceptanceCriteria: extracted.acceptanceCriteria || prev.acceptanceCriteria,
        capacityPerformance: extracted.capacityPerformance || prev.capacityPerformance,
        processType: extracted.processType || prev.processType,
        existingEquipment: extracted.existingEquipment || prev.existingEquipment,
        sensorsActuators: extracted.sensorsActuators || prev.sensorsActuators,
        plcPreference: extracted.plcPreference || prev.plcPreference,
        hmiRequirement: extracted.hmiRequirement || prev.hmiRequirement,
        technicalConstraints: extracted.technicalConstraints || prev.technicalConstraints,
        environmentConstraints: extracted.environmentConstraints || prev.environmentConstraints,
        safetyRequirements: extracted.safetyRequirements || prev.safetyRequirements,
        utilitiesAvailable: extracted.utilitiesAvailable || prev.utilitiesAvailable,
        integrationNeeds: extracted.integrationNeeds || prev.integrationNeeds,
        deadline: extracted.deadline || prev.deadline,
      }));
    } catch {
      setError('Eroare la extragerea automată din caietul de sarcini.');
    } finally {
      setExtractingSpec(false);
    }
  };

  const handleAiAssist = async () => {
    if (!formData.projectDescription.trim()) {
      setError('Descrieți pe scurt proiectul pentru a activa asistentul.');
      return;
    }

    setAiAssisting(true);
    setError('');

    try {
      const response = await fetch('/api/ai-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: formData.projectDescription, mode: 'questions' }),
      });

      const data = await response.json();
      if (data.success) {
        if (data.mode === 'structured' && Array.isArray(data.questions)) {
          setAiProjectType(data.projectType || 'Proiect de automatizare');
          setAiQuestions(data.questions.map((q: AIQuestion) => ({ ...q, answer: '' })));
          setShowAiModal(true);
        } else if (data.questions) {
          const lines = data.questions.split('\n').filter((line: string) => line.trim());
          const questions = lines.map((line: string, idx: number) => ({
            id: idx + 1,
            category: 'General',
            question: line.replace(/^\d+[\.\)]\s*/, ''),
            hint: '',
            importance: 'important' as const,
            answer: '',
          }));
          setAiProjectType('Proiect de automatizare');
          setAiQuestions(questions);
          setShowAiModal(true);
        }
      } else {
        setError(data.error || 'Nu s-au putut genera întrebări.');
      }
    } catch {
      setError('Eroare la comunicarea cu AI. Încercați din nou.');
    } finally {
      setAiAssisting(false);
    }
  };

  const handleEnhanceDescription = async () => {
    if (!formData.projectDescription.trim()) {
      setError('Descrieți proiectul înainte de rafinare.');
      return;
    }

    setEnhancing(true);
    setError('');

    try {
      const response = await fetch('/api/ai-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: formData.projectDescription, mode: 'enhance' }),
      });

      const data = await response.json();
      if (data.success && data.enhancedDescription) {
        setFormData((prev) => ({ ...prev, projectDescription: data.enhancedDescription }));
      } else {
        setError(data.error || 'Nu s-a putut îmbunătăți descrierea.');
      }
    } catch {
      setError('Eroare la comunicarea cu AI.');
    } finally {
      setEnhancing(false);
    }
  };

  const buildPreviewExportContent = () => {
    if (!extractionPreview) return '';

    const header = [
      'Preview rânduri detectate',
      `Total rânduri detectate: ${extractionPreview.totalRows}`,
      `Rânduri afișate: ${extractionPreview.rows.length}`,
      `Sursă AI: ${lastExtractionSource || 'necunoscută'}`,
      '',
    ];

    return `${header.join('\n')}${extractionPreview.rows.join('\n')}`;
  };

  const handleCopyPreview = async () => {
    const content = buildPreviewExportContent();
    if (!content) return;

    try {
      await navigator.clipboard.writeText(content);
      setPreviewExportMessage('Preview copiat în clipboard.');
    } catch {
      setPreviewExportMessage('Nu am putut copia automat.');
    }
  };

  const handleDownloadPreview = () => {
    const content = buildPreviewExportContent();
    if (!content) return;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    const now = new Date().toISOString().replace(/[:.]/g, '-');

    link.href = URL.createObjectURL(blob);
    link.download = `preview-randuri-${now}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);

    setPreviewExportMessage('Preview descărcat.');
  };

  const updateQuestionAnswer = (questionId: number, answer: string) => {
    setAiQuestions((prev) => prev.map((q) => (q.id === questionId ? { ...q, answer } : q)));
  };

  const applyAiAnswers = () => {
    const answered = aiQuestions.filter((q) => q.answer?.trim());
    if (answered.length === 0) {
      setError('Răspundeți la cel puțin o întrebare.');
      return;
    }

    const formatted = answered.map((q) => `• ${q.category}: ${q.answer}`).join('\n');
    const combined = `${formData.projectDescription}\n\n📋 Detalii tehnice suplimentare:\n${formatted}`;

    setFormData((prev) => ({ ...prev, projectDescription: combined }));
    setShowAiModal(false);
    setAiQuestions([]);
  };

  if (submitted) {
    return (
      <main className="solicita-theme">
        <div className="solicita-shell">
          <section className="success-box">
            <div className="success-icon">✓</div>
            <h1>Cererea a fost trimisă cu succes</h1>
            <p>Echipa PREV-COR TPM va reveni cu ofertă tehnică și comercială în 24-48 ore lucrătoare.</p>
            <Link href="/" className="success-link">Înapoi la formular</Link>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="solicita-theme">
      <div className="solicita-shell">
        <header className="hero">
          <h1>Solicitați o Ofertă Personalizată</h1>
          <p>
            Completați formularul de mai jos cu detaliile proiectului dumneavoastră și vă vom contacta
            cu o ofertă tehnică și comercială detaliată.
          </p>

          <div className="stepper-wrap">
            <p className="stepper-title">Etape proiect</p>
            <div className="stepper">
              {stepFlow.map((step, idx) => (
                <div className="stepper-node" key={step.label}>
                  <span className={`step-pill ${step.state}`}>
                    <span className="step-index">{step.stage}</span>
                    <span>{step.icon} {step.label}</span>
                  </span>
                  {idx < stepFlow.length - 1 && (
                    <span className={`step-connector ${step.state === 'done' ? 'done' : ''}`} aria-hidden="true" />
                  )}
                </div>
              ))}
            </div>
          </div>

          <p className="autosave-note">💾 Datele se salvează automat - puteți reveni oricând</p>
        </header>

        <form className="solicita-form" onSubmit={handleSubmit}>
          {currentStep === 1 && (
            <section className="solicita-card">
              <div className="card-head">
                <h2>🧾 Datele Dumneavoastră de Contact</h2>
                <p>Pas 1 din 4 - informații de identificare pentru comunicare.</p>
              </div>

              <div className="card-body two-col">
                <div className="field-block">
                  <label>Nume companie *</label>
                  <input
                    required
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    placeholder="SC Exemplu SRL"
                  />
                </div>

                <div className="field-block">
                  <label>Persoană de contact *</label>
                  <input
                    required
                    type="text"
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    placeholder="Ion Popescu"
                  />
                </div>

                <div className="field-block">
                  <label>Email *</label>
                  <input
                    required
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="contact@companie.ro"
                  />
                </div>

                <div className="field-block">
                  <label>Telefon *</label>
                  <input
                    required
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="0722 123 456"
                  />
                </div>
              </div>
            </section>
          )}

          {currentStep === 2 && (
            <section className="solicita-card">
              <div className="card-head">
                <h2>🧭 Tip Proiect</h2>
                <p>Pas 2 din 4 - încadrarea proiectului și parametrii comerciali.</p>
              </div>

              <div className="card-body">
                <div className="field-block">
                  <label>Tip proiect</label>
                  <select
                    value={formData.projectType}
                    onChange={(e) => setFormData({ ...formData, projectType: e.target.value })}
                  >
                    <option value="">Selectați...</option>
                    {projectTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>

                <div className="two-col">
                  <div className="field-block">
                    <label>Termen dorit</label>
                    <input
                      type="text"
                      value={formData.deadline}
                      onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                      placeholder="ex: 3 luni"
                    />
                  </div>

                  <div className="field-block">
                    <label>Buget estimat</label>
                    <select
                      value={formData.budgetRange}
                      onChange={(e) => setFormData({ ...formData, budgetRange: e.target.value })}
                    >
                      <option value="">Selectați...</option>
                      {budgetRanges.map((range) => (
                        <option key={range} value={range}>{range}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="field-block">
                  <label>Sau specificați suma exactă (opțional)</label>
                  <input
                    type="text"
                    value={formData.budgetCustom}
                    onChange={(e) => setFormData({ ...formData, budgetCustom: e.target.value })}
                    placeholder="ex: 25.000 EUR"
                  />
                </div>
              </div>
            </section>
          )}

          {currentStep === 3 && (
            <section className="solicita-card technical-first">
              <div className="card-head">
                <h2>📋 Detalii Tehnice</h2>
                <p>Pas 3 din 4 - descrieți soluția și specificațiile tehnice.</p>
              </div>

              <div className="card-body">
                <div className="quality-box">
                  <div className="quality-top">
                    <span>📊 Calitate descriere</span>
                    <strong>{qualityPercentage}%</strong>
                  </div>
                  <div className="quality-progress">
                    <span style={{ width: `${qualityPercentage}%` }} />
                  </div>
                  <div className="quality-chips">
                    <span className={qualityFlags.description ? 'chip ok' : 'chip'}>{qualityFlags.description ? '✅' : '○'} Descriere detaliată</span>
                    <span className={qualityFlags.capacity ? 'chip ok' : 'chip'}>{qualityFlags.capacity ? '✅' : '○'} Proces specificat</span>
                    <span className={qualityFlags.specs ? 'chip ok' : 'chip'}>{qualityFlags.specs ? '✅' : '○'} Specificații tehnice</span>
                    <span className={qualityFlags.deadline ? 'chip ok' : 'chip'}>{qualityFlags.deadline ? '✅' : '○'} Termen</span>
                    <span className={qualityFlags.budget ? 'chip ok' : 'chip'}>{qualityFlags.budget ? '✅' : '○'} Buget menționat</span>
                  </div>
                </div>

                <div className="musthave-box">
                  <div className="musthave-head">
                    <strong>Date minime pentru soluție tehnică în Admin</strong>
                    <span>{technicalReadinessScore}/{technicalMustHave.length} completate</span>
                  </div>
                  <div className="musthave-list">
                    {technicalMustHave.map((item) => (
                      <span key={item.label} className={item.ok ? 'chip ok' : 'chip'}>
                        {item.ok ? '✅' : '○'} {item.label}
                      </span>
                    ))}
                  </div>
                  {missingTechnicalPoints.length > 0 && (
                    <p className="musthave-note">
                      Lipsesc pentru ofertare: {missingTechnicalPoints.join(', ')}.
                    </p>
                  )}
                </div>

                <div className="field-block">
                  <label>Obiectiv proiect (măsurabil) *</label>
                  <textarea
                    rows={3}
                    value={formData.projectObjective}
                    onChange={(e) => setFormData({ ...formData, projectObjective: e.target.value })}
                    placeholder="ex: creștere capacitate cu 25%, reducere rebut sub 2%, trasabilitate completă"
                  />
                </div>

                <div className="field-block">
                  <label>Descrieți proiectul / Ce doriți să automatizați? *</label>
                  <textarea
                    required
                    rows={7}
                    value={formData.projectDescription}
                    onChange={(e) => setFormData({ ...formData, projectDescription: e.target.value })}
                    placeholder="Descrieți cât mai detaliat procesul, rezultatele așteptate, echipamentele existente și condițiile de lucru."
                  />
                </div>

                <div className="two-col">
                  <div className="field-block">
                    <label>Proces actual (AS-IS) *</label>
                    <textarea
                      rows={4}
                      value={formData.currentProcess}
                      onChange={(e) => setFormData({ ...formData, currentProcess: e.target.value })}
                      placeholder="Descrieți fluxul actual, timpi, blocaje, intervenții manuale"
                    />
                  </div>
                  <div className="field-block">
                    <label>Proces țintă (TO-BE) *</label>
                    <textarea
                      rows={4}
                      value={formData.targetProcess}
                      onChange={(e) => setFormData({ ...formData, targetProcess: e.target.value })}
                      placeholder="Cum trebuie să funcționeze după implementare"
                    />
                  </div>
                </div>

                <div className="field-block">
                  <label>Capacitate / performanță țintă</label>
                  <input
                    type="text"
                    value={formData.capacityPerformance}
                    onChange={(e) => setFormData({ ...formData, capacityPerformance: e.target.value })}
                    placeholder="ex: 60 piese/oră, ciclu 12 sec, 2.000 m3/h"
                  />
                </div>

                <div className="field-block">
                  <label>Criterii de acceptanță (FAT/SAT/KPI)</label>
                  <textarea
                    rows={3}
                    value={formData.acceptanceCriteria}
                    onChange={(e) => setFormData({ ...formData, acceptanceCriteria: e.target.value })}
                    placeholder="ex: FAT cu 8h funcționare continuă, SAT la 95% capacitate, rebut sub 2%"
                  />
                </div>

                <div className="ai-box">
                  <p>Copilot tehnic: structurați cerința înainte de ofertare.</p>
                  <div className="ai-actions">
                    <button type="button" onClick={handleAiAssist} disabled={aiAssisting || !formData.projectDescription.trim()}>
                      {aiAssisting ? '⏳ Analizez...' : 'Întrebări tehnice'}
                    </button>
                    <button type="button" onClick={handleEnhanceDescription} disabled={enhancing || !formData.projectDescription.trim()}>
                      {enhancing ? '⏳ Îmbunătățesc...' : 'Rafinează descrierea'}
                    </button>
                  </div>
                </div>

                <div className="spec-mode-switch">
                  <button
                    type="button"
                    className={specMode === 'document' ? 'active' : ''}
                    onClick={() => setSpecMode('document')}
                  >
                    Am caiet de sarcini
                  </button>
                  <button
                    type="button"
                    className={specMode === 'manual' ? 'active' : ''}
                    onClick={() => setSpecMode('manual')}
                  >
                    Nu am caiet, completez manual
                  </button>
                </div>

                {specMode === 'document' ? (
                  <div className="upload-box">
                    <label>Caiet de sarcini sau fișiere suport</label>
                    <p>PDF, DOC, DOCX, XLS, XLSX, JPG, PNG - max 50MB</p>
                    <input
                      ref={specFileRef}
                      type="file"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                      onChange={handleSpecificationUpload}
                      hidden
                    />

                    {formData.specificationFileName ? (
                      <div className="upload-ok">
                        <span>✓ {formData.specificationFileName}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setFormData((prev) => ({
                              ...prev,
                              specificationFileName: '',
                              attachments: prev.attachments.slice(0, -1),
                            }));
                            setExtractionPreview(null);
                            setLastExtractionSource('');
                            if (specFileRef.current) specFileRef.current.value = '';
                          }}
                        >
                          Șterge
                        </button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => specFileRef.current?.click()} disabled={uploadingSpec}>
                        {uploadingSpec ? 'Se încarcă...' : 'Încarcă fișier'}
                      </button>
                    )}

                    <div className="extract-actions">
                      <button
                        type="button"
                        onClick={handleExtractFromSpecification}
                        disabled={extractingSpec || !formData.specificationFileName}
                      >
                        {extractingSpec ? '⏳ Extrag datele...' : '✨ Extrage automat datele tehnice'}
                      </button>
                      <small>
                        AI citește documentul și completează automat câmpurile tehnice.
                      </small>
                    </div>

                    {extractionPreview && extractionPreview.rows.length > 0 && (
                      <div className="extraction-preview">
                        <div className="extraction-preview-head">
                          <div>
                            <strong>Rânduri detectate din document</strong>
                            <span>
                              {extractionPreview.rows.length} / {extractionPreview.totalRows} rânduri afișate
                              {typeof extractionPreview.rowsUsedForAi === 'number'
                                ? ` · analizate AI: ${extractionPreview.rowsUsedForAi}`
                                : ''}
                              {lastExtractionSource ? ` · sursă AI: ${lastExtractionSource}` : ''}
                            </span>
                          </div>
                          <div className="extraction-preview-tools">
                            <button type="button" onClick={handleCopyPreview}>Copiază</button>
                            <button type="button" onClick={handleDownloadPreview}>Descarcă .txt</button>
                          </div>
                        </div>
                        {previewExportMessage && <p className="preview-export-message">{previewExportMessage}</p>}
                        <div className="extraction-preview-list">
                          {extractionPreview.rows.map((row, index) => (
                            <div key={`${index}-${row.slice(0, 24)}`} className="extraction-preview-row">{row}</div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="manual-specs-box">
                    <p>Completați specificațiile tehnice de bază pentru ofertare.</p>
                  </div>
                )}

                <div className="two-col">
                  <div className="field-block">
                    <label>Tip proces / aplicație</label>
                    <input
                      type="text"
                      value={formData.processType}
                      onChange={(e) => setFormData({ ...formData, processType: e.target.value })}
                      placeholder="ex: linie asamblare, sortare, dozare"
                    />
                  </div>
                  <div className="field-block">
                    <label>Echipamente existente</label>
                    <input
                      type="text"
                      value={formData.existingEquipment}
                      onChange={(e) => setFormData({ ...formData, existingEquipment: e.target.value })}
                      placeholder="ex: conveyor, robot, senzori existenți"
                    />
                  </div>
                  <div className="field-block">
                    <label>Senzori / actuatoare vizate</label>
                    <input
                      type="text"
                      value={formData.sensorsActuators}
                      onChange={(e) => setFormData({ ...formData, sensorsActuators: e.target.value })}
                      placeholder="ex: proximitate, encoder, servo"
                    />
                  </div>
                  <div className="field-block">
                    <label>Preferință PLC</label>
                    <input
                      type="text"
                      value={formData.plcPreference}
                      onChange={(e) => setFormData({ ...formData, plcPreference: e.target.value })}
                      placeholder="ex: Siemens, Allen-Bradley, Schneider"
                    />
                  </div>
                </div>

                <div className="two-col">
                  <div className="field-block">
                    <label>Necesitate HMI/SCADA</label>
                    <input
                      type="text"
                      value={formData.hmiRequirement}
                      onChange={(e) => setFormData({ ...formData, hmiRequirement: e.target.value })}
                      placeholder="ex: HMI local 12 inchi, acces remote"
                    />
                  </div>
                  <div className="field-block">
                    <label>Constrângeri tehnice</label>
                    <input
                      type="text"
                      value={formData.technicalConstraints}
                      onChange={(e) => setFormData({ ...formData, technicalConstraints: e.target.value })}
                      placeholder="ex: spațiu limitat, mediu praf, IP65"
                    />
                  </div>
                </div>

                <div className="two-col">
                  <div className="field-block">
                    <label>Constrângeri de mediu</label>
                    <input
                      type="text"
                      value={formData.environmentConstraints}
                      onChange={(e) => setFormData({ ...formData, environmentConstraints: e.target.value })}
                      placeholder="ex: temperatură 5-45°C, praf, umiditate, IP65"
                    />
                  </div>
                  <div className="field-block">
                    <label>Cerințe de safety</label>
                    <input
                      type="text"
                      value={formData.safetyRequirements}
                      onChange={(e) => setFormData({ ...formData, safetyRequirements: e.target.value })}
                      placeholder="ex: SIL/PL, E-Stop, garduri, interlock, norme"
                    />
                  </div>
                </div>

                <div className="two-col">
                  <div className="field-block">
                    <label>Utilități disponibile</label>
                    <input
                      type="text"
                      value={formData.utilitiesAvailable}
                      onChange={(e) => setFormData({ ...formData, utilitiesAvailable: e.target.value })}
                      placeholder="ex: 400V, aer 6 bar, rețea industrială, spațiu tablouri"
                    />
                  </div>
                  <div className="field-block">
                    <label>Integrare IT/OT necesară</label>
                    <input
                      type="text"
                      value={formData.integrationNeeds}
                      onChange={(e) => setFormData({ ...formData, integrationNeeds: e.target.value })}
                      placeholder="ex: ERP, MES, SCADA existent, OPC UA, Modbus, Profinet"
                    />
                  </div>
                </div>
              </div>
            </section>
          )}

          {currentStep === 4 && (
            <section className="solicita-card">
              <div className="card-head">
                <h2>✅ Confirmare și Trimitere</h2>
                <p>Pas 4 din 4 - verificați și trimiteți solicitarea.</p>
              </div>

              <div className="card-body submit-row">
                {error && <div className="form-error">❌ {error}</div>}

                <p>
                  Verificați datele introduse și apoi trimiteți solicitarea către echipa tehnică.
                </p>

                <p>
                  Prin trimiterea formularului, sunteți de acord cu{' '}
                  <Link href="/politica-confidentialitate">politica de confidențialitate</Link>.
                </p>
              </div>
            </section>
          )}

          {error && currentStep !== 4 && <div className="form-error">❌ {error}</div>}

          <div className="wizard-nav">
            <button type="button" onClick={goToPreviousStep} disabled={currentStep === 1}>
              ← Înapoi
            </button>
            {currentStep < totalSteps ? (
              <button type="button" onClick={goToNextStep}>
                Continuă →
              </button>
            ) : (
              <button type="submit" disabled={submitting}>
                {submitting ? '⏳ Se trimite...' : 'Trimite solicitarea'}
              </button>
            )}
          </div>
        </form>

        {showAiModal && (
          <div className="ai-modal-wrap">
            <div className="ai-modal">
              <div className="ai-modal-head">
                <div>
                  <h3>Asistent tehnic AI</h3>
                  <p>Proiect identificat: {aiProjectType}</p>
                </div>
                <button onClick={() => setShowAiModal(false)}>✕</button>
              </div>

              <div className="ai-modal-body">
                {aiQuestions.map((q) => (
                  <div key={q.id} className="ai-question">
                    <label>{q.id}. {q.question}</label>
                    {q.hint && <small>Notă: {q.hint}</small>}
                    <input
                      type="text"
                      value={q.answer || ''}
                      onChange={(e) => updateQuestionAnswer(q.id, e.target.value)}
                      placeholder="Răspunsul dumneavoastră..."
                    />
                  </div>
                ))}
              </div>

              <div className="ai-modal-foot">
                <button onClick={() => setShowAiModal(false)}>Anulează</button>
                <button onClick={applyAiAnswers} disabled={aiQuestions.filter((q) => q.answer?.trim()).length === 0}>
                  Aplică răspunsurile
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
