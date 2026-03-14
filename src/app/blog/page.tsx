import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import BlogListClient from "./BlogListClient";

export const metadata: Metadata = {
  title: "Blog & Noutăți | PREV-COR TPM",
  description: "Articole despre automatizări industriale, echipamente electrice și noutăți din domeniu. Blog PREV-COR TPM.",
  openGraph: {
    title: "Blog & Noutăți | PREV-COR TPM",
    description: "Articole despre automatizări industriale, echipamente electrice și noutăți din domeniu.",
  },
};

export default async function BlogPage() {
  let posts: any[] = [];
  try {
    posts = await prisma.blogPost.findMany({
      where: { published: true },
      orderBy: { createdAt: "desc" },
    });
    // Serializare date pentru client
    posts = posts.map((p) => ({
      ...p,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }));
  } catch (e) {
    console.error("Error fetching blog posts:", e);
  }

  return (
    <main className="max-w-6xl mx-auto p-6">
      {/* Header - SSR pentru SEO */}
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold text-blue-700 mb-3">Blog &amp; Noutăți</h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Descoperă cele mai recente articole despre automatizări industriale, echipamente electrice și noutăți din domeniu.
        </p>
      </div>

      <BlogListClient posts={posts} />
    </main>
  );
}
