"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function WarrantyPredictorPage() {
  const [warrantyAlerts, setWarrantyAlerts] = useState<any[]>([]);
  const [serviceRecommendations, setServiceRecommendations] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [maintenancePlan, setMaintenancePlan] = useState<any>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"warranty" | "service">("warranty");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch("/admin/api/ai-warranty-predictor");
      const data = await res.json();
      setWarrantyAlerts(data.warrantyAlerts || []);
      setServiceRecommendations(data.serviceRecommendations || []);
      setStats(data.stats);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  async function generateMaintenancePlan(email: string) {
    setSelectedClient(email);
    setPlanLoading(true);
    try {
      const res = await fetch("/admin/api/ai-warranty-predictor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientEmail: email })
      });
      const data = await res.json();
      setMaintenancePlan(data);
    } catch (e) {
      console.error(e);
    }
    setPlanLoading(false);
  }

  // Get unique clients from alerts
  const uniqueClients = [...new Set([
    ...warrantyAlerts.map(a => a.clientEmail),
    ...serviceRecommendations.map(s => s.clientEmail)
  ])].filter(Boolean);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/admin/ai-hub" className="text-blue-600 hover:underline text-sm">
            ← Înapoi la AI Hub
          </Link>
          <h1 className="text-2xl font-bold mt-2">🛡️ Predictor Garanții & Service</h1>
          <p className="text-gray-600">Monitorizare garanții și mentenanță preventivă</p>
        </div>
        <button
          onClick={loadData}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          🔄 Actualizează
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-orange-100 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-orange-700">{stats.warrantyExpiringSoon}</div>
            <div className="text-sm text-orange-600">Garanții Expiră Curând</div>
          </div>
          <div className="bg-red-100 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-red-700">{stats.criticalWarranty}</div>
            <div className="text-sm text-red-600">Expiră în 7 zile</div>
          </div>
          <div className="bg-blue-100 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-blue-700">{stats.serviceRecommended}</div>
            <div className="text-sm text-blue-600">Service Recomandat</div>
          </div>
          <div className="bg-purple-100 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-purple-700">{stats.highPriorityService}</div>
            <div className="text-sm text-purple-600">Prioritate Mare</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab("warranty")}
          className={`px-4 py-2 rounded ${activeTab === "warranty" ? "bg-orange-600 text-white" : "bg-gray-200"}`}
        >
          🛡️ Garanții ({warrantyAlerts.length})
        </button>
        <button
          onClick={() => setActiveTab("service")}
          className={`px-4 py-2 rounded ${activeTab === "service" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
        >
          🔧 Service ({serviceRecommendations.length})
        </button>
      </div>

      {loading ? (
        <div className="text-center py-10">Se încarcă datele...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main List */}
          <div className="lg:col-span-2 space-y-3">
            {activeTab === "warranty" ? (
              warrantyAlerts.length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                  ✅ Nu sunt garanții care expiră curând
                </div>
              ) : (
                warrantyAlerts.map(alert => (
                  <div
                    key={alert.id}
                    className={`border rounded-lg p-4 ${
                      alert.daysUntilExpiry <= 7 ? "bg-red-50 border-red-300" : "bg-orange-50 border-orange-300"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold">{alert.productName}</h3>
                        <div className="text-sm text-gray-600 mt-1">
                          <div>Comandă: #{alert.orderNumber}</div>
                          <div>Client: {alert.clientName}</div>
                          <div>Cumpărat: {alert.purchaseDate}</div>
                          <div>Expiră: <strong>{alert.warrantyEndDate}</strong></div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-1 rounded text-sm ${
                          alert.daysUntilExpiry <= 7 ? "bg-red-600 text-white" : "bg-orange-600 text-white"
                        }`}>
                          {alert.daysUntilExpiry} zile
                        </span>
                        <div className="text-xs text-gray-500 mt-2">{alert.suggestion}</div>
                        <button
                          onClick={() => generateMaintenancePlan(alert.clientEmail)}
                          className="mt-2 text-xs text-blue-600 hover:underline"
                        >
                          Vezi plan mentenanță →
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )
            ) : (
              serviceRecommendations.length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                  ✅ Nu sunt recomandări de service
                </div>
              ) : (
                serviceRecommendations.map(rec => (
                  <div
                    key={rec.id}
                    className={`border rounded-lg p-4 ${
                      rec.urgency === "HIGH" ? "bg-red-50 border-red-300" : "bg-blue-50 border-blue-300"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold">{rec.productName}</h3>
                        <div className="text-sm text-gray-600 mt-1">
                          <div>Tip: {rec.type}</div>
                          <div>Client: {rec.clientName}</div>
                          <div>Luni de la achiziție: {rec.monthsSincePurchase}</div>
                          <div className="mt-2 font-medium text-blue-700">
                            Service recomandat: {rec.recommendedService}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-1 rounded text-sm ${
                          rec.urgency === "HIGH" ? "bg-red-600 text-white" : "bg-blue-600 text-white"
                        }`}>
                          {rec.urgency}
                        </span>
                        <button
                          onClick={() => generateMaintenancePlan(rec.clientEmail)}
                          className="mt-2 block text-xs text-blue-600 hover:underline"
                        >
                          Generează plan →
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )
            )}
          </div>

          {/* Maintenance Plan Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white border rounded-lg p-4 sticky top-4">
              <h3 className="font-semibold mb-4">🤖 Plan Mentenanță AI</h3>
              
              <select
                value={selectedClient}
                onChange={(e) => generateMaintenancePlan(e.target.value)}
                className="w-full px-3 py-2 border rounded mb-4"
              >
                <option value="">Selectează client...</option>
                {uniqueClients.map(email => (
                  <option key={email} value={email}>{email}</option>
                ))}
              </select>

              {planLoading ? (
                <div className="text-center py-10">Se generează planul...</div>
              ) : maintenancePlan ? (
                <div className="space-y-4 text-sm">
                  <div className="bg-gray-100 p-3 rounded">
                    <div className="font-medium">{maintenancePlan.client?.name}</div>
                    <div className="text-xs text-gray-600">
                      {maintenancePlan.client?.totalOrders} comenzi | {maintenancePlan.client?.totalProducts} produse
                    </div>
                  </div>

                  {maintenancePlan.maintenancePlan?.summary && (
                    <div className="bg-blue-50 p-3 rounded">
                      <div className="text-xs font-medium text-blue-700">Rezumat</div>
                      <div className="text-xs">{maintenancePlan.maintenancePlan.summary}</div>
                    </div>
                  )}

                  {maintenancePlan.maintenancePlan?.annualMaintenanceCost && (
                    <div className="bg-green-50 p-3 rounded">
                      <div className="text-xs font-medium text-green-700">Cost Anual Estimat</div>
                      <div className="text-lg font-bold text-green-800">
                        {maintenancePlan.maintenancePlan.annualMaintenanceCost}
                      </div>
                    </div>
                  )}

                  {maintenancePlan.maintenancePlan?.maintenanceSchedule && (
                    <div>
                      <div className="text-xs font-medium mb-2">📅 Calendar Service</div>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {maintenancePlan.maintenancePlan.maintenanceSchedule.slice(0, 6).map((item: any, i: number) => (
                          <div key={i} className="bg-gray-50 p-2 rounded text-xs">
                            <div className="font-medium">{item.month}</div>
                            <div className="text-gray-600">{item.actions?.join(", ")}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {maintenancePlan.maintenancePlan?.warrantyExtensionOffer?.eligible && (
                    <div className="bg-purple-50 p-3 rounded">
                      <div className="text-xs font-medium text-purple-700">🎁 Ofertă Extensie Garanție</div>
                      <div className="text-xs">{maintenancePlan.maintenancePlan.warrantyExtensionOffer.suggestedPrice}</div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-gray-500 text-sm">
                  Selectează un client pentru a genera planul de mentenanță AI
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
