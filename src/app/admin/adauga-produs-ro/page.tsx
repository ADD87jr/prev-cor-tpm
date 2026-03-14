"use client";
import React, { useState, useEffect } from "react";
import Toast from "@/components/Toast";
import Link from "next/link";

interface Product {
  id: number;
  name: string;
  productCode: string;
  price: number;
  listPrice?: number;
  purchasePrice?: number;
  manufacturer?: string;
  stock: number;
  onDemand?: boolean;
  image?: string;
  type?: string;
  domain?: string;
  currency?: string;
  discount?: number;
  discountType?: string;
  description?: string;
  specs?: string[];
  advantages?: string[];
  pdfUrl?: string;
  safetySheetUrl?: string;
  model3dUrl?: string;
  deliveryTime?: string;
}

export default function AdaugaProdusRO() {
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [loading, setLoading] = useState(false);
  const [formErr, setFormErr] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [uploading, setUploading] = useState<{ image?: boolean; pdfUrl?: boolean; safetySheetUrl?: boolean; model3dUrl?: boolean }>({});
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  
  // Paginare
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [searchQuery, setSearchQuery] = useState("");
  const [manufacturerFilter, setManufacturerFilter] = useState("");
  
  // Categorii din API
  const [domains, setDomains] = useState<{ id: number; name: string }[]>([]);
  const [types, setTypes] = useState<{ id: number; name: string }[]>([]);
  const [manufacturers, setManufacturers] = useState<{ id: number; name: string }[]>([]);

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, []);

  const loadProducts = () => {
    fetch("/admin/api/products", { credentials: "include" })
      .then(res => res.ok ? res.json() : [])
      .then(data => { if (Array.isArray(data)) setProducts(data); })
      .catch(() => {});
  };

  const loadCategories = () => {
    fetch("/admin/api/product-categories")
      .then(res => res.ok ? res.json() : { domains: [], types: [], manufacturers: [] })
      .then(data => {
        setDomains(Array.isArray(data.domains) ? data.domains : []);
        setTypes(Array.isArray(data.types) ? data.types : []);
        setManufacturers(Array.isArray(data.manufacturers) ? data.manufacturers : []);
      })
      .catch(() => {});
  };

  const [form, setForm] = useState({
    name: "",
    productCode: "",
    price: "",
    listPrice: "",
    purchasePrice: "",
    stock: "",
    onDemand: false,
    image: "",
    images: [] as string[],
    type: "",
    domain: "",
    currency: "RON",
    discount: "",
    discountType: "percent",
    manufacturer: "",
    description: "",
    specs: "",
    advantages: "",
    pdfUrl: "",
    safetySheetUrl: "",
    model3dUrl: "",
    deliveryTime: "",
  });
  const [uploadingExtraImage, setUploadingExtraImage] = useState(false);

  function showToast(message: string, type: 'success' | 'error' = 'success') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setForm(f => {
      const newForm = { ...f, [name]: type === 'checkbox' ? checked : value };
      
      // Auto-calculate sale price when listPrice or discount changes
      if (name === 'listPrice' || name === 'discount') {
        const listPrice = parseFloat(name === 'listPrice' ? value : f.listPrice) || 0;
        const discount = parseFloat(name === 'discount' ? value : f.discount) || 0;
        
        if (listPrice > 0 && discount >= 0 && discount <= 100) {
          const calculatedPrice = listPrice * (1 - discount / 100);
          // Round to 2 decimals
          newForm.price = (Math.round(calculatedPrice * 100) / 100).toString();
        }
      }
      
      return newForm;
    });
  };

  // Verifică dimensiunile imaginii
  const checkImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(img.src);
        resolve({ width: img.width, height: img.height });
      };
      img.onerror = () => reject(new Error("Nu pot citi imaginea"));
      img.src = URL.createObjectURL(file);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: 'image' | 'pdfUrl' | 'safetySheetUrl' | 'model3dUrl') => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(u => ({ ...u, [fieldName]: true }));
    
    try {
      // Verifică dimensiunile doar pentru imagini
      if (fieldName === 'image' && file.type.startsWith('image/')) {
        const dims = await checkImageDimensions(file);
        const fileSizeKB = (file.size / 1024).toFixed(1);
        if (dims.width < 400 || dims.height < 400) {
          const continua = window.confirm(
            `⚠️ Atenție: Imaginea selectată are doar ${dims.width}x${dims.height} pixeli (${fileSizeKB} KB).\n\n` +
            `Aceasta este probabil un THUMBNAIL, nu imaginea originală!\n` +
            `Pe site-ul IFM, deschide imaginea într-un tab nou și salvează de acolo.\n\n` +
            `Continuați oricum cu această imagine mică?`
          );
          if (!continua) {
            setUploading(u => ({ ...u, [fieldName]: false }));
            return;
          }
        }
      }

      const formData = new FormData();
      formData.append("file", file);
      
      const res = await fetch("/admin/api/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Eroare la upload");
      }
      
      setForm(f => ({ ...f, [fieldName]: data.url }));
      showToast("Fișier încărcat cu succes!", "success");
    } catch (err: any) {
      showToast(err.message || "Eroare la încărcarea fișierului", "error");
    } finally {
      setUploading(u => ({ ...u, [fieldName]: false }));
    }
  };

  // Upload imagine adițională pentru galerie
  const handleExtraImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingExtraImage(true);
    
    try {
      // Verifică dimensiunile imaginii
      const dims = await checkImageDimensions(file);
      const fileSizeKB = (file.size / 1024).toFixed(1);
      if (dims.width < 400 || dims.height < 400) {
        const continua = window.confirm(
          `⚠️ Atenție: Imaginea selectată are doar ${dims.width}x${dims.height} pixeli (${fileSizeKB} KB).\n\n` +
          `Aceasta este probabil un THUMBNAIL, nu imaginea originală!\n` +
          `Pe site-ul IFM, deschide imaginea într-un tab nou și salvează de acolo.\n\n` +
          `Continuați oricum cu această imagine mică?`
        );
        if (!continua) {
          setUploadingExtraImage(false);
          return;
        }
      }

      const formData = new FormData();
      formData.append("file", file);
      
      const res = await fetch("/admin/api/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Eroare la upload");
      }
      
      setForm(f => ({ ...f, images: [...f.images, data.url] }));
      showToast("Imagine adăugată în galerie!", "success");
    } catch (err: any) {
      showToast(err.message || "Eroare la încărcarea imaginii", "error");
    } finally {
      setUploadingExtraImage(false);
    }
  };

  // Șterge imagine din galerie
  const removeExtraImage = (index: number) => {
    setForm(f => ({ ...f, images: f.images.filter((_, i) => i !== index) }));
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    // Parse images - poate fi string JSON sau array
    let parsedImages: string[] = [];
    if (Array.isArray((product as any).images)) {
      parsedImages = (product as any).images;
    } else if (typeof (product as any).images === 'string' && (product as any).images) {
      try {
        parsedImages = JSON.parse((product as any).images);
      } catch (e) {
        parsedImages = [];
      }
    }
    
    setForm({
      name: product.name,
      productCode: product.productCode || "",
      price: String(product.price),
      listPrice: product.listPrice ? String(product.listPrice) : "",
      purchasePrice: product.purchasePrice ? String(product.purchasePrice) : "",
      stock: String(product.stock || 0),
      onDemand: product.onDemand || false,
      image: product.image || "",
      images: parsedImages,
      type: product.type || "",
      domain: product.domain || "",
      currency: product.currency || "RON",
      discount: product.discount ? String(product.discount) : "",
      discountType: product.discountType || "percent",
      manufacturer: product.manufacturer || "",
      description: product.description || "",
      specs: Array.isArray(product.specs) ? product.specs.join("\n") : "",
      advantages: Array.isArray(product.advantages) ? product.advantages.join("\n") : "",
      pdfUrl: product.pdfUrl || "",
      safetySheetUrl: product.safetySheetUrl || "",
      model3dUrl: product.model3dUrl || "",
      deliveryTime: product.deliveryTime || "",
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/admin/api/products?id=${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Eroare la ștergere");
      showToast("Produs șters cu succes!", "success");
      setDeleteConfirm(null);
      setSelectedProducts(prev => { const next = new Set(prev); next.delete(id); return next; });
      loadProducts();
    } catch (err: any) {
      showToast(err.message || "Eroare la ștergere!", "error");
    }
  };

  // Funcții pentru selecție multiplă
  const toggleSelectProduct = (id: number) => {
    setSelectedProducts(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    // Verifică dacă toate produsele din pagina curentă sunt selectate
    const allCurrentSelected = paginatedProducts.every(p => selectedProducts.has(p.id));
    
    if (allCurrentSelected) {
      // Deselectează doar produsele din pagina curentă
      setSelectedProducts(prev => {
        const next = new Set(prev);
        paginatedProducts.forEach(p => next.delete(p.id));
        return next;
      });
    } else {
      // Selectează toate produsele din pagina curentă
      setSelectedProducts(prev => {
        const next = new Set(prev);
        paginatedProducts.forEach(p => next.add(p.id));
        return next;
      });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedProducts.size === 0) return;
    setShowBulkDeleteModal(true);
  };

  const confirmBulkDelete = async () => {
    setShowBulkDeleteModal(false);
    setBulkDeleting(true);
    let deleted = 0;
    let errors = 0;
    
    for (const id of selectedProducts) {
      try {
        // skipReindex=true pentru a nu re-indexa după fiecare ștergere
        const res = await fetch(`/admin/api/products?id=${id}&skipReindex=true`, { method: "DELETE", credentials: "include" });
        if (res.ok) deleted++;
        else errors++;
      } catch {
        errors++;
      }
    }
    
    // Re-indexare o singură dată la final
    try {
      await fetch(`/admin/api/products?action=reindex`, { method: "DELETE", credentials: "include" });
    } catch (e) {
      console.error("Reindex error:", e);
    }
    
    setBulkDeleting(false);
    setSelectedProducts(new Set());
    loadProducts();
    
    if (errors === 0) {
      showToast(`${deleted} produse șterse cu succes!`, "success");
    } else {
      showToast(`${deleted} șterse, ${errors} erori`, errors > deleted ? "error" : "success");
    }
  };

  // Logica paginare - cu filtrare pe căutare și producător
  const filteredProducts = products.filter(p => {
    // Filtru producător
    if (manufacturerFilter && p.manufacturer !== manufacturerFilter) return false;
    // Filtru căutare
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return p.name?.toLowerCase().includes(q) ||
        p.productCode?.toLowerCase().includes(q) ||
        String(p.id).includes(searchQuery);
    }
    return true;
  });
  const totalPages = Math.ceil(filteredProducts.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedProducts = filteredProducts.slice(startIndex, startIndex + pageSize);
  
  // Reset la pagina 1 când se schimbă pageSize
  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  const resetForm = () => {
    setEditingProduct(null);
    setShowForm(false);
    setForm({
      name: "", productCode: "", price: "", listPrice: "", purchasePrice: "",
      stock: "", onDemand: false, image: "", images: [], type: "", domain: "",
      currency: "RON", discount: "", discountType: "percent", manufacturer: "",
      description: "", specs: "", advantages: "", pdfUrl: "", safetySheetUrl: "", model3dUrl: "", deliveryTime: "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErr("");
    setLoading(true);

    if (!form.name.trim()) {
      setFormErr("Completează numele produsului!");
      setLoading(false);
      return;
    }
    if (!form.productCode.trim()) {
      setFormErr("Completează codul produsului!");
      setLoading(false);
      return;
    }
    if (!form.price || Number(form.price) <= 0) {
      setFormErr("Completează prețul de vânzare!");
      setLoading(false);
      return;
    }

    try {
      const body = {
        ...(editingProduct && { id: editingProduct.id }),
        name: form.name,
        productCode: form.productCode,
        price: Number(form.price),
        listPrice: form.listPrice ? Number(form.listPrice) : undefined,
        purchasePrice: form.purchasePrice ? Number(form.purchasePrice) : undefined,
        stock: Number(form.stock) || 0,
        onDemand: form.onDemand,
        image: form.image,
        images: form.images.length > 0 ? form.images : undefined,
        type: form.type,
        domain: form.domain,
        currency: form.currency,
        discount: form.discount ? Number(form.discount) : undefined,
        discountType: form.discount ? form.discountType : undefined,
        manufacturer: form.manufacturer || undefined,
        description: form.description,
        specs: form.specs.trim() ? form.specs.split(/\r?\n/).map(s => s.trim()).filter(Boolean) : [],
        advantages: form.advantages.trim() ? form.advantages.split(/\r?\n/).map(s => s.trim()).filter(Boolean) : [],
        pdfUrl: form.pdfUrl || undefined,
        safetySheetUrl: form.safetySheetUrl || undefined,
        model3dUrl: form.model3dUrl || undefined,
        deliveryTime: form.deliveryTime || undefined,
      };

      const res = await fetch("/admin/api/products", {
        method: editingProduct ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error(editingProduct ? "Eroare la actualizare produs" : "Eroare la adăugare produs");

      showToast(editingProduct ? "Produs actualizat cu succes!" : "Produs adăugat cu succes!", "success");
      loadProducts();
      resetForm();
    } catch (err: any) {
      showToast(err.message || "Eroare la salvare!", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full px-2 mx-auto">
      {toast && <Toast message={toast.message} type={toast.type} />}
      
      {/* Header cu buton adăugare */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-blue-700">Produse (Română)</h2>
        <button 
          onClick={() => { if (showForm) resetForm(); else setShowForm(true); }}
          className={`${showForm ? 'bg-gray-500 hover:bg-gray-600' : 'bg-teal-600 hover:bg-teal-700'} text-white font-bold py-2 px-6 rounded-lg shadow transition`}
        >
          {showForm ? '✕ Închide formularul' : '➕ Adaugă produs nou'}
        </button>
      </div>

      {/* Formular de adăugare/editare */}
      {showForm && (
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <h3 className="text-xl font-bold mb-4 text-blue-700 text-center">
            {editingProduct ? `Editează: ${editingProduct.name}` : 'Adaugă produs nou'}
          </h3>
          {formErr && <div className="text-red-600 mb-4 text-center font-semibold">{formErr}</div>}
          
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block font-semibold mb-1">Nume produs *</label>
              <input name="name" type="text" required placeholder="Nume produs" value={form.name} onChange={handleChange} className="w-full border rounded-lg px-4 py-2 focus:outline-blue-500" />
            </div>
            <div>
              <label className="block font-semibold mb-1">Cod produs *</label>
              <input name="productCode" type="text" required placeholder="Cod produs" value={form.productCode || ""} onChange={handleChange} className="w-full border rounded-lg px-4 py-2 focus:outline-blue-500" />
            </div>
            <div>
              <label className="block font-semibold mb-1">Preț vânzare *</label>
              <input name="price" type="number" step="0.01" required min="0" placeholder="Preț vânzare" value={form.price} onChange={handleChange} className="w-full border rounded-lg px-4 py-2 focus:outline-blue-500" />
            </div>
            <div>
              <label className="block font-semibold mb-1">Preț de listă</label>
              <input name="listPrice" type="number" step="0.01" min="0" placeholder="Preț de listă (opțional)" value={form.listPrice} onChange={handleChange} className="w-full border rounded-lg px-4 py-2 focus:outline-blue-500" />
            </div>
            <div>
              <label className="block font-semibold mb-1">Preț de intrare</label>
              <input name="purchasePrice" type="number" step="0.01" min="0" placeholder="Preț achiziție" value={form.purchasePrice} onChange={handleChange} className="w-full border rounded-lg px-4 py-2 focus:outline-blue-500" />
            </div>
            <div>
              <label className="block font-semibold mb-1">Producător</label>
              <input name="manufacturer" type="text" list="manufacturers-list" placeholder="Alege sau introdu producător" value={form.manufacturer} onChange={handleChange} className="w-full border rounded-lg px-4 py-2 focus:outline-blue-500" />
              <datalist id="manufacturers-list">
                {manufacturers.map(m => <option key={m.id} value={m.name} />)}
              </datalist>
            </div>
            <div>
              <label className="block font-semibold mb-1">Monedă</label>
              <select name="currency" value={form.currency} onChange={handleChange} className="w-full border rounded-lg px-2 py-2 focus:outline-blue-500 bg-blue-50 font-semibold">
                <option value="RON">RON</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1">Stoc</label>
              <div className="flex gap-4 items-center">
                <input name="stock" type="number" min="0" placeholder="Stoc disponibil" value={form.stock} onChange={handleChange} className="flex-1 border rounded-lg px-4 py-2 focus:outline-blue-500" disabled={form.onDemand} />
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    name="onDemand" 
                    checked={form.onDemand} 
                    onChange={(e) => setForm(prev => ({ ...prev, onDemand: e.target.checked }))} 
                    className="w-5 h-5 accent-orange-500"
                  />
                  <span className="text-orange-600 font-semibold">Pe comandă</span>
                </label>
              </div>
            </div>
            <div>
              <label className="block font-semibold mb-1">Tip produs</label>
              <select name="type" value={form.type} onChange={handleChange} className="w-full border rounded-lg px-2 py-2 focus:outline-blue-500 bg-blue-50 font-semibold">
                <option value="">Alege tipul</option>
                {types.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1">Domeniu</label>
              <select name="domain" value={form.domain} onChange={handleChange} className="w-full border rounded-lg px-2 py-2 focus:outline-blue-500 bg-blue-50 font-semibold">
                <option value="">Alege domeniul</option>
                {domains.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-1">Discount (%)</label>
              <input name="discount" type="number" min="0" max="100" placeholder="Ex: 10" value={form.discount} onChange={handleChange} className="w-full border rounded-lg px-4 py-2 focus:outline-blue-500" />
            </div>
            <div>
              <label className="block font-semibold mb-1">Termen livrare</label>
              <input name="deliveryTime" type="text" placeholder="Ex: 2-3 zile" value={form.deliveryTime} onChange={handleChange} className="w-full border rounded-lg px-4 py-2 focus:outline-blue-500" />
            </div>
            <div className="md:col-span-2">
              <label className="block font-semibold mb-1">Descriere</label>
              <textarea name="description" placeholder="Descriere produs" value={form.description} onChange={handleChange} className="w-full border rounded-lg px-4 py-2 focus:outline-blue-500 h-24" />
            </div>
            <div className="md:col-span-2">
              <label className="block font-semibold mb-1">Specificații (câte una pe linie)</label>
              <textarea name="specs" placeholder="Ex: Material: oțel&#10;Greutate: 2kg" value={form.specs} onChange={handleChange} className="w-full border rounded-lg px-4 py-2 focus:outline-blue-500 h-20" />
            </div>
            <div className="md:col-span-2">
              <label className="block font-semibold mb-1">Avantaje (câte unul pe linie)</label>
              <textarea name="advantages" placeholder="Ex: Durabilitate ridicată&#10;Garanție 2 ani" value={form.advantages} onChange={handleChange} className="w-full border rounded-lg px-4 py-2 focus:outline-blue-500 h-20" />
            </div>
            <div>
              <label className="block font-semibold mb-1">Imagine produs</label>
              <div className="flex gap-2">
                <input name="image" type="text" placeholder="/products/imagine.jpg" value={form.image} onChange={handleChange} className="flex-1 border rounded-lg px-4 py-2 focus:outline-blue-500" />
                <label className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition font-semibold ${uploading.image ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'} text-white`}>
                  {uploading.image ? (
                    <><svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg> Se încarcă...</>
                  ) : (
                    <>📷 Încarcă</>
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={e => handleFileUpload(e, 'image')} disabled={uploading.image} />
                </label>
              </div>
              {form.image && <img src={form.image} alt="Preview" className="mt-2 h-20 object-contain rounded border" />}
              {/* Galerie imagini suplimentare */}
              <div className="mt-3">
                <label className="block font-semibold mb-1 text-sm text-gray-600">Imagini suplimentare (galerie)</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {form.images.map((img, idx) => (
                    <div key={idx} className="relative group">
                      <img src={img} alt={`Extra ${idx + 1}`} className="h-16 w-16 object-cover rounded border" />
                      <button
                        type="button"
                        onClick={() => removeExtraImage(idx)}
                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  {form.images.length < 5 && (
                    <label className={`h-16 w-16 border-2 border-dashed rounded flex items-center justify-center cursor-pointer transition ${uploadingExtraImage ? 'border-gray-300 bg-gray-100' : 'border-blue-400 hover:border-blue-600 hover:bg-blue-50'}`}>
                      {uploadingExtraImage ? (
                        <svg className="animate-spin h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                      ) : (
                        <span className="text-2xl text-blue-500">+</span>
                      )}
                      <input type="file" accept="image/*" className="hidden" onChange={handleExtraImageUpload} disabled={uploadingExtraImage} />
                    </label>
                  )}
                </div>
                <p className="text-xs text-gray-500">Max 5 imagini în galerie. Click pe + pentru a adăuga.</p>
              </div>
            </div>
            <div>
              <label className="block font-semibold mb-1">PDF Fișă Tehnică</label>
              <div className="flex gap-2">
                <input name="pdfUrl" type="text" placeholder="/products/fisa-tehnica.pdf" value={form.pdfUrl} onChange={handleChange} className="flex-1 border rounded-lg px-4 py-2 focus:outline-blue-500" />
                <label className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition font-semibold ${uploading.pdfUrl ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'} text-white`}>
                  {uploading.pdfUrl ? (
                    <><svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg> Se încarcă...</>
                  ) : (
                    <>📄 Încarcă PDF</>
                  )}
                  <input type="file" accept=".pdf,application/pdf" className="hidden" onChange={e => handleFileUpload(e, 'pdfUrl')} disabled={uploading.pdfUrl} />
                </label>
              </div>
              {form.pdfUrl && <a href={form.pdfUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-blue-600 hover:underline text-sm">📄 Vizualizează fișa tehnică</a>}
            </div>
            <div>
              <label className="block font-semibold mb-1">PDF Fișă Securitate</label>
              <div className="flex gap-2">
                <input name="safetySheetUrl" type="text" placeholder="/products/fisa-securitate.pdf" value={form.safetySheetUrl} onChange={handleChange} className="flex-1 border rounded-lg px-4 py-2 focus:outline-blue-500" />
                <label className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition font-semibold ${uploading.safetySheetUrl ? 'bg-gray-400' : 'bg-orange-600 hover:bg-orange-700'} text-white`}>
                  {uploading.safetySheetUrl ? (
                    <><svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg> Se încarcă...</>
                  ) : (
                    <>🛡️ Încarcă PDF</>
                  )}
                  <input type="file" accept=".pdf,application/pdf" className="hidden" onChange={e => handleFileUpload(e, 'safetySheetUrl')} disabled={uploading.safetySheetUrl} />
                </label>
              </div>
              {form.safetySheetUrl && <a href={form.safetySheetUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-orange-600 hover:underline text-sm">🛡️ Vizualizează fișa securitate</a>}
            </div>
            <div>
              <label className="block font-semibold mb-1">Model 3D (STEP, IGES)</label>
              <div className="flex gap-2">
                <input name="model3dUrl" type="text" placeholder="https://example.com/model.step" value={form.model3dUrl} onChange={handleChange} className="flex-1 border rounded-lg px-4 py-2 focus:outline-blue-500" />
                <label className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition font-semibold ${uploading.model3dUrl ? 'bg-gray-400' : 'bg-purple-600 hover:bg-purple-700'} text-white`}>
                  {uploading.model3dUrl ? (
                    <><svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg> Se încarcă...</>
                  ) : (
                    <>🧊 Încarcă 3D</>
                  )}
                  <input type="file" accept=".step,.stp,.iges,.igs,.stl,.obj" className="hidden" onChange={e => handleFileUpload(e, 'model3dUrl')} disabled={uploading.model3dUrl} />
                </label>
              </div>
              {form.model3dUrl && <a href={form.model3dUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-purple-600 hover:underline text-sm">🧊 Descarcă model 3D</a>}
            </div>
            <div className="md:col-span-2 flex justify-center gap-4 mt-4">
              <button type="button" onClick={resetForm} className="bg-gray-400 hover:bg-gray-500 text-white font-bold py-3 px-8 rounded-lg shadow transition">
                Anulează
              </button>
              <button type="submit" disabled={loading} className={`${editingProduct ? 'bg-orange-600 hover:bg-orange-700' : 'bg-blue-600 hover:bg-blue-700'} text-white font-bold py-3 px-10 rounded-lg shadow transition disabled:opacity-60`}>
                {loading ? "Se salvează..." : (editingProduct ? "Actualizează produs" : "Salvează produs")}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Bară acțiuni bulk */}
      {selectedProducts.size > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 flex items-center justify-between">
          <span className="text-red-700 font-semibold">
            {selectedProducts.size} produs{selectedProducts.size > 1 ? 'e' : ''} selectat{selectedProducts.size > 1 ? 'e' : ''}
          </span>
          <div className="flex gap-3">
            <button
              onClick={() => setSelectedProducts(new Set())}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-semibold transition"
            >
              Deselectează tot
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold transition disabled:opacity-50"
            >
              {bulkDeleting ? 'Se șterg...' : `🗑️ Șterge ${selectedProducts.size} produse`}
            </button>
          </div>
        </div>
      )}

      {/* Paginare */}
      <div className="bg-white rounded-xl shadow p-4 mb-4 flex items-center justify-between flex-wrap gap-4">
        {/* Căutare și filtru producător */}
        <div className="flex items-center gap-4">
          <input
            type="text"
            placeholder="Caută după nume, cod sau ID..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1); // reset la pagina 1 când caută
            }}
            className="border border-gray-300 rounded-lg px-3 py-2 w-64 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
          <select
            value={manufacturerFilter}
            onChange={(e) => {
              setManufacturerFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 font-semibold"
          >
            <option value="">Toți producătorii</option>
            {Array.from(new Set(products.map(p => p.manufacturer).filter(Boolean))).sort().map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          {(searchQuery || manufacturerFilter) && (
            <button
              onClick={() => { setSearchQuery(""); setManufacturerFilter(""); setCurrentPage(1); }}
              className="text-gray-500 hover:text-red-600 px-2 font-bold"
              title="Resetează filtrele"
            >
              ✕ Reset
            </button>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-gray-600">Afișează:</span>
          <select
            value={pageSize}
            onChange={(e) => handlePageSizeChange(Number(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span className="text-gray-600">din {filteredProducts.length} produse{(searchQuery || manufacturerFilter) && ` (filtrat din ${products.length})`}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            className="px-3 py-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition"
          >
            ⏮️
          </button>
          <button
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition"
          >
            ◀️ Înapoi
          </button>
          <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 rounded-lg">
            <span className="text-gray-600">Pagina</span>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              defaultValue={currentPage}
              key={currentPage}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const page = parseInt((e.target as HTMLInputElement).value, 10);
                  if (!isNaN(page) && page >= 1 && page <= totalPages) {
                    setCurrentPage(page);
                  } else {
                    (e.target as HTMLInputElement).value = String(currentPage);
                  }
                }
              }}
              onBlur={(e) => {
                const page = parseInt(e.target.value, 10);
                if (!isNaN(page) && page >= 1 && page <= totalPages) {
                  setCurrentPage(page);
                } else {
                  e.target.value = String(currentPage);
                }
              }}
              className="w-16 px-2 py-1 text-center font-semibold border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            <span className="text-gray-600">din {totalPages}</span>
          </div>
          <button
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-3 py-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition"
          >
            Înainte ▶️
          </button>
          <button
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
            className="px-3 py-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition"
          >
            ⏭️
          </button>
        </div>
      </div>

      {/* Tabel produse */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-blue-50">
              <tr>
                <th className="px-3 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={paginatedProducts.length > 0 && paginatedProducts.every(p => selectedProducts.has(p.id))}
                    onChange={toggleSelectAll}
                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    title="Selectează toate din pagină"
                  />
                </th>
                <th className="px-3 py-3 font-semibold text-blue-700 whitespace-nowrap">ID</th>
                <th className="px-3 py-3 font-semibold text-blue-700 min-w-[180px]">Nume</th>
                <th className="px-3 py-3 font-semibold text-blue-700 whitespace-nowrap">Cod</th>
                <th className="px-3 py-3 font-semibold text-blue-700 whitespace-nowrap">Preț</th>
                <th className="px-3 py-3 font-semibold text-blue-700 whitespace-nowrap">Preț achiz.</th>
                <th className="px-3 py-3 font-semibold text-blue-700 whitespace-nowrap">Producător</th>
                <th className="px-3 py-3 font-semibold text-blue-700 whitespace-nowrap">Stoc</th>
                <th className="px-3 py-3 font-semibold text-blue-700 whitespace-nowrap">Tip</th>
                <th className="px-3 py-3 font-semibold text-blue-700 min-w-[280px]">Acțiuni</th>
              </tr>
            </thead>
            <tbody>
              {paginatedProducts.length === 0 ? (
                <tr><td colSpan={10} className="px-4 py-8 text-center text-gray-500">Nu există produse</td></tr>
              ) : (
                paginatedProducts.map((p, i) => (
                  <tr key={p.id} className={`${i % 2 === 0 ? 'bg-white' : 'bg-blue-50/30'} ${editingProduct?.id === p.id ? 'ring-2 ring-orange-400' : ''} ${selectedProducts.has(p.id) ? 'bg-blue-100' : ''}`}>
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selectedProducts.has(p.id)}
                        onChange={() => toggleSelectProduct(p.id)}
                        className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </td>
                    <td className="px-3 py-3 text-gray-600">{p.id}</td>
                    <td className="px-3 py-3 font-medium min-w-[180px] max-w-[220px]"><div className="line-clamp-2">{p.name}</div></td>
                    <td className="px-3 py-3 text-gray-600 whitespace-nowrap">{p.productCode}</td>
                    <td className="px-3 py-3 whitespace-nowrap">{p.price} {p.currency || 'RON'}</td>
                    <td className="px-3 py-3 text-gray-600 whitespace-nowrap">{p.purchasePrice || '-'}</td>
                    <td className="px-3 py-3 whitespace-nowrap">{p.manufacturer || '-'}</td>
                    <td className="px-3 py-3 whitespace-nowrap">{p.onDemand ? <span className="text-orange-600 font-semibold">Pe comandă</span> : p.stock}</td>
                    <td className="px-3 py-3 whitespace-nowrap">{p.type || '-'}</td>
                    <td className="px-3 py-3 min-w-[280px]">
                      <div className="flex gap-2 whitespace-nowrap">
                        <Link
                          href={`/admin/variante-ro?productId=${p.id}`}
                          className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 rounded text-sm font-semibold transition"
                        >
                          📦 Variante
                        </Link>
                        <button
                          onClick={() => handleEdit(p)}
                          className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1 rounded text-sm font-semibold transition"
                        >
                          ✏️ Editează
                        </button>
                        {deleteConfirm === p.id ? (
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleDelete(p.id)}
                              className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-sm font-semibold transition"
                            >
                              Da
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="bg-gray-400 hover:bg-gray-500 text-white px-2 py-1 rounded text-sm font-semibold transition"
                            >
                              Nu
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(p.id)}
                            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm font-semibold transition"
                          >
                            🗑️ Șterge
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
          Total: {products.length} produs(e)
        </div>
      </div>

      {/* Modal confirmare ștergere în masă */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-scaleIn">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Confirmare ștergere</h3>
                  <p className="text-red-100 text-sm">Această acțiune este ireversibilă</p>
                </div>
              </div>
            </div>
            
            {/* Body */}
            <div className="px-6 py-5">
              <div className="flex items-center gap-3 p-4 bg-red-50 rounded-xl border border-red-100 mb-4">
                <span className="text-3xl">⚠️</span>
                <div>
                  <p className="font-semibold text-gray-800">
                    Ești sigur că vrei să ștergi {selectedProducts.size === 1 ? 'acest produs' : `${selectedProducts.size} produse`}?
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    Produsele vor fi șterse permanent din baza de date.
                  </p>
                </div>
              </div>
              
              <div className="text-sm text-gray-500 flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <span>Comenzile asociate nu vor fi afectate</span>
              </div>
            </div>
            
            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 flex gap-3 justify-end">
              <button
                onClick={() => setShowBulkDeleteModal(false)}
                className="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-100 transition-all duration-200"
              >
                Anulează
              </button>
              <button
                onClick={confirmBulkDelete}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-lg shadow-red-500/30 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Da, șterge {selectedProducts.size === 1 ? 'produsul' : 'produsele'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
