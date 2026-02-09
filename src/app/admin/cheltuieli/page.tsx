"use client";

import { useState, useEffect } from "react";

interface Cheltuiala {
  id: number;
  furnizor: string;
  data: string;
  suma: number;
  tip: string;
  proiect: string;
}

interface Item {
  id: number;
  name: string;
}

// Funcție export CSV
function exportToCSV(cheltuieli: Cheltuiala[], filename: string) {
  const headers = ["ID", "Furnizor", "Data", "Suma (RON)", "Categorie", "Proiect"];
  const rows = cheltuieli.map(c => [
    c.id,
    c.furnizor,
    c.data ? new Date(c.data).toLocaleDateString('ro-RO') : '',
    c.suma?.toFixed(2) || '0.00',
    c.tip || '',
    c.proiect || ''
  ]);
  
  const csvContent = [
    headers.join(","),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
  ].join("\n");
  
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

// Funcție export Excel (folosind format CSV compatibil Excel)
function exportToExcel(cheltuieli: Cheltuiala[], filename: string) {
  const headers = ["ID", "Furnizor", "Data", "Suma (RON)", "Categorie", "Proiect"];
  const rows = cheltuieli.map(c => [
    c.id,
    c.furnizor,
    c.data ? new Date(c.data).toLocaleDateString('ro-RO') : '',
    c.suma?.toFixed(2) || '0.00',
    c.tip || '',
    c.proiect || ''
  ]);
  
  // Tab-separated pentru Excel
  const tsvContent = [
    headers.join("\t"),
    ...rows.map(row => row.join("\t"))
  ].join("\n");
  
  const blob = new Blob(["\uFEFF" + tsvContent], { type: "application/vnd.ms-excel;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

export default function CheltuieliPage() {
  const [cheltuieli, setCheltuieli] = useState<Cheltuiala[]>([]);
  const [proiecte, setProiecte] = useState<Item[]>([]);
  const [categorii, setCategorii] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [editIdx, setEditIdx] = useState<number|null>(null);
  const [newCheltuiala, setNewCheltuiala] = useState({ furnizor: "", data: "", suma: "", tip: "", proiect: "" });
  const [cheltuialaErr, setCheltuialaErr] = useState("");
  // Tab activ
  const [activeTab, setActiveTab] = useState<'cheltuieli' | 'proiecte' | 'categorii'>('cheltuieli');
  // Gestionare proiecte/categorii
  const [newItem, setNewItem] = useState("");
  const [editItemId, setEditItemId] = useState<number | null>(null);
  const [editItemName, setEditItemName] = useState("");
  const [itemErr, setItemErr] = useState("");
  const [filterProiect, setFilterProiect] = useState("");
  const [filterCategorie, setFilterCategorie] = useState("");
  const [filterDataStart, setFilterDataStart] = useState("");
  const [filterDataEnd, setFilterDataEnd] = useState("");
  // Toast feedback
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  function showToast(message: string, type: 'success' | 'error' = 'success') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  }

  // Încarcă date la montare
  useEffect(() => {
    Promise.all([
      fetch("/admin/api/cheltuieli").then(res => res.json()),
      fetch("/admin/api/cheltuieli?type=proiecte").then(res => res.json()),
      fetch("/admin/api/cheltuieli?type=categorii").then(res => res.json())
    ]).then(([chelt, proj, cat]) => {
      setCheltuieli(chelt);
      setProiecte(proj);
      setCategorii(cat);
      setLoading(false);
    });
  }, []);

  // === FUNCȚII PENTRU CHELTUIELI ===
  async function handleEditCheltuiala(idx: number) {
    setEditIdx(idx);
    const c = cheltuieli[idx];
    setNewCheltuiala({
      furnizor: c.furnizor,
      data: c.data,
      suma: c.suma.toString(),
      tip: c.tip,
      proiect: c.proiect || "",
    });
  }

  async function handleSaveCheltuiala(idx: number) {
    setCheltuialaErr("");
    if (!newCheltuiala.furnizor || !newCheltuiala.data || !newCheltuiala.suma) {
      setCheltuialaErr("Completează toate câmpurile obligatorii!");
      return;
    }
    const c = cheltuieli[idx];
    const res = await fetch("/admin/api/cheltuieli", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "update",
        id: c.id,
        furnizor: newCheltuiala.furnizor,
        data: newCheltuiala.data,
        suma: parseFloat(newCheltuiala.suma),
        tip: newCheltuiala.tip,
        proiect: newCheltuiala.proiect,
      }),
    });
    if (res.ok) {
      const updated = [...cheltuieli];
      updated[idx] = {
        ...updated[idx],
        furnizor: newCheltuiala.furnizor,
        data: newCheltuiala.data,
        suma: parseFloat(newCheltuiala.suma),
        tip: newCheltuiala.tip,
        proiect: newCheltuiala.proiect,
      };
      setCheltuieli(updated);
      setEditIdx(null);
      setNewCheltuiala({ furnizor: "", data: "", suma: "", tip: "", proiect: "" });
      showToast("Cheltuiala salvată cu succes!", "success");
    } else {
      showToast("Eroare la salvare!", "error");
    }
  }

  async function handleDeleteCheltuiala(idx: number) {
    if (!confirm("Sigur vrei să ștergi această cheltuială?")) return;
    const c = cheltuieli[idx];
    const res = await fetch("/admin/api/cheltuieli", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id: c.id }),
    });
    if (res.ok) {
      setCheltuieli(cheltuieli.filter((_, i) => i !== idx));
      showToast("Cheltuiala ștearsă!", "success");
    } else {
      showToast("Eroare la ștergere!", "error");
    }
  }

  async function handleAddCheltuiala() {
    setCheltuialaErr("");
    if (!newCheltuiala.furnizor || !newCheltuiala.data || !newCheltuiala.suma) {
      setCheltuialaErr("Completează toate câmpurile obligatorii!");
      return;
    }
    const res = await fetch("/admin/api/cheltuieli", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "add",
        ...newCheltuiala,
        suma: parseFloat(newCheltuiala.suma),
      }),
    });
    const data = await res.json();
    if (data.success) {
      setCheltuieli(data.cheltuieli);
      setNewCheltuiala({ furnizor: "", data: "", suma: "", tip: "", proiect: "" });
      showToast("Cheltuială adăugată!", "success");
    } else {
      showToast("Eroare la adăugare!", "error");
    }
  }

  // === FUNCȚII PENTRU PROIECTE/CATEGORII ===
  async function handleAddItem(type: 'proiecte' | 'categorii') {
    setItemErr("");
    if (!newItem.trim()) {
      setItemErr("Completează numele!");
      return;
    }
    const res = await fetch("/admin/api/cheltuieli", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add", type, name: newItem }),
    });
    const data = await res.json();
    if (data.success) {
      if (type === 'proiecte') setProiecte(data.data);
      else setCategorii(data.data);
      setNewItem("");
      showToast("Adăugat cu succes!", "success");
    } else {
      showToast("Eroare la adăugare!", "error");
    }
  }

  async function handleEditItem(type: 'proiecte' | 'categorii', id: number) {
    setItemErr("");
    if (!editItemName.trim()) {
      setItemErr("Completează numele!");
      return;
    }
    const res = await fetch("/admin/api/cheltuieli", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update", type, id, name: editItemName }),
    });
    const data = await res.json();
    if (data.success) {
      if (type === 'proiecte') setProiecte(data.data);
      else setCategorii(data.data);
      setEditItemId(null);
      setEditItemName("");
      showToast("Salvat cu succes!", "success");
    } else {
      showToast("Eroare la salvare!", "error");
    }
  }

  async function handleDeleteItem(type: 'proiecte' | 'categorii', id: number) {
    if (!confirm(`Sigur vrei să ștergi acest ${type === 'proiecte' ? 'proiect' : 'categorie'}?`)) return;
    const res = await fetch("/admin/api/cheltuieli", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", type, id }),
    });
    const data = await res.json();
    if (data.success) {
      if (type === 'proiecte') setProiecte(data.data);
      else setCategorii(data.data);
      showToast("Șters cu succes!", "success");
    } else {
      showToast("Eroare la ștergere!", "error");
    }
  }

  // Filtrare cheltuieli
  const filteredCheltuieli = cheltuieli.filter(c => {
    if (filterProiect && c.proiect !== filterProiect) return false;
    if (filterCategorie && c.tip !== filterCategorie) return false;
    if (filterDataStart && c.data < filterDataStart) return false;
    if (filterDataEnd && c.data > filterDataEnd) return false;
    return true;
  });

  // Total filtrat
  const totalFiltrat = filteredCheltuieli.reduce((sum, c) => sum + c.suma, 0);

  // Statistici pe categorii
  const statsByCat = categorii.map(cat => ({
    name: cat.name,
    total: filteredCheltuieli.filter(c => c.tip === cat.name).reduce((s, c) => s + c.suma, 0)
  })).filter(s => s.total > 0).sort((a, b) => b.total - a.total);

  // Statistici pe proiecte
  const statsByProj = proiecte.map(p => ({
    name: p.name,
    total: filteredCheltuieli.filter(c => c.proiect === p.name).reduce((s, c) => s + c.suma, 0)
  })).filter(s => s.total > 0).sort((a, b) => b.total - a.total);

  // Max pentru bare vizuale
  const maxCat = Math.max(...statsByCat.map(s => s.total), 1);
  const maxProj = Math.max(...statsByProj.map(s => s.total), 1);

  if (loading) return <div className="p-8">Se încarcă...</div>;

  // Componenta pentru gestionare listă (proiecte sau categorii)
  const renderItemList = (type: 'proiecte' | 'categorii', items: Item[], title: string) => (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-4">{title}</h2>
      <div className="space-y-2 mb-4">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between bg-gray-50 p-3 rounded">
            {editItemId === item.id ? (
              <>
                <input
                  type="text"
                  value={editItemName}
                  onChange={(e) => setEditItemName(e.target.value)}
                  className="flex-1 border rounded px-3 py-1 mr-2"
                />
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleEditItem(type, item.id)}
                    className="text-green-600 hover:text-green-800 font-bold"
                  >
                    Salvează
                  </button>
                  <button 
                    onClick={() => { setEditItemId(null); setEditItemName(""); }}
                    className="text-gray-600 hover:text-gray-800"
                  >
                    Anulează
                  </button>
                </div>
              </>
            ) : (
              <>
                <span className="font-medium">{item.name}</span>
                <div className="flex gap-3">
                  <button 
                    onClick={() => { setEditItemId(item.id); setEditItemName(item.name); }}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    Editează
                  </button>
                  <button 
                    onClick={() => handleDeleteItem(type, item.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    Șterge
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
        {items.length === 0 && (
          <div className="text-gray-500 text-center py-4">Nu există {type === 'proiecte' ? 'proiecte' : 'categorii'}.</div>
        )}
      </div>
      <div className="flex gap-2 items-center">
        <input
          type="text"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder={`${type === 'proiecte' ? 'Proiect' : 'Categorie'} nou...`}
          className="flex-1 border rounded px-3 py-2"
          onKeyDown={(e) => e.key === 'Enter' && handleAddItem(type)}
        />
        <button 
          onClick={() => handleAddItem(type)}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Adaugă
        </button>
        {itemErr && <span className="text-red-600 text-sm ml-2">{itemErr}</span>}
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto mt-6 px-4">
      {/* Toast feedback vizual */}
      {toast && (
        <div className={`fixed top-6 right-6 z-[9999] px-6 py-3 rounded shadow-lg text-white font-semibold flex items-center gap-2 transition-all animate-fade-in-down ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}
          role="alert">
          {toast.type === 'success' ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24"><path fill="#fff" d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10Zm-1.293-6.707 7-7-1.414-1.414-5.293 5.293-2.293-2.293-1.414 1.414 3 3a1 1 0 0 0 1.414 0Z"/></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24"><path fill="#fff" d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10Zm1-7v2h-2v-2h2Zm0-8v6h-2V7h2Z"/></svg>
          )}
          <span>{toast.message}</span>
        </div>
      )}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Administrare Cheltuieli & Achiziții</h1>
        <div className="flex gap-2">
          <button
            onClick={() => exportToCSV(filteredCheltuieli, `cheltuieli_${new Date().toISOString().split('T')[0]}.csv`)}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm flex items-center gap-1"
          >
            📥 Export CSV
          </button>
          <button
            onClick={() => exportToExcel(filteredCheltuieli, `cheltuieli_${new Date().toISOString().split('T')[0]}.xls`)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm flex items-center gap-1"
          >
            📊 Export Excel
          </button>
        </div>
      </div>

      {/* Tab-uri navigare */}
      <div className="flex gap-2 mb-6">
        <button 
          onClick={() => setActiveTab('cheltuieli')}
          className={`px-6 py-3 rounded-t-lg font-semibold ${activeTab === 'cheltuieli' ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
        >
          📋 Cheltuieli
        </button>
        <button 
          onClick={() => setActiveTab('categorii')}
          className={`px-6 py-3 rounded-t-lg font-semibold ${activeTab === 'categorii' ? 'bg-orange-600 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
        >
          🏷️ Categorii ({categorii.length})
        </button>
        <button 
          onClick={() => setActiveTab('proiecte')}
          className={`px-6 py-3 rounded-t-lg font-semibold ${activeTab === 'proiecte' ? 'bg-purple-600 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
        >
          📁 Proiecte ({proiecte.length})
        </button>
      </div>

      {/* Conținut Tab-uri */}
      {activeTab === 'proiecte' && renderItemList('proiecte', proiecte, 'Gestionare Proiecte')}
      
      {activeTab === 'categorii' && renderItemList('categorii', categorii, 'Gestionare Categorii (Tipuri Cheltuieli)')}
      
      {activeTab === 'cheltuieli' && (
        <>
          {/* Dashboard statistici */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Card total */}
            <div className="bg-gradient-to-br from-red-500 to-red-600 text-white rounded-xl shadow-lg p-6">
              <div className="text-sm opacity-80 mb-1">Total Cheltuieli (filtrat)</div>
              <div className="text-3xl font-bold">{totalFiltrat.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON</div>
              <div className="text-sm opacity-80 mt-2">{filteredCheltuieli.length} înregistrări</div>
            </div>
            
            {/* Top categorii */}
            <div className="bg-white rounded-xl shadow p-4">
              <div className="text-sm font-semibold text-gray-600 mb-3">Top Categorii</div>
              {statsByCat.length === 0 ? (
                <div className="text-gray-400 text-sm">Nicio cheltuială</div>
              ) : (
                <div className="space-y-2">
                  {statsByCat.slice(0, 4).map((s, i) => (
                    <div key={s.name}>
                      <div className="flex justify-between text-sm">
                        <span className="truncate">{s.name}</span>
                        <span className="font-semibold">{s.total.toLocaleString('ro-RO', { minimumFractionDigits: 0 })} RON</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-orange-500 rounded-full transition-all" 
                          style={{ width: `${(s.total / maxCat) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top proiecte */}
            <div className="bg-white rounded-xl shadow p-4">
              <div className="text-sm font-semibold text-gray-600 mb-3">Top Proiecte</div>
              {statsByProj.length === 0 ? (
                <div className="text-gray-400 text-sm">Nicio cheltuială</div>
              ) : (
                <div className="space-y-2">
                  {statsByProj.slice(0, 4).map((s, i) => (
                    <div key={s.name}>
                      <div className="flex justify-between text-sm">
                        <span className="truncate">{s.name}</span>
                        <span className="font-semibold">{s.total.toLocaleString('ro-RO', { minimumFractionDigits: 0 })} RON</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-purple-500 rounded-full transition-all" 
                          style={{ width: `${(s.total / maxProj) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Filtre */}
          <div className="bg-white rounded-lg shadow p-4 mb-6 flex flex-wrap gap-4 items-end">
            <div>
              <label className="text-sm text-gray-600 block mb-1">Proiect:</label>
              <select
                value={filterProiect}
                onChange={(e) => setFilterProiect(e.target.value)}
                className="border rounded px-3 py-2 min-w-[160px]"
              >
                <option value="">Toate</option>
                {proiecte.map((p) => (
                  <option key={p.id} value={p.name}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-600 block mb-1">Categorie:</label>
              <select
                value={filterCategorie}
                onChange={(e) => setFilterCategorie(e.target.value)}
                className="border rounded px-3 py-2 min-w-[160px]"
              >
                <option value="">Toate</option>
                {categorii.map((cat) => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-600 block mb-1">De la:</label>
              <input
                type="date"
                value={filterDataStart}
                onChange={(e) => setFilterDataStart(e.target.value)}
                className="border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600 block mb-1">Până la:</label>
              <input
                type="date"
                value={filterDataEnd}
                onChange={(e) => setFilterDataEnd(e.target.value)}
                className="border rounded px-3 py-2"
              />
            </div>
            <button
              onClick={() => { setFilterProiect(""); setFilterCategorie(""); setFilterDataStart(""); setFilterDataEnd(""); }}
              className="px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
            >
              Resetează filtre
            </button>
          </div>

          {/* Tabel cheltuieli */}
          <div className="bg-white rounded shadow-lg overflow-x-auto border border-red-200">
            <table className="min-w-full text-base">
              <thead className="bg-red-50 sticky top-0 z-10">
                <tr>
                  <th className="p-4 text-left">ID</th>
                  <th className="p-4 text-left">Furnizor</th>
                  <th className="p-4 text-left">Data</th>
                  <th className="p-4 text-left">Sumă</th>
                  <th className="p-4 text-left">Categorie</th>
                  <th className="p-4 text-left">Proiect</th>
                  <th className="p-4 text-left">Acțiuni</th>
                </tr>
              </thead>
              <tbody>
                {filteredCheltuieli.map((c, idx) => {
                  const realIdx = cheltuieli.findIndex(ch => ch.id === c.id);
                  return editIdx === realIdx ? (
                    <tr key={c.id} className="border-b bg-yellow-50">
                      <td className="p-4 font-mono">{c.id}</td>
                      <td className="p-4">
                        <input 
                          className="border rounded px-2 py-1 w-full" 
                          value={newCheltuiala.furnizor} 
                          onChange={e => setNewCheltuiala(n => ({ ...n, furnizor: e.target.value }))} 
                        />
                      </td>
                      <td className="p-4">
                        <input 
                          type="date" 
                          className="border rounded px-2 py-1" 
                          value={newCheltuiala.data} 
                          onChange={e => setNewCheltuiala(n => ({ ...n, data: e.target.value }))} 
                        />
                      </td>
                      <td className="p-4">
                        <input 
                          type="number" 
                          className="border rounded px-2 py-1 w-28" 
                          value={newCheltuiala.suma} 
                          onChange={e => setNewCheltuiala(n => ({ ...n, suma: e.target.value }))} 
                        />
                      </td>
                      <td className="p-4">
                        <select 
                          className="border rounded px-2 py-1 w-full"
                          value={newCheltuiala.tip}
                          onChange={e => setNewCheltuiala(n => ({ ...n, tip: e.target.value }))}
                        >
                          <option value="">Selectează...</option>
                          {categorii.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                        </select>
                      </td>
                      <td className="p-4">
                        <select 
                          className="border rounded px-2 py-1 w-full"
                          value={newCheltuiala.proiect}
                          onChange={e => setNewCheltuiala(n => ({ ...n, proiect: e.target.value }))}
                        >
                          <option value="">Selectează...</option>
                          {proiecte.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                        </select>
                      </td>
                      <td className="p-4">
                        <button className="text-green-700 font-bold mr-2" onClick={() => handleSaveCheltuiala(realIdx)}>Salvează</button>
                        <button className="text-gray-500" onClick={() => { setEditIdx(null); setNewCheltuiala({ furnizor: "", data: "", suma: "", tip: "", proiect: "" }); }}>Anulează</button>
                      </td>
                    </tr>
                  ) : (
                    <tr key={c.id} className="border-b hover:bg-red-50 transition">
                      <td className="p-4 font-mono">{c.id}</td>
                      <td className="p-4">{c.furnizor}</td>
                      <td className="p-4">{c.data ? new Date(c.data).toLocaleDateString('ro-RO') : '-'}</td>
                      <td className="p-4 font-semibold">{c.suma?.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON</td>
                      <td className="p-4">
                        <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-sm">{c.tip || '-'}</span>
                      </td>
                      <td className="p-4">
                        <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-sm">{c.proiect || '-'}</span>
                      </td>
                      <td className="p-4">
                        <button className="text-blue-700 font-bold mr-2" onClick={() => handleEditCheltuiala(realIdx)}>Editează</button>
                        <button className="text-red-700 font-bold" onClick={() => handleDeleteCheltuiala(realIdx)}>Șterge</button>
                      </td>
                    </tr>
                  );
                })}
                {/* Rând adăugare nouă */}
                <tr className="bg-green-50">
                  <td className="p-4 font-mono text-green-600">+</td>
                  <td className="p-4">
                    <input 
                      className="border rounded px-2 py-1 w-full" 
                      value={newCheltuiala.furnizor} 
                      onChange={e => setNewCheltuiala(n => ({ ...n, furnizor: e.target.value }))} 
                      placeholder="Furnizor" 
                    />
                  </td>
                  <td className="p-4">
                    <input 
                      type="date" 
                      className="border rounded px-2 py-1" 
                      value={newCheltuiala.data} 
                      onChange={e => setNewCheltuiala(n => ({ ...n, data: e.target.value }))} 
                    />
                  </td>
                  <td className="p-4">
                    <input 
                      type="number" 
                      className="border rounded px-2 py-1 w-28" 
                      value={newCheltuiala.suma} 
                      onChange={e => setNewCheltuiala(n => ({ ...n, suma: e.target.value }))} 
                      placeholder="0" 
                    />
                  </td>
                  <td className="p-4">
                    <select 
                      className="border rounded px-2 py-1 w-full"
                      value={newCheltuiala.tip}
                      onChange={e => setNewCheltuiala(n => ({ ...n, tip: e.target.value }))}
                    >
                      <option value="">Categorie...</option>
                      {categorii.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                    </select>
                  </td>
                  <td className="p-4">
                    <select 
                      className="border rounded px-2 py-1 w-full"
                      value={newCheltuiala.proiect}
                      onChange={e => setNewCheltuiala(n => ({ ...n, proiect: e.target.value }))}
                    >
                      <option value="">Proiect...</option>
                      {proiecte.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                    </select>
                  </td>
                  <td className="p-4">
                    <button className="text-green-700 font-bold" onClick={handleAddCheltuiala}>Adaugă</button>
                    {cheltuialaErr && <span className="text-red-600 text-sm ml-2">{cheltuialaErr}</span>}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
