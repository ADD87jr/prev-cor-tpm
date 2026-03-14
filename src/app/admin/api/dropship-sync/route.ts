import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// POST - Sincronizare manuala/automata stoc si preturi
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { supplierId, syncType = "full" } = data;

    if (!supplierId) {
      return NextResponse.json({ error: "ID-ul furnizorului este necesar" }, { status: 400 });
    }

    // Creeaza log de sincronizare
    const syncLog = await prisma.dropshipSyncLog.create({
      data: {
        supplierId: parseInt(supplierId),
        syncType,
        status: "running",
        startedAt: new Date(),
      },
    });

    const startTime = Date.now();
    let productsUpdated = 0;
    let priceChanges = 0;
    let stockChanges = 0;
    const errors: { productId: number; error: string }[] = [];

    try {
      // Obtine setarile furnizorului
      const settings = await prisma.dropshipSettings.findUnique({
        where: { supplierId: parseInt(supplierId) },
      });

      // Obtine produsele dropship ale furnizorului
      const products = await prisma.dropshipProduct.findMany({
        where: { 
          supplierId: parseInt(supplierId),
          autoSync: true,
        },
      });

      // Simulare sincronizare (in productie ar folosi API-ul furnizorului)
      // Daca furnizorul are API configurat, il foloseste
      if (settings?.apiUrl && settings?.apiKey) {
        // TODO: Implementare apel API real
        // const response = await fetch(settings.apiUrl, { headers: { Authorization: `Bearer ${settings.apiKey}` } });
        // const supplierData = await response.json();
      }

      // Pentru demo: actualizeaza lastSyncAt pentru toate produsele
      for (const product of products) {
        try {
          await prisma.dropshipProduct.update({
            where: { id: product.id },
            data: { lastSyncAt: new Date() },
          });
          productsUpdated++;
        } catch (err) {
          errors.push({ productId: product.id, error: String(err) });
        }
      }

      // Actualizeaza log-ul de sincronizare
      const duration = Math.round((Date.now() - startTime) / 1000);
      await prisma.dropshipSyncLog.update({
        where: { id: syncLog.id },
        data: {
          productsUpdated,
          priceChanges,
          stockChanges,
          errors: errors.length > 0 ? (errors as Prisma.InputJsonValue) : Prisma.JsonNull,
          status: errors.length > 0 ? "completed_with_errors" : "completed",
          completedAt: new Date(),
          duration,
        },
      });

      return NextResponse.json({
        success: true,
        syncId: syncLog.id,
        productsUpdated,
        priceChanges,
        stockChanges,
        errors: errors.length,
        duration,
      });
    } catch (error) {
      // Marcheaza sincronizarea ca esuata
      await prisma.dropshipSyncLog.update({
        where: { id: syncLog.id },
        data: {
          status: "failed",
          errors: [{ error: String(error) }],
          completedAt: new Date(),
        },
      });
      throw error;
    }
  } catch (error) {
    console.error("Error syncing dropship products:", error);
    return NextResponse.json({ error: "Eroare la sincronizare" }, { status: 500 });
  }
}

// GET - Istoric sincronizari
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const supplierId = searchParams.get("supplierId");
    const limit = parseInt(searchParams.get("limit") || "10");

    const where: Record<string, unknown> = {};
    if (supplierId) {
      where.supplierId = parseInt(supplierId);
    }

    const logs = await prisma.dropshipSyncLog.findMany({
      where,
      orderBy: { startedAt: "desc" },
      take: limit,
    });

    return NextResponse.json(logs);
  } catch (error) {
    console.error("Error fetching sync logs:", error);
    return NextResponse.json({ error: "Eroare la incarcarea istoricului" }, { status: 500 });
  }
}
