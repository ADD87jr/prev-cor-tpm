"use client";
import React, { useEffect, useState } from "react";

interface CleanupStats {
  rateLimit: { totalKeys: number; totalEntries: number };
  auditLogs: { total: number; oldCount: number };
}

export default function SecuritySettingsPage() {
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [setupMode, setSetupMode] = useState(false);
  const [secret, setSecret] = useState("");
  const [uri, setUri] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState({ type: "", text: "" });
  const [sessionError, setSessionError] = useState(false);
  
  // Cleanup states
  const [cleanupStats, setCleanupStats] = useState<CleanupStats | null>(null);
  const [cleaningUp, setCleaningUp] = useState(false);
  const [cleanupMessage, setCleanupMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    check2FAStatus();
    fetchCleanupStats();
  }, []);

  async function fetchCleanupStats() {
    try {
      const res = await fetch("/admin/api/cleanup");
      if (res.ok) {
        const data = await res.json();
        setCleanupStats(data);
      }
    } catch (err) {
      console.error("Error fetching cleanup stats:", err);
    }
  }

  async function runCleanup(action: string) {
    setCleaningUp(true);
    setCleanupMessage({ type: "", text: "" });
    try {
      const res = await fetch("/admin/api/cleanup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (res.ok) {
        let msg = "✅ Curățare completă: ";
        if (data.results.rateLimit) {
          if (data.results.rateLimit.cleared) {
            msg += "Rate limits resetate. ";
          } else {
            msg += `${data.results.rateLimit.cleanedKeys || 0} chei rate-limit curățate. `;
          }
        }
        if (data.results.auditLogs) {
          msg += `${data.results.auditLogs.deletedCount || 0} loguri vechi șterse.`;
        }
        setCleanupMessage({ type: "success", text: msg });
        fetchCleanupStats();
      } else {
        setCleanupMessage({ type: "error", text: data.error || "Eroare la curățare" });
      }
    } catch (err) {
      setCleanupMessage({ type: "error", text: "Eroare de rețea" });
    } finally {
      setCleaningUp(false);
    }
  }

  async function check2FAStatus() {
    try {
      const res = await fetch("/admin/api/2fa");
      if (res.ok) {
        const data = await res.json();
        setTwoFAEnabled(data.enabled);
        setSessionError(false);
      } else {
        // Sesiune invalidă - verifică eroarea
        const data = await res.json().catch(() => ({}));
        if (data.requiresReauth || data.error?.includes("session") || data.error?.includes("signature") || res.status === 401) {
          // Redirect automat la login
          window.location.href = "/admin";
          return;
        }
        setSessionError(true);
        setMessage({ type: "error", text: data.error || "Sesiune invalidă" });
      }
    } catch (err) {
      console.error("Error checking 2FA status:", err);
    } finally {
      setLoading(false);
    }
  }

  async function forceLogout() {
    try {
      await fetch("/admin/api/auth", { method: "DELETE" });
      await fetch("/api/clear-session");
      window.location.href = "/admin";
    } catch (e) {
      window.location.href = "/admin";
    }
  }

  async function setup2FA() {
    setMessage({ type: "", text: "" });
    try {
      const res = await fetch("/admin/api/2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setup" }),
      });
      const data = await res.json();
      if (res.ok) {
        setSecret(data.secret);
        setUri(data.uri);
        setQrCode(data.qrCode || "");
        setSetupMode(true);
      } else {
        setMessage({ type: "error", text: data.error });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Eroare la configurare" });
    }
  }

  async function enable2FA() {
    if (!code) {
      setMessage({ type: "error", text: "Introdu codul din aplicație" });
      return;
    }
    setMessage({ type: "", text: "" });
    try {
      const res = await fetch("/admin/api/2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "enable", code }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: "success", text: "2FA activat cu succes!" });
        setTwoFAEnabled(true);
        setSetupMode(false);
        setSecret("");
        setUri("");
        setCode("");
      } else {
        setMessage({ type: "error", text: data.error });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Eroare la activare" });
    }
  }

  async function disable2FA() {
    if (!code) {
      setMessage({ type: "error", text: "Introdu codul pentru dezactivare" });
      return;
    }
    setMessage({ type: "", text: "" });
    try {
      const res = await fetch("/admin/api/2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "disable", code }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: "success", text: "2FA dezactivat" });
        setTwoFAEnabled(false);
        setCode("");
      } else {
        setMessage({ type: "error", text: data.error });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Eroare la dezactivare" });
    }
  }

  if (loading) {
    return (
        <div className="p-6 text-center">Se încarcă...</div>
    );
  }

  return (
      <div className="p-6 max-w-2xl">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">🔐 Setări Securitate</h1>

        {/* Messages */}
        {message.text && (
          <div className={`p-4 rounded-lg mb-6 ${message.type === "error" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
            {message.text}
            {sessionError && (
              <button
                onClick={forceLogout}
                className="ml-4 bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
              >
                Re-autentificare
              </button>
            )}
          </div>
        )}

        {/* 2FA Section */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">
            Autentificare în doi pași (2FA)
          </h2>

          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-gray-600">
                {twoFAEnabled ? (
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                    2FA este <strong>activat</strong>
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                    2FA este <strong>dezactivat</strong>
                  </span>
                )}
              </p>
            </div>
          </div>

          {!twoFAEnabled && !setupMode && (
            <div>
              <p className="text-sm text-gray-500 mb-4">
                Activează autentificarea în doi pași pentru o securitate sporită. 
                Vei avea nevoie de o aplicație precum Google Authenticator sau Authy.
              </p>
              <button
                onClick={setup2FA}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                🔒 Configurează 2FA
              </button>
            </div>
          )}

          {setupMode && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="font-medium text-gray-700 mb-2">1. Scanează codul QR cu aplicația ta de autentificare:</p>
                <div className="bg-white p-4 inline-block rounded border">
                  {qrCode ? (
                    <img src={qrCode} alt="QR Code 2FA" className="w-48 h-48" />
                  ) : (
                    <div className="w-48 h-48 flex items-center justify-center text-gray-400">
                      Se generează...
                    </div>
                  )}
                </div>
                <div className="mt-3">
                  <p className="text-sm text-gray-500 mb-1">Sau introdu manual acest cod:</p>
                  <code className="bg-gray-100 px-3 py-1 rounded text-sm font-mono break-all block">
                    {secret}
                  </code>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="font-medium text-gray-700 mb-2">2. Introdu codul de 6 cifre din aplicație:</p>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="123456"
                  className="border rounded px-3 py-2 text-center text-lg tracking-widest w-40"
                  maxLength={6}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={enable2FA}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                >
                  ✓ Activează 2FA
                </button>
                <button
                  onClick={() => { setSetupMode(false); setSecret(""); setUri(""); setQrCode(""); setCode(""); }}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
                >
                  Anulează
                </button>
              </div>
            </div>
          )}

          {twoFAEnabled && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm text-gray-500 mb-3">
                Pentru a dezactiva 2FA, introdu codul curent:
              </p>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="123456"
                  className="border rounded px-3 py-2 w-32 text-center"
                  maxLength={6}
                />
                <button
                  onClick={disable2FA}
                  className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                >
                  Dezactivează 2FA
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Additional Security Info */}
        <div className="mt-6 bg-blue-50 rounded-lg p-4">
          <h3 className="font-medium text-blue-800 mb-2">ℹ️ Alte măsuri de securitate active:</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>✅ Rate limiting pe login (max 5 încercări / 15 min)</li>
            <li>✅ Blocare automată IP după încercări eșuate multiple</li>
            <li>✅ Sesiune admin expirează după 30 minute</li>
            <li>✅ Cookie HTTP-only pentru token</li>
            <li>✅ Parolă cu cerințe stricte (8+ caractere, literă mare, literă mică, cifră)</li>
            <li>✅ Audit trail pentru toate acțiunile</li>
            <li>✅ Alerte email pentru evenimente suspecte</li>
          </ul>
        </div>

        {/* Cleanup Section */}
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">
            🧹 Curățare Date Temporare
          </h2>
          
          {cleanupMessage.text && (
            <div className={`p-3 rounded mb-4 text-sm ${cleanupMessage.type === "error" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
              {cleanupMessage.text}
            </div>
          )}

          {cleanupStats && (
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-700 mb-2">Statistici curente:</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Rate Limit Cache:</p>
                  <p className="font-medium">{cleanupStats.rateLimit.totalKeys} chei / {cleanupStats.rateLimit.totalEntries} intrări</p>
                </div>
                <div>
                  <p className="text-gray-600">Audit Logs:</p>
                  <p className="font-medium">{cleanupStats.auditLogs.total} total / {cleanupStats.auditLogs.oldCount} vechi (&gt;30 zile)</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => runCleanup("rate-limit")}
              disabled={cleaningUp}
              className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600 disabled:opacity-50 text-sm"
            >
              {cleaningUp ? "Se curăță..." : "🗑️ Curăță Rate Limits expirate"}
            </button>
            <button
              onClick={() => runCleanup("audit-logs")}
              disabled={cleaningUp}
              className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600 disabled:opacity-50 text-sm"
            >
              {cleaningUp ? "Se curăță..." : "🗑️ Șterge Audit Logs vechi"}
            </button>
            <button
              onClick={() => {
                if (confirm("Sigur vrei să ștergi TOATE rate limits? Asta va permite din nou încercări de login de la IP-uri blocate.")) {
                  runCleanup("rate-limit-full");
                }
              }}
              disabled={cleaningUp}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 disabled:opacity-50 text-sm"
            >
              {cleaningUp ? "Se curăță..." : "⚠️ Reset complet Rate Limits"}
            </button>
          </div>
          
          <p className="text-xs text-gray-500 mt-3">
            * Rate limits se curăță automat la expirare. Această opțiune este pentru curățare manuală anticipată.
          </p>
        </div>
      </div>
  );
}
