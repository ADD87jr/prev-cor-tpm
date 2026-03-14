import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminAuthMiddleware } from "@/lib/auth-middleware";
import * as XLSX from "xlsx";

// Mapare coloane externe -> câmpuri DB (case-insensitive)
const COLUMN_MAPPING: Record<string, string> = {
  // Mapări standard
  "id": "id",
  "name": "name",
  "nameen": "nameEn",
  "sku": "sku",
  "brand": "brand",
  "manufacturer": "manufacturer",
  "price": "price",
  "listprice": "listPrice",
  "purchaseprice": "purchasePrice",
  "stock": "stock",
  "type": "type",
  "domain": "domain",
  "ondemand": "onDemand",
  "deliverytime": "deliveryTime",
  "description": "description",
  "descriptionen": "descriptionEn",
  
  // Mapări Sauter / furnizori externi
  "description en": "nameEn",
  "description_en": "nameEn",
  "epl 2026": "listPrice",
  "epl2026": "listPrice",
  "epl_2026": "listPrice",
  "euro": "currency",
  "currency": "currency",
  "category": "type",
  "categorie": "type",
  "product group": "domain",
  "productgroup": "domain",
  "cod": "sku",
  "cod produs": "sku",
  "article": "sku",
  "art.no": "sku",
  "art. no": "sku",
  "articol": "sku",
  "denumire": "name",
  "product name": "name",
  "nume produs": "name",
  "pret": "price",
  "weight": "weight",
  "greutate": "weight",
  "weight (kg)": "weight",
  "origin": "origin",
  "origine": "origin",
  
  // Mapări EPL / Sauter spare parts
  "part number": "sku",
  "partnumber": "sku",
  "net price 2026": "listPrice",
  "netprice2026": "listPrice",
  "net_price_2026": "listPrice",
  "customs n": "customsCode",
  "customs no": "customsCode",
  "release code": "releaseCode",
};

// GET: export produse ca CSV
export async function GET(req: NextRequest) {
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;

  try {
    const products = await prisma.product.findMany({
      orderBy: { id: "asc" },
    });

    const headers = [
      "id", "name", "nameEn", "sku", "brand", "manufacturer", "price", "listPrice",
      "purchasePrice", "stock", "type", "domain", "onDemand", "deliveryTime",
      "description", "descriptionEn",
    ];

    const escapeCSV = (val: any) => {
      if (val === null || val === undefined) return "";
      const str = String(val).replace(/"/g, '""');
      return str.includes(",") || str.includes('"') || str.includes("\n") ? `"${str}"` : str;
    };

    const rows = products.map((p) =>
      headers.map((h) => escapeCSV((p as any)[h])).join(",")
    );

    const csv = [headers.join(","), ...rows].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="produse-export-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error) {
    console.error("[EXPORT CSV] Error:", error);
    return NextResponse.json({ error: "Eroare la export" }, { status: 500 });
  }
}

// POST: import produse din CSV (update by id or create new)
export async function POST(req: NextRequest) {
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return NextResponse.json({ error: "Fișier CSV/Excel necesar" }, { status: 400 });
    }

    const fileName = file.name.toLowerCase();
    const isExcel = fileName.endsWith(".xlsx") || fileName.endsWith(".xls");
    
    let headers: string[] = [];
    let dataRows: Record<string, any>[] = [];
    
    if (isExcel) {
      // Parsare Excel cu xlsx
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
      
      if (rawData.length < 2) {
        return NextResponse.json({ error: "Fișierul Excel este gol" }, { status: 400 });
      }
      
      // Găsește linia cu headers (prima linie care conține cuvinte cheie)
      let headerRowIndex = 0;
      for (let i = 0; i < Math.min(5, rawData.length); i++) {
        const row = rawData[i];
        if (row && row.some((cell: any) => {
          const cellStr = String(cell || "").toLowerCase();
          return cellStr.includes("type") || cellStr.includes("description") || 
                 cellStr.includes("price") || cellStr.includes("sku") || cellStr.includes("cod") ||
                 cellStr.includes("epl") || cellStr.includes("name") || cellStr.includes("part number") ||
                 cellStr.includes("net price");
        })) {
          headerRowIndex = i;
          break;
        }
      }
      
      headers = rawData[headerRowIndex].map((h: any) => String(h || "").trim());
      
      // Convertește datele la obiecte
      for (let i = headerRowIndex + 1; i < rawData.length; i++) {
        const row = rawData[i];
        if (!row || row.length === 0) continue;
        
        const obj: Record<string, any> = {};
        headers.forEach((h, idx) => {
          if (row[idx] !== undefined && row[idx] !== null && row[idx] !== "") {
            obj[h] = row[idx];
          }
        });
        
        // Skip rânduri goale
        if (Object.keys(obj).length > 0) {
          dataRows.push(obj);
        }
      }
    } else {
      // Parsare CSV
      const text = await file.text();
      const lines = text.split("\n").filter((l) => l.trim());
      if (lines.length < 2) {
        return NextResponse.json({ error: "Fișierul CSV este gol" }, { status: 400 });
      }
      
      headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
      
      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        const obj: Record<string, any> = {};
        headers.forEach((h, idx) => {
          if (values[idx]?.trim()) {
            obj[h] = values[idx].trim();
          }
        });
        if (Object.keys(obj).length > 0) {
          dataRows.push(obj);
        }
      }
    }
    
    // Mapează headers la câmpuri DB
    const mappedHeaders = headers.map(h => {
      const normalized = h.toLowerCase().trim();
      return COLUMN_MAPPING[normalized] || h;
    });
    
    // Creează mapare header original -> header mapat
    const headerMapping: Record<string, string> = {};
    headers.forEach((h, idx) => {
      headerMapping[h] = mappedHeaders[idx];
    });
    
    // Detectează dacă e format furnizor extern (Sauter, EPL spare parts, etc.)
    const isExternalFormat = headers.some(h => {
      const low = h.toLowerCase();
      return low.includes("epl") || low.includes("description en") || low.includes("product group") ||
             low.includes("part number") || low.includes("net price");
    });
    
    // Pentru format EPL: "Description" devine "name" dacă nu avem coloană name
    const hasNameColumn = headers.some(h => {
      const low = h.toLowerCase();
      return low === "name" || low === "nume" || low === "nume produs" || low === "product name" || low === "denumire";
    });
    if (!hasNameColumn && headers.some(h => h.toLowerCase() === "description")) {
      // Remapăm description la name pentru formatul extern
      const descIdx = headers.findIndex(h => h.toLowerCase() === "description");
      if (descIdx !== -1) {
        const originalHeader = headers[descIdx];
        headerMapping[originalHeader] = "name";
      }
    }
    
    let updated = 0;
    let created = 0;
    const errors: string[] = [];

    for (let i = 0; i < dataRows.length; i++) {
      try {
        const originalRow = dataRows[i];
        
        // Creează row cu headers mapate
        const row: Record<string, string> = {};
        for (const [origHeader, value] of Object.entries(originalRow)) {
          const mappedH = headerMapping[origHeader] || origHeader;
          const val = String(value || "").trim();
          if (val) {
            // Dacă există deja o valoare pentru acest câmp, nu o suprascrie
            if (!row[mappedH]) {
              row[mappedH] = val;
            }
          }
        }
        
        // Parsare date
        const data: Record<string, any> = {};
        
        // Câmpuri text
        if (row.name) data.name = row.name;
        if (row.nameEn) data.nameEn = row.nameEn;
        if (row.sku) data.sku = row.sku;
        if (row.brand) data.brand = row.brand;
        if (row.manufacturer) data.manufacturer = row.manufacturer;
        if (row.type) data.type = row.type;
        if (row.domain) data.domain = row.domain;
        if (row.deliveryTime) data.deliveryTime = row.deliveryTime;
        if (row.description) data.description = row.description;
        if (row.descriptionEn) data.descriptionEn = row.descriptionEn;
        
        // Câmpuri numerice
        if (row.price) data.price = parseFloat(row.price.replace(/[^\d.,]/g, "").replace(",", "."));
        if (row.listPrice) data.listPrice = parseFloat(row.listPrice.replace(/[^\d.,]/g, "").replace(",", "."));
        if (row.purchasePrice) data.purchasePrice = parseFloat(row.purchasePrice.replace(/[^\d.,]/g, "").replace(",", "."));
        if (row.stock) data.stock = parseInt(row.stock, 10);
        if (row.onDemand) data.onDemand = row.onDemand === "true" || row.onDemand === "1";
        
        // Pentru format extern (Sauter, etc.) - setează valori default
        if (isExternalFormat) {
          // Dacă nu avem name dar avem nameEn, folosim nameEn
          if (!data.name && data.nameEn) data.name = data.nameEn;
          // Dacă nu avem price dar avem listPrice, folosim listPrice
          if (!data.price && data.listPrice) data.price = data.listPrice;
          // Valori default pentru câmpuri obligatorii
          if (!data.description) data.description = data.name || data.nameEn || "";
          
          // Pentru Sauter: coloana "Type" conține codul produsului (SKU), nu tipul
          // Detectăm dacă data.type arată ca un cod de produs (alfanumeric, 5-20 caractere)
          if (data.type && !data.sku && /^[A-Z0-9]{5,20}$/i.test(data.type)) {
            data.sku = data.type;
            data.type = "Components";
          }
          
          if (!data.type) data.type = "Components";
          if (!data.domain) data.domain = "HVAC";
          if (data.stock === undefined || isNaN(data.stock)) data.stock = 0;
          // Setează onDemand pentru produse fără stoc
          if (data.stock === 0) data.onDemand = true;
          // Currency din row dacă există
          if (row.currency) data.currency = row.currency.toUpperCase() === "EURO" ? "EUR" : row.currency.toUpperCase();
        }

        if (row.id && parseInt(row.id)) {
          await prisma.product.update({
            where: { id: parseInt(row.id) },
            data,
          });
          updated++;
        } else if (data.name && data.price !== undefined && !isNaN(data.price) && data.description && data.type && data.domain && data.stock !== undefined) {
          // Verifică dacă există deja un produs cu același SKU sau nume
          let existingProduct = null;
          if (data.sku) {
            existingProduct = await prisma.product.findFirst({
              where: { sku: data.sku },
            });
          }
          // Dacă nu avem SKU, verificăm după nume exact
          if (!existingProduct && data.name) {
            existingProduct = await prisma.product.findFirst({
              where: { name: data.name },
            });
          }
          
          if (existingProduct) {
            // Actualizează produsul existent
            await prisma.product.update({
              where: { id: existingProduct.id },
              data,
            });
            updated++;
          } else {
            // Creează produs nou
            await prisma.product.create({
              data: {
                name: data.name,
                price: data.price,
                description: data.description,
                image: "/products/placeholder.jpg",
                type: data.type,
                domain: data.domain,
                stock: data.stock,
                onDemand: data.onDemand || false,
                ...data,
              },
            });
            created++;
          }
        } else {
          // Ignoră rândurile fără preț (categorii/secțiuni din Excel, nu produse reale)
          if (data.price === undefined || isNaN(data.price)) {
            // Skip silently - nu e produs valid
            continue;
          }
          // Ignoră rândurile complet goale
          if (!data.name) {
            continue;
          }
          // Eroare detaliată pentru rânduri cu date parțiale
          const missing: string[] = [];
          if (!data.name) missing.push("name");
          if (data.price === undefined || isNaN(data.price)) missing.push("price");
          if (!data.description) missing.push("description");
          if (!data.type) missing.push("type");
          if (!data.domain) missing.push("domain");
          if (data.stock === undefined) missing.push("stock");
          errors.push(`Rândul ${i + 2}: lipsă ${missing.join(", ")}`);
        }
      } catch (e: any) {
        errors.push(`Rândul ${i + 2}: ${e.message}`);
      }
    }

    return NextResponse.json({ success: true, updated, created, errors });
  } catch (error) {
    console.error("[IMPORT CSV] Error:", error);
    return NextResponse.json({ error: "Eroare la import" }, { status: 500 });
  }
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}
