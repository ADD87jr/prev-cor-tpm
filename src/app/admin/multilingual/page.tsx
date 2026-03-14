"use client";
import { useState, useEffect } from "react";

export default function MultilingualTranslatorPage() {
  const [info, setInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [translating, setTranslating] = useState(false);
  const [contentType, setContentType] = useState<"product" | "page" | "text">("text");
  const [products, setProducts] = useState<any[]>([]);
  const [pages, setPages] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [targetLang, setTargetLang] = useState("en");
  const [customText, setCustomText] = useState("");
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    fetch("/admin/api/ai-multilingual")
      .then(res => res.json())
      .then(data => {
        setInfo(data);
        setLoading(false);
      });

    fetch("/api/products?take=50")
      .then(res => res.json())
      .then(data => setProducts(Array.isArray(data) ? data : data.products || []));

    fetch("/api/pages")
      .then(res => res.json())
      .then(data => setPages(Array.isArray(data) ? data : []));
  }, []);

  const translate = async () => {
    setTranslating(true);
    setResult(null);
    try {
      const body: any = { targetLanguage: targetLang };
      if (contentType === "text") {
        body.customText = customText;
      } else {
        body.contentType = contentType;
        body.contentId = selectedId;
      }
      const res = await fetch("/admin/api/ai-multilingual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      setResult(await res.json());
    } catch (e) {
      console.error(e);
    }
    setTranslating(false);
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">🌐 Traduceri Multilingve AI</h1>
      <p className="text-gray-600 mb-6">Traduceri profesionale în 10 limbi europene</p>

      {/* Languages */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h3 className="font-semibold mb-3">Selectează Limba Țintă</h3>
        <div className="flex flex-wrap gap-2">
          {info?.supportedLanguages?.map((lang: any) => (
            <button
              key={lang.code}
              onClick={() => setTargetLang(lang.code)}
              className={`px-4 py-2 rounded-lg border transition ${
                targetLang === lang.code 
                  ? "bg-blue-600 text-white border-blue-600" 
                  : "bg-white hover:bg-gray-50"
              }`}
            >
              {lang.flag} {lang.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input */}
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-semibold mb-3">Conținut de Tradus</h3>
            
            <div className="flex gap-2 mb-4">
              {["text", "product", "page"].map(type => (
                <button
                  key={type}
                  onClick={() => { setContentType(type as any); setSelectedId(""); }}
                  className={`flex-1 py-2 rounded-lg border text-sm ${
                    contentType === type ? "bg-blue-600 text-white" : "bg-gray-50"
                  }`}
                >
                  {type === "text" ? "📝 Text Liber" : type === "product" ? "📦 Produs" : "📄 Pagină"}
                </button>
              ))}
            </div>

            {contentType === "text" ? (
              <textarea
                value={customText}
                onChange={e => setCustomText(e.target.value)}
                placeholder="Introdu textul de tradus în română..."
                className="w-full border rounded-lg p-3 h-40"
              />
            ) : (
              <select
                value={selectedId}
                onChange={e => setSelectedId(e.target.value)}
                className="w-full border rounded-lg p-2"
              >
                <option value="">-- Selectează {contentType === "product" ? "produs" : "pagină"} --</option>
                {(contentType === "product" ? products : pages).map((item: any) => (
                  <option key={item.id} value={item.id}>
                    {item.name || item.title}
                  </option>
                ))}
              </select>
            )}
          </div>

          <button
            onClick={translate}
            disabled={translating || (contentType === "text" ? !customText.trim() : !selectedId)}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-lg font-semibold disabled:opacity-50"
          >
            {translating ? "⏳ Traduc..." : `🌐 Traduce în ${info?.supportedLanguages?.find((l: any) => l.code === targetLang)?.name}`}
          </button>

          <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
            <h4 className="font-semibold mb-2">📊 Statistici</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>Produse: <strong>{info?.availableContent?.products}</strong></div>
              <div>Pagini: <strong>{info?.availableContent?.pages}</strong></div>
            </div>
          </div>
        </div>

        {/* Output */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b">
            <h3 className="font-semibold">Rezultat</h3>
          </div>
          
          {result?.translation ? (
            <div className="p-4 space-y-4 max-h-[500px] overflow-y-auto">
              {result.contentType === "text" && (
                <>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Original</p>
                    <p>{result.originalContent?.text}</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3 border-2 border-green-200">
                    <p className="text-xs text-green-600 mb-1">Traducere</p>
                    <p className="font-medium">{result.translation.translatedText}</p>
                  </div>
                </>
              )}

              {result.contentType === "product" && (
                <div className="space-y-3">
                  <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                    <p className="text-xs text-green-600">Nume</p>
                    <p className="font-bold">{result.translation.name}</p>
                  </div>
                  {result.translation.description && (
                    <div className="bg-blue-50 rounded-lg p-3">
                      <p className="text-xs text-blue-600">Descriere</p>
                      <p>{result.translation.description}</p>
                    </div>
                  )}
                  {result.translation.seoTitle && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500">SEO Title</p>
                      <p>{result.translation.seoTitle}</p>
                    </div>
                  )}
                </div>
              )}

              {result.contentType === "page" && (
                <div className="space-y-3">
                  <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                    <p className="text-xs text-green-600">Titlu</p>
                    <p className="font-bold">{result.translation.title}</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-xs text-blue-600">Conținut</p>
                    <div className="prose prose-sm" dangerouslySetInnerHTML={{ 
                      __html: result.translation.content?.slice(0, 800) || "" 
                    }} />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">
              <p className="text-4xl mb-3">🌐</p>
              <p>Introdu conținut pentru traducere</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
