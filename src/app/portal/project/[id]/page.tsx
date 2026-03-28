'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

interface ProjectPortal {
  id: number;
  name: string;
  client: string;
  description: string;
  status: string;
  offerNumber?: string | null;
  offerStatus?: string | null;
  offerVersion?: number;
  currentPhase: number;
  createdAt: string;
  bomSummary: { itemCount: number; totalValue: number; currency: string };
  timeline: { estimatedDays: number; startDate: string };
  workflow: Array<{ step: string; status: string; approvedBy?: string; updatedAt?: string }>;
  feedback?: Array<{ id: number; clientName: string; feedbackType: string; message: string; createdAt: string }>;
  technicalSummary?: string;
}

const PHASES = [
  'Cerinte', 'Tehnic', 'Mecanic', 'Electric',
  'Pneumatic', 'Hidraulic', 'PLC/HMI', 'Testare', 'Livrare',
];

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  draft: { label: 'Schita', color: '#6b7280' },
  active: { label: 'Activ', color: '#3b82f6' },
  in_progress: { label: 'In Lucru', color: '#f59e0b' },
  review: { label: 'In Revizuire', color: '#8b5cf6' },
  approved: { label: 'Aprobat', color: '#10b981' },
  sent: { label: 'Trimis', color: '#06b6d4' },
  completed: { label: 'Finalizat', color: '#22c55e' },
  archived: { label: 'Arhivat', color: '#9ca3af' },
};

const WORKFLOW_LABELS: Record<string, string> = {
  technical_review: 'Revizie Tehnica',
  cost_approval: 'Aprobare Costuri',
  final_approval: 'Aprobare Finala',
  sent_to_client: 'Trimis la Client',
};

export default function ClientPortalPage() {
  const params = useParams();
  const id = (params?.id as string) || '';
  const [project, setProject] = useState<ProjectPortal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState<Array<{ id: number; clientName: string; feedbackType: string; message: string; createdAt: string }>>([]);
  const [fbName, setFbName] = useState('');
  const [fbMessage, setFbMessage] = useState('');
  const [fbType, setFbType] = useState('comment');
  const [fbSending, setFbSending] = useState(false);
  const [fbSent, setFbSent] = useState(false);
  const [fbError, setFbError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/ai-studio/portal/${id}`);
        if (!res.ok) throw new Error('Proiect negasit');
        const data = await res.json() as ProjectPortal;
        setProject(data);
        setFeedback(data.feedback || []);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Eroare');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, border: '3px solid #e5e7eb', borderTopColor: '#1e40af', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ color: '#64748b' }}>Se incarca...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );

  if (error || !project) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
      <div style={{ textAlign: 'center', padding: 40 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>Proiect Indisponibil</h1>
        <p style={{ color: '#64748b' }}>{error || 'Proiectul nu a fost gasit sau nu este public.'}</p>
      </div>
    </div>
  );

  const statusInfo = STATUS_MAP[project.status] || { label: project.status, color: '#6b7280' };
  const phasePercent = Math.round((project.currentPhase / PHASES.length) * 100);

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #1e40af 100%)', color: 'white', padding: '32px 24px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <span style={{ fontSize: 28 }}>🏭</span>
            <span style={{ fontSize: 14, opacity: 0.8, letterSpacing: 1 }}>PREV-COR TPM</span>
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>{project.name}</h1>
          <p style={{ opacity: 0.8, fontSize: 14 }}>Client: {project.client}</p>
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 16px' }}>
        {/* Status Card */}
        <div style={{ background: 'white', borderRadius: 12, padding: 24, marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1e293b' }}>Status Proiect</h2>
            <span style={{
              padding: '4px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600,
              background: statusInfo.color + '20', color: statusInfo.color,
            }}>
              {statusInfo.label}
            </span>
          </div>
          <p style={{ color: '#64748b', fontSize: 14, marginBottom: 16 }}>{project.description}</p>
          <div style={{ fontSize: 13, color: '#94a3b8' }}>
            Creat la: {new Date(project.createdAt).toLocaleDateString('ro-RO')}
          </div>
        </div>

        {/* Phase Progress */}
        <div style={{ background: 'white', borderRadius: 12, padding: 24, marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1e293b' }}>Progres Faze</h2>
            <span style={{ fontSize: 24, fontWeight: 700, color: '#1e40af' }}>{phasePercent}%</span>
          </div>
          <div style={{ height: 8, background: '#e5e7eb', borderRadius: 4, marginBottom: 16, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${phasePercent}%`, background: 'linear-gradient(90deg, #1e40af, #3b82f6)', borderRadius: 4, transition: 'width 0.5s' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {PHASES.map((phase, i) => (
              <div key={i} style={{
                padding: '8px 12px', borderRadius: 8, fontSize: 13, textAlign: 'center',
                background: i < project.currentPhase ? '#dcfce7' : i === project.currentPhase ? '#dbeafe' : '#f1f5f9',
                color: i < project.currentPhase ? '#16a34a' : i === project.currentPhase ? '#1e40af' : '#94a3b8',
                fontWeight: i === project.currentPhase ? 600 : 400,
                border: i === project.currentPhase ? '2px solid #3b82f6' : '1px solid transparent',
              }}>
                {i < project.currentPhase ? '✓ ' : ''}{phase}
              </div>
            ))}
          </div>
        </div>

        {/* BOM Summary */}
        {project.bomSummary.itemCount > 0 && (
          <div style={{ background: 'white', borderRadius: 12, padding: 24, marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1e293b', marginBottom: 16 }}>Sumar Componente</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ padding: 16, background: '#f0f9ff', borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#1e40af' }}>{project.bomSummary.itemCount}</div>
                <div style={{ fontSize: 13, color: '#64748b' }}>Componente</div>
              </div>
              <div style={{ padding: 16, background: '#f0fdf4', borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#16a34a' }}>
                  {project.bomSummary.totalValue.toLocaleString('ro-RO', { minimumFractionDigits: 2 })}
                </div>
                <div style={{ fontSize: 13, color: '#64748b' }}>Valoare ({project.bomSummary.currency})</div>
              </div>
            </div>
          </div>
        )}

        {/* Workflow Status */}
        {project.workflow.length > 0 && (
          <div style={{ background: 'white', borderRadius: 12, padding: 24, marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1e293b', marginBottom: 16 }}>Flux Aprobare</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {project.workflow.map((step, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                  background: step.status === 'approved' ? '#f0fdf4' : step.status === 'rejected' ? '#fef2f2' : '#f8fafc',
                  borderRadius: 8, border: `1px solid ${step.status === 'approved' ? '#bbf7d0' : step.status === 'rejected' ? '#fecaca' : '#e2e8f0'}`,
                }}>
                  <span style={{ fontSize: 20 }}>
                    {step.status === 'approved' ? '✅' : step.status === 'rejected' ? '❌' : '⏳'}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>
                      {WORKFLOW_LABELS[step.step] || step.step}
                    </div>
                    {step.approvedBy && (
                      <div style={{ fontSize: 12, color: '#64748b' }}>
                        De: {step.approvedBy} {step.updatedAt ? `- ${new Date(step.updatedAt).toLocaleDateString('ro-RO')}` : ''}
                      </div>
                    )}
                  </div>
                  <span style={{
                    padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600,
                    background: step.status === 'approved' ? '#dcfce7' : step.status === 'rejected' ? '#fee2e2' : '#f1f5f9',
                    color: step.status === 'approved' ? '#16a34a' : step.status === 'rejected' ? '#dc2626' : '#94a3b8',
                  }}>
                    {step.status === 'approved' ? 'Aprobat' : step.status === 'rejected' ? 'Respins' : 'In Asteptare'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Timeline */}
        {project.timeline.estimatedDays > 0 && (
          <div style={{ background: 'white', borderRadius: 12, padding: 24, marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1e293b', marginBottom: 16 }}>Timeline</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ padding: 16, background: '#faf5ff', borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#7c3aed' }}>{project.timeline.estimatedDays}</div>
                <div style={{ fontSize: 13, color: '#64748b' }}>Zile Estimate</div>
              </div>
              <div style={{ padding: 16, background: '#fffbeb', borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: 16, fontWeight: 600, color: '#d97706' }}>
                  {project.timeline.startDate ? new Date(project.timeline.startDate).toLocaleDateString('ro-RO') : '-'}
                </div>
                <div style={{ fontSize: 13, color: '#64748b' }}>Data Start</div>
              </div>
            </div>
          </div>
        )}

        {/* Feedback Form */}
        <div style={{ background: 'white', borderRadius: 12, padding: 24, marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1e293b', marginBottom: 16 }}>💬 Raspunde la oferta</h2>
          {fbSent && <div style={{ padding: 12, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, color: '#15803d', fontSize: 14, marginBottom: 16 }}>✅ Feedback trimis cu succes!</div>}
          {fbError && <div style={{ padding: 12, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#b91c1c', fontSize: 14, marginBottom: 16 }}>{fbError}</div>}
          <div style={{ marginBottom: 12 }}>
            <input value={fbName} onChange={e => setFbName(e.target.value)} placeholder="Numele dumneavoastra"
              style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
            {[
              { v: 'comment', l: '💬 Comentariu', bg: '#eff6ff', bc: '#3b82f6' },
              { v: 'approve', l: '✅ Aprob', bg: '#f0fdf4', bc: '#22c55e' },
              { v: 'reject', l: '❌ Resping', bg: '#fef2f2', bc: '#ef4444' },
              { v: 'revision', l: '✏️ Modificari', bg: '#fffbeb', bc: '#f59e0b' },
            ].map(ft => (
              <button key={ft.v} onClick={() => setFbType(ft.v)}
                style={{ padding: '10px', borderRadius: 8, border: `2px solid ${fbType === ft.v ? ft.bc : '#e2e8f0'}`, background: fbType === ft.v ? ft.bg : 'white', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
                {ft.l}
              </button>
            ))}
          </div>
          <div style={{ marginBottom: 12 }}>
            <textarea value={fbMessage} onChange={e => setFbMessage(e.target.value)} placeholder="Scrieti mesajul..."
              style={{ width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 14, minHeight: 80, boxSizing: 'border-box', resize: 'vertical' }} />
          </div>
          <button onClick={async () => {
            if (!fbMessage.trim()) return;
            setFbSending(true);
            setFbError('');
            setFbSent(false);
            try {
              const res = await fetch(`/api/ai-studio/portal/${id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: fbType, clientName: fbName || 'Client', message: fbMessage }),
              });
              const data = await res.json().catch(() => ({} as { error?: string }));
              if (res.ok) {
                setFbSent(true);
                setFeedback(prev => [{ id: Date.now(), clientName: fbName || 'Client', feedbackType: fbType, message: fbMessage, createdAt: new Date().toISOString() }, ...prev]);
                setProject(prev => prev ? { ...prev, offerStatus: fbType === 'approve' ? 'accepted' : fbType === 'reject' || fbType === 'revision' ? 'rejected' : prev.offerStatus, status: fbType === 'approve' ? 'approved' : fbType === 'reject' || fbType === 'revision' ? 'review' : prev.status } : prev);
                setFbMessage('');
              } else {
                setFbError(data.error || 'Nu am putut trimite raspunsul. Incearca din nou.');
              }
            } catch {
              setFbError('Nu am putut trimite raspunsul. Incearca din nou.');
            } finally { setFbSending(false); }
          }} disabled={!fbMessage.trim() || fbSending}
            style={{ width: '100%', padding: '12px', background: '#1e40af', color: 'white', borderRadius: 8, border: 'none', fontSize: 15, fontWeight: 600, cursor: 'pointer', opacity: !fbMessage.trim() || fbSending ? 0.5 : 1 }}>
            {fbSending ? 'Se trimite...' : 'Trimite raspuns'}
          </button>
        </div>

        {/* Previous Feedback */}
        {feedback.length > 0 && (
          <div style={{ background: 'white', borderRadius: 12, padding: 24, marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1e293b', marginBottom: 16 }}>Conversatie ({feedback.length})</h2>
            {feedback.map(fb => (
              <div key={fb.id} style={{ padding: 12, background: '#f8fafc', borderRadius: 8, marginBottom: 8, border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontWeight: 500, fontSize: 14, color: '#334155' }}>{fb.clientName}</span>
                  <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 500,
                    background: fb.feedbackType === 'approve' ? '#dcfce7' : fb.feedbackType === 'reject' ? '#fee2e2' : fb.feedbackType === 'revision' ? '#fef3c7' : '#dbeafe',
                    color: fb.feedbackType === 'approve' ? '#166534' : fb.feedbackType === 'reject' ? '#991b1b' : fb.feedbackType === 'revision' ? '#92400e' : '#1e40af' }}>
                    {fb.feedbackType}
                  </span>
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>{new Date(fb.createdAt).toLocaleString('ro-RO')}</span>
                </div>
                <p style={{ fontSize: 14, color: '#475569', margin: 0 }}>{fb.message}</p>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', padding: '24px 0', color: '#94a3b8', fontSize: 13 }}>
          <p>Portal generat de <strong style={{ color: '#1e40af' }}>PREV-COR TPM</strong></p>
          <p style={{ marginTop: 4 }}>Automatizari Industriale &bull; office@prevcortpm.ro</p>
        </div>
      </div>
    </div>
  );
}
