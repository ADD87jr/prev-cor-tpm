import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";
import { adminAuthMiddleware } from "@/lib/auth-middleware";

// GET: Export products to Excel
export async function GET(req: NextRequest) {
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;
  try {
    const products = await prisma.product.findMany({
      orderBy: { id: "asc" }
    });

    // Prepare data for Excel
    const data = products.map((p) => ({
      ID: p.id,
      Nume: p.name,
      Descriere: p.description,
      "Preț vânzare": p.price,
      "Preț de listă": p.listPrice || "",
      "Preț achiziție": p.purchasePrice || "",
      Stoc: p.stock,
      "Cod SKU": p.sku || "",
      Brand: p.brand || "",
      Producător: p.manufacturer || "",
      Tip: p.type,
      Domeniu: p.domain,
      "Termen livrare": p.deliveryTime || "",
      "Cod cupon": p.couponCode || "",
      Discount: p.discount || "",
      "Tip discount": p.discountType || "",
      Imagine: p.image || "",
    }));

    // Create workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    
    // Set column widths
    ws["!cols"] = [
      { wch: 6 },  // ID
      { wch: 40 }, // Nume
      { wch: 50 }, // Descriere
      { wch: 12 }, // Preț vânzare
      { wch: 12 }, // Preț de listă
      { wch: 12 }, // Preț achiziție
      { wch: 8 },  // Stoc
      { wch: 15 }, // SKU
      { wch: 15 }, // Brand
      { wch: 15 }, // Producător
      { wch: 15 }, // Tip
      { wch: 20 }, // Domeniu
      { wch: 15 }, // Termen livrare
      { wch: 12 }, // Cod cupon
      { wch: 10 }, // Discount
      { wch: 12 }, // Tip discount
      { wch: 30 }, // Imagine
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Produse");

    // Generate buffer
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename=produse-${new Date().toISOString().slice(0, 10)}.xlsx`,
      },
    });
  } catch (error) {
    console.error("Error exporting products:", error);
    return NextResponse.json({ error: "Eroare la export" }, { status: 500 });
  }
}

// POST: Import products from Excel
export async function POST(req: NextRequest) {
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    
    if (!file) {
      return NextResponse.json({ error: "Fișier lipsă" }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: "buffer" });
    
    const wsName = wb.SheetNames[0];
    const ws = wb.Sheets[wsName];
    const data = XLSX.utils.sheet_to_json(ws) as any[];

    const results = {
      created: 0,
      updated: 0,
      errors: [] as string[],
    };

    for (const row of data) {
      try {
        const id = row.ID ? parseInt(row.ID) : null;
        
        const productData = {
          name: row.Nume || row.name || "Produs nou",
          description: row.Descriere || row.description || "",
          price: parseFloat(row["Preț vânzare"] || row.price || 0),
          listPrice: row["Preț de listă"] ? parseFloat(row["Preț de listă"]) : null,
          purchasePrice: row["Preț achiziție"] ? parseFloat(row["Preț achiziție"]) : null,
          stock: parseInt(row.Stoc || row.stock || 0),
          sku: row["Cod SKU"] || row.sku || null,
          brand: row.Brand || row.brand || null,
          manufacturer: row.Producător || row.manufacturer || null,
          type: row.Tip || row.type || "Altele",
          domain: row.Domeniu || row.domain || "General",
          deliveryTime: row["Termen livrare"] || row.deliveryTime || null,
          couponCode: row["Cod cupon"] || row.couponCode || null,
          discount: row.Discount ? parseFloat(row.Discount) : null,
          discountType: row["Tip discount"] || row.discountType || null,
          image: row.Imagine || row.image || "/uploads/default.jpg",
        };

        if (id) {
          // Try to update existing
          const existing = await prisma.product.findUnique({ where: { id } });
          if (existing) {
            await prisma.product.update({
              where: { id },
              data: productData,
            });
            results.updated++;
          } else {
            // Create new with specific ID (if supported) or without
            await prisma.product.create({
              data: productData,
            });
            results.created++;
          }
        } else {
          // Create new
          await prisma.product.create({
            data: productData,
          });
          results.created++;
        }
      } catch (rowError: any) {
        results.errors.push(`Eroare la rândul ${row.ID || "?"}: ${rowError.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Import finalizat: ${results.created} create, ${results.updated} actualizate`,
      ...results,
    });
  } catch (error: any) {
    console.error("Error importing products:", error);
    return NextResponse.json(
      { error: "Eroare la import", details: error.message },
      { status: 500 }
    );
  }
}
