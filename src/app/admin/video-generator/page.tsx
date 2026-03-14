"use client";
import { useState, useEffect } from "react";

export default function VideoGeneratorPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [videoType, setVideoType] = useState("showcase");
  const [duration, setDuration] = useState(45);
  const [targetAudience, setTargetAudience] = useState("Ingineri și tehnicieni industriali");
  const [generating, setGenerating] = useState(false);
  const [script, setScript] = useState<any>(null);

  const downloadJSON = () => {
    if (!script) return;
    const blob = new Blob([JSON.stringify(script, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `script-video-${script.product?.sku || "produs"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadTXT = () => {
    if (!script?.script) return;
    const s = script.script;
    let txt = `SCRIPT VIDEO: ${s.title}\n`;
    txt += `Produs: ${script.product?.name}\n`;
    txt += `Durată: ${script.duration}s | Tip: ${script.videoType}\n`;
    txt += `${"=".repeat(50)}\n\n`;
    txt += `🎣 HOOK:\n${s.hook}\n\n`;
    txt += `🎬 SCENE:\n`;
    s.scenes?.forEach((sc: any, i: number) => {
      txt += `\n--- Scena ${sc.nr || sc.sceneNumber || (i + 1)} (${sc.sec || sc.duration || ""}) ---\n`;
      txt += `Visual: ${sc.visual}\n`;
      txt += `Narațiune: ${sc.narration}\n`;
      if (sc.text) txt += `Text ecran: ${sc.text}\n`;
    });
    const ctaText = typeof s.cta === "string" ? s.cta : (s.callToAction?.text || s.cta?.text || "");
    txt += `\n🎯 CALL TO ACTION:\n${ctaText}\n`;
    if (s.callToAction?.visual) txt += `Visual: ${s.callToAction.visual}\n`;
    txt += `\n🎵 Muzică: ${s.music || s.musicStyle || ""}\n`;
    if (s.thumbnailIdea) txt += `🖼️ Thumbnail: ${s.thumbnailIdea}\n`;
    if (s.hashtags) txt += `\n#${s.hashtags.join(" #")}\n`;
    
    const blob = new Blob([txt], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `script-video-${script.product?.sku || "produs"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = () => {
    if (!script?.script) return;
    const s = script.script;
    let txt = `${s.title}\n\n${s.hook}\n\n`;
    s.scenes?.forEach((sc: any, i: number) => {
      txt += `[Scena ${sc.nr || sc.sceneNumber || (i + 1)}] ${sc.narration}\n`;
    });
    const ctaText = typeof s.cta === "string" ? s.cta : (s.callToAction?.text || s.cta?.text || "");
    txt += `\n${ctaText}`;
    navigator.clipboard.writeText(txt);
    alert("Script copiat în clipboard!");
  };

  useEffect(() => {
    fetch("/admin/api/ai-video-generator")
      .then(res => res.json())
      .then(data => {
        setProducts(data.products || []);
        setStats(data.stats);
        setLoading(false);
      });
  }, []);

  const generateScript = async () => {
    if (!selectedProduct) return;
    setGenerating(true);
    try {
      const res = await fetch("/admin/api/ai-video-generator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: selectedProduct, videoType, duration, targetAudience })
      });
      const data = await res.json();
      setScript(data);
    } catch (e) {
      console.error(e);
    }
    setGenerating(false);
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
      <h1 className="text-2xl font-bold mb-2">🎬 Generator Video AI</h1>
      <p className="text-gray-600 mb-6">Creează scripturi video pentru produse</p>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{stats?.totalProducts || 0}</p>
          <p className="text-gray-600 text-sm">Produse disponibile</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{stats?.videosGenerated || 0}</p>
          <p className="text-gray-600 text-sm">Scripturi generate</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <p className="text-2xl font-bold text-purple-600">{stats?.avgVideoLength}</p>
          <p className="text-gray-600 text-sm">Durată medie</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <p className="text-2xl font-bold text-orange-600">4</p>
          <p className="text-gray-600 text-sm">Tipuri video</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Config Panel */}
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-semibold mb-3">🎯 Configurare Video</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Produs</label>
                <select
                  value={selectedProduct}
                  onChange={e => setSelectedProduct(e.target.value)}
                  className="w-full border rounded-lg p-2"
                >
                  <option value="">-- Selectează produs --</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">Tip Video</label>
                <select
                  value={videoType}
                  onChange={e => setVideoType(e.target.value)}
                  className="w-full border rounded-lg p-2"
                >
                  <option value="showcase">📺 Prezentare caracteristici</option>
                  <option value="promo">🎯 Promoțional (Social Media)</option>
                  <option value="tutorial">📖 Tutorial instalare</option>
                  <option value="comparison">⚖️ Comparativ</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">Durată (secunde)</label>
                <input
                  type="range"
                  min="15"
                  max="120"
                  step="15"
                  value={duration}
                  onChange={e => setDuration(parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>15s</span>
                  <span className="font-bold">{duration}s</span>
                  <span>120s</span>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">Audiență țintă</label>
                <input
                  type="text"
                  value={targetAudience}
                  onChange={e => setTargetAudience(e.target.value)}
                  className="w-full border rounded-lg p-2"
                />
              </div>
            </div>

            <button
              onClick={generateScript}
              disabled={generating || !selectedProduct}
              className="w-full mt-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 disabled:opacity-50"
            >
              {generating ? "⏳ Generez scriptul..." : "🎬 Generează Script Video"}
            </button>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-100">
            <h4 className="font-semibold mb-2">💡 Formate suportate</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              {stats?.supportedFormats?.map((f: string, i: number) => (
                <li key={i}>✓ {f}</li>
              ))}
            </ul>
          </div>

          <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
            <h4 className="font-medium text-yellow-800 mb-2">ℹ️ Notă</h4>
            <p className="text-sm text-yellow-700">
              Scripturile generate pot fi folosite cu platforme AI video precum 
              Synthesia, D-ID, HeyGen sau Pictory pentru generare automată.
            </p>
          </div>
        </div>

        {/* Script Preview */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow">
          <div className="p-4 border-b flex justify-between items-center">
            <h3 className="font-semibold">📝 Script Video</h3>
            {script?.script && (
              <div className="flex gap-2">
                <button
                  onClick={copyToClipboard}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm flex items-center gap-1"
                >
                  📋 Copiază
                </button>
                <button
                  onClick={downloadTXT}
                  className="px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-sm flex items-center gap-1"
                >
                  📄 TXT
                </button>
                <button
                  onClick={downloadJSON}
                  className="px-3 py-1.5 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg text-sm flex items-center gap-1"
                >
                  📦 JSON
                </button>
                <button
                  onClick={() => setScript(null)}
                  className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm flex items-center gap-1"
                >
                  🗑️ Resetează
                </button>
              </div>
            )}
          </div>
          
          {script?.script ? (
            <div className="p-4 space-y-4 max-h-[700px] overflow-y-auto">
              {/* Header */}
              <div className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg p-4">
                <h2 className="text-xl font-bold">{script.script.title}</h2>
                <p className="text-sm text-gray-600 mt-1">
                  {script.product?.name} | {script.duration}s | {script.videoType}
                </p>
              </div>

              {/* Hook */}
              <div className="bg-yellow-50 rounded-lg p-3 border-l-4 border-yellow-400">
                <p className="text-xs text-yellow-700 mb-1">🎣 HOOK (primele 3 secunde)</p>
                <p className="font-medium">{script.script.hook}</p>
              </div>

              {/* Scenes */}
              <div>
                <h4 className="font-semibold mb-3">🎬 Scene</h4>
                <div className="space-y-3">
                  {script.script.scenes?.map((scene: any, i: number) => (
                    <div key={i} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-bold text-blue-600">Scena {scene.nr || scene.sceneNumber || (i + 1)}</span>
                        <span className="text-sm text-gray-500">{scene.sec || scene.duration || ""}</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-gray-500">📹 Visual</p>
                          <p>{scene.visual}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">🎙️ Narațiune</p>
                          <p>{scene.narration}</p>
                        </div>
                      </div>
                      {scene.text && (
                        <div className="mt-2 bg-white rounded p-2 text-center border">
                          <p className="text-xs text-gray-500">Text pe ecran</p>
                          <p className="font-medium">{scene.text}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* CTA */}
              {(script.script.cta || script.script.callToAction) && (
                <div className="bg-green-50 rounded-lg p-4 border-2 border-green-200">
                  <p className="text-xs text-green-700 mb-1">🎯 CALL TO ACTION</p>
                  <p className="font-bold text-lg">
                    {typeof script.script.cta === "string" ? script.script.cta : (script.script.callToAction?.text || script.script.cta?.text || "")}
                  </p>
                  {script.script.callToAction?.visual && (
                    <p className="text-sm text-gray-600 mt-1">{script.script.callToAction.visual}</p>
                  )}
                </div>
              )}

              {/* Production Notes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(script.script.music || script.script.musicStyle) && (
                  <div className="bg-purple-50 rounded-lg p-3">
                    <h4 className="font-medium mb-2">🎵 Muzică</h4>
                    <p className="text-sm">{script.script.music || script.script.musicStyle}</p>
                  </div>
                )}
                {script.script.thumbnailIdea && (
                  <div className="bg-blue-50 rounded-lg p-3">
                    <h4 className="font-medium mb-2">🖼️ Thumbnail</h4>
                    <p className="text-sm">{script.script.thumbnailIdea}</p>
                  </div>
                )}
              </div>

              {/* Hashtags */}
              {script.script.hashtags && (
                <div className="flex flex-wrap gap-2">
                  {script.script.hashtags.map((tag: string, i: number) => (
                    <span key={i} className="bg-gray-100 px-3 py-1 rounded-full text-sm">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Platform Specific */}
              {script.script.platforms && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium mb-3">📱 Optimizat pentru platforme</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                    {script.script.platforms.youtube && (
                      <div className="bg-red-50 rounded p-2">
                        <p className="font-bold text-red-600">YouTube</p>
                        <p className="text-xs mt-1">{script.script.platforms.youtube.titleOptimized}</p>
                      </div>
                    )}
                    {script.script.platforms.linkedin && (
                      <div className="bg-blue-50 rounded p-2">
                        <p className="font-bold text-blue-600">LinkedIn</p>
                        <p className="text-xs mt-1">{script.script.platforms.linkedin.postText?.slice(0, 100)}...</p>
                      </div>
                    )}
                    {script.script.platforms.instagram && (
                      <div className="bg-pink-50 rounded p-2">
                        <p className="font-bold text-pink-600">Instagram</p>
                        <p className="text-xs mt-1">{script.script.platforms.instagram.caption?.slice(0, 100)}...</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Impact */}
              {script.script.estimatedImpact && (
                <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4">
                  <h4 className="font-medium mb-2">📊 Impact Estimat</h4>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-sm text-gray-600">Engagement</p>
                      <p className="font-bold">{script.script.estimatedImpact.engagement}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Potențial conversie</p>
                      <p className="font-bold">{script.script.estimatedImpact.conversionPotential}/10</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Postare optimă</p>
                      <p className="font-bold text-xs">{script.script.estimatedImpact.bestPostingTime}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">
              <p className="text-4xl mb-3">🎬</p>
              <p>Configurează opțiunile și generează un script video</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
