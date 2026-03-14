import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyDPMtQTjaruCtql9qAFqcavAzKwXRdjsnA";

// GET - Auditează catalogul de produse
export async function GET() {
  try {
    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        price: true,
        listPrice: true,
        purchasePrice: true,
        stock: true,
        description: true,
        image: true,
        images: true,
        specs: true,
        advantages: true,
        type: true,
        domain: true,
        manufacturer: true,
        sku: true,
        pdfUrl: true
      }
    });

    const issues: {
      productId: number;
      productName: string;
      type: string;
      severity: "critical" | "warning" | "info";
      message: string;
    }[] = [];

    for (const product of products) {
      // CRITICAL: Fără preț
      if (!product.price || product.price <= 0) {
        issues.push({
          productId: product.id,
          productName: product.name,
          type: "missing_price",
          severity: "critical",
          message: "Produs fără preț setat"
        });
      }

      // CRITICAL: Preț mai mic decât costul
      if (product.purchasePrice && product.price && product.price < product.purchasePrice) {
        issues.push({
          productId: product.id,
          productName: product.name,
          type: "negative_margin",
          severity: "critical",
          message: `Preț (${product.price} RON) mai mic decât costul (${product.purchasePrice} RON)`
        });
      }

      // WARNING: Fără imagine
      if (!product.image && (!product.images || product.images === "[]")) {
        issues.push({
          productId: product.id,
          productName: product.name,
          type: "missing_image",
          severity: "warning",
          message: "Produs fără imagine"
        });
      }

      // WARNING: Fără descriere
      if (!product.description || product.description.length < 50) {
        issues.push({
          productId: product.id,
          productName: product.name,
          type: "missing_description",
          severity: "warning",
          message: "Descriere lipsă sau prea scurtă"
        });
      }

      // WARNING: Fără specificații
      if (!product.specs || product.specs === "{}" || product.specs === "[]") {
        issues.push({
          productId: product.id,
          productName: product.name,
          type: "missing_specs",
          severity: "warning",
          message: "Specificații tehnice lipsă"
        });
      }

      // WARNING: Fără categorie
      if (!product.type) {
        issues.push({
          productId: product.id,
          productName: product.name,
          type: "missing_category",
          severity: "warning",
          message: "Categoria (type) lipsește"
        });
      }

      // INFO: Fără SKU
      if (!product.sku) {
        issues.push({
          productId: product.id,
          productName: product.name,
          type: "missing_sku",
          severity: "info",
          message: "Cod SKU lipsă"
        });
      }

      // INFO: Fără fișă PDF
      if (!product.pdfUrl) {
        issues.push({
          productId: product.id,
          productName: product.name,
          type: "missing_pdf",
          severity: "info",
          message: "Fișă tehnică PDF lipsă"
        });
      }

      // WARNING: Discount prea mare
      if (product.listPrice && product.price) {
        const discount = ((product.listPrice - product.price) / product.listPrice) * 100;
        if (discount > 50) {
          issues.push({
            productId: product.id,
            productName: product.name,
            type: "high_discount",
            severity: "warning",
            message: `Discount foarte mare: ${discount.toFixed(1)}%`
          });
        }
      }

      // INFO: Stoc 0 dar nu onDemand
      if (product.stock === 0) {
        issues.push({
          productId: product.id,
          productName: product.name,
          type: "out_of_stock",
          severity: "info",
          message: "Produs fără stoc"
        });
      }
    }

    // Grupare pe tip
    const issuesByType: Record<string, number> = {};
    const issuesBySeverity: Record<string, number> = { critical: 0, warning: 0, info: 0 };

    for (const issue of issues) {
      issuesByType[issue.type] = (issuesByType[issue.type] || 0) + 1;
      issuesBySeverity[issue.severity]++;
    }

    return NextResponse.json({
      summary: {
        totalProducts: products.length,
        productsWithIssues: new Set(issues.map(i => i.productId)).size,
        totalIssues: issues.length,
        critical: issuesBySeverity.critical,
        warnings: issuesBySeverity.warning,
        info: issuesBySeverity.info
      },
      issuesByType,
      issues: issues.slice(0, 100) // Primele 100
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Analiză AI pentru probleme specifice
export async function POST(request: NextRequest) {
  try {
    const { issueType, autoFix } = await request.json();

    // Obține produsele cu problema specificată
    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        price: true,
        listPrice: true,
        purchasePrice: true,
        description: true,
        specs: true,
        type: true,
        manufacturer: true
      },
      take: 100
    });

    let affectedProducts: any[] = [];

    switch (issueType) {
      case "missing_description":
        affectedProducts = products.filter(p => 
          !p.description || p.description.length < 50
        );
        break;
      case "missing_specs":
        affectedProducts = products.filter(p => 
          !p.specs || p.specs === "{}" || p.specs === "[]"
        );
        break;
      case "missing_category":
        affectedProducts = products.filter(p => !p.type);
        break;
      case "negative_margin":
        affectedProducts = products.filter(p => 
          p.purchasePrice && p.price && p.price < p.purchasePrice
        );
        break;
      default:
        return NextResponse.json({ 
          error: "Tip problemă necunoscut",
          validTypes: ["missing_description", "missing_specs", "missing_category", "negative_margin"]
        }, { status: 400 });
    }

    if (affectedProducts.length === 0) {
      return NextResponse.json({ message: "Nu sunt produse cu această problemă", count: 0 });
    }

    if (!autoFix) {
      return NextResponse.json({
        issueType,
        count: affectedProducts.length,
        products: affectedProducts.slice(0, 20).map(p => ({
          id: p.id,
          name: p.name,
          price: p.price
        }))
      });
    }

    // Auto-fix cu AI
    const fixes: any[] = [];

    for (const product of affectedProducts.slice(0, 5)) { // Limitare la 5 pentru viteză
      let prompt = "";

      if (issueType === "missing_description") {
        prompt = `Generează o descriere profesională în română pentru acest produs industrial:
Nume: ${product.name}
Producător: ${product.manufacturer || 'N/A'}
Tip: ${product.type || 'N/A'}
Specificații: ${product.specs || 'N/A'}

Descriere 100-150 cuvinte, tehnică, pentru specialiști. Returnează DOAR textul descrierii.`;
      } else if (issueType === "missing_category") {
        prompt = `Pentru acest produs industrial, determină categoria potrivită:
Nume: ${product.name}
Producător: ${product.manufacturer || 'N/A'}

Categorii disponibile: PLC, HMI, Senzori, Invertoare, Surse, Module I/O, Cabluri, Accesorii

Returnează DOAR numele categoriei (un singur cuvânt sau două).`;
      }

      if (prompt) {
        try {
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                generationConfig: { maxOutputTokens: 500, temperature: 0.5 }
              })
            }
          );

          if (response.ok) {
            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

            if (issueType === "missing_description") {
              await prisma.product.update({
                where: { id: product.id },
                data: { description: text }
              });
              fixes.push({ productId: product.id, field: "descriptionRo", newValue: text.substring(0, 100) + "..." });
            } else if (issueType === "missing_category") {
              await prisma.product.update({
                where: { id: product.id },
                data: { type: text }
              });
              fixes.push({ productId: product.id, field: "type", newValue: text });
            }
          }          
          // Rate limiting - așteptăm 5 secunde între produse pentru a evita eroarea 429
          await new Promise(resolve => setTimeout(resolve, 5000));        } catch (e) {
          console.error("Fix error:", e);
        }
      }
    }

    return NextResponse.json({
      success: true,
      issueType,
      totalAffected: affectedProducts.length,
      fixed: fixes.length,
      fixes,
      remaining: affectedProducts.length - fixes.length
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
