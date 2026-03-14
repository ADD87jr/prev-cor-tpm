import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyDPMtQTjaruCtql9qAFqcavAzKwXRdjsnA";

// GET - Listează produse (cu filtru opțional)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const filter = searchParams.get('filter') || 'without'; // 'all', 'with', 'without'

    let whereClause: any = undefined;
    
    if (filter === 'without') {
      whereClause = {
        OR: [
          { image: "" },
          { image: { contains: "placeholder" } },
          { image: { contains: "no-image" } }
        ]
      };
    } else if (filter === 'with') {
      whereClause = {
        AND: [
          { image: { not: "" } },
          { NOT: { image: { contains: "placeholder" } } },
          { NOT: { image: { contains: "no-image" } } }
        ]
      };
    }
    // filter === 'all' -> no where clause (undefined)

    const products = await prisma.product.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        type: true,
        manufacturer: true,
        description: true,
        image: true
      },
      take: 100,
      orderBy: { id: "desc" }
    });

    const totalProducts = await prisma.product.count();
    const withImage = await prisma.product.count({
      where: {
        AND: [
          { image: { not: "" } },
          { NOT: { image: { contains: "placeholder" } } },
          { NOT: { image: { contains: "no-image" } } }
        ]
      }
    });
    const withoutImage = totalProducts - withImage;

    return NextResponse.json({
      productsWithoutImage: withoutImage,
      productsWithImage: withImage,
      totalProducts,
      coverage: ((withImage / totalProducts) * 100).toFixed(1) + "%",
      products,
      currentFilter: filter
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Generează prompt pentru imagine și sugerează imagini
export async function POST(request: NextRequest) {
  try {
    const { productId, generatePrompt } = await request.json();

    if (!productId) {
      return NextResponse.json({ error: "productId obligatoriu" }, { status: 400 });
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        type: true,
        domain: true,
        manufacturer: true,
        description: true,
        specs: true
      }
    });

    if (!product) {
      return NextResponse.json({ error: "Produs negăsit" }, { status: 404 });
    }

    // Generează prompt pentru imagine cu AI
    const prompt = `Ești expert în fotografie de produse industriale.

PRODUS: ${product.name}
PRODUCĂTOR: ${product.manufacturer || "N/A"}
TIP: ${product.type || "N/A"}
DOMENIU: ${product.domain || "N/A"}
DESCRIERE: ${product.description?.substring(0, 200) || "N/A"}

Generează un prompt detaliat pentru a crea o imagine profesională a acestui produs industrial.
Imaginea trebuie să fie pe fundal alb, iluminare studio, unghi 3/4, high resolution.

Returnează JSON:
{
  "imagePrompt": "prompt detaliat pentru generare imagine, în engleză",
  "alternativePrompts": ["varianta 2", "varianta 3"],
  "suggestedKeywords": ["keyword1", "keyword2"],
  "stockPhotoSearch": "termeni de căutare pentru imagini stock",
  "colorScheme": "culori dominante așteptate"
}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 800, temperature: 0.7 }
        })
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("[AI-GENERATE-IMAGES] Gemini error:", errText);
      return NextResponse.json({ error: "AI indisponibil", details: errText }, { status: 500 });
    }

    const data = await response.json();
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    let result;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      }
    } catch {
      result = {
        imagePrompt: `Professional product photo of ${product.name}, industrial equipment, white background, studio lighting, 3/4 angle, high resolution`,
        stockPhotoSearch: `${product.type} ${product.manufacturer} industrial`
      };
    }

    // Sugestii de URL-uri pentru imagini stock gratuite
    const searchTerm = encodeURIComponent(`${product.type || ""} ${product.manufacturer || ""} industrial`.trim());
    const stockSuggestions = [
      `https://unsplash.com/s/photos/${searchTerm}`,
      `https://www.pexels.com/search/${searchTerm}/`,
      `https://pixabay.com/images/search/${searchTerm}/`
    ];

    return NextResponse.json({
      success: true,
      product: {
        id: product.id,
        name: product.name
      },
      ...result,
      stockImageSources: stockSuggestions,
      tip: "Folosește prompt-ul generat cu DALL-E, Midjourney sau Stable Diffusion pentru a crea imaginea"
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
