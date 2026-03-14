'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ExtractedRequirements {
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

const initialRequirements: ExtractedRequirements = {
  projectName: '',
  clientName: '',
  description: '',
  objectives: [],
  constraints: [],
  inputs: [],
  outputs: [],
  plcType: '',
  hmiRequired: false,
  mechanicalNeeds: [],
  electricalNeeds: [],
  pneumaticNeeds: [],
  hydraulicNeeds: [],
  timeline: '',
  budget: '',
};

export default function IntakePage() {
  const router = useRouter();
  const [mode, setMode] = useState<'upload' | 'chat'>('chat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [requirements, setRequirements] = useState<ExtractedRequirements>(initialRequirements);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  // Start conversation with AI greeting
  useEffect(() => {
    if (mode === 'chat' && messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: `👋 Bună! Sunt asistentul AI pentru proiecte de automatizare PREV-COR.

Te voi ajuta să definești cerințele proiectului tău. Hai să începem:

**Povestește-mi despre proiect:**
- Ce vrei să automatizezi?
- Care este clientul și industria?
- Ce funcționalități trebuie să aibă sistemul?

Spune-mi în cuvintele tale, voi extrage eu informațiile tehnice necesare. 🎯`
      }]);
    }
  }, [mode, messages.length]);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai-studio/intake-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, { role: 'user', content: userMessage }],
          currentRequirements: requirements,
        }),
      });

      const data = await response.json();
      
      if (data.message) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.message }]);
      }
      
      if (data.requirements) {
        setRequirements(prev => ({ ...prev, ...data.requirements }));
      }
    } catch (error) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: '❌ Eroare de conexiune. Te rog încearcă din nou.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);
    setExtracting(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/ai-studio/extract-requirements', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      
      if (data.success && data.requirements) {
        setRequirements(data.requirements);
        setMessages([{
          role: 'assistant',
          content: `✅ Am analizat documentul **${file.name}** și am extras cerințele.

**Proiect:** ${data.requirements.projectName || 'Nedefinit'}
**Client:** ${data.requirements.clientName || 'Nedefinit'}

**Obiective identificate:**
${data.requirements.objectives?.map((o: string) => `• ${o}`).join('\n') || '• Niciun obiectiv identificat'}

**Intrări sistem:**
${data.requirements.inputs?.map((i: string) => `• ${i}`).join('\n') || '• Neindetificate'}

**Ieșiri sistem:**
${data.requirements.outputs?.map((o: string) => `• ${o}`).join('\n') || '• Neidentificate'}

Vrei să adaugi sau să modifici ceva? Poți continua discuția pentru a rafina cerințele.`
        }]);
      } else {
        setMessages([{
          role: 'assistant',
          content: `⚠️ Nu am putut extrage automat cerințele din document. Hai să discutăm despre proiect - spune-mi ce vrei să automatizezi.`
        }]);
      }
    } catch (error) {
      setMessages([{
        role: 'assistant',
        content: `❌ Eroare la procesarea documentului. Te rog încearcă din nou sau descrie manual proiectul.`
      }]);
    } finally {
      setExtracting(false);
    }
  };

  const handleCreateProject = async () => {
    if (!requirements.projectName || !requirements.description) {
      alert('Te rog completează cel puțin numele proiectului și descrierea.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/ai-studio/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requirements,
          conversationHistory: messages,
        }),
      });

      const data = await response.json();
      
      if (data.success && data.projectId) {
        router.push(`/ai-studio/project/${data.projectId}`);
      } else {
        alert('Eroare la crearea proiectului: ' + (data.error || 'Necunoscută'));
      }
    } catch (error) {
      alert('Eroare de conexiune. Te rog încearcă din nou.');
    } finally {
      setIsLoading(false);
    }
  };

  const requirementsFilled = () => {
    let filled = 0;
    if (requirements.projectName) filled++;
    if (requirements.clientName) filled++;
    if (requirements.description) filled++;
    if (requirements.objectives.length > 0) filled++;
    if (requirements.inputs.length > 0) filled++;
    if (requirements.outputs.length > 0) filled++;
    return Math.round((filled / 6) * 100);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/ai-studio" className="text-slate-400 hover:text-white transition-colors">
              ← Înapoi
            </Link>
            <div>
              <h1 className="text-xl font-bold text-white">📋 Modul 1: Intake Cerințe</h1>
              <p className="text-slate-400 text-sm">Caiet de sarcini sau discuție tehnică</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-slate-400">Completare</p>
              <p className="text-lg font-bold text-white">{requirementsFilled()}%</p>
            </div>
            <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full transition-all"
                style={{ width: `${requirementsFilled()}%` }}
              />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Chat/Upload Area */}
          <div className="lg:col-span-2">
            {/* Mode Selector */}
            <div className="flex gap-4 mb-6">
              <button
                onClick={() => setMode('chat')}
                className={`flex-1 py-3 px-6 rounded-xl font-medium transition-all ${
                  mode === 'chat'
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                💬 Discuție cu AI
              </button>
              <button
                onClick={() => setMode('upload')}
                className={`flex-1 py-3 px-6 rounded-xl font-medium transition-all ${
                  mode === 'upload'
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                📄 Upload Document
              </button>
            </div>

            {/* Upload Mode */}
            {mode === 'upload' && (
              <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8 mb-6">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".pdf,.doc,.docx,.txt"
                  className="hidden"
                />
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-600 rounded-xl p-12 text-center cursor-pointer hover:border-blue-500/50 transition-colors"
                >
                  {extracting ? (
                    <div className="animate-pulse">
                      <div className="text-4xl mb-4">🔄</div>
                      <p className="text-white font-medium">Analizez documentul...</p>
                      <p className="text-slate-400 text-sm">AI-ul extrage cerințele</p>
                    </div>
                  ) : uploadedFile ? (
                    <div>
                      <div className="text-4xl mb-4">✅</div>
                      <p className="text-white font-medium">{uploadedFile.name}</p>
                      <p className="text-slate-400 text-sm">Click pentru a încărca alt document</p>
                    </div>
                  ) : (
                    <div>
                      <div className="text-4xl mb-4">📤</div>
                      <p className="text-white font-medium">Trage sau click pentru a încărca</p>
                      <p className="text-slate-400 text-sm">PDF, DOC, DOCX sau TXT</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Chat Area */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden">
              <div 
                ref={chatRef}
                className="h-[400px] overflow-y-auto p-6 space-y-4"
              >
                {messages.map((msg, idx) => (
                  <div 
                    key={idx}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div 
                      className={`max-w-[80%] p-4 rounded-2xl ${
                        msg.role === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-700 text-slate-200'
                      }`}
                    >
                      <div className="whitespace-pre-wrap text-sm">{msg.content}</div>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-slate-700 text-slate-200 p-4 rounded-2xl">
                      <div className="flex gap-2">
                        <span className="animate-bounce">●</span>
                        <span className="animate-bounce delay-100">●</span>
                        <span className="animate-bounce delay-200">●</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Input */}
              <div className="border-t border-slate-700 p-4">
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                    placeholder="Descrie proiectul sau pune întrebări..."
                    className="flex-1 bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={isLoading || !input.trim()}
                    className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium rounded-xl hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Trimite
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Requirements Summary */}
          <div className="lg:col-span-1">
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 sticky top-24">
              <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                📊 Cerințe Extrase
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="text-xs text-slate-400 uppercase">Proiect</label>
                  <input
                    type="text"
                    value={requirements.projectName}
                    onChange={(e) => setRequirements(prev => ({ ...prev, projectName: e.target.value }))}
                    placeholder="Nume proiect..."
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm mt-1"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 uppercase">Client</label>
                  <input
                    type="text"
                    value={requirements.clientName}
                    onChange={(e) => setRequirements(prev => ({ ...prev, clientName: e.target.value }))}
                    placeholder="Nume client..."
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm mt-1"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 uppercase">Descriere</label>
                  <textarea
                    value={requirements.description}
                    onChange={(e) => setRequirements(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Descriere scurtă..."
                    rows={3}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm mt-1 resize-none"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400 uppercase">Obiective ({requirements.objectives.length})</label>
                  <div className="mt-1 space-y-1">
                    {requirements.objectives.map((obj, idx) => (
                      <div key={idx} className="text-xs text-slate-300 bg-slate-700 rounded px-2 py-1">
                        • {obj}
                      </div>
                    ))}
                    {requirements.objectives.length === 0 && (
                      <p className="text-xs text-slate-500 italic">Niciun obiectiv încă</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-400 uppercase">Intrări ({requirements.inputs.length})</label>
                    <div className="mt-1 space-y-1">
                      {requirements.inputs.slice(0, 3).map((inp, idx) => (
                        <div key={idx} className="text-xs text-green-400 bg-green-900/30 rounded px-2 py-1">
                          ↗ {inp}
                        </div>
                      ))}
                      {requirements.inputs.length > 3 && (
                        <p className="text-xs text-slate-500">+{requirements.inputs.length - 3} mai multe</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 uppercase">Ieșiri ({requirements.outputs.length})</label>
                    <div className="mt-1 space-y-1">
                      {requirements.outputs.slice(0, 3).map((out, idx) => (
                        <div key={idx} className="text-xs text-blue-400 bg-blue-900/30 rounded px-2 py-1">
                          ↘ {out}
                        </div>
                      ))}
                      {requirements.outputs.length > 3 && (
                        <p className="text-xs text-slate-500">+{requirements.outputs.length - 3} mai multe</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-700">
                  <button
                    onClick={handleCreateProject}
                    disabled={isLoading || requirementsFilled() < 50}
                    className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-xl hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {isLoading ? '⏳ Se creează...' : '✅ Creează Proiect'}
                  </button>
                  <p className="text-xs text-slate-500 text-center mt-2">
                    Minim 50% completare necesară
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
