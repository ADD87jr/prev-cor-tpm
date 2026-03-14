"use client";

import { useState, useEffect } from "react";

interface BackupFile {
  name: string;
  size: number;
  sizeFormatted: string;
  date: string;
}

export default function BackupDBPage() {
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState("");

  const fetchBackups = async () => {
    setLoading(true);
    try {
      const res = await fetch("/admin/api/backup-db");
      const data = await res.json();
      setBackups(data.backups || []);
    } catch {
      console.error("Eroare la listare backup-uri");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBackups(); }, []);

  const createBackup = async () => {
    setCreating(true);
    setMsg("");
    try {
      const res = await fetch("/admin/api/backup-db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.success) {
        setMsg(`Backup creat: ${data.backup.name} (${data.backup.sizeFormatted})`);
        fetchBackups();
      } else {
        setMsg(`Eroare: ${data.error}`);
      }
    } catch {
      setMsg("Eroare la creare backup");
    } finally {
      setCreating(false);
    }
  };

  const downloadBackup = async (filename: string) => {
    const res = await fetch("/admin/api/backup-db", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "download", filename }),
    });
    if (res.ok) {
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);
    }
  };

  const deleteBackup = async (filename: string) => {
    if (!confirm(`Sigur vrei să ștergi ${filename}?`)) return;
    try {
      await fetch("/admin/api/backup-db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", filename }),
      });
      fetchBackups();
    } catch {
      console.error("Eroare la ștergere");
    }
  };

  const totalSize = backups.reduce((s, b) => s + b.size, 0);
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">💾 Backup Bază de Date</h1>

      {/* Acțiuni */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <button
            onClick={createBackup}
            disabled={creating}
            className="bg-green-600 text-white px-5 py-2 rounded font-semibold hover:bg-green-700 transition disabled:opacity-50"
          >
            {creating ? "Se creează..." : "💾 Creează backup acum"}
          </button>
          <span className="text-sm text-gray-500">
            {backups.length} backup-uri ({formatBytes(totalSize)}) — max 30 păstrate automat
          </span>
        </div>
        {msg && (
          <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
            {msg}
          </div>
        )}
      </div>

      {/* Lista backup-uri */}
      {loading ? (
        <div className="text-center text-gray-500 py-8">Se încarcă...</div>
      ) : backups.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          Nu există backup-uri. Apasă butonul de mai sus pentru a crea primul.
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">Fișier</th>
                <th className="px-3 py-2 text-left font-semibold">Data</th>
                <th className="px-3 py-2 text-right font-semibold">Dimensiune</th>
                <th className="px-3 py-2 text-center font-semibold">Acțiuni</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {backups.map((b) => (
                <tr key={b.name} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-mono text-sm">{b.name}</td>
                  <td className="px-3 py-2">
                    {new Date(b.date).toLocaleString("ro-RO", {
                      day: "2-digit", month: "2-digit", year: "numeric",
                      hour: "2-digit", minute: "2-digit",
                      timeZone: "Europe/Bucharest",
                    })}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">{b.sizeFormatted}</td>
                  <td className="px-3 py-2 text-center">
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={() => downloadBackup(b.name)}
                        className="text-blue-600 hover:text-blue-800 font-semibold text-sm"
                      >
                        📥 Descarcă
                      </button>
                      <button
                        onClick={() => deleteBackup(b.name)}
                        className="text-red-500 hover:text-red-700 font-semibold text-sm"
                      >
                        🗑️ Șterge
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
        <h3 className="font-bold text-blue-800 mb-2">ℹ️ Informații</h3>
        <ul className="text-sm text-blue-700 list-disc ml-5 space-y-1">
          <li>Backup-ul copiază fișierul SQLite (<code>prisma/dev.db</code></li>
          <li>Se păstrează automat max. 30 backup-uri (cele mai vechi se șterg)</li>
          <li>Backup-urile sunt salvate în <code>backups/</code> (în rădăcina proiectului)</li>
          <li>Pentru restaurare: oprește serverul, copiază backup-ul peste <code>prisma/dev.db</code>, repornește</li>
        </ul>
      </div>
    </div>
  );
}
