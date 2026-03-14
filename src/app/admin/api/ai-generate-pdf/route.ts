import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyDPMtQTjaruCtql9qAFqcavAzKwXRdjsnA";

// POST - Generează fișă tehnică PDF pentru un produs
export async function POST(request: NextRequest) {
  try {
    const { productId, includeAiEnhanced } = await request.json();

    if (!productId) {
      return NextResponse.json({ error: "productId obligatoriu" }, { status: 400 });
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        description: true,
        specs: true,
        advantages: true,
        type: true,
        domain: true,
        manufacturer: true,
        sku: true,
        price: true,
        listPrice: true,
        image: true
      }
    });

    if (!product) {
      return NextResponse.json({ error: "Produs negăsit" }, { status: 404 });
    }

    // Parsare specs și advantages
    let specs: Record<string, string> = {};
    try {
      specs = typeof product.specs === "string" ? JSON.parse(product.specs) : product.specs || {};
    } catch {}

    let advantages: string[] = [];
    try {
      advantages = typeof product.advantages === "string" ? JSON.parse(product.advantages) : product.advantages || [];
    } catch {}

    let enhancedDescription = product.description || "";
    let aiSpecs: Record<string, string> = {};

    // Îmbunătățire cu AI dacă e cerut
    if (includeAiEnhanced) {
      const prompt = `Ești inginer tehnic specializat în automatizări industriale.

PRODUS: ${product.name}
PRODUCĂTOR: ${product.manufacturer || "N/A"}
TIP: ${product.type || "N/A"}
SKU: ${product.sku || "N/A"}

DESCRIERE EXISTENTĂ:
${enhancedDescription || "N/A"}

SPECIFICAȚII EXISTENTE:
${Object.entries(specs).map(([k, v]) => `${k}: ${v}`).join(", ") || "N/A"}

Îmbunătățește descrierea pentru o fișă tehnică profesională.
Adaugă specificații tehnice presupuse bazat pe tipul produsului.

Returnează JSON:
{
  "enhancedDescription": "descriere extinsă, profesională, 150-200 cuvinte",
  "additionalSpecs": {
    "Temperatură operare": "-20°C la +60°C",
    "Grad protecție": "IP20"
  },
  "applications": ["aplicație 1", "aplicație 2"],
  "warnings": ["avertisment 1"]
}`;

      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: prompt }] }],
              generationConfig: { maxOutputTokens: 1000, temperature: 0.5 }
            })
          }
        );

        if (response.ok) {
          const data = await response.json();
          const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const aiResult = JSON.parse(jsonMatch[0]);
            enhancedDescription = aiResult.enhancedDescription || enhancedDescription;
            aiSpecs = aiResult.additionalSpecs || {};
          }
        }
      } catch (e) {
        console.error("AI enhancement failed:", e);
      }
    }

    // Creează PDF
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4
    const { height } = page.getSize();

    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

    let y = height - 50;
    const leftMargin = 50;
    const contentWidth = 495;

    // Header - companie
    page.drawText("PREV-COR TPM S.R.L.", {
      x: leftMargin,
      y,
      size: 14,
      font: helveticaBold,
      color: rgb(0.2, 0.3, 0.6)
    });
    y -= 20;

    page.drawText("Fisa Tehnica Produs", {
      x: leftMargin,
      y,
      size: 18,
      font: helveticaBold,
      color: rgb(0.1, 0.1, 0.1)
    });
    y -= 40;

    // Linie separator
    page.drawLine({
      start: { x: leftMargin, y },
      end: { x: leftMargin + contentWidth, y },
      thickness: 1,
      color: rgb(0.7, 0.7, 0.7)
    });
    y -= 30;

    // Nume produs
    page.drawText(product.name.substring(0, 60), {
      x: leftMargin,
      y,
      size: 16,
      font: helveticaBold,
      color: rgb(0.1, 0.1, 0.3)
    });
    y -= 25;

    // Info de bază
    const basicInfo = [
      `Producator: ${product.manufacturer || "N/A"}`,
      `Tip: ${product.type || "N/A"}`,
      `SKU: ${product.sku || "N/A"}`,
      `Domeniu: ${product.domain || "N/A"}`
    ];

    for (const info of basicInfo) {
      page.drawText(info, {
        x: leftMargin,
        y,
        size: 10,
        font: helvetica,
        color: rgb(0.3, 0.3, 0.3)
      });
      y -= 15;
    }
    y -= 15;

    // Descriere
    page.drawText("DESCRIERE", {
      x: leftMargin,
      y,
      size: 12,
      font: helveticaBold,
      color: rgb(0.2, 0.3, 0.6)
    });
    y -= 18;

    // Word wrap pentru descriere
    const descWords = enhancedDescription.split(" ");
    let line = "";
    const maxLineWidth = 80;

    for (const word of descWords) {
      if ((line + word).length > maxLineWidth) {
        page.drawText(line.trim(), {
          x: leftMargin,
          y,
          size: 10,
          font: helvetica,
          color: rgb(0.2, 0.2, 0.2)
        });
        y -= 14;
        line = word + " ";
      } else {
        line += word + " ";
      }
      if (y < 100) break;
    }
    if (line.trim() && y > 100) {
      page.drawText(line.trim(), {
        x: leftMargin,
        y,
        size: 10,
        font: helvetica,
        color: rgb(0.2, 0.2, 0.2)
      });
      y -= 14;
    }
    y -= 15;

    // Specificații
    const allSpecs = { ...specs, ...aiSpecs };
    const specEntries = Object.entries(allSpecs);

    if (specEntries.length > 0 && y > 150) {
      page.drawText("SPECIFICATII TEHNICE", {
        x: leftMargin,
        y,
        size: 12,
        font: helveticaBold,
        color: rgb(0.2, 0.3, 0.6)
      });
      y -= 18;

      for (const [key, value] of specEntries) {
        if (y < 100) break;
        
        const specLine = `${key}: ${value}`.substring(0, 85);
        page.drawText(specLine, {
          x: leftMargin + 10,
          y,
          size: 9,
          font: helvetica,
          color: rgb(0.2, 0.2, 0.2)
        });
        y -= 13;
      }
    }
    y -= 15;

    // Avantaje
    if (advantages.length > 0 && y > 150) {
      page.drawText("AVANTAJE", {
        x: leftMargin,
        y,
        size: 12,
        font: helveticaBold,
        color: rgb(0.2, 0.3, 0.6)
      });
      y -= 18;

      for (const advantage of advantages.slice(0, 6)) {
        if (y < 100) break;
        
        page.drawText(`• ${String(advantage).substring(0, 80)}`, {
          x: leftMargin + 10,
          y,
          size: 9,
          font: helvetica,
          color: rgb(0.2, 0.2, 0.2)
        });
        y -= 13;
      }
    }

    // Footer
    page.drawLine({
      start: { x: leftMargin, y: 60 },
      end: { x: leftMargin + contentWidth, y: 60 },
      thickness: 0.5,
      color: rgb(0.7, 0.7, 0.7)
    });

    page.drawText("www.prev-cor.ro | contact@prev-cor.ro | Document generat automat", {
      x: leftMargin,
      y: 45,
      size: 8,
      font: helvetica,
      color: rgb(0.5, 0.5, 0.5)
    });

    page.drawText(`Generat: ${new Date().toLocaleDateString("ro-RO")}`, {
      x: leftMargin + contentWidth - 100,
      y: 45,
      size: 8,
      font: helvetica,
      color: rgb(0.5, 0.5, 0.5)
    });

    // Salvează PDF
    const pdfBytes = await pdfDoc.save();
    const pdfBase64 = Buffer.from(pdfBytes).toString("base64");

    return NextResponse.json({
      success: true,
      product: {
        id: product.id,
        name: product.name
      },
      pdf: {
        base64: pdfBase64,
        filename: `fisa-tehnica-${product.sku || product.id}.pdf`,
        size: pdfBytes.length
      },
      aiEnhanced: includeAiEnhanced || false
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET - Listează produse care nu au fișă tehnică
export async function GET() {
  try {
    const products = await prisma.product.findMany({
      where: {
        OR: [
          { pdfUrl: null },
          { pdfUrl: "" }
        ]
      },
      select: {
        id: true,
        name: true,
        type: true,
        manufacturer: true,
        sku: true
      },
      take: 50,
      orderBy: { id: "desc" }
    });

    const withPdf = await prisma.product.count({
      where: {
        pdfUrl: { not: "" }
      }
    });

    const total = await prisma.product.count();

    return NextResponse.json({
      productsWithoutPdf: products.length,
      productsWithPdf: withPdf,
      totalProducts: total,
      coverage: ((withPdf / total) * 100).toFixed(1) + "%",
      products
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
