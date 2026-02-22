import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public endpoint - returns current prices for given product IDs
// Returns the minimum variant price if variants exist, otherwise the product price
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const idsParam = url.searchParams.get("ids");
    
    if (!idsParam) {
      return NextResponse.json({}, { status: 200 });
    }
    
    const ids = idsParam.split(",").map(id => parseInt(id, 10)).filter(id => !isNaN(id));
    
    if (ids.length === 0) {
      return NextResponse.json({}, { status: 200 });
    }
    
    // Limit to prevent abuse
    const limitedIds = ids.slice(0, 50);
    
    // Fetch products with their variants
    const products = await prisma.product.findMany({
      where: { id: { in: limitedIds } },
      select: { 
        id: true, 
        price: true,
        listPrice: true,
        discount: true,
        discountType: true,
        productVariants: {
          select: { pret: true, active: true }
        }
      }
    });
    
    // Create a map of id -> display price
    const priceMap: Record<number, number> = {};
    products.forEach(p => {
      // Check for active variants with prices
      const variantPrices = p.productVariants
        .filter(v => v.active && v.pret && v.pret > 0)
        .map(v => v.pret as number);
      
      if (variantPrices.length > 0) {
        // Use minimum variant price
        priceMap[p.id] = Math.min(...variantPrices);
      } else {
        // No variants - use product price with discount
        let displayPrice = p.price;
        if (p.discount && p.discountType === "percent") {
          const discountPct = Number(p.discount);
          if (discountPct > 0) {
            displayPrice = Math.round(p.price * (1 - discountPct / 100));
          }
        } else if (p.discount && p.discountType === "fixed") {
          displayPrice = p.price - Number(p.discount);
        }
        priceMap[p.id] = displayPrice;
      }
    });
    
    return NextResponse.json(priceMap);
  } catch (err) {
    console.error("[PRODUCTS PRICES] Error:", err);
    return NextResponse.json({}, { status: 200 });
  }
}
