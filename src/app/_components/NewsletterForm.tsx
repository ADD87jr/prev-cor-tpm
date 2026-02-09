'use client';

import { useState } from 'react';
import { useLanguage } from './LanguageContext';

export default function NewsletterForm() {
  const { language } = useLanguage();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const txt = {
    title: language === "en" ? "Newsletter" : "Newsletter",
    namePlaceholder: language === "en" ? "Your name" : "Numele tău",
    emailPlaceholder: language === "en" ? "Your email address" : "Adresa ta de email",
    subscribe: language === "en" ? "Subscribe" : "Abonează-te",
    errorSubscribe: language === "en" ? "Subscription error" : "Eroare la abonare",
    errorConnection: language === "en" ? "Connection error" : "Eroare de conexiune",
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name: name || null, source: 'footer' })
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: 'success', text: data.message });
        setEmail('');
        setName('');
      } else {
        setMessage({ type: 'error', text: data.error || txt.errorSubscribe });
      }
    } catch {
      setMessage({ type: 'error', text: txt.errorConnection });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full md:w-auto">
      <h4 className="font-semibold text-white mb-2 text-sm">{txt.title}</h4>
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          placeholder={txt.namePlaceholder}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="px-3 py-2 rounded bg-gray-800 border border-gray-700 text-white text-sm focus:border-blue-500 focus:outline-none w-full sm:w-36"
        />
        <input
          type="email"
          placeholder={txt.emailPlaceholder}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="px-3 py-2 rounded bg-gray-800 border border-gray-700 text-white text-sm focus:border-blue-500 focus:outline-none w-full sm:w-48"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? '...' : txt.subscribe}
        </button>
      </form>
      {message && (
        <p className={`text-xs mt-1 ${message.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}
