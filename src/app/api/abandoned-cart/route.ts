import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Cast pentru a include modelul AbandonedCart (regenerează clientul Prisma după restart)
const db = prisma as any;

// POST - salvează coșul când utilizatorul ajunge la checkout
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, phone, items, total } = body;
    
    if (!email || !items || items.length === 0) {
      return NextResponse.json({ error: "Email și produse sunt necesare" }, { status: 400 });
    }
    
    // Verifică dacă există deja un coș pentru acest email
    const existing = await db.abandonedCart.findFirst({
      where: { 
        email,
        recovered: false,
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // ultimele 24 ore
        }
      }
    });
    
    if (existing) {
      // Actualizează coșul existent
      const updated = await db.abandonedCart.update({
        where: { id: existing.id },
        data: { items, total, phone, updatedAt: new Date() }
      });
      return NextResponse.json({ success: true, cart: updated, updated: true });
    }
    
    // Creează un coș nou
    const cart = await db.abandonedCart.create({
      data: { email, phone, items, total }
    });
    
    return NextResponse.json({ success: true, cart });
  } catch (error) {
    console.error("Error saving abandoned cart:", error);
    return NextResponse.json({ error: "Eroare la salvare" }, { status: 500 });
  }
}

// DELETE - marchează coșul ca recovered când se finalizează comanda
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");
    
    if (!email) {
      return NextResponse.json({ error: "Email necesar" }, { status: 400 });
    }
    
    // Marchează toate coșurile nerecuperate ale acestui email
    await db.abandonedCart.updateMany({
      where: { email, recovered: false },
      data: { recovered: true }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error marking cart as recovered:", error);
    return NextResponse.json({ error: "Eroare" }, { status: 500 });
  }
}

// GET - pentru admin, listează coșurile abandonate
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get("days") || "7");
    
    const carts = await db.abandonedCart.findMany({
      where: {
        recovered: false,
        createdAt: {
          gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000)
        }
      },
      orderBy: { createdAt: "desc" }
    });
    
    return NextResponse.json(carts);
  } catch (error) {
    console.error("Error fetching abandoned carts:", error);
    return NextResponse.json([]); // Returnează array gol în caz de eroare
  }
}
