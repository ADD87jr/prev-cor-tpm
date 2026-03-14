"use client";

import { useState, useEffect } from "react";

interface Review {
  id: number;
  productId: number;
  productName: string;
  productType: string;
  reviewer: string;
  rating: number;
  comment: string;
  date: string;
  approved: boolean;
}

interface KeyTheme {
  theme: string;
  mentions: number;
  sentiment: string;
}

interface ActionRec {
  priority: string;
  action: string;
  impact: string;
}

interface AnalysisResult {
  reviewsAnalyzed: number;
  overallSentiment: string;
  sentimentScore: number;
  keyThemes: KeyTheme[];
  positiveHighlights: string[];
  issuesIdentified: string[];
  productInsights: string[];
  serviceInsights: string[];
  actionableRecommendations: ActionRec[];
  competitiveAdvantages: string[];
  improvementAreas: string[];
}

export default function AIReviewAnalysisPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);

  useEffect(() => { loadReviews(); }, []);

  const loadReviews = async () => {
    setLoading(true);
    try {
      const res = await fetch("/admin/api/ai-review-analysis");
      const data = await res.json();
      setReviews(data.reviews || []);
      setStats(data.stats);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const analyzeReviews = async (productId?: number) => {
    setAnalyzing(true);
    setResult(null);
    setSelectedProductId(productId || null);

    try {
      const res = await fetch("/admin/api/ai-review-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productId ? { productId } : { analyzeAll: true })
      });
      const data = await res.json();
      setResult(data);
    } catch (e) {
      console.error(e);
    }
    setAnalyzing(false);
  };

  const getSentimentColor = (sentiment: string) => {
    if (sentiment === "positive") return "bg-green-100 text-green-700";
    if (sentiment === "negative") return "bg-red-100 text-red-700";
    return "bg-yellow-100 text-yellow-700";
  };

  const getSentimentIcon = (sentiment: string) => {
    if (sentiment === "positive") return "😊";
    if (sentiment === "negative") return "😟";
    return "😐";
  };

  const getRatingStars = (rating: number) => {
    return "⭐".repeat(rating) + "☆".repeat(5 - rating);
  };

  // Grupează pe produse
  const productGroups = reviews.reduce((acc, r) => {
    if (!acc[r.productId]) {
      acc[r.productId] = { name: r.productName, reviews: [] };
    }
    acc[r.productId].reviews.push(r);
    return acc;
  }, {} as Record<number, { name: string; reviews: Review[] }>);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">📝 AI Analiză Reviews</h1>
      <p className="text-gray-600 mb-6">
        Extrage insight-uri valoroase din feedback-ul clienților.
      </p>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-600"></div>
        </div>
      ) : (
        <>
          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-5 gap-3 mb-6">
              <div className="bg-white rounded-lg shadow p-3 text-center">
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-gray-500">Total reviews</p>
              </div>
              <div className="bg-amber-50 rounded-lg shadow p-3 text-center">
                <p className="text-2xl font-bold text-amber-600">{stats.avgRating}⭐</p>
                <p className="text-xs text-amber-500">Rating mediu</p>
              </div>
              <div className="bg-green-50 rounded-lg shadow p-3 text-center">
                <p className="text-2xl font-bold text-green-600">{stats.distribution?.[5] || 0}</p>
                <p className="text-xs text-green-500">5 stele</p>
              </div>
              <div className="bg-red-50 rounded-lg shadow p-3 text-center">
                <p className="text-2xl font-bold text-red-600">{(stats.distribution?.[1] || 0) + (stats.distribution?.[2] || 0)}</p>
                <p className="text-xs text-red-500">1-2 stele</p>
              </div>
              <div className="bg-orange-50 rounded-lg shadow p-3 text-center">
                <p className="text-2xl font-bold text-orange-600">{stats.pending}</p>
                <p className="text-xs text-orange-500">În așteptare</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Lista reviews */}
            <div className="space-y-4">
              {/* Analiză globală */}
              <button
                onClick={() => analyzeReviews()}
                disabled={analyzing}
                className="w-full bg-amber-600 text-white py-3 rounded-lg font-medium hover:bg-amber-700 disabled:opacity-50"
              >
                {analyzing && !selectedProductId ? "Analizez..." : "🔍 Analizează Toate Review-urile"}
              </button>

              {/* Produse cu reviews */}
              <div className="bg-white rounded-lg shadow p-5">
                <h3 className="font-semibold text-gray-700 mb-3">Reviews pe Produse</h3>
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {Object.entries(productGroups).map(([productId, data]) => {
                    const avgRating = data.reviews.reduce((s, r) => s + r.rating, 0) / data.reviews.length;
                    return (
                      <div 
                        key={productId}
                        className={`border rounded p-2 cursor-pointer hover:bg-amber-50 ${
                          selectedProductId === parseInt(productId) ? "border-amber-500 bg-amber-50" : ""
                        }`}
                        onClick={() => analyzeReviews(parseInt(productId))}
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{data.name}</p>
                            <p className="text-xs text-gray-500">{data.reviews.length} reviews</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm">{avgRating.toFixed(1)}⭐</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Ultimele reviews */}
              <div className="bg-white rounded-lg shadow p-5">
                <h3 className="font-semibold text-gray-700 mb-3">Ultimele Reviews</h3>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {reviews.slice(0, 10).map(review => (
                    <div key={review.id} className="border-b pb-2 text-xs">
                      <div className="flex justify-between">
                        <span className="font-medium">{review.reviewer}</span>
                        <span>{getRatingStars(review.rating)}</span>
                      </div>
                      <p className="text-gray-600 truncate">{review.comment || "Fără comentariu"}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Rezultat analiză */}
            <div className="lg:col-span-2 bg-white rounded-lg shadow p-5">
              <h2 className="text-lg font-semibold text-gray-700 mb-4">Analiză Sentiment</h2>

              {analyzing ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-600 mb-4"></div>
                  <p className="text-gray-600">Analizez feedback-ul...</p>
                </div>
              ) : result ? (
                <div className="space-y-4">
                  {/* Sentiment general */}
                  <div className={`rounded-lg p-5 ${getSentimentColor(result.overallSentiment)}`}>
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium">Sentiment general</p>
                        <p className="text-3xl font-bold">
                          {getSentimentIcon(result.overallSentiment)} {
                            result.overallSentiment === "positive" ? "Pozitiv" :
                            result.overallSentiment === "negative" ? "Negativ" : "Neutru"
                          }
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm">Scor sentiment</p>
                        <p className="text-4xl font-bold">{result.sentimentScore}/100</p>
                      </div>
                    </div>
                    <p className="text-sm mt-2">Bazat pe {result.reviewsAnalyzed} review-uri</p>
                  </div>

                  {/* Key themes */}
                  {result.keyThemes && result.keyThemes.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-700 mb-2">📊 Teme principale:</h4>
                      <div className="flex flex-wrap gap-2">
                        {result.keyThemes.map((theme, i) => (
                          <span 
                            key={i} 
                            className={`px-3 py-1 rounded-full text-sm ${getSentimentColor(theme.sentiment)}`}
                          >
                            {theme.theme} ({theme.mentions}x)
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Positive / Issues */}
                  <div className="grid grid-cols-2 gap-4">
                    {result.positiveHighlights && result.positiveHighlights.length > 0 && (
                      <div className="bg-green-50 rounded-lg p-4">
                        <h4 className="font-medium text-green-800 mb-2">✅ Puncte pozitive:</h4>
                        <ul className="space-y-1">
                          {result.positiveHighlights.map((h, i) => (
                            <li key={i} className="text-sm text-green-700">• {h}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {result.issuesIdentified && result.issuesIdentified.length > 0 && (
                      <div className="bg-red-50 rounded-lg p-4">
                        <h4 className="font-medium text-red-800 mb-2">⚠️ Probleme identificate:</h4>
                        <ul className="space-y-1">
                          {result.issuesIdentified.map((issue, i) => (
                            <li key={i} className="text-sm text-red-700">• {issue}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Insights */}
                  <div className="grid grid-cols-2 gap-4">
                    {result.productInsights && result.productInsights.length > 0 && (
                      <div className="bg-blue-50 rounded-lg p-3">
                        <h4 className="text-sm font-medium text-blue-800 mb-1">📦 Produse:</h4>
                        <ul className="space-y-1">
                          {result.productInsights.map((ins, i) => (
                            <li key={i} className="text-xs text-blue-700">• {ins}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {result.serviceInsights && result.serviceInsights.length > 0 && (
                      <div className="bg-purple-50 rounded-lg p-3">
                        <h4 className="text-sm font-medium text-purple-800 mb-1">🛎️ Servicii:</h4>
                        <ul className="space-y-1">
                          {result.serviceInsights.map((ins, i) => (
                            <li key={i} className="text-xs text-purple-700">• {ins}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Actionable recommendations */}
                  {result.actionableRecommendations && result.actionableRecommendations.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-700 mb-2">📋 Recomandări acționabile:</h4>
                      <div className="space-y-2">
                        {result.actionableRecommendations.map((rec, i) => (
                          <div key={i} className="bg-gray-50 rounded p-3 flex items-start gap-3">
                            <span className={`px-2 py-0.5 rounded text-xs ${
                              rec.priority === "high" ? "bg-red-100 text-red-700" :
                              rec.priority === "medium" ? "bg-yellow-100 text-yellow-700" :
                              "bg-green-100 text-green-700"
                            }`}>
                              {rec.priority}
                            </span>
                            <div className="flex-1">
                              <p className="text-sm font-medium">{rec.action}</p>
                              <p className="text-xs text-gray-500">{rec.impact}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Competitive advantages */}
                  {result.competitiveAdvantages && result.competitiveAdvantages.length > 0 && (
                    <div className="bg-emerald-50 rounded-lg p-4">
                      <h4 className="font-medium text-emerald-800 mb-2">🏆 Avantaje competitive:</h4>
                      <ul className="space-y-1">
                        {result.competitiveAdvantages.map((adv, i) => (
                          <li key={i} className="text-sm text-emerald-700">• {adv}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-20">
                  <p className="text-gray-500">Selectează un produs sau analizează toate review-urile</p>
                  <p className="text-xs text-gray-400 mt-2">AI extrage teme, sentiment și recomandări</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
