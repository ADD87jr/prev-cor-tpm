"use client";

import { useState, useEffect } from "react";

interface NotificationSuggestion {
  customerId: number;
  customerName: string;
  email: string;
  triggerType: "reactivation" | "vip_followup" | "cross_sell" | "anniversary" | "cart_abandon" | "review_request";
  reason: string;
  priority: "low" | "medium" | "high";
  lastOrder?: string;
  totalOrders?: number;
  totalSpent?: number;
}

interface GeneratedNotification {
  customerId: number;
  customerName: string;
  channel: "email" | "sms" | "push";
  subject: string;
  previewText: string;
  htmlContent: string;
  textContent: string;
  callToAction: string;
  ctaLink: string;
  personalizedOffers?: Array<{
    product: string;
    discount: string;
    reason: string;
  }>;
  bestSendTime: string;
  estimatedOpenRate: string;
}

export default function AIPersonalizedNotificationsPage() {
  const [suggestions, setSuggestions] = useState<NotificationSuggestion[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<number | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<NotificationSuggestion | null>(null);
  const [notificationResult, setNotificationResult] = useState<GeneratedNotification | null>(null);
  const [filterType, setFilterType] = useState<string>("all");

  useEffect(() => { loadSuggestions(); }, []);

  const loadSuggestions = async () => {
    setLoading(true);
    try {
      const res = await fetch("/admin/api/ai-personalized-notifications");
      const data = await res.json();
      setSuggestions(data.suggestions || []);
      setStats(data.stats);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const generateNotification = async (customer: NotificationSuggestion) => {
    setGenerating(customer.customerId);
    setSelectedCustomer(customer);
    setNotificationResult(null);

    try {
      const res = await fetch("/admin/api/ai-personalized-notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: customer.customerId,
          triggerType: customer.triggerType
        })
      });
      const data = await res.json();
      setNotificationResult(data);
    } catch (e) {
      console.error(e);
    }
    setGenerating(null);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Copiat!");
  };

  const getTriggerLabel = (type: string) => {
    const labels: Record<string, string> = {
      "reactivation": "🔄 Reactivare",
      "vip_followup": "⭐ VIP Follow-up",
      "cross_sell": "🛒 Cross-sell",
      "anniversary": "🎂 Aniversare",
      "cart_abandon": "🛒 Coș abandonat",
      "review_request": "⭐ Cerere review"
    };
    return labels[type] || type;
  };

  const getTriggerColor = (type: string) => {
    const colors: Record<string, string> = {
      "reactivation": "bg-yellow-100 text-yellow-700",
      "vip_followup": "bg-purple-100 text-purple-700",
      "cross_sell": "bg-blue-100 text-blue-700",
      "anniversary": "bg-pink-100 text-pink-700",
      "cart_abandon": "bg-red-100 text-red-700",
      "review_request": "bg-green-100 text-green-700"
    };
    return colors[type] || "bg-gray-100 text-gray-700";
  };

  const filteredSuggestions = filterType === "all" 
    ? suggestions 
    : suggestions.filter(s => s.triggerType === filterType);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">🔔 AI Notificări Personalizate</h1>
      <p className="text-gray-600 mb-6">
        Generează notificări și email-uri personalizate pentru fiecare client.
      </p>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-pink-600"></div>
        </div>
      ) : (
        <>
          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-6 gap-3 mb-6">
              <div className="bg-white rounded-lg shadow p-3 text-center">
                <p className="text-2xl font-bold">{stats.totalCustomers || suggestions.length}</p>
                <p className="text-xs text-gray-500">Total clienți</p>
              </div>
              <div className="bg-yellow-50 rounded-lg shadow p-3 text-center">
                <p className="text-2xl font-bold text-yellow-600">{stats.reactivation || 0}</p>
                <p className="text-xs text-yellow-500">De reactivat</p>
              </div>
              <div className="bg-purple-50 rounded-lg shadow p-3 text-center">
                <p className="text-2xl font-bold text-purple-600">{stats.vip || 0}</p>
                <p className="text-xs text-purple-500">VIP</p>
              </div>
              <div className="bg-blue-50 rounded-lg shadow p-3 text-center">
                <p className="text-2xl font-bold text-blue-600">{stats.crossSell || 0}</p>
                <p className="text-xs text-blue-500">Cross-sell</p>
              </div>
              <div className="bg-pink-50 rounded-lg shadow p-3 text-center">
                <p className="text-2xl font-bold text-pink-600">{stats.anniversary || 0}</p>
                <p className="text-xs text-pink-500">Aniversări</p>
              </div>
              <div className="bg-green-50 rounded-lg shadow p-3 text-center">
                <p className="text-2xl font-bold text-green-600">{stats.reviews || 0}</p>
                <p className="text-xs text-green-500">Cereri review</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Lista clienți */}
            <div className="bg-white rounded-lg shadow p-5">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-700">Clienți Sugerați</h2>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="text-sm border rounded px-2 py-1"
                >
                  <option value="all">Toate</option>
                  <option value="reactivation">Reactivare</option>
                  <option value="vip_followup">VIP</option>
                  <option value="cross_sell">Cross-sell</option>
                  <option value="anniversary">Aniversări</option>
                  <option value="review_request">Reviews</option>
                </select>
              </div>
              
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {filteredSuggestions.map((customer) => (
                  <div 
                    key={customer.customerId} 
                    className={`border rounded p-3 cursor-pointer hover:bg-gray-50 ${
                      selectedCustomer?.customerId === customer.customerId ? "border-pink-500 bg-pink-50" : ""
                    }`}
                    onClick={() => generateNotification(customer)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800 truncate">{customer.customerName}</p>
                        <p className="text-xs text-gray-500 truncate">{customer.email}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`text-xs px-2 py-0.5 rounded ${getTriggerColor(customer.triggerType)}`}>
                            {getTriggerLabel(customer.triggerType)}
                          </span>
                          {customer.priority === "high" && (
                            <span className="text-xs">🔴</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-1">{customer.reason}</p>
                      </div>
                      <div className="text-right text-xs text-gray-500">
                        {customer.totalOrders && <p>{customer.totalOrders} cmd</p>}
                        {customer.totalSpent && <p>{customer.totalSpent.toFixed(0)} RON</p>}
                        {generating === customer.customerId && (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-pink-600 mt-2 ml-auto"></div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {filteredSuggestions.length === 0 && (
                  <p className="text-gray-500 text-center py-4 text-sm">
                    Nu sunt sugestii pentru acest filtru
                  </p>
                )}
              </div>
            </div>

            {/* Notificare generată */}
            <div className="lg:col-span-2 bg-white rounded-lg shadow p-5">
              <h2 className="text-lg font-semibold text-gray-700 mb-4">
                Notificare Personalizată
              </h2>

              {generating !== null ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-pink-600 mb-4"></div>
                  <p className="text-gray-600">Generez notificarea personalizată...</p>
                </div>
              ) : notificationResult ? (
                <div className="space-y-4">
                  {/* Header */}
                  <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-gray-800">{notificationResult.customerName}</p>
                        <p className="text-sm text-gray-600">Canal: {notificationResult.channel.toUpperCase()}</p>
                      </div>
                      <div className="text-right text-sm">
                        <p className="text-pink-600">📈 Open rate estimat: {notificationResult.estimatedOpenRate}</p>
                        <p className="text-gray-500">⏰ Trimite: {notificationResult.bestSendTime}</p>
                      </div>
                    </div>
                  </div>

                  {/* Subject & Preview */}
                  <div className="bg-gray-50 rounded p-3 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600">Subject:</span>
                      <button onClick={() => copyToClipboard(notificationResult.subject)} className="text-xs text-pink-600">📋</button>
                    </div>
                    <p className="bg-white rounded p-2 text-sm font-medium">{notificationResult.subject}</p>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600">Preview:</span>
                    </div>
                    <p className="bg-white rounded p-2 text-sm text-gray-600">{notificationResult.previewText}</p>
                  </div>

                  {/* Content */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-gray-700">Conținut Email</span>
                      <button 
                        onClick={() => copyToClipboard(notificationResult.htmlContent || notificationResult.textContent)}
                        className="text-sm text-pink-600 hover:underline"
                      >
                        📋 Copiază HTML
                      </button>
                    </div>
                    <div 
                      className="border rounded p-4 bg-white max-h-[200px] overflow-y-auto prose prose-sm"
                      dangerouslySetInnerHTML={{ __html: notificationResult.htmlContent || notificationResult.textContent }}
                    />
                  </div>

                  {/* CTA */}
                  <div className="bg-blue-50 rounded p-3">
                    <p className="text-sm font-medium text-blue-800">Call to Action:</p>
                    <p className="text-blue-700 font-semibold">{notificationResult.callToAction}</p>
                    <p className="text-xs text-blue-600 mt-1">Link: {notificationResult.ctaLink}</p>
                  </div>

                  {/* Oferte personalizate */}
                  {notificationResult.personalizedOffers && notificationResult.personalizedOffers.length > 0 && (
                    <div>
                      <p className="font-medium text-gray-700 mb-2">🎁 Oferte personalizate:</p>
                      <div className="space-y-2">
                        {notificationResult.personalizedOffers.map((offer, i) => (
                          <div key={i} className="bg-green-50 rounded p-2 flex justify-between items-center">
                            <span className="font-medium text-green-800">{offer.product}</span>
                            <span className="text-green-600 font-bold">{offer.discount}</span>
                            <span className="text-xs text-green-500">{offer.reason}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Butoane */}
                  <div className="flex gap-2 pt-4 border-t">
                    <button className="flex-1 bg-pink-600 text-white py-2 rounded hover:bg-pink-700">
                      📤 Trimite acum
                    </button>
                    <button className="flex-1 bg-purple-600 text-white py-2 rounded hover:bg-purple-700">
                      ⏰ Programează
                    </button>
                    <button className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300">
                      ✏️ Edit
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-20">
                  <p className="text-gray-500 mb-2">Selectează un client pentru a genera notificarea</p>
                  <p className="text-xs text-gray-400">Email personalizat cu oferte și CTA optimizate</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
