import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyDPMtQTjaruCtql9qAFqcavAzKwXRdjsnA";

// Helper to load pages from JSON
function loadPages() {
  try {
    const filePath = path.join(process.cwd(), "data", "pagini.json");
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, "utf-8"));
    }
  } catch (e) {}
  return [];
}

// GET - Limbile disponibile și statistici
export async function GET() {
  try {
    const products = await prisma.product.findMany({
      take: 30,
      select: { id: true, name: true, description: true, type: true }
    });

    const pages = loadPages();

    const supportedLanguages = [
      { code: "en", name: "Engleză", flag: "🇬🇧" },
      { code: "de", name: "Germană", flag: "🇩🇪" },
      { code: "fr", name: "Franceză", flag: "🇫🇷" },
      { code: "es", name: "Spaniolă", flag: "🇪🇸" },
      { code: "it", name: "Italiană", flag: "🇮🇹" },
      { code: "hu", name: "Maghiară", flag: "🇭🇺" },
      { code: "pl", name: "Poloneză", flag: "🇵🇱" },
      { code: "cs", name: "Cehă", flag: "🇨🇿" },
      { code: "bg", name: "Bulgară", flag: "🇧🇬" },
      { code: "ru", name: "Rusă", flag: "🇷🇺" }
    ];

    return NextResponse.json({
      availableContent: {
        products: products.length,
        pages: pages.length
      },
      supportedLanguages,
      features: [
        "Traducere produse (nume, descriere, avantaje)",
        "Traducere pagini statice",
        "Traducere email-uri automate",
        "Traducere interfață (UI strings)",
        "Detectare automată limbă client"
      ]
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Traduce conținut
export async function POST(req: NextRequest) {
  try {
    const { contentType, contentId, targetLanguage, customText } = await req.json();

    let sourceContent: any = null;
    let contentTitle = "";

    if (customText) {
      sourceContent = { text: customText };
      contentTitle = "Text personalizat";
    } else if (contentType === "product" && contentId) {
      const product = await prisma.product.findUnique({
        where: { id: contentId },
        select: {
          id: true,
          name: true,
          description: true,
          specs: true,
          advantages: true,
          type: true,
          manufacturer: true
        }
      });
      if (!product) {
        return NextResponse.json({ error: "Produs negăsit" }, { status: 404 });
      }
      sourceContent = product;
      contentTitle = product.name;
    } else if (contentType === "page" && contentId) {
      const pages = loadPages();
      const page = pages.find((p: any) => p.id === contentId || p.slug === contentId);
      if (!page) {
        return NextResponse.json({ error: "Pagină negăsită" }, { status: 404 });
      }
      sourceContent = page;
      contentTitle = page.title || page.slug;
    } else {
      return NextResponse.json({ error: "Specifică tipul de conținut" }, { status: 400 });
    }

    const languageNames: Record<string, string> = {
      en: "engleză",
      de: "germană",
      fr: "franceză",
      es: "spaniolă",
      it: "italiană",
      hu: "maghiară",
      pl: "poloneză",
      cs: "cehă",
      bg: "bulgară",
      ru: "rusă"
    };

    const targetLangName = languageNames[targetLanguage] || targetLanguage;

    let prompt = "";

    if (customText) {
      prompt = `Tradu următorul text din română în ${targetLangName}. 
Păstrează formatarea și tonul profesional B2B pentru automatizări industriale.

TEXT DE TRADUS:
${customText}

Returnează JSON:
{
  "translatedText": "textul tradus",
  "sourceLanguage": "ro",
  "targetLanguage": "${targetLanguage}",
  "wordCount": { "source": 0, "target": 0 },
  "notes": ["observații despre traducere, dacă există"]
}`;
    } else if (contentType === "product") {
      prompt = `Tradu informațiile acestui produs din română în ${targetLangName}.
Păstrează terminologia tehnică corectă pentru automatizări industriale.

PRODUS DE TRADUS:
- Nume: ${sourceContent.name}
- Descriere: ${sourceContent.description || "N/A"}
- Specificații: ${sourceContent.specs || "N/A"}
- Avantaje: ${sourceContent.advantages || "N/A"}
- Tip: ${sourceContent.type || "N/A"}
- Producător: ${sourceContent.manufacturer || "N/A"}

Returnează JSON:
{
  "name": "numele tradus",
  "description": "descrierea tradusă",
  "specs": "specificațiile traduse",
  "advantages": "avantajele traduse",
  "type": "tipul tradus",
  "seoTitle": "titlu SEO optimizat în limba țintă",
  "seoDescription": "meta description optimizat",
  "notes": ["observații despre traducere"]
}`;
    } else if (contentType === "page") {
      prompt = `Tradu conținutul acestei pagini din română în ${targetLangName}.
Păstrează formatarea HTML/Markdown dacă există.

PAGINĂ DE TRADUS:
- Titlu: ${sourceContent.title}
- Slug: ${sourceContent.slug}
- Conținut: ${(sourceContent.content || "").slice(0, 3000)}

Returnează JSON:
{
  "title": "titlul tradus",
  "content": "conținutul tradus",
  "slug": "slug sugerat în limba țintă",
  "seoTitle": "titlu SEO",
  "seoDescription": "meta description",
  "notes": ["observații despre traducere"]
}`;
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 2000, temperature: 0.3 }
        })
      }
    );

    if (!response.ok) {
      return NextResponse.json({ error: "AI indisponibil pentru traducere" }, { status: 500 });
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const cleaned = rawText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    const translation = JSON.parse(cleaned);

    return NextResponse.json({
      success: true,
      contentType: customText ? "text" : contentType,
      contentId: contentId || null,
      sourceLanguage: "ro",
      targetLanguage,
      originalContent: sourceContent,
      translation,
      translatedAt: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
