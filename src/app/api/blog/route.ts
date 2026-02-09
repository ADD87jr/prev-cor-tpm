import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET - listare articole blog
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");
  const category = searchParams.get("category");
  const published = searchParams.get("published");
  
  try {
    if (slug) {
      // Get single post by slug
      const post = await prisma.blogPost.findUnique({
        where: { slug },
      });
      if (!post) {
        return NextResponse.json({ error: "Post not found" }, { status: 404 });
      }
      return NextResponse.json(post);
    }
    
    // Get all posts
    const where: any = {};
    if (category) where.category = category;
    if (published !== null) where.published = published === "true";
    
    const posts = await prisma.blogPost.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(posts);
  } catch (error) {
    console.error("Error fetching blog posts:", error);
    return NextResponse.json({ error: "Failed to fetch posts" }, { status: 500 });
  }
}

// POST - creare articol nou (admin)
export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    
    // Generate slug from title if not provided
    if (!data.slug && data.title) {
      data.slug = data.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
    }
    
    const post = await prisma.blogPost.create({
      data: {
        title: data.title,
        slug: data.slug,
        content: data.content || "",
        excerpt: data.excerpt || null,
        image: data.image || null,
        author: data.author || null,
        category: data.category || null,
        tags: data.tags || null,
        published: data.published ?? false,
      },
    });
    return NextResponse.json(post, { status: 201 });
  } catch (error: any) {
    console.error("Error creating blog post:", error);
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Slug already exists" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
  }
}

// PUT - actualizare articol
export async function PUT(req: NextRequest) {
  try {
    const data = await req.json();
    if (!data.id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }
    
    const post = await prisma.blogPost.update({
      where: { id: data.id },
      data: {
        title: data.title,
        slug: data.slug,
        content: data.content,
        excerpt: data.excerpt,
        image: data.image,
        author: data.author,
        category: data.category,
        tags: data.tags,
        published: data.published,
        updatedAt: new Date(),
      },
    });
    return NextResponse.json(post);
  } catch (error) {
    console.error("Error updating blog post:", error);
    return NextResponse.json({ error: "Failed to update post" }, { status: 500 });
  }
}

// DELETE - ștergere articol
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    
    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }
    
    await prisma.blogPost.delete({
      where: { id: parseInt(id) },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting blog post:", error);
    return NextResponse.json({ error: "Failed to delete post" }, { status: 500 });
  }
}
