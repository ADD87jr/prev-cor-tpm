"use client";

import { useState, useEffect } from "react";

interface TopicSuggestion {
  title: string;
  description: string;
  targetKeywords: string[];
  difficulty: "easy" | "medium" | "hard";
  estimatedLength: string;
}

interface GeneratedArticle {
  title: string;
  metaTitle: string;
  metaDescription: string;
  slug: string;
  content: string;
  htmlContent: string;
  estimatedReadTime: string;
  keywords: string[];
  relatedProducts?: string[];
}

export default function AIBlogGeneratorPage() {
  const [suggestions, setSuggestions] = useState<TopicSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<TopicSuggestion | null>(null);
  const [customTopic, setCustomTopic] = useState("");
  const [targetKeywords, setTargetKeywords] = useState("");
  const [generatedArticle, setGeneratedArticle] = useState<GeneratedArticle | null>(null);
  const [showHtml, setShowHtml] = useState(false);

  useEffect(() => { loadSuggestions(); }, []);

  const loadSuggestions = async () => {
    setLoading(true);
    try {
      const res = await fetch("/admin/api/ai-blog-generator");
      const data = await res.json();
      setSuggestions(data.suggestions || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const generateArticle = async (topic?: TopicSuggestion) => {
    if (!topic && !customTopic.trim()) {
      alert("Introdu un subiect pentru articol!");
      return;
    }

    setGenerating(true);
    setSelectedTopic(topic || null);
    setGeneratedArticle(null);

    try {
      const res = await fetch("/admin/api/ai-blog-generator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topic?.title || customTopic,
          keywords: topic?.targetKeywords || targetKeywords.split(",").map(k => k.trim()).filter(Boolean)
        })
      });
      const data = await res.json();
      setGeneratedArticle(data);
    } catch (e) {
      console.error(e);
    }
    setGenerating(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Copiat în clipboard!");
  };

  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case "easy": return "bg-green-100 text-green-700";
      case "medium": return "bg-yellow-100 text-yellow-700";
      case "hard": return "bg-red-100 text-red-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">📝 AI Generator Articole Blog</h1>
      <p className="text-gray-600 mb-6">
        Generează articole SEO pentru blogul magazinului, optimizate pentru cuvinte cheie relevante.
      </p>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coloana stângă - Sugestii */}
          <div className="space-y-4">
            {/* Custom topic */}
            <div className="bg-white rounded-lg shadow p-5">
              <h2 className="text-lg font-semibold text-gray-700 mb-3">Subiect personalizat</h2>
              <input
                type="text"
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
                placeholder="Ex: Ghid alegere contactor electric"
                className="w-full border rounded px-3 py-2 text-sm mb-2"
              />
              <input
                type="text"
                value={targetKeywords}
                onChange={(e) => setTargetKeywords(e.target.value)}
                placeholder="Cuvinte cheie (separate cu virgulă)"
                className="w-full border rounded px-3 py-2 text-sm mb-3"
              />
              <button
                onClick={() => generateArticle()}
                disabled={generating || !customTopic.trim()}
                className="w-full bg-purple-600 text-white py-2 rounded font-medium hover:bg-purple-700 disabled:opacity-50"
              >
                {generating ? "Generez..." : "Generează Articol"}
              </button>
            </div>

            {/* Sugestii AI */}
            <div className="bg-white rounded-lg shadow p-5">
              <h2 className="text-lg font-semibold text-gray-700 mb-3">
                Subiecte Sugerate AI ({suggestions.length})
              </h2>
              
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {suggestions.map((topic, idx) => (
                  <div 
                    key={idx} 
                    className={`border rounded p-3 cursor-pointer hover:bg-gray-50 ${
                      selectedTopic === topic ? "border-purple-500 bg-purple-50" : ""
                    }`}
                    onClick={() => generateArticle(topic)}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <p className="font-medium text-gray-800 text-sm">{topic.title}</p>
                      <span className={`text-xs px-2 py-0.5 rounded ${getDifficultyColor(topic.difficulty)}`}>
                        {topic.difficulty}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mb-2">{topic.description}</p>
                    <div className="flex flex-wrap gap-1">
                      {topic.targetKeywords.slice(0, 3).map((kw, i) => (
                        <span key={i} className="text-xs bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded">
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Coloana dreaptă - Articol generat */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow p-5">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">
              Articol Generat
            </h2>

            {generating ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600 mb-4"></div>
                <p className="text-gray-600">Generez articolul SEO...</p>
                <p className="text-xs text-gray-400 mt-2">Acest proces poate dura 30-60 secunde</p>
              </div>
            ) : generatedArticle ? (
              <div className="space-y-4">
                {/* Meta info */}
                <div className="bg-gray-50 rounded p-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600">Meta Title:</span>
                    <button onClick={() => copyToClipboard(generatedArticle.metaTitle)} className="text-xs text-blue-600">📋 Copiază</button>
                  </div>
                  <p className="text-sm bg-white rounded p-2">{generatedArticle.metaTitle}</p>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600">Meta Description:</span>
                    <button onClick={() => copyToClipboard(generatedArticle.metaDescription)} className="text-xs text-blue-600">📋 Copiază</button>
                  </div>
                  <p className="text-sm bg-white rounded p-2">{generatedArticle.metaDescription}</p>

                  <div>
                    <span className="text-sm font-medium text-gray-600">Slug: </span>
                    <code className="text-sm bg-white rounded px-2 py-0.5">{generatedArticle.slug}</code>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>⏱️ {generatedArticle.estimatedReadTime}</span>
                    <span>•</span>
                    <div className="flex gap-1 flex-wrap">
                      {generatedArticle.keywords?.slice(0, 5).map((kw, i) => (
                        <span key={i} className="bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded text-xs">{kw}</span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Titlu */}
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-bold text-gray-800">{generatedArticle.title}</h3>
                  <button onClick={() => copyToClipboard(generatedArticle.title)} className="text-blue-600 text-sm">📋</button>
                </div>

                {/* Toggle HTML/Preview */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowHtml(false)}
                    className={`px-3 py-1 rounded text-sm ${!showHtml ? "bg-purple-600 text-white" : "bg-gray-200"}`}
                  >
                    Preview
                  </button>
                  <button
                    onClick={() => setShowHtml(true)}
                    className={`px-3 py-1 rounded text-sm ${showHtml ? "bg-purple-600 text-white" : "bg-gray-200"}`}
                  >
                    HTML
                  </button>
                  <button
                    onClick={() => copyToClipboard(generatedArticle.htmlContent || generatedArticle.content)}
                    className="ml-auto px-3 py-1 bg-green-600 text-white rounded text-sm"
                  >
                    📋 Copiază tot
                  </button>
                </div>

                {/* Content */}
                <div className="border rounded max-h-[500px] overflow-y-auto">
                  {showHtml ? (
                    <pre className="p-4 text-xs bg-gray-900 text-green-400 whitespace-pre-wrap">
                      {generatedArticle.htmlContent || generatedArticle.content}
                    </pre>
                  ) : (
                    <div
                      className="p-4 prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: generatedArticle.htmlContent || generatedArticle.content }}
                    />
                  )}
                </div>

                {/* Produse relate */}
                {generatedArticle.relatedProducts && generatedArticle.relatedProducts.length > 0 && (
                  <div>
                    <p className="font-medium text-gray-700 mb-2">Produse sugerate pentru link-uri:</p>
                    <div className="flex flex-wrap gap-2">
                      {generatedArticle.relatedProducts.map((p, i) => (
                        <span key={i} className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-sm">{p}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-20">
                <p className="text-gray-500 mb-2">Selectează un subiect sau introdu unul personalizat</p>
                <p className="text-xs text-gray-400">Articolul va fi optimizat SEO cu meta tags, headings și internal linking</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
