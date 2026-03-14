import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyDPMtQTjaruCtql9qAFqcavAzKwXRdjsnA";

// GET - Lista produse disponibile pentru căutare
export async function GET() {
  try {
    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        sku: true,
        type: true,
        manufacturer: true,
        image: true
      },
      take: 100
    });

    const categories = [...new Set(products.map(p => p.type).filter(Boolean))];
    const manufacturers = [...new Set(products.map(p => p.manufacturer).filter(Boolean))];

    return NextResponse.json({
      totalProducts: products.length,
      categories,
      manufacturers,
      info: {
        description: "Căutare produse prin descriere imagine sau identificare componentă",
        capabilities: [
          "Identificare PLC-uri după aspect",
          "Recunoaștere senzori și actuatori",
          "Identificare HMI-uri și panouri",
          "Detectare conectori și cabluri",
          "Recunoaștere logo producător"
        ]
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Căutare prin descriere/imagine
export async function POST(req: NextRequest) {
  try {
    const { description, imageBase64, category, manufacturer } = await req.json();

    if (!description && !imageBase64) {
      return NextResponse.json({ 
        error: "Furnizează o descriere sau imagine a produsului căutat" 
      }, { status: 400 });
    }

    // Obține toate produsele pentru potrivire
    const products = await prisma.product.findMany({
      where: {
        active: true,
        ...(category && { type: category }),
        ...(manufacturer && { manufacturer })
      },
      select: {
        id: true,
        name: true,
        sku: true,
        type: true,
        manufacturer: true,
        description: true,
        specs: true,
        price: true,
        image: true,
        stock: true
      }
    });

    // Construiește catalogul pentru AI
    const catalog = products.map(p => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      type: p.type,
      manufacturer: p.manufacturer,
      description: p.description?.substring(0, 200)
    }));

    let prompt = "";

    if (imageBase64) {
      // Căutare prin imagine - folosim Gemini Vision
      prompt = `Analizează această imagine a unui component industrial și identifică-l.

CATALOG DISPONIBIL (JSON):
${JSON.stringify(catalog.slice(0, 50), null, 2)}

Bazat pe imagine, identifică:
1. Ce tip de component este (PLC, senzor, HMI, etc.)
2. Posibil producător (Siemens, Omron, Schneider, etc.)
3. Caracteristici vizibile

Apoi potrivește cu produse din catalog.

Returnează JSON:
{
  "identified": {
    "componentType": "tipul de component identificat",
    "possibleManufacturer": "producător probabil",
    "characteristics": ["lista caracteristici vizibile"],
    "confidence": "HIGH" | "MEDIUM" | "LOW"
  },
  "matches": [
    {
      "productId": "id din catalog",
      "productName": "nume produs",
      "matchScore": 0-100,
      "reasoning": "de ce se potrivește"
    }
  ],
  "suggestions": "sugestii dacă nu s-a găsit exact"
}`;
    } else {
      // Căutare prin descriere text
      prompt = `Caută în catalogul de automatizări industriale după descrierea clientului.

DESCRIERE CLIENT:
"${description}"

CATALOG DISPONIBIL:
${JSON.stringify(catalog.slice(0, 50), null, 2)}

Găsește produsele care se potrivesc cel mai bine cu descrierea.
Consideră: sinonime, nume alternative, coduri parțiale, descrieri aproximative.

Returnează JSON:
{
  "interpretation": {
    "searchedFor": "ce caută clientul de fapt",
    "componentType": "tipul de component",
    "keywords": ["cuvinte cheie extrase"]
  },
  "matches": [
    {
      "productId": "id din catalog",
      "productName": "nume produs",
      "sku": "cod produs",
      "matchScore": 0-100,
      "reasoning": "de ce se potrivește"
    }
  ],
  "alternatives": [
    {
      "productId": "id",
      "productName": "nume",
      "reason": "de ce ar putea fi relevant"
    }
  ],
  "clarifications": ["întrebări pentru client dacă nu e clar"]
}`;
    }

    const requestBody: any = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 2000
      }
    };

    // Dacă avem imagine, o adăugăm
    if (imageBase64) {
      requestBody.contents[0].parts.unshift({
        inlineData: {
          mimeType: "image/jpeg",
          data: imageBase64.replace(/^data:image\/\w+;base64,/, "")
        }
      });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody)
      }
    );

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    let searchResult;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      searchResult = jsonMatch ? JSON.parse(jsonMatch[0]) : { error: "Parse failed", raw: text };
    } catch {
      searchResult = { error: "Parse failed", raw: text };
    }

    // Îmbogățește rezultatele cu detalii complete
    if (searchResult.matches && Array.isArray(searchResult.matches)) {
      searchResult.matches = searchResult.matches.map((match: any) => {
        const fullProduct = products.find(p => p.id === match.productId);
        if (fullProduct) {
          return {
            ...match,
            product: {
              id: fullProduct.id,
              name: fullProduct.name,
              sku: fullProduct.sku,
              type: fullProduct.type,
              manufacturer: fullProduct.manufacturer,
              price: fullProduct.price,
              stock: fullProduct.stock,
              image: fullProduct.image
            }
          };
        }
        return match;
      });
    }

    return NextResponse.json({
      query: description || "Image search",
      searchType: imageBase64 ? "image" : "text",
      result: searchResult,
      totalCatalogSize: products.length
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
