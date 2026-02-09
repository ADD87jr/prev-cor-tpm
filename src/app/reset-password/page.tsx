"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams?.get("token") ?? null;
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError("Token de resetare lipsă sau invalid");
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password || password.length < 6) {
      setError("Parola trebuie să aibă cel puțin 6 caractere");
      return;
    }
    
    if (password !== confirmPassword) {
      setError("Parolele nu coincid");
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Eroare la resetare");
      }
      
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Eroare la procesare");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8 text-center">
        <div className="text-5xl mb-4">✅</div>
        <h1 className="text-2xl font-bold text-green-600 mb-4">Parolă resetată!</h1>
        <p className="text-gray-600 mb-6">
          Parola ta a fost schimbată cu succes. Acum te poți autentifica cu noua parolă.
        </p>
        <Link 
          href="/login" 
          className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
        >
          Autentifică-te
        </Link>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8 text-center">
        <div className="text-5xl mb-4">⚠️</div>
        <h1 className="text-2xl font-bold text-red-600 mb-4">Link invalid</h1>
        <p className="text-gray-600 mb-6">
          Link-ul de resetare este invalid sau a expirat.
        </p>
        <Link 
          href="/forgot-password" 
          className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
        >
          Solicită un link nou
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-8">
      <h1 className="text-2xl font-bold text-center mb-2 text-blue-700">Resetare parolă</h1>
      <p className="text-gray-600 text-center mb-6">
        Introdu noua ta parolă.
      </p>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Parolă nouă
          </label>
          <input
            type="password"
            placeholder="Minim 6 caractere"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none"
            required
            minLength={6}
          />
        </div>
        
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Confirmă parola
          </label>
          <input
            type="password"
            placeholder="Repetă parola"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none"
            required
          />
        </div>
        
        {error && (
          <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}
        
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition"
        >
          {loading ? "Se procesează..." : "Schimbă parola"}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="container mx-auto py-10 px-4 max-w-md">
      <Suspense fallback={<div className="text-center">Se încarcă...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </main>
  );
}
