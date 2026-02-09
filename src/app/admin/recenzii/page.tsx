"use client";

import { useEffect, useState } from "react";
import Toast from "@/components/Toast";

interface Review {
  id: number;
  productId: number;
  user: string;
  rating: number;
  text: string;
  date: string;
  approved: boolean;
}

export default function AdminRecenziiPage() {
  // Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  function showToast(message: string, type: 'success' | 'error' = 'success') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  }

  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'approved' | 'pending'>('all');

  useEffect(() => {
    fetch("/admin/api/reviews")
      .then((res) => res.json())
      .then((data) => {
        setReviews(data);
        setLoading(false);
      });
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm("Sigur vrei să ștergi această recenzie?")) return;
    
    const res = await fetch("/admin/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: 'delete', id }),
    });
    const data = await res.json();
    if (data.success) {
      setReviews(reviews.filter(r => r.id !== id));
      showToast("Recenzie ștearsă cu succes!", "success");
    } else {
      showToast("Eroare la ștergere recenzie!", "error");
    }
  };

  const handleToggle = async (id: number) => {
    const review = reviews.find(r => r.id === id);
    const res = await fetch("/admin/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: 'toggle', id }),
    });
    const data = await res.json();
    if (data.success) {
      setReviews(reviews.map(r => r.id === id ? { ...r, approved: !r.approved } : r));
      showToast(review?.approved ? "Recenzie dezaprobată!" : "Recenzie aprobată!", "success");
    } else {
      showToast("Eroare la modificare status!", "error");
    }
  };

  const filteredReviews = reviews.filter(r => {
    if (filter === 'approved') return r.approved;
    if (filter === 'pending') return !r.approved;
    return true;
  });

  const renderStars = (rating: number) => {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
  };

  if (loading) return <div className="p-8">Se încarcă...</div>;

  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} />}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-blue-900">Gestionare Recenzii</h1>
        <div className="flex gap-2 text-sm">
          <span className="text-gray-600">Total: {reviews.length}</span>
          <span className="text-green-600">Aprobate: {reviews.filter(r => r.approved).length}</span>
          <span className="text-orange-600">În așteptare: {reviews.filter(r => !r.approved).length}</span>
        </div>
      </div>

      {/* Filtre */}
      <div className="flex gap-2 mb-6">
        <button 
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
        >
          Toate ({reviews.length})
        </button>
        <button 
          onClick={() => setFilter('approved')}
          className={`px-4 py-2 rounded ${filter === 'approved' ? 'bg-green-600 text-white' : 'bg-gray-200'}`}
        >
          Aprobate ({reviews.filter(r => r.approved).length})
        </button>
        <button 
          onClick={() => setFilter('pending')}
          className={`px-4 py-2 rounded ${filter === 'pending' ? 'bg-orange-600 text-white' : 'bg-gray-200'}`}
        >
          În așteptare ({reviews.filter(r => !r.approved).length})
        </button>
      </div>

      {filteredReviews.length === 0 ? (
        <div className="text-center text-gray-500 py-8 bg-white rounded-lg">
          Nu există recenzii {filter === 'pending' ? 'în așteptare' : filter === 'approved' ? 'aprobate' : ''}.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReviews.map((review) => (
            <div
              key={review.id}
              className={`bg-white rounded-lg shadow p-4 border-l-4 ${
                review.approved ? "border-green-500" : "border-orange-400"
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-bold text-lg">{review.user}</span>
                    <span className="text-amber-500 text-lg">{renderStars(review.rating)}</span>
                    <span className="text-gray-400 text-sm">Produs #{review.productId}</span>
                    <span className="text-gray-400 text-sm">{review.date}</span>
                  </div>
                  <p className="text-gray-700">{review.text}</p>
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => handleToggle(review.id)}
                    className={`px-3 py-1 rounded text-sm ${
                      review.approved 
                        ? 'bg-orange-100 text-orange-700 hover:bg-orange-200' 
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {review.approved ? 'Dezaprobă' : 'Aprobă'}
                  </button>
                  <button
                    onClick={() => handleDelete(review.id)}
                    className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
                  >
                    Șterge
                  </button>
                </div>
              </div>
              {!review.approved && (
                <div className="mt-2 text-sm text-orange-600 bg-orange-50 px-2 py-1 rounded inline-block">
                  ⚠️ Această recenzie nu este vizibilă public
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
