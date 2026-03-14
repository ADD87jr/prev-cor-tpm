"use client";

import SalesDashboard from "../SalesDashboard";
import PushNotificationToggle from "../PushNotificationToggle";
import AIBusinessAdvisor from "../_components/AIBusinessAdvisor";
import { useEffect, useState } from "react";
import React from "react";


export default function AdminDashboardPage() {
  // --- HOOK-URI LA ÎNCEPUTUL COMPONENTEI ---
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [resetProductsLoading, setResetProductsLoading] = useState(false);
  const [resetOrdersLoading, setResetOrdersLoading] = useState(false);
  const [resetProductsMsg, setResetProductsMsg] = useState<string | null>(null);
  const [resetOrdersMsg, setResetOrdersMsg] = useState<string | null>(null);
  // Mod întreținere
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceLoading, setMaintenanceLoading] = useState(false);
  // Pentru demo: cheltuieli cu editare/adăugare/ștergere
  const [cheltuieli, setCheltuieli] = useState<any[]>([]);
  const [editIdx, setEditIdx] = useState<number|null>(null);
  const [newCheltuiala, setNewCheltuiala] = useState({ furnizor: "", data: "", suma: "", tip: "" });
  // Filtre pentru comenzi
  const [comenziPerioada, setComenziPerioada] = useState("toate");
  const [comenziStatus, setComenziStatus] = useState("");
  // Filtru pentru cheltuieli
  const [cheltuieliPerioada, setCheltuieliPerioada] = useState("toate");

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch("/admin/api/products").then(res => res.ok ? res.json() : []).catch(() => []),
      fetch("/api/orders").then(res => res.ok ? res.json() : []).catch(() => []),
      fetch("/admin/api/cheltuieli").then(res => res.ok ? res.json() : []).catch(() => []),
      fetch("/admin/api/maintenance").then(res => res.ok ? res.json() : { maintenanceMode: false }).catch(() => ({ maintenanceMode: false }))
    ]).then(([productsData, ordersData, cheltuieliData, maintenanceData]) => {
      setProducts(Array.isArray(productsData) ? productsData : []);
      setOrders(Array.isArray(ordersData) ? ordersData : []);
      setCheltuieli(Array.isArray(cheltuieliData) ? cheltuieliData : []);
      setMaintenanceMode(maintenanceData?.maintenanceMode || false);
      setLoading(false);
    });
  }, []);

  const toggleMaintenanceMode = async () => {
    setMaintenanceLoading(true);
    try {
      const res = await fetch("/admin/api/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !maintenanceMode })
      });
      const data = await res.json();
      if (data.success) {
        setMaintenanceMode(data.maintenanceMode);
      }
    } catch (e) {
      console.error("Eroare la schimbare mod întreținere:", e);
    }
    setMaintenanceLoading(false);
  };

  if (loading) return <div className="p-8 text-center">Se încarcă datele...</div>;

  // Filtrare anti-dubluri pentru orders (strict ca în admin/orders)
  function normalizePaymentMethod(method: string) {
    if (!method) return '';
    const m = method.toLowerCase().replace(/\s+/g, '').trim();
    if (m === 'card' || m === 'cardonline') return 'card online';
    return 'card online' === m ? 'card online' : m;
  }
  function normalizeStatus(status: string) {
    if (!status) return '';
    return status.toLowerCase().trim();
  }
  function normalizeEmail(email: string) {
    return (email || '').toLowerCase().trim();
  }
  function normalizeItems(items: any[]) {
    return (items || [])
      .map(i => ({ id: i.id, name: (i.name || '').trim(), quantity: Number(i.quantity || i.qty || 1) }))
      .sort((a, b) => String(a.id || '').localeCompare(String(b.id || '')) || a.name.localeCompare(b.name) || a.quantity - b.quantity);
  }
  const groups = new Map<string, any[]>();
  for (const order of orders) {
    const groupKey = [
      normalizeEmail(order.clientData?.email || order.user?.email || ''),
      JSON.stringify(normalizeItems(order.items)),
      normalizePaymentMethod(order.paymentMethod),
      order.id // Folosim ID-ul pentru a nu grupa comenzi diferite
    ].join('|');
    if (!groups.has(groupKey)) groups.set(groupKey, []);
    groups.get(groupKey)!.push(order);
  }
  const uniqueOrders: any[] = [];
  for (const group of groups.values()) {
    const toKeep = group.reduce((min, o) => o.total < min.total ? o : min, group[0]);
    uniqueOrders.push(toKeep);
  }

  // Sumar rapid
  const totalVenituri = uniqueOrders.reduce((sum: number, o: any) => sum + (o.total || 0), 0);
  const totalComenzi = uniqueOrders.length;
  const totalCheltuieli = cheltuieli.reduce((sum, c) => sum + c.suma, 0);
  const profit = totalVenituri - totalCheltuieli;

  // Card stoc, intrări, ieșiri
  const totalStoc = products.reduce((sum: number, p: any) => sum + (p.stock || 0), 0);
  // Presupunem că intrările sunt suma purchasePrice * cantitate pentru toate produsele (sau altă logică dacă există)
  const totalIntrari = products.reduce((sum: number, p: any) => sum + ((p.purchasePrice || 0) * (p.stock || 0)), 0);
  // Ieșirile = suma totală vândută (din uniqueOrders)
  const totalIesiri = uniqueOrders.reduce((sum: number, o: any) => sum + (o.total || 0), 0);

  function handleEdit(idx: number) {
    setEditIdx(idx);
    setNewCheltuiala({
      furnizor: cheltuieli[idx].furnizor,
      data: cheltuieli[idx].data,
      suma: cheltuieli[idx].suma.toString(),
      tip: cheltuieli[idx].tip,
    });
  }
  function handleSave(idx: number) {
    const updated = [...cheltuieli];
    updated[idx] = {
      ...updated[idx],
      ...newCheltuiala,
      suma: parseFloat(newCheltuiala.suma),
    };
    setCheltuieli(updated);
    setEditIdx(null);
  }
  function handleDelete(idx: number) {
    setCheltuieli(cheltuieli.filter((_, i) => i !== idx));
  }
  function handleAdd() {
    if (!newCheltuiala.furnizor || !newCheltuiala.data || !newCheltuiala.suma) return;
    setCheltuieli([
      ...cheltuieli,
      {
        id: cheltuieli.length ? Math.max(...cheltuieli.map((c: any) => c.id)) + 1 : 1,
        furnizor: newCheltuiala.furnizor,
        data: newCheltuiala.data,
        suma: parseFloat(newCheltuiala.suma),
        tip: newCheltuiala.tip,
      },
    ]);
    setNewCheltuiala({ furnizor: "", data: "", suma: "", tip: "" });
  }

  // Filtre pentru comenzi
  // (definite la începutul componentei)

  // Helper pentru filtrare după perioadă
  function isInPerioada(dateStr: string, perioada: string) {
    if (perioada === "toate") return true;
    const azi = new Date();
    const data = new Date(dateStr);
    if (perioada === "azi") {
      return data.toDateString() === azi.toDateString();
    }
    if (perioada === "saptamana") {
      const first = azi.getDate() - azi.getDay() + 1;
      const start = new Date(azi.setDate(first));
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return data >= start && data <= end;
    }
    if (perioada === "luna") {
      return data.getMonth() === azi.getMonth() && data.getFullYear() === azi.getFullYear();
    }
    return true;
  }

  return (
    <div className="relative">
      {/* Notificări Push */}
      <div className="mb-6">
        <PushNotificationToggle />
      </div>

      {/* AI Business Advisor */}
      <div className="mb-6">
        <AIBusinessAdvisor />
      </div>
      
      {/* Mod Întreținere */}
      <div className="mb-6 bg-white rounded-xl shadow p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-800">Mod Întreținere</h3>
            <p className="text-sm text-gray-500">
              {maintenanceMode 
                ? "Site-ul afișează pagina de mentenanță pentru vizitatori" 
                : "Site-ul funcționează normal"}
            </p>
          </div>
          <button
            onClick={toggleMaintenanceMode}
            disabled={maintenanceLoading}
            className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors ${
              maintenanceMode ? 'bg-orange-500' : 'bg-gray-300'
            } ${maintenanceLoading ? 'opacity-50' : ''}`}
          >
            <span
              className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition-transform ${
                maintenanceMode ? 'translate-x-9' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
        {maintenanceMode && (
          <div className="mt-3 p-2 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-700">
            ⚠️ Vizitatorii văd acum pagina de mentenanță! Admin-ul rămâne accesibil.
          </div>
        )}
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <div className="bg-gray-100 border-l-4 border-gray-500 rounded shadow p-4 flex flex-col">
                  <span className="text-xs text-gray-700 font-semibold uppercase">Total stoc produse</span>
                  <span className="text-2xl font-bold text-gray-900">{totalStoc}</span>
                  <span className="text-xs text-gray-500 mt-2">Total intrări: <b>{totalIntrari.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON</b></span>
                  <span className="text-xs text-gray-500">Total ieșiri: <b>{totalIesiri.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON</b></span>
                </div>
        <div className="bg-green-100 border-l-4 border-green-500 rounded shadow p-4 flex flex-col">
          <span className="text-xs text-green-700 font-semibold uppercase">Total venituri</span>
          <span className="text-2xl font-bold text-green-900">{totalVenituri.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON</span>
        </div>
        <div className="bg-blue-100 border-l-4 border-blue-500 rounded shadow p-4 flex flex-col">
          <span className="text-xs text-blue-700 font-semibold uppercase">Total comenzi</span>
          <span className="text-2xl font-bold text-blue-900">{totalComenzi}</span>
        </div>
        <div className="bg-red-100 border-l-4 border-red-500 rounded shadow p-4 flex flex-col">
          <span className="text-xs text-red-700 font-semibold uppercase">Total cheltuieli</span>
          <span className="text-2xl font-bold text-red-900">{totalCheltuieli.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON</span>
        </div>
        <div className="bg-yellow-100 border-l-4 border-yellow-500 rounded shadow p-4 flex flex-col">
          <span className="text-xs text-yellow-700 font-semibold uppercase">Profit net</span>
          <span className="text-2xl font-bold text-yellow-900">{profit.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON</span>
        </div>
      </div>
      {/* Statistici Status Comenzi */}
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Status comenzi</h3>
        <div className="flex gap-4 flex-wrap">
          <div className="bg-blue-100 border-l-4 border-blue-500 rounded px-4 py-2 text-blue-900 font-semibold min-w-[140px]">
            <span className="block text-xs text-blue-600">Noi</span>
            <span className="text-xl">{uniqueOrders.filter(o => o.status === "nouă").length}</span>
            <span className="text-xs text-blue-600 ml-1">({uniqueOrders.length ? Math.round(uniqueOrders.filter(o => o.status === "nouă").length / uniqueOrders.length * 100) : 0}%)</span>
          </div>
          <div className="bg-orange-100 border-l-4 border-orange-500 rounded px-4 py-2 text-orange-900 font-semibold min-w-[140px]">
            <span className="block text-xs text-orange-600">În așteptare plată</span>
            <span className="text-xl">{uniqueOrders.filter(o => o.status === "așteptare plată").length}</span>
            <span className="text-xs text-orange-600 ml-1">({uniqueOrders.length ? Math.round(uniqueOrders.filter(o => o.status === "așteptare plată").length / uniqueOrders.length * 100) : 0}%)</span>
          </div>
          <div className="bg-yellow-100 border-l-4 border-yellow-500 rounded px-4 py-2 text-yellow-900 font-semibold min-w-[140px]">
            <span className="block text-xs text-yellow-600">Procesate</span>
            <span className="text-xl">{uniqueOrders.filter(o => o.status === "procesată").length}</span>
            <span className="text-xs text-yellow-600 ml-1">({uniqueOrders.length ? Math.round(uniqueOrders.filter(o => o.status === "procesată").length / uniqueOrders.length * 100) : 0}%)</span>
          </div>
          <div className="bg-green-100 border-l-4 border-green-500 rounded px-4 py-2 text-green-900 font-semibold min-w-[140px]">
            <span className="block text-xs text-green-600">Livrate</span>
            <span className="text-xl">{uniqueOrders.filter(o => o.status === "livrată").length}</span>
            <span className="text-xs text-green-600 ml-1">({uniqueOrders.length ? Math.round(uniqueOrders.filter(o => o.status === "livrată").length / uniqueOrders.length * 100) : 0}%)</span>
          </div>
        </div>
      </div>
      
      {/* Statistici Sursă Comenzi */}
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Sursă comenzi</h3>
        <div className="flex gap-4 flex-wrap">
          <div className="bg-indigo-100 border-l-4 border-indigo-500 rounded px-4 py-2 text-indigo-900 font-semibold min-w-[140px]">
            <span className="block text-xs text-indigo-600">Online</span>
            <span className="text-xl">{uniqueOrders.filter(o => o.source === "online").length}</span>
            <span className="text-xs text-indigo-600 ml-1">({uniqueOrders.length ? Math.round(uniqueOrders.filter(o => o.source === "online").length / uniqueOrders.length * 100) : 0}%)</span>
          </div>
          <div className="bg-gray-100 border-l-4 border-gray-500 rounded px-4 py-2 text-gray-900 font-semibold min-w-[140px]">
            <span className="block text-xs text-gray-600">Manuale</span>
            <span className="text-xl">{uniqueOrders.filter(o => o.source === "manual").length}</span>
            <span className="text-xs text-gray-600 ml-1">({uniqueOrders.length ? Math.round(uniqueOrders.filter(o => o.source === "manual").length / uniqueOrders.length * 100) : 0}%)</span>
          </div>
        </div>
      </div>
      
      {/* Timpi medii */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Performanță</h3>
        <div className="flex gap-4 flex-wrap">
          <div className="bg-blue-50 border-l-4 border-blue-400 rounded px-4 py-2 text-blue-900 font-semibold min-w-[180px]">
            <span className="block text-xs text-blue-600">Timp mediu procesare</span>
            <span className="text-xl">{(() => {
              const proc = uniqueOrders.filter(o => o.status === "procesată" && o.statusUpdatedAt && o.date);
              if (!proc.length) return '0h';
              const avgMinutes = proc.reduce((sum, o) => sum + ((new Date(o.statusUpdatedAt).getTime() - new Date(o.date).getTime()) / 60000), 0) / proc.length;
              const hours = Math.floor(avgMinutes / 60);
              const mins = Math.round(avgMinutes % 60);
              return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
            })()}</span>
          </div>
          <div className="bg-green-50 border-l-4 border-green-400 rounded px-4 py-2 text-green-900 font-semibold min-w-[180px]">
            <span className="block text-xs text-green-600">Timp mediu livrare</span>
            <span className="text-xl">{(() => {
              const liv = uniqueOrders.filter(o => o.status === "livrată" && o.statusUpdatedAt && o.date);
              if (!liv.length) return '0h';
              const avgMinutes = liv.reduce((sum, o) => sum + ((new Date(o.statusUpdatedAt).getTime() - new Date(o.date).getTime()) / 60000), 0) / liv.length;
              const hours = Math.floor(avgMinutes / 60);
              const mins = Math.round(avgMinutes % 60);
              return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
            })()}</span>
          </div>
        </div>
      </div>

      {/* Alertă stoc mic - exclude produsele "pe comandă" (onDemand) */}
      {(() => {
        const lowStockProducts = products.filter((p: any) => typeof p.stock === 'number' && p.stock <= 5 && p.stock >= 0 && !p.onDemand);
        if (lowStockProducts.length === 0) return null;
        return (
          <div className="mb-6 bg-orange-50 border border-orange-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">⚠️</span>
              <h3 className="font-bold text-orange-800">Alerte stoc redus ({lowStockProducts.length} produse)</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {lowStockProducts.slice(0, 6).map((p: any) => (
                <div key={p.id} className={`flex items-center justify-between p-3 rounded-lg ${p.stock === 0 ? 'bg-red-100 border-red-300 border' : 'bg-orange-100'}`}>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{p.name}</p>
                    <p className="text-xs text-gray-600">{p.sku || p.productCode || 'N/A'}</p>
                  </div>
                  <div className={`ml-2 px-3 py-1 rounded-full text-sm font-bold ${p.stock === 0 ? 'bg-red-500 text-white' : 'bg-orange-500 text-white'}`}>
                    {p.stock === 0 ? 'Epuizat' : `${p.stock} buc`}
                  </div>
                </div>
              ))}
            </div>
            {lowStockProducts.length > 6 && (
              <div className="mt-3 text-center">
                <a href="/admin/products" className="text-orange-700 hover:underline font-semibold text-sm">
                  Vezi toate ({lowStockProducts.length} produse cu stoc redus) →
                </a>
              </div>
            )}
          </div>
        );
      })()}

      {/* Tabel ultimele comenzi */}
      <div className="bg-white rounded shadow mb-8 overflow-x-auto">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <h2 className="text-lg font-bold">Ultimele comenzi</h2>
          <div className="flex gap-2 items-center">
            <select value={comenziPerioada} onChange={e => setComenziPerioada(e.target.value)} className="border rounded px-2 py-1 text-sm">
              <option value="toate">Toate perioadele</option>
              <option value="azi">Azi</option>
              <option value="saptamana">Săptămâna aceasta</option>
              <option value="luna">Luna aceasta</option>
            </select>
            <select value={comenziStatus} onChange={e => setComenziStatus(e.target.value)} className="border rounded px-2 py-1 text-sm">
              <option value="">Toate statusurile</option>
              <option value="nouă">Nouă</option>
              <option value="procesată">Procesată</option>
              <option value="livrată">Livrată</option>
            </select>
          </div>
        </div>
        <table className="min-w-full text-sm table-fixed">
          <thead className="bg-blue-50">
            <tr>
              <th className="p-2 w-16 text-center">ID</th>
              <th className="p-2 w-40 text-center">Data</th>
              <th className="p-2 w-48 text-center">Client</th>
              <th className="p-2 w-32 text-center">Total</th>
              <th className="p-2 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
                    {uniqueOrders.filter((order: any) => {
              if (comenziPerioada !== "toate" && order.date) {
                if (!isInPerioada(order.date, comenziPerioada)) return false;
              }
              if (comenziStatus && order.status !== comenziStatus) return false;
              return true;
            }).slice(-10).reverse().map((order: any, idx: number) => (
              <tr key={order.id} className="border-b">
                          <td className="p-2 font-mono text-center w-16">{idx + 1}</td>
                <td className="p-2 text-center w-40">{order.date ? new Date(order.date).toLocaleString("ro-RO", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "-"}</td>
                <td className="p-2 text-center w-48">{order.clientData?.denumire || order.clientData?.name || order.clientData?.email || order.user?.name || order.user?.email || "-"}</td>
                <td className="p-2 text-center w-32">{
                  typeof order.total === 'number' 
                    ? `${order.total.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON`
                    : '-'
                }</td>
                <td className="p-2 text-center">{['card', 'card online'].includes((order.paymentMethod || '').toLowerCase()) ? 'Card online' : (order.paymentMethod || order.status)} <span className="text-xs text-gray-500">{order.source === 'manual' ? '(manuală)' : '(online)'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="bg-white rounded shadow mb-8 overflow-x-auto">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <h2 className="text-lg font-bold">Ultimele cheltuieli / achiziții</h2>
          <div className="flex gap-2 items-center">
            <select value={cheltuieliPerioada} onChange={e => setCheltuieliPerioada(e.target.value)} className="border rounded px-2 py-1 text-sm">
              <option value="toate">Toate perioadele</option>
              <option value="azi">Azi</option>
              <option value="saptamana">Săptămâna aceasta</option>
              <option value="luna">Luna aceasta</option>
            </select>
            <a href="/admin/cheltuieli" className="text-blue-600 underline text-sm">Vezi toate cheltuielile</a>
          </div>
        </div>
        <table className="min-w-full text-sm table-fixed">
          <thead className="bg-red-50">
            <tr>
              <th className="p-2 w-16 text-center">ID</th>
              <th className="p-2 w-56 text-center">Furnizor</th>
              <th className="p-2 w-32 text-center">Data</th>
              <th className="p-2 w-32 text-center">Sumă</th>
              <th className="p-2 text-center">Tip</th>
            </tr>
          </thead>
          <tbody>
            {[...cheltuieli].filter((c: any) => {
              if (cheltuieliPerioada !== "toate" && c.data) {
                if (!isInPerioada(c.data, cheltuieliPerioada)) return false;
              }
              return true;
            }).sort((a: any, b: any) => new Date(b.data).getTime() - new Date(a.data).getTime()).slice(0, 10).map((c: any, idx: number) => (
              <tr key={c.id || idx} className="border-b">
                <td className="p-2 font-mono text-center w-16">{c.id}</td>
                <td className="p-2 text-center w-56">{c.furnizor}</td>
                <td className="p-2 text-center w-32">{c.data ? new Date(c.data).toLocaleDateString('ro-RO') : '-'} </td>
                <td className="p-2 text-center w-32">{c.suma?.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON</td>
                <td className="p-2 text-center">{c.tip}</td>
              </tr>
            ))}
            {cheltuieli.length === 0 && (
              <tr><td colSpan={5} className="p-2 text-center text-gray-400">Nu există cheltuieli înregistrate.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <SalesDashboard products={products} orders={orders} cheltuieli={cheltuieli} />
    </div>
  );
}
