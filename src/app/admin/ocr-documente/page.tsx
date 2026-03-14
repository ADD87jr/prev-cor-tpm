"use client";

import { useState, useRef } from "react";

interface ExtractedItem {
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface OcrResult {
  success: boolean;
  documentType: string;
  documentNumber?: string;
  date?: string;
  supplier?: {
    name: string;
    cui: string;
    address: string;
  };
  client?: {
    name: string;
    cui: string;
    address: string;
  };
  items?: ExtractedItem[];
  subtotal?: number;
  tva?: number;
  total?: number;
  paymentTerms?: string;
  additionalInfo?: string;
  confidence?: number;
  warnings?: string[];
  rawText?: string;
}

export default function AIOcrDocumentsPage() {
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<OcrResult | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [documentType, setDocumentType] = useState("auto");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Process
    await processImage(file);
  };

  const processImage = async (file: File) => {
    setProcessing(true);
    setResult(null);

    try {
      // Convert to base64
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      });

      const res = await fetch("/admin/api/ai-ocr-documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: base64,
          documentType: documentType !== "auto" ? documentType : undefined
        })
      });
      const data = await res.json();
      setResult(data);
    } catch (e) {
      console.error(e);
      setResult({ success: false, documentType: "error", warnings: ["Eroare la procesare"] });
    }
    setProcessing(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setPreview(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
      await processImage(file);
    }
  };

  const copyAsJson = () => {
    if (result) {
      navigator.clipboard.writeText(JSON.stringify(result, null, 2));
      alert("Copiat ca JSON!");
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">📸 AI OCR Documente</h1>
      <p className="text-gray-600 mb-6">
        Extrage date din facturi, comenzi și alte documente scanate.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload */}
        <div className="space-y-4">
          {/* Tip document */}
          <div className="bg-white rounded-lg shadow p-5">
            <h3 className="font-semibold text-gray-700 mb-3">Tip Document</h3>
            <select
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
            >
              <option value="auto">Auto-detectare</option>
              <option value="factura">Factură</option>
              <option value="comanda">Comandă</option>
              <option value="altele">Alt document</option>
            </select>
          </div>

          {/* Drop zone */}
          <div
            className="bg-white rounded-lg shadow p-10 border-2 border-dashed border-gray-300 text-center cursor-pointer hover:border-teal-400 transition-colors"
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/*"
              className="hidden"
            />
            <div className="text-6xl mb-4">📄</div>
            <p className="text-gray-600 mb-2">Trage imaginea aici sau click pentru upload</p>
            <p className="text-xs text-gray-400">Formate acceptate: JPG, PNG, PDF</p>
          </div>

          {/* Preview */}
          {preview && (
            <div className="bg-white rounded-lg shadow p-5">
              <h3 className="font-semibold text-gray-700 mb-3">Preview Document</h3>
              <img 
                src={preview} 
                alt="Document preview" 
                className="w-full rounded border max-h-[300px] object-contain"
              />
            </div>
          )}
        </div>

        {/* Rezultat */}
        <div className="bg-white rounded-lg shadow p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-700">Date Extrase</h2>
            {result?.success && (
              <button
                onClick={copyAsJson}
                className="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded"
              >
                📋 JSON
              </button>
            )}
          </div>

          {processing ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600 mb-4"></div>
              <p className="text-gray-600">Procesez documentul...</p>
              <p className="text-xs text-gray-400 mt-2">AI analizează imaginea</p>
            </div>
          ) : result ? (
            <div className="space-y-4">
              {/* Header */}
              <div className={`rounded-lg p-4 ${result.success ? "bg-teal-50" : "bg-red-50"}`}>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Tip document</p>
                    <p className="text-xl font-bold capitalize">{result.documentType}</p>
                  </div>
                  {result.confidence && (
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Încredere</p>
                      <p className={`text-2xl font-bold ${
                        result.confidence >= 80 ? "text-green-600" : 
                        result.confidence >= 50 ? "text-yellow-600" : "text-red-600"
                      }`}>
                        {result.confidence}%
                      </p>
                    </div>
                  )}
                </div>
                {result.documentNumber && (
                  <p className="text-sm mt-2">Nr: <strong>{result.documentNumber}</strong> | Data: <strong>{result.date}</strong></p>
                )}
              </div>

              {/* Warnings */}
              {result.warnings && result.warnings.length > 0 && (
                <div className="bg-yellow-50 rounded p-3">
                  <p className="text-sm font-medium text-yellow-800 mb-1">⚠️ Avertismente:</p>
                  <ul className="text-xs text-yellow-700 space-y-0.5">
                    {result.warnings.map((w, i) => (
                      <li key={i}>• {w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Supplier & Client */}
              {(result.supplier || result.client) && (
                <div className="grid grid-cols-2 gap-4">
                  {result.supplier && (
                    <div className="bg-gray-50 rounded p-3">
                      <p className="text-xs text-gray-500 mb-1">FURNIZOR</p>
                      <p className="font-medium text-sm">{result.supplier.name}</p>
                      <p className="text-xs text-gray-600">{result.supplier.cui}</p>
                      <p className="text-xs text-gray-500">{result.supplier.address}</p>
                    </div>
                  )}
                  {result.client && (
                    <div className="bg-gray-50 rounded p-3">
                      <p className="text-xs text-gray-500 mb-1">CLIENT</p>
                      <p className="font-medium text-sm">{result.client.name}</p>
                      <p className="text-xs text-gray-600">{result.client.cui}</p>
                      <p className="text-xs text-gray-500">{result.client.address}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Items */}
              {result.items && result.items.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Produse/Servicii:</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left p-2">Denumire</th>
                          <th className="text-right p-2">Cant.</th>
                          <th className="text-right p-2">Preț unit.</th>
                          <th className="text-right p-2">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.items.map((item, i) => (
                          <tr key={i} className="border-t">
                            <td className="p-2">{item.name}</td>
                            <td className="p-2 text-right">{item.quantity}</td>
                            <td className="p-2 text-right">{item.unitPrice?.toFixed(2)}</td>
                            <td className="p-2 text-right font-medium">{item.total?.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Totals */}
              {(result.subtotal || result.tva || result.total) && (
                <div className="bg-gray-50 rounded p-3 space-y-1">
                  {result.subtotal && (
                    <div className="flex justify-between text-sm">
                      <span>Subtotal:</span>
                      <span>{result.subtotal?.toFixed(2)} RON</span>
                    </div>
                  )}
                  {result.tva && (
                    <div className="flex justify-between text-sm">
                      <span>TVA:</span>
                      <span>{result.tva?.toFixed(2)} RON</span>
                    </div>
                  )}
                  {result.total && (
                    <div className="flex justify-between text-lg font-bold border-t pt-1">
                      <span>TOTAL:</span>
                      <span className="text-teal-600">{result.total?.toFixed(2)} RON</span>
                    </div>
                  )}
                </div>
              )}

              {/* Payment terms */}
              {result.paymentTerms && (
                <div className="text-sm">
                  <span className="text-gray-600">Termeni plată: </span>
                  <span className="font-medium">{result.paymentTerms}</span>
                </div>
              )}

              {/* Additional info */}
              {result.additionalInfo && (
                <div className="bg-blue-50 rounded p-3">
                  <p className="text-sm text-blue-800">{result.additionalInfo}</p>
                </div>
              )}

              {/* Raw text fallback */}
              {result.rawText && !result.items?.length && (
                <div className="bg-gray-50 rounded p-3">
                  <p className="text-xs font-medium text-gray-600 mb-1">Text extras:</p>
                  <pre className="text-xs whitespace-pre-wrap">{result.rawText}</pre>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-20">
              <div className="text-6xl mb-4">📸</div>
              <p className="text-gray-500">Încarcă un document pentru a extrage datele</p>
              <p className="text-xs text-gray-400 mt-2">Suport pentru facturi, comenzi, documente tehnice</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
