'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';

interface FormData {
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  projectDescription: string;
  capacityPerformance: string;
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

const budgetRanges = [
  'Sub 5.000 EUR',
  '5.000 - 15.000 EUR',
  '15.000 - 50.000 EUR',
  '50.000 - 100.000 EUR',
  'Peste 100.000 EUR',
  'Nespecificat - aștept ofertă',
];

export default function SolicitaOfertaPage() {
  const [formData, setFormData] = useState<FormData>({
    companyName: '',
    contactPerson: '',
    email: '',
    phone: '',
    projectDescription: '',
    capacityPerformance: '',
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
  
  // AI Assistant State
  const [aiAssisting, setAiAssisting] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiProjectType, setAiProjectType] = useState('');
  const [aiQuestions, setAiQuestions] = useState<AIQuestion[]>([]);
  const [enhancing, setEnhancing] = useState(false);
  
  const specFileRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const submissionDescription = formData.capacityPerformance.trim()
        ? `${formData.projectDescription.trim()}\n\nCapacitate / performanță țintă: ${formData.capacityPerformance.trim()}`
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

  // Upload caiet de sarcini
  const handleSpecificationUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Verifică tipul fișierului
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      setError('Tip de fișier neacceptat. Folosiți PDF, DOC, DOCX, JPG sau PNG.');
      return;
    }

    // Verifică dimensiunea (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('Fișierul este prea mare. Dimensiunea maximă este 10MB.');
      return;
    }

    setUploadingSpec(true);
    setError('');

    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);
      formDataUpload.append('type', 'specification');

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formDataUpload,
      });

      const data = await response.json();
      
      if (data.success) {
        setFormData(prev => ({
          ...prev,
          specificationFileName: data.fileName || file.name,
          attachments: [...prev.attachments, data.url || data.path]
        }));
      } else {
        setError(data.error || 'Eroare la încărcarea fișierului.');
      }
    } catch {
      setError('Eroare la încărcarea fișierului. Încercați din nou.');
    } finally {
      setUploadingSpec(false);
    }
  };

  // Asistență AI pentru detalii proiect - deschide modal
  const handleAiAssist = async () => {
    if (!formData.projectDescription.trim()) {
      setError('Descrieți pe scurt proiectul (ex: "stație automată", "linie de producție", "sistem HVAC")');
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
          // Fallback pentru text simplu
          const lines = data.questions.split('\n').filter((l: string) => l.trim());
          const questions = lines.map((line: string, idx: number) => ({
            id: idx + 1,
            category: 'General',
            question: line.replace(/^\d+[\.\)]\s*/, ''),
            hint: '',
            importance: 'important' as const,
            answer: ''
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

  // Îmbunătățire descriere cu AI
  const handleEnhanceDescription = async () => {
    if (!formData.projectDescription.trim()) {
      setError('Descrieți pe scurt proiectul pentru a-l îmbunătăți.');
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
        setFormData(prev => ({
          ...prev,
          projectDescription: data.enhancedDescription
        }));
      } else {
        setError(data.error || 'Nu s-a putut îmbunătăți descrierea.');
      }
    } catch {
      setError('Eroare la comunicarea cu AI.');
    } finally {
      setEnhancing(false);
    }
  };

  // Actualizare răspuns la întrebare AI
  const updateQuestionAnswer = (questionId: number, answer: string) => {
    setAiQuestions(prev => 
      prev.map(q => q.id === questionId ? { ...q, answer } : q)
    );
  };

  // Aplicare răspunsuri AI în descriere
  const applyAiAnswers = () => {
    const answeredQuestions = aiQuestions.filter(q => q.answer?.trim());
    
    if (answeredQuestions.length === 0) {
      setError('Răspundeți la cel puțin o întrebare.');
      return;
    }

    const formattedAnswers = answeredQuestions.map(q => 
      `• ${q.category}: ${q.answer}`
    ).join('\n');

    const enhancedDescription = `${formData.projectDescription}\n\n📋 Detalii tehnice suplimentare:\n${formattedAnswers}`;

    setFormData(prev => ({
      ...prev,
      projectDescription: enhancedDescription
    }));

    setShowAiModal(false);
    setAiQuestions([]);
  };

  if (submitted) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="max-w-lg w-full bg-white border border-green-200 rounded-2xl p-8 text-center shadow-lg">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Cererea a fost trimisă!</h1>
          <p className="text-gray-600 mb-6">
            Echipa PREV-COR TPM va analiza cerințele dumneavoastră și vă va contacta 
            în cel mai scurt timp cu o ofertă personalizată.
          </p>
          <p className="text-gray-500 text-sm mb-8">
            Timp estimat de răspuns: <strong className="text-gray-800">24-48 ore lucrătoare</strong>
          </p>
          <Link 
            href="/"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Înapoi la pagina principală
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-10">
        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-blue-700 mb-4">
            Solicitați o Ofertă Personalizată
          </h1>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Completați formularul de mai jos cu detaliile proiectului dumneavoastră 
            și vă vom contacta cu o ofertă tehnică și comercială detaliată.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-8 max-w-4xl mx-auto">
          {/* Contact Info */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <span className="text-2xl">👤</span> Date de Contact
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-600 text-sm mb-1">Nume Companie *</label>
                <input
                  type="text"
                  required
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder="SC Exemplu SRL"
                />
              </div>
              <div>
                <label className="block text-gray-600 text-sm mb-1">Persoană de Contact *</label>
                <input
                  type="text"
                  required
                  value={formData.contactPerson}
                  onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder="Ion Popescu"
                />
              </div>
              <div>
                <label className="block text-gray-600 text-sm mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder="contact@companie.ro"
                />
              </div>
              <div>
                <label className="block text-gray-600 text-sm mb-1">Telefon *</label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder="0722 123 456"
                />
              </div>
            </div>
          </div>

          {/* Project Details */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <span className="text-2xl">📋</span> Detalii Proiect
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-gray-600 text-sm mb-1">
                  Descrieți proiectul / Ce doriți să automatizați? *
                </label>
                <textarea
                  required
                  rows={6}
                  value={formData.projectDescription}
                  onChange={(e) => setFormData({ ...formData, projectDescription: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none"
                  placeholder="Descrieți cât mai detaliat ce proces doriți să automatizați, ce rezultate așteptați, ce echipamente aveți deja, etc.

Exemple de informații utile:
- Ce tip de proces/mașină doriți să automatizați
- Ce capacitate de producție este necesară
- Ce tip de senzori/actuatoare aveți în vedere
- Dacă aveți preferințe pentru tipul de PLC
- Dacă aveți nevoie de interfață operator (HMI)
- Constrângeri de spațiu sau alte cerințe speciale"
                />

                <div className="mt-4">
                  <label className="block text-gray-600 text-sm mb-1">
                    Capacitate / performanță țintă
                  </label>
                  <input
                    type="text"
                    value={formData.capacityPerformance}
                    onChange={(e) => setFormData({ ...formData, capacityPerformance: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    placeholder="ex: 60 piese/oră, ciclu 12 sec, 2.000 m3/h, 15 kW"
                  />
                  <p className="text-gray-500 text-xs mt-1">
                    Completați aici explicit debitul, capacitatea, timpul de ciclu sau performanța dorită, chiar dacă apar și în caietul de sarcini.
                  </p>
                </div>
                
                {/* AI Assist Buttons */}
                <div className="flex flex-wrap gap-2 mt-3 p-3 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg">
                  <span className="text-sm text-gray-600 flex items-center gap-1 mr-2">
                    <span>🤖</span> Asistent AI:
                  </span>
                  <button
                    type="button"
                    onClick={handleAiAssist}
                    disabled={aiAssisting || !formData.projectDescription.trim()}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium shadow-sm"
                  >
                    {aiAssisting ? (
                      <>
                        <span className="animate-spin">⏳</span>
                        Analizez...
                      </>
                    ) : (
                      <>
                        <span>💡</span>
                        Întrebări tehnice
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleEnhanceDescription}
                    disabled={enhancing || !formData.projectDescription.trim()}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium shadow-sm"
                  >
                    {enhancing ? (
                      <>
                        <span className="animate-spin">⏳</span>
                        Îmbunătățesc...
                      </>
                    ) : (
                      <>
                        <span>✨</span>
                        Îmbunătățește descrierea
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Upload Caiet de Sarcini */}
              <div className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-4">
                <label className="block text-gray-600 text-sm mb-2">
                  📁 Caiet de sarcini (opțional)
                </label>
                <p className="text-gray-500 text-xs mb-3">
                  Dacă aveți un caiet de sarcini sau specificații tehnice, îl puteți încărca aici (PDF, DOC, DOCX, JPG, PNG - max 10MB)
                </p>
                
                <input
                  ref={specFileRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  onChange={handleSpecificationUpload}
                  className="hidden"
                />
                
                {formData.specificationFileName ? (
                  <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg p-3">
                    <span className="text-green-600">✅</span>
                    <span className="text-green-700 flex-1">{formData.specificationFileName}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, specificationFileName: '', attachments: prev.attachments.slice(0, -1) }));
                        if (specFileRef.current) specFileRef.current.value = '';
                      }}
                      className="text-red-500 hover:text-red-600 text-sm"
                    >
                      ✕ Șterge
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => specFileRef.current?.click()}
                    disabled={uploadingSpec}
                    className="w-full flex items-center justify-center gap-2 py-3 border border-gray-300 rounded-lg text-gray-600 hover:text-gray-800 hover:border-gray-400 hover:bg-gray-100 transition-colors"
                  >
                    {uploadingSpec ? (
                      <>
                        <span className="animate-spin">⏳</span>
                        Se încarcă...
                      </>
                    ) : (
                      <>
                        <span>📤</span>
                        Încarcă fișier
                      </>
                    )}
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-600 text-sm mb-1">Termen dorit</label>
                  <input
                    type="text"
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    placeholder="ex: 3 luni, până în iulie 2026"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 text-sm mb-1">Buget estimat</label>
                  <select
                    value={formData.budgetRange}
                    onChange={(e) => setFormData({ ...formData, budgetRange: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  >
                    <option value="">Selectați...</option>
                    {budgetRanges.map((range) => (
                      <option key={range} value={range}>{range}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              {/* Custom Budget Input */}
              <div>
                <label className="block text-gray-600 text-sm mb-1">
                  Sau specificați suma exactă (opțional)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={formData.budgetCustom}
                    onChange={(e) => setFormData({ ...formData, budgetCustom: e.target.value })}
                    className="flex-1 px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    placeholder="ex: 25.000"
                  />
                  <span className="text-gray-600 font-medium">EUR</span>
                </div>
                <p className="text-gray-500 text-xs mt-1">
                  Dacă aveți un buget specific alocat, menționați-l pentru o ofertă mai precisă
                </p>
              </div>
            </div>
          </div>

          {/* What we offer */}
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-blue-700 mb-3">Ce veți primi în oferta noastră:</h3>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-center gap-2">
                <span className="text-green-600">✓</span>
                Soluție tehnică detaliată adaptată cerințelor dumneavoastră
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-600">✓</span>
                Lista de componente (PLC, senzori, actuatoare, tablou electric)
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-600">✓</span>
                Estimare costuri transparentă (hardware, programare, montaj)
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-600">✓</span>
                Termene de execuție și grafic de implementare
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-600">✓</span>
                Condiții de garanție și suport post-vânzare
              </li>
            </ul>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600">
              ❌ {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 transition-all text-lg shadow-lg"
          >
            {submitting ? '⏳ Se trimite...' : '📤 Trimite Solicitarea'}
          </button>

          <p className="text-center text-gray-500 text-sm">
            Prin trimiterea formularului, sunteți de acord cu{' '}
            <Link href="/politica-confidentialitate" className="text-blue-600 hover:underline">
              politica de confidențialitate
            </Link>.
          </p>
        </form>

        {/* Contact alternatives */}
        <div className="mt-12 text-center p-6 bg-white border border-gray-200 rounded-2xl shadow-sm">
          <p className="text-gray-600 mb-4">
            Preferați să ne contactați direct?
          </p>
          <div className="flex flex-wrap justify-center gap-6 text-gray-700">
            <a href="tel:+40722123456" className="flex items-center gap-2 hover:text-blue-600 transition-colors">
              📞 +40 722 123 456
            </a>
            <a href="mailto:office@prevcortpm.ro" className="flex items-center gap-2 hover:text-blue-600 transition-colors">
              ✉️ office@prevcortpm.ro
            </a>
          </div>
        </div>

      {/* AI Questions Modal */}
      {showAiModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <span>🤖</span> Asistent Tehnic AI
                  </h3>
                  <p className="text-blue-100 text-sm mt-1">
                    Proiect identificat: <strong>{aiProjectType}</strong>
                  </p>
                </div>
                <button
                  onClick={() => setShowAiModal(false)}
                  className="text-white/80 hover:text-white text-2xl"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Body - Questions */}
            <div className="p-6 overflow-y-auto max-h-[50vh]">
              <p className="text-gray-600 mb-4">
                Răspundeți la întrebările de mai jos pentru a ne ajuta să înțelegem mai bine cerințele dumneavoastră:
              </p>
              
              <div className="space-y-4">
                {aiQuestions.map((q) => (
                  <div 
                    key={q.id} 
                    className={`p-4 rounded-lg border ${
                      q.importance === 'critical' 
                        ? 'bg-red-50 border-red-200' 
                        : q.importance === 'important' 
                          ? 'bg-blue-50 border-blue-200' 
                          : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-start gap-2 mb-2">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                        q.importance === 'critical' 
                          ? 'bg-red-200 text-red-700' 
                          : q.importance === 'important' 
                            ? 'bg-blue-200 text-blue-700' 
                            : 'bg-gray-200 text-gray-600'
                      }`}>
                        {q.category}
                      </span>
                      {q.importance === 'critical' && (
                        <span className="text-xs text-red-600">* Important</span>
                      )}
                    </div>
                    <label className="block text-gray-800 font-medium mb-2">
                      {q.id}. {q.question}
                    </label>
                    {q.hint && (
                      <p className="text-xs text-gray-500 mb-2 italic">💡 {q.hint}</p>
                    )}
                    <input
                      type="text"
                      value={q.answer || ''}
                      onChange={(e) => updateQuestionAnswer(q.id, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                      placeholder="Răspunsul dumneavoastră..."
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-gray-200 p-4 bg-gray-50 flex justify-between items-center">
              <p className="text-sm text-gray-500">
                {aiQuestions.filter(q => q.answer?.trim()).length} din {aiQuestions.length} întrebări completate
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowAiModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Anulează
                </button>
                <button
                  onClick={applyAiAnswers}
                  disabled={aiQuestions.filter(q => q.answer?.trim()).length === 0}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  ✓ Aplică răspunsurile
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
