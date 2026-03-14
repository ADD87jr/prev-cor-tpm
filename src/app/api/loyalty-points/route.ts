import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET - obține punctele de fidelitate ale unui utilizator
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  const email = req.nextUrl.searchParams.get("email");

  if (!userId && !email) {
    return NextResponse.json({ error: "userId or email required" }, { status: 400 });
  }

  let userIdNum: number | undefined;

  if (userId) {
    userIdNum = parseInt(userId);
  } else if (email) {
    // Găsește userId din email
    const user = await prisma.user.findUnique({ where: { email: email } });
    if (!user) {
      return NextResponse.json({ totalPoints: 0, history: [] });
    }
    userIdNum = user.id;
  }

  if (!userIdNum) {
    return NextResponse.json({ totalPoints: 0, history: [] });
  }

  const history = await prisma.loyaltyPoints.findMany({
    where: { userId: userIdNum },
    orderBy: { createdAt: "desc" },
  });

  const totalPoints = history.reduce((sum, h) => sum + h.points, 0);

  return NextResponse.json({ totalPoints, history });
}

// POST - adaugă puncte (intern sau la finalizare comandă)
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { userId, points, reason, orderId } = body;

  if (!userId || !points || !reason) {
    return NextResponse.json({ error: "userId, points and reason required" }, { status: 400 });
  }

  const validReasons = ["purchase", "review", "referral", "redeem", "bonus"];
  if (!validReasons.includes(reason)) {
    return NextResponse.json({ error: "Invalid reason" }, { status: 400 });
  }

  const entry = await prisma.loyaltyPoints.create({
    data: {
      userId: parseInt(userId),
      points: parseInt(points),
      reason,
      orderId: orderId ? parseInt(orderId) : null,
    },
  });

  return NextResponse.json({ success: true, entry });
}
