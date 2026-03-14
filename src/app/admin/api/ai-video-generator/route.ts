import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyDPMtQTjaruCtql9qAFqcavAzKwXRdjsnA";

// GET - Lista produse pentru video
export async function GET() {
  try {
    const products = await prisma.product.findMany({
      take: 50,
      orderBy: { price: "desc" },
      select: {
        id: true,
        name: true,
        sku: true,
        price: true,
        manufacturer: true,
        type: true,
        description: true,
        image: true
      }
    });

    // Statistici video generate (simulat)
    const stats = {
      totalProducts: products.length,
      videosGenerated: Math.floor(products.length * 0.3),
      pendingGeneration: Math.floor(products.length * 0.7),
      avgVideoLength: "45 secunde",
      supportedFormats: ["MP4 (1080p)", "MP4 (720p)", "WebM", "GIF animat"]
    };

    return NextResponse.json({ products, stats });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Generează script video pentru produs
export async function POST(req: NextRequest) {
  try {
    const { productId, videoType, duration, targetAudience } = await req.json();

    // Convertește productId la număr
    const parsedProductId = parseInt(productId, 10);
    if (isNaN(parsedProductId)) {
      return NextResponse.json({ error: "ID produs invalid" }, { status: 400 });
    }

    const product = await prisma.product.findUnique({
      where: { id: parsedProductId },
      select: {
        id: true,
        name: true,
        sku: true,
        price: true,
        listPrice: true,
        manufacturer: true,
        type: true,
        description: true,
        specs: true,
        advantages: true,
        image: true
      }
    });

    if (!product) {
      return NextResponse.json({ error: "Produs negăsit" }, { status: 404 });
    }

    const videoTypes = {
      promo: "video promoțional scurt pentru social media",
      tutorial: "video tutorial de instalare și configurare",
      comparison: "video comparativ cu alternative",
      showcase: "video prezentare caracteristici"
    };

    const prompt = `Creează script video ${duration || 45}s pentru produs B2B.

PRODUS: ${product.name} (${product.sku})
Preț: ${product.price} RON | Producător: ${product.manufacturer}
Descriere: ${(product.description || "N/A").substring(0, 200)}

TIP: ${videoTypes[videoType as keyof typeof videoTypes] || videoTypes.showcase}
AUDIENȚĂ: ${targetAudience || "Tehnicieni industriali"}

Răspunde STRICT în JSON valid (fără text în afara JSON):
{"title":"titlu scurt","hook":"3 secunde captare atenție","scenes":[{"nr":1,"sec":"5s","visual":"descriere vizual","narration":"text voiceover","text":"text ecran"}],"cta":"call to action","music":"stil muzică","hashtags":["tag1","tag2"]}

Maxim 4-5 scene. Răspuns compact.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 4000, temperature: 0.8 }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", errorText);
      return NextResponse.json({ error: "AI indisponibil", details: errorText }, { status: 500 });
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    
    if (!rawText) {
      return NextResponse.json({ error: "Răspuns gol de la AI" }, { status: 500 });
    }
    
    const cleaned = rawText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    let videoScript;
    try {
      videoScript = JSON.parse(cleaned);
    } catch (parseErr: any) {
      console.error("JSON parse error:", parseErr.message, "Raw length:", cleaned.length);
      // Încearcă să repare JSON-ul trunchiat
      let fixedJson = cleaned;
      // Dacă JSON-ul este trunchiat, încearcă să-l închidă
      const openBraces = (cleaned.match(/{/g) || []).length;
      const closeBraces = (cleaned.match(/}/g) || []).length;
      const openBrackets = (cleaned.match(/\[/g) || []).length;
      const closeBrackets = (cleaned.match(/\]/g) || []).length;
      
      // Adaugă închiderile lipsă
      for (let i = 0; i < openBrackets - closeBrackets; i++) fixedJson += "]";
      for (let i = 0; i < openBraces - closeBraces; i++) fixedJson += "}";
      
      try {
        videoScript = JSON.parse(fixedJson);
      } catch {
        return NextResponse.json({ 
          error: "Eroare parsare răspuns AI", 
          parseError: parseErr.message,
          rawLength: cleaned.length
        }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      product: {
        id: product.id,
        name: product.name,
        sku: product.sku,
        image: product.image
      },
      videoType: videoType || "showcase",
      duration: duration || 45,
      script: videoScript,
      generatedAt: new Date().toISOString(),
      note: "Scriptul poate fi folosit cu tool-uri AI video precum Synthesia, D-ID, sau HeyGen pentru generare automată."
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
