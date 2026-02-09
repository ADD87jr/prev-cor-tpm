'use client';

import { useState, useEffect } from 'react';

interface Subscriber {
  id: number;
  email: string;
  name: string | null;
  subscribedAt: string;
  active: boolean;
  source: string | null;
}

export default function NewsletterAdmin() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');

  useEffect(() => {
    fetchSubscribers();
  }, [filter]);

  const fetchSubscribers = async () => {
    try {
      let url = '/admin/api/newsletter';
      if (filter !== 'all') {
        url += `?active=${filter === 'active'}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      setSubscribers(data);
    } catch (error) {
      console.error('Error fetching subscribers:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (id: number, currentActive: boolean) => {
    try {
      await fetch('/admin/api/newsletter', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, active: !currentActive })
      });
      fetchSubscribers();
    } catch (error) {
      console.error('Error toggling subscriber:', error);
    }
  };

  const deleteSubscriber = async (id: number) => {
    if (!confirm('Sigur vrei să ștergi acest abonat?')) return;
    try {
      await fetch('/admin/api/newsletter', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      fetchSubscribers();
    } catch (error) {
      console.error('Error deleting subscriber:', error);
    }
  };

  const exportEmails = () => {
    const activeEmails = subscribers.filter(s => s.active).map(s => s.email).join('\n');
    const blob = new Blob([activeEmails], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'newsletter_emails.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const activeCount = subscribers.filter(s => s.active).length;
  const inactiveCount = subscribers.filter(s => !s.active).length;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Newsletter - Abonați</h1>
        <button
          onClick={exportEmails}
          className="bg-green-600 text-white px-4 py-2 rounded font-semibold hover:bg-green-700 transition"
        >
          📥 Export email-uri
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <div className="text-3xl font-bold text-blue-600">{subscribers.length}</div>
          <div className="text-gray-500 text-sm">Total abonați</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <div className="text-3xl font-bold text-green-600">{activeCount}</div>
          <div className="text-gray-500 text-sm">Activi</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <div className="text-3xl font-bold text-red-600">{inactiveCount}</div>
          <div className="text-gray-500 text-sm">Dezabonați</div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
        >
          Toți
        </button>
        <button
          onClick={() => setFilter('active')}
          className={`px-4 py-2 rounded ${filter === 'active' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'}`}
        >
          Activi
        </button>
        <button
          onClick={() => setFilter('inactive')}
          className={`px-4 py-2 rounded ${filter === 'inactive' ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-700'}`}
        >
          Dezabonați
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">Se încarcă...</div>
      ) : subscribers.length === 0 ? (
        <div className="text-center py-8 text-gray-500">Nu există abonați</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">Email</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">Nume</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">Data</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">Sursă</th>
                <th className="text-center px-4 py-3 text-sm font-semibold text-gray-600">Status</th>
                <th className="text-center px-4 py-3 text-sm font-semibold text-gray-600">Acțiuni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {subscribers.map((sub) => (
                <tr key={sub.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">{sub.email}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{sub.name || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(sub.subscribedAt).toLocaleDateString('ro-RO')}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{sub.source || '-'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                      sub.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {sub.active ? 'Activ' : 'Dezabonat'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleActive(sub.id, sub.active)}
                      className={`text-xs px-2 py-1 rounded mr-2 ${
                        sub.active
                          ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      {sub.active ? 'Dezabonează' : 'Reabonează'}
                    </button>
                    <button
                      onClick={() => deleteSubscriber(sub.id)}
                      className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200"
                    >
                      Șterge
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
