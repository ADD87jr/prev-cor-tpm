
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// GET - Lista alerte active
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const resolved = searchParams.get("resolved");
    const severity = searchParams.get("severity");

    const where: Record<string, unknown> = {};
    
    if (resolved !== null) {
      where.resolved = resolved === "true";
    }
    if (severity) {
      where.severity = severity;
    }

    const alerts = await prisma.dropshipAlert.findMany({
      where,
      orderBy: [
        { resolved: "asc" },
        { createdAt: "desc" },
      ],
    });

    return NextResponse.json(alerts);
  } catch (error) {
    console.error("Error fetching dropship alerts:", error);
    return NextResponse.json({ error: "Eroare la incarcarea alertelor" }, { status: 500 });
  }
}

// POST - Creeaza alerta noua sau verifica automat
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    // Verificare automată alerte
    if (data.action === "check") {
      const result = await checkAndCreateAlerts();
      return NextResponse.json({ 
        success: true, 
        message: `Verificare completă. ${result.created} alerte noi generate.`,
        alertsCreated: result.created 
      });
    }

    const alert = await prisma.dropshipAlert.create({
      data: {
        type: data.type,
        productId: data.productId || null,
        supplierId: data.supplierId || null,
        message: data.message,
        details: data.details || null,
        severity: data.severity || "warning",
      },
    });

    return NextResponse.json(alert, { status: 201 });
  } catch (error) {
    console.error("Error creating dropship alert:", error);
    return NextResponse.json({ error: "Eroare la crearea alertei" }, { status: 500 });
  }
}

// PUT - Rezolva alerta
export async function PUT(request: NextRequest) {
  try {
    const data = await request.json();
    const { id, resolved } = data;

    if (!id) {
      return NextResponse.json({ error: "ID-ul alertei este necesar" }, { status: 400 });
    }

    const alert = await prisma.dropshipAlert.update({
      where: { id },
      data: {
        resolved: resolved !== false,
        resolvedAt: resolved !== false ? new Date() : null,
      },
    });

    return NextResponse.json(alert);
  } catch (error) {
    console.error("Error updating dropship alert:", error);
    return NextResponse.json({ error: "Eroare la actualizarea alertei" }, { status: 500 });
  }
}

// Functie pentru verificare automata si generare alerte
export async function checkAndCreateAlerts() {
  try {
    const products = await prisma.dropshipProduct.findMany({
      where: { status: "active" },
    });

    const settings = await prisma.dropshipSettings.findMany();
    const settingsMap = new Map(settings.map((s: { supplierId: number; minMarginPercent: number; lowStockThreshold: number }) => [s.supplierId, s]));

    const newAlerts: Array<{
      type: string;
      productId?: number;
      supplierId?: number;
      message: string;
      severity: string;
      details?: Record<string, unknown>;
    }> = [];

    for (const product of products) {
      const supplierSettings = settingsMap.get(product.supplierId);
      const minMargin = supplierSettings?.minMarginPercent || 10;
      const lowStockThreshold = supplierSettings?.lowStockThreshold || 5;

      // Alerta marja scazuta
      const margin = ((product.yourPrice - product.supplierPrice) / product.supplierPrice * 100);
      if (margin < minMargin) {
        newAlerts.push({
          type: "margin_low",
          productId: product.id,
          supplierId: product.supplierId,
          message: `Marja scazuta pentru ${product.name}: ${margin.toFixed(1)}% (minim: ${minMargin}%)`,
          severity: margin < 5 ? "critical" : "warning",
          details: { currentMargin: margin, minMargin },
        });
      }

      // Alerta stoc scazut
      if (product.stockQuantity !== null && product.stockQuantity <= lowStockThreshold && product.stockQuantity > 0) {
        newAlerts.push({
          type: "low_stock",
          productId: product.id,
          supplierId: product.supplierId,
          message: `Stoc scazut pentru ${product.name}: ${product.stockQuantity} bucati`,
          severity: "warning",
          details: { stock: product.stockQuantity, threshold: lowStockThreshold },
        });
      }

      // Alerta fara stoc
      if (product.stock === "out_of_stock" || product.stockQuantity === 0) {
        newAlerts.push({
          type: "out_of_stock",
          productId: product.id,
          supplierId: product.supplierId,
          message: `Produs epuizat: ${product.name}`,
          severity: "critical",
        });
      }
    }

    // Creeaza alertele (evita duplicate)
    for (const alert of newAlerts) {
      const existing = await prisma.dropshipAlert.findFirst({
        where: {
          type: alert.type,
          productId: alert.productId,
          resolved: false,
        },
      });

      if (!existing) {
        await prisma.dropshipAlert.create({
          data: {
            type: alert.type,
            productId: alert.productId,
            supplierId: alert.supplierId,
            message: alert.message,
            severity: alert.severity,
            details: alert.details as Prisma.InputJsonValue | undefined,
          },
        });
      }
    }

    return { created: newAlerts.length };
  } catch (error) {
    console.error("Error checking dropship alerts:", error);
    throw error;
  }
}
