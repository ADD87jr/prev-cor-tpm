import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import BlogPostShareButtons from "./BlogPostShareButtons";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await prisma.blogPost.findUnique({ where: { slug } });
  if (!post) return { title: "Articol negăsit | PREV-COR TPM" };
  return {
    title: `${post.title} | Blog PREV-COR TPM`,
    description: post.excerpt || post.title,
    openGraph: {
      title: post.title,
      description: post.excerpt || post.title,
      type: "article",
      publishedTime: post.createdAt.toISOString(),
      authors: post.author ? [post.author] : undefined,
      images: post.image ? [{ url: post.image }] : undefined,
    },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const post = await prisma.blogPost.findUnique({ where: { slug } });
  if (!post || !post.published) return notFound();

  // Articole similare din aceeași categorie
  let relatedPosts: any[] = [];
  if (post.category) {
    relatedPosts = await prisma.blogPost.findMany({
      where: { published: true, category: post.category, id: { not: post.id } },
      take: 3,
      orderBy: { createdAt: "desc" },
    });
  }

  const pageUrl = `https://prevcortpm.ro/blog/${post.slug}`;
  const tags = (post.tags as string[]) || [];

  return (
    <main className="max-w-4xl mx-auto p-6">
      {/* Breadcrumb */}
      <nav className="mb-6">
        <ol className="flex items-center gap-2 text-sm text-gray-600">
          <li><Link href="/" className="hover:text-blue-600">Acasă</Link></li>
          <li>/</li>
          <li><Link href="/blog" className="hover:text-blue-600">Blog</Link></li>
          <li>/</li>
          <li className="text-gray-900 font-medium truncate max-w-[200px]">{post.title}</li>
        </ol>
      </nav>

      {/* Featured image */}
      {post.image && (
        <div className="relative aspect-video rounded-xl overflow-hidden mb-8">
          <Image
            src={post.image}
            alt={post.title}
            fill
            className="object-cover"
            sizes="(max-width: 896px) 100vw, 896px"
            priority
          />
        </div>
      )}

      {/* Category & date */}
      <div className="flex items-center gap-4 mb-4 text-sm">
        {post.category && (
          <Link 
            href={`/blog?category=${post.category}`}
            className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full hover:bg-blue-200 transition-colors"
          >
            {post.category}
          </Link>
        )}
        <span className="text-gray-500">
          {new Date(post.createdAt).toLocaleDateString("ro-RO", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </span>
        {post.author && (
          <span className="text-gray-500">de <strong>{post.author}</strong></span>
        )}
      </div>

      {/* Title */}
      <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">{post.title}</h1>

      {/* Content */}
      <article 
        className="prose prose-lg max-w-none mb-12"
        dangerouslySetInnerHTML={{ __html: post.content }}
      />

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-8">
          {tags.map((tag: string, index: number) => (
            <span
              key={index}
              className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Share buttons */}
      <BlogPostShareButtons title={post.title} url={pageUrl} />

      {/* Related posts */}
      {relatedPosts.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Articole similare</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {relatedPosts.map((related) => (
              <Link
                key={related.id}
                href={`/blog/${related.slug}`}
                className="group bg-white rounded-lg shadow hover:shadow-md transition-shadow overflow-hidden"
              >
                <div className="relative h-32 bg-gray-100">
                  {related.image ? (
                    <Image
                      src={related.image}
                      alt={related.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-100 to-blue-200">
                      <svg className="w-10 h-10 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                    {related.title}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Back link */}
      <Link
        href="/blog"
        className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Înapoi la blog
      </Link>
    </main>
  );
}
