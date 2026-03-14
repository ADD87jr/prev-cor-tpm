"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { jsPDF } from "jspdf";

// Tipuri - exportate pentru reutilizare
export interface ConfigOption {
  id: number;
  name: string;
  nameEn?: string;
  description?: string;
  sku?: string;
  price: number;
  image?: string;
  specs?: Record<string, string>;
  isDefault?: boolean;
  maxQuantity?: number;
}

export interface ConfigCategory {
  id: number;
  name: string;
  nameEn?: string;
  icon?: string;
  options: ConfigOption[];
}

export interface ConfigProduct {
  id: number;
  brandName: string;
  brandLogo?: string;
  name: string;
  sku: string;
  description?: string;
  image?: string;
  basePrice: number;
  currency: string;
  categories: ConfigCategory[];
}

interface SelectedOption {
  categoryId: number;
  optionId: number;
  quantity: number;
}

interface PLCConfiguratorProps {
  product: ConfigProduct;
  language?: "ro" | "en";
  onAddToCart?: (config: {
    productId: number;
    productName: string;
    selectedOptions: SelectedOption[];
    totalPrice: number;
    currency: string;
  }) => void;
}

const categoryIcons: Record<string, string> = {
  PLC: "🔧",
  HMI: "🖥️",
  Communication: "📡",
  Comunicație: "📡",
  "I/O": "🔌",
};

const translations = {
  ro: {
    configure: "Configurează",
    basePrice: "Preț bază",
    selectedOptions: "Opțiuni selectate",
    totalPrice: "Preț total",
    addToCart: "Adaugă în coș",
    saveConfig: "Salvează configurația",
    loadConfig: "Încarcă configurația",
    noOptions: "Fără opțiuni suplimentare",
    included: "Inclus",
    select: "Selectează",
    selected: "Selectat",
    quantity: "Cantitate",
    specs: "Specificații",
    summary: "Sumar configurație",
    requestQuote: "Cere ofertă",
    exportPdf: "Descarcă PDF",
    configSaved: "Configurația a fost salvată!",
    configLoaded: "Configurația a fost încărcată!",
    noSavedConfig: "Nu există configurație salvată",
    // Modal cerere ofertă
    quoteModalTitle: "Cerere ofertă configurație",
    yourName: "Nume complet",
    yourEmail: "Email",
    yourPhone: "Telefon",
    yourCompany: "Companie (opțional)",
    yourMessage: "Mesaj suplimentar",
    sendRequest: "Trimite cererea",
    sending: "Se trimite...",
    requestSent: "Cererea a fost trimisă cu succes!",
    close: "Închide",
  },
  en: {
    configure: "Configure",
    basePrice: "Base price",
    selectedOptions: "Selected options",
    totalPrice: "Total price",
    addToCart: "Add to cart",
    saveConfig: "Save configuration",
    loadConfig: "Load configuration",
    noOptions: "No additional options",
    included: "Included",
    select: "Select",
    selected: "Selected",
    quantity: "Quantity",
    specs: "Specifications",
    summary: "Configuration summary",
    requestQuote: "Request quote",
    exportPdf: "Download PDF",
    configSaved: "Configuration saved!",
    configLoaded: "Configuration loaded!",
    noSavedConfig: "No saved configuration found",
    // Modal cerere ofertă
    quoteModalTitle: "Configuration quote request",
    yourName: "Full name",
    yourEmail: "Email",
    yourPhone: "Phone",
    yourCompany: "Company (optional)",
    yourMessage: "Additional message",
    sendRequest: "Send request",
    sending: "Sending...",
    requestSent: "Request sent successfully!",
    close: "Close",
  },
};

export default function PLCConfigurator({
  product,
  language = "ro",
  onAddToCart,
}: PLCConfiguratorProps) {
  const t = translations[language];
  const [activeTab, setActiveTab] = useState(0);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveConfigName, setSaveConfigName] = useState("");
  const [quoteForm, setQuoteForm] = useState({ name: "", email: "", phone: "", company: "", message: "" });
  const [sending, setSending] = useState(false);
  const [quoteSent, setQuoteSent] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<SelectedOption[]>(() => {
    // Inițializează cu opțiunile implicite
    const defaults: SelectedOption[] = [];
    product.categories.forEach((cat) => {
      cat.options.forEach((opt) => {
        if (opt.isDefault) {
          defaults.push({
            categoryId: cat.id,
            optionId: opt.id,
            quantity: 1,
          });
        }
      });
    });
    return defaults;
  });

  // Calculează prețul total
  const totalPrice = useMemo(() => {
    let total = product.basePrice;
    selectedOptions.forEach((sel) => {
      const category = product.categories.find((c) => c.id === sel.categoryId);
      const option = category?.options.find((o) => o.id === sel.optionId);
      if (option && !option.isDefault) {
        total += option.price * sel.quantity;
      }
    });
    return total;
  }, [product, selectedOptions]);

  // Toggle opțiune
  const toggleOption = (categoryId: number, optionId: number) => {
    setSelectedOptions((prev) => {
      const exists = prev.find(
        (s) => s.categoryId === categoryId && s.optionId === optionId
      );
      if (exists) {
        // Dacă e default, nu poate fi deselectat
        const category = product.categories.find((c) => c.id === categoryId);
        const option = category?.options.find((o) => o.id === optionId);
        if (option?.isDefault) return prev;
        return prev.filter(
          (s) => !(s.categoryId === categoryId && s.optionId === optionId)
        );
      } else {
        return [...prev, { categoryId, optionId, quantity: 1 }];
      }
    });
  };

  // Schimbă cantitatea
  const updateQuantity = (
    categoryId: number,
    optionId: number,
    quantity: number
  ) => {
    setSelectedOptions((prev) =>
      prev.map((s) =>
        s.categoryId === categoryId && s.optionId === optionId
          ? { ...s, quantity: Math.max(1, quantity) }
          : s
      )
    );
  };

  // Este opțiunea selectată?
  const isSelected = (categoryId: number, optionId: number) =>
    selectedOptions.some(
      (s) => s.categoryId === categoryId && s.optionId === optionId
    );

  // Obține opțiunile selectate cu detalii
  const getSelectedWithDetails = () => {
    return selectedOptions.map((sel) => {
      const category = product.categories.find((c) => c.id === sel.categoryId);
      const option = category?.options.find((o) => o.id === sel.optionId);
      return {
        ...sel,
        categoryName: category?.name || "",
        optionName: option?.name || "",
        optionSku: option?.sku || "",
        price: option?.price || 0,
        isDefault: option?.isDefault || false,
      };
    });
  };

  const handleAddToCart = () => {
    if (onAddToCart) {
      onAddToCart({
        productId: product.id,
        productName: product.name,
        selectedOptions,
        totalPrice,
        currency: product.currency,
      });
    }
  };

  // Salvare configurație în localStorage
  const handleSaveConfig = () => {
    setSaveConfigName(`Configurație ${product.name}`);
    setShowSaveModal(true);
  };

  const confirmSaveConfig = () => {
    const configData = {
      name: saveConfigName || `Configurație ${product.name}`,
      productId: product.id,
      productSku: product.sku,
      productName: product.name,
      brandName: product.brandName,
      basePrice: product.basePrice,
      currency: product.currency,
      selectedOptions,
      totalPrice,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(`plc-config-${product.sku}-${Date.now()}`, JSON.stringify(configData));
    setShowSaveModal(false);
    setNotification(t.configSaved);
    setTimeout(() => setNotification(null), 3000);
  };

  // Încărcare configurație din localStorage (ultima salvată pentru acest produs)
  const handleLoadConfig = () => {
    // Căutăm toate configurațiile pentru acest produs
    const configs: { key: string; data: any; savedAt: Date }[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(`plc-config-${product.sku}`)) {
        try {
          const data = JSON.parse(localStorage.getItem(key) || "{}");
          if (data.selectedOptions) {
            configs.push({
              key,
              data,
              savedAt: new Date(data.savedAt || 0),
            });
          }
        } catch (e) {
          // Skip invalid entries
        }
      }
    }
    
    if (configs.length === 0) {
      setNotification(t.noSavedConfig);
      setTimeout(() => setNotification(null), 3000);
      return;
    }
    
    // Sortăm și luăm ultima configurație
    configs.sort((a, b) => b.savedAt.getTime() - a.savedAt.getTime());
    const latest = configs[0];
    
    setSelectedOptions(latest.data.selectedOptions);
    setNotification(`${t.configLoaded} (${latest.data.name || "fără nume"})`);
    setTimeout(() => setNotification(null), 3000);
  };

  // Normalizare caractere românești pentru PDF (jsPDF nu suportă diacritice)
  const normalizePdfText = (text: string): string => {
    return text
      .replace(/ă/g, "a").replace(/Ă/g, "A")
      .replace(/â/g, "a").replace(/Â/g, "A")
      .replace(/î/g, "i").replace(/Î/g, "I")
      .replace(/ș/g, "s").replace(/Ș/g, "S")
      .replace(/ț/g, "t").replace(/Ț/g, "T");
  };

  // Export configurație ca PDF
  const handleExportConfig = () => {
    const details = getSelectedWithDetails();
    const doc = new jsPDF();
    const n = normalizePdfText; // shortcut
    
    // Header cu fundal albastru
    doc.setFillColor(30, 64, 175); // Blue-800
    doc.rect(0, 0, 210, 40, "F");
    
    // Logo text și titlu
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text("PREV-COR TPM", 15, 20);
    doc.setFontSize(14);
    doc.setFont("helvetica", "normal");
    doc.text("Configurator PLC - Oferta Tehnica", 15, 32);
    
    // Info produs
    doc.setTextColor(0, 0, 0);
    let y = 55;
    
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(n(`${product.brandName} - ${product.name}`), 15, y);
    y += 10;
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(`SKU: ${product.sku}`, 15, y);
    doc.text(`Data: ${new Date().toLocaleDateString("ro-RO")}`, 150, y);
    y += 15;
    
    // Linie separator
    doc.setDrawColor(200, 200, 200);
    doc.line(15, y, 195, y);
    y += 10;
    
    // Componente
    doc.setTextColor(30, 64, 175);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("COMPONENTE SELECTATE", 15, y);
    y += 10;
    
    // Produs baza
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(n(`- ${product.name} (Baza)`), 15, y);
    doc.setFont("helvetica", "normal");
    doc.text(`${product.basePrice.toFixed(2)} ${product.currency}`, 160, y, { align: "right" });
    y += 8;
    
    // Optiuni selectate
    details.filter(d => !d.isDefault).forEach((opt) => {
      if (y > 260) {
        doc.addPage();
        y = 20;
      }
      
      doc.setFont("helvetica", "bold");
      doc.text(n(`- ${opt.optionName}${opt.quantity > 1 ? ` x${opt.quantity}` : ""}`), 15, y);
      doc.setFont("helvetica", "normal");
      doc.text(`+${(opt.price * opt.quantity).toFixed(2)} ${product.currency}`, 160, y, { align: "right" });
      y += 6;
      
      if (opt.optionSku) {
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(9);
        doc.text(`SKU: ${opt.optionSku}`, 20, y);
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(11);
        y += 6;
      }
      y += 2;
    });
    
    // Total
    y += 5;
    doc.setDrawColor(30, 64, 175);
    doc.setLineWidth(0.5);
    doc.line(15, y, 195, y);
    y += 10;
    
    doc.setFillColor(240, 249, 255); // Light blue bg
    doc.rect(14, y - 6, 182, 14, "F");
    
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 64, 175);
    doc.text("TOTAL:", 20, y + 2);
    doc.text(`${totalPrice.toFixed(2)} ${product.currency}`, 185, y + 2, { align: "right" });
    y += 20;
    
    // Footer
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.text("* Preturile sunt orientative si nu includ TVA.", 15, y);
    y += 5;
    doc.text("* Configuratia este informativa. Contactati-ne pentru oferta finala.", 15, y);
    y += 10;
    
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 64, 175);
    doc.text("Contact: office@prevcortpm.ro | www.prevcortpm.ro", 15, y);
    
    // Salvează PDF
    doc.save(`configurare-${product.sku}-${Date.now()}.pdf`);
  };

  // Trimitere cerere ofertă
  const handleSendQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);

    const details = getSelectedWithDetails();
    let configDetails = `CONFIGURARE ${product.brandName} - ${product.name}\n`;
    configDetails += `SKU: ${product.sku}\n\n`;
    configDetails += `COMPONENTE:\n`;
    configDetails += `• ${product.name} (Bază) - ${product.basePrice.toFixed(2)} ${product.currency}\n`;
    
    details.filter(d => !d.isDefault).forEach((opt) => {
      configDetails += `• ${opt.optionName}${opt.quantity > 1 ? ` x${opt.quantity}` : ""}`;
      if (opt.optionSku) configDetails += ` (${opt.optionSku})`;
      configDetails += ` - +${(opt.price * opt.quantity).toFixed(2)} ${product.currency}\n`;
    });
    
    configDetails += `\nTOTAL ESTIMAT: ${totalPrice.toFixed(2)} ${product.currency}\n`;
    configDetails += `\nMESAJ CLIENT:\n${quoteForm.message || "N/A"}`;

    try {
      await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prenume: quoteForm.name.split(" ")[0] || "Client",
          nume: quoteForm.name.split(" ").slice(1).join(" ") || "Configurator",
          email: quoteForm.email,
          companie: quoteForm.company || "-",
          serviciu: `Cerere ofertă configurare ${product.name}`,
          mesaj: configDetails + (quoteForm.phone ? `\n\nTelefon: ${quoteForm.phone}` : ""),
        }),
      });
      setQuoteSent(true);
      setTimeout(() => {
        setShowQuoteModal(false);
        setQuoteSent(false);
        setQuoteForm({ name: "", email: "", phone: "", company: "", message: "" });
      }, 2000);
    } catch {
      alert("Eroare la trimitere. Încercați din nou.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Notification */}
      {notification && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-pulse">
          ✓ {notification}
        </div>
      )}

      {/* Modal Cerere Ofertă */}
      {showQuoteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">{t.quoteModalTitle}</h3>
              <button onClick={() => setShowQuoteModal(false)} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
            </div>
            
            {quoteSent ? (
              <div className="text-center py-8">
                <div className="text-green-500 text-5xl mb-4">✓</div>
                <p className="text-lg font-medium text-green-700">{t.requestSent}</p>
              </div>
            ) : (
              <form onSubmit={handleSendQuote} className="space-y-4">
                <div className="bg-blue-50 rounded-lg p-3 mb-4">
                  <p className="font-medium">{product.name}</p>
                  <p className="text-blue-700 font-bold">{totalPrice.toFixed(2)} {product.currency}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">{t.yourName} *</label>
                  <input
                    type="text"
                    required
                    value={quoteForm.name}
                    onChange={(e) => setQuoteForm({ ...quoteForm, name: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t.yourEmail} *</label>
                  <input
                    type="email"
                    required
                    value={quoteForm.email}
                    onChange={(e) => setQuoteForm({ ...quoteForm, email: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t.yourPhone}</label>
                  <input
                    type="tel"
                    value={quoteForm.phone}
                    onChange={(e) => setQuoteForm({ ...quoteForm, phone: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t.yourCompany}</label>
                  <input
                    type="text"
                    value={quoteForm.company}
                    onChange={(e) => setQuoteForm({ ...quoteForm, company: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t.yourMessage}</label>
                  <textarea
                    rows={3}
                    value={quoteForm.message}
                    onChange={(e) => setQuoteForm({ ...quoteForm, message: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="Ex: Cantitate dorită, termen de livrare, alte detalii..."
                  />
                </div>
                
                <button
                  type="submit"
                  disabled={sending}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-3 rounded-lg"
                >
                  {sending ? t.sending : t.sendRequest}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal Salvare Configurație */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="bg-blue-50 px-6 py-4 flex items-center justify-between border-b border-blue-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-gray-900">{language === "en" ? "Save Configuration" : "Salvează configurația"}</h3>
              </div>
              <button
                onClick={() => setShowSaveModal(false)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Content */}
            <div className="px-6 py-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {language === "en" ? "Configuration name" : "Numele configurației"}
              </label>
              <input
                type="text"
                value={saveConfigName}
                onChange={(e) => setSaveConfigName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={language === "en" ? "e.g., Production Line #1" : "ex: Linie producție #1"}
                autoFocus
              />
              <p className="text-sm text-gray-500 mt-2">
                {language === "en" 
                  ? "Give a descriptive name to easily identify this configuration later."
                  : "Dă un nume descriptiv pentru a identifica ușor această configurație mai târziu."}
              </p>
            </div>
            
            {/* Product summary */}
            <div className="px-6 pb-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-gray-500">{product.brandName}</p>
                    <p className="font-semibold text-gray-900">{product.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">{language === "en" ? "Total" : "Total"}</p>
                    <p className="text-lg font-bold text-blue-600">{totalPrice.toFixed(2)} {product.currency}</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3 border-t">
              <button
                onClick={() => setShowSaveModal(false)}
                className="px-5 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition"
              >
                {language === "en" ? "Cancel" : "Anulare"}
              </button>
              <button
                onClick={confirmSaveConfig}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {language === "en" ? "Save" : "Salvează"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6">
        <div className="flex items-center gap-4">
          {product.image && (
            <Image
              src={product.image}
              alt={product.name}
              width={80}
              height={80}
              className="bg-white rounded p-1 object-contain"
            />
          )}
          <div>
            <p className="text-blue-200 text-sm">{product.brandName}</p>
            <h2 className="text-2xl font-bold">{product.name}</h2>
            <p className="text-blue-200">{product.sku}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row">
        {/* Tabs & Options */}
        <div className="flex-1 border-r">
          {/* Tab Navigation */}
          <div className="flex border-b overflow-x-auto">
            {product.categories.map((category, index) => (
              <button
                key={category.id}
                onClick={() => setActiveTab(index)}
                className={`flex items-center gap-2 px-6 py-4 font-medium whitespace-nowrap transition-colors ${
                  activeTab === index
                    ? "bg-blue-50 text-blue-700 border-b-2 border-blue-600"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <span className="text-xl">
                  {categoryIcons[category.name] || "⚙️"}
                </span>
                {language === "en" && category.nameEn
                  ? category.nameEn
                  : category.name}
                {/* Badge cu număr de opțiuni selectate */}
                {selectedOptions.filter((s) => s.categoryId === category.id)
                  .length > 0 && (
                  <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
                    {
                      selectedOptions.filter((s) => s.categoryId === category.id)
                        .length
                    }
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Options Grid */}
          <div className="p-6">
            <div className="grid gap-4 md:grid-cols-2">
              {product.categories[activeTab]?.options.map((option) => {
                const selected = isSelected(
                  product.categories[activeTab].id,
                  option.id
                );
                const selOption = selectedOptions.find(
                  (s) =>
                    s.categoryId === product.categories[activeTab].id &&
                    s.optionId === option.id
                );

                return (
                  <div
                    key={option.id}
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                      selected
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-blue-300"
                    } ${option.isDefault ? "ring-2 ring-green-400" : ""}`}
                    onClick={() =>
                      toggleOption(product.categories[activeTab].id, option.id)
                    }
                  >
                    <div className="flex items-start gap-3">
                      {/* Checkbox */}
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-1 ${
                          selected
                            ? "bg-blue-600 border-blue-600"
                            : "border-gray-300"
                        }`}
                      >
                        {selected && (
                          <svg
                            className="w-3 h-3 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={3}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                      </div>

                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-semibold text-gray-900">
                              {language === "en" && option.nameEn
                                ? option.nameEn
                                : option.name}
                            </h4>
                            {option.sku && (
                              <p className="text-xs text-gray-500">
                                {option.sku}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            {option.isDefault ? (
                              <span className="text-green-600 font-medium text-sm">
                                {t.included}
                              </span>
                            ) : (
                              <span className="font-bold text-blue-700">
                                +{option.price.toFixed(2)} {product.currency}
                              </span>
                            )}
                          </div>
                        </div>

                        {option.description && (
                          <p className="text-sm text-gray-600 mt-1">
                            {option.description}
                          </p>
                        )}

                        {/* Specificații */}
                        {option.specs && Object.keys(option.specs).length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {Object.entries(option.specs).map(([key, value]) => (
                              <span
                                key={key}
                                className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded"
                              >
                                {key}: {value}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Quantity selector - doar dacă e selectat și maxQuantity > 1 */}
                        {selected &&
                          option.maxQuantity &&
                          option.maxQuantity > 1 && (
                            <div
                              className="mt-3 flex items-center gap-2"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <span className="text-sm text-gray-600">
                                {t.quantity}:
                              </span>
                              <div className="flex items-center border rounded">
                                <button
                                  className="px-2 py-1 hover:bg-gray-100"
                                  onClick={() =>
                                    updateQuantity(
                                      product.categories[activeTab].id,
                                      option.id,
                                      (selOption?.quantity || 1) - 1
                                    )
                                  }
                                >
                                  -
                                </button>
                                <span className="px-3 py-1 border-x">
                                  {selOption?.quantity || 1}
                                </span>
                                <button
                                  className="px-2 py-1 hover:bg-gray-100"
                                  onClick={() =>
                                    updateQuantity(
                                      product.categories[activeTab].id,
                                      option.id,
                                      (selOption?.quantity || 1) + 1
                                    )
                                  }
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {product.categories[activeTab]?.options.length === 0 && (
                <div className="col-span-2 text-center py-8 text-gray-500">
                  {t.noOptions}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Summary Sidebar */}
        <div className="lg:w-80 bg-gray-50 p-6">
          <h3 className="font-bold text-lg mb-4">{t.summary}</h3>

          {/* Produs bază */}
          <div className="border-b pb-3 mb-3">
            <div className="flex justify-between">
              <span className="font-medium">{product.name}</span>
              <span className="font-bold">
                {product.basePrice.toFixed(2)} {product.currency}
              </span>
            </div>
            <span className="text-xs text-gray-500">{t.basePrice}</span>
          </div>

          {/* Opțiuni selectate */}
          <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
            {getSelectedWithDetails()
              .filter((opt) => !opt.isDefault)
              .map((opt, index) => (
                <div
                  key={index}
                  className="flex justify-between text-sm bg-white p-2 rounded"
                >
                  <div>
                    <span className="font-medium">{opt.optionName}</span>
                    {opt.quantity > 1 && (
                      <span className="text-gray-500"> x{opt.quantity}</span>
                    )}
                  </div>
                  <span className="text-blue-700">
                    +{(opt.price * opt.quantity).toFixed(2)} {product.currency}
                  </span>
                </div>
              ))}
          </div>

          {/* Total */}
          <div className="border-t pt-4 mb-6">
            <div className="flex justify-between items-center">
              <span className="text-lg font-bold">{t.totalPrice}</span>
              <span className="text-2xl font-bold text-blue-700">
                {totalPrice.toFixed(2)} {product.currency}
              </span>
            </div>
          </div>

          {/* Butoane */}
          <div className="space-y-3">
            <button
              onClick={handleAddToCart}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              {t.addToCart}
            </button>

            <button 
              onClick={() => setShowQuoteModal(true)}
              className="w-full border-2 border-blue-600 text-blue-600 hover:bg-blue-50 font-bold py-3 px-4 rounded-lg transition-colors"
            >
              📧 {t.requestQuote}
            </button>

            <button 
              onClick={handleExportConfig}
              className="w-full border border-gray-300 text-gray-700 hover:bg-gray-100 py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              📄 {t.exportPdf}
            </button>

            <div className="flex gap-2">
              <button 
                onClick={handleSaveConfig}
                className="flex-1 text-gray-600 hover:text-gray-800 py-2 text-sm border rounded-lg hover:bg-gray-50"
              >
                💾 {t.saveConfig}
              </button>
              <Link 
                href="/configuratii"
                className="flex-1 text-gray-600 hover:text-gray-800 py-2 text-sm border rounded-lg hover:bg-gray-50 flex items-center justify-center gap-1"
              >
                📂 {language === "en" ? "My Configs" : "Configurații"}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
