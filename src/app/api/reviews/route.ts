import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sanitizeInput, sanitizeName } from "@/lib/sanitize";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  // Rate limit: max 10 recenzii pe oră per IP
  const ip = getClientIp(req);
  const rateLimitError = checkRateLimit(req, `reviews:${ip}`, 10, 60 * 60 * 1000);
  if (rateLimitError) return rateLimitError;

  const data = await req.json();
  // așteaptă: { productId, user, rating, text }
  if (!data.productId || !data.user || !data.rating || !data.text) {
    return NextResponse.json({ error: "Date lipsă" }, { status: 400 });
  }

  // Sanitize user input
  const cleanUser = sanitizeName(data.user);
  const cleanText = sanitizeInput(data.text);

  if (!cleanUser || cleanUser.length < 2) {
    return NextResponse.json({ error: "Numele trebuie să aibă minim 2 caractere" }, { status: 400 });
  }

  if (!cleanText || cleanText.length < 10) {
    return NextResponse.json({ error: "Recenzia trebuie să aibă minim 10 caractere" }, { status: 400 });
  }

  if (cleanText.length > 1000) {
    return NextResponse.json({ error: "Recenzia nu poate depăși 1000 caractere" }, { status: 400 });
  }
  
  try {
    const review = await prisma.review.create({
      data: {
        productId: parseInt(data.productId),
        userName: cleanUser,
        rating: Math.min(5, Math.max(1, parseInt(data.rating))), // Force 1-5 range
        text: cleanText,
        approved: false, // necesită aprobare admin
      }
    });
    return NextResponse.json({ success: true, review });
  } catch (error) {
    return NextResponse.json({ error: "Eroare la salvare" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url!);
  const productId = searchParams.get("productId");
  const all = searchParams.get("all"); // pentru admin - toate review-urile
  
  if (all === "true") {
    const reviews = await prisma.review.findMany({
      orderBy: { createdAt: "desc" }
    });
    return NextResponse.json(reviews);
  }
  
  if (!productId) return NextResponse.json([]);
  
  const reviews = await prisma.review.findMany({
    where: { 
      productId: parseInt(productId),
      approved: true // doar cele aprobate pentru vizitatori
    },
    orderBy: { createdAt: "desc" }
  });
  
  return NextResponse.json(reviews.map(r => ({
    id: r.id,
    productId: r.productId,
    user: r.userName,
    rating: r.rating,
    text: r.text,
    date: r.createdAt.toISOString().slice(0, 10)
  })));
}
