"use client";
import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Toast from "@/components/Toast";
import Link from "next/link";

interface Product {
  id: number;
  name: string;
  productCode: string;
  price: number;
}

interface Variant {
  id: number;
  productId: number;
  code: string;
  marime?: string;
  distantaSesizare?: string;
  tipIesire?: string;
  tipContact?: string;
  tensiune?: string;
  curent?: string;
  protectie?: string;
  material?: string;
  cablu?: string;
  compatibil?: string;
  greutate?: number;
  stoc: number;
  pret?: number;
  listPrice?: number;
  purchasePrice?: number;
  modAmbalare?: string;
  descriere?: string;
  active: boolean;
  onDemand?: boolean;
}

export default function VarianteRoPage() {
  const searchParams = useSearchParams();
  const productIdParam = searchParams?.get("productId");
  
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(productIdParam ? Number(productIdParam) : null);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingVariant, setEditingVariant] = useState<Variant | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const [form, setForm] = useState({
    code: "",
    marime: "",
    distantaSesizare: "",
    tipIesire: "",
    tipContact: "",
    tensiune: "",
    curent: "",
    protectie: "",
    material: "",
    cablu: "",
    compatibil: "",
    greutate: "",
    unitateGreutate: "kg" as "kg" | "g",
    stoc: "0",
    pret: "",
    listPrice: "",
    purchasePrice: "",
    currency: "RON",
    modAmbalare: "",
    descriere: "",
    active: true,
    onDemand: false,
  });

  useEffect(() => {
    fetch("/admin/api/products")
      .then(res => res.ok ? res.json() : [])
      .then(data => { if (Array.isArray(data)) setProducts(data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedProductId) {
      loadVariants();
    } else {
      setVariants([]);
    }
  }, [selectedProductId]);

  const loadVariants = () => {
    if (!selectedProductId) return;
    fetch(`/admin/api/variants?productId=${selectedProductId}`)
      .then(res => res.ok ? res.json() : [])
      .then(data => { if (Array.isArray(data)) setVariants(data); })
      .catch(() => {});
  };

  function showToast(message: string, type: 'success' | 'error' = 'success') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleEdit = (variant: Variant) => {
    setEditingVariant(variant);
    setForm({
      code: variant.code,
      marime: variant.marime || "",
      distantaSesizare: variant.distantaSesizare || "",
      tipIesire: variant.tipIesire || "",
      tipContact: variant.tipContact || "",
      tensiune: variant.tensiune || "",
      curent: variant.curent || "",
      protectie: variant.protectie || "",
      material: variant.material || "",
      cablu: variant.cablu || "",
      compatibil: variant.compatibil || "",
      greutate: variant.greutate ? String(variant.greutate) : "",
      unitateGreutate: "kg" as "kg" | "g",
      stoc: String(variant.stoc || 0),
      pret: variant.pret ? String(variant.pret) : "",
      listPrice: variant.listPrice ? String(variant.listPrice) : "",
      purchasePrice: variant.purchasePrice ? String(variant.purchasePrice) : "",
      currency: (variant as any).currency || "RON",
      modAmbalare: variant.modAmbalare || "",
      descriere: variant.descriere || "",
      active: variant.active,
      onDemand: variant.onDemand || false,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/admin/api/variants?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Eroare la ștergere");
      showToast("Variantă ștearsă cu succes!", "success");
      setDeleteConfirm(null);
      loadVariants();
    } catch (err: any) {
      showToast(err.message || "Eroare la ștergere!", "error");
    }
  };

  const resetForm = () => {
    setEditingVariant(null);
    setShowForm(false);
    setForm({
      code: "", marime: "", distantaSesizare: "", tipIesire: "", tipContact: "",
      tensiune: "", curent: "", protectie: "", material: "", cablu: "",
      compatibil: "", greutate: "", unitateGreutate: "kg" as "kg" | "g", stoc: "0",
      pret: "", listPrice: "", purchasePrice: "", currency: "RON", modAmbalare: "", descriere: "", active: true, onDemand: false,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) {
      showToast("Selectează un produs!", "error");
      return;
    }
    if (!form.code.trim()) {
      showToast("Completează codul variantei!", "error");
      return;
    }
    
    setLoading(true);
    try {
      const body = {
        ...(editingVariant && { id: editingVariant.id }),
        productId: selectedProductId,
        code: form.code,
        marime: form.marime || undefined,
        distantaSesizare: form.distantaSesizare || undefined,
        tipIesire: form.tipIesire || undefined,
        tipContact: form.tipContact || undefined,
        tensiune: form.tensiune || undefined,
        curent: form.curent || undefined,
        protectie: form.protectie || undefined,
        material: form.material || undefined,
        cablu: form.cablu || undefined,
        compatibil: form.compatibil || undefined,
        greutate: form.greutate ? (form.unitateGreutate === "g" ? Number(form.greutate) / 1000 : Number(form.greutate)) : undefined,
        stoc: Number(form.stoc) || 0,
        pret: form.pret ? Number(form.pret) : undefined,
        listPrice: form.listPrice ? Number(form.listPrice) : undefined,
        purchasePrice: form.purchasePrice ? Number(form.purchasePrice) : undefined,
        currency: form.currency || "RON",
        modAmbalare: form.modAmbalare || undefined,
        descriere: form.descriere || undefined,
        active: form.active,
        onDemand: form.onDemand,
      };

      const res = await fetch("/admin/api/variants", {
        method: editingVariant ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error(editingVariant ? "Eroare la actualizare" : "Eroare la adăugare");

      showToast(editingVariant ? "Variantă actualizată!" : "Variantă adăugată!", "success");
      loadVariants();
      resetForm();
    } catch (err: any) {
      showToast(err.message || "Eroare!", "error");
    } finally {
      setLoading(false);
    }
  };

  const selectedProduct = products.find(p => p.id === selectedProductId);

  return (
    <div className="max-w-6xl mx-auto">
      {toast && <Toast message={toast.message} type={toast.type} />}
      
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-purple-700">🇷🇴 Variante Produs (Română)</h2>
          {selectedProduct && (
            <p className="text-gray-600">Produs: <strong>{selectedProduct.name}</strong> ({selectedProduct.productCode})</p>
          )}
        </div>
        <div className="flex gap-3">
          <Link href="/admin/variante-en" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg shadow transition">
            🇬🇧 Traduceri EN
          </Link>
          <Link href="/admin/adauga-produs-ro" className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-6 rounded-lg shadow transition">
            ← Înapoi la Produse
          </Link>
        </div>
      </div>

      {/* Selector produs */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
        <label className="block font-semibold mb-2">Selectează produsul:</label>
        <select 
          value={selectedProductId || ""} 
          onChange={(e) => setSelectedProductId(e.target.value ? Number(e.target.value) : null)}
          className="w-full border rounded-lg px-4 py-2 focus:outline-purple-500 bg-purple-50 font-semibold"
        >
          <option value="">-- Alege produsul --</option>
          {products.map(p => (
            <option key={p.id} value={p.id}>{p.name} ({p.productCode})</option>
          ))}
        </select>
      </div>

      {selectedProductId && (
        <>
          {/* Buton adăugare */}
          <div className="flex justify-end mb-4">
            <button 
              onClick={() => { if (showForm) resetForm(); else setShowForm(true); }}
              className={`${showForm ? 'bg-gray-500 hover:bg-gray-600' : 'bg-purple-600 hover:bg-purple-700'} text-white font-bold py-2 px-6 rounded-lg shadow transition`}
            >
              {showForm ? '✕ Închide formularul' : '➕ Adaugă variantă'}
            </button>
          </div>

          {/* Formular */}
          {showForm && (
            <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
              <h3 className="text-xl font-bold mb-4 text-purple-700 text-center">
                {editingVariant ? `Editează variantă: ${editingVariant.code}` : 'Adaugă variantă nouă'}
              </h3>
              
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="block font-semibold mb-1">Cod variantă *</label>
                  <input name="code" type="text" required placeholder="Ex: SKU-001-A" value={form.code} onChange={handleChange} className="w-full border rounded-lg px-4 py-2 focus:outline-purple-500" />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Monedă</label>
                  <select name="currency" value={form.currency} onChange={handleChange} className="w-full border rounded-lg px-4 py-2 focus:outline-purple-500 bg-purple-50 font-semibold">
                    <option value="RON">RON</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Preț de listă ({form.currency})</label>
                  <input name="listPrice" type="number" min="0" step="0.01" placeholder="Prețul inițial/catalog" value={form.listPrice} onChange={handleChange} className="w-full border rounded-lg px-4 py-2 focus:outline-purple-500" />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Preț vânzare ({form.currency})</label>
                  <input name="pret" type="number" min="0" step="0.01" placeholder="Prețul final cu discount" value={form.pret} onChange={handleChange} className="w-full border rounded-lg px-4 py-2 focus:outline-purple-500" />
                  {form.listPrice && form.pret && Number(form.listPrice) > Number(form.pret) && (
                    <p className="text-sm text-green-600 mt-1">
                      Discount: {Math.round((1 - Number(form.pret) / Number(form.listPrice)) * 100)}%
                    </p>
                  )}
                </div>
                <div>
                  <label className="block font-semibold mb-1">Preț achiziție ({form.currency})</label>
                  <input name="purchasePrice" type="number" min="0" step="0.01" placeholder="Preț de intrare/achiziție" value={form.purchasePrice} onChange={handleChange} className="w-full border rounded-lg px-4 py-2 focus:outline-purple-500" />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Stoc</label>
                  <div className="flex gap-3 items-center">
                    <input name="stoc" type="number" min="0" placeholder="0" value={form.stoc} onChange={handleChange} className="flex-1 border rounded-lg px-4 py-2 focus:outline-purple-500" />
                    <label className="flex items-center gap-2 whitespace-nowrap">
                      <input name="onDemand" type="checkbox" checked={form.onDemand} onChange={handleChange} className="w-5 h-5" />
                      <span className="font-semibold text-orange-600">Pe comandă</span>
                    </label>
                  </div>
                </div>

                {/* Specificații tehnice */}
                <div className="md:col-span-3 mt-4 mb-2">
                  <h4 className="text-lg font-bold text-purple-600 border-b pb-2">⚡ Specificații tehnice</h4>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Mărime</label>
                  <input name="marime" type="text" placeholder="Ex: M8, M12, M18, M30" value={form.marime} onChange={handleChange} className="w-full border rounded-lg px-4 py-2 focus:outline-purple-500" />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Distanță sesizare</label>
                  <input name="distantaSesizare" type="text" placeholder="Ex: 2mm, 4mm, 8mm" value={form.distantaSesizare} onChange={handleChange} className="w-full border rounded-lg px-4 py-2 focus:outline-purple-500" />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Tip ieșire</label>
                  <select name="tipIesire" value={form.tipIesire} onChange={handleChange} className="w-full border rounded-lg px-4 py-2 focus:outline-purple-500 bg-white">
                    <option value="">-- Selectează --</option>
                    <option value="PNP">PNP</option>
                    <option value="NPN">NPN</option>
                    <option value="PNP/NPN">PNP/NPN</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Tip contact</label>
                  <select name="tipContact" value={form.tipContact} onChange={handleChange} className="w-full border rounded-lg px-4 py-2 focus:outline-purple-500 bg-white">
                    <option value="">-- Selectează --</option>
                    <option value="NO">NO (Normal Open)</option>
                    <option value="NC">NC (Normal Closed)</option>
                    <option value="NO+NC">NO+NC</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Tensiune alimentare</label>
                  <input name="tensiune" type="text" placeholder="Ex: 10-30VDC, 24VDC" value={form.tensiune} onChange={handleChange} className="w-full border rounded-lg px-4 py-2 focus:outline-purple-500" />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Curent maxim</label>
                  <input name="curent" type="text" placeholder="Ex: 200mA" value={form.curent} onChange={handleChange} className="w-full border rounded-lg px-4 py-2 focus:outline-purple-500" />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Grad protecție</label>
                  <input name="protectie" type="text" placeholder="Ex: IP67, IP68" value={form.protectie} onChange={handleChange} className="w-full border rounded-lg px-4 py-2 focus:outline-purple-500" />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Material</label>
                  <input name="material" type="text" placeholder="Ex: Inox, Alamă, Plastic" value={form.material} onChange={handleChange} className="w-full border rounded-lg px-4 py-2 focus:outline-purple-500" />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Cablu</label>
                  <input name="cablu" type="text" placeholder="Ex: 2m PVC, Conector M12" value={form.cablu} onChange={handleChange} className="w-full border rounded-lg px-4 py-2 focus:outline-purple-500" />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Greutate</label>
                  <div className="flex gap-2">
                    <input name="greutate" type="number" min="0" step="0.001" placeholder="Ex: 0.05" value={form.greutate} onChange={handleChange} className="flex-1 border rounded-lg px-4 py-2 focus:outline-purple-500" />
                    <select name="unitateGreutate" value={form.unitateGreutate} onChange={handleChange} className="w-20 border rounded-lg px-2 py-2 focus:outline-purple-500 bg-white">
                      <option value="kg">kg</option>
                      <option value="g">g</option>
                    </select>
                  </div>
                </div>

                {/* Alte detalii */}
                <div className="md:col-span-3 mt-4 mb-2">
                  <h4 className="text-lg font-bold text-purple-600 border-b pb-2">📦 Alte detalii</h4>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Mod ambalare</label>
                  <input name="modAmbalare" type="text" placeholder="Ex: buc, set, cutie" value={form.modAmbalare} onChange={handleChange} className="w-full border rounded-lg px-4 py-2 focus:outline-purple-500" />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Compatibilitate</label>
                  <input name="compatibil" type="text" placeholder="Ex: Model XYZ, Serie ABC" value={form.compatibil} onChange={handleChange} className="w-full border rounded-lg px-4 py-2 focus:outline-purple-500" />
                </div>
                <div className="md:col-span-3">
                  <label className="block font-semibold mb-1">Descriere</label>
                  <textarea name="descriere" placeholder="Descriere variantă în română" value={form.descriere} onChange={handleChange} className="w-full border rounded-lg px-4 py-2 focus:outline-purple-500 h-20" />
                </div>
                <div className="md:col-span-3 flex items-center gap-2">
                  <input name="active" type="checkbox" checked={form.active} onChange={handleChange} className="w-5 h-5" />
                  <label className="font-semibold">Variantă activă</label>
                </div>
                <div className="md:col-span-3 flex justify-center gap-4 mt-4">
                  <button type="button" onClick={resetForm} className="bg-gray-400 hover:bg-gray-500 text-white font-bold py-3 px-8 rounded-lg shadow transition">
                    Anulează
                  </button>
                  <button type="submit" disabled={loading} className={`${editingVariant ? 'bg-orange-600 hover:bg-orange-700' : 'bg-purple-600 hover:bg-purple-700'} text-white font-bold py-3 px-10 rounded-lg shadow transition disabled:opacity-60`}>
                    {loading ? "Se salvează..." : (editingVariant ? "Actualizează" : "Salvează variantă")}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Tabel variante */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-purple-50">
                  <tr>
                    <th className="px-3 py-3 font-semibold text-purple-700">Cod</th>
                    <th className="px-3 py-3 font-semibold text-purple-700">Mărime</th>
                    <th className="px-3 py-3 font-semibold text-purple-700">Dist. sesizare</th>
                    <th className="px-3 py-3 font-semibold text-purple-700">Ieșire</th>
                    <th className="px-3 py-3 font-semibold text-purple-700">Contact</th>
                    <th className="px-3 py-3 font-semibold text-purple-700">Preț</th>
                    <th className="px-3 py-3 font-semibold text-purple-700">Stoc</th>
                    <th className="px-3 py-3 font-semibold text-purple-700">Status</th>
                    <th className="px-3 py-3 font-semibold text-purple-700">Acțiuni</th>
                  </tr>
                </thead>
                <tbody>
                  {variants.length === 0 ? (
                    <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-500">Nu există variante pentru acest produs</td></tr>
                  ) : (
                    variants.map((v, i) => (
                      <tr key={v.id} className={`${i % 2 === 0 ? 'bg-white' : 'bg-purple-50/30'} ${editingVariant?.id === v.id ? 'ring-2 ring-orange-400' : ''}`}>
                        <td className="px-3 py-3 font-medium">{v.code}</td>
                        <td className="px-3 py-3">{v.marime || '-'}</td>
                        <td className="px-3 py-3">{v.distantaSesizare || '-'}</td>
                        <td className="px-3 py-3">{v.tipIesire || '-'}</td>
                        <td className="px-3 py-3">{v.tipContact || '-'}</td>
                        <td className="px-3 py-3">{v.pret ? `${v.pret} ${(v as any).currency || 'RON'}` : <span className="text-gray-400 italic">produs</span>}</td>
                        <td className="px-3 py-3">{v.onDemand ? <span className="text-orange-600 font-semibold">Pe comandă</span> : v.stoc}</td>
                        <td className="px-3 py-3">
                          {v.active ? (
                            <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-semibold">Activ</span>
                          ) : (
                            <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs font-semibold">Inactiv</span>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex gap-2">
                            <button onClick={() => handleEdit(v)} className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded text-sm font-semibold transition">
                              ✏️
                            </button>
                            {deleteConfirm === v.id ? (
                              <div className="flex gap-1">
                                <button onClick={() => handleDelete(v.id)} className="bg-red-600 text-white px-2 py-1 rounded text-xs font-semibold">Da</button>
                                <button onClick={() => setDeleteConfirm(null)} className="bg-gray-400 text-white px-2 py-1 rounded text-xs font-semibold">Nu</button>
                              </div>
                            ) : (
                              <button onClick={() => setDeleteConfirm(v.id)} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm font-semibold transition">
                                🗑️
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 bg-gray-50 text-sm text-gray-600">
              Total: {variants.length} variantă(e)
            </div>
          </div>
        </>
      )}
    </div>
  );
}
