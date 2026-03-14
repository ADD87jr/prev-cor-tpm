"use client";

import { useState, useEffect } from "react";

// Funcție pentru normalizare text (elimină diacritice)
const normalize = (str: string) => str?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') || '';

interface Supplier {
  id: number;
  name: string;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  cui: string | null;
  address: string | null;
  notes: string | null;
  rating: number;
  active: boolean;
  products: any[];
  purchaseOrders: any[];
}

export default function FurnizoriPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({
    name: "", contactPerson: "", email: "", phone: "", website: "", cui: "", address: "", notes: "", rating: 5,
  });
  // Linking products
  const [linkSupplier, setLinkSupplier] = useState<number | null>(null);
  const [linkForm, setLinkForm] = useState({ id: null as number | null, productId: "", supplierCode: "", supplierPrice: "", currency: "EUR", minQuantity: "1", deliveryDays: "" });
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [supplierProducts, setSupplierProducts] = useState<any[]>([]);
  // Autocomplete search
  const [productSearch, setProductSearch] = useState("");
  const [productSearchOpen, setProductSearchOpen] = useState(false);
  const [selectedProductName, setSelectedProductName] = useState("");
  const [saving, setSaving] = useState(false);
  // AI supplier search
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [aiSearching, setAiSearching] = useState(false);
  const [aiAdding, setAiAdding] = useState(false);
  const [aiStats, setAiStats] = useState<any>(null);
  const [aiError, setAiError] = useState("");

  useEffect(() => { fetchSuppliers(); }, []);

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/admin/api/suppliers");
      const data = await res.json();
      setSuppliers(data.suppliers || []);
    } catch { }
    setLoading(false);
  };

  const saveSupplier = async () => {
    setSaving(true);
    try {
      const method = editId ? "PUT" : "POST";
      const body = editId ? { id: editId, ...form } : form;
      const res = await fetch("/admin/api/suppliers", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (res.ok) {
        setShowForm(false);
        setEditId(null);
        setForm({ name: "", contactPerson: "", email: "", phone: "", website: "", cui: "", address: "", notes: "", rating: 5 });
        fetchSuppliers();
        alert(editId ? "✅ Furnizor actualizat!" : "✅ Furnizor adăugat cu succes!");
      } else {
        alert("❌ Eroare: " + (data.error || "Nu s-a putut salva furnizorul"));
      }
    } catch (err: any) {
      alert("❌ Eroare de conexiune: " + (err?.message || "Verifică conexiunea"));
    }
    setSaving(false);
  };

  const deleteSupplier = async (id: number) => {
    if (!confirm("Sigur vrei să ștergi acest furnizor?")) return;
    await fetch(`/admin/api/suppliers?id=${id}`, { method: "DELETE" });
    fetchSuppliers();
  };

  const openEdit = (s: Supplier) => {
    setEditId(s.id);
    setForm({
      name: s.name, contactPerson: s.contactPerson || "", email: s.email || "",
      phone: s.phone || "", website: s.website || "", cui: s.cui || "",
      address: s.address || "", notes: s.notes || "", rating: s.rating,
    });
    setShowForm(true);
  };

  const openLink = async (supplierId: number) => {
    setLinkSupplier(supplierId);
    setLinkForm({ id: null, productId: "", supplierCode: "", supplierPrice: "", currency: "EUR", minQuantity: "1", deliveryDays: "" });
    setProductSearch(""); setSelectedProductName(""); setProductSearchOpen(false);
    // Fetch all products and current supplier products
    try {
      const [prodRes, spRes] = await Promise.all([
        fetch("/admin/api/stocuri?all=true&threshold=999"),
        fetch(`/admin/api/supplier-products?supplierId=${supplierId}`),
      ]);
      const prodData = await prodRes.json();
      setAllProducts(prodData.items || []);
      const spData = await spRes.json();
      console.log("[DEBUG] supplier-products response:", spData);
      setSupplierProducts(Array.isArray(spData) ? spData : []);
    } catch (err) { console.error("[DEBUG] Fetch error:", err); }
  };

  const linkProduct = async () => {
    if ((!linkForm.id && !linkForm.productId) || !linkForm.supplierPrice) return;
    setSaving(true);
    try {
      const isEdit = linkForm.id !== null;
      await fetch("/admin/api/supplier-products", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: linkForm.id,
          supplierId: linkSupplier,
          productId: Number(linkForm.productId),
          supplierCode: linkForm.supplierCode,
          supplierPrice: Number(linkForm.supplierPrice),
          currency: linkForm.currency || "EUR",
          minQuantity: Number(linkForm.minQuantity) || 1,
          deliveryDays: linkForm.deliveryDays ? Number(linkForm.deliveryDays) : null,
        }),
      });
      if (linkSupplier) openLink(linkSupplier);
      setLinkForm({ id: null, productId: "", supplierCode: "", supplierPrice: "", currency: "EUR", minQuantity: "1", deliveryDays: "" });
      setProductSearch(""); setSelectedProductName("");
    } catch { }
    setSaving(false);
  };

  const editSupplierProduct = (sp: any) => {
    setLinkForm({
      id: sp.id,
      productId: String(sp.productId),
      supplierCode: sp.supplierCode || "",
      supplierPrice: String(sp.supplierPrice),
      currency: sp.currency || "EUR",
      minQuantity: String(sp.minQuantity || 1),
      deliveryDays: sp.deliveryDays ? String(sp.deliveryDays) : "",
    });
  };

  const unlinkProduct = async (id: number) => {
    await fetch(`/admin/api/supplier-products?id=${id}`, { method: "DELETE" });
    if (linkSupplier) openLink(linkSupplier);
  };

  const aiSearch = async () => {
    setAiSearching(true);
    setAiError("");
    setAiSuggestions([]);
    try {
      const res = await fetch("/admin/api/ai-suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "search" }),
      });
      const data = await res.json();
      if (data.error && (!data.suggestions || data.suggestions.length === 0)) {
        setAiError(data.error);
      } else {
        setAiSuggestions(data.suggestions || []);
        setAiStats(data.productStats || null);
        if (data.note) setAiError(data.note);
      }
    } catch {
      setAiError("Eroare la căutare AI");
    }
    setAiSearching(false);
  };

  const aiAddAll = async () => {
    setAiAdding(true);
    try {
      const res = await fetch("/admin/api/ai-suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add-all" }),
      });
      const data = await res.json();
      if (data.added > 0) {
        setAiSuggestions([]);
        fetchSuppliers();
        alert(`✅ ${data.added} furnizori adăugați automat!`);
      } else {
        alert("Nu s-au găsit furnizori noi de adăugat.");
      }
    } catch {
      alert("Eroare la adăugarea furnizorilor.");
    }
    setAiAdding(false);
  };

  const aiAddOne = async (suggestion: any) => {
    setSaving(true);
    try {
      const res = await fetch("/admin/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...suggestion,
          notes: `[AI] ${suggestion.notes || ""}`
        }),
      });
      if (res.ok) {
        setAiSuggestions(prev => prev.filter(s => s.name !== suggestion.name));
        fetchSuppliers();
      }
    } catch { }
    setSaving(false);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">🏭 Manager Furnizori</h1>

      <div className="mb-4 flex gap-3 flex-wrap">
        <button onClick={() => { setShowForm(!showForm); setEditId(null); setForm({ name: "", contactPerson: "", email: "", phone: "", website: "", cui: "", address: "", notes: "", rating: 5 }); }}
          className="bg-blue-600 text-white px-5 py-2 rounded font-semibold hover:bg-blue-700 transition">
          {showForm ? "✕ Anulează" : "➕ Adaugă Furnizor"}
        </button>
        <button onClick={aiSearch} disabled={aiSearching}
          className="bg-violet-600 text-white px-5 py-2 rounded font-semibold hover:bg-violet-700 disabled:opacity-50 transition">
          {aiSearching ? "⏳ AI caută furnizori..." : "🤖 Caută furnizori cu AI"}
        </button>
        {aiSuggestions.length > 0 && (
          <button onClick={aiAddAll} disabled={aiAdding}
            className="bg-green-600 text-white px-5 py-2 rounded font-semibold hover:bg-green-700 disabled:opacity-50 transition">
            {aiAdding ? "⏳ Se adaugă..." : `✅ Adaugă toți ${aiSuggestions.length} furnizori`}
          </button>
        )}
      </div>

      {aiError && <div className={`${aiSuggestions.length > 0 ? "bg-amber-50 border-amber-300 text-amber-700" : "bg-red-50 border-red-300 text-red-700"} border rounded-lg p-3 mb-4 text-sm`}>{aiError}</div>}

      {aiSuggestions.length > 0 && (
        <div className="bg-violet-50 border border-violet-300 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-bold mb-1">🤖 Furnizori sugerați de AI</h2>
          {aiStats && <p className="text-xs text-gray-500 mb-3">Bazat pe {aiStats.totalProducts} produse din domenii: {aiStats.domains?.join(", ")}</p>}
          <div className="space-y-3">
            {aiSuggestions.map((s: any, i: number) => (
              <div key={i} className="bg-white rounded-lg p-3 shadow-sm flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{s.name}</span>
                    <span className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded">⭐ {s.rating}/10</span>
                  </div>
                  {s.website && <a href={s.website.startsWith("http") ? s.website : `https://${s.website}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-xs hover:underline">{s.website}</a>}
                  <div className="text-sm text-gray-600 mt-1">{s.notes}</div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {s.email && <span>📧 {s.email} </span>}
                    {s.phone && <span>📞 {s.phone} </span>}
                    {s.address && <span>📍 {s.address}</span>}
                  </div>
                </div>
                <button onClick={() => aiAddOne(s)} disabled={saving}
                  className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 disabled:opacity-50 whitespace-nowrap">➕ Adaugă</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-bold mb-4">{editId ? "Editare furnizor" : "Furnizor nou"}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium mb-1">Nume firmă *</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="border rounded px-3 py-2 w-full" /></div>
            <div><label className="block text-sm font-medium mb-1">Persoană contact</label>
              <input value={form.contactPerson || ''} onChange={e => setForm({ ...form, contactPerson: e.target.value })} className="border rounded px-3 py-2 w-full" /></div>
            <div><label className="block text-sm font-medium mb-1">Email</label>
              <input type="email" value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} className="border rounded px-3 py-2 w-full" /></div>
            <div><label className="block text-sm font-medium mb-1">Telefon</label>
              <input value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })} className="border rounded px-3 py-2 w-full" /></div>
            <div><label className="block text-sm font-medium mb-1">Website</label>
              <input value={form.website || ''} onChange={e => setForm({ ...form, website: e.target.value })} className="border rounded px-3 py-2 w-full" /></div>
            <div><label className="block text-sm font-medium mb-1">CUI</label>
              <input value={form.cui || ''} onChange={e => setForm({ ...form, cui: e.target.value })} className="border rounded px-3 py-2 w-full" /></div>
            <div className="md:col-span-2"><label className="block text-sm font-medium mb-1">Adresă</label>
              <input value={form.address || ''} onChange={e => setForm({ ...form, address: e.target.value })} className="border rounded px-3 py-2 w-full" /></div>
            <div><label className="block text-sm font-medium mb-1">Rating (1-10)</label>
              <input type="number" min={1} max={10} value={form.rating || ''} onChange={e => setForm({ ...form, rating: Number(e.target.value) })} className="border rounded px-3 py-2 w-24" /></div>
            <div className="md:col-span-2"><label className="block text-sm font-medium mb-1">Note</label>
              <textarea value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} className="border rounded px-3 py-2 w-full" rows={2} /></div>
          </div>
          <button onClick={saveSupplier} disabled={saving || !form.name} className="mt-4 bg-green-600 text-white px-6 py-2 rounded font-semibold hover:bg-green-700 disabled:opacity-50">
            {saving ? "Se salvează..." : editId ? "💾 Salvează" : "➕ Adaugă"}
          </button>
        </div>
      )}

      {loading ? <p suppressHydrationWarning>Se încarcă...</p> : suppliers.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          <p className="text-4xl mb-2">🏭</p>
          <p>Nu ai furnizori adăugați încă. Adaugă primul furnizor!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {suppliers.map(s => (
            <div key={s.id} className="bg-white rounded-lg shadow p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold">{s.name} {!s.active && <span className="text-red-500 text-sm">(Inactiv)</span>}</h3>
                  <div className="text-sm text-gray-600 mt-1 space-y-0.5">
                    {s.contactPerson && <p>👤 {s.contactPerson}</p>}
                    {s.email && <p>📧 {s.email}</p>}
                    {s.phone && <p>📞 {s.phone}</p>}
                    {s.cui && <p>🏢 CUI: {s.cui}</p>}
                    {s.address && <p>📍 {s.address}</p>}
                    <p>⭐ Rating: {s.rating}/10 • 📦 {s.products?.length || 0} produse • 📋 {s.purchaseOrders?.length || 0} comenzi</p>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => openLink(s.id)} className="bg-purple-600 text-white px-3 py-1 rounded text-sm hover:bg-purple-700">🔗 Produse</button>
                  <button onClick={() => openEdit(s)} className="bg-amber-500 text-white px-3 py-1 rounded text-sm hover:bg-amber-600">✏️</button>
                  <button onClick={() => deleteSupplier(s.id)} className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700">🗑️</button>
                </div>
              </div>

              {linkSupplier === s.id && (
                <div className="mt-4 border-t pt-4">
                  <h4 className="font-bold mb-2">Produse asociate</h4>
                  {supplierProducts.length > 0 && (
                    <table className="w-full text-sm mb-4">
                      <thead><tr className="bg-gray-100"><th className="px-2 py-1 text-left">Produs</th><th className="px-2 py-1">Cod</th><th className="px-2 py-1">Preț furnizor</th><th className="px-2 py-1">Monedă</th><th className="px-2 py-1">Cant. min</th><th className="px-2 py-1">Zile</th><th className="px-2 py-1"></th></tr></thead>
                      <tbody>
                        {supplierProducts.map((sp: any) => (
                          <tr key={sp.id} className="border-b">
                            <td className="px-2 py-1">{sp.product?.name || `#${sp.productId}`}{sp.variant && <span className="text-blue-600 ml-1">→ {sp.variant.code}</span>}</td>
                            <td className="px-2 py-1 text-center">{sp.supplierCode || "-"}</td>
                            <td className="px-2 py-1 text-center font-semibold">{sp.supplierPrice}</td>
                            <td className="px-2 py-1 text-center font-semibold text-blue-600">{sp.currency || 'EUR'}</td>
                            <td className="px-2 py-1 text-center">{sp.minQuantity}</td>
                            <td className="px-2 py-1 text-center">{sp.deliveryDays || "-"}</td>
                            <td className="px-2 py-1 text-center">
                              <button onClick={() => editSupplierProduct(sp)} className="text-blue-600 hover:underline text-xs mr-2">Editează</button>
                              <button onClick={() => unlinkProduct(sp.id)} className="text-red-600 hover:underline text-xs">Șterge</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  <div className="flex gap-2 items-end flex-wrap">
                    <div>
                      <label className="text-xs">Produs</label>
                      <select value={linkForm.productId} onChange={e => setLinkForm({ ...linkForm, productId: e.target.value })} className="border rounded px-2 py-1 text-sm w-64">
                        <option value="">-- Alege produs --</option>
                        {allProducts.map((p: any, idx: number) => <option key={`product-${p.id}-${idx}`} value={p.id}>{p.name} ({p.sku})</option>)}
                      </select>
                    </div>
                    <div><label className="text-xs">Cod furnizor</label><input value={linkForm.supplierCode} onChange={e => setLinkForm({ ...linkForm, supplierCode: e.target.value })} className="border rounded px-2 py-1 text-sm w-28" /></div>
                    <div><label className="text-xs">Preț furnizor *</label><input type="number" step="0.01" value={linkForm.supplierPrice} onChange={e => setLinkForm({ ...linkForm, supplierPrice: e.target.value })} className="border rounded px-2 py-1 text-sm w-24" /></div>
                    <div><label className="text-xs">Monedă</label><select value={linkForm.currency} onChange={e => setLinkForm({ ...linkForm, currency: e.target.value })} className="border rounded px-2 py-1 text-sm w-20"><option value="EUR">EUR</option><option value="RON">RON</option></select></div>
                    <div><label className="text-xs">Cant. min</label><input type="number" value={linkForm.minQuantity} onChange={e => setLinkForm({ ...linkForm, minQuantity: e.target.value })} className="border rounded px-2 py-1 text-sm w-16" /></div>
                    <div><label className="text-xs">Zile livrare</label><input type="number" value={linkForm.deliveryDays} onChange={e => setLinkForm({ ...linkForm, deliveryDays: e.target.value })} className="border rounded px-2 py-1 text-sm w-16" /></div>
                    <button onClick={linkProduct} disabled={saving} className={`${linkForm.id ? 'bg-orange-600 hover:bg-orange-700' : 'bg-green-600 hover:bg-green-700'} text-white px-3 py-1 rounded text-sm disabled:opacity-50`}>{linkForm.id ? '💾 Salvează' : '➕ Adaugă'}</button>
                    {linkForm.id && <button onClick={() => setLinkForm({ id: null, productId: "", supplierCode: "", supplierPrice: "", currency: "EUR", minQuantity: "1", deliveryDays: "" })} className="text-gray-500 text-sm hover:underline">Anulează</button>}
                    <button onClick={() => setLinkSupplier(null)} className="text-gray-500 text-sm hover:underline">Închide</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
