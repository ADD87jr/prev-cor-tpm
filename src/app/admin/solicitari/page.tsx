'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Solicitare {
  id: number;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  projectDescription: string;
  deadline: string;
  budgetRange: string;
  budgetCustom: string;
  specificationFileName: string;
  attachments: string;
  status: 'new' | 'in-progress' | 'offer-sent' | 'accepted' | 'rejected';
  notes: string;
  assignedProjectId: number | null;
  createdAt: string;
}

export default function AdminSolicitariPage() {
  const router = useRouter();
  const [solicitari, setSolicitari] = useState<Solicitare[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSolicitare, setSelectedSolicitare] = useState<Solicitare | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadSolicitari();
  }, [filter]);

  const loadSolicitari = async () => {
    try {
      const url = filter === 'all' 
        ? '/api/solicita-oferta' 
        : `/api/solicita-oferta?status=${filter}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setSolicitari(data.solicitari);
      }
    } catch (err) {
      console.error('Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (solicitare: Solicitare) => {
    setCreating(true);
    try {
      // Creează proiect în AI Studio
      const res = await fetch('/api/ai-studio/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `Proiect ${solicitare.companyName}`,
          client: solicitare.companyName,
          description: solicitare.projectDescription,
          requirements: {
            projectName: `Automatizare ${solicitare.companyName}`,
            clientName: solicitare.companyName,
            contactPerson: solicitare.contactPerson,
            email: solicitare.email,
            phone: solicitare.phone,
            description: solicitare.projectDescription,
            timeline: solicitare.deadline,
            budget: solicitare.budgetCustom || solicitare.budgetRange,
            specificationFile: solicitare.specificationFileName,
            attachments: solicitare.attachments,
            objectives: [],
            inputs: [],
            outputs: [],
            plcType: '',
            hmiRequired: false,
            mechanicalNeeds: [],
            electricalNeeds: [],
            pneumaticNeeds: [],
            hydraulicNeeds: [],
            constraints: [],
          },
        }),
      });

      const data = await res.json();
      if (data.success) {
        // Actualizează solicitarea cu ID-ul proiectului
        await fetch(`/api/solicita-oferta/${solicitare.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'in-progress',
            assignedProjectId: data.project.id,
          }),
        });

        // Navighează la proiect
        router.push(`/admin/ai-studio/project/${data.project.id}`);
      } else {
        alert('Eroare la crearea proiectului: ' + (data.error || 'Necunoscută'));
      }
    } catch (error) {
      console.error('Create project error:', error);
      alert('Eroare la crearea proiectului');
    } finally {
      setCreating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      'new': { bg: 'bg-blue-500/20', text: 'text-blue-400', label: '🆕 Nouă' },
      'in-progress': { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: '🔄 În lucru' },
      'offer-sent': { bg: 'bg-purple-500/20', text: 'text-purple-400', label: '📤 Ofertă trimisă' },
      'accepted': { bg: 'bg-green-500/20', text: 'text-green-400', label: '✅ Acceptată' },
      'rejected': { bg: 'bg-red-500/20', text: 'text-red-400', label: '❌ Refuzată' },
    };
    const badge = badges[status] || badges['new'];
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  const stats = {
    total: solicitari.length,
    new: solicitari.filter(s => s.status === 'new').length,
    inProgress: solicitari.filter(s => s.status === 'in-progress').length,
    offerSent: solicitari.filter(s => s.status === 'offer-sent').length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/admin" className="text-slate-400 hover:text-white transition-colors">
                ← Admin
              </Link>
              <h1 className="text-xl font-bold text-white">📬 Solicitări Oferte</h1>
            </div>
            <Link
              href="/admin/ai-studio"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              🤖 AI Studio
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-white">{stats.total}</div>
            <div className="text-slate-400 text-sm">Total</div>
          </div>
          <div className="bg-blue-900/30 border border-blue-500/30 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-blue-400">{stats.new}</div>
            <div className="text-slate-400 text-sm">Noi</div>
          </div>
          <div className="bg-yellow-900/30 border border-yellow-500/30 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-yellow-400">{stats.inProgress}</div>
            <div className="text-slate-400 text-sm">În lucru</div>
          </div>
          <div className="bg-purple-900/30 border border-purple-500/30 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-purple-400">{stats.offerSent}</div>
            <div className="text-slate-400 text-sm">Oferte trimise</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { value: 'all', label: 'Toate' },
            { value: 'new', label: '🆕 Noi' },
            { value: 'in-progress', label: '🔄 În lucru' },
            { value: 'offer-sent', label: '📤 Ofertă trimisă' },
            { value: 'accepted', label: '✅ Acceptate' },
            { value: 'rejected', label: '❌ Refuzate' },
          ].map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                filter === f.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lista solicitări */}
          <div className="lg:col-span-2 space-y-4">
            {loading ? (
              <div className="text-center text-slate-400 py-12">⏳ Se încarcă...</div>
            ) : solicitari.length === 0 ? (
              <div className="text-center text-slate-400 py-12 bg-slate-800/50 rounded-xl">
                📭 Nicio solicitare {filter !== 'all' && 'în această categorie'}
              </div>
            ) : (
              solicitari.map(sol => (
                <div
                  key={sol.id}
                  onClick={() => setSelectedSolicitare(sol)}
                  className={`bg-slate-800/50 border rounded-xl p-4 cursor-pointer transition-all ${
                    selectedSolicitare?.id === sol.id
                      ? 'border-blue-500 ring-2 ring-blue-500/20'
                      : 'border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-white font-semibold">{sol.companyName}</h3>
                      <p className="text-slate-400 text-sm">{sol.contactPerson}</p>
                    </div>
                    {getStatusBadge(sol.status)}
                  </div>
                  <p className="text-slate-300 text-sm line-clamp-2 mb-3">
                    {sol.projectDescription}
                  </p>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>#{sol.id}</span>
                    <span>{new Date(sol.createdAt).toLocaleDateString('ro-RO')}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Detalii solicitare selectată */}
          <div className="lg:col-span-1">
            {selectedSolicitare ? (
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 sticky top-24">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-white">Detalii Solicitare</h3>
                  <button
                    onClick={() => setSelectedSolicitare(null)}
                    className="text-slate-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4 text-sm">
                  <div>
                    <p className="text-slate-400">Companie</p>
                    <p className="text-white font-medium">{selectedSolicitare.companyName}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Contact</p>
                    <p className="text-white">{selectedSolicitare.contactPerson}</p>
                  </div>
                  <div className="flex gap-4">
                    <div>
                      <p className="text-slate-400">Email</p>
                      <a href={`mailto:${selectedSolicitare.email}`} className="text-blue-400 hover:underline">
                        {selectedSolicitare.email}
                      </a>
                    </div>
                    <div>
                      <p className="text-slate-400">Telefon</p>
                      <a href={`tel:${selectedSolicitare.phone}`} className="text-blue-400 hover:underline">
                        {selectedSolicitare.phone}
                      </a>
                    </div>
                  </div>
                  <div>
                    <p className="text-slate-400">Descriere proiect</p>
                    <p className="text-white whitespace-pre-wrap bg-slate-900/50 p-3 rounded-lg max-h-40 overflow-y-auto">
                      {selectedSolicitare.projectDescription}
                    </p>
                  </div>
                  {selectedSolicitare.deadline && (
                    <div>
                      <p className="text-slate-400">Termen dorit</p>
                      <p className="text-white">{selectedSolicitare.deadline}</p>
                    </div>
                  )}
                  {selectedSolicitare.budgetRange && (
                    <div>
                      <p className="text-slate-400">Buget estimat</p>
                      <p className="text-white">{selectedSolicitare.budgetRange}</p>
                    </div>
                  )}
                  {selectedSolicitare.budgetCustom && (
                    <div>
                      <p className="text-slate-400">Buget specificat</p>
                      <p className="text-white font-semibold text-green-400">{selectedSolicitare.budgetCustom} EUR</p>
                    </div>
                  )}
                  {selectedSolicitare.specificationFileName && (
                    <div>
                      <p className="text-slate-400">📁 Caiet de sarcini</p>
                      <div className="flex items-center gap-2">
                        <span className="text-blue-400">{selectedSolicitare.specificationFileName}</span>
                        {selectedSolicitare.attachments && (
                          <a
                            href={JSON.parse(selectedSolicitare.attachments)[0]}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs px-2 py-1 bg-blue-600/30 text-blue-300 rounded hover:bg-blue-600/50"
                          >
                            Descarcă
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="mt-6 space-y-2">
                  {selectedSolicitare.status === 'new' && (
                    <button
                      onClick={() => handleCreateProject(selectedSolicitare)}
                      disabled={creating}
                      className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-purple-700 disabled:opacity-50"
                    >
                      {creating ? '⏳ Se creează...' : '🤖 Creează Proiect în AI Studio'}
                    </button>
                  )}
                  {selectedSolicitare.assignedProjectId && (
                    <Link
                      href={`/admin/ai-studio/project/${selectedSolicitare.assignedProjectId}`}
                      className="block w-full py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 text-center"
                    >
                      📂 Vezi Proiectul
                    </Link>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <a
                      href={`mailto:${selectedSolicitare.email}`}
                      className="py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 text-center"
                    >
                      ✉️ Email
                    </a>
                    <a
                      href={`tel:${selectedSolicitare.phone}`}
                      className="py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 text-center"
                    >
                      📞 Sună
                    </a>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-800/30 border border-slate-700 border-dashed rounded-xl p-8 text-center text-slate-500">
                👆 Selectează o solicitare pentru a vedea detaliile
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
