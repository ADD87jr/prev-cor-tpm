"use client";
import React, { useEffect, useState } from "react";

interface AuditEntry {
  id: number;
  adminId: string;
  action: string;
  resource: string;
  resourceId: string | null;
  details: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  timestamp: string;
}

export default function AuditTrailPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [filter, setFilter] = useState({ action: "", resource: "" });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const perPage = 50;

  useEffect(() => {
    fetchLogs();
  }, [page, filter]);

  async function fetchLogs() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", String(perPage));
      params.set("offset", String((page - 1) * perPage));
      if (filter.action) params.set("action", filter.action);
      if (filter.resource) params.set("resource", filter.resource);

      const res = await fetch(`/admin/api/audit-logs?${params}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setTotal(data.total || 0);
      }
    } catch (err) {
      console.error("Error loading audit logs:", err);
    } finally {
      setLoading(false);
    }
  }

  async function deleteOldLogs() {
    if (!confirm("Sigur doriți să ștergeți logurile mai vechi de 30 de zile?")) return;
    
    setDeleting(true);
    setDeleteMessage(null);
    try {
      const res = await fetch("/admin/api/audit-logs", { method: "DELETE" });
      const data = await res.json();
      
      if (res.ok) {
        setDeleteMessage({ type: "success", text: `✅ ${data.deletedCount} loguri vechi șterse` });
        fetchLogs();
      } else {
        setDeleteMessage({ type: "error", text: `❌ ${data.error || "Eroare la ștergere"}` });
      }
    } catch (err) {
      setDeleteMessage({ type: "error", text: "❌ Eroare de rețea" });
    } finally {
      setDeleting(false);
      setTimeout(() => setDeleteMessage(null), 5000);
    }
  }

  const actionColors: Record<string, string> = {
    login_success: "bg-green-100 text-green-800",
    login_failed: "bg-red-100 text-red-800",
    create: "bg-blue-100 text-blue-800",
    update: "bg-yellow-100 text-yellow-800",
    delete: "bg-red-100 text-red-800",
    enable: "bg-green-100 text-green-800",
    disable: "bg-gray-100 text-gray-800",
    backup: "bg-purple-100 text-purple-800",
    restore: "bg-orange-100 text-orange-800",
  };

  const getActionColor = (action: string) => {
    const lowerAction = action.toLowerCase();
    for (const [key, value] of Object.entries(actionColors)) {
      if (lowerAction.includes(key)) return value;
    }
    return "bg-gray-100 text-gray-800";
  };

  return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">📋 Audit Trail</h1>
          <p className="text-gray-600 mt-1">Istoricul tuturor acțiunilor administrative</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Acțiune</label>
              <select
                value={filter.action}
                onChange={(e) => { setFilter({ ...filter, action: e.target.value }); setPage(1); }}
                className="border rounded px-3 py-2 text-sm"
              >
                <option value="">Toate</option>
                <option value="login_success">Login reușit</option>
                <option value="login_failed">Login eșuat</option>
                <option value="create">Creare</option>
                <option value="update">Actualizare</option>
                <option value="delete">Ștergere</option>
                <option value="backup">Backup</option>
                <option value="restore">Restaurare</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Resursă</label>
              <select
                value={filter.resource}
                onChange={(e) => { setFilter({ ...filter, resource: e.target.value }); setPage(1); }}
                className="border rounded px-3 py-2 text-sm"
              >
                <option value="">Toate</option>
                <option value="admin_session">Sesiune admin</option>
                <option value="product">Produse</option>
                <option value="order">Comenzi</option>
                <option value="user">Utilizatori</option>
                <option value="coupon">Cupoane</option>
                <option value="backup">Backup</option>
                <option value="2fa">2FA</option>
              </select>
            </div>
            <div className="ml-auto flex gap-2 items-end">
              <button
                onClick={deleteOldLogs}
                disabled={deleting}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? "Se șterge..." : "🗑️ Șterge loguri vechi (>30 zile)"}
              </button>
              <button
                onClick={fetchLogs}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                🔄 Reîncarcă
              </button>
            </div>
          </div>
          {deleteMessage && (
            <div className={`mt-3 p-2 rounded text-sm ${deleteMessage.type === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
              {deleteMessage.text}
            </div>
          )}
          <div className="mt-3 text-sm text-gray-500">
            Total înregistrări: <strong>{total}</strong>
          </div>
        </div>

        {/* Logs Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Se încarcă...</div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-gray-500">Nu există înregistrări</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-gray-600 font-medium">Data/Ora</th>
                    <th className="px-4 py-3 text-left text-gray-600 font-medium">Acțiune</th>
                    <th className="px-4 py-3 text-left text-gray-600 font-medium">Resursă</th>
                    <th className="px-4 py-3 text-left text-gray-600 font-medium">Detalii</th>
                    <th className="px-4 py-3 text-left text-gray-600 font-medium">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString("ro-RO")}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getActionColor(log.action)}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {log.resource}
                        {log.resourceId && <span className="text-gray-400 ml-1">#{log.resourceId}</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-600 max-w-xs truncate" title={log.details || ""}>
                        {log.details || "-"}
                      </td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs">
                        {log.ipAddress || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          <div className="px-4 py-3 border-t bg-gray-50 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Pagina {page}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-3 py-1 border rounded text-sm disabled:opacity-50"
              >
                ← Anterior
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={logs.length < perPage}
                className="px-3 py-1 border rounded text-sm disabled:opacity-50"
              >
                Următor →
              </button>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-6 bg-white rounded-lg shadow p-4">
          <h3 className="font-medium text-gray-700 mb-3">Legendă culori:</h3>
          <div className="flex flex-wrap gap-3 text-sm">
            <span className="px-2 py-1 rounded-full bg-green-100 text-green-800">Login reușit</span>
            <span className="px-2 py-1 rounded-full bg-red-100 text-red-800">Login eșuat / Ștergere</span>
            <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-800">Creare</span>
            <span className="px-2 py-1 rounded-full bg-yellow-100 text-yellow-800">Actualizare</span>
            <span className="px-2 py-1 rounded-full bg-purple-100 text-purple-800">Backup</span>
            <span className="px-2 py-1 rounded-full bg-orange-100 text-orange-800">Restaurare</span>
          </div>
        </div>
      </div>
  );
}
