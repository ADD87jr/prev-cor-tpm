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

const phases = [
  { id: 1, name: 'Cerințe', icon: '📋', color: 'blue', path: '/ai-studio/intake' },
  { id: 2, name: 'Soluție Tehnică', icon: '💡', color: 'purple', path: '/ai-studio/solutie' },
  { id: 3, name: 'Mecanic 2D/3D', icon: '⚙️', color: 'orange', path: '/ai-studio/mecanic' },
  { id: 4, name: 'Electric', icon: '⚡', color: 'yellow', path: '/ai-studio/electric' },
  { id: 5, name: 'Pneumatic', icon: '💨', color: 'cyan', path: '/ai-studio/pneumatic' },
  { id: 6, name: 'Hidraulic', icon: '💧', color: 'indigo', path: '/ai-studio/hidraulic' },
  { id: 7, name: 'PLC & HMI', icon: '🤖', color: 'green', path: '/ai-studio/plc' },
  { id: 8, name: 'Testare', icon: '🧪', color: 'pink', path: '/ai-studio/testare' },
  { id: 9, name: 'Livrare', icon: '📦', color: 'emerald', path: '/ai-studio/livrare' },
];

export default function AIStudioPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState({ total: 0, inProgress: 0, completed: 0 });

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const res = await fetch('/api/ai-studio/projects');
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || []);
        setStats(data.stats || { total: 0, inProgress: 0, completed: 0 });
      }
    } catch (err) {
      console.error('Load error:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
              <Image src="/logo.png" alt="PREV-COR" width={40} height={40} className="brightness-0 invert" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">PREV-COR AI Studio</h1>
              <p className="text-slate-400 text-sm">Platformă inteligentă pentru proiecte de automatizare</p>
            </div>
          </div>
          <Link 
            href="/ai-studio/intake"
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all shadow-lg shadow-blue-500/25"
          >
            + Proiect Nou
          </Link>
        </div>
      </header>

      {/* Stats */}
      <section className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/20 rounded-xl">
                <span className="text-3xl">📊</span>
              </div>
              <div>
                <p className="text-slate-400 text-sm">Total Proiecte</p>
                <p className="text-3xl font-bold text-white">{stats.total}</p>
              </div>
            </div>
          </div>
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-500/20 rounded-xl">
                <span className="text-3xl">🔄</span>
              </div>
              <div>
                <p className="text-slate-400 text-sm">În Lucru</p>
                <p className="text-3xl font-bold text-yellow-400">{stats.inProgress}</p>
              </div>
            </div>
          </div>
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500/20 rounded-xl">
                <span className="text-3xl">✅</span>
              </div>
              <div>
                <p className="text-slate-400 text-sm">Finalizate</p>
                <p className="text-3xl font-bold text-green-400">{stats.completed}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Workflow Phases */}
      <section className="max-w-7xl mx-auto px-6 py-8">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <span className="text-2xl">🔧</span> Etapele Proiectului
        </h2>
        <div className="grid grid-cols-3 md:grid-cols-9 gap-4">
          {phases.map((phase, index) => (
            <Link
              key={phase.id}
              href={phase.path}
              className="group relative bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-4 text-center hover:border-blue-500/50 hover:bg-slate-700/50 transition-all"
            >
              <div className="text-3xl mb-2">{phase.icon}</div>
              <p className="text-white text-xs font-medium">{phase.name}</p>
              <div className="absolute -top-2 -left-2 w-6 h-6 bg-slate-700 rounded-full text-xs text-slate-400 flex items-center justify-center border border-slate-600">
                {phase.id}
              </div>
              {index < phases.length - 1 && (
                <div className="hidden md:block absolute top-1/2 -right-2 transform -translate-y-1/2 text-slate-600">→</div>
              )}
            </Link>
          ))}
        </div>
      </section>

      {/* Quick Actions */}
      <section className="max-w-7xl mx-auto px-6 py-8">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <span className="text-2xl">⚡</span> Acțiuni Rapide
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            href="/ai-studio/intake"
            className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 border border-blue-500/30 rounded-2xl p-6 hover:border-blue-500/60 transition-all group"
          >
            <div className="text-4xl mb-4">📋</div>
            <h3 className="text-lg font-bold text-white mb-2">Upload Caiet de Sarcini</h3>
            <p className="text-slate-400 text-sm">Încarcă un PDF sau document cu cerințele clientului. AI-ul va extrage automat specificațiile.</p>
          </Link>
          <Link
            href="/ai-studio/chat"
            className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 border border-purple-500/30 rounded-2xl p-6 hover:border-purple-500/60 transition-all group"
          >
            <div className="text-4xl mb-4">💬</div>
            <h3 className="text-lg font-bold text-white mb-2">Discuție Tehnică cu AI</h3>
            <p className="text-slate-400 text-sm">Descrie cerințele verbal. AI-ul te va ghida să captezi toate detaliile importante.</p>
          </Link>
          <Link
            href="/ai-studio/templates"
            className="bg-gradient-to-br from-green-600/20 to-green-800/20 border border-green-500/30 rounded-2xl p-6 hover:border-green-500/60 transition-all group"
          >
            <div className="text-4xl mb-4">📑</div>
            <h3 className="text-lg font-bold text-white mb-2">Șabloane Proiecte</h3>
            <p className="text-slate-400 text-sm">Folosește șabloane predefinite pentru tipuri comune de proiecte automatizare.</p>
          </Link>
        </div>
      </section>

      {/* Recent Projects */}
      <section className="max-w-7xl mx-auto px-6 py-8">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <span className="text-2xl">📁</span> Proiecte Recente
        </h2>
        {projects.length === 0 ? (
          <div className="bg-slate-800/30 border border-slate-700 rounded-2xl p-12 text-center">
            <div className="text-6xl mb-4">🚀</div>
            <h3 className="text-xl font-bold text-white mb-2">Niciun proiect încă</h3>
            <p className="text-slate-400 mb-6">Creează primul tău proiect pentru a începe</p>
            <Link
              href="/ai-studio/intake"
              className="inline-flex px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all"
            >
              + Creează Proiect
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/ai-studio/project/${project.id}`}
                className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 hover:border-blue-500/50 transition-all flex items-center gap-4"
              >
                <div className="p-3 bg-blue-500/20 rounded-xl">
                  <span className="text-2xl">{phases[project.currentPhase - 1]?.icon || '📋'}</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-semibold">{project.name}</h3>
                  <p className="text-slate-400 text-sm">{project.client}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-400">Faza {project.currentPhase}/9</p>
                  <p className="text-xs text-slate-500">{phases[project.currentPhase - 1]?.name}</p>
                </div>
                <div className="w-32 h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"
                    style={{ width: `${(project.currentPhase / 9) * 100}%` }}
                  />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-700 mt-12">
        <div className="max-w-7xl mx-auto px-6 py-6 text-center text-slate-500 text-sm">
          <p>PREV-COR AI Studio © 2026 - Platformă AI pentru Proiecte de Automatizare Industrială</p>
          <p className="mt-1">Powered by Gemini AI • Fără costuri de personal</p>
        </div>
      </footer>
    </div>
  );
}
