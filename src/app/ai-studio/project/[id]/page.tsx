'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Requirements {
  projectName: string;
  clientName: string;
  description: string;
  objectives: string[];
  constraints: string[];
  inputs: string[];
  outputs: string[];
  plcType: string;
  hmiRequired: boolean;
  mechanicalNeeds: string[];
  electricalNeeds: string[];
  pneumaticNeeds: string[];
  hydraulicNeeds: string[];
  timeline: string;
  budget: string;
}

interface Project {
  id: number;
  name: string;
  client: string;
  description: string;
  requirements: Requirements;
  currentPhase: number;
  status: string;
  createdAt: string;
  technicalProposal: unknown;
  mechanicalDesign: unknown;
  electricalDesign: unknown;
  pneumaticDesign: unknown;
  hydraulicDesign: unknown;
  plcCode: unknown;
  hmiDesign: unknown;
  testResults: unknown;
  deliveryNotes: unknown;
}

const phases = [
  { id: 1, name: 'Cerințe', icon: '📋', color: 'blue', description: 'Colectare cerințe de la client', field: 'requirements' },
  { id: 2, name: 'Soluție Tehnică', icon: '💡', color: 'purple', description: 'Propunere soluție și ofertă', field: 'technicalProposal' },
  { id: 3, name: 'Mecanic 2D/3D', icon: '⚙️', color: 'orange', description: 'Proiectare mecanică', field: 'mechanicalDesign' },
  { id: 4, name: 'Electric', icon: '⚡', color: 'yellow', description: 'Scheme electrice și tablouri', field: 'electricalDesign' },
  { id: 5, name: 'Pneumatic', icon: '💨', color: 'cyan', description: 'Diagrame pneumatice', field: 'pneumaticDesign' },
  { id: 6, name: 'Hidraulic', icon: '💧', color: 'indigo', description: 'Diagrame hidraulice', field: 'hydraulicDesign' },
  { id: 7, name: 'PLC & HMI', icon: '🤖', color: 'green', description: 'Programare și interfețe', field: 'plcCode' },
  { id: 8, name: 'Testare', icon: '🧪', color: 'pink', description: 'Verificare și validare', field: 'testResults' },
  { id: 9, name: 'Livrare', icon: '📦', color: 'emerald', description: 'Predare la client', field: 'deliveryNotes' },
];

// Component pentru afișarea conținutului unei faze
function PhaseContent({ phase, data }: { phase: typeof phases[0]; data: unknown }) {
  if (!data) {
    return <p className="text-slate-400 italic">Nu există date pentru această fază.</p>;
  }

  // Parsează dacă e string JSON
  let content = data;
  if (typeof data === 'string') {
    try {
      content = JSON.parse(data);
    } catch {
      return <pre className="text-white text-sm whitespace-pre-wrap">{data}</pre>;
    }
  }

  // Render recursiv pentru obiecte/arrays
  const renderValue = (value: unknown, indent = 0): JSX.Element => {
    if (value === null || value === undefined) return <span className="text-slate-500">-</span>;
    if (typeof value === 'boolean') return <span className={value ? 'text-green-400' : 'text-red-400'}>{value ? 'Da' : 'Nu'}</span>;
    if (typeof value === 'number') return <span className="text-blue-400">{value}</span>;
    if (typeof value === 'string') return <span className="text-white">{value}</span>;
    
    if (Array.isArray(value)) {
      if (value.length === 0) return <span className="text-slate-500">[]</span>;
      return (
        <ul className="space-y-1 ml-4">
          {value.map((item, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="text-slate-500">•</span>
              {renderValue(item, indent + 1)}
            </li>
          ))}
        </ul>
      );
    }
    
    if (typeof value === 'object') {
      return (
        <div className="space-y-2 ml-4 border-l border-slate-700 pl-4">
          {Object.entries(value as Record<string, unknown>).map(([key, val]) => (
            <div key={key}>
              <span className="text-purple-400 font-medium">{formatKey(key)}:</span>
              <div className="ml-2">{renderValue(val, indent + 1)}</div>
            </div>
          ))}
        </div>
      );
    }
    
    return <span className="text-slate-400">{String(value)}</span>;
  };

  const formatKey = (key: string): string => {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  };

  return (
    <div className="space-y-4 text-sm">
      {typeof content === 'object' && content !== null ? (
        Object.entries(content as Record<string, unknown>).map(([key, value]) => (
          <div key={key} className="bg-slate-900/50 rounded-lg p-4">
            <h4 className="text-purple-400 font-semibold mb-2 text-base">{formatKey(key)}</h4>
            {renderValue(value)}
          </div>
        ))
      ) : (
        renderValue(content)
      )}
    </div>
  );
}

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedPhase, setSelectedPhase] = useState<number | null>(null);

  useEffect(() => {
    loadProject();
  }, [id]);

  const loadProject = async () => {
    try {
      const res = await fetch(`/api/ai-studio/projects/${id}`);
      if (res.ok) {
        const data = await res.json();
        setProject(data.project);
      } else {
        router.push('/ai-studio');
      }
    } catch (err) {
      console.error('Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePhase = async (phaseId: number) => {
    if (!project) return;
    setGenerating(true);

    try {
      const response = await fetch(`/api/ai-studio/generate-phase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          phaseId,
          requirements: project.requirements,
        }),
      });

      const data = await response.json();
      if (data.success) {
        await loadProject(); // Reload to get updated data
      } else {
        alert('Eroare: ' + (data.error || 'Nu am putut genera'));
      }
    } catch (error) {
      alert('Eroare de conexiune');
    } finally {
      setGenerating(false);
    }
  };

  const handleAdvancePhase = async () => {
    if (!project || project.currentPhase >= 9) return;
    
    try {
      await fetch(`/api/ai-studio/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPhase: project.currentPhase + 1,
          status: project.currentPhase + 1 === 9 ? 'completed' : 'in-progress',
        }),
      });
      await loadProject();
    } catch (error) {
      console.error('Advance error:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">⏳ Se încarcă proiectul...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">❌ Proiect negăsit</div>
      </div>
    );
  }

  const currentPhaseData = phases[project.currentPhase - 1];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Link href="/ai-studio" className="text-slate-400 hover:text-white transition-colors">
                ← Înapoi
              </Link>
              <div>
                <h1 className="text-xl font-bold text-white">{project.name}</h1>
                <p className="text-slate-400 text-sm">{project.client || 'Client nespecificat'}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                project.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                project.status === 'in-progress' ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-blue-500/20 text-blue-400'
              }`}>
                {project.status === 'completed' ? '✅ Finalizat' :
                 project.status === 'in-progress' ? '🔄 În lucru' : '📋 Intake'}
              </span>
            </div>
          </div>

          {/* Phase Progress */}
          <div className="flex items-center gap-1 overflow-x-auto pb-2">
            {phases.map((phase, index) => (
              <div key={phase.id} className="flex items-center">
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                  phase.id === project.currentPhase 
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white' 
                    : phase.id < project.currentPhase
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-slate-800 text-slate-500'
                }`}>
                  <span>{phase.icon}</span>
                  <span className="text-xs font-medium whitespace-nowrap">{phase.name}</span>
                  {phase.id < project.currentPhase && <span>✓</span>}
                </div>
                {index < phases.length - 1 && (
                  <div className={`w-4 h-0.5 ${
                    phase.id < project.currentPhase ? 'bg-green-500' : 'bg-slate-700'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Content - Current Phase */}
          <div className="lg:col-span-2 space-y-6">
            {/* Current Phase Card */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="text-4xl">{currentPhaseData?.icon}</div>
                  <div>
                    <h2 className="text-xl font-bold text-white">
                      Faza {project.currentPhase}: {currentPhaseData?.name}
                    </h2>
                    <p className="text-slate-400">{currentPhaseData?.description}</p>
                  </div>
                </div>
              </div>

              {/* Phase Content */}
              <div className="space-y-4">
                {project.currentPhase === 1 && (
                  <div className="bg-slate-700/50 rounded-xl p-4">
                    <h3 className="text-white font-medium mb-3">📋 Cerințe Extrase</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-slate-400">Obiective:</p>
                        <ul className="text-white">
                          {project.requirements?.objectives?.map((o, i) => (
                            <li key={i}>• {o}</li>
                          )) || <li className="text-slate-500">Niciun obiectiv</li>}
                        </ul>
                      </div>
                      <div>
                        <p className="text-slate-400">Intrări:</p>
                        <ul className="text-green-400">
                          {project.requirements?.inputs?.map((i, idx) => (
                            <li key={idx}>↗ {i}</li>
                          )) || <li className="text-slate-500">Nespecificate</li>}
                        </ul>
                      </div>
                      <div>
                        <p className="text-slate-400">Ieșiri:</p>
                        <ul className="text-blue-400">
                          {project.requirements?.outputs?.map((o, i) => (
                            <li key={i}>↘ {o}</li>
                          )) || <li className="text-slate-500">Nespecificate</li>}
                        </ul>
                      </div>
                      <div>
                        <p className="text-slate-400">PLC:</p>
                        <p className="text-white">{project.requirements?.plcType || 'De stabilit'}</p>
                        <p className="text-slate-400 mt-2">HMI:</p>
                        <p className="text-white">{project.requirements?.hmiRequired ? 'Da' : 'Nu'}</p>
                      </div>
                    </div>
                  </div>
                )}

                {project.currentPhase >= 2 && (
                  <button
                    onClick={() => handleGeneratePhase(project.currentPhase)}
                    disabled={generating}
                    className="w-full py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 transition-all"
                  >
                    {generating ? '🔄 Se generează cu AI...' : `🤖 Generează ${currentPhaseData?.name}`}
                  </button>
                )}
              </div>

              {/* Advance to Next Phase */}
              {project.currentPhase < 9 && (
                <div className="mt-6 pt-6 border-t border-slate-700">
                  <button
                    onClick={handleAdvancePhase}
                    className="w-full py-3 bg-green-600 text-white font-medium rounded-xl hover:bg-green-700 transition-all"
                  >
                    ✅ Finalizează {currentPhaseData?.name} → Treci la {phases[project.currentPhase]?.name}
                  </button>
                </div>
              )}
            </div>

            {/* Phase History */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">📊 Istoric Faze (click pentru detalii)</h3>
              <div className="space-y-3">
                {phases.slice(0, project.currentPhase).map((phase) => (
                  <button
                    key={phase.id}
                    onClick={() => setSelectedPhase(selectedPhase === phase.id ? null : phase.id)}
                    className={`w-full text-left p-3 rounded-xl transition-all ${
                      selectedPhase === phase.id 
                        ? 'bg-purple-600/30 border border-purple-500' 
                        : 'bg-slate-700/30 hover:bg-slate-700/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{phase.icon}</span>
                        <span className="text-white">{phase.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-green-400 text-sm">✓ Completat</span>
                        <span className="text-slate-400">{selectedPhase === phase.id ? '▼' : '▶'}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Selected Phase Details */}
            {selectedPhase && (
              <div className="bg-slate-800/50 border border-purple-500/50 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    {phases[selectedPhase - 1]?.icon} {phases[selectedPhase - 1]?.name}
                  </h3>
                  <button 
                    onClick={() => setSelectedPhase(null)}
                    className="text-slate-400 hover:text-white"
                  >
                    ✕ Închide
                  </button>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  <PhaseContent 
                    phase={phases[selectedPhase - 1]} 
                    data={
                      selectedPhase === 1 ? project.requirements :
                      selectedPhase === 2 ? project.technicalProposal :
                      selectedPhase === 3 ? project.mechanicalDesign :
                      selectedPhase === 4 ? project.electricalDesign :
                      selectedPhase === 5 ? project.pneumaticDesign :
                      selectedPhase === 6 ? project.hydraulicDesign :
                      selectedPhase === 7 ? project.plcCode :
                      selectedPhase === 8 ? project.testResults :
                      selectedPhase === 9 ? project.deliveryNotes : null
                    }
                  />
                </div>
              </div>
            )}
          </div>

          {/* Sidebar - Project Info */}
          <div className="space-y-6">
            {/* Quick Info */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">ℹ️ Informații Proiect</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-slate-400">Descriere</p>
                  <p className="text-white">{project.requirements?.description || project.description || '-'}</p>
                </div>
                <div>
                  <p className="text-slate-400">Termen</p>
                  <p className="text-white">{project.requirements?.timeline || 'Nespecificat'}</p>
                </div>
                <div>
                  <p className="text-slate-400">Buget</p>
                  <p className="text-white">{project.requirements?.budget || 'Nespecificat'}</p>
                </div>
                <div>
                  <p className="text-slate-400">Creat la</p>
                  <p className="text-white">{new Date(project.createdAt).toLocaleDateString('ro-RO')}</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">⚡ Acțiuni Rapide</h3>
              <div className="space-y-2">
                <Link
                  href={`/ai-studio/project/${id}/export`}
                  className="block w-full py-2 px-4 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors text-center"
                >
                  📄 Export PDF
                </Link>
                <Link
                  href={`/ai-studio/project/${id}/edit`}
                  className="block w-full py-2 px-4 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors text-center"
                >
                  ✏️ Editează Cerințe
                </Link>
                <button
                  onClick={() => {
                    if (confirm('Sigur vrei să ștergi acest proiect?')) {
                      fetch(`/api/ai-studio/projects/${id}`, { method: 'DELETE' })
                        .then(() => router.push('/ai-studio'));
                    }
                  }}
                  className="w-full py-2 px-4 bg-red-900/30 text-red-400 rounded-lg hover:bg-red-900/50 transition-colors"
                >
                  🗑️ Șterge Proiect
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
