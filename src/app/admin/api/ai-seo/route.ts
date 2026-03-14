import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminAuthMiddleware } from "@/lib/auth-middleware";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

// POST — generează descrieri SEO pentru produse
export async function POST(req: NextRequest) {
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;

  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: "Cheia Gemini API nu este configurată" }, { status: 400 });
  }

  try {
    const { productIds, action } = await req.json();

    if (action === "generate") {
      // Obțin produsele selectate
      const products = await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: {
          id: true,
          name: true,
          nameEn: true,
          description: true,
          descriptionEn: true,
          type: true,
          domain: true,
          manufacturer: true,
          brand: true,
          specs: true,
          advantages: true,
          price: true,
          sku: true
        }
      });

      const results = [];

      for (const product of products) {
        const prompt = `Ești expert SEO pentru e-commerce B2B în domeniul automatizărilor industriale.

PRODUS:
- Nume: ${product.name}
- SKU: ${product.sku || "N/A"}
- Producător: ${product.manufacturer || product.brand || "N/A"}
- Categorie: ${product.type} / ${product.domain}
- Descriere actuală: ${product.description || "Lipsă"}
- Specificații: ${JSON.stringify(product.specs) || "[]"}
- Avantaje: ${JSON.stringify(product.advantages) || "[]"}

Generează pentru acest produs:

1. DESCRIERE SEO ROMÂNĂ (150-200 cuvinte):
   - Primul paragraf: beneficii principale și cuvinte cheie
   - Al doilea paragraf: aplicații și utilizări
   - Include cuvinte cheie naturale pentru industria automatizărilor

2. DESCRIERE SEO ENGLEZĂ (150-200 cuvinte):
   - Traducere profesională a descrierii române
   - Adaptată pentru piața internațională

3. META TITLE ROMÂNĂ (max 60 caractere):
   - Include marca și cuvântul cheie principal

4. META TITLE ENGLEZĂ (max 60 caractere)

5. META DESCRIPTION ROMÂNĂ (max 160 caractere):
   - Rezumat compelling cu call-to-action

6. META DESCRIPTION ENGLEZĂ (max 160 caractere)

7. KEYWORDS (10 cuvinte cheie relevante pentru SEO, separate prin virgulă)

Răspunde STRICT în format JSON:
{
  "descriptionRo": "...",
  "descriptionEn": "...",
  "metaTitleRo": "...",
  "metaTitleEn": "...",
  "metaDescRo": "...",
  "metaDescEn": "...",
  "keywords": "keyword1, keyword2, ..."
}`;

        try {
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                generationConfig: { maxOutputTokens: 1500, temperature: 0.7 },
              }),
            }
          );

          if (response.ok) {
            const data = await response.json();
            const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
            const cleaned = rawText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
            
            try {
              const seoData = JSON.parse(cleaned);
              results.push({
                productId: product.id,
                productName: product.name,
                success: true,
                seo: seoData
              });
            } catch {
              results.push({
                productId: product.id,
                productName: product.name,
                success: false,
                error: "Eroare parsare răspuns AI"
              });
            }
          } else {
            results.push({
              productId: product.id,
              productName: product.name,
              success: false,
              error: `Eroare API: ${response.status}`
            });
          }
        } catch (err) {
          results.push({
            productId: product.id,
            productName: product.name,
            success: false,
            error: "Eroare la generare"
          });
        }

        // Rate limiting - așteptăm 5 secunde între produse pentru a evita eroarea 429
        await new Promise(resolve => setTimeout(resolve, 5000));
      }

      return NextResponse.json({ results });
    }

    if (action === "apply") {
      // Aplică descrierile SEO generate
      const { updates } = await req.json();
      
      for (const update of updates) {
        await prisma.product.update({
          where: { id: update.productId },
          data: {
            description: update.descriptionRo,
            descriptionEn: update.descriptionEn
          }
        });
      }

      return NextResponse.json({ success: true, updated: updates.length });
    }

    return NextResponse.json({ error: "Acțiune necunoscută" }, { status: 400 });
  } catch (error) {
    console.error("[AI-SEO] Error:", error);
    return NextResponse.json({ error: "Eroare server" }, { status: 500 });
  }
}

// GET — listează produsele pentru generare SEO
export async function GET(req: NextRequest) {
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;

  try {
    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        descriptionEn: true,
        type: true,
        manufacturer: true
      },
      orderBy: { id: "asc" }
    });

    // Marcăm produsele care au nevoie de SEO
    const withSeoStatus = products.map(p => ({
      ...p,
      needsSeo: !p.description || p.description.length < 100 || !p.descriptionEn
    }));

    return NextResponse.json({ products: withSeoStatus });
  } catch (error) {
    console.error("[AI-SEO] GET Error:", error);
    return NextResponse.json({ error: "Eroare server" }, { status: 500 });
  }
}
