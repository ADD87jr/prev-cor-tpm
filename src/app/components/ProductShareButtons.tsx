"use client";

export default function ProductShareButtons({ productName, productId }: { productName: string; productId: number }) {
  const url = typeof window !== "undefined" 
    ? window.location.href 
    : `https://prevcortpm.ro/shop/${productId}`;
  
  return (
    <div className="flex items-center gap-3 flex-wrap mt-6 pt-4 border-t">
      <span className="text-sm font-semibold text-gray-600">Distribuie:</span>
      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700 transition-colors"
      >
        Facebook
      </a>
      <a
        href={`https://api.whatsapp.com/send?text=${encodeURIComponent(productName + " " + url)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 bg-green-500 text-white px-3 py-1.5 rounded text-sm hover:bg-green-600 transition-colors"
      >
        WhatsApp
      </a>
      <a
        href={`https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(url)}&title=${encodeURIComponent(productName)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 bg-blue-800 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-900 transition-colors"
      >
        LinkedIn
      </a>
      <button
        onClick={() => {
          if (navigator.clipboard) {
            navigator.clipboard.writeText(url);
          }
        }}
        className="inline-flex items-center gap-1 bg-gray-200 text-gray-700 px-3 py-1.5 rounded text-sm hover:bg-gray-300 transition-colors"
      >
        📋 Copiază link
      </button>
    </div>
  );
}
