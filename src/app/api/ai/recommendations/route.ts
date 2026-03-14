import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/ai/recommendations?productId=123&limit=6
export async function GET(req: NextRequest) {
  try {
    const productId = parseInt(req.nextUrl.searchParams.get("productId") || "0");
    const limit = parseInt(req.nextUrl.searchParams.get("limit") || "6");

    if (!productId) {
      return NextResponse.json({ error: "productId required" }, { status: 400 });
    }

    // Obține produsul curent
    const currentProduct = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, name: true, type: true, domain: true, price: true, brand: true, manufacturer: true },
    });

    if (!currentProduct) {
      return NextResponse.json({ products: [] });
    }

    // Strategia de recomandare:
    // 1. Produse din același domeniu + tip (cele mai relevante)
    // 2. Produse din același domeniu (relevante)
    // 3. Produse de la același producător/brand

    const sameDomainAndType = await prisma.product.findMany({
      where: {
        id: { not: productId },
        domain: currentProduct.domain,
        type: currentProduct.type,
      },
      take: limit,
      orderBy: { stock: "desc" },
    });

    if (sameDomainAndType.length >= limit) {
      return NextResponse.json({ products: sameDomainAndType.slice(0, limit), strategy: "domain+type" });
    }

    // Completează cu produse din același domeniu
    const existingIds = [productId, ...sameDomainAndType.map(p => p.id)];
    const sameDomain = await prisma.product.findMany({
      where: {
        id: { notIn: existingIds },
        domain: currentProduct.domain,
      },
      take: limit - sameDomainAndType.length,
      orderBy: { stock: "desc" },
    });

    const combined = [...sameDomainAndType, ...sameDomain];

    if (combined.length >= limit) {
      return NextResponse.json({ products: combined.slice(0, limit), strategy: "domain" });
    }

    // Completează cu produse de la același producător
    const allExistingIds = [...existingIds, ...sameDomain.map(p => p.id)];
    if (currentProduct.manufacturer || currentProduct.brand) {
      const sameManufacturer = await prisma.product.findMany({
        where: {
          id: { notIn: allExistingIds },
          OR: [
            ...(currentProduct.manufacturer ? [{ manufacturer: currentProduct.manufacturer }] : []),
            ...(currentProduct.brand ? [{ brand: currentProduct.brand }] : []),
          ],
        },
        take: limit - combined.length,
      });
      combined.push(...sameManufacturer);
    }

    return NextResponse.json({ products: combined.slice(0, limit), strategy: "mixed" });
  } catch (error) {
    console.error("[AI RECOMMENDATIONS] Error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
