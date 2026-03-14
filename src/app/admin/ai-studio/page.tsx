'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface Project {
  id: number;
  name: string;
  client: string;
  status: string;
  currentPhase: number;
  createdAt: string;
}

interface Solicitare {
  id: number;
  companyName: string;
  contactPerson: string;
  status: string;
  createdAt: string;
}

const phases = [
  { id: 1, name: 'Cerințe', icon: '📋', color: 'blue' },
  { id: 2, name: 'Soluție Tehnică', icon: '💡', color: 'purple' },
  { id: 3, name: 'Mecanic 2D/3D', icon: '⚙️', color: 'orange' },
  { id: 4, name: 'Electric', icon: '⚡', color: 'yellow' },
  { id: 5, name: 'Pneumatic', icon: '💨', color: 'cyan' },
  { id: 6, name: 'Hidraulic', icon: '💧', color: 'indigo' },
  { id: 7, name: 'PLC & HMI', icon: '🤖', color: 'green' },
  { id: 8, name: 'Testare', icon: '🧪', color: 'pink' },
  { id: 9, name: 'Livrare', icon: '📦', color: 'emerald' },
];

export default function AdminAIStudioPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [solicitari, setSolicitari] = useState<Solicitare[]>([]);
  const [stats, setStats] = useState({ total: 0, inProgress: 0, completed: 0, newRequests: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [projectsRes, solicitariRes] = await Promise.all([
        fetch('/api/ai-studio/projects'),
        fetch('/api/solicita-oferta?status=new'),
      ]);

      if (projectsRes.ok) {
        const data = await projectsRes.json();
        setProjects(data.projects || []);
        setStats(prev => ({ 
          ...prev, 
          total: data.stats?.total || 0,
          inProgress: data.stats?.inProgress || 0,
          completed: data.stats?.completed || 0,
        }));
      }

      if (solicitariRes.ok) {
        const data = await solicitariRes.json();
        setSolicitari(data.solicitari || []);
        setStats(prev => ({ ...prev, newRequests: data.solicitari?.length || 0 }));
      }
    } catch (err) {
      console.error('Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-slate-400 hover:text-white transition-colors">
              ← Admin
            </Link>
            <Image src="/logo.png" alt="PREV-COR TPM" width={48} height={48} className="rounded-lg" />
            <div>
              <h1 className="text-2xl font-bold text-white">PREV-COR TPM</h1>
              <p className="text-slate-400 text-sm">🤖 AI Studio - Platformă proiecte automatizare</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Link 
              href="/admin/solicitari"
              className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors relative"
            >
              📬 Solicitări
              {stats.newRequests > 0 && (
                <span className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {stats.newRequests}
                </span>
              )}
            </Link>
            <Link 
              href="/admin/ai-studio/intake"
              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all"
            >
              + Proiect Nou
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* New Requests Alert */}
        {stats.newRequests > 0 && (
          <Link
            href="/admin/solicitari"
            className="block mb-8 bg-blue-900/30 border border-blue-500/50 rounded-xl p-4 hover:bg-blue-900/50 transition-colors"
          >
            <div className="flex items-center gap-4">
              <span className="text-3xl">🔔</span>
              <div>
                <p className="text-white font-semibold">
                  {stats.newRequests} solicitare{stats.newRequests > 1 ? 'i' : ''} nouă de ofertă!
                </p>
                <p className="text-blue-300 text-sm">Click pentru a vedea și a crea proiecte</p>
              </div>
            </div>
          </Link>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <div className="text-3xl font-bold text-white">{stats.total}</div>
            <div className="text-slate-400 text-sm">Total Proiecte</div>
          </div>
          <div className="bg-yellow-900/30 border border-yellow-500/30 rounded-xl p-4">
            <div className="text-3xl font-bold text-yellow-400">{stats.inProgress}</div>
            <div className="text-slate-400 text-sm">În Lucru</div>
          </div>
          <div className="bg-green-900/30 border border-green-500/30 rounded-xl p-4">
            <div className="text-3xl font-bold text-green-400">{stats.completed}</div>
            <div className="text-slate-400 text-sm">Finalizate</div>
          </div>
          <div className="bg-blue-900/30 border border-blue-500/30 rounded-xl p-4">
            <div className="text-3xl font-bold text-blue-400">{stats.newRequests}</div>
            <div className="text-slate-400 text-sm">Solicitări Noi</div>
          </div>
        </div>

        {/* Workflow Phases Legend */}
        <div className="mb-8 bg-slate-800/30 border border-slate-700 rounded-xl p-4">
          <h3 className="text-white font-semibold mb-3">Etapele unui proiect:</h3>
          <div className="flex flex-wrap gap-3">
            {phases.map(phase => (
              <div key={phase.id} className="flex items-center gap-2 px-3 py-1 bg-slate-700/50 rounded-lg">
                <span>{phase.icon}</span>
                <span className="text-slate-300 text-sm">{phase.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Projects Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">📁 Proiecte</h2>
          </div>

          {loading ? (
            <div className="text-center text-slate-400 py-12">⏳ Se încarcă...</div>
          ) : projects.length === 0 ? (
            <div className="bg-slate-800/30 border border-slate-700 border-dashed rounded-xl p-12 text-center">
              <div className="text-5xl mb-4">🚀</div>
              <h3 className="text-xl font-bold text-white mb-2">Niciun proiect</h3>
              <p className="text-slate-400 mb-6">
                Creează un proiect nou sau procesează solicitările de ofertă
              </p>
              <div className="flex justify-center gap-4">
                <Link
                  href="/admin/ai-studio/intake"
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  + Proiect Nou
                </Link>
                {stats.newRequests > 0 && (
                  <Link
                    href="/admin/solicitari"
                    className="px-6 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600"
                  >
                    📬 Vezi Solicitări
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <div className="grid gap-4">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/admin/ai-studio/project/${project.id}`}
                  className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 hover:border-blue-500/50 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-500/20 rounded-xl">
                      <span className="text-2xl">{phases[project.currentPhase - 1]?.icon || '📋'}</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-white font-semibold">{project.name}</h3>
                      <p className="text-slate-400 text-sm">{project.client || 'Client nespecificat'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-slate-300 text-sm">
                        Faza {project.currentPhase}/9: {phases[project.currentPhase - 1]?.name}
                      </p>
                      <p className="text-slate-500 text-xs">
                        {new Date(project.createdAt).toLocaleDateString('ro-RO')}
                      </p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                      project.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                      project.status === 'in-progress' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-blue-500/20 text-blue-400'
                    }`}>
                      {project.status === 'completed' ? '✅ Finalizat' :
                       project.status === 'in-progress' ? '🔄 În lucru' : '📋 Nou'}
                    </div>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="mt-4">
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all"
                        style={{ width: `${(project.currentPhase / 9) * 100}%` }}
                      />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
