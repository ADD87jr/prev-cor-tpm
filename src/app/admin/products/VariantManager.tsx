"use client";

import React, { useEffect, useState } from "react";
import Toast from "@/components/Toast";

interface ProductVariant {
  id: number;
  productId: number;
  code: string;
  compatibil?: string;
  compatibilEn?: string;
  greutate?: number;
  stoc: number;
  pret?: number;
  modAmbalare?: string;
  modAmbalareEn?: string;
  descriere?: string;
  descriereEn?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface VariantManagerProps {
  productId: number;
  productName: string;
  onClose: () => void;
}

export default function VariantManager({ productId, productName, onClose }: VariantManagerProps) {
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    code: "",
    compatibil: "",
    compatibilEn: "",
    greutate: "",
    stoc: "",
    pret: "",
    modAmbalare: "",
    modAmbalareEn: "",
    descriere: "",
    descriereEn: "",
  });

  function showToast(message: string, type: "success" | "error" = "success") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  }

  // Încarcă variantele
  useEffect(() => {
    fetchVariants();
  }, [productId]);

  const fetchVariants = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/admin/api/products/variants?productId=${productId}`);
      if (!res.ok) throw new Error("Eroare la preluarea variantelor");
      const data = await res.json();
      setVariants(data);
    } catch (err: any) {
      showToast(err.message || "Eroare la preluare variante", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const resetForm = () => {
    setForm({
      code: "",
      compatibil: "",
      compatibilEn: "",
      greutate: "",
      stoc: "",
      pret: "",
      modAmbalare: "",
      modAmbalareEn: "",
      descriere: "",
      descriereEn: "",
    });
    setEditingId(null);
  };

  const handleSaveVariant = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.code.trim()) {
      showToast("Codul variantei este obligatoriu!", "error");
      return;
    }

    try {
      const body = {
        productId,
        ...form,
        greutate: form.greutate ? Number(form.greutate) : undefined,
        stoc: Number(form.stoc) || 0,
        pret: form.pret ? Number(form.pret) : undefined,
      };

      let res;
      if (editingId) {
        res = await fetch(`/admin/api/products/variants`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingId, ...body }),
        });
      } else {
        res = await fetch(`/admin/api/products/variants`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }

      if (!res.ok) throw new Error("Eroare la salvare variantă");

      showToast(
        editingId ? "Variantă actualizată cu succes!" : "Variantă adăugată cu succes!",
        "success"
      );

      resetForm();
      setShowForm(false);
      fetchVariants();
    } catch (err: any) {
      showToast(err.message || "Eroare la salvare", "error");
    }
  };

  const handleEditVariant = (variant: ProductVariant) => {
    setForm({
      code: variant.code,
      compatibil: variant.compatibil || "",
      compatibilEn: variant.compatibilEn || "",
      greutate: variant.greutate?.toString() || "",
      stoc: variant.stoc.toString(),
      pret: variant.pret?.toString() || "",
      modAmbalare: variant.modAmbalare || "",
      modAmbalareEn: variant.modAmbalareEn || "",
      descriere: variant.descriere || "",
      descriereEn: variant.descriereEn || "",
    });
    setEditingId(variant.id);
    setShowForm(true);
  };

  const handleDeleteVariant = async (id: number) => {
    if (!window.confirm("Sigur vrei să ștergi questa variantă?")) return;

    try {
      const res = await fetch(`/admin/api/products/variants`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (!res.ok) throw new Error("Eroare la ștergere");

      showToast("Variantă ștearsă cu succes!", "success");
      fetchVariants();
    } catch (err: any) {
      showToast(err.message || "Eroare la ștergere", "error");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      {toast && <Toast message={toast.message} type={toast.type} />}

      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-blue-700 to-blue-800 text-white px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Variante produs</h2>
            <p className="text-blue-100 text-sm">{productName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-blue-900 p-2 rounded-lg transition"
          >
            ✕
          </button>
        </div>

        <div className="p-6">
          {/* Buton adaugă variantă */}
          {!showForm && (
            <button
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              className="mb-6 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold"
            >
              + Adaugă variantă nouă
            </button>
          )}

          {/* Formular */}
          {showForm && (
            <form onSubmit={handleSaveVariant} className="mb-6 bg-blue-50 p-4 rounded-lg border-l-4 border-blue-600">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold mb-1 text-sm">Cod variantă *</label>
                  <input
                    type="text"
                    name="code"
                    required
                    placeholder="Ex: SKU-001"
                    value={form.code}
                    onChange={handleFormChange}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-sm">Compatibilitate</label>
                  <input
                    type="text"
                    name="compatibil"
                    placeholder="Ex: Roșu 220V AC"
                    value={form.compatibil}
                    onChange={handleFormChange}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-sm">🇬🇧 Compatibilitate (EN)</label>
                  <input
                    type="text"
                    name="compatibilEn"
                    placeholder="Ex: Red 220V AC"
                    value={form.compatibilEn}
                    onChange={handleFormChange}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-sm">Greutate (kg)</label>
                  <input
                    type="number"
                    name="greutate"
                    placeholder="Ex: 0.5"
                    min="0"
                    step="0.01"
                    value={form.greutate}
                    onChange={handleFormChange}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-sm">Stoc *</label>
                  <input
                    type="number"
                    name="stoc"
                    required
                    placeholder="0"
                    min="0"
                    value={form.stoc}
                    onChange={handleFormChange}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-sm">Preț variantă (opțional)</label>
                  <input
                    type="number"
                    name="pret"
                    placeholder="Dacă diferit de produs"
                    min="0"
                    step="0.01"
                    value={form.pret}
                    onChange={handleFormChange}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-sm">Mod ambalare</label>
                  <input
                    type="text"
                    name="modAmbalare"
                    placeholder="Ex: bucată, set, palet"
                    value={form.modAmbalare}
                    onChange={handleFormChange}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-sm">🇬🇧 Mod ambalare (EN)</label>
                  <input
                    type="text"
                    name="modAmbalareEn"
                    placeholder="Ex: piece, set, pallet"
                    value={form.modAmbalareEn}
                    onChange={handleFormChange}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block font-semibold mb-1 text-sm">Descriere</label>
                  <textarea
                    name="descriere"
                    placeholder="Detalii suplimentare despre această variantă"
                    value={form.descriere}
                    onChange={handleFormChange}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    rows={2}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block font-semibold mb-1 text-sm">🇬🇧 Descriere (EN)</label>
                  <textarea
                    name="descriereEn"
                    placeholder="Additional details about this variant (English)"
                    value={form.descriereEn}
                    onChange={handleFormChange}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    rows={2}
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold text-sm"
                >
                  {editingId ? "Salvează modificări" : "Adaugă variantă"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setShowForm(false);
                  }}
                  className="bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded-lg font-semibold text-sm"
                >
                  Anulează
                </button>
              </div>
            </form>
          )}

          {/* Tabel variante */}
          {loading ? (
            <div className="text-center py-8">Se încarcă variantele...</div>
          ) : variants.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Nu sunt variante adăugate</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-100 border-b">
                    <th className="px-3 py-2 text-left font-semibold">Cod</th>
                    <th className="px-3 py-2 text-left font-semibold">Compatibilitate</th>
                    <th className="px-3 py-2 text-left font-semibold">Greutate</th>
                    <th className="px-3 py-2 text-left font-semibold">Stoc</th>
                    <th className="px-3 py-2 text-left font-semibold">Preț</th>
                    <th className="px-3 py-2 text-left font-semibold">Ambalare</th>
                    <th className="px-3 py-2 text-left font-semibold">Acțiuni</th>
                  </tr>
                </thead>
                <tbody>
                  {variants.map((v, idx) => (
                    <tr key={v.id} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="px-3 py-2 font-semibold">{v.code}</td>
                      <td className="px-3 py-2">{v.compatibil || "-"}</td>
                      <td className="px-3 py-2">{v.greutate ? `${v.greutate} kg` : "-"}</td>
                      <td className="px-3 py-2 font-semibold">{v.stoc}</td>
                      <td className="px-3 py-2">{v.pret ? `${v.pret.toFixed(2)} RON` : "-"}</td>
                      <td className="px-3 py-2">{v.modAmbalare || "-"}</td>
                      <td className="px-3 py-2 flex gap-2">
                        <button
                          onClick={() => handleEditVariant(v)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs"
                        >
                          Editează
                        </button>
                        <button
                          onClick={() => handleDeleteVariant(v.id)}
                          className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs"
                        >
                          Șterge
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
