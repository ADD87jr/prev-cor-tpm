import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET - obține întrebările aprobate pentru un produs
export async function GET(req: NextRequest) {
  const productId = req.nextUrl.searchParams.get("productId");
  if (!productId) {
    return NextResponse.json({ error: "productId required" }, { status: 400 });
  }

  const questions = await prisma.productQuestion.findMany({
    where: {
      productId: parseInt(productId),
      approved: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(questions);
}

// POST - trimite o întrebare nouă (vizitator)
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { productId, userName, email, question } = body;

  if (!productId || !userName || !question) {
    return NextResponse.json(
      { error: "productId, userName and question are required" },
      { status: 400 }
    );
  }

  if (typeof question !== "string" || question.length > 2000) {
    return NextResponse.json(
      { error: "Question too long" },
      { status: 400 }
    );
  }

  const newQuestion = await prisma.productQuestion.create({
    data: {
      productId: parseInt(productId),
      userName: String(userName).slice(0, 200),
      email: email ? String(email).slice(0, 200) : null,
      question: String(question).slice(0, 2000),
      approved: false,
    },
  });

  return NextResponse.json({ success: true, id: newQuestion.id });
}
