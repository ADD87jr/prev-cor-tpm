"use client";

import { useEffect, useState } from "react";
import Toast from "@/components/Toast";

interface Promo {
  id: number;
  title: string;
  text: string;
  image: string;
  active: boolean;
}

export default function AdminPromotiiPage() {
  // Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  function showToast(message: string, type: 'success' | 'error' = 'success') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  }
  const [formErr, setFormErr] = useState("");

  const [promos, setPromos] = useState<Promo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editData, setEditData] = useState<Promo | null>(null);
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);

  useEffect(() => {
    fetch("/admin/api/promotii")
      .then((res) => res.json())
      .then((data) => {
        setPromos(data);
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const res = await fetch("/admin/api/promotii", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(promos),
    });
    setSaving(false);
    if (res.ok) {
      showToast("Promoțiile au fost salvate!", "success");
    } else {
      showToast("Eroare la salvare promoții!", "error");
    }
  };

  const handleEdit = (idx: number) => {
    setEditIdx(idx);
    setEditData({ ...promos[idx] });
  };

  const handleCancelEdit = () => {
    setEditIdx(null);
    setEditData(null);
  };

  const handleSaveEdit = () => {
    setFormErr("");
    if (!editData?.title?.trim()) {
      setFormErr("Completează titlul promoției!");
      return;
    }
    if (!editData?.text?.trim()) {
      setFormErr("Completează textul promoției!");
      return;
    }
    if (editData && editIdx !== null) {
      const updated = [...promos];
      updated[editIdx] = editData;
      setPromos(updated);
      setEditIdx(null);
      setEditData(null);
      showToast("Promoție actualizată!", "success");
    }
  };

  const handleToggleActive = (idx: number) => {
    const updated = [...promos];
    updated[idx].active = !updated[idx].active;
    setPromos(updated);
    showToast(updated[idx].active ? "Promoție activată!" : "Promoție dezactivată!", "success");
  };

  const handleAddPromo = () => {
    const newPromo: Promo = {
      id: Date.now(),
      title: "Promoție nouă",
      text: "Descriere promoție",
      image: "",
      active: true,
    };
    setPromos([...promos, newPromo]);
    showToast("Promoție nouă adăugată!", "success");
  };

  const handleDeletePromo = (idx: number) => {
    if (confirm("Sigur vrei să ștergi această promoție?")) {
      const updated = promos.filter((_, i) => i !== idx);
      setPromos(updated);
      showToast("Promoție ștearsă!", "success");
    }
  };

  // Funcție pentru redimensionare imagine
  const resizeImage = (file: File, maxWidth: number, maxHeight: number): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Calculează dimensiunile proporționale
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Nu se poate crea context canvas'));
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Nu se poate crea blob'));
          },
          'image/jpeg',
          0.85 // calitate JPEG
        );
      };
      img.onerror = () => reject(new Error('Nu se poate încărca imaginea'));
      img.src = URL.createObjectURL(file);
    });
  };

  const handleImageUpload = async (idx: number, file: File) => {
    setUploadingIdx(idx);
    
    try {
      // Redimensionează imaginea la 800x400 px max
      const resizedBlob = await resizeImage(file, 800, 400);
      
      const formData = new FormData();
      const timestamp = Date.now();
      const filename = `promo_${promos[idx].id}_${timestamp}.jpg`;
      formData.append("file", resizedBlob, filename);
      formData.append("filename", filename);
      
      const res = await fetch("/admin/api/banners/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.path) {
        const updated = [...promos];
        updated[idx].image = data.path + "?t=" + timestamp;
        setPromos(updated);
        showToast("Imagine încărcată și redimensionată cu succes!", "success");
      }
    } catch (err) {
      showToast("Eroare la încărcare imagine!", "error");
    }
    setUploadingIdx(null);
  };

  if (loading) return <div className="p-8">Se încarcă...</div>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} />}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-blue-900">Gestionare Promoții</h1>
        <div className="flex gap-2">
          <button
            onClick={handleAddPromo}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            + Adaugă promoție
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            {saving ? "Se salvează..." : "Salvează toate"}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {promos.map((promo, idx) => (
          <div
            key={promo.id}
            className={`bg-white rounded-lg shadow p-4 border-l-4 ${
              promo.active ? "border-green-500" : "border-gray-300"
            }`}
          >
            {editIdx === idx && editData ? (
              // Mod editare
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-semibold mb-1">Titlu</label>
                  <input
                    type="text"
                    value={editData.title}
                    onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Text</label>
                  <input
                    type="text"
                    value={editData.text}
                    onChange={(e) => setEditData({ ...editData, text: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveEdit}
                    className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                  >
                    Salvează
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="px-3 py-1 bg-gray-300 rounded text-sm hover:bg-gray-400"
                  >
                    Anulează
                  </button>
                </div>
              </div>
            ) : (
              // Mod vizualizare
              <div className="flex items-center gap-4">
                <div className="w-24 h-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded flex items-center justify-center overflow-hidden">
                  {promo.image ? (
                    <img src={promo.image} alt={promo.title} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white text-xs">Fără imagine</span>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg">{promo.title}</h3>
                  <p className="text-gray-600 text-sm">{promo.text}</p>
                </div>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={promo.active}
                      onChange={() => handleToggleActive(idx)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Activ</span>
                  </label>
                  <label className="px-3 py-1 bg-purple-100 text-purple-700 rounded text-sm cursor-pointer hover:bg-purple-200">
                    {uploadingIdx === idx ? "Se încarcă..." : "Încarcă imagine"}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(idx, file);
                      }}
                    />
                  </label>
                  <button
                    onClick={() => handleEdit(idx)}
                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200"
                  >
                    Editează
                  </button>
                  <button
                    onClick={() => handleDeletePromo(idx)}
                    className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
                  >
                    Șterge
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {promos.length === 0 && (
        <div className="text-center text-gray-500 py-8">
          Nu există promoții. Apasă "Adaugă promoție" pentru a crea una.
        </div>
      )}

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-3">Previzualizare bannere active (așa vor apărea în magazin)</h3>
        {promos.filter(p => p.active).length > 0 ? (
          <div className="space-y-4">
            {promos.filter(p => p.active).map((promo) => (
              <div 
                key={promo.id} 
                className="rounded-2xl overflow-hidden shadow-lg bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600"
              >
                <div className="flex flex-col md:flex-row items-center">
                  {/* Imaginea - mai compactă */}
                  {promo.image && (
                    <div className="w-full md:w-1/4 h-28 flex-shrink-0">
                      <img 
                        src={promo.image} 
                        alt={promo.title} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  
                  {/* Conținut text */}
                  <div className={`flex-1 py-6 px-6 text-center ${promo.image ? 'md:text-left' : ''}`}>
                    <h2 className="text-xl md:text-2xl font-extrabold text-white mb-2">
                      {promo.title}
                    </h2>
                    <p className="text-blue-100 font-medium">
                      {promo.text}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-gray-500 text-center py-4">Nicio promoție activă</div>
        )}
      </div>
    </div>
  );
}
