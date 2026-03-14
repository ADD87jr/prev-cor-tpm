import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEurToRonRate } from "@/lib/exchange-rate";

// GET - Obține variantele pentru un produs (API public cu conversie RON)
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const productId = url.searchParams.get("productId");

  if (!productId) {
    return NextResponse.json({ error: "productId lipsă!" }, { status: 400 });
  }

  try {
    const variants = await (prisma as any).productVariant.findMany({
      where: { productId: Number(productId), active: true },
      orderBy: { createdAt: "asc" },
    });
    
    // Obține produsul pentru a ști moneda principală
    const product = await prisma.product.findUnique({
      where: { id: Number(productId) },
      select: { currency: true }
    });
    const productCurrency = product?.currency || "RON";
    
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
    
    // Convertește toate prețurile în RON
    const variantsWithConversion = variants.map((v: any) => {
      const variantCurrency = v.currency || productCurrency;
      return {
        ...v,
        pret: convertToRon(v.pret, variantCurrency),
        listPrice: convertToRon(v.listPrice, variantCurrency),
        purchasePrice: convertToRon(v.purchasePrice, variantCurrency),
        currency: "RON", // Toate prețurile sunt acum în RON
      };
    });
    
    return NextResponse.json(variantsWithConversion);
  } catch (err) {
    console.error("Error fetching variants:", err);
    return NextResponse.json(
      { error: "Eroare la preluarea variantelor" },
      { status: 500 }
    );
  }
}
