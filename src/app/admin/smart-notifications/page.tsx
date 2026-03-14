"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Notification {
  id: string;
  type: string;
  priority: string;
  title: string;
  message: string;
  action: string;
  data: any;
}

export default function SmartNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [aiSuggestion, setAiSuggestion] = useState<any>(null);
  const [filter, setFilter] = useState<string>("ALL");

  useEffect(() => {
    loadNotifications();
  }, []);

  async function loadNotifications() {
    setLoading(true);
    try {
      const res = await fetch("/admin/api/ai-smart-notifications");
      const data = await res.json();
      setNotifications(data.notifications || []);
      setStats(data.stats);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  async function getAiAction(notification: Notification) {
    setActionLoading(notification.id);
    try {
      const res = await fetch("/admin/api/ai-smart-notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notificationType: notification.type,
          notificationData: notification.data
        })
      });
      const data = await res.json();
      setAiSuggestion({ notificationId: notification.id, ...data.aiSuggestion });
    } catch (e) {
      console.error(e);
    }
    setActionLoading(null);
  }

  const filteredNotifications = filter === "ALL" 
    ? notifications 
    : notifications.filter(n => n.priority === filter || n.type === filter);

  const priorityColors: Record<string, string> = {
    CRITICAL: "bg-red-100 text-red-800 border-red-300",
    HIGH: "bg-orange-100 text-orange-800 border-orange-300",
    MEDIUM: "bg-yellow-100 text-yellow-800 border-yellow-300",
    LOW: "bg-green-100 text-green-800 border-green-300"
  };

  const typeIcons: Record<string, string> = {
    CLIENT_INACTIVE: "👤",
    LOW_STOCK: "📦",
    OUT_OF_STOCK: "❌",
    ORDER_DELAYED: "⏰",
    NEGATIVE_REVIEW: "⭐"
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/admin/ai-hub" className="text-blue-600 hover:underline text-sm">
            ← Înapoi la AI Hub
          </Link>
          <h1 className="text-2xl font-bold mt-2">🔔 Notificări Inteligente AI</h1>
          <p className="text-gray-600">Alerte automate pentru acțiuni importante</p>
        </div>
        <button
          onClick={loadNotifications}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          🔄 Actualizează
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-gray-100 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-gray-600">Total Notificări</div>
          </div>
          <div className="bg-red-100 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-red-700">{stats.critical}</div>
            <div className="text-sm text-red-600">Critice</div>
          </div>
          <div className="bg-orange-100 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-orange-700">{stats.high}</div>
            <div className="text-sm text-orange-600">Urgente</div>
          </div>
          <div className="bg-yellow-100 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-yellow-700">{stats.medium}</div>
            <div className="text-sm text-yellow-600">Medii</div>
          </div>
          <div className="bg-blue-100 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-blue-700">{stats.byType?.clientInactive || 0}</div>
            <div className="text-sm text-blue-600">Clienți Inactivi</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {["ALL", "CRITICAL", "HIGH", "MEDIUM", "CLIENT_INACTIVE", "LOW_STOCK", "ORDER_DELAYED"].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded text-sm ${
              filter === f ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            {f === "ALL" ? "Toate" : f.replace("_", " ")}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-10">Se încarcă notificările...</div>
      ) : (
        <div className="space-y-4">
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              ✅ Nu sunt notificări active!
            </div>
          ) : (
            filteredNotifications.map(notification => (
              <div
                key={notification.id}
                className={`border-2 rounded-lg p-4 ${priorityColors[notification.priority] || "bg-gray-100"}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">{typeIcons[notification.type] || "📌"}</span>
                      <span className="font-semibold">{notification.title}</span>
                      <span className={`px-2 py-0.5 text-xs rounded ${
                        notification.priority === "CRITICAL" ? "bg-red-600 text-white" :
                        notification.priority === "HIGH" ? "bg-orange-600 text-white" :
                        "bg-gray-600 text-white"
                      }`}>
                        {notification.priority}
                      </span>
                    </div>
                    <p className="text-sm mb-2">{notification.message}</p>
                    <div className="text-xs text-gray-600">
                      Acțiune recomandată: <strong>{notification.action}</strong>
                    </div>
                  </div>
                  <button
                    onClick={() => getAiAction(notification)}
                    disabled={actionLoading === notification.id}
                    className="px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700 disabled:opacity-50"
                  >
                    {actionLoading === notification.id ? "..." : "🤖 Asistență AI"}
                  </button>
                </div>

                {/* AI Suggestion */}
                {aiSuggestion && aiSuggestion.notificationId === notification.id && (
                  <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded">
                    <h4 className="font-semibold text-purple-800 mb-2">🤖 Sugestie AI:</h4>
                    <pre className="text-xs whitespace-pre-wrap bg-white p-2 rounded border">
                      {JSON.stringify(aiSuggestion, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
