import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET - toate întrebările (admin)
export async function GET() {
  try {
    const questions = await prisma.productQuestion.findMany({
      orderBy: { createdAt: "desc" },
    });

    // Adaugă numele produsului
    const productIds = [...new Set(questions.map((q) => q.productId))];
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true },
    });
    const productMap = new Map(products.map((p) => [p.id, p.name]));

    const enriched = questions.map((q) => ({
      ...q,
      productName: productMap.get(q.productId) || `Produs #${q.productId}`,
    }));

    return NextResponse.json(enriched);
  } catch (error) {
    console.error("GET /admin/api/product-questions error:", error);
    return NextResponse.json([]);
  }
}

// POST - acțiuni admin (approve, answer, delete)
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action, id, answer, answeredBy } = body;

  if (!action || !id) {
    return NextResponse.json({ error: "action and id required" }, { status: 400 });
  }

  if (action === "approve") {
    await prisma.productQuestion.update({
      where: { id: parseInt(id) },
      data: { approved: true },
    });
    return NextResponse.json({ success: true });
  }

  if (action === "unapprove") {
    await prisma.productQuestion.update({
      where: { id: parseInt(id) },
      data: { approved: false },
    });
    return NextResponse.json({ success: true });
  }

  if (action === "answer") {
    if (!answer) {
      return NextResponse.json({ error: "answer required" }, { status: 400 });
    }
    await prisma.productQuestion.update({
      where: { id: parseInt(id) },
      data: {
        answer: String(answer).slice(0, 5000),
        answeredBy: answeredBy ? String(answeredBy).slice(0, 200) : "Admin",
        answeredAt: new Date(),
        approved: true,
      },
    });
    return NextResponse.json({ success: true });
  }

  if (action === "delete") {
    await prisma.productQuestion.delete({
      where: { id: parseInt(id) },
    });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
