"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function SocialMediaPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [content, setContent] = useState<any>(null);
  const [calendar, setCalendar] = useState<any[]>([]);
  const [generatingCalendar, setGeneratingCalendar] = useState(false);
  
  const [config, setConfig] = useState({
    platform: "facebook",
    tone: "profesional",
    includeEmojis: true,
    includeHashtags: true,
    goal: "engagement"
  });

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    setLoading(true);
    try {
      const res = await fetch("/admin/api/ai-social-media");
      const data = await res.json();
      setProducts(data.products || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  async function generatePost() {
    if (!selectedProduct) return;
    setGenerating(true);
    try {
      const res = await fetch("/admin/api/ai-social-media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate-post",
          productId: selectedProduct.id,
          productName: selectedProduct.name,
          productDescription: selectedProduct.description,
          price: selectedProduct.price,
          ...config
        })
      });
      const data = await res.json();
      setContent(data.content);
    } catch (e) {
      console.error(e);
    }
    setGenerating(false);
  }

  async function generateCalendar() {
    setGeneratingCalendar(true);
    try {
      const res = await fetch("/admin/api/ai-social-media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate-calendar",
          products: products.slice(0, 10).map(p => ({
            id: p.id,
            name: p.name,
            category: p.category
          }))
        })
      });
      const data = await res.json();
      setCalendar(data.calendar || []);
    } catch (e) {
      console.error(e);
    }
    setGeneratingCalendar(false);
  }

  const platformIcons: Record<string, string> = {
    facebook: "📘",
    instagram: "📸",
    linkedin: "💼",
    twitter: "🐦"
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/admin/ai-hub" className="text-blue-600 hover:underline text-sm">
            ← Înapoi la AI Hub
          </Link>
          <h1 className="text-2xl font-bold mt-2">📱 Generator Social Media</h1>
          <p className="text-gray-600">Generează postări pentru rețele sociale</p>
        </div>
        <button
          onClick={generateCalendar}
          disabled={generatingCalendar}
          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
        >
          {generatingCalendar ? "..." : "📅 Calendar Lunar"}
        </button>
      </div>

      {/* Calendar Preview */}
      {calendar.length > 0 && (
        <div className="mb-6 bg-purple-50 border border-purple-200 rounded-lg p-4">
          <h3 className="font-semibold text-purple-800 mb-3">📅 Calendar Postări</h3>
          <div className="grid grid-cols-7 gap-2 text-xs">
            {["Lun", "Mar", "Mie", "Joi", "Vin", "Sâm", "Dum"].map(d => (
              <div key={d} className="font-bold text-center">{d}</div>
            ))}
            {calendar.slice(0, 28).map((day, i) => (
              <div key={i} className={`p-2 rounded text-center ${
                day.hasPost ? "bg-green-100" : "bg-gray-100"
              }`}>
                <div className="font-bold">{i + 1}</div>
                {day.hasPost && (
                  <div className="text-xs truncate">{day.platform}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Products */}
        <div>
          <h3 className="font-semibold mb-3">📦 Selectează Produs</h3>
          {loading ? (
            <div className="text-center py-10">Se încarcă...</div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {products.slice(0, 30).map(p => (
                <div
                  key={p.id}
                  onClick={() => setSelectedProduct(p)}
                  className={`p-3 border rounded cursor-pointer hover:bg-gray-50 ${
                    selectedProduct?.id === p.id ? "border-blue-500 bg-blue-50" : ""
                  }`}
                >
                  <div className="font-medium text-sm line-clamp-2">{p.name}</div>
                  <div className="text-xs text-gray-500">{p.category}</div>
                  <div className="text-sm font-bold text-blue-600 mt-1">
                    {p.price?.toLocaleString()} RON
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Config */}
        <div>
          <h3 className="font-semibold mb-3">⚙️ Configurație</h3>
          <div className="bg-white border rounded-lg p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Platformă</label>
              <div className="grid grid-cols-2 gap-2">
                {["facebook", "instagram", "linkedin", "twitter"].map(p => (
                  <button
                    key={p}
                    onClick={() => setConfig({...config, platform: p})}
                    className={`p-2 rounded border text-sm ${
                      config.platform === p ? "border-blue-500 bg-blue-50" : "hover:bg-gray-50"
                    }`}
                  >
                    {platformIcons[p]} {p}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Ton</label>
              <select
                value={config.tone}
                onChange={e => setConfig({...config, tone: e.target.value})}
                className="w-full px-3 py-2 border rounded"
              >
                <option value="profesional">Profesional</option>
                <option value="casual">Casual</option>
                <option value="entuziast">Entuziast</option>
                <option value="informativ">Informativ</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Obiectiv</label>
              <select
                value={config.goal}
                onChange={e => setConfig({...config, goal: e.target.value})}
                className="w-full px-3 py-2 border rounded"
              >
                <option value="engagement">Engagement</option>
                <option value="sales">Vânzări</option>
                <option value="awareness">Brand Awareness</option>
                <option value="traffic">Traffic Site</option>
              </select>
            </div>

            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.includeEmojis}
                  onChange={e => setConfig({...config, includeEmojis: e.target.checked})}
                />
                Emoji-uri
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.includeHashtags}
                  onChange={e => setConfig({...config, includeHashtags: e.target.checked})}
                />
                Hashtag-uri
              </label>
            </div>

            <button
              onClick={generatePost}
              disabled={generating || !selectedProduct}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {generating ? "Se generează..." : "🤖 Generează Postare"}
            </button>
          </div>
        </div>

        {/* Generated Content */}
        <div>
          <h3 className="font-semibold mb-3">📝 Conținut Generat</h3>
          
          {!content ? (
            <div className="bg-gray-100 rounded-lg p-6 text-center text-gray-500 text-sm">
              Selectează un produs și generează postare
            </div>
          ) : (
            <div className="space-y-4">
              {/* Main Post */}
              <div className="bg-white border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">{platformIcons[config.platform]}</span>
                  <span className="font-medium capitalize">{config.platform}</span>
                </div>
                <div className="text-sm whitespace-pre-line">{content.mainPost}</div>
                
                {content.hashtags && (
                  <div className="text-blue-600 text-sm mt-2">
                    {content.hashtags.join(" ")}
                  </div>
                )}
              </div>

              {/* Variants */}
              {content.variants && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">🔄 Variante</h4>
                  {content.variants.map((v: string, i: number) => (
                    <div key={i} className="bg-gray-50 p-3 rounded text-sm">
                      {v}
                    </div>
                  ))}
                </div>
              )}

              {/* CTA Suggestions */}
              {content.ctaSuggestions && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <h4 className="font-medium text-green-800 text-sm mb-1">📣 CTA</h4>
                  <ul className="list-disc ml-4 text-sm">
                    {content.ctaSuggestions.map((c: string, i: number) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Best Time */}
              {content.bestPostingTime && (
                <div className="text-xs text-gray-500">
                  ⏰ Cel mai bun moment: {content.bestPostingTime}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
