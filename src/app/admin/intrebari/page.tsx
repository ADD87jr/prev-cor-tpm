"use client";

import { useEffect, useState } from "react";
import Toast from "@/components/Toast";

interface ProductQuestion {
  id: number;
  productId: number;
  productName: string;
  userName: string;
  email: string | null;
  question: string;
  answer: string | null;
  answeredBy: string | null;
  answeredAt: string | null;
  approved: boolean;
  createdAt: string;
}

export default function AdminIntrebariPage() {
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  function showToast(message: string, type: "success" | "error" = "success") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  }

  const [questions, setQuestions] = useState<ProductQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "answered" | "unanswered">("all");
  const [answeringId, setAnsweringId] = useState<number | null>(null);
  const [answerText, setAnswerText] = useState("");

  useEffect(() => {
    fetchQuestions();
  }, []);

  function fetchQuestions() {
    fetch("/admin/api/product-questions")
      .then((res) => res.json())
      .then((data) => {
        setQuestions(data);
        setLoading(false);
      });
  }

  const handleApprove = async (id: number) => {
    const res = await fetch("/admin/api/product-questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "approve", id }),
    });
    const data = await res.json();
    if (data.success) {
      setQuestions(questions.map((q) => (q.id === id ? { ...q, approved: true } : q)));
      showToast("Întrebare aprobată!");
    }
  };

  const handleUnapprove = async (id: number) => {
    const res = await fetch("/admin/api/product-questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "unapprove", id }),
    });
    const data = await res.json();
    if (data.success) {
      setQuestions(questions.map((q) => (q.id === id ? { ...q, approved: false } : q)));
      showToast("Întrebare dezaprobată!");
    }
  };

  const handleAnswer = async (id: number) => {
    if (!answerText.trim()) return;
    const res = await fetch("/admin/api/product-questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "answer", id, answer: answerText, answeredBy: "Admin" }),
    });
    const data = await res.json();
    if (data.success) {
      setQuestions(
        questions.map((q) =>
          q.id === id
            ? { ...q, answer: answerText, answeredBy: "Admin", answeredAt: new Date().toISOString(), approved: true }
            : q
        )
      );
      setAnsweringId(null);
      setAnswerText("");
      showToast("Răspuns salvat cu succes!");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Sigur vrei să ștergi această întrebare?")) return;
    const res = await fetch("/admin/api/product-questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id }),
    });
    const data = await res.json();
    if (data.success) {
      setQuestions(questions.filter((q) => q.id !== id));
      showToast("Întrebare ștearsă!");
    } else {
      showToast("Eroare la ștergere!", "error");
    }
  };

  const filtered = questions.filter((q) => {
    if (filter === "pending") return !q.approved;
    if (filter === "answered") return q.answer;
    if (filter === "unanswered") return !q.answer;
    return true;
  });

  if (loading) return <div className="p-8">Se încarcă...</div>;

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      {toast && <Toast message={toast.message} type={toast.type} />}
      <h1 className="text-2xl font-bold mb-6">Întrebări Produse (Q&A)</h1>

      <div className="flex gap-2 mb-6 flex-wrap">
        {(["all", "pending", "unanswered", "answered"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded text-sm font-medium transition ${
              filter === f ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {f === "all" && `Toate (${questions.length})`}
            {f === "pending" && `Neaprobate (${questions.filter((q) => !q.approved).length})`}
            {f === "unanswered" && `Fără răspuns (${questions.filter((q) => !q.answer).length})`}
            {f === "answered" && `Răspunse (${questions.filter((q) => q.answer).length})`}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-gray-500">Nu sunt întrebări în această categorie.</div>
      ) : (
        <div className="space-y-4">
          {filtered.map((q) => (
            <div key={q.id} className={`border rounded-lg p-4 ${q.approved ? "bg-white" : "bg-yellow-50 border-yellow-300"}`}>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="font-semibold text-sm text-blue-700">{q.productName}</span>
                  <span className="text-gray-400 text-xs ml-2">ID: {q.productId}</span>
                </div>
                <div className="flex gap-1 items-center">
                  {q.approved ? (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Aprobat</span>
                  ) : (
                    <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">Neaprobat</span>
                  )}
                </div>
              </div>

              <div className="mb-2">
                <span className="font-bold text-blue-600">Î:</span>{" "}
                <span className="text-gray-900">{q.question}</span>
              </div>
              <div className="text-xs text-gray-400 mb-2">
                De: {q.userName} {q.email && `(${q.email})`} — {new Date(q.createdAt).toLocaleDateString("ro-RO")}
              </div>

              {q.answer && (
                <div className="border-l-2 border-green-400 pl-3 mb-2">
                  <span className="font-bold text-green-600">R:</span>{" "}
                  <span className="text-gray-800">{q.answer}</span>
                  <div className="text-xs text-gray-400 mt-1">
                    Răspuns de: {q.answeredBy || "Admin"}
                    {q.answeredAt && ` pe ${new Date(q.answeredAt).toLocaleDateString("ro-RO")}`}
                  </div>
                </div>
              )}

              {answeringId === q.id && (
                <div className="mt-2 flex flex-col gap-2">
                  <textarea
                    className="border rounded px-3 py-2 w-full"
                    rows={3}
                    placeholder="Scrie răspunsul..."
                    value={answerText}
                    onChange={(e) => setAnswerText(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAnswer(q.id)}
                      className="bg-green-600 text-white px-4 py-1.5 rounded text-sm hover:bg-green-700"
                    >
                      Salvează răspunsul
                    </button>
                    <button
                      onClick={() => { setAnsweringId(null); setAnswerText(""); }}
                      className="bg-gray-200 text-gray-700 px-4 py-1.5 rounded text-sm hover:bg-gray-300"
                    >
                      Anulează
                    </button>
                  </div>
                </div>
              )}

              <div className="flex gap-2 mt-3">
                {!q.approved && (
                  <button onClick={() => handleApprove(q.id)} className="text-sm px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200">
                    ✓ Aprobă
                  </button>
                )}
                {q.approved && (
                  <button onClick={() => handleUnapprove(q.id)} className="text-sm px-3 py-1 bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200">
                    ✕ Dezaprobă
                  </button>
                )}
                {answeringId !== q.id && (
                  <button
                    onClick={() => { setAnsweringId(q.id); setAnswerText(q.answer || ""); }}
                    className="text-sm px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                  >
                    {q.answer ? "✎ Editează răspunsul" : "💬 Răspunde"}
                  </button>
                )}
                <button onClick={() => handleDelete(q.id)} className="text-sm px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200">
                  🗑 Șterge
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
