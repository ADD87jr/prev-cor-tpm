"use client";
import { useState } from "react";

// Exemplu simplu de autentificare (de test, nu pentru producție)
const ADMIN_PASS = "admin123";

export default function AdminLogin({ onLoginAction }: { onLoginAction: () => void }) {
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pass === ADMIN_PASS) {
      setErr("");
      onLoginAction();
    } else {
      setErr("Parolă greșită!");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xs mx-auto mt-20 bg-white p-6 rounded shadow flex flex-col gap-4">
      <h2 className="text-xl font-bold mb-2 text-center">Autentificare admin</h2>
      <input
        type="password"
        placeholder="Parolă admin"
        className="border rounded px-3 py-2"
        value={pass}
        onChange={e => setPass(e.target.value)}
      />
      {err && <div className="text-red-600 text-sm">{err}</div>}
      <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Intră în panou</button>
    </form>
  );
}
