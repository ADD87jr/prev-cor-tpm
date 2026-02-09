"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface BlogPost {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  image: string | null;
  category: string | null;
  author: string | null;
  published: boolean;
  createdAt: string;
}

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [form, setForm] = useState({
    title: "",
    slug: "",
    content: "",
    excerpt: "",
    image: "",
    category: "",
    author: "",
    published: false,
  });
  const [saving, setSaving] = useState(false);

  const loadPosts = () => {
    fetch("/api/blog")
      .then((res) => res.json())
      .then(setPosts)
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadPosts();
  }, []);

  const resetForm = () => {
    setForm({
      title: "",
      slug: "",
      content: "",
      excerpt: "",
      image: "",
      category: "",
      author: "",
      published: false,
    });
    setEditingPost(null);
    setShowEditor(false);
  };

  const handleEdit = (post: BlogPost) => {
    setEditingPost(post);
    // Fetch full post content
    fetch(`/api/blog?slug=${post.slug}`)
      .then((res) => res.json())
      .then((data) => {
        setForm({
          title: data.title || "",
          slug: data.slug || "",
          content: data.content || "",
          excerpt: data.excerpt || "",
          image: data.image || "",
          category: data.category || "",
          author: data.author || "",
          published: data.published || false,
        });
        setShowEditor(true);
      });
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Ești sigur că vrei să ștergi acest articol?")) return;
    
    await fetch(`/api/blog?id=${id}`, { method: "DELETE" });
    loadPosts();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const method = editingPost ? "PUT" : "POST";
      const body = editingPost ? { ...form, id: editingPost.id } : form;
      
      const res = await fetch("/api/blog", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        loadPosts();
        resetForm();
      } else {
        const err = await res.json();
        alert(err.error || "Eroare la salvare");
      }
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async (post: BlogPost) => {
    await fetch("/api/blog", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: post.id, published: !post.published }),
    });
    loadPosts();
  };

  if (loading) {
    return <div className="p-8">Se încarcă...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-blue-700">Administrare Blog</h1>
        <button
          onClick={() => {
            resetForm();
            setShowEditor(true);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
        >
          + Articol nou
        </button>
      </div>

      {/* Editor Modal */}
      {showEditor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">
                  {editingPost ? "Editează articol" : "Articol nou"}
                </h2>
                <button onClick={resetForm} className="text-gray-500 hover:text-gray-700">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-1">Titlu *</label>
                    <input
                      type="text"
                      required
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      className="w-full border rounded px-3 py-2"
                      placeholder="Titlul articolului"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">Slug (URL)</label>
                    <input
                      type="text"
                      value={form.slug}
                      onChange={(e) => setForm({ ...form, slug: e.target.value })}
                      className="w-full border rounded px-3 py-2"
                      placeholder="generat-automat-din-titlu"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-1">Categorie</label>
                    <input
                      type="text"
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      className="w-full border rounded px-3 py-2"
                      placeholder="Automatizări"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">Autor</label>
                    <input
                      type="text"
                      value={form.author}
                      onChange={(e) => setForm({ ...form, author: e.target.value })}
                      className="w-full border rounded px-3 py-2"
                      placeholder="Nume autor"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1">Imagine URL</label>
                    <input
                      type="text"
                      value={form.image}
                      onChange={(e) => setForm({ ...form, image: e.target.value })}
                      className="w-full border rounded px-3 py-2"
                      placeholder="/uploads/imagine.jpg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1">Rezumat (excerpt)</label>
                  <textarea
                    value={form.excerpt}
                    onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    rows={2}
                    placeholder="Un scurt rezumat al articolului..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1">Conținut (HTML) *</label>
                  <textarea
                    required
                    value={form.content}
                    onChange={(e) => setForm({ ...form, content: e.target.value })}
                    className="w-full border rounded px-3 py-2 font-mono text-sm"
                    rows={12}
                    placeholder="<p>Conținutul articolului...</p>"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="published"
                    checked={form.published}
                    onChange={(e) => setForm({ ...form, published: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <label htmlFor="published" className="font-semibold">Publicat</label>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 border rounded-lg hover:bg-gray-100"
                  >
                    Anulează
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? "Se salvează..." : "Salvează"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Posts table */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold">Titlu</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Categorie</th>
              <th className="px-4 py-3 text-center text-sm font-semibold">Status</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Data</th>
              <th className="px-4 py-3 text-right text-sm font-semibold">Acțiuni</th>
            </tr>
          </thead>
          <tbody>
            {posts.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  Nu există articole. Creează primul articol!
                </td>
              </tr>
            ) : (
              posts.map((post) => (
                <tr key={post.id} className="border-t hover:bg-blue-50">
                  <td className="px-4 py-3">
                    <Link href={`/blog/${post.slug}`} className="text-blue-600 hover:underline font-medium">
                      {post.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{post.category || "-"}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => togglePublish(post)}
                      className={`px-2 py-1 text-xs rounded-full font-semibold ${
                        post.published
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {post.published ? "Publicat" : "Draft"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {new Date(post.createdAt).toLocaleDateString("ro-RO")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleEdit(post)}
                      className="text-blue-600 hover:underline text-sm mr-3"
                    >
                      Editează
                    </button>
                    <button
                      onClick={() => handleDelete(post.id)}
                      className="text-red-600 hover:underline text-sm"
                    >
                      Șterge
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
