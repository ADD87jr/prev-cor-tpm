import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type WishlistItem = { id: number; name: string; image: string };

// POST: Adaugă produs la wishlist pentru user
export async function POST(req: NextRequest) {
  const { userEmail, productId, name, image } = await req.json();
  if (!userEmail || !productId) {
    return NextResponse.json({ error: "Email și productId necesare" }, { status: 400 });
  }
  // Caută sau creează wishlist pentru user
  let wishlist = await prisma.wishlist.findUnique({ where: { email: userEmail } });
  if (!wishlist) {
    wishlist = await prisma.wishlist.create({ data: { email: userEmail, items: [] } });
  }
  // Adaugă produs dacă nu există deja
  const items = (wishlist.items ?? []) as WishlistItem[];
  const exists = items.some((item) => item.id === productId);
  if (!exists) {
    const newItems = [...items, { id: productId, name, image }];
    wishlist = await prisma.wishlist.update({
      where: { email: userEmail },
      data: { items: newItems }
    });
  }
  return NextResponse.json({ success: true, wishlist });
}

// DELETE: Elimină produs din wishlist
export async function DELETE(req: NextRequest) {
  const { userEmail, productId } = await req.json();
  if (!userEmail || !productId) {
    return NextResponse.json({ error: "Email și productId necesare" }, { status: 400 });
  }
  let wishlist = await prisma.wishlist.findUnique({ where: { email: userEmail } });
  if (!wishlist) {
    return NextResponse.json({ error: "Wishlist inexistent" }, { status: 404 });
  }
  const items = (wishlist.items ?? []) as WishlistItem[];
  const newItems = items.filter((item) => item.id !== productId);
  wishlist = await prisma.wishlist.update({
    where: { email: userEmail },
    data: { items: newItems }
  });
  return NextResponse.json({ success: true, wishlist });
}

// GET: Returnează wishlist pentru user
export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email");
  if (!email) return NextResponse.json({ error: "Email necesar" }, { status: 400 });
  const wishlist = await prisma.wishlist.findUnique({ where: { email } });
  return NextResponse.json({ wishlist });
}
