"use client";
import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Toast from "@/components/Toast";
import Link from "next/link";

interface Product {
  id: number;
  name: string;
  nameEn?: string;
  productCode: string;
}

interface Variant {
  id: number;
  productId: number;
  code: string;
  marime?: string;
  marimeEn?: string;
  compatibil?: string;
  compatibilEn?: string;
  modAmbalare?: string;
  modAmbalareEn?: string;
  descriere?: string;
  descriereEn?: string;
}

export default function VarianteEnPage() {
  const searchParams = useSearchParams();
  const productIdParam = searchParams?.get("productId");
  
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(productIdParam ? Number(productIdParam) : null);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [editingVariant, setEditingVariant] = useState<Variant | null>(null);
  const [filter, setFilter] = useState<"all" | "translated" | "untranslated">("all");

  const [form, setForm] = useState({
    marimeEn: "",
    compatibilEn: "",
    modAmbalareEn: "",
    descriereEn: "",
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleEdit = (variant: Variant) => {
    setEditingVariant(variant);
    setForm({
      marimeEn: variant.marimeEn || "",
      compatibilEn: variant.compatibilEn || "",
      modAmbalareEn: variant.modAmbalareEn || "",
      descriereEn: variant.descriereEn || "",
    });
  };

  const resetForm = () => {
    setEditingVariant(null);
    setForm({
      marimeEn: "",
      compatibilEn: "",
      modAmbalareEn: "",
      descriereEn: "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVariant) return;
    
    setLoading(true);
    try {
      const body = {
        id: editingVariant.id,
        marimeEn: form.marimeEn || undefined,
        compatibilEn: form.compatibilEn || undefined,
        modAmbalareEn: form.modAmbalareEn || undefined,
        descriereEn: form.descriereEn || undefined,
      };

      const res = await fetch("/admin/api/variants", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("Eroare la salvare traducere");

      showToast("Traducere salvată!", "success");
      loadVariants();
      resetForm();
    } catch (err: any) {
      showToast(err.message || "Eroare!", "error");
    } finally {
      setLoading(false);
    }
  };

  const isTranslated = (v: Variant) => {
    return !!(v.marimeEn || v.compatibilEn || v.modAmbalareEn || v.descriereEn);
  };

  const filteredVariants = variants.filter(v => {
    if (filter === "translated") return isTranslated(v);
    if (filter === "untranslated") return !isTranslated(v);
    return true;
  });

  const selectedProduct = products.find(p => p.id === selectedProductId);
  const translatedCount = variants.filter(isTranslated).length;

  return (
    <div className="max-w-6xl mx-auto">
      {toast && <Toast message={toast.message} type={toast.type} />}
      
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-blue-700">🇬🇧 Variante Produs (English)</h2>
          {selectedProduct && (
            <p className="text-gray-600">Produs: <strong>{selectedProduct.name}</strong> ({selectedProduct.productCode})</p>
          )}
        </div>
        <div className="flex gap-3">
          <Link href="/admin/variante-ro" className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded-lg shadow transition">
            🇷🇴 Variante RO
          </Link>
          <Link href="/admin/adauga-produs-en" className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-6 rounded-lg shadow transition">
            ← Înapoi la Produse EN
          </Link>
        </div>
      </div>

      {/* Selector produs */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
        <label className="block font-semibold mb-2">Select product:</label>
        <select 
          value={selectedProductId || ""} 
          onChange={(e) => { setSelectedProductId(e.target.value ? Number(e.target.value) : null); resetForm(); }}
          className="w-full border rounded-lg px-4 py-2 focus:outline-blue-500 bg-blue-50 font-semibold"
        >
          <option value="">-- Choose product --</option>
          {products.map(p => (
            <option key={p.id} value={p.id}>{p.nameEn || p.name} ({p.productCode})</option>
          ))}
        </select>
      </div>

      {selectedProductId && (
        <>
          {/* Statistici și filtre */}
          <div className="bg-white rounded-2xl shadow-lg p-4 mb-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex gap-4 text-sm">
              <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-semibold">
                Total: {variants.length}
              </span>
              <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full font-semibold">
                Translated: {translatedCount}
              </span>
              <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full font-semibold">
                Untranslated: {variants.length - translatedCount}
              </span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setFilter("all")} className={`px-4 py-2 rounded-lg font-semibold transition ${filter === "all" ? "bg-blue-600 text-white" : "bg-gray-200 hover:bg-gray-300"}`}>
                All
              </button>
              <button onClick={() => setFilter("translated")} className={`px-4 py-2 rounded-lg font-semibold transition ${filter === "translated" ? "bg-green-600 text-white" : "bg-gray-200 hover:bg-gray-300"}`}>
                Translated
              </button>
              <button onClick={() => setFilter("untranslated")} className={`px-4 py-2 rounded-lg font-semibold transition ${filter === "untranslated" ? "bg-orange-600 text-white" : "bg-gray-200 hover:bg-gray-300"}`}>
                Untranslated
              </button>
            </div>
          </div>

          {/* Formular traducere */}
          {editingVariant && (
            <div className="bg-white rounded-2xl shadow-lg p-8 mb-8 border-2 border-blue-200">
              <h3 className="text-xl font-bold mb-4 text-blue-700 text-center">
                Translate variant: {editingVariant.code}
              </h3>
              
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Coloana RO - readonly */}
                <div className="space-y-4">
                  <h4 className="font-bold text-purple-600 border-b pb-2">🇷🇴 Română (original)</h4>
                  <div>
                    <label className="block font-semibold mb-1 text-gray-500">Mărime</label>
                    <input type="text" disabled value={editingVariant.marime || "-"} className="w-full border rounded-lg px-4 py-2 bg-gray-100 text-gray-600" />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1 text-gray-500">Compatibilitate</label>
                    <input type="text" disabled value={editingVariant.compatibil || "-"} className="w-full border rounded-lg px-4 py-2 bg-gray-100 text-gray-600" />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1 text-gray-500">Mod ambalare</label>
                    <input type="text" disabled value={editingVariant.modAmbalare || "-"} className="w-full border rounded-lg px-4 py-2 bg-gray-100 text-gray-600" />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1 text-gray-500">Descriere</label>
                    <textarea disabled value={editingVariant.descriere || "-"} className="w-full border rounded-lg px-4 py-2 bg-gray-100 text-gray-600 h-24" />
                  </div>
                </div>

                {/* Coloana EN - editabil */}
                <div className="space-y-4">
                  <h4 className="font-bold text-blue-600 border-b pb-2">🇬🇧 English (translation)</h4>
                  <div>
                    <label className="block font-semibold mb-1">Size</label>
                    <input name="marimeEn" type="text" placeholder="E.g.: M8, M12, M18" value={form.marimeEn} onChange={handleChange} className="w-full border rounded-lg px-4 py-2 focus:outline-blue-500" />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Compatibility</label>
                    <input name="compatibilEn" type="text" placeholder="E.g.: Model XYZ, Series ABC" value={form.compatibilEn} onChange={handleChange} className="w-full border rounded-lg px-4 py-2 focus:outline-blue-500" />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Packaging</label>
                    <input name="modAmbalareEn" type="text" placeholder="E.g.: pcs, set, box" value={form.modAmbalareEn} onChange={handleChange} className="w-full border rounded-lg px-4 py-2 focus:outline-blue-500" />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Description</label>
                    <textarea name="descriereEn" placeholder="Variant description in English" value={form.descriereEn} onChange={handleChange} className="w-full border rounded-lg px-4 py-2 focus:outline-blue-500 h-24" />
                  </div>
                </div>

                <div className="md:col-span-2 flex justify-center gap-4 mt-4">
                  <button type="button" onClick={resetForm} className="bg-gray-400 hover:bg-gray-500 text-white font-bold py-3 px-8 rounded-lg shadow transition">
                    Cancel
                  </button>
                  <button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-10 rounded-lg shadow transition disabled:opacity-60">
                    {loading ? "Saving..." : "Save translation"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Tabel variante */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-blue-50">
                  <tr>
                    <th className="px-3 py-3 font-semibold text-blue-700">Code</th>
                    <th className="px-3 py-3 font-semibold text-blue-700">Size (RO)</th>
                    <th className="px-3 py-3 font-semibold text-blue-700">Size (EN)</th>
                    <th className="px-3 py-3 font-semibold text-blue-700">Description (RO)</th>
                    <th className="px-3 py-3 font-semibold text-blue-700">Description (EN)</th>
                    <th className="px-3 py-3 font-semibold text-blue-700">Status</th>
                    <th className="px-3 py-3 font-semibold text-blue-700">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVariants.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No variants found</td></tr>
                  ) : (
                    filteredVariants.map((v, i) => (
                      <tr key={v.id} className={`${i % 2 === 0 ? 'bg-white' : 'bg-blue-50/30'} ${editingVariant?.id === v.id ? 'ring-2 ring-blue-400' : ''}`}>
                        <td className="px-3 py-3 font-medium">{v.code}</td>
                        <td className="px-3 py-3">{v.marime || '-'}</td>
                        <td className="px-3 py-3">{v.marimeEn || <span className="text-orange-500 italic">-</span>}</td>
                        <td className="px-3 py-3 max-w-40 truncate" title={v.descriere}>{v.descriere || '-'}</td>
                        <td className="px-3 py-3 max-w-40 truncate" title={v.descriereEn}>{v.descriereEn || <span className="text-orange-500 italic">-</span>}</td>
                        <td className="px-3 py-3">
                          {isTranslated(v) ? (
                            <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-semibold">Translated</span>
                          ) : (
                            <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded-full text-xs font-semibold">Pending</span>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <button 
                            onClick={() => handleEdit(v)} 
                            className={`${editingVariant?.id === v.id ? 'bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} text-white px-4 py-1 rounded text-sm font-semibold transition`}
                          >
                            {editingVariant?.id === v.id ? 'Editing...' : 'Translate'}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 bg-gray-50 text-sm text-gray-600">
              Showing: {filteredVariants.length} of {variants.length} variant(s)
            </div>
          </div>
        </>
      )}
    </div>
  );
}
