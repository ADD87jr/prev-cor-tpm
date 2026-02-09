"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "../_components/LanguageContext";

export default function RegisterPage() {
  const { language } = useLanguage();
  const txt = {
    title: language === "en" ? "Register" : "Înregistrare",
    fullName: language === "en" ? "Full name" : "Nume complet",
    email: "Email",
    password: language === "en" ? "Password" : "Parolă",
    allFieldsRequired: language === "en" ? "All fields are required." : "Toate câmpurile sunt obligatorii.",
    passwordMinLength: language === "en" ? "Password must be at least 6 characters." : "Parola trebuie să aibă minim 6 caractere.",
    accountCreated: language === "en" ? "Account created! Logging in..." : "Cont creat! Se face autentificarea...",
    registerBtn: language === "en" ? "Register" : "Înregistrează-te",
    connectionError: language === "en" ? "Connection error. Please try again." : "Eroare de conexiune. Încearcă din nou.",
    accountError: language === "en" ? "Error creating account" : "Eroare la crearea contului",
  };
  
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    
    if (!form.name || !form.email || !form.password) {
      setError(txt.allFieldsRequired);
      return;
    }

    if (form.password.length < 6) {
      setError(txt.passwordMinLength);
      return;
    }

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || txt.accountError);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        signIn("credentials", {
          email: form.email,
          password: form.password,
          redirect: true,
          callbackUrl: "/account"
        });
      }, 1000);
    } catch (err) {
      setError(txt.connectionError);
    }
  }

  return (
    <div className="max-w-sm mx-auto mt-16 p-6 bg-white rounded-xl shadow">
      <h1 className="text-2xl font-bold mb-4">{txt.title}</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block font-medium mb-1">{txt.fullName}</label>
          <input
            id="name"
            type="text"
            name="name"
            placeholder={txt.fullName}
            className="w-full border rounded px-3 py-2"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            autoComplete="name"
            required
          />
        </div>
        <div>
          <label htmlFor="email" className="block font-medium mb-1">{txt.email}</label>
          <input
            id="email"
            type="email"
            name="email"
            placeholder={txt.email}
            className="w-full border rounded px-3 py-2"
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
            autoComplete="email"
            required
          />
        </div>
        <div>
          <label htmlFor="password" className="block font-medium mb-1">{txt.password}</label>
          <input
            id="password"
            type="password"
            name="password"
            placeholder={txt.password}
            className="w-full border rounded px-3 py-2"
            value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })}
            autoComplete="new-password"
            required
          />
        </div>
        {error && <div className="text-red-600 font-semibold">{error}</div>}
        {success && <div className="text-green-600 font-semibold">{txt.accountCreated}</div>}
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded font-semibold"
        >
          {txt.registerBtn}
        </button>
      </form>
    </div>
  );
}
