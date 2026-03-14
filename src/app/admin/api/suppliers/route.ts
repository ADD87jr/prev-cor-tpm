import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminAuthMiddleware } from "@/lib/auth-middleware";

const db = prisma as any;

// GET — listează furnizori (+produsele lor)
export async function GET(req: NextRequest) {
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;

  try {
    const suppliers = await db.supplier.findMany({
      include: { products: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ suppliers });
  } catch (error) {
    console.error("[SUPPLIERS] GET Error:", error);
    return NextResponse.json({ error: "Eroare server" }, { status: 500 });
  }
}

// POST — adaugă furnizor
export async function POST(req: NextRequest) {
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;

  try {
    const body = await req.json();
    const { name, contactPerson, email, phone, website, cui, address, notes, rating } = body;

    if (!name) {
      return NextResponse.json({ error: "Numele furnizorului este obligatoriu" }, { status: 400 });
    }

    const supplier = await db.supplier.create({
      data: { name, contactPerson, email, phone, website, cui, address, notes, rating: rating ? parseInt(rating) : null },
    });
    return NextResponse.json(supplier);
  } catch (error) {
    console.error("[SUPPLIERS] POST Error:", error);
    return NextResponse.json({ error: "Eroare la creare" }, { status: 500 });
  }
}

// PUT — actualizează furnizor
export async function PUT(req: NextRequest) {
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;

  try {
    const body = await req.json();
    const { id, ...data } = body;

    if (!id) return NextResponse.json({ error: "ID lipsă" }, { status: 400 });

    if (data.rating) data.rating = parseInt(data.rating);
    data.updatedAt = new Date();

    const supplier = await db.supplier.update({ where: { id: parseInt(id) }, data });
    return NextResponse.json(supplier);
  } catch (error) {
    console.error("[SUPPLIERS] PUT Error:", error);
    return NextResponse.json({ error: "Eroare la actualizare" }, { status: 500 });
  }
}

// DELETE — șterge furnizor
export async function DELETE(req: NextRequest) {
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID lipsă" }, { status: 400 });

    await db.supplier.delete({ where: { id: parseInt(id) } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[SUPPLIERS] DELETE Error:", error);
    return NextResponse.json({ error: "Eroare la ștergere" }, { status: 500 });
  }
}
