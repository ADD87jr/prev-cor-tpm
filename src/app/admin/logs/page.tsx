"use client";
import React, { useEffect, useState } from "react";

interface AdminLogEntry {
  id: number;
  action: string;
  entity: string;
  entityId: number | null;
  details: any;
  adminEmail: string;
  createdAt: string;
}

const ACTION_COLORS: Record<string, string> = {
  CREATE: "bg-green-100 text-green-800",
  UPDATE: "bg-blue-100 text-blue-800",
  DELETE: "bg-red-100 text-red-800",
  LOGIN: "bg-yellow-100 text-yellow-800",
};

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<AdminLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<{ entity: string; action: string }>({ entity: "", action: "" });

  useEffect(() => {
    const params = new URLSearchParams();
    if (filter.entity) params.set("entity", filter.entity);
    if (filter.action) params.set("action", filter.action);
    fetch(`/admin/api/logs?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error("Eroare la încărcare log-uri");
        return res.json();
      })
      .then(setLogs)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [filter]);

  if (loading) return <div className="p-8">Se încarcă...</div>;
  if (error) return <div className="p-8 text-red-600">{error}</div>;

  return (
    <div className="max-w-5xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6 text-blue-700">Istoric acțiuni admin</h1>
      {/* Filtre */}
      <div className="flex gap-4 mb-6">
        <select
          value={filter.entity}
          onChange={(e) => setFilter((f) => ({ ...f, entity: e.target.value }))}
          className="border rounded px-3 py-2"
        >
          <option value="">Toate entitățile</option>
          <option value="product">Produs</option>
          <option value="order">Comandă</option>
          <option value="user">Utilizator</option>
          <option value="coupon">Cupon</option>
        </select>
        <select
          value={filter.action}
          onChange={(e) => setFilter((f) => ({ ...f, action: e.target.value }))}
          className="border rounded px-3 py-2"
        >
          <option value="">Toate acțiunile</option>
          <option value="CREATE">CREATE</option>
          <option value="UPDATE">UPDATE</option>
          <option value="DELETE">DELETE</option>
          <option value="LOGIN">LOGIN</option>
        </select>
      </div>
      {/* Tabel log-uri */}
      <div className="overflow-x-auto bg-white rounded-xl shadow">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 text-left">Data</th>
              <th className="px-4 py-2 text-left">Admin</th>
              <th className="px-4 py-2 text-left">Acțiune</th>
              <th className="px-4 py-2 text-left">Entitate</th>
              <th className="px-4 py-2 text-left">ID</th>
              <th className="px-4 py-2 text-left">Detalii</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-6 text-gray-400">
                  Nicio acțiune înregistrată.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="border-b hover:bg-blue-50">
                  <td className="px-4 py-2 whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString("ro-RO")}
                  </td>
                  <td className="px-4 py-2">{log.adminEmail}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-1 rounded font-semibold text-xs ${ACTION_COLORS[log.action] || "bg-gray-100"}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-2 capitalize">{log.entity}</td>
                  <td className="px-4 py-2">{log.entityId ?? "-"}</td>
                  <td className="px-4 py-2 max-w-xs truncate" title={log.details ? JSON.stringify(log.details) : ""}>
                    {log.details ? (
                      <span className="text-gray-600">{JSON.stringify(log.details).slice(0, 80)}...</span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
