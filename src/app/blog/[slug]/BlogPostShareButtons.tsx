"use client";

export default function BlogPostShareButtons({ title, url }: { title: string; url: string }) {
  return (
    <div className="border-t border-b py-6 mb-8">
      <div className="flex items-center gap-4 flex-wrap">
        <span className="font-semibold text-gray-700">Distribuie:</span>
        <a
          href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
        >
          Facebook
        </a>
        <a
          href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-sky-500 text-white px-4 py-2 rounded hover:bg-sky-600 transition-colors"
        >
          Twitter
        </a>
        <a
          href={`https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-blue-800 text-white px-4 py-2 rounded hover:bg-blue-900 transition-colors"
        >
          LinkedIn
        </a>
        <a
          href={`https://api.whatsapp.com/send?text=${encodeURIComponent(title + " " + url)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition-colors"
        >
          WhatsApp
        </a>
      </div>
    </div>
  );
}
