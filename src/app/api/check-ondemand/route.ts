import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { productIds, variantIds } = await req.json();
    
    // Verifică dacă vreun produs are onDemand = true
    let hasOnDemand = false;
    
    if (variantIds && variantIds.length > 0) {
      const variants = await prisma.productVariant.findMany({
        where: { id: { in: variantIds.map(Number) } },
        select: { onDemand: true }
      });
      hasOnDemand = variants.some(v => v.onDemand === true);
    }
    
    if (!hasOnDemand && productIds && productIds.length > 0) {
      const products = await prisma.product.findMany({
        where: { id: { in: productIds.map(Number) } },
        select: { onDemand: true }
      });
      hasOnDemand = products.some(p => p.onDemand === true);
    }
    
    return NextResponse.json({ hasOnDemand });
  } catch (error) {
    console.error('[check-ondemand] Error:', error);
    return NextResponse.json({ hasOnDemand: false });
  }
}
