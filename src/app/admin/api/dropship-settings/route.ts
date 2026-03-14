import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET - Setari dropshipping pentru un furnizor
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const supplierId = searchParams.get("supplierId");

    if (supplierId) {
      const settings = await prisma.dropshipSettings.findUnique({
        where: { supplierId: parseInt(supplierId) },
      });
      
      // Returneaza setari implicite daca nu exista
      if (!settings) {
        return NextResponse.json({
          supplierId: parseInt(supplierId),
          defaultMarginPercent: 25,
          minMarginPercent: 10,
          autoUpdatePrices: true,
          autoOrderEnabled: false,
          syncIntervalHours: 24,
          lowStockThreshold: 5,
          emailNotifications: true,
        });
      }
      
      return NextResponse.json(settings);
    }

    // Lista toate setarile
    const allSettings = await prisma.dropshipSettings.findMany();
    return NextResponse.json(allSettings);
  } catch (error) {
    console.error("Error fetching dropship settings:", error);
    return NextResponse.json({ error: "Eroare la incarcarea setarilor" }, { status: 500 });
  }
}

// POST/PUT - Salveaza setari dropshipping
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { supplierId, ...settingsData } = data;

    if (!supplierId) {
      return NextResponse.json({ error: "ID-ul furnizorului este necesar" }, { status: 400 });
    }

    const settings = await prisma.dropshipSettings.upsert({
      where: { supplierId: parseInt(supplierId) },
      update: {
        defaultMarginPercent: settingsData.defaultMarginPercent,
        minMarginPercent: settingsData.minMarginPercent,
        autoUpdatePrices: settingsData.autoUpdatePrices,
        autoOrderEnabled: settingsData.autoOrderEnabled,
        syncIntervalHours: settingsData.syncIntervalHours,
        lowStockThreshold: settingsData.lowStockThreshold,
        emailNotifications: settingsData.emailNotifications,
        apiUrl: settingsData.apiUrl,
        apiKey: settingsData.apiKey,
      },
      create: {
        supplierId: parseInt(supplierId),
        defaultMarginPercent: settingsData.defaultMarginPercent || 25,
        minMarginPercent: settingsData.minMarginPercent || 10,
        autoUpdatePrices: settingsData.autoUpdatePrices !== false,
        autoOrderEnabled: settingsData.autoOrderEnabled || false,
        syncIntervalHours: settingsData.syncIntervalHours || 24,
        lowStockThreshold: settingsData.lowStockThreshold || 5,
        emailNotifications: settingsData.emailNotifications !== false,
        apiUrl: settingsData.apiUrl,
        apiKey: settingsData.apiKey,
      },
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error saving dropship settings:", error);
    return NextResponse.json({ error: "Eroare la salvarea setarilor" }, { status: 500 });
  }
}

// Aplica marja implicita la toate produsele unui furnizor
export async function PUT(request: NextRequest) {
  try {
    const data = await request.json();
    const { supplierId, applyMarginToAll } = data;

    if (!supplierId || !applyMarginToAll) {
      return NextResponse.json({ error: "Parametri invalizi" }, { status: 400 });
    }

    const settings = await prisma.dropshipSettings.findUnique({
      where: { supplierId: parseInt(supplierId) },
    });

    if (!settings) {
      return NextResponse.json({ error: "Setari negasite" }, { status: 404 });
    }

    const products = await prisma.dropshipProduct.findMany({
      where: { supplierId: parseInt(supplierId) },
    });

    let updated = 0;
    for (const product of products) {
      const newPrice = product.supplierPrice * (1 + settings.defaultMarginPercent / 100);
      await prisma.dropshipProduct.update({
        where: { id: product.id },
        data: {
          yourPrice: newPrice,
          marginPercent: settings.defaultMarginPercent,
        },
      });
      updated++;
    }

    return NextResponse.json({ updated, message: `${updated} produse actualizate cu marja ${settings.defaultMarginPercent}%` });
  } catch (error) {
    console.error("Error applying margin:", error);
    return NextResponse.json({ error: "Eroare la aplicarea marjei" }, { status: 500 });
  }
}
