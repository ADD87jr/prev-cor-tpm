import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

// POST - Import produse dropship din CSV/Excel
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const supplierId = formData.get("supplierId") as string;
    const defaultMargin = parseFloat(formData.get("defaultMargin") as string) || 25;

    if (!file) {
      return NextResponse.json({ error: "Fisierul este necesar" }, { status: 400 });
    }
    if (!supplierId) {
      return NextResponse.json({ error: "ID-ul furnizorului este necesar" }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet) as Record<string, unknown>[];

    const results = {
      total: data.length,
      imported: 0,
      updated: 0,
      errors: [] as { row: number; error: string }[],
    };

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      try {
        // Mapping coloane (flexibil)
        const name = (row.name || row.Name || row.nume || row.Nume || row.produs || row.Produs) as string;
        const supplierCode = (row.supplierCode || row.cod || row.Cod || row.SKU || row.sku) as string;
        const supplierPrice = parseFloat(String(row.supplierPrice || row.pret || row.Pret || row.price || row.Price || 0));
        const yourPrice = row.yourPrice ? parseFloat(String(row.yourPrice)) : supplierPrice * (1 + defaultMargin / 100);
        const category = (row.category || row.categorie || row.Categorie) as string;
        const description = (row.description || row.descriere || row.Descriere) as string;
        const stock = (row.stock || row.stoc || row.Stoc || "unknown") as string;
        const deliveryDays = parseInt(String(row.deliveryDays || row.livrare || row.Livrare || 7));

        if (!name) {
          results.errors.push({ row: i + 2, error: "Numele produsului lipseste" });
          continue;
        }
        if (!supplierPrice || supplierPrice <= 0) {
          results.errors.push({ row: i + 2, error: "Pret invalid" });
          continue;
        }

        // Verifica daca produsul exista deja (dupa cod furnizor)
        const existing = supplierCode 
          ? await prisma.dropshipProduct.findFirst({
              where: { 
                supplierId: parseInt(supplierId), 
                supplierCode 
              }
            })
          : null;

        if (existing) {
          // Actualizeaza produsul existent
          await prisma.dropshipProduct.update({
            where: { id: existing.id },
            data: {
              name,
              supplierPrice,
              yourPrice: yourPrice || existing.yourPrice,
              marginPercent: ((yourPrice - supplierPrice) / supplierPrice * 100),
              category: category || existing.category,
              description: description || existing.description,
              stock: normalizeStock(stock),
              deliveryDays: deliveryDays || existing.deliveryDays,
              lastSyncAt: new Date(),
            },
          });
          results.updated++;
        } else {
          // Creeaza produs nou
          await prisma.dropshipProduct.create({
            data: {
              supplierId: parseInt(supplierId),
              name,
              supplierCode: supplierCode || null,
              supplierPrice,
              yourPrice,
              marginPercent: ((yourPrice - supplierPrice) / supplierPrice * 100),
              category: category || null,
              description: description || null,
              stock: normalizeStock(stock),
              deliveryDays,
              status: "active",
              autoSync: true,
            },
          });
          results.imported++;
        }
      } catch (err) {
        results.errors.push({ row: i + 2, error: String(err) });
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error("Error importing dropship products:", error);
    return NextResponse.json({ error: "Eroare la importul produselor" }, { status: 500 });
  }
}

function normalizeStock(stock: string): string {
  const s = String(stock).toLowerCase();
  if (s.includes("stoc") && !s.includes("fara") && !s.includes("nu")) return "in_stock";
  if (s.includes("limitat")) return "limited";
  if (s.includes("epuizat") || s.includes("fara") || s.includes("nu") || s === "0") return "out_of_stock";
  if (s === "da" || s === "yes" || parseInt(s) > 0) return "in_stock";
  return "unknown";
}
