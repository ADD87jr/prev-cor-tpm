"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface TaskAction {
  id: string;
  label: string;
  endpoint: string | null;
  color: string;
  href?: string;
}

interface Task {
  id: string;
  type: string;
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  title: string;
  description: string;
  data: any;
  actions: TaskAction[];
  createdAt: string;
}

interface Stats {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  byType: Record<string, number>;
}

const priorityColors = {
  CRITICAL: "bg-red-100 border-red-500 text-red-800",
  HIGH: "bg-orange-100 border-orange-500 text-orange-800",
  MEDIUM: "bg-yellow-100 border-yellow-500 text-yellow-800",
  LOW: "bg-blue-100 border-blue-500 text-blue-800"
};

const priorityBadges = {
  CRITICAL: "bg-red-600 text-white",
  HIGH: "bg-orange-500 text-white",
  MEDIUM: "bg-yellow-500 text-black",
  LOW: "bg-blue-500 text-white"
};

const typeIcons: Record<string, string> = {
  REORDER: "📦",
  ORDER_CONFIRM: "📋",
  PRICE_ADJUST: "💰",
  REVIEW_MODERATE: "⭐",
  QUESTION_ANSWER: "❓",
  INVOICE_GENERATE: "🧾"
};

const typeNames: Record<string, string> = {
  REORDER: "Comenzi furnizori",
  ORDER_CONFIRM: "Comenzi",
  PRICE_ADJUST: "Prețuri",
  REVIEW_MODERATE: "Recenzii",
  QUESTION_ANSWER: "Întrebări",
  INVOICE_GENERATE: "Facturi"
};

export default function CommandCenterPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());
  const [messages, setMessages] = useState<Record<string, { type: string; text: string }>>({});

  // Cheie localStorage bazată pe dată (task-urile revin a doua zi)
  const getTodayKey = () => {
    const today = new Date().toISOString().split('T')[0];
    return `command-center-completed-${today}`;
  };

  // Încarcă task-urile completate din localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(getTodayKey());
      if (stored) {
        setCompletedTasks(new Set(JSON.parse(stored)));
      }
      // Curăță cheile vechi (mai vechi de 7 zile)
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('command-center-completed-') && key !== getTodayKey()) {
          const dateStr = key.replace('command-center-completed-', '');
          const keyDate = new Date(dateStr);
          const daysOld = (Date.now() - keyDate.getTime()) / (24 * 60 * 60 * 1000);
          if (daysOld > 7) localStorage.removeItem(key);
        }
      });
    } catch (e) {
      console.error("Error loading completed tasks:", e);
    }
  }, []);

  // Salvează în localStorage când se schimbă completedTasks
  useEffect(() => {
    if (completedTasks.size > 0) {
      try {
        localStorage.setItem(getTodayKey(), JSON.stringify([...completedTasks]));
      } catch (e) {
        console.error("Error saving completed tasks:", e);
      }
    }
  }, [completedTasks]);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await fetch("/admin/api/ai-daily-tasks");
      const data = await res.json();
      setTasks(data.tasks || []);
      setStats(data.stats || null);
    } catch (e) {
      console.error("Error fetching tasks:", e);
    }
    setLoading(false);
  };

  const executeAction = async (task: Task, action: TaskAction) => {
    if (!action.endpoint) return;
    
    setExecuting(task.id);
    try {
      const res = await fetch(action.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: task.id,
          actionId: action.id,
          data: task.data
        })
      });
      const result = await res.json();
      
      if (result.success) {
        setCompletedTasks(prev => new Set([...prev, task.id]));
        setMessages(prev => ({ ...prev, [task.id]: { type: "success", text: result.message } }));
      } else {
        setMessages(prev => ({ ...prev, [task.id]: { type: "error", text: result.message || "Eroare la execuție" } }));
      }
    } catch (e: any) {
      setMessages(prev => ({ ...prev, [task.id]: { type: "error", text: e.message } }));
    }
    setExecuting(null);
  };

  const skipTask = (taskId: string) => {
    setCompletedTasks(prev => new Set([...prev, taskId]));
    setMessages(prev => ({ ...prev, [taskId]: { type: "info", text: "Amânat pentru mai târziu" } }));
  };

  const approveAll = async (type: string) => {
    const tasksOfType = filteredTasks.filter(t => t.type === type && !completedTasks.has(t.id));
    for (const task of tasksOfType) {
      const approveAction = task.actions.find(a => a.id === "approve" || a.id === "confirm" || a.id === "generate");
      if (approveAction?.endpoint) {
        await executeAction(task, approveAction);
      }
    }
  };

  const filteredTasks = tasks.filter(t => {
    if (filter === "all") return true;
    if (filter === "pending") return !completedTasks.has(t.id);
    return t.type === filter;
  });

  const pendingCount = tasks.filter(t => !completedTasks.has(t.id)).length;

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">🎯 Command Center</h1>
        <p className="text-gray-600">
          Priorități zilnice pentru aprobare - {pendingCount} task-uri în așteptare
        </p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
          <div className="bg-white rounded-lg shadow p-3 border-l-4 border-gray-500">
            <p className="text-2xl font-bold text-gray-800">{pendingCount}</p>
            <p className="text-xs text-gray-500">În așteptare</p>
          </div>
          <div className="bg-white rounded-lg shadow p-3 border-l-4 border-red-500">
            <p className="text-2xl font-bold text-red-600">{stats.critical}</p>
            <p className="text-xs text-gray-500">Critice</p>
          </div>
          <div className="bg-white rounded-lg shadow p-3 border-l-4 border-orange-500">
            <p className="text-2xl font-bold text-orange-600">{stats.high}</p>
            <p className="text-xs text-gray-500">Importante</p>
          </div>
          <div className="bg-white rounded-lg shadow p-3 border-l-4 border-yellow-500">
            <p className="text-2xl font-bold text-yellow-600">{stats.medium}</p>
            <p className="text-xs text-gray-500">Medii</p>
          </div>
          <div className="bg-white rounded-lg shadow p-3 border-l-4 border-blue-500">
            <p className="text-2xl font-bold text-blue-600">{stats.low}</p>
            <p className="text-xs text-gray-500">Minore</p>
          </div>
          <div className="bg-white rounded-lg shadow p-3 border-l-4 border-green-500">
            <p className="text-2xl font-bold text-green-600">{completedTasks.size}</p>
            <p className="text-xs text-gray-500">Completate</p>
          </div>
        </div>
      )}

      {/* Filtre */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button 
          onClick={() => setFilter("all")}
          className={`px-3 py-1 rounded-full text-sm font-medium transition ${filter === "all" ? "bg-gray-800 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
        >
          Toate ({tasks.length})
        </button>
        <button 
          onClick={() => setFilter("pending")}
          className={`px-3 py-1 rounded-full text-sm font-medium transition ${filter === "pending" ? "bg-purple-600 text-white" : "bg-purple-100 text-purple-700 hover:bg-purple-200"}`}
        >
          În așteptare ({pendingCount})
        </button>
        {Object.entries(stats?.byType || {}).map(([type, count]) => (
          count > 0 && (
            <button 
              key={type}
              onClick={() => setFilter(type.toUpperCase())}
              className={`px-3 py-1 rounded-full text-sm font-medium transition ${filter === type.toUpperCase() ? "bg-blue-600 text-white" : "bg-blue-100 text-blue-700 hover:bg-blue-200"}`}
            >
              {typeIcons[type.toUpperCase()]} {typeNames[type.toUpperCase()] || type} ({count})
            </button>
          )
        ))}
      </div>

      {/* Bulk Actions */}
      {pendingCount > 0 && (
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 mb-6 border border-purple-200">
          <h3 className="font-semibold text-purple-800 mb-2">⚡ Acțiuni rapide</h3>
          <div className="flex flex-wrap gap-2">
            {stats && stats.byType.reorder > 0 && (
              <button 
                onClick={() => approveAll("REORDER")}
                className="bg-green-600 text-white px-3 py-1 rounded text-sm font-medium hover:bg-green-700 transition"
              >
                ✅ Aprobă toate comenzile de stoc ({stats.byType.reorder})
              </button>
            )}
            {stats && stats.byType.reviews > 0 && (
              <button 
                onClick={() => approveAll("REVIEW_MODERATE")}
                className="bg-amber-600 text-white px-3 py-1 rounded text-sm font-medium hover:bg-amber-700 transition"
              >
                ✅ Aprobă toate recenziile ({stats.byType.reviews})
              </button>
            )}
            {stats && stats.byType.invoices > 0 && (
              <button 
                onClick={() => approveAll("INVOICE_GENERATE")}
                className="bg-emerald-600 text-white px-3 py-1 rounded text-sm font-medium hover:bg-emerald-700 transition"
              >
                🧾 Generează toate facturile ({stats.byType.invoices})
              </button>
            )}
          </div>
        </div>
      )}

      {/* Tasks List */}
      {filteredTasks.length === 0 ? (
        <div className="bg-green-50 rounded-xl p-8 text-center border border-green-200">
          <span className="text-5xl mb-4 block">🎉</span>
          <h3 className="font-bold text-xl text-green-800 mb-2">Totul e la zi!</h3>
          <p className="text-green-600">Nu ai task-uri care necesită atenție.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map(task => {
            const isCompleted = completedTasks.has(task.id);
            const message = messages[task.id];
            
            return (
              <div 
                key={task.id}
                className={`rounded-xl border-l-4 p-4 transition-all ${
                  isCompleted 
                    ? "bg-gray-100 border-gray-300 opacity-60" 
                    : priorityColors[task.priority]
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">{typeIcons[task.type] || "📌"}</span>
                      <h3 className={`font-semibold ${isCompleted ? "line-through text-gray-500" : ""}`}>
                        {task.title}
                      </h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${priorityBadges[task.priority]}`}>
                        {task.priority}
                      </span>
                    </div>
                    <p className={`text-sm ${isCompleted ? "text-gray-400" : "text-gray-600"}`}>
                      {task.description}
                    </p>
                    
                    {message && (
                      <div className={`mt-2 text-sm px-3 py-1 rounded ${
                        message.type === "success" ? "bg-green-200 text-green-800" :
                        message.type === "error" ? "bg-red-200 text-red-800" :
                        "bg-gray-200 text-gray-800"
                      }`}>
                        {message.text}
                      </div>
                    )}
                  </div>
                  
                  {!isCompleted && (
                    <div className="flex gap-2 flex-shrink-0">
                      {task.actions.map(action => (
                        action.href ? (
                          <Link key={action.id} href={action.href}>
                            <span className={`px-3 py-1 rounded text-sm font-medium cursor-pointer transition ${
                              action.color === "blue" ? "bg-blue-600 text-white hover:bg-blue-700" :
                              action.color === "green" ? "bg-green-600 text-white hover:bg-green-700" :
                              action.color === "red" ? "bg-red-600 text-white hover:bg-red-700" :
                              action.color === "purple" ? "bg-purple-600 text-white hover:bg-purple-700" :
                              "bg-gray-500 text-white hover:bg-gray-600"
                            }`}>
                              {action.label}
                            </span>
                          </Link>
                        ) : action.endpoint ? (
                          <button
                            key={action.id}
                            onClick={() => executeAction(task, action)}
                            disabled={executing === task.id}
                            className={`px-3 py-1 rounded text-sm font-medium transition disabled:opacity-50 ${
                              action.color === "green" ? "bg-green-600 text-white hover:bg-green-700" :
                              action.color === "red" ? "bg-red-600 text-white hover:bg-red-700" :
                              action.color === "purple" ? "bg-purple-600 text-white hover:bg-purple-700" :
                              "bg-gray-500 text-white hover:bg-gray-600"
                            }`}
                          >
                            {executing === task.id ? "..." : action.label}
                          </button>
                        ) : (
                          <button
                            key={action.id}
                            onClick={() => skipTask(task.id)}
                            className="px-3 py-1 rounded text-sm font-medium bg-gray-400 text-white hover:bg-gray-500 transition"
                          >
                            {action.label}
                          </button>
                        )
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Refresh button */}
      <div className="mt-8 text-center">
        <button
          onClick={fetchTasks}
          className="bg-gray-800 text-white px-6 py-2 rounded-lg font-medium hover:bg-gray-900 transition"
        >
          🔄 Reîncarcă prioritățile
        </button>
      </div>
    </div>
  );
}
