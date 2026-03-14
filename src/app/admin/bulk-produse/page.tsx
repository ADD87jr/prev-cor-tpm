"use client";

import { useState, useRef } from "react";

export default function BulkProductsPage() {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // PDF Import
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfImporting, setPdfImporting] = useState(false);
  const [pdfResult, setPdfResult] = useState<any>(null);
  const [pdfError, setPdfError] = useState("");
  const [pdfDragActive, setPdfDragActive] = useState(false);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const [pdfPreview, setPdfPreview] = useState<any[]>([]);
  const [showPdfPreview, setShowPdfPreview] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      const fileName = droppedFile.name.toLowerCase();
      if (fileName.endsWith('.csv') || fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        setFile(droppedFile);
        setError("");
      } else {
        setError("Doar fișiere CSV sau Excel (.xlsx) sunt acceptate");
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError("");
    }
  };

  const handleExport = async () => {
    try {
      const res = await fetch("/admin/api/products/bulk-csv");
      if (!res.ok) throw new Error("Eroare la export");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `produse-export-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setError("Eroare la descărcarea fișierului CSV.");
    }
  };

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    setError("");
    setResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/admin/api/products/bulk-csv", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setResult(data);
      }
    } catch (e) {
      setError("Eroare la import.");
    }
    setImporting(false);
  };

  // PDF handlers
  const handlePdfDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setPdfDragActive(true);
    } else if (e.type === "dragleave") {
      setPdfDragActive(false);
    }
  };

  const handlePdfDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setPdfDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.name.toLowerCase().endsWith('.pdf')) {
        setPdfFile(droppedFile);
        setPdfError("");
      } else {
        setPdfError("Doar fișiere PDF sunt acceptate");
      }
    }
  };

  const handlePdfFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPdfFile(e.target.files[0]);
      setPdfError("");
    }
  };

  const handlePdfAnalyze = async () => {
    if (!pdfFile) return;
    setPdfImporting(true);
    setPdfError("");
    setPdfResult(null);
    setPdfPreview([]);
    setShowPdfPreview(false);
    try {
      const formData = new FormData();
      formData.append("file", pdfFile);
      formData.append("action", "analyze");
      const res = await fetch("/admin/api/products/import-pdf", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.error) {
        let errorMsg = data.error;
        if (data.textSample) {
          errorMsg += "\n\nText extras din PDF (primele caractere):\n" + data.textSample;
        }
        if (data.hint) {
          errorMsg += "\n\n" + data.hint;
        }
        setPdfError(errorMsg);
      } else {
        setPdfPreview(data.products || []);
        setShowPdfPreview(true);
        // Debug: afișăm textSample în consolă pentru a vedea formatul
        if (data.textSample) {
          console.log("[PDF DEBUG] Text extras din PDF:");
          console.log(data.textSample);
        }
      }
    } catch (e) {
      setPdfError("Eroare la analiza PDF.");
    }
    setPdfImporting(false);
  };

  const handlePdfImport = async () => {
    if (pdfPreview.length === 0) return;
    setPdfImporting(true);
    setPdfError("");
    try {
      const res = await fetch("/admin/api/products/import-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ products: pdfPreview, action: "import" }),
      });
      const data = await res.json();
      if (data.error) {
        setPdfError(data.error);
      } else {
        setPdfResult(data);
        setShowPdfPreview(false);
        setPdfPreview([]);
        setPdfFile(null);
      }
    } catch (e) {
      setPdfError("Eroare la importul produselor.");
    }
    setPdfImporting(false);
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Import / Export produse CSV</h1>

      {/* Export */}
      <div className="bg-white rounded-xl shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-3">📥 Export produse în CSV</h2>
        <p className="text-gray-600 text-sm mb-4">
          Descarcă toate produsele într-un fișier CSV pe care îl poți edita în Excel sau Google Sheets.
        </p>
        <button
          onClick={handleExport}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 font-semibold"
        >
          Descarcă CSV
        </button>
      </div>

      {/* Import */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-lg font-semibold mb-3">📤 Import produse din CSV / Excel</h2>
        <p className="text-gray-600 text-sm mb-4">
          Încarcă un fișier CSV sau Excel cu produse. Produsele cu <strong>id</strong> existent vor fi actualizate.
          Produsele fără id (sau cu id=0) vor fi create ca produse noi.
        </p>
        
        {/* Drag & Drop Zone */}
        <div
          className={`relative border-2 border-dashed rounded-xl p-8 mb-4 text-center transition-all cursor-pointer
            ${dragActive 
              ? 'border-blue-500 bg-blue-50' 
              : file 
                ? 'border-green-400 bg-green-50' 
                : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50/50'
            }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileChange}
            className="hidden"
          />
          
          {file ? (
            <div className="space-y-2">
              <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-green-700 font-semibold">{file.name}</p>
              <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setFile(null); }}
                className="text-sm text-red-600 hover:text-red-700 underline"
              >
                Șterge fișier
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="w-16 h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <div>
                <p className="text-gray-700 font-medium">
                  Trage fișierul CSV sau Excel aici
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  sau <span className="text-blue-600 font-medium">click pentru a selecta</span>
                </p>
              </div>
              <p className="text-xs text-gray-400">Fișiere .csv, .xlsx, .xls</p>
            </div>
          )}
        </div>

        <button
          onClick={handleImport}
          disabled={!file || importing}
          className={`w-full py-3 px-6 rounded-lg font-semibold text-white transition-all flex items-center justify-center gap-2
            ${!file || importing 
              ? 'bg-gray-300 cursor-not-allowed' 
              : 'bg-green-600 hover:bg-green-700 shadow-md hover:shadow-lg'
            }`}
        >
          {importing ? (
            <>
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Se importă...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Importă
            </>
          )}
        </button>

        {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}

        {result && (
          <div className="bg-green-50 border border-green-300 rounded p-4">
            <p className="font-semibold text-green-700 mb-2">Import finalizat!</p>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>✅ Produse actualizate: <strong>{result.updated}</strong></li>
              <li>🆕 Produse create: <strong>{result.created}</strong></li>
              {result.errors?.length > 0 && (
                <li className="text-red-600">
                  ⚠️ Erori: {result.errors.length}
                  <ul className="ml-4 mt-1 text-xs max-h-96 overflow-y-auto">
                    {result.errors.map((e: string, i: number) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                </li>
              )}
            </ul>
          </div>
        )}
      </div>

      {/* Import PDF */}
      <div className="bg-white rounded-xl shadow p-6 mt-6">
        <h2 className="text-lg font-semibold mb-3">📄 Import produse din PDF (Siemens, etc.)</h2>
        <p className="text-gray-600 text-sm mb-4">
          Încarcă un PDF cu liste de produse. AI va extrage automat datele și le va pregăti pentru import.
        </p>
        
        {/* PDF Drag & Drop Zone */}
        <div
          className={`relative border-2 border-dashed rounded-xl p-8 mb-4 text-center transition-all cursor-pointer
            ${pdfDragActive 
              ? 'border-purple-500 bg-purple-50' 
              : pdfFile 
                ? 'border-green-400 bg-green-50' 
                : 'border-gray-300 bg-gray-50 hover:border-purple-400 hover:bg-purple-50/50'
            }`}
          onDragEnter={handlePdfDrag}
          onDragLeave={handlePdfDrag}
          onDragOver={handlePdfDrag}
          onDrop={handlePdfDrop}
          onClick={() => pdfInputRef.current?.click()}
        >
          <input
            ref={pdfInputRef}
            type="file"
            accept=".pdf"
            onChange={handlePdfFileChange}
            className="hidden"
          />
          
          {pdfFile ? (
            <div className="space-y-2">
              <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-green-700 font-semibold">{pdfFile.name}</p>
              <p className="text-sm text-gray-500">{(pdfFile.size / 1024).toFixed(1)} KB</p>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setPdfFile(null); setPdfPreview([]); setShowPdfPreview(false); }}
                className="text-sm text-red-600 hover:text-red-700 underline"
              >
                Șterge fișier
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="w-16 h-16 mx-auto bg-purple-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <p className="text-gray-700 font-medium">
                  Trage fișierul PDF aici
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  sau <span className="text-purple-600 font-medium">click pentru a selecta</span>
                </p>
              </div>
              <p className="text-xs text-gray-400">Fișiere .pdf (liste de produse Siemens, ABB, etc.)</p>
            </div>
          )}
        </div>

        {!showPdfPreview && (
          <button
            onClick={handlePdfAnalyze}
            disabled={!pdfFile || pdfImporting}
            className={`w-full py-3 px-6 rounded-lg font-semibold text-white transition-all flex items-center justify-center gap-2
              ${!pdfFile || pdfImporting 
                ? 'bg-gray-300 cursor-not-allowed' 
                : 'bg-purple-600 hover:bg-purple-700 shadow-md hover:shadow-lg'
              }`}
          >
            {pdfImporting ? (
              <>
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Se analizează cu AI...
              </>
            ) : (
              <>
                🤖 Analizează PDF cu AI
              </>
            )}
          </button>
        )}

        {pdfError && <div className="bg-red-100 text-red-700 p-3 rounded mt-4 whitespace-pre-wrap text-sm max-h-64 overflow-y-auto">{pdfError}</div>}

        {/* PDF Preview */}
        {showPdfPreview && pdfPreview.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-700">
                📋 Produse găsite: {pdfPreview.length}
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowPdfPreview(false); setPdfPreview([]); }}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  Anulează
                </button>
                <button
                  onClick={handlePdfImport}
                  disabled={pdfImporting}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50"
                >
                  {pdfImporting ? 'Se importă...' : `✅ Importă ${pdfPreview.length} produse`}
                </button>
              </div>
            </div>
            <div className="max-h-96 overflow-y-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-cyan-700 text-white sticky top-0">
                  <tr>
                    <th className="px-2 py-2 text-left text-xs">#</th>
                    <th className="px-2 py-2 text-left text-xs">MLFB number</th>
                    <th className="px-2 py-2 text-left text-xs">Type</th>
                    <th className="px-2 py-2 text-left text-xs">Product Description</th>
                    <th className="px-2 py-2 text-right text-xs">Price List EUR</th>
                    <th className="px-2 py-2 text-center text-xs">MOQ</th>
                  </tr>
                </thead>
                <tbody>
                  {pdfPreview.map((p, i) => (
                    <tr key={i} className={`border-t ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-cyan-50`}>
                      <td className="px-2 py-1.5 text-gray-500 text-xs">{i + 1}</td>
                      <td className="px-2 py-1.5 font-mono text-xs text-gray-600">{p.mlfb || '-'}</td>
                      <td className="px-2 py-1.5 font-mono text-xs font-semibold">{p.productCode || '-'}</td>
                      <td className="px-2 py-1.5 text-xs">{p.description || p.name || '-'}</td>
                      <td className="px-2 py-1.5 text-right text-xs font-medium">{p.price ? `${p.price}` : '-'}</td>
                      <td className="px-2 py-1.5 text-center text-xs">{p.moq || '1'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {pdfResult && (
          <div className="bg-green-50 border border-green-300 rounded p-4 mt-4">
            <p className="font-semibold text-green-700 mb-2">Import PDF finalizat!</p>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>🆕 Produse create: <strong>{pdfResult.created}</strong></li>
              {pdfResult.errors?.length > 0 && (
                <li className="text-red-600">
                  ⚠️ Erori: {pdfResult.errors.length}
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
