import { NextRequest, NextResponse } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyDPMtQTjaruCtql9qAFqcavAzKwXRdjsnA";

// GET - Info despre funcționalitate
export async function GET() {
  return NextResponse.json({
    description: "AI OCR pentru extragere date din documente scanate",
    supportedFormats: ["PDF", "JPG", "PNG", "base64"],
    capabilities: [
      "Extragere date facturi",
      "Extragere date comenzi",
      "Digitalizare documente tehnice",
      "Recunoaștere tabele și liste"
    ],
    usage: "POST cu imageBase64 sau imageUrl"
  });
}

// POST - Procesează document cu OCR AI
export async function POST(req: NextRequest) {
  try {
    const { imageBase64, imageUrl, documentType } = await req.json();

    if (!imageBase64 && !imageUrl) {
      return NextResponse.json({ 
        error: "Furnizează imageBase64 sau imageUrl" 
      }, { status: 400 });
    }

    // Pentru Gemini Vision
    let imagePart: any;
    
    if (imageBase64) {
      // Detectează tipul din base64
      let mimeType = "image/jpeg";
      if (imageBase64.startsWith("data:")) {
        const match = imageBase64.match(/data:([^;]+);/);
        if (match) mimeType = match[1];
      }
      
      const base64Data = imageBase64.replace(/^data:[^;]+;base64,/, "");
      imagePart = {
        inlineData: {
          mimeType,
          data: base64Data
        }
      };
    } else if (imageUrl) {
      // Fetch și convertește la base64
      try {
        const imgResponse = await fetch(imageUrl);
        const buffer = await imgResponse.arrayBuffer();
        const base64 = Buffer.from(buffer).toString("base64");
        const contentType = imgResponse.headers.get("content-type") || "image/jpeg";
        
        imagePart = {
          inlineData: {
            mimeType: contentType,
            data: base64
          }
        };
      } catch {
        return NextResponse.json({ error: "Nu am putut descărca imaginea" }, { status: 400 });
      }
    }

    const docTypePrompt = documentType === "factura" 
      ? `Aceasta este o factură. Extrage: număr factură, dată, furnizor (nume, CUI, adresă), client (nume, CUI, adresă), produse (nume, cantitate, preț unitar, total), TVA, total de plată.`
      : documentType === "comanda"
      ? `Aceasta este o comandă. Extrage: număr comandă, dată, client, produse comandate, cantități, adresa livrare.`
      : `Analizează acest document și extrage toate informațiile relevante structurat.`;

    const prompt = `Ești expert OCR pentru documente business din România.

${docTypePrompt}

Returnează JSON structurat cu toate datele extrase:
{
  "documentType": "factura/comanda/altele",
  "documentNumber": "...",
  "date": "YYYY-MM-DD",
  "supplier": {
    "name": "...",
    "cui": "...",
    "address": "..."
  },
  "client": {
    "name": "...",
    "cui": "...",
    "address": "..."
  },
  "items": [
    { "name": "...", "quantity": 1, "unitPrice": 100, "total": 100 }
  ],
  "subtotal": 0,
  "tva": 0,
  "total": 0,
  "paymentTerms": "...",
  "additionalInfo": "...",
  "confidence": 85,
  "warnings": ["text neclar la...", "valoare incertă"]
}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              imagePart
            ]
          }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 3000 }
        })
      }
    );

    const data = await response.json();
    
    if (data.error) {
      return NextResponse.json({ 
        error: data.error.message || "Eroare procesare imagine" 
      }, { status: 500 });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    let extracted;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      extracted = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch {
      extracted = {
        documentType: "unknown",
        rawText: text,
        confidence: 50,
        warnings: ["Nu am putut parsa rezultatul structurat"]
      };
    }

    return NextResponse.json({
      success: true,
      ...extracted
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
