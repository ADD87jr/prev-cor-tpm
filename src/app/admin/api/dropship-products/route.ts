import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { convertToRon, getEurToRonRate } from "@/lib/exchange-rate";

// Sincronizează prețul produsului din magazin cu prețul dropship (curs BNR)
async function syncProductPrice(productId: number | null, yourPrice: number, currency: string) {
  if (!productId) return;
  
  const priceInRON = await convertToRon(yourPrice, currency);
  
  try {
    await prisma.product.update({
      where: { id: productId },
      data: { 
        price: priceInRON,
        currency: "RON"
      }
    });
  } catch (error) {
    console.error("Error syncing product price:", error);
  }
}

// GET - Lista produse dropship
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const supplierId = searchParams.get("supplierId");
    const search = searchParams.get("search");

    const where: Record<string, unknown> = {};
    
    if (status && status !== "all") {
      where.status = status;
    }
    if (supplierId) {
      where.supplierId = parseInt(supplierId);
    }
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { supplierCode: { contains: search } },
      ];
    }

    const products = await prisma.dropshipProduct.findMany({
      where,
      orderBy: { updatedAt: "desc" },
    });

    // Calculeaza marja pentru fiecare produs
    const productsWithMargin = products.map(p => ({
      ...p,
      marginPercent: ((p.yourPrice - p.supplierPrice) / p.supplierPrice * 100).toFixed(1),
    }));

    return NextResponse.json(productsWithMargin);
  } catch (error) {
    console.error("Error fetching dropship products:", error);
    return NextResponse.json({ error: "Eroare la incarcarea produselor" }, { status: 500 });
  }
}

// POST - Adauga produs dropship
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Calculeaza pretul de vanzare daca nu e specificat
    if (!data.yourPrice && data.supplierPrice && data.marginPercent) {
      data.yourPrice = data.supplierPrice * (1 + data.marginPercent / 100);
    }
    
    // Calculeaza marja daca nu e specificata
    if (!data.marginPercent && data.supplierPrice && data.yourPrice) {
      data.marginPercent = ((data.yourPrice - data.supplierPrice) / data.supplierPrice * 100);
    }

    const productId = data.productId ? parseInt(data.productId) : null;
    const yourPrice = parseFloat(data.yourPrice);
    const currency = data.currency || "EUR";

    const product = await prisma.dropshipProduct.create({
      data: {
        supplierId: parseInt(data.supplierId),
        productId: productId,
        name: data.name,
        supplierCode: data.supplierCode || null,
        supplierPrice: parseFloat(data.supplierPrice),
        currency: currency,
        yourPrice: yourPrice,
        marginPercent: data.marginPercent ? parseFloat(data.marginPercent) : null,
        category: data.category || null,
        description: data.description || null,
        image: data.image || null,
        stock: data.stock || "unknown",
        stockQuantity: data.stockQuantity ? parseInt(data.stockQuantity) : null,
        deliveryDays: data.deliveryDays ? parseInt(data.deliveryDays) : 7,
        status: data.status || "active",
        autoSync: data.autoSync !== false,
      },
    });

    // Sincronizează prețul produsului din magazin (convertit în RON)
    await syncProductPrice(productId, yourPrice, currency);

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error("Error creating dropship product:", error);
    return NextResponse.json({ error: "Eroare la crearea produsului" }, { status: 500 });
  }
}

// PUT - Actualizare produs dropship
export async function PUT(request: NextRequest) {
  try {
    const data = await request.json();
    const { id, ...updateData } = data;

    if (!id) {
      return NextResponse.json({ error: "ID-ul produsului este necesar" }, { status: 400 });
    }

    // Recalculeaza marja
    if (updateData.supplierPrice && updateData.yourPrice) {
      updateData.marginPercent = ((updateData.yourPrice - updateData.supplierPrice) / updateData.supplierPrice * 100);
    }

    const product = await prisma.dropshipProduct.update({
      where: { id },
      data: {
        ...updateData,
        supplierPrice: updateData.supplierPrice ? parseFloat(updateData.supplierPrice) : undefined,
        yourPrice: updateData.yourPrice ? parseFloat(updateData.yourPrice) : undefined,
      },
    });

    // Sincronizează prețul produsului din magazin (convertit în RON)
    if (product.productId && product.yourPrice) {
      await syncProductPrice(product.productId, product.yourPrice, product.currency);
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error("Error updating dropship product:", error);
    return NextResponse.json({ error: "Eroare la actualizarea produsului" }, { status: 500 });
  }
}

// DELETE - Sterge produs dropship
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID-ul produsului este necesar" }, { status: 400 });
    }

    await prisma.dropshipProduct.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting dropship product:", error);
    return NextResponse.json({ error: "Eroare la stergerea produsului" }, { status: 500 });
  }
}
