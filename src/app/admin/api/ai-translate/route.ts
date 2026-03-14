import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyDPMtQTjaruCtql9qAFqcavAzKwXRdjsnA";

// GET - Lista produse fără traducere
export async function GET() {
  try {
    const products = await prisma.product.findMany({
      where: {
        OR: [
          { nameEn: null },
          { nameEn: "" },
          { descriptionEn: null },
          { descriptionEn: "" }
        ]
      },
      select: {
        id: true,
        name: true,
        nameEn: true,
        description: true,
        descriptionEn: true,
        type: true,
        domain: true,
        manufacturer: true,
        sku: true
      },
      orderBy: { id: "desc" }
    });

    // Și produsele cu traduceri pentru referință
    const translatedCount = await prisma.product.count({
      where: {
        nameEn: { not: null },
        descriptionEn: { not: null },
        NOT: {
          nameEn: "",
          descriptionEn: ""
        }
      }
    });

    return NextResponse.json({
      untranslated: products,
      stats: {
        untranslatedCount: products.length,
        translatedCount,
        totalProducts: products.length + translatedCount
      }
    });
  } catch (error: any) {
    console.error("Error fetching untranslated products:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Traduce produsele selectate
export async function POST(request: NextRequest) {
  try {
    const { productIds, action } = await request.json();

    if (!productIds || productIds.length === 0) {
      return NextResponse.json({ error: "Selectează produse pentru traducere" }, { status: 400 });
    }

    // Limitează la 10 produse per request pentru a evita timeout
    const limitedIds = productIds.slice(0, 10);

    const products = await prisma.product.findMany({
      where: { id: { in: limitedIds } },
      select: {
        id: true,
        name: true,
        description: true,
        specs: true,
        advantages: true,
        type: true,
        domain: true,
        manufacturer: true
      }
    });

    const prompt = `Ești un traducător profesionist specializat în automatizări industriale și echipamente tehnice.
Trebuie să traduci următoarele produse din română în engleză.

Produse de tradus:
${products.map((p, i) => `
[${i + 1}] ID: ${p.id}
Nume RO: ${p.name}
Descriere RO: ${p.description || "N/A"}
Specificații: ${JSON.stringify(p.specs) || "N/A"}
Avantaje: ${JSON.stringify(p.advantages) || "N/A"}
Tip: ${p.type}
Domeniu: ${p.domain}
Producător: ${p.manufacturer || "N/A"}
`).join("\n---\n")}

INSTRUCȚIUNI:
1. Păstrează termenii tehnici în forme recunoscute internațional
2. Traducerea trebuie să fie naturală, nu mot-à-mot
3. Păstrează acuratețea tehnică
4. Descrierile trebuie să fie profesionale și potrivite pentru B2B

Returnează DOAR JSON valid (fără explicații):
{
  "translations": [
    {
      "id": 1,
      "nameEn": "...",
      "descriptionEn": "...",
      "specificationsEn": "...",
      "advantagesEn": "..."
    }
  ]
}`;

    // Call Gemini API directly
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 2000, temperature: 0.7 }
        })
      }
    );

    if (!response.ok) {
      return NextResponse.json({ error: "Eroare la generare AI" }, { status: 500 });
    }

    const data = await response.json();
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    let translations;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        translations = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON");
      }
    } catch {
      return NextResponse.json({ error: "Nu am putut parsa răspunsul AI" }, { status: 500 });
    }

    // Dacă action === "apply", salvăm în baza de date
    if (action === "apply") {
      const updatePromises = translations.translations.map((t: any) =>
        prisma.product.update({
          where: { id: t.id },
          data: {
            nameEn: t.nameEn,
            descriptionEn: t.descriptionEn,
            // specificationsEn și advantagesEn pot fi adăugate dacă există în schema
          }
        })
      );

      await Promise.all(updatePromises);

      return NextResponse.json({
        success: true,
        applied: true,
        count: translations.translations.length,
        message: `${translations.translations.length} produse traduse și salvate!`
      });
    }

    // Altfel returnăm preview
    return NextResponse.json({
      success: true,
      applied: false,
      translations: translations.translations,
      count: translations.translations.length
    });
  } catch (error: any) {
    console.error("Error translating products:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
