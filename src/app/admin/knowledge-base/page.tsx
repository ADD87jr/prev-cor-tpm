"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Article {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  createdAt: string;
  source: string;
  views: number;
}

export default function KnowledgeBasePage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [productType, setProductType] = useState("");

  useEffect(() => {
    loadArticles();
  }, []);

  async function loadArticles() {
    setLoading(true);
    try {
      let url = "/admin/api/ai-knowledge-base";
      const params = new URLSearchParams();
      if (searchTerm) params.append("search", searchTerm);
      if (filterCategory) params.append("category", filterCategory);
      if (params.toString()) url += `?${params}`;
      
      const res = await fetch(url);
      const data = await res.json();
      setArticles(data.articles || []);
      setCategories(data.categories || []);
      setStats(data.stats);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  async function generateContent(action: string, data?: any) {
    setGenerating(true);
    try {
      const res = await fetch("/admin/api/ai-knowledge-base", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, data })
      });
      const result = await res.json();
      alert(result.message || "Conținut generat!");
      loadArticles();
    } catch (e) {
      console.error(e);
    }
    setGenerating(false);
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/admin/ai-hub" className="text-blue-600 hover:underline text-sm">
            ← Înapoi la AI Hub
          </Link>
          <h1 className="text-2xl font-bold mt-2">📚 Knowledge Base AI</h1>
          <p className="text-gray-600">Bază de cunoștințe generată automat</p>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-100 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-blue-700">{stats.totalArticles}</div>
            <div className="text-sm text-blue-600">Total Articole</div>
          </div>
          <div className="bg-green-100 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-green-700">{stats.totalCategories}</div>
            <div className="text-sm text-green-600">Categorii</div>
          </div>
          <div className="bg-purple-100 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-purple-700">{stats.totalViews}</div>
            <div className="text-sm text-purple-600">Vizualizări Total</div>
          </div>
          <div className="bg-orange-100 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-orange-700">{categories.length}</div>
            <div className="text-sm text-orange-600">Categorii Active</div>
          </div>
        </div>
      )}

      {/* Generation Actions */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 border rounded-lg p-4 mb-6">
        <h3 className="font-semibold mb-3">🤖 Generare Conținut AI</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => generateContent("generate_faq")}
            disabled={generating}
            className="px-4 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {generating ? "..." : "📝 Generează FAQ din Produse"}
          </button>
          
          <button
            onClick={() => generateContent("generate_from_reviews")}
            disabled={generating}
            className="px-4 py-3 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            {generating ? "..." : "⭐ Extrage din Reviews"}
          </button>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Tip produs (ex: PLC)"
              value={productType}
              onChange={(e) => setProductType(e.target.value)}
              className="flex-1 px-3 py-2 border rounded"
            />
            <button
              onClick={() => generateContent("generate_guide", { productType })}
              disabled={generating || !productType}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
            >
              📖 Ghid
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Search & Filter */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white border rounded-lg p-4">
            <h3 className="font-semibold mb-3">🔍 Filtre</h3>
            <input
              type="text"
              placeholder="Caută..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border rounded mb-3"
            />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full px-3 py-2 border rounded mb-3"
            >
              <option value="">Toate categoriile</option>
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <button
              onClick={loadArticles}
              className="w-full px-4 py-2 bg-gray-800 text-white rounded"
            >
              Aplică Filtre
            </button>
          </div>

          {/* Categories breakdown */}
          {stats?.byCategory && (
            <div className="bg-white border rounded-lg p-4">
              <h3 className="font-semibold mb-3">📂 Per Categorie</h3>
              <div className="space-y-2">
                {stats.byCategory.map((cat: any) => (
                  <div key={cat.category} className="flex justify-between text-sm">
                    <span>{cat.category}</span>
                    <span className="bg-gray-200 px-2 rounded">{cat.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Articles List */}
        <div className="lg:col-span-2">
          {loading ? (
            <div className="text-center py-10">Se încarcă...</div>
          ) : articles.length === 0 ? (
            <div className="bg-gray-100 rounded-lg p-10 text-center text-gray-500">
              <div className="text-6xl mb-4">📚</div>
              <p>Nu există articole. Folosește butoanele de generare pentru a crea conținut.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {articles.map(article => (
                <div
                  key={article.id}
                  onClick={() => setSelectedArticle(article)}
                  className={`border rounded-lg p-4 cursor-pointer hover:bg-gray-50 ${
                    selectedArticle?.id === article.id ? "border-blue-500 bg-blue-50" : ""
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold">{article.title}</h3>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {article.content.substring(0, 150)}...
                      </p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                          {article.category}
                        </span>
                        {article.tags.slice(0, 3).map((tag, i) => (
                          <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="text-right text-xs text-gray-500">
                      <div>👁 {article.views}</div>
                      <div className="mt-1">{article.source}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Article Modal */}
      {selectedArticle && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white p-4 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold">{selectedArticle.title}</h2>
              <button
                onClick={() => setSelectedArticle(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="p-6">
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-sm rounded">
                  {selectedArticle.category}
                </span>
                {selectedArticle.tags.map((tag, i) => (
                  <span key={i} className="px-2 py-1 bg-gray-100 text-gray-600 text-sm rounded">
                    {tag}
                  </span>
                ))}
              </div>
              <div className="prose max-w-none whitespace-pre-wrap">
                {selectedArticle.content}
              </div>
              <div className="mt-6 pt-4 border-t text-sm text-gray-500">
                <div>Sursă: {selectedArticle.source}</div>
                <div>Creat: {new Date(selectedArticle.createdAt).toLocaleString("ro-RO")}</div>
                <div>Vizualizări: {selectedArticle.views}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
