"use client";
import { useState } from "react";
import Link from "next/link";

export default function SchimbaParolaPage() {
  const [email, setEmail] = useState("");
  const [parolaNoua, setParolaNoua] = useState("");
  const [confirmaParola, setConfirmaParola] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Admin password state
  const [adminParolaCurenta, setAdminParolaCurenta] = useState("");
  const [adminParolaNoua, setAdminParolaNoua] = useState("");
  const [adminConfirma, setAdminConfirma] = useState("");
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminMessage, setAdminMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (parolaNoua !== confirmaParola) {
      setMessage({ type: "error", text: "Parolele nu coincid!" });
      return;
    }

    if (parolaNoua.length < 6) {
      setMessage({ type: "error", text: "Parola trebuie să aibă minim 6 caractere!" });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/admin/api/schimba-parola", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, parolaNoua }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: "success", text: "Parola a fost schimbată cu succes!" });
        setEmail("");
        setParolaNoua("");
        setConfirmaParola("");
      } else {
        setMessage({ type: "error", text: data.error || "Eroare la schimbarea parolei" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Eroare de conexiune" });
    } finally {
      setLoading(false);
    }
  };

  const handleAdminPasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminMessage(null);

    if (adminParolaNoua !== adminConfirma) {
      setAdminMessage({ type: "error", text: "Parolele nu coincid!" });
      return;
    }

    if (adminParolaNoua.length < 6) {
      setAdminMessage({ type: "error", text: "Parola trebuie să aibă minim 6 caractere!" });
      return;
    }

    setAdminLoading(true);
    try {
      const res = await fetch("/admin/api/admin-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          currentPassword: adminParolaCurenta, 
          newPassword: adminParolaNoua 
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setAdminMessage({ type: "success", text: "Parola admin a fost schimbată cu succes!" });
        setAdminParolaCurenta("");
        setAdminParolaNoua("");
        setAdminConfirma("");
      } else {
        setAdminMessage({ type: "error", text: data.error || "Eroare la schimbarea parolei" });
      }
    } catch (error) {
      setAdminMessage({ type: "error", text: "Eroare de conexiune" });
    } finally {
      setAdminLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto mt-10 p-6 bg-white rounded-xl shadow">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Schimbă parola utilizator</h1>
        <Link href="/admin" className="text-blue-600 hover:underline">
          ← Înapoi la Admin
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block font-semibold mb-1">Email utilizator:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border rounded px-3 py-2"
            placeholder="utilizator@exemplu.com"
            required
          />
        </div>

        <div>
          <label className="block font-semibold mb-1">Parolă nouă:</label>
          <input
            type="password"
            value={parolaNoua}
            onChange={(e) => setParolaNoua(e.target.value)}
            className="w-full border rounded px-3 py-2"
            placeholder="Minim 6 caractere"
            required
          />
        </div>

        <div>
          <label className="block font-semibold mb-1">Confirmă parola:</label>
          <input
            type="password"
            value={confirmaParola}
            onChange={(e) => setConfirmaParola(e.target.value)}
            className="w-full border rounded px-3 py-2"
            placeholder="Repetă parola"
            required
          />
        </div>

        {message && (
          <div
            className={`p-3 rounded ${
              message.type === "success"
                ? "bg-green-100 text-green-800 border border-green-300"
                : "bg-red-100 text-red-800 border border-red-300"
            }`}
          >
            {message.text}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded font-bold hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? "Se procesează..." : "Schimbă parola"}
        </button>
      </form>

      {/* Admin Password Section */}
      <div className="mt-10 pt-8 border-t-2 border-gray-200">
        <h2 className="text-xl font-bold mb-4 text-orange-600">Schimbă parola Admin Panel</h2>
        <p className="text-sm text-gray-600 mb-4">
          Aceasta este parola cerută la intrarea în /admin
        </p>
        
        <form onSubmit={handleAdminPasswordChange} className="space-y-4">
          <div>
            <label className="block font-semibold mb-1">Parola curentă:</label>
            <input
              type="password"
              value={adminParolaCurenta}
              onChange={(e) => setAdminParolaCurenta(e.target.value)}
              className="w-full border rounded px-3 py-2"
              placeholder="Parola actuală"
              required
            />
          </div>

          <div>
            <label className="block font-semibold mb-1">Parolă nouă:</label>
            <input
              type="password"
              value={adminParolaNoua}
              onChange={(e) => setAdminParolaNoua(e.target.value)}
              className="w-full border rounded px-3 py-2"
              placeholder="Minim 6 caractere"
              required
            />
          </div>

          <div>
            <label className="block font-semibold mb-1">Confirmă parola nouă:</label>
            <input
              type="password"
              value={adminConfirma}
              onChange={(e) => setAdminConfirma(e.target.value)}
              className="w-full border rounded px-3 py-2"
              placeholder="Repetă parola nouă"
              required
            />
          </div>

          {adminMessage && (
            <div
              className={`p-3 rounded ${
                adminMessage.type === "success"
                  ? "bg-green-100 text-green-800 border border-green-300"
                  : "bg-red-100 text-red-800 border border-red-300"
              }`}
            >
              {adminMessage.text}
            </div>
          )}

          <button
            type="submit"
            disabled={adminLoading}
            className="w-full bg-orange-600 text-white py-2 rounded font-bold hover:bg-orange-700 disabled:bg-gray-400"
          >
            {adminLoading ? "Se procesează..." : "Schimbă parola Admin"}
          </button>
        </form>
      </div>
    </div>
  );
}
