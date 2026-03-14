import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminAuthMiddleware } from "@/lib/auth-middleware";

const db = prisma as any;

// POST — adaugă produs la furnizor
export async function POST(req: NextRequest) {
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;

  try {
    const body = await req.json();
    const { supplierId, productId, supplierCode, supplierPrice, currency, minQuantity, deliveryDays } = body;

    if (!supplierId || !productId || !supplierPrice) {
      return NextResponse.json({ error: "supplierId, productId și supplierPrice sunt obligatorii" }, { status: 400 });
    }

    const sp = await db.supplierProduct.create({
      data: {
        supplierId: parseInt(supplierId),
        productId: parseInt(productId),
        supplierCode,
        supplierPrice: parseFloat(supplierPrice),
        currency: currency || "EUR",
        minQuantity: minQuantity ? parseInt(minQuantity) : 1,
        deliveryDays: deliveryDays ? parseInt(deliveryDays) : null,
      },
    });
    return NextResponse.json(sp);
  } catch (error) {
    console.error("[SUPPLIER-PRODUCTS] POST Error:", error);
    return NextResponse.json({ error: "Eroare la adăugare" }, { status: 500 });
  }
}

// PUT — actualizează legătura furnizor-produs
export async function PUT(req: NextRequest) {
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;

  try {
    const body = await req.json();
    const { id, supplierCode, supplierPrice, currency, minQuantity, deliveryDays } = body;

    if (!id) {
      return NextResponse.json({ error: "ID obligatoriu pentru actualizare" }, { status: 400 });
    }

    const sp = await db.supplierProduct.update({
      where: { id: parseInt(id) },
      data: {
        supplierCode,
        supplierPrice: supplierPrice ? parseFloat(supplierPrice) : undefined,
        currency: currency || "EUR",
        minQuantity: minQuantity ? parseInt(minQuantity) : 1,
        deliveryDays: deliveryDays ? parseInt(deliveryDays) : null,
        lastUpdated: new Date(),
      },
    });
    return NextResponse.json(sp);
  } catch (error) {
    console.error("[SUPPLIER-PRODUCTS] PUT Error:", error);
    return NextResponse.json({ error: "Eroare la actualizare" }, { status: 500 });
  }
}

// DELETE — șterge legătura furnizor-produs
export async function DELETE(req: NextRequest) {
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID lipsă" }, { status: 400 });

    await db.supplierProduct.delete({ where: { id: parseInt(id) } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[SUPPLIER-PRODUCTS] DELETE Error:", error);
    return NextResponse.json({ error: "Eroare la ștergere" }, { status: 500 });
  }
}

// GET — compară prețuri furnizori pentru un produs sau listează produsele unui furnizor
export async function GET(req: NextRequest) {
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("productId");
    const supplierId = searchParams.get("supplierId");

    if (supplierId) {
      // Produsele asociate unui furnizor specific
      const products = await db.supplierProduct.findMany({
        where: { supplierId: parseInt(supplierId) },
        orderBy: { supplierPrice: "asc" },
      });
      // Adaugă numele produsului și variantei
      const allProducts = await db.product.findMany({ select: { id: true, name: true } });
      const productsMap = Object.fromEntries(allProducts.map((p: any) => [p.id, p.name]));
      
      // Obține variantele pentru a afișa codul/numele lor
      const allVariants = await db.productVariant.findMany({ select: { id: true, code: true, pret: true } });
      const variantsMap = Object.fromEntries(allVariants.map((v: any) => [v.id, v]));
      
      const enriched = products.map((sp: any) => {
        const variant = sp.variantId ? variantsMap[sp.variantId] : null;
        return {
          ...sp,
          product: { name: productsMap[sp.productId] || `#${sp.productId}` },
          variant: variant ? { id: variant.id, code: variant.code } : null
        };
      });
      return NextResponse.json(enriched);
    }

    if (productId) {
      // Compară prețuri pentru un produs specific
      const prices = await db.supplierProduct.findMany({
        where: { productId: parseInt(productId) },
        include: { supplier: { select: { id: true, name: true, rating: true, active: true } } },
        orderBy: { supplierPrice: "asc" },
      });
      return NextResponse.json(prices);
    }

    // Toate legăturile furnizor-produs
    const all = await db.supplierProduct.findMany({
      include: { supplier: { select: { id: true, name: true } } },
      orderBy: { supplierPrice: "asc" },
    });
    return NextResponse.json(all);
  } catch (error) {
    console.error("[SUPPLIER-PRODUCTS] GET Error:", error);
    return NextResponse.json({ error: "Eroare server" }, { status: 500 });
  }
}
