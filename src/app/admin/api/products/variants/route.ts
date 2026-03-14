import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/app/utils/adminLog";
import { adminAuthMiddleware } from "@/lib/auth-middleware";

// GET - Obține variantele pentru un produs
export async function GET(req: NextRequest) {
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;
  const url = new URL(req.url);
  const productId = url.searchParams.get("productId");

  if (!productId) {
    return NextResponse.json({ error: "productId lipsă!" }, { status: 400 });
  }

  try {
    const variants = await (prisma as any).productVariant.findMany({
      where: { productId: Number(productId) },
      orderBy: { createdAt: "asc" },
    });
    
    // Păstrează moneda originală (EUR sau RON)
    const variantsWithCurrency = variants.map((v: any) => ({
      ...v,
      currency: v.currency || "RON",
    }));
    
    return NextResponse.json(variantsWithCurrency);
  } catch (err) {
    return NextResponse.json(
      { error: "Eroare la preluarea variantelor" },
      { status: 500 }
    );
  }
}

// POST - Creează o variantă nouă
export async function POST(req: NextRequest) {
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;
  try {
    const data = await req.json();
    const { productId, code, compatibil, greutate, stoc, pret, modAmbalare, descriere } = data;

    if (!productId || !code) {
      return NextResponse.json(
        { error: "productId și code sunt obligatorii!" },
        { status: 400 }
      );
    }

    const variant = await (prisma as any).productVariant.create({
      data: {
        productId: Number(productId),
        code,
        marime: data.marime || null,
        distantaSesizare: data.distantaSesizare || null,
        tipIesire: data.tipIesire || null,
        tipContact: data.tipContact || null,
        tensiune: data.tensiune || null,
        curent: data.curent || null,
        protectie: data.protectie || null,
        material: data.material || null,
        cablu: data.cablu || null,
        compatibil: compatibil || null,
        greutate: greutate ? Number(greutate) : null,
        stoc: Number(stoc) || 0,
        pret: pret ? Number(pret) : null,
        listPrice: data.listPrice ? Number(data.listPrice) : null,
        purchasePrice: data.purchasePrice ? Number(data.purchasePrice) : null,
        currency: data.currency || "RON",
        modAmbalare: modAmbalare || null,
        descriere: descriere || null,
        active: data.active !== undefined ? data.active : true,
        onDemand: data.onDemand || false,
      },
    });

    // Log admin action
    await logAdminAction({
      action: "CREATE",
      entity: "product_variant",
      entityId: variant.id,
      details: { productId, code, ...data },
      adminEmail: "admin",
    });

    return NextResponse.json(variant);
  } catch (err) {
    console.error("Eroare la creare variantă:", err);
    return NextResponse.json(
      { error: "Eroare la creare variantă" },
      { status: 500 }
    );
  }
}

// PUT - Actualizează o variantă
export async function PUT(req: NextRequest) {
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;
  try {
    const data = await req.json();
    const { id, productId, code, compatibil, compatibilEn, greutate, stoc, pret, modAmbalare, modAmbalareEn, descriere, descriereEn, active } = data;

    if (!id) {
      return NextResponse.json({ error: "ID variantă lipsă!" }, { status: 400 });
    }

    const updateData: any = {};
    if (code !== undefined) updateData.code = code;
    if (compatibil !== undefined) updateData.compatibil = compatibil;
    if (compatibilEn !== undefined) updateData.compatibilEn = compatibilEn;
    if (greutate !== undefined) updateData.greutate = greutate ? Number(greutate) : null;
    if (stoc !== undefined) updateData.stoc = Number(stoc);
    if (pret !== undefined) updateData.pret = pret ? Number(pret) : null;
    if (data.listPrice !== undefined) updateData.listPrice = data.listPrice ? Number(data.listPrice) : null;
    if (data.purchasePrice !== undefined) updateData.purchasePrice = data.purchasePrice ? Number(data.purchasePrice) : null;
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.marime !== undefined) updateData.marime = data.marime;
    if (data.distantaSesizare !== undefined) updateData.distantaSesizare = data.distantaSesizare;
    if (data.tipIesire !== undefined) updateData.tipIesire = data.tipIesire;
    if (data.tipContact !== undefined) updateData.tipContact = data.tipContact;
    if (data.tensiune !== undefined) updateData.tensiune = data.tensiune;
    if (data.curent !== undefined) updateData.curent = data.curent;
    if (data.protectie !== undefined) updateData.protectie = data.protectie;
    if (data.material !== undefined) updateData.material = data.material;
    if (data.cablu !== undefined) updateData.cablu = data.cablu;
    if (data.onDemand !== undefined) updateData.onDemand = data.onDemand;
    if (modAmbalare !== undefined) updateData.modAmbalare = modAmbalare;
    if (modAmbalareEn !== undefined) updateData.modAmbalareEn = modAmbalareEn;
    if (descriere !== undefined) updateData.descriere = descriere;
    if (descriereEn !== undefined) updateData.descriereEn = descriereEn;
    if (active !== undefined) updateData.active = active;

    const variant = await (prisma as any).productVariant.update({
      where: { id: Number(id) },
      data: updateData,
    });

    // Log admin action
    await logAdminAction({
      action: "UPDATE",
      entity: "product_variant",
      entityId: variant.id,
      details: updateData,
      adminEmail: "admin",
    });

    return NextResponse.json(variant);
  } catch (err) {
    console.error("Eroare la actualizare variantă:", err);
    return NextResponse.json(
      { error: "Eroare la actualizare variantă" },
      { status: 500 }
    );
  }
}

// DELETE - Șterge o variantă
export async function DELETE(req: NextRequest) {
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;
  try {
    const data = await req.json();
    const { id } = data;

    if (!id) {
      return NextResponse.json({ error: "ID variantă lipsă!" }, { status: 400 });
    }

    const variant = await (prisma as any).productVariant.delete({
      where: { id: Number(id) },
    });

    // Log admin action
    await logAdminAction({
      action: "DELETE",
      entity: "product_variant",
      entityId: variant.id,
      details: variant,
      adminEmail: "admin",
    });

    return NextResponse.json({ success: true, variant });
  } catch (err) {
    console.error("Eroare la ștergere variantă:", err);
    return NextResponse.json(
      { error: "Eroare la ștergere variantă" },
      { status: 500 }
    );
  }
}
