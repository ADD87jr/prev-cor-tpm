"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { MdSettings, MdDelete, MdOpenInNew, MdPictureAsPdf, MdWarning, MdClose } from "react-icons/md";
import { jsPDF } from "jspdf";

interface SavedConfig {
  id: string;
  name: string;
  productSku: string;
  productName: string;
  brandName: string;
  basePrice: number;
  currency: string;
  selectedOptions: Record<string, number>;
  totalPrice: number;
  savedAt: string;
}

// Normalizare caractere românești pentru PDF
const normalizePdfText = (text: string): string => {
  return text
    .replace(/ă/g, "a").replace(/Ă/g, "A")
    .replace(/â/g, "a").replace(/Â/g, "A")
    .replace(/î/g, "i").replace(/Î/g, "I")
    .replace(/ș/g, "s").replace(/Ș/g, "S")
    .replace(/ț/g, "t").replace(/Ț/g, "T");
};

export default function ConfiguratiiPage() {
  const [configs, setConfigs] = useState<SavedConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; configId: string; configName: string }>({
    open: false,
    configId: "",
    configName: "",
  });

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = () => {
    const allConfigs: SavedConfig[] = [];
    
    // Căutăm toate cheile care încep cu "plc-config-"
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith("plc-config-")) {
        try {
          const data = JSON.parse(localStorage.getItem(key) || "{}");
          if (data.productSku) {
            allConfigs.push({
              id: key,
              name: data.name || `Configurație ${data.productSku}`,
              productSku: data.productSku,
              productName: data.productName || data.productSku,
              brandName: data.brandName || "",
              basePrice: data.basePrice || 0,
              currency: data.currency || "EUR",
              selectedOptions: data.selectedOptions || {},
              totalPrice: data.totalPrice || data.basePrice || 0,
              savedAt: data.savedAt || new Date().toISOString(),
            });
          }
        } catch (e) {
          console.error("Eroare la parsarea configurației:", key);
        }
      }
    }
    
    // Sortăm după data salvării (cele mai recente primele)
    allConfigs.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
    
    setConfigs(allConfigs);
    setLoading(false);
  };

  const openDeleteModal = (id: string, name: string) => {
    setDeleteModal({ open: true, configId: id, configName: name });
  };

  const closeDeleteModal = () => {
    setDeleteModal({ open: false, configId: "", configName: "" });
  };

  const confirmDelete = () => {
    if (deleteModal.configId) {
      localStorage.removeItem(deleteModal.configId);
      loadConfigs();
    }
    closeDeleteModal();
  };

  const handleExportPDF = (config: SavedConfig) => {
    const doc = new jsPDF();
    const n = normalizePdfText;
    
    // Header
    doc.setFillColor(30, 64, 175);
    doc.rect(0, 0, 210, 40, "F");
    
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
    doc.text(n(`${config.brandName} - ${config.productName}`), 15, y);
    y += 10;
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(`SKU: ${config.productSku}`, 15, y);
    doc.text(`Data: ${new Date(config.savedAt).toLocaleDateString("ro-RO")}`, 150, y);
    y += 15;
    
    doc.setDrawColor(200, 200, 200);
    doc.line(15, y, 195, y);
    y += 10;
    
    // Componente
    doc.setTextColor(30, 64, 175);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("COMPONENTE SELECTATE", 15, y);
    y += 10;
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(n(`- ${config.productName} (Baza)`), 15, y);
    doc.setFont("helvetica", "normal");
    doc.text(`${config.basePrice.toFixed(2)} ${config.currency}`, 160, y, { align: "right" });
    y += 15;
    
    // Total
    doc.setDrawColor(30, 64, 175);
    doc.setLineWidth(0.5);
    doc.line(15, y, 195, y);
    y += 10;
    
    doc.setFillColor(240, 249, 255);
    doc.rect(14, y - 6, 182, 14, "F");
    
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 64, 175);
    doc.text("TOTAL:", 20, y + 2);
    doc.text(`${config.totalPrice.toFixed(2)} ${config.currency}`, 185, y + 2, { align: "right" });
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
    
    doc.save(`configuratie-${config.productSku}-${Date.now()}.pdf`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ro-RO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center gap-3 mb-8">
          <MdSettings className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Configurațiile mele</h1>
        </div>

        {configs.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <MdSettings className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-700 mb-2">
              Nu ai configurații salvate
            </h2>
            <p className="text-gray-500 mb-6">
              Accesează configuratorul pentru a crea și salva configurații PLC.
            </p>
            <Link
              href="/configurator"
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              <MdSettings className="w-5 h-5" />
              Mergi la Configurator
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {configs.map((config) => (
              <div
                key={config.id}
                className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900">
                      {config.name}
                    </h3>
                    <p className="text-gray-600">
                      {config.brandName} - {config.productName}
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      SKU: {config.productSku} • Salvat: {formatDate(config.savedAt)}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Preț total</p>
                      {config.totalPrice > 0 ? (
                        <p className="text-2xl font-bold text-blue-600">
                          {config.totalPrice.toFixed(2)} {config.currency}
                        </p>
                      ) : (
                        <p className="text-lg text-gray-400 italic">
                          Deschide pentru preț
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100">
                  <Link
                    href={`/configurator?sku=${config.productSku}`}
                    className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
                  >
                    <MdOpenInNew className="w-4 h-4" />
                    Deschide
                  </Link>
                  
                  <button
                    onClick={() => handleExportPDF(config)}
                    className="inline-flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition"
                  >
                    <MdPictureAsPdf className="w-4 h-4" />
                    Export PDF
                  </button>
                  
                  <button
                    onClick={() => openDeleteModal(config.id, config.name)}
                    className="inline-flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-100 transition ml-auto"
                  >
                    <MdDelete className="w-4 h-4" />
                    Șterge
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 text-center">
          <Link
            href="/configurator"
            className="text-blue-600 hover:underline font-medium"
          >
            ← Înapoi la Configurator
          </Link>
        </div>
      </div>

      {/* Modal confirmare ștergere */}
      {deleteModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="bg-red-50 px-6 py-4 flex items-center justify-between border-b border-red-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <MdWarning className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Confirmare ștergere</h3>
              </div>
              <button
                onClick={closeDeleteModal}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <MdClose className="w-6 h-6" />
              </button>
            </div>
            
            {/* Content */}
            <div className="px-6 py-5">
              <p className="text-gray-600 mb-2">Ești sigur că dorești să ștergi această configurație?</p>
              <p className="font-semibold text-gray-900 bg-gray-50 px-4 py-3 rounded-lg">
                {deleteModal.configName}
              </p>
              <p className="text-sm text-red-500 mt-3 flex items-center gap-1">
                <MdWarning className="w-4 h-4" />
                Această acțiune nu poate fi anulată.
              </p>
            </div>
            
            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3 border-t">
              <button
                onClick={closeDeleteModal}
                className="px-5 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition"
              >
                Anulare
              </button>
              <button
                onClick={confirmDelete}
                className="px-5 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition flex items-center gap-2"
              >
                <MdDelete className="w-4 h-4" />
                Șterge definitiv
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
