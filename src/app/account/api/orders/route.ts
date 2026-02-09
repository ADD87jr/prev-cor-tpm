import { NextRequest, NextResponse } from "next/server";
import { getUserOrders } from "../../usersDb";

export async function POST(req: NextRequest) {
  const { userId } = await req.json();
  if (!userId) return NextResponse.json({ error: "Lipsă userId" }, { status: 400 });
  const orders = getUserOrders(userId);
  return NextResponse.json(orders);
}
