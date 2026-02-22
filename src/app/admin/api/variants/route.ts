import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminAuthMiddleware } from "@/lib/auth-middleware";
// Prisma client regenerated with new ProductVariant fields

// GET - obține variantele pentru un produs
export async function GET(req: NextRequest) {
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const productId = searchParams.get("productId");

  if (!productId) {
    return NextResponse.json({ error: "productId required" }, { status: 400 });
  }

  try {
    const variants = await prisma.productVariant.findMany({
      where: { productId: Number(productId) },
      orderBy: { id: "asc" },
    });
    return NextResponse.json(variants);
  } catch (error) {
    console.error("[VARIANTS GET] Error:", error);
    return NextResponse.json({ error: "Eroare server" }, { status: 500 });
  }
}

// POST - adaugă variantă nouă
export async function POST(req: NextRequest) {
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;

  try {
    const body = await req.json();
    const { productId, code, marime, marimeEn, distantaSesizare, tipIesire, tipContact, tensiune, curent, protectie, material, cablu, compatibil, compatibilEn, greutate, stoc, pret, listPrice, purchasePrice, modAmbalare, modAmbalareEn, descriere, descriereEn, specsExtra, active, onDemand } = body;

    if (!productId || !code) {
      return NextResponse.json({ error: "productId și code sunt obligatorii" }, { status: 400 });
    }

    const variant = await prisma.productVariant.create({
      data: {
        productId: Number(productId),
        code,
        marime: marime || null,
        marimeEn: marimeEn || null,
        distantaSesizare: distantaSesizare || null,
        tipIesire: tipIesire || null,
        tipContact: tipContact || null,
        tensiune: tensiune || null,
        curent: curent || null,
        protectie: protectie || null,
        material: material || null,
        cablu: cablu || null,
        compatibil: compatibil || null,
        compatibilEn: compatibilEn || null,
        greutate: greutate ? Number(greutate) : null,
        stoc: Number(stoc) || 0,
        pret: pret ? Number(pret) : null,
        listPrice: listPrice ? Number(listPrice) : null,
        purchasePrice: purchasePrice ? Number(purchasePrice) : null,
        modAmbalare: modAmbalare || null,
        modAmbalareEn: modAmbalareEn || null,
        descriere: descriere || null,
        descriereEn: descriereEn || null,
        specsExtra: specsExtra || null,
        active: active !== false,
        onDemand: onDemand === true,
      },
    });

    return NextResponse.json(variant, { status: 201 });
  } catch (error) {
    console.error("[VARIANTS POST] Error:", error);
    return NextResponse.json({ error: "Eroare la adăugare variantă" }, { status: 500 });
  }
}

// PUT - actualizează variantă existentă
export async function PUT(req: NextRequest) {
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;

  try {
    const body = await req.json();
    const { id, code, marime, marimeEn, distantaSesizare, tipIesire, tipContact, tensiune, curent, protectie, material, cablu, compatibil, compatibilEn, greutate, stoc, pret, listPrice, purchasePrice, modAmbalare, modAmbalareEn, descriere, descriereEn, specsExtra, active, onDemand } = body;

    if (!id) {
      return NextResponse.json({ error: "id este obligatoriu" }, { status: 400 });
    }

    const variant = await prisma.productVariant.update({
      where: { id: Number(id) },
      data: {
        code,
        marime: marime || null,
        marimeEn: marimeEn || null,
        distantaSesizare: distantaSesizare || null,
        tipIesire: tipIesire || null,
        tipContact: tipContact || null,
        tensiune: tensiune || null,
        curent: curent || null,
        protectie: protectie || null,
        material: material || null,
        cablu: cablu || null,
        compatibil: compatibil || null,
        compatibilEn: compatibilEn || null,
        greutate: greutate ? Number(greutate) : null,
        stoc: Number(stoc) || 0,
        pret: pret ? Number(pret) : null,
        listPrice: listPrice ? Number(listPrice) : null,
        purchasePrice: purchasePrice ? Number(purchasePrice) : null,
        modAmbalare: modAmbalare || null,
        modAmbalareEn: modAmbalareEn || null,
        descriere: descriere || null,
        descriereEn: descriereEn || null,
        specsExtra: specsExtra || null,
        active: active !== false,
        onDemand: onDemand === true,
      },
    });

    return NextResponse.json(variant);
  } catch (error) {
    console.error("[VARIANTS PUT] Error:", error);
    return NextResponse.json({ error: "Eroare la actualizare variantă" }, { status: 500 });
  }
}

// DELETE - șterge variantă
export async function DELETE(req: NextRequest) {
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  try {
    await prisma.productVariant.delete({
      where: { id: Number(id) },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[VARIANTS DELETE] Error:", error);
    return NextResponse.json({ error: "Eroare la ștergere variantă" }, { status: 500 });
  }
}
