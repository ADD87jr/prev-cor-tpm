import { NextRequest, NextResponse } from 'next/server';

import { prisma } from "@/lib/prisma";

export async function GET() {
  const products = await prisma.product.findMany({
    include: {
      productVariants: {
        where: { active: true },
        select: { pret: true, listPrice: true }
      }
    }
  });
  
  // Adaugă minVariantPrice și minVariantListPrice pentru fiecare produs
  const productsWithVariantPrices = products.map(product => {
    const variantsWithPrices = product.productVariants.filter(v => v.pret && v.pret > 0);
    if (variantsWithPrices.length > 0) {
      const minPrice = Math.min(...variantsWithPrices.map(v => v.pret!));
      const variantWithMinPrice = variantsWithPrices.find(v => v.pret === minPrice);
      return {
        ...product,
        productVariants: undefined, // Nu trimitem toate variantele în listing
        hasVariants: true,
        minVariantPrice: minPrice,
        minVariantListPrice: variantWithMinPrice?.listPrice || null
      };
    }
    return {
      ...product,
      productVariants: undefined,
      hasVariants: product.productVariants.length > 0,
      minVariantPrice: null,
      minVariantListPrice: null
    };
  });
  
  return NextResponse.json(productsWithVariantPrices);
}

export async function POST(req: NextRequest) {
  const data = await req.json();
  // Normalizează discountul procentual: dacă discountType este percent și discount < 1, transformă în procent
  let discount = data.discount;
  if (data.discountType === 'percent' && discount && discount < 1) {
    discount = discount * 100;
  }
  const newProduct = await prisma.product.create({
    data: { ...data, discount }
  });
  return NextResponse.json(newProduct);
}

export async function PUT(req: NextRequest) {
  const data = await req.json();
  const id = typeof data.id === 'string' ? Number(data.id) : data.id;
  let discount = data.discount;
  if (data.discountType === 'percent' && discount && discount < 1) {
    discount = discount * 100;
  }
  try {
    const updatedProduct = await prisma.product.update({
      where: { id },
      data: { ...data, discount }
    });
    return NextResponse.json(updatedProduct);
  } catch (error) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  try {
    await prisma.product.delete({ where: { id: typeof id === 'string' ? Number(id) : id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }
}
