"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Completează adresa de email");
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Eroare la trimitere email");
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
      <main className="container mx-auto py-10 px-4 max-w-md">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="text-5xl mb-4">✉️</div>
          <h1 className="text-2xl font-bold text-green-600 mb-4">Email trimis!</h1>
          <p className="text-gray-600 mb-6">
            Am trimis un email la <strong>{email}</strong> cu instrucțiuni pentru resetarea parolei.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Verifică și folderul Spam dacă nu găsești emailul în Inbox.
          </p>
          <Link href="/login" className="text-blue-600 hover:underline font-semibold">
            ← Înapoi la autentificare
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="container mx-auto py-10 px-4 max-w-md">
      <div className="bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-2xl font-bold text-center mb-2 text-blue-700">Ai uitat parola?</h1>
        <p className="text-gray-600 text-center mb-6">
          Introdu adresa de email asociată contului tău și îți vom trimite un link pentru resetarea parolei.
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              placeholder="exemplu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
            {loading ? "Se trimite..." : "Trimite link de resetare"}
          </button>
        </form>
        
        <div className="mt-6 text-center">
          <Link href="/login" className="text-blue-600 hover:underline text-sm">
            ← Înapoi la autentificare
          </Link>
        </div>
      </div>
    </main>
  );
}
