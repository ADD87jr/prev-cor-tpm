import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminAuthMiddleware } from "@/lib/auth-middleware";

// GET: Export produse ca CSV
export async function GET(req: NextRequest) {
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;
  const products = await prisma.product.findMany();
  const headers = [
    "id", "name", "sku", "price", "listPrice", "purchasePrice", "manufacturer",
    "description", "image", "type", "domain", "stock", "brand", "deliveryTime",
    "couponCode", "discount", "discountType", "pdfUrl"
  ];
  const csvRows = [headers.join(",")];
  for (const p of products) {
    const row = [
      p.id,
      `"${(p.name || "").replace(/"/g, '""')}"`,
      `"${(p.sku || "").replace(/"/g, '""')}"`,
      p.price,
      p.listPrice ?? "",
      p.purchasePrice ?? "",
      `"${(p.manufacturer || "").replace(/"/g, '""')}"`,
      `"${(p.description || "").replace(/"/g, '""')}"`,
      `"${(p.image || "").replace(/"/g, '""')}"`,
      `"${(p.type || "").replace(/"/g, '""')}"`,
      `"${(p.domain || "").replace(/"/g, '""')}"`,
      p.stock,
      `"${(p.brand || "").replace(/"/g, '""')}"`,
      `"${(p.deliveryTime || "").replace(/"/g, '""')}"`,
      `"${(p.couponCode || "").replace(/"/g, '""')}"`,
      p.discount ?? "",
      `"${(p.discountType || "").replace(/"/g, '""')}"`,
      `"${(p.pdfUrl || "").replace(/"/g, '""')}"`
    ];
    csvRows.push(row.join(","));
  }
  const csvContent = csvRows.join("\n");
  return new NextResponse(csvContent, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="produse-export-${new Date().toISOString().slice(0,10)}.csv"`
    }
  });
}

// POST: Import produse din CSV (update sau adăugare)
export async function POST(req: NextRequest) {
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "Fișier CSV necesar" }, { status: 400 });
    }
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) {
      return NextResponse.json({ error: "Fișierul CSV trebuie să aibă header și cel puțin o linie de date" }, { status: 400 });
    }
    // Parse header
    const header = parseCSVLine(lines[0]);
    const results: { added: number; updated: number; errors: string[] } = { added: 0, updated: 0, errors: [] };
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      const row: Record<string, string> = {};
      header.forEach((h, idx) => { row[h] = values[idx] ?? ""; });
      try {
        const productData: any = {
          name: row.name || "Produs nou",
          sku: row.sku || undefined,
          price: parseFloat(row.price) || 0,
          listPrice: row.listPrice ? parseFloat(row.listPrice) : undefined,
          purchasePrice: row.purchasePrice ? parseFloat(row.purchasePrice) : undefined,
          manufacturer: row.manufacturer || undefined,
          description: row.description || "",
          image: row.image || "/products/default.jpg",
          type: row.type || "Altele",
          domain: row.domain || "General",
          stock: parseInt(row.stock) || 0,
          brand: row.brand || undefined,
          deliveryTime: row.deliveryTime || undefined,
          couponCode: row.couponCode || undefined,
          discount: row.discount ? parseFloat(row.discount) : undefined,
          discountType: row.discountType || undefined,
          pdfUrl: row.pdfUrl || undefined
        };
        if (row.id && !isNaN(parseInt(row.id))) {
          // Update produs existent
          const id = parseInt(row.id);
          const exists = await prisma.product.findUnique({ where: { id } });
          if (exists) {
            await prisma.product.update({ where: { id }, data: productData });
            results.updated++;
          } else {
            await prisma.product.create({ data: productData });
            results.added++;
          }
        } else {
          // Adaugă produs nou
          await prisma.product.create({ data: productData });
          results.added++;
        }
      } catch (err: any) {
        results.errors.push(`Linia ${i + 1}: ${err.message || "Eroare necunoscută"}`);
      }
    }
    return NextResponse.json({ success: true, ...results });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Eroare la import CSV" }, { status: 500 });
  }
}

// Parser simplu CSV (suportă ghilimele)
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += c;
    }
  }
  result.push(current);
  return result;
}
