"use client";
import { useEffect, useState } from "react";

interface User {
  id: number;
  email: string;
  name: string;
  blocked: boolean;
  isAdmin: boolean;
}

export default function UtilizatoriPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editPassword, setEditPassword] = useState<{ id: number; password: string } | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    const res = await fetch("/admin/api/utilizatori");
    const data = await res.json();
    setUsers(data);
    setLoading(false);
  }

  async function toggleAdmin(user: User) {
    const res = await fetch("/admin/api/utilizatori", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: user.id, isAdmin: !user.isAdmin }),
    });
    if (res.ok) {
      setUsers(users.map((u) => (u.id === user.id ? { ...u, isAdmin: !u.isAdmin } : u)));
      setMessage(`${user.email} - Admin: ${!user.isAdmin ? "DA" : "NU"}`);
    }
  }

  async function toggleBlocked(user: User) {
    const res = await fetch("/admin/api/utilizatori", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: user.id, blocked: !user.blocked }),
    });
    if (res.ok) {
      setUsers(users.map((u) => (u.id === user.id ? { ...u, blocked: !u.blocked } : u)));
      setMessage(`${user.email} - Blocat: ${!user.blocked ? "DA" : "NU"}`);
    }
  }

  async function changePassword() {
    if (!editPassword || editPassword.password.length < 6) {
      setMessage("Parola trebuie să aibă minim 6 caractere");
      return;
    }
    const res = await fetch("/admin/api/utilizatori", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editPassword.id, newPassword: editPassword.password }),
    });
    if (res.ok) {
      setMessage("Parola a fost schimbată!");
      setEditPassword(null);
    }
  }

  async function deleteUser(user: User) {
    if (!confirm(`Sigur vrei să ștergi utilizatorul ${user.email}?`)) return;
    const res = await fetch(`/admin/api/utilizatori?id=${user.id}`, { method: "DELETE" });
    if (res.ok) {
      setUsers(users.filter((u) => u.id !== user.id));
      setMessage(`Utilizatorul ${user.email} a fost șters`);
    }
  }

  return (
    <div className="max-w-6xl mx-auto py-10 px-4">
        <h1 className="text-3xl font-bold mb-6 text-blue-900">Administrare utilizatori</h1>

        {message && (
          <div className="mb-4 p-3 bg-green-100 text-green-800 rounded">{message}</div>
        )}

        <div className="bg-white rounded-xl shadow p-6">
          <p className="text-gray-600 mb-4">
            <strong>Admin:</strong> poate accesa panoul de administrare<br />
            <strong>Blocat:</strong> nu se poate loga pe site
          </p>

          {loading ? (
            <p>Se încarcă...</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="py-3 px-4 text-left">ID</th>
                  <th className="py-3 px-4 text-left">Email</th>
                  <th className="py-3 px-4 text-left">Nume</th>
                  <th className="py-3 px-4 text-center">Admin</th>
                  <th className="py-3 px-4 text-center">Blocat</th>
                  <th className="py-3 px-4 text-center">Acțiuni</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">{user.id}</td>
                    <td className="py-3 px-4">{user.email}</td>
                    <td className="py-3 px-4">{user.name}</td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => toggleAdmin(user)}
                        className={`px-3 py-1 rounded font-semibold ${
                          user.isAdmin
                            ? "bg-green-600 text-white"
                            : "bg-gray-200 text-gray-700"
                        }`}
                      >
                        {user.isAdmin ? "DA" : "NU"}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => toggleBlocked(user)}
                        className={`px-3 py-1 rounded font-semibold ${
                          user.blocked
                            ? "bg-red-600 text-white"
                            : "bg-gray-200 text-gray-700"
                        }`}
                      >
                        {user.blocked ? "DA" : "NU"}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-center space-x-2">
                      <button
                        onClick={() => setEditPassword({ id: user.id, password: "" })}
                        className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                      >
                        Parolă
                      </button>
                      <button
                        onClick={() => deleteUser(user)}
                        className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                      >
                        Șterge
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Modal schimbare parolă */}
        {editPassword && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
              <h2 className="text-xl font-bold mb-4">Schimbă parola</h2>
              <p className="text-gray-600 mb-4">
                Utilizator ID: {editPassword.id}
              </p>
              <input
                type="password"
                placeholder="Parola nouă (min 6 caractere)"
                value={editPassword.password}
                onChange={(e) => setEditPassword({ ...editPassword, password: e.target.value })}
                className="w-full border rounded px-4 py-2 mb-4"
              />
              <div className="flex gap-3">
                <button
                  onClick={changePassword}
                  className="bg-green-600 text-white px-4 py-2 rounded font-semibold hover:bg-green-700"
                >
                  Salvează
                </button>
                <button
                  onClick={() => setEditPassword(null)}
                  className="bg-gray-400 text-white px-4 py-2 rounded font-semibold hover:bg-gray-500"
                >
                  Anulează
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
  );
}
