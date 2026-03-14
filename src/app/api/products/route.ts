import { NextRequest, NextResponse } from 'next/server';

import { prisma } from "@/lib/prisma";
import { getEurToRonRate } from "@/lib/exchange-rate";

export async function GET() {
  const products = await prisma.product.findMany({
    include: {
      productVariants: {
        where: { active: true },
        select: { pret: true, listPrice: true, currency: true }
      }
    }
  });
  
  // Obține cursul EUR/RON pentru conversie
  const eurToRon = await getEurToRonRate();
  
  // Funcție de conversie
  const convertToRon = (price: number | null, currency: string): number | null => {
    if (price === null || price === undefined) return null;
    if (currency === "EUR") {
      return Math.round(price * eurToRon * 100) / 100;
    }
    return price;
  };
  
  // Adaugă minVariantPrice și minVariantListPrice pentru fiecare produs
  // Convertește toate prețurile în RON
  const productsWithVariantPrices = products.map(product => {
    const originalCurrency = product.currency || "RON";
    
    // Convertește prețul principal
    const priceInRon = convertToRon(product.price, originalCurrency);
    const listPriceInRon = convertToRon(product.listPrice, originalCurrency);
    
    const variantsWithPrices = product.productVariants.filter(v => v.pret && v.pret > 0);
    if (variantsWithPrices.length > 0) {
      // Convertește prețurile variantelor în RON
      const convertedVariants = variantsWithPrices.map(v => ({
        pret: convertToRon(v.pret, v.currency || originalCurrency),
        listPrice: convertToRon(v.listPrice, v.currency || originalCurrency)
      }));
      const minPrice = Math.min(...convertedVariants.map(v => v.pret!));
      const variantWithMinPrice = convertedVariants.find(v => v.pret === minPrice);
      return {
        ...product,
        price: priceInRon,
        listPrice: listPriceInRon,
        currency: "RON", // Toate prețurile sunt acum în RON
        images: typeof product.images === 'string' ? JSON.parse(product.images) : product.images,
        productVariants: undefined, // Nu trimitem toate variantele în listing
        hasVariants: true,
        minVariantPrice: minPrice,
        minVariantListPrice: variantWithMinPrice?.listPrice || null
      };
    }
    return {
      ...product,
      price: priceInRon,
      listPrice: listPriceInRon,
      currency: "RON", // Toate prețurile sunt acum în RON
      images: typeof product.images === 'string' ? JSON.parse(product.images) : product.images,
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
