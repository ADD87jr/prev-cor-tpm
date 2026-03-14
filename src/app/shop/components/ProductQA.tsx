"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "../../_components/LanguageContext";

interface Question {
  id: number;
  productId: number;
  userName: string;
  question: string;
  answer: string | null;
  answeredBy: string | null;
  answeredAt: string | null;
  createdAt: string;
}

export default function ProductQA({ productId }: { productId: number }) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ userName: "", email: "", question: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const { language } = useLanguage();

  const txt = {
    title: language === "en" ? "Questions & Answers" : "Întrebări și Răspunsuri",
    loading: language === "en" ? "Loading questions..." : "Se încarcă întrebările...",
    noQuestions: language === "en" ? "No questions for this product yet. Be the first to ask!" : "Nu există întrebări pentru acest produs. Fii primul care pune o întrebare!",
    askQuestion: language === "en" ? "Ask a question" : "Pune o întrebare",
    yourName: language === "en" ? "Your name" : "Numele tău",
    emailOptional: language === "en" ? "Email (optional, for notification)" : "Email (opțional, pentru notificare)",
    yourQuestion: language === "en" ? "Your question about the product..." : "Întrebarea ta despre produs...",
    sending: language === "en" ? "Sending..." : "Se trimite...",
    send: language === "en" ? "Send question" : "Trimite întrebarea",
    sent: language === "en" ? "Question sent! It will be visible after approval." : "Întrebarea a fost trimisă! Va fi vizibilă după aprobare.",
    answered: language === "en" ? "Answer" : "Răspuns",
    answeredBy: language === "en" ? "Answered by" : "Răspuns de",
    on: language === "en" ? "on" : "pe",
    cancel: language === "en" ? "Cancel" : "Anulează",
  };

  useEffect(() => {
    fetch(`/api/product-questions?productId=${productId}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setQuestions(data);
      })
      .finally(() => setLoading(false));
  }, [productId, sent]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    await fetch("/api/product-questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, productId }),
    });
    setForm({ userName: "", email: "", question: "" });
    setSent(true);
    setSending(false);
    setShowForm(false);
    setTimeout(() => setSent(false), 5000);
  }

  return (
    <div className="mt-12">
      <h2 className="text-2xl font-bold mb-4">{txt.title}</h2>

      {loading ? (
        <div>{txt.loading}</div>
      ) : questions.length === 0 ? (
        <div className="text-gray-500 mb-4">{txt.noQuestions}</div>
      ) : (
        <div className="space-y-4 mb-6">
          {questions.map((q) => (
            <div key={q.id} className="border rounded-lg p-4 bg-gray-50">
              <div className="flex items-start gap-3">
                <span className="text-blue-600 font-bold text-lg mt-0.5">Î:</span>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900">{q.question}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    {q.userName} — {new Date(q.createdAt).toLocaleDateString("ro-RO")}
                  </div>
                </div>
              </div>
              {q.answer && (
                <div className="flex items-start gap-3 mt-3 pl-2 border-l-2 border-green-400 ml-2">
                  <span className="text-green-600 font-bold text-lg mt-0.5">R:</span>
                  <div className="flex-1">
                    <div className="text-gray-800">{q.answer}</div>
                    <div className="text-xs text-gray-400 mt-1">
                      {txt.answeredBy}: {q.answeredBy || "Admin"}
                      {q.answeredAt && ` ${txt.on} ${new Date(q.answeredAt).toLocaleDateString("ro-RO")}`}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {sent && (
        <div className="text-green-700 text-sm bg-green-50 border border-green-200 rounded p-3 mb-4">
          {txt.sent}
        </div>
      )}

      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-5 py-2 rounded hover:bg-blue-700 transition"
        >
          {txt.askQuestion}
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="bg-gray-50 rounded p-4 flex flex-col gap-2 max-w-md border">
          <div className="font-semibold mb-1">{txt.askQuestion}</div>
          <input
            type="text"
            required
            placeholder={txt.yourName}
            className="border rounded px-3 py-2"
            value={form.userName}
            onChange={(e) => setForm((f) => ({ ...f, userName: e.target.value }))}
          />
          <input
            type="email"
            placeholder={txt.emailOptional}
            className="border rounded px-3 py-2"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
          <textarea
            required
            placeholder={txt.yourQuestion}
            className="border rounded px-3 py-2"
            rows={3}
            value={form.question}
            onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))}
          />
          <div className="flex gap-2">
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-60"
              disabled={sending}
            >
              {sending ? txt.sending : txt.send}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300"
            >
              {txt.cancel}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
