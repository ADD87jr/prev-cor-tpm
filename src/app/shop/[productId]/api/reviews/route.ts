import { NextRequest, NextResponse } from "next/server";
import { addReview, getReviews } from "../../reviewsDb";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const productId = Number(searchParams.get("productId"));
  if (!productId) return NextResponse.json([]);
  return NextResponse.json(getReviews(productId));
}

export async function POST(req: NextRequest) {
  const { productId, user, rating, text } = await req.json();
  if (!productId || !user || !rating || !text) {
    return NextResponse.json({ error: "Date lipsă" }, { status: 400 });
  }
  const review = addReview({ productId, user, rating, text });
  return NextResponse.json(review);
}
