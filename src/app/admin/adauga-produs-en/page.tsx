"use client";
import React, { useState, useEffect } from "react";
import Toast from "@/components/Toast";

interface Product {
  id: number;
  name: string;
  productCode: string;
  nameEn?: string;
  descriptionEn?: string;
  specsEn?: string[];
  advantagesEn?: string[];
  pdfUrlEn?: string;
  safetySheetUrlEn?: string;
  deliveryTimeEn?: string;
}

export default function AdaugaProdusEN() {
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [formErr, setFormErr] = useState("");
  const [filter, setFilter] = useState<'all' | 'translated' | 'untranslated'>('all');
  const [uploading, setUploading] = useState<{ pdfUrlEn?: boolean; safetySheetUrlEn?: boolean }>({});

  const [form, setForm] = useState({
    nameEn: "",
    descriptionEn: "",
    specsEn: "",
    advantagesEn: "",
    pdfUrlEn: "",
    safetySheetUrlEn: "",
    deliveryTimeEn: "",
  });

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = () => {
    fetch("/admin/api/products", { credentials: "include" })
      .then(res => {
        if (!res.ok) throw new Error("Nu ești autentificat sau eroare server");
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) setProducts(data);
      })
      .catch(err => console.error("Eroare la încărcare produse:", err));
  };

  const filteredProducts = products.filter(p => {
    if (filter === 'translated') return !!p.nameEn;
    if (filter === 'untranslated') return !p.nameEn;
    return true;
  });

  function showToast(message: string, type: 'success' | 'error' = 'success') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  }

  const handleProductSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const productId = Number(e.target.value);
    const product = products.find(p => p.id === productId);
    if (product) {
      setSelectedProduct(product);
      setForm({
        nameEn: product.nameEn || "",
        descriptionEn: product.descriptionEn || "",
        specsEn: Array.isArray(product.specsEn) ? product.specsEn.join("\n") : "",
        advantagesEn: Array.isArray(product.advantagesEn) ? product.advantagesEn.join("\n") : "",
        pdfUrlEn: product.pdfUrlEn || "",
        safetySheetUrlEn: product.safetySheetUrlEn || "",
        deliveryTimeEn: product.deliveryTimeEn || "",
      });
    } else {
      setSelectedProduct(null);
      setForm({ nameEn: "", descriptionEn: "", specsEn: "", advantagesEn: "", pdfUrlEn: "", safetySheetUrlEn: "", deliveryTimeEn: "" });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: 'pdfUrlEn' | 'safetySheetUrlEn') => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(u => ({ ...u, [fieldName]: true }));
    
    try {
      const formData = new FormData();
      formData.append("file", file);
      
      const res = await fetch("/admin/api/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Upload error");
      }
      
      setForm(f => ({ ...f, [fieldName]: data.url }));
      showToast("File uploaded successfully!", "success");
    } catch (err: any) {
      showToast(err.message || "Error uploading file", "error");
    } finally {
      setUploading(u => ({ ...u, [fieldName]: false }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErr("");
    if (!selectedProduct) {
      setFormErr("Selectează un produs pentru a adăuga traducerea!");
      return;
    }
    setLoading(true);

    try {
      const body = {
        id: selectedProduct.id,
        nameEn: form.nameEn || undefined,
        descriptionEn: form.descriptionEn || undefined,
        specsEn: form.specsEn.trim() ? form.specsEn.split(/\r?\n/).map(s => s.trim()).filter(Boolean) : [],
        advantagesEn: form.advantagesEn.trim() ? form.advantagesEn.split(/\r?\n/).map(s => s.trim()).filter(Boolean) : [],
        pdfUrlEn: form.pdfUrlEn || undefined,
        safetySheetUrlEn: form.safetySheetUrlEn || undefined,
        deliveryTimeEn: form.deliveryTimeEn || undefined,
      };

      const res = await fetch("/admin/api/products", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("Eroare la salvare traducere");

      showToast("Traducere salvată cu succes!", "success");
      setSelectedProduct(null);
      setForm({ nameEn: "", descriptionEn: "", specsEn: "", advantagesEn: "", pdfUrlEn: "", safetySheetUrlEn: "", deliveryTimeEn: "" });
      loadProducts();
    } catch (err: any) {
      showToast(err.message || "Eroare la salvare!", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      {toast && <Toast message={toast.message} type={toast.type} />}
      
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-green-700">Products (English Translations)</h2>
        <div className="flex gap-2">
          <button onClick={() => setFilter('all')} className={`px-4 py-2 rounded-lg font-semibold transition ${filter === 'all' ? 'bg-green-600 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}>
            All ({products.length})
          </button>
          <button onClick={() => setFilter('translated')} className={`px-4 py-2 rounded-lg font-semibold transition ${filter === 'translated' ? 'bg-green-600 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}>
            ✓ Translated ({products.filter(p => p.nameEn).length})
          </button>
          <button onClick={() => setFilter('untranslated')} className={`px-4 py-2 rounded-lg font-semibold transition ${filter === 'untranslated' ? 'bg-orange-500 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}>
            ✗ Not translated ({products.filter(p => !p.nameEn).length})
          </button>
        </div>
      </div>

      {/* Formular de editare (când e selectat un produs) */}
      {selectedProduct && (
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-green-700">Edit Translation: {selectedProduct.name}</h3>
            <button onClick={() => { setSelectedProduct(null); setForm({ nameEn: "", descriptionEn: "", specsEn: "", advantagesEn: "", pdfUrlEn: "", safetySheetUrlEn: "", deliveryTimeEn: "" }); }} className="text-gray-500 hover:text-gray-700 text-2xl">✕</button>
          </div>
          {formErr && <div className="text-red-600 mb-4 text-center font-semibold">{formErr}</div>}
          
          <div className="bg-gray-100 p-3 rounded-lg mb-4">
            <p className="text-sm text-gray-600">Original (RO): <strong>{selectedProduct.name}</strong></p>
            <p className="text-sm text-gray-600">Code: <strong>{selectedProduct.productCode}</strong></p>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block font-semibold mb-1">Product Name (EN)</label>
              <input name="nameEn" type="text" placeholder="Product name in English" value={form.nameEn} onChange={handleChange} className="w-full border rounded-lg px-4 py-2 focus:outline-green-500" />
            </div>
            <div>
              <label className="block font-semibold mb-1">Delivery Time (EN)</label>
              <input name="deliveryTimeEn" type="text" placeholder="E.g.: 2-3 days" value={form.deliveryTimeEn} onChange={handleChange} className="w-full border rounded-lg px-4 py-2 focus:outline-green-500" />
            </div>
            <div className="md:col-span-2">
              <label className="block font-semibold mb-1">Description (EN)</label>
              <textarea name="descriptionEn" placeholder="Product description in English" value={form.descriptionEn} onChange={handleChange} className="w-full border rounded-lg px-4 py-2 focus:outline-green-500 h-24" />
            </div>
            <div>
              <label className="block font-semibold mb-1">Specifications (EN) - one per line</label>
              <textarea name="specsEn" placeholder="E.g.: Material: steel&#10;Weight: 2kg" value={form.specsEn} onChange={handleChange} className="w-full border rounded-lg px-4 py-2 focus:outline-green-500 h-20" />
            </div>
            <div>
              <label className="block font-semibold mb-1">Advantages (EN) - one per line</label>
              <textarea name="advantagesEn" placeholder="E.g.: High durability&#10;2 year warranty" value={form.advantagesEn} onChange={handleChange} className="w-full border rounded-lg px-4 py-2 focus:outline-green-500 h-20" />
            </div>
            <div>
              <label className="block font-semibold mb-1">PDF Datasheet (EN)</label>
              <div className="flex gap-2">
                <input name="pdfUrlEn" type="text" placeholder="/products/datasheet-en.pdf" value={form.pdfUrlEn} onChange={handleChange} className="flex-1 border rounded-lg px-4 py-2 focus:outline-green-500" />
                <label className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition font-semibold ${uploading.pdfUrlEn ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'} text-white`}>
                  {uploading.pdfUrlEn ? (
                    <><svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg> Uploading...</>
                  ) : (
                    <>📄 Upload PDF</>
                  )}
                  <input type="file" accept=".pdf,application/pdf" className="hidden" onChange={e => handleFileUpload(e, 'pdfUrlEn')} disabled={uploading.pdfUrlEn} />
                </label>
              </div>
              {form.pdfUrlEn && <a href={form.pdfUrlEn} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-blue-600 hover:underline text-sm">📄 View datasheet</a>}
            </div>
            <div>
              <label className="block font-semibold mb-1">Safety Sheet PDF (EN)</label>
              <div className="flex gap-2">
                <input name="safetySheetUrlEn" type="text" placeholder="/products/safety-sheet-en.pdf" value={form.safetySheetUrlEn} onChange={handleChange} className="flex-1 border rounded-lg px-4 py-2 focus:outline-green-500" />
                <label className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition font-semibold ${uploading.safetySheetUrlEn ? 'bg-gray-400' : 'bg-orange-600 hover:bg-orange-700'} text-white`}>
                  {uploading.safetySheetUrlEn ? (
                    <><svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg> Uploading...</>
                  ) : (
                    <>🛡️ Upload PDF</>
                  )}
                  <input type="file" accept=".pdf,application/pdf" className="hidden" onChange={e => handleFileUpload(e, 'safetySheetUrlEn')} disabled={uploading.safetySheetUrlEn} />
                </label>
              </div>
              {form.safetySheetUrlEn && <a href={form.safetySheetUrlEn} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-orange-600 hover:underline text-sm">🛡️ View safety sheet</a>}
            </div>
            <div className="md:col-span-2 flex justify-center">
              <button type="submit" disabled={loading} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-8 rounded-lg shadow transition disabled:opacity-60">
                {loading ? "Saving..." : "Save Translation"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tabel produse */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-green-50">
              <tr>
                <th className="px-4 py-3 font-semibold text-green-700">ID</th>
                <th className="px-4 py-3 font-semibold text-green-700">Name (RO)</th>
                <th className="px-4 py-3 font-semibold text-green-700">Name (EN)</th>
                <th className="px-4 py-3 font-semibold text-green-700">Code</th>
                <th className="px-4 py-3 font-semibold text-green-700">Status</th>
                <th className="px-4 py-3 font-semibold text-green-700">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No products found</td></tr>
              ) : (
                filteredProducts.map((p, i) => (
                  <tr key={p.id} className={`${i % 2 === 0 ? 'bg-white' : 'bg-green-50/30'} ${selectedProduct?.id === p.id ? 'ring-2 ring-green-500' : ''}`}>
                    <td className="px-4 py-3 text-gray-600">{p.id}</td>
                    <td className="px-4 py-3 font-medium">{p.name}</td>
                    <td className="px-4 py-3 text-gray-600">{p.nameEn || <span className="text-orange-500 italic">Not translated</span>}</td>
                    <td className="px-4 py-3 text-gray-600">{p.productCode}</td>
                    <td className="px-4 py-3">
                      {p.nameEn ? (
                        <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-sm font-semibold">✓ Translated</span>
                      ) : (
                        <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded-full text-sm font-semibold">✗ Pending</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => {
                          setSelectedProduct(p);
                          setForm({
                            nameEn: p.nameEn || "",
                            descriptionEn: p.descriptionEn || "",
                            specsEn: Array.isArray(p.specsEn) ? p.specsEn.join("\n") : "",
                            advantagesEn: Array.isArray(p.advantagesEn) ? p.advantagesEn.join("\n") : "",
                            pdfUrlEn: p.pdfUrlEn || "",
                            safetySheetUrlEn: p.safetySheetUrlEn || "",
                            deliveryTimeEn: p.deliveryTimeEn || "",
                          });
                        }}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg text-sm font-semibold transition"
                      >
                        {p.nameEn ? 'Edit' : 'Translate'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 bg-gray-50 text-sm text-gray-600">
          Showing: {filteredProducts.length} of {products.length} product(s)
        </div>
      </div>
    </div>
  );
}
