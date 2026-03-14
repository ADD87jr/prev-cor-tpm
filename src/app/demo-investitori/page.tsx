'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';

interface DemoProject {
  id: number;
  clientName: string;
  clientEmail: string;
  projectName: string;
  status: string;
  createdAt: string;
  emailSent: number;
}

// Workflow steps
const workflowSteps = [
  { id: 1, icon: '📝', title: 'Cerere', color: 'from-blue-500 to-blue-600' },
  { id: 2, icon: '🤖', title: 'AI', color: 'from-purple-500 to-purple-600' },
  { id: 3, icon: '📄', title: 'PDF', color: 'from-indigo-500 to-indigo-600' },
  { id: 4, icon: '✅', title: 'Validare', color: 'from-green-500 to-green-600' },
  { id: 5, icon: '📧', title: 'Email', color: 'from-orange-500 to-orange-600' },
  { id: 6, icon: '📊', title: 'Arhivare', color: 'from-teal-500 to-teal-600' }
];

export default function DemoInvestitoriPage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [formMessage, setFormMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');
  const [recentProjects, setRecentProjects] = useState<DemoProject[]>([]);
  const [stats, setStats] = useState({ total: 0 });
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [lastProject, setLastProject] = useState<{name: string, id: number} | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const res = await fetch('/api/demo-investitori');
      if (res.ok) {
        const data = await res.json();
        setRecentProjects(data.projects || []);
        setStats({ total: data.total || 0 });
      }
    } catch (err) {
      console.error('Load error:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const form = formRef.current;
    if (!form) return;

    setIsProcessing(true);
    setFormMessage('');
    setCompletedSteps([]);
    setCurrentStep(0);

    const formData = new FormData(form);
    const clientName = formData.get('clientName') as string;
    const clientEmail = formData.get('clientEmail') as string;
    const projectName = formData.get('projectName') as string;

    try {
      // Animatie workflow
      for (let step = 1; step <= 6; step++) {
        setCurrentStep(step);
        await new Promise(r => setTimeout(r, 400));
        setCompletedSteps(prev => [...prev, step]);
      }

      // Call API
      const response = await fetch('/api/demo-investitori', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setMessageType('success');
        setFormMessage(`✅ Proiect #DEMO-${String(result.projectId).padStart(5, '0')} procesat cu succes! ${result.emailSent ? 'Email trimis cu PDF atașat.' : 'PDF generat.'}`);
        setLastProject({ name: projectName, id: result.projectId });
        setShowPdfPreview(true);
        form.reset();
        loadProjects();
      } else {
        setMessageType('error');
        setFormMessage(`❌ Eroare: ${result.error || 'Procesare eșuată'}`);
      }
    } catch (error) {
      setMessageType('error');
      setFormMessage(`❌ Eroare de conexiune: ${error}`);
    } finally {
      setIsProcessing(false);
      setCurrentStep(0);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)' }}>
      {/* Header */}
      <header className="text-center py-10 px-5">
        <div className="flex justify-center mb-4">
          <div className="p-4 bg-white shadow-xl rounded-2xl border border-gray-100">
            <Image src="/logo.png" alt="PREV-COR TPM" width={100} height={100} />
          </div>
        </div>
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 text-transparent bg-clip-text">
          Sistem Automatizare Proiecte
        </h1>
        <p className="text-gray-600">Procesare automată: PDF + Email + Arhivare</p>
      </header>

      {/* Stats */}
      <section className="py-4 px-5">
        <div className="max-w-4xl mx-auto flex justify-center gap-6 flex-wrap">
          <div className="flex items-center gap-2 bg-white px-5 py-2 rounded-full shadow border border-gray-100">
            <span className="text-xl">🏭</span>
            <span className="text-xl font-bold text-gray-800">{stats.total}</span>
            <span className="text-gray-500 text-sm">proiecte</span>
          </div>
          <div className="flex items-center gap-2 bg-white px-5 py-2 rounded-full shadow border border-gray-100">
            <span className="text-xl">⚡</span>
            <span className="text-xl font-bold text-gray-800">&lt;3s</span>
            <span className="text-gray-500 text-sm">procesare</span>
          </div>
          <div className="flex items-center gap-2 bg-white px-5 py-2 rounded-full shadow border border-gray-100">
            <span className="text-xl">✅</span>
            <span className="text-xl font-bold text-green-600">100%</span>
            <span className="text-gray-500 text-sm">succes</span>
          </div>
        </div>
      </section>

      {/* Main Form */}
      <section className="py-8 px-5">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white shadow-2xl rounded-3xl overflow-hidden border border-gray-100">
            
            {/* Form Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
              <h2 className="text-white font-bold text-lg">📋 Formular Proiect Nou</h2>
            </div>

            <div className="p-6">
              {/* Form */}
              <form ref={formRef} onSubmit={handleSubmit} className="space-y-4 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nume Client *</label>
                    <input 
                      type="text" 
                      name="clientName" 
                      placeholder="SC Exemplu SRL"
                      required
                      disabled={isProcessing}
                      className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors disabled:bg-gray-100 disabled:opacity-60"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Client *</label>
                    <input 
                      type="email" 
                      name="clientEmail" 
                      placeholder="client@exemplu.ro"
                      required
                      disabled={isProcessing}
                      className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors disabled:bg-gray-100 disabled:opacity-60"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nume Proiect *</label>
                  <input 
                    type="text" 
                    name="projectName" 
                    placeholder="Automatizare Linie Producție"
                    required
                    disabled={isProcessing}
                    className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors disabled:bg-gray-100 disabled:opacity-60"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fișier Atașat (opțional)</label>
                  <input 
                    type="file" 
                    name="projectFile"
                    disabled={isProcessing}
                    className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors disabled:bg-gray-100 disabled:opacity-60 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-500 file:text-white file:cursor-pointer"
                  />
                </div>
                <button 
                  type="submit"
                  disabled={isProcessing}
                  className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
                    isProcessing 
                      ? 'bg-gray-400 cursor-wait' 
                      : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 hover:shadow-lg'
                  } text-white`}
                >
                  {isProcessing ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                      </svg>
                      Procesare în curs...
                    </span>
                  ) : (
                    '🚀 Procesează Proiect'
                  )}
                </button>
              </form>

              {/* Workflow Progress */}
              {(isProcessing || completedSteps.length > 0) && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                    🔄 Workflow
                  </h3>
                  <div className="grid grid-cols-6 gap-2">
                    {workflowSteps.map((step) => (
                      <div 
                        key={step.id}
                        className={`relative rounded-lg p-3 text-center transition-all duration-300 ${
                          completedSteps.includes(step.id) 
                            ? 'bg-green-100 border-2 border-green-400' 
                            : currentStep === step.id 
                            ? 'bg-blue-100 border-2 border-blue-400 scale-105' 
                            : 'bg-gray-100 border-2 border-gray-200'
                        }`}
                      >
                        {completedSteps.includes(step.id) && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold">✓</div>
                        )}
                        {currentStep === step.id && !completedSteps.includes(step.id) && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                            <div className="w-2.5 h-2.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          </div>
                        )}
                        <div className="text-xl">{step.icon}</div>
                        <div className="text-xs font-medium text-gray-600 mt-1">{step.title}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Message */}
              {formMessage && (
                <div className={`p-4 rounded-xl text-center ${
                  messageType === 'success' 
                    ? 'bg-green-50 border border-green-200 text-green-700' 
                    : 'bg-red-50 border border-red-200 text-red-700'
                }`}>
                  {formMessage}
                  {messageType === 'success' && lastProject && (
                    <button 
                      onClick={() => setShowPdfPreview(true)}
                      className="ml-3 px-3 py-1 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600"
                    >
                      Vezi Preview PDF
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Recent Projects */}
      {recentProjects.length > 0 && (
        <section className="py-8 px-5">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl font-bold text-center mb-6 text-gray-800">
              📋 Proiecte Recente
            </h2>
            <div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-100">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">ID</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Proiect</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Client</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recentProjects.slice(0, 5).map((project) => (
                    <tr key={project.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-mono text-blue-600">
                        #DEMO-{String(project.id).padStart(5, '0')}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-800">{project.projectName}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{project.clientName}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          project.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {project.status === 'completed' ? '✅ OK' : '⏳'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {new Date(project.createdAt).toLocaleDateString('ro-RO')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* PDF Preview Modal */}
      {showPdfPreview && lastProject && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowPdfPreview(false)}>
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-5 text-white flex justify-between items-center rounded-t-2xl">
              <div>
                <h2 className="font-bold">📄 PDF Generat</h2>
                <p className="text-sm text-white/80">#{String(lastProject.id).padStart(5, '0')}</p>
              </div>
              <button onClick={() => setShowPdfPreview(false)} className="text-2xl hover:text-white/80">×</button>
            </div>
            <div className="p-6">
              <div className="border-2 border-gray-200 rounded-xl p-5 bg-gray-50 mb-4">
                <div className="flex items-center gap-3 mb-4 pb-3 border-b">
                  <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">PC</div>
                  <div>
                    <p className="font-bold text-gray-800">PREV-COR TPM</p>
                    <p className="text-xs text-gray-500">Industrial Automation</p>
                  </div>
                </div>
                <p className="font-medium text-gray-800 mb-2">Proiect: {lastProject.name}</p>
                <p className="text-sm text-gray-600">ID: #DEMO-{String(lastProject.id).padStart(5, '0')}</p>
                <p className="text-sm text-gray-600">Data: {new Date().toLocaleDateString('ro-RO')}</p>
                <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-green-700 text-sm font-medium">✅ Workflow completat cu succes</p>
                  <p className="text-green-600 text-xs mt-1">PDF trimis pe email</p>
                </div>
              </div>
              <p className="text-center text-gray-500 text-sm">
                PDF-ul complet a fost trimis pe email-ul clientului.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="py-6 px-5 bg-white border-t border-gray-200 mt-8">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-gray-800 font-medium">PREV-COR TPM</p>
          <p className="text-gray-400 text-sm">📧 office@prevcortpm.ro</p>
        </div>
      </footer>
    </div>
  );
}
