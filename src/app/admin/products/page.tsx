"use client";
// Tip pentru o specificație tehnică custom
type CustomSpec = { key: string; value: string };

import React, { useEffect, useState, useRef } from "react";
import Toast from "@/components/Toast";
import VariantManager from "./VariantManager";

interface Product {
  id: number;
  name: string;
  productCode: string;
  sku?: string;
  price: number;
  purchasePrice?: number;
  manufacturer?: string;
  description?: string;
  image: string;
  type: string;
  domain: string;
  currency: string;
  stock: number;
  onDemand?: boolean;
  couponCode?: string;
  discount?: number;
  discountType?: "percent" | "fixed";
  specs?: string[];
  advantages?: string[];
  pdfUrl?: string;
  deliveryTime?: string;
}

const SPEC_FIELDS: [] = [];

export default function AdminProductsPage() {
  // Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  function showToast(message: string, type: 'success' | 'error' = 'success') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  }
  const [formErr, setFormErr] = useState("");
  
  // Variant Manager state
  const [variantManagerOpen, setVariantManagerOpen] = useState(false);
  const [selectedProductForVariants, setSelectedProductForVariants] = useState<{ id: number; name: string } | null>(null);

  // Stare pentru upload PDF
  const [pdfUploading, setPdfUploading] = useState(false);
  const [pdfError, setPdfError] = useState<string|null>(null);
  const [pdfUploadingEn, setPdfUploadingEn] = useState(false);
  const [pdfErrorEn, setPdfErrorEn] = useState<string|null>(null);

  // Stare pentru upload Safety Sheet
  const [safetySheetUploading, setSafetySheetUploading] = useState(false);
  const [safetySheetError, setSafetySheetError] = useState<string|null>(null);
  const [safetySheetUploadingEn, setSafetySheetUploadingEn] = useState(false);
  const [safetySheetErrorEn, setSafetySheetErrorEn] = useState<string|null>(null);
      const [loading, setLoading] = useState(true);
    // Pentru produsul selectat la editare/ștergere
    const [deleteId, setDeleteId] = useState<number|null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [deleteError, setDeleteError] = useState<string|null>(null);
    const [products, setProducts] = useState<Product[]>([]);

    // Handler ștergere produs
    const handleDeleteProduct = async (id: number) => {
      if (!window.confirm("Sigur vrei să ștergi acest produs?")) return;
      setDeleteLoading(true); setDeleteError(null);
      try {
        const res = await fetch("/admin/api/products", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        });
        if (!res.ok) throw new Error("Eroare la ștergere produs");
        setProducts((prods) => prods.filter((p) => p.id !== id));
        showToast("Produs șters cu succes!", "success");
      } catch (err: any) {
        setDeleteError(err.message || "Eroare necunoscută");
        showToast(err.message || "Eroare la ștergere!", "error");
      } finally {
        setDeleteLoading(false);
        setDeleteId(null);
      }
    };
  const [error, setError] = useState<string | null>(null);
  const [addForm, setAddForm] = useState<{
    name: string;
    nameEn: string;
    productCode: string;
    price: string;
    listPrice: string; // <-- adăugat
    stock: string;
    onDemand: boolean;
    image: string;
    type: string;
    domain: string;
    currency: string;
    discount: string;
    discountType: string;
    manufacturer: string;
    purchasePrice: string;
    description: string;
    descriptionEn: string;
    specs: string;
    specsEn: string;
    advantages: string;
    advantagesEn: string;
    pdfUrl: string;
    pdfUrlEn: string;
    safetySheetUrl: string;
    safetySheetUrlEn: string;
    deliveryTime: string;
    deliveryTimeEn: string;
  }>({
    name: "",
    nameEn: "",
    productCode: "",
    price: "",
    listPrice: "", // <-- adăugat
    stock: "",
    onDemand: false,
    image: "",
    type: "",
    domain: "",
    currency: "RON",
    discount: "",
    discountType: "percent",
    manufacturer: "",
    purchasePrice: "",
    description: "",
    descriptionEn: "",
    specs: "",
    specsEn: "",
    advantages: "",
    advantagesEn: "",
    pdfUrl: "",
    pdfUrlEn: "",
    safetySheetUrl: "",
    safetySheetUrlEn: "",
    deliveryTime: "",
    deliveryTimeEn: "",
  });

  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState<string | null>(null);

  // CSV Import/Export state
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvResult, setCsvResult] = useState<{ added?: number; updated?: number; errors?: string[] } | null>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  // Export CSV
  const handleExportCSV = () => {
    window.open('/admin/api/products/csv', '_blank');
  };

  // Import CSV
  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvImporting(true);
    setCsvResult(null);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/admin/api/products/csv', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Eroare import CSV');
      setCsvResult(data);
      showToast(`Import CSV: ${data.added || 0} adăugate, ${data.updated || 0} actualizate`, 'success');
      // Refresh products list
      const refreshed = await fetch('/admin/api/products').then(r => r.json());
      setProducts(refreshed);
    } catch (err: any) {
      setCsvResult({ errors: [err.message] });
      showToast(err.message || 'Eroare la import', 'error');
    } finally {
      setCsvImporting(false);
      if (csvInputRef.current) csvInputRef.current.value = '';
    }
  };

  // Adaugă stare pentru editare produs
  const [editId, setEditId] = useState<number|null>(null);

  // La click pe Editează, populează formularul cu datele produsului
  const handleEditProduct = (product: Product) => {
    setEditId(product.id);
    setAddForm(f => ({
      ...f,
      name: product.name ?? '',
      nameEn: (product as any).nameEn ?? '',
      productCode: (product.productCode && product.productCode.trim() !== '')
        ? product.productCode
        : (product.sku ?? ''),
      price: product.price?.toString() ?? '',
      listPrice: (product as any).listPrice?.toString() ?? '', // <-- adăugat
      stock: product.stock?.toString() ?? '',
      onDemand: (product as any).onDemand ?? false,
      image: product.image ?? '',
      type: product.type ?? '',
      domain: product.domain ?? '',
      currency: product.currency ?? 'RON',
      discount: product.discount?.toString() ?? '',
      discountType: product.discountType ?? 'percent',
      manufacturer: product.manufacturer ?? '',
      purchasePrice: product.purchasePrice?.toString() ?? '',
      description: product.description ?? '',
      descriptionEn: (product as any).descriptionEn ?? '',
      specs: Array.isArray((product as any).specs) ? (product as any).specs.join('\n') : '',
      specsEn: Array.isArray((product as any).specsEn) ? (product as any).specsEn.join('\n') : '',
      advantages: Array.isArray((product as any).advantages) ? (product as any).advantages.join('\n') : '',
      advantagesEn: Array.isArray((product as any).advantagesEn) ? (product as any).advantagesEn.join('\n') : '',
      pdfUrl: (product as any).pdfUrl ?? '',
      pdfUrlEn: (product as any).pdfUrlEn ?? '',
      safetySheetUrl: (product as any).safetySheetUrl ?? '',
      safetySheetUrlEn: (product as any).safetySheetUrlEn ?? '',
      deliveryTime: product.deliveryTime ?? '',
      deliveryTimeEn: (product as any).deliveryTimeEn ?? '',
    }));
  };

  useEffect(() => {
    fetch("/admin/api/products")
      .then((res) => {
        if (!res.ok) throw new Error("Eroare la fetch produse: " + res.status);
        return res.json();
      })
      .then((data) => {
        setProducts(data);
        setAddLoading(false);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setAddLoading(false);
        setLoading(false);
      });
  }, []);

  const handleAddChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type, checked } = e.target as HTMLInputElement;
    if (e.target instanceof HTMLSelectElement && e.target.multiple) {
      const selected = Array.from(e.target.options).filter(o => o.selected).map(o => o.value);
      setAddForm(f => ({ ...f, [name]: selected }));
    } else {
      setAddForm(f => ({ ...f, [name]: value }));
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErr("");
    setAddLoading(true);
    setAddError(null);
    setAddSuccess(null);
    // Validare
    if (!addForm.name.trim()) {
      setFormErr("Completează numele produsului!");
      setAddLoading(false);
      return;
    }
    if (!addForm.productCode.trim()) {
      setFormErr("Completează codul produsului!");
      setAddLoading(false);
      return;
    }
    if (!addForm.price || Number(addForm.price) <= 0) {
      setFormErr("Completează prețul de vânzare!");
      setAddLoading(false);
      return;
    }
    try {
      const body = {
        name: addForm.name,
        nameEn: addForm.nameEn || undefined,
        productCode: addForm.productCode,
        price: Number(addForm.price),
        listPrice: addForm.listPrice ? Number(addForm.listPrice) : undefined, // <-- adăugat
        stock: Number(addForm.stock),
        onDemand: addForm.onDemand || false,
        image: addForm.image,
        pdfUrl: addForm.pdfUrl,
        pdfUrlEn: addForm.pdfUrlEn || undefined,
        safetySheetUrl: addForm.safetySheetUrl,
        safetySheetUrlEn: addForm.safetySheetUrlEn || undefined,
        type: addForm.type,
        domain: addForm.domain,
        discount: addForm.discount ? Number(addForm.discount) : undefined,
        discountType: addForm.discount ? addForm.discountType : undefined,
        manufacturer: addForm.manufacturer || undefined,
        purchasePrice: addForm.purchasePrice ? Number(addForm.purchasePrice) : undefined,
        description: addForm.description,
        descriptionEn: addForm.descriptionEn || undefined,
        specs: addForm.specs.trim() ? addForm.specs.split(/\r?\n/).map(s => s.trim()).filter(Boolean) : [],
        specsEn: addForm.specsEn.trim() ? addForm.specsEn.split(/\r?\n/).map(s => s.trim()).filter(Boolean) : [],
        advantages: addForm.advantages.trim() ? addForm.advantages.split(/\r?\n/).map(s => s.trim()).filter(Boolean) : [],
        advantagesEn: addForm.advantagesEn.trim() ? addForm.advantagesEn.split(/\r?\n/).map(s => s.trim()).filter(Boolean) : [],
        deliveryTime: addForm.deliveryTime || undefined,
        deliveryTimeEn: addForm.deliveryTimeEn || undefined,
      };
      let res;
      if (editId) {
        // Update produs
        res = await fetch("/admin/api/products", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...body, id: editId }),
        });
      } else {
        // Adaugă produs nou
        res = await fetch("/admin/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }
      if (!res.ok) throw new Error(editId ? "Eroare la actualizare produs" : "Eroare la adăugare produs");
      showToast(editId ? "Produs actualizat cu succes!" : "Produs adăugat cu succes!", "success");
      setAddSuccess(editId ? "Produs actualizat cu succes!" : "Produs adăugat cu succes!");
      setAddForm({
        name: "",
        nameEn: "",
        productCode: "",
        price: "",
        listPrice: "", // <-- adăugat
        stock: "",
        onDemand: false,
        image: "",
        type: "",
        domain: "",
        currency: "RON",
        discount: "",
        discountType: "percent",
        manufacturer: "",
        purchasePrice: "",
        description: "",
        descriptionEn: "",
        specs: "",
        specsEn: "",
        advantages: "",
        advantagesEn: "",
        pdfUrl: "",
        pdfUrlEn: "",
        safetySheetUrl: "",
        safetySheetUrlEn: "",
        deliveryTime: "",
        deliveryTimeEn: "",
      });
      setEditId(null);
      // Reîncarcă lista produse și forțează refresh vizual
      const refreshed = await fetch("/admin/api/products").then((res) => res.json());
      setProducts(refreshed);
      // Forțează reload pagină pentru a actualiza datele și în shop
      if (typeof window !== "undefined") {
        window.location.reload();
      }
    } catch (err: any) {
      setAddError(err.message || "Eroare necunoscută");
      showToast(err.message || "Eroare la salvare!", "error");
    } finally {
      setAddLoading(false);
    }
  };

  if (loading) return <div>Se încarcă produsele...</div>;
  if (error) return <div style={{ color: "red" }}>Eroare: {error}</div>;

  return (
    <div>
      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} />}
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg p-8 mt-10">
        <h2 className="text-2xl font-bold mb-6 text-blue-700 text-center">{editId ? 'Editează produs' : 'Adaugă produs nou'}</h2>
        <form onSubmit={handleAddProduct} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Nume produs */}
        <div>
          <label className="block font-semibold mb-1">Nume produs</label>
          <input name="name" type="text" required placeholder="Nume produs" value={addForm.name ?? ''} onChange={handleAddChange} className="w-full border rounded-lg px-4 py-2 focus:outline-blue-500" />
        </div>
        {/* Nume produs (EN) */}
        <div>
          <label className="block font-semibold mb-1">Nume produs (EN)</label>
          <input name="nameEn" type="text" placeholder="Product name (English)" value={addForm.nameEn ?? ''} onChange={handleAddChange} className="w-full border rounded-lg px-4 py-2 focus:outline-blue-500" />
          <p className="text-xs text-gray-500 mt-1">Opțional - pentru traducerea în engleză</p>
        </div>
        {/* Cod produs */}
        <div>
          <label className="block font-semibold mb-1">Cod produs</label>
          <input name="productCode" type="text" required placeholder="Cod produs" value={addForm.productCode ?? ''} onChange={handleAddChange} className="w-full border rounded-lg px-4 py-2 focus:outline-blue-500" />
        </div>
        {/* Preț vânzare */}
        <div>
          <label className="block font-semibold mb-1">Preț vânzare</label>
          <input name="price" type="number" required min="0" placeholder="Preț vânzare" value={addForm.price ?? ''} onChange={handleAddChange} className="w-full border rounded-lg px-4 py-2 focus:outline-blue-500" />
        </div>
        {/* Descriere */}
        <div>
          <label className="block font-semibold mb-1">Descriere</label>
          <textarea name="description" required placeholder="Descriere scurtă a produsului" value={addForm.description ?? ''} onChange={handleAddChange} className="w-full border rounded-lg px-4 py-2 focus:outline-blue-500" />
          <p className="text-xs text-gray-500 mt-1">Scrie câteva detalii relevante despre produs (ex: funcționalitate, avantaje, aplicații).</p>
        </div>
        {/* Descriere (EN) */}
        <div>
          <label className="block font-semibold mb-1">Descriere (EN)</label>
          <textarea name="descriptionEn" placeholder="Product description (English)" value={addForm.descriptionEn ?? ''} onChange={handleAddChange} className="w-full border rounded-lg px-4 py-2 focus:outline-blue-500" />
          <p className="text-xs text-gray-500 mt-1">Opțional - pentru traducerea în engleză</p>
        </div>
        {/* Preț de intrare */}
        <div>
          <label className="block font-semibold mb-1">Preț de intrare</label>
          <input name="purchasePrice" type="number" required min="0" placeholder="Ex: 800" value={addForm.purchasePrice ?? ''} onChange={handleAddChange} className="w-full border rounded-lg px-4 py-2 focus:outline-blue-500 focus:ring-2 focus:ring-blue-400 transition" />
        </div>
        {/* Producător */}
        <div>
          <label className="block font-semibold mb-1">Producător</label>
          <input name="manufacturer" type="text" placeholder="Ex: Siemens" value={addForm.manufacturer ?? ''} onChange={handleAddChange} className="w-full border rounded-lg px-4 py-2 focus:outline-blue-500" />
        </div>
        {/* Monedă */}
        <div>
          <label className="block font-semibold mt-2 mb-1">Monedă</label>
          <select name="currency" value={addForm.currency ?? 'RON'} onChange={handleAddChange} className="w-full border rounded-lg px-2 py-2 focus:outline-blue-500 focus:ring-2 focus:ring-blue-400 transition bg-blue-50 font-semibold">
            <option value="RON">RON</option>
            <option value="EURO">EURO</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">Alege moneda (RON/EURO) și introdu suma la care vrei să vinzi produsul.</p>
        </div>
        {/* Tip produs */}
        <div>
          <label className="block font-semibold mb-1">Tip produs</label>
          <select name="type" value={addForm.type ?? ''} onChange={handleAddChange} className="w-full border rounded-lg px-2 py-2 focus:outline-blue-500 focus:ring-2 focus:ring-blue-400 transition bg-blue-50 font-semibold">
            <option value="">Alege tipul</option>
            <option value="Protectii">Protecții</option>
            <option value="Electric">Electric</option>
            <option value="Mecanic">Mecanic</option>
            <option value="Altele">Altele</option>
          </select>
        </div>
        {/* Domeniu */}
        <div>
          <label className="block font-semibold mb-1">Domeniu</label>
          <select name="domain" value={addForm.domain ?? ''} onChange={handleAddChange} className="w-full border rounded-lg px-2 py-2 focus:outline-blue-500 focus:ring-2 focus:ring-blue-400 transition bg-blue-50 font-semibold">
            <option value="">Alege domeniul</option>
            <option value="Echipamente electrice">Echipamente electrice</option>
            <option value="Industrial">Industrial</option>
            <option value="Rezidential">Rezidențial</option>
            <option value="Altele">Altele</option>
          </select>
        </div>
        {/* Stoc */}
        <div>
          <label className="block font-semibold mb-1">Stoc</label>
          <input name="stock" type="number" required min="0" placeholder="Ex: 10" value={addForm.stock ?? ''} onChange={handleAddChange} className="w-full border rounded-lg px-4 py-2 focus:outline-blue-500 focus:ring-2 focus:ring-blue-400 transition" />
        </div>
        {/* Produs la comandă */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="onDemand"
            name="onDemand"
            checked={addForm.onDemand}
            onChange={(e) => setAddForm(f => ({ ...f, onDemand: e.target.checked }))}
            className="w-5 h-5 text-orange-500 rounded focus:ring-orange-400"
          />
          <label htmlFor="onDemand" className="font-semibold cursor-pointer">
            <span className="text-orange-600">Produs la comandă</span>
          </label>
          <span className="text-xs text-gray-500">(se aduce doar la cerere)</span>
        </div>
        {/* Fișă tehnică PDF */}
        <div>
          <label className="block font-semibold mb-1">Fișă tehnică (PDF)</label>
          <div className="border rounded-lg px-4 py-2 bg-white flex flex-col gap-2">
                      <input
                        name="pdf"
                        type="file"
                        accept="application/pdf"
                        onChange={async e => {
                          setPdfError(null);
                          const file = e.target.files && e.target.files[0];
                          if (file) {
                            setPdfUploading(true);
                            const formData = new FormData();
                            formData.append("file", file);
                            try {
                              const res = await fetch("/api/products/upload-pdf", {
                                method: "POST",
                                body: formData
                              });
                              if (res.ok) {
                                const data = await res.json();
                                setAddForm(f => ({ ...f, pdfUrl: data.url }));
                              } else {
                                setPdfError("Eroare la upload PDF!");
                              }
                            } catch (err: any) {
                              setPdfError("Eroare la upload PDF!");
                            } finally {
                              setPdfUploading(false);
                            }
                          }
                        }}
                        className="w-full"
                        disabled={pdfUploading}
                      />
                      {pdfUploading && <span className="text-blue-600 text-xs">Se încarcă PDF-ul...</span>}
                      {pdfError && <span className="text-red-600 text-xs">{pdfError}</span>}
                      {addForm.pdfUrl && (
                        <a href={addForm.pdfUrl} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline text-xs mt-2">Descarcă fișa tehnică (PDF)</a>
                      )}
                    </div>
                  </div>
                  {/* Fișă de securitate (SDS/MSDS) */}
                  <div className="mt-4">
                    <label className="block font-semibold mb-1">Fișă de securitate (SDS/MSDS)</label>
                    <div className="border rounded-lg px-4 py-2 bg-white flex flex-col gap-2">
                      <input
                        name="safetysheet"
                        type="file"
                        accept="application/pdf"
                        onChange={async e => {
                          setSafetySheetError(null);
                          const file = e.target.files && e.target.files[0];
                          if (file) {
                            setSafetySheetUploading(true);
                            const formData = new FormData();
                            formData.append("file", file);
                            try {
                              const res = await fetch("/api/products/upload-pdf", {
                                method: "POST",
                                body: formData
                              });
                              if (res.ok) {
                                const data = await res.json();
                                setAddForm(f => ({ ...f, safetySheetUrl: data.url }));
                              } else {
                                setSafetySheetError("Eroare la upload fișă de securitate!");
                              }
                            } catch (err: any) {
                              setSafetySheetError("Eroare la upload fișă de securitate!");
                            } finally {
                              setSafetySheetUploading(false);
                            }
                          }
                        }}
                        className="w-full"
                        disabled={safetySheetUploading}
                      />
                      {safetySheetUploading && <span className="text-blue-600 text-xs">Se încarcă fișa de securitate...</span>}
                      {safetySheetError && <span className="text-red-600 text-xs">{safetySheetError}</span>}
                      {addForm.safetySheetUrl && (
                        <a href={addForm.safetySheetUrl} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline text-xs mt-2">Descarcă fișa de securitate</a>
                      )}
                    </div>
                  </div>
                  {/* 🇬🇧 Fișă tehnică (PDF) - Engleză */}
                  <div className="mt-4">
                    <label className="block font-semibold mb-1">🇬🇧 Fișă tehnică (PDF) - Engleză</label>
                    <div className="border rounded-lg px-4 py-2 bg-white flex flex-col gap-2">
                      <input
                        name="pdfEn"
                        type="file"
                        accept="application/pdf"
                        onChange={async e => {
                          setPdfErrorEn(null);
                          const file = e.target.files && e.target.files[0];
                          if (file) {
                            setPdfUploadingEn(true);
                            const formData = new FormData();
                            formData.append("file", file);
                            try {
                              const res = await fetch("/api/products/upload-pdf", {
                                method: "POST",
                                body: formData
                              });
                              if (res.ok) {
                                const data = await res.json();
                                setAddForm(f => ({ ...f, pdfUrlEn: data.url }));
                              } else {
                                setPdfErrorEn("Error uploading PDF!");
                              }
                            } catch (err: any) {
                              setPdfErrorEn("Error uploading PDF!");
                            } finally {
                              setPdfUploadingEn(false);
                            }
                          }
                        }}
                        className="w-full"
                        disabled={pdfUploadingEn}
                      />
                      {pdfUploadingEn && <span className="text-blue-600 text-xs">Uploading PDF (EN)...</span>}
                      {pdfErrorEn && <span className="text-red-600 text-xs">{pdfErrorEn}</span>}
                      {addForm.pdfUrlEn && (
                        <a href={addForm.pdfUrlEn} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline text-xs mt-2">Download technical sheet (EN)</a>
                      )}
                    </div>
                  </div>
                  {/* 🇬🇧 Fișă de securitate - Engleză */}
                  <div className="mt-4">
                    <label className="block font-semibold mb-1">🇬🇧 Fișă de securitate (EN)</label>
                    <div className="border rounded-lg px-4 py-2 bg-white flex flex-col gap-2">
                      <input
                        name="safetysheetEn"
                        type="file"
                        accept="application/pdf"
                        onChange={async e => {
                          setSafetySheetErrorEn(null);
                          const file = e.target.files && e.target.files[0];
                          if (file) {
                            setSafetySheetUploadingEn(true);
                            const formData = new FormData();
                            formData.append("file", file);
                            try {
                              const res = await fetch("/api/products/upload-pdf", {
                                method: "POST",
                                body: formData
                              });
                              if (res.ok) {
                                const data = await res.json();
                                setAddForm(f => ({ ...f, safetySheetUrlEn: data.url }));
                              } else {
                                setSafetySheetErrorEn("Error uploading safety sheet!");
                              }
                            } catch (err: any) {
                              setSafetySheetErrorEn("Error uploading safety sheet!");
                            } finally {
                              setSafetySheetUploadingEn(false);
                            }
                          }
                        }}
                        className="w-full"
                        disabled={safetySheetUploadingEn}
                      />
                      {safetySheetUploadingEn && <span className="text-blue-600 text-xs">Uploading safety sheet (EN)...</span>}
                      {safetySheetErrorEn && <span className="text-red-600 text-xs">{safetySheetErrorEn}</span>}
                      {addForm.safetySheetUrlEn && (
                        <a href={addForm.safetySheetUrlEn} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline text-xs mt-2">Download safety sheet (EN)</a>
                      )}
                    </div>
                  </div>
        {/* Imagine produs */}
        <div>
          <label className="block font-semibold mb-1">Imagine produs</label>
          <div className="border rounded-lg px-4 py-2 bg-white flex flex-col gap-2">
            <input
              name="image"
              type="file"
              accept="image/*"
              onChange={async e => {
                const file = e.target.files && e.target.files[0];
                if (file) {
                  const formData = new FormData();
                  formData.append("file", file);
                  const res = await fetch("/api/upload", {
                    method: "POST",
                    body: formData
                  });
                  if (res.ok) {
                    const data = await res.json();
                    setAddForm(f => ({ ...f, image: data.url }));
                  } else {
                    setAddForm(f => ({ ...f, image: "" }));
                    alert("Eroare la upload imagine!");
                  }
                }
              }}
              className="w-full"
            />
            {addForm.image && (
              <img src={addForm.image} alt="Preview" className="mt-2 rounded-lg h-32 object-contain border" />
            )}
          </div>
        </div>
        {/* Specificații tehnice */}
        <div>
          <label className="block font-semibold mb-1">Specificații tehnice</label>
          <textarea
            name="specs"
            placeholder="Fiecare specificație pe o linie nouă"
            value={addForm.specs}
            onChange={handleAddChange}
            className="w-full border rounded-lg px-4 py-2 focus:outline-blue-500"
            rows={3}
          />
          <p className="text-xs text-gray-500 mt-1">Ex: Putere, tensiune, dimensiuni, etc. (o specificație pe linie)</p>
        </div>
        {/* Specificații tehnice (EN) */}
        <div>
          <label className="block font-semibold mb-1">Specificații tehnice (EN)</label>
          <textarea
            name="specsEn"
            placeholder="Each specification on a new line (English)"
            value={addForm.specsEn}
            onChange={handleAddChange}
            className="w-full border rounded-lg px-4 py-2 focus:outline-blue-500"
            rows={3}
          />
          <p className="text-xs text-gray-500 mt-1">Opțional - traducerea în engleză</p>
        </div>
        {/* Avantaje */}
        <div>
          <label className="block font-semibold mb-1">Avantaje</label>
          <textarea
            name="advantages"
            placeholder="Fiecare avantaj pe o linie nouă"
            value={addForm.advantages}
            onChange={handleAddChange}
            className="w-full border rounded-lg px-4 py-2 focus:outline-blue-500"
            rows={3}
          />
          <p className="text-xs text-gray-500 mt-1">Ex: Consum redus, fiabilitate, garanție, etc. (un avantaj pe linie)</p>
        </div>
        {/* Avantaje (EN) */}
        <div>
          <label className="block font-semibold mb-1">Avantaje (EN)</label>
          <textarea
            name="advantagesEn"
            placeholder="Each advantage on a new line (English)"
            value={addForm.advantagesEn}
            onChange={handleAddChange}
            className="w-full border rounded-lg px-4 py-2 focus:outline-blue-500"
            rows={3}
          />
          <p className="text-xs text-gray-500 mt-1">Opțional - traducerea în engleză</p>
        </div>
        {/* Termen de livrare */}
        <div>
          <label className="block font-semibold mb-1">Termen de livrare</label>
          <input name="deliveryTime" type="text" placeholder="Ex: 2-3 zile" value={addForm.deliveryTime ?? ''} onChange={handleAddChange} className="w-full border rounded-lg px-4 py-2 focus:outline-blue-500" />
          <p className="text-xs text-gray-500 mt-1">Introduceți termenul estimat de livrare (ex: 24h, 2-3 zile, 1 săptămână).</p>
        </div>
        {/* Termen de livrare (EN) */}
        <div>
          <label className="block font-semibold mb-1">Termen de livrare (EN)</label>
          <input name="deliveryTimeEn" type="text" placeholder="Ex: 2-3 days" value={addForm.deliveryTimeEn ?? ''} onChange={handleAddChange} className="w-full border rounded-lg px-4 py-2 focus:outline-blue-500" />
          <p className="text-xs text-gray-500 mt-1">Opțional - traducerea în engleză</p>
        </div>
        {/* Buton submit */}
        <button
          type="submit"
          className={`w-full font-bold py-3 rounded-lg shadow transition ${editId ? 'bg-green-700 hover:bg-green-800' : 'bg-blue-700 hover:bg-blue-800'} text-white`}
          disabled={addLoading}
        >
          {addLoading
            ? (editId ? 'Se salvează...' : 'Se adaugă...')
            : (editId ? 'Salvează modificări' : 'Adaugă produs')}
        </button>
        {addError && <span className="text-red-600 block text-center mt-2">{addError}</span>}
        {addSuccess && <span className="text-green-600 block text-center mt-2">{addSuccess}</span>}
        </form>
      </div>
      {/* CSV Import / Export */}
      <div className="flex gap-4 items-center mt-8 mb-2 justify-end max-w-4xl mx-auto">
        <button
          onClick={handleExportCSV}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold shadow flex items-center gap-2"
          type="button"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" /></svg>
          Export CSV
        </button>
        <label className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold shadow cursor-pointer flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2m-4-10l-4-4m0 0L8 6m4-4v12" /></svg>
          {csvImporting ? 'Se importă...' : 'Import CSV'}
          <input
            type="file"
            accept=".csv,text/csv"
            ref={csvInputRef}
            className="hidden"
            onChange={handleImportCSV}
            disabled={csvImporting}
          />
        </label>
        {csvResult && (
          <div className="ml-4 text-sm">
            {csvResult.added !== undefined && <span className="text-green-700">+{csvResult.added} adăugate</span>}
            {csvResult.updated !== undefined && <span className="text-blue-700 ml-2">{csvResult.updated} actualizate</span>}
            {csvResult.errors && csvResult.errors.length > 0 && (
              <span className="text-red-600 ml-2" title={csvResult.errors.join('\n')}>{csvResult.errors.length} erori</span>
            )}
          </div>
        )}
      </div>
      {/* Tabel produse */}
      <div className="overflow-x-auto mt-10">
        <table className="min-w-[900px] w-full text-sm bg-white rounded-2xl shadow-xl border border-gray-200">
          <thead className="sticky top-0 z-10">
            <tr className="bg-gradient-to-r from-blue-50 to-blue-100 text-blue-900 font-bold text-[15px]">
              <th className="px-3 py-3 rounded-tl-2xl border-b border-gray-200">ID</th>
              <th className="px-3 py-3 border-b border-gray-200 min-w-[220px]">Nume</th>
              <th className="px-3 py-3 border-b border-gray-200 min-w-[120px]">Cod</th>
              <th className="px-3 py-3 border-b border-gray-200">Preț vânzare</th>
              {/* <th className="px-3 py-3 border-b border-gray-200 text-green-700">Preț cu discount</th> */}
              <th className="px-3 py-3 border-b border-gray-200">Monedă</th>
              <th className="px-3 py-3 border-b border-gray-200">Preț achiziție</th>
              <th className="px-3 py-3 border-b border-gray-200">Producător</th>
              <th className="px-3 py-3 border-b border-gray-200">Stoc</th>
              <th className="px-3 py-3 border-b border-gray-200">Imagine</th>
              <th className="px-3 py-3 border-b border-gray-200">Tip</th>
              <th className="px-3 py-3 border-b border-gray-200">Domeniu</th>
              <th className="px-3 py-3 border-b border-gray-200 min-w-[440px]">Descriere</th>
              <th className="px-3 py-3 border-b border-gray-200">Cod cupon</th>
              <th className="px-3 py-3 border-b border-gray-200">Reducere</th>
              <th className="px-3 py-3 border-b border-gray-200 text-green-700">Preț cu discount</th>
              <th className="px-3 py-3 border-b border-gray-200 min-w-[120px]">Fișă tehnică</th>
              <th className="px-3 py-3 border-b border-gray-200 min-w-[220px]">Specificații tehnice</th>
              <th className="px-3 py-3 border-b border-gray-200 min-w-[220px]">Avantaje</th>
              <th className="px-3 py-3 border-b border-gray-200">Termen livrare</th>
              <th className="px-3 py-3 rounded-tr-2xl border-b border-gray-200">Acțiuni</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p, idx) => (
              <tr
                key={p.id}
                className={`border-b border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-blue-50'} hover:bg-blue-100 transition-colors duration-150`}
                style={{ fontSize: 15 }}
              >
                <td className="px-3 py-2 font-mono text-gray-500">{p.id}</td>
                <td className="px-3 py-2 font-semibold text-gray-900 min-w-[220px]">{p.name}</td>
                <td className="px-3 py-2 min-w-[120px]">{p.productCode || p.sku || '-'}</td>
                <td className="px-3 py-2">{p.price}</td>
                {/* <td className="px-3 py-2 font-bold text-green-700">
                  {p.discount && p.discountType === "percent"
                    ? (p.price - (p.price * Number(p.discount) / 100)).toFixed(2)
                    : p.discount && p.discountType === "fixed"
                      ? (p.price - Number(p.discount)).toFixed(2)
                      : p.price}
                </td> */}
                <td className="px-3 py-2">{p.currency || "RON"}</td>
                <td className="px-3 py-2">{p.purchasePrice ?? '-'}</td>
                <td className="px-3 py-2">{p.manufacturer ?? '-'}</td>
                <td className="px-3 py-2">{p.stock}</td>
                <td className="px-3 py-2">
                  {p.image ? (
                    <img
                      src={p.image}
                      alt={p.name}
                      className="w-16 h-10 object-cover rounded border bg-white shadow"
                      onError={(e) => (e.currentTarget.style.display = "none")}
                    />
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="px-3 py-2">{p.type || '-'}</td>
                <td className="px-3 py-2">{p.domain || '-'}</td>
                <td className="px-3 py-2 min-w-[440px] whitespace-pre-line break-words" title={p.description ?? ''}>{p.description ?? '-'}</td>
                {/* ...existing code... */}
                {/* ...existing code... */}
                <td className="px-3 py-2">{p.couponCode ?? '-'}</td>
                <td className="px-3 py-2">
                  {p.discount
                    ? p.discountType === "percent"
                      ? `${Number(p.discount) >= 1 ? Number(p.discount) : Number(p.discount) * 100}%`
                      : `${p.discount} RON`
                    : "-"}
                </td>
                {/* Preț cu discount duplicat eliminat din acțiuni */}
                <td className="px-3 py-2 font-bold text-green-700">
                  {p.discount && p.discountType === "percent"
                    ? (p.price - (p.price * (Number(p.discount) >= 1 ? Number(p.discount) : Number(p.discount) * 100) / 100)).toFixed(2)
                    : p.discount && p.discountType === "fixed"
                      ? (p.price - Number(p.discount)).toFixed(2)
                      : p.price}
                </td>
                {/* Fișă tehnică PDF */}
                <td className="px-3 py-2 text-center">
                  {p.pdfUrl ? (
                    <a href={p.pdfUrl} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline text-xs">Descarcă PDF</a>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="px-3 py-2 align-top whitespace-pre-line">
                  {Array.isArray((p as any).specs) && (p as any).specs.length > 0 ? (
                    <ul className="list-disc pl-4 text-xs text-gray-700">
                      {(p as any).specs.map((s: string, i: number) => (
                        <li key={i} className="break-words whitespace-pre-line">{s}</li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="px-3 py-2 align-top whitespace-pre-line">
                  {Array.isArray((p as any).advantages) && (p as any).advantages.length > 0 ? (
                    <ul className="list-disc pl-4 text-xs text-gray-700">
                      {(p as any).advantages.map((a: string, i: number) => (
                        <li key={i} className="break-words whitespace-pre-line">{a}</li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="px-3 py-2 font-semibold text-blue-700">{p.deliveryTime ?? '-'}</td>
                <td className="px-3 py-2 flex gap-2 min-w-[200px] flex-wrap">
                  <button
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs focus:outline focus:ring-2 focus:ring-blue-400 shadow"
                    aria-label={`Editează produsul ${p.name}`}
                    tabIndex={0}
                    onClick={() => handleEditProduct(p)}
                  >
                    <span className="sr-only">Editează</span>
                    <svg className="inline w-4 h-4 mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6-6m2 2l-6 6m-2 2h6" /></svg>
                    Editează
                  </button>
                  <button
                    className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-xs focus:outline focus:ring-2 focus:ring-purple-400 shadow"
                    aria-label={`Variante pentru ${p.name}`}
                    tabIndex={0}
                    onClick={() => {
                      setSelectedProductForVariants({ id: p.id, name: p.name });
                      setVariantManagerOpen(true);
                    }}
                  >
                    <svg className="inline w-4 h-4 mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
                    Variante
                  </button>
                  <button
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs focus:outline focus:ring-2 focus:ring-red-400 shadow"
                    aria-label={`Șterge produsul ${p.name}`}
                    tabIndex={0}
                    onClick={() => handleDeleteProduct(p.id)}
                    disabled={deleteLoading && deleteId === p.id}
                  >
                    <span className="sr-only">Șterge</span>
                    <svg className="inline w-4 h-4 mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    {deleteLoading && deleteId === p.id ? 'Ștergere...' : 'Șterge'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Variant Manager Modal */}
      {variantManagerOpen && selectedProductForVariants && (
        <VariantManager
          productId={selectedProductForVariants.id}
          productName={selectedProductForVariants.name}
          onClose={() => {
            setVariantManagerOpen(false);
            setSelectedProductForVariants(null);
          }}
        />
      )}
    </div>
  );
}
