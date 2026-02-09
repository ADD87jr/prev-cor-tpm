"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "../_components/LanguageContext";

export default function LoginPage() {
  const { language } = useLanguage();
  const txt = {
    title: language === "en" ? "Login" : "Autentificare",
    email: "Email",
    password: language === "en" ? "Password" : "Parolă",
    error: language === "en" ? "Incorrect email or password." : "Email sau parolă incorecte.",
    forgotPassword: language === "en" ? "Forgot password?" : "Ai uitat parola?",
    loginBtn: language === "en" ? "Login" : "Autentificare",
    orContinueWith: language === "en" ? "or continue with" : "sau continuă cu",
    noAccount: language === "en" ? "Don't have an account?" : "Nu ai cont?",
    register: language === "en" ? "Register here" : "Înregistrează-te aici",
  };
  
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await signIn("credentials", {
      email: form.email,
      password: form.password,
      redirect: false
    });
    if (res?.error) {
      setError(txt.error);
    } else {
      router.push("/account");
    }
  }

  async function handleSocialLogin(provider: "google" | "facebook") {
    setSocialLoading(provider);
    await signIn(provider, { callbackUrl: "/account" });
  }

  return (
    <div className="max-w-sm mx-auto mt-16 p-6 bg-white rounded-xl shadow">
      <h1 className="text-2xl font-bold mb-4">{txt.title}</h1>
      
      {/* Social Login Buttons */}
      <div className="space-y-3 mb-6">
        <button
          onClick={() => handleSocialLogin("google")}
          disabled={socialLoading !== null}
          className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 text-gray-700 py-2.5 px-4 rounded-lg font-medium hover:bg-gray-50 transition disabled:opacity-50"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {socialLoading === "google" ? "Se conectează..." : "Google"}
        </button>
        
        <button
          onClick={() => handleSocialLogin("facebook")}
          disabled={socialLoading !== null}
          className="w-full flex items-center justify-center gap-3 bg-[#1877F2] text-white py-2.5 px-4 rounded-lg font-medium hover:bg-[#166FE5] transition disabled:opacity-50"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
          {socialLoading === "facebook" ? "Se conectează..." : "Facebook"}
        </button>
      </div>
      
      {/* Separator */}
      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">{txt.orContinueWith}</span>
        </div>
      </div>
      
      {/* Email/Password Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="email"
          name="email"
          placeholder={txt.email}
          className="w-full border rounded px-3 py-2"
          value={form.email}
          onChange={e => setForm({ ...form, email: e.target.value })}
        />
        <input
          type="password"
          name="password"
          placeholder={txt.password}
          className="w-full border rounded px-3 py-2"
          value={form.password}
          onChange={e => setForm({ ...form, password: e.target.value })}
        />
        {error && <div className="text-red-600 font-semibold">{error}</div>}
        <div className="text-right">
          <Link href="/forgot-password" className="text-sm text-blue-600 hover:underline">
            {txt.forgotPassword}
          </Link>
        </div>
        <button
          type="submit"
          className="w-full bg-blue-700 text-white py-2 rounded font-bold hover:bg-blue-800 transition"
        >
          {txt.loginBtn}
        </button>
      </form>
      
      {/* Register Link */}
      <div className="mt-6 text-center text-sm text-gray-600">
        {txt.noAccount}{" "}
        <Link href="/register" className="text-blue-600 hover:underline font-medium">
          {txt.register}
        </Link>
      </div>
    </div>
  );
}
