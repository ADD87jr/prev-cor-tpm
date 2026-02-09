"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useLanguage } from "../_components/LanguageContext";

interface BlogPost {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  image: string | null;
  category: string | null;
  author: string | null;
  createdAt: string;
  published: boolean;
}

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const { language } = useLanguage();
  
  const txt = {
    title: language === "en" ? "Blog & News" : "Blog & Noutăți",
    subtitle: language === "en" 
      ? "Discover the latest articles about industrial automation, electrical equipment and industry news." 
      : "Descoperă cele mai recente articole despre automatizări industriale, echipamente electrice și noutăți din domeniu.",
    all: language === "en" ? "All" : "Toate",
    noArticles: language === "en" ? "No articles yet" : "Nu există articole încă",
    comeBackSoon: language === "en" ? "Come back soon for news!" : "Revino curând pentru noutăți!",
    by: language === "en" ? "by" : "de",
  };

  useEffect(() => {
    fetch("/api/blog?published=true")
      .then((res) => res.json())
      .then(setPosts)
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, []);

  const categories = [...new Set(posts.map((p) => p.category).filter(Boolean))];
  
  const filteredPosts = selectedCategory
    ? posts.filter((p) => p.category === selectedCategory)
    : posts;

  if (loading) {
    return (
      <main className="max-w-6xl mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-10 bg-gray-200 rounded w-48 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-gray-200 rounded-xl h-80"></div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold text-blue-700 mb-3">{txt.title}</h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          {txt.subtitle}
        </p>
      </div>

      {/* Categories filter */}
      {categories.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              selectedCategory === null
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            {txt.all}
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === cat
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Posts grid */}
      {filteredPosts.length === 0 ? (
        <div className="text-center py-16">
          <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
          </svg>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">{txt.noArticles}</h3>
          <p className="text-gray-500">{txt.comeBackSoon}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPosts.map((post) => (
            <Link
              key={post.id}
              href={`/blog/${post.slug}`}
              className="group bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-shadow"
            >
              {/* Image */}
              <div className="relative h-48 bg-gray-100">
                {post.image ? (
                  <Image
                    src={post.image}
                    alt={post.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-100 to-blue-200">
                    <svg className="w-16 h-16 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                )}
                {post.category && (
                  <span className="absolute top-3 left-3 bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                    {post.category}
                  </span>
                )}
              </div>
              
              {/* Content */}
              <div className="p-5">
                <h2 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">
                  {post.title}
                </h2>
                {post.excerpt && (
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">{post.excerpt}</p>
                )}
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>
                    {new Date(post.createdAt).toLocaleDateString(language === "en" ? "en-US" : "ro-RO", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                  {post.author && <span>{txt.by} {post.author}</span>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
