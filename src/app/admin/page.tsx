"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminPanel() {
  const [pass, setPass] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [needs2FA, setNeeds2FA] = useState(false);
  const [loginErr, setLoginErr] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    setLoginErr("");
    setLoading(true);
    try {
      const res = await fetch("/admin/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pass, totpCode: totpCode || undefined }),
        credentials: "include",
      });
      if (res.ok) {
        // Full page reload pentru a reseta starea layout-ului
        window.location.href = '/admin/dashboard';
      } else {
        const data = await res.json();
        if (data.requires2FA) {
          setNeeds2FA(true);
          setLoginErr("Introdu codul din Google Authenticator");
        } else {
          setLoginErr(data.error || "Parolă greșită!");
        }
      }
    } catch (err) {
      setLoginErr("Eroare la autentificare. Încercați din nou.");
      console.error("Login error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-6 text-center">Admin Login</h1>
        
        <input
          type="password"
          placeholder="Parolă admin"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !needs2FA && handleLogin()}
          className="w-full border rounded px-4 py-2 mb-4"
          disabled={loading || needs2FA}
          autoComplete="off"
        />
        
        {needs2FA && (
          <div className="mb-4">
            <label className="block text-sm text-gray-600 mb-1">Cod 2FA din Google Authenticator:</label>
            <input
              type="text"
              placeholder="123456"
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              className="w-full border rounded px-4 py-2 text-center text-xl tracking-widest"
              maxLength={6}
              autoFocus
            />
          </div>
        )}
        
        {loginErr && (
          <p className={`text-sm mb-4 ${needs2FA ? "text-blue-600" : "text-red-600"}`}>
            {loginErr}
          </p>
        )}
        
        <button
          onClick={handleLogin}
          disabled={loading || (needs2FA && totpCode.length !== 6)}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:bg-blue-400"
        >
          {loading ? "Se autentifică..." : needs2FA ? "Verifică codul" : "Autentificare"}
        </button>
        
        {needs2FA && (
          <button
            onClick={() => { setNeeds2FA(false); setTotpCode(""); setLoginErr(""); }}
            className="w-full mt-2 text-gray-500 text-sm hover:text-gray-700"
          >
            ← Înapoi la parolă
          </button>
        )}
      </div>
    </div>
  );
}

















