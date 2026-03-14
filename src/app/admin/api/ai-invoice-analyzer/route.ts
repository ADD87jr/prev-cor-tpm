import { NextRequest, NextResponse } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyDPMtQTjaruCtql9qAFqcavAzKwXRdjsnA";

// POST - Analizează textul unei facturi (simulare OCR + AI)
export async function POST(req: NextRequest) {
  try {
    const { invoiceText, invoiceBase64, extractionType } = await req.json();

    if (!invoiceText && !invoiceBase64) {
      return NextResponse.json({ 
        error: "Furnizează textul facturii sau imaginea în base64" 
      }, { status: 400 });
    }

    // Pentru imagini, Gemini suportă vision
    let prompt = "";
    let contents: any[] = [];

    if (invoiceBase64) {
      // Analiză imagine factură
      prompt = `Analizează această imagine de factură de la un furnizor de automatizări industriale.

Extrage toate informațiile relevante și returnează JSON:
{
  "supplier": {
    "name": "nume furnizor",
    "cui": "CUI/cod fiscal",
    "address": "adresă",
    "phone": "telefon",
    "email": "email",
    "bank": "bancă",
    "iban": "IBAN"
  },
  "invoice": {
    "number": "număr factură",
    "date": "dată emitere (YYYY-MM-DD)",
    "dueDate": "dată scadență",
    "currency": "RON/EUR",
    "paymentTerms": "termeni plată"
  },
  "items": [
    {
      "description": "descriere produs",
      "sku": "cod produs dacă există",
      "quantity": number,
      "unit": "buc/set/etc",
      "unitPrice": number,
      "total": number,
      "vat": "% TVA"
    }
  ],
  "totals": {
    "subtotal": number,
    "vatAmount": number,
    "total": number,
    "amountDue": number
  },
  "notes": "observații suplimentare",
  "confidence": "HIGH" | "MEDIUM" | "LOW"
}`;

      contents = [{
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: "image/jpeg",
              data: invoiceBase64.replace(/^data:image\/\w+;base64,/, "")
            }
          }
        ]
      }];
    } else {
      // Analiză text factură
      prompt = `Analizează acest text de factură de la un furnizor de automatizări industriale.

TEXT FACTURĂ:
${invoiceText}

Extrage toate informațiile relevante și returnează JSON:
{
  "supplier": {
    "name": "nume furnizor",
    "cui": "CUI/cod fiscal",
    "address": "adresă",
    "phone": "telefon",
    "email": "email",
    "bank": "bancă",
    "iban": "IBAN"
  },
  "invoice": {
    "number": "număr factură",
    "date": "dată emitere (YYYY-MM-DD)",
    "dueDate": "dată scadență",
    "currency": "RON/EUR",
    "paymentTerms": "termeni plată"
  },
  "items": [
    {
      "description": "descriere produs",
      "sku": "cod produs dacă există",
      "quantity": number,
      "unit": "buc/set/etc",
      "unitPrice": number,
      "total": number,
      "vat": "% TVA"
    }
  ],
  "totals": {
    "subtotal": number,
    "vatAmount": number,
    "total": number,
    "amountDue": number
  },
  "notes": "observații suplimentare",
  "confidence": "HIGH" | "MEDIUM" | "LOW"
}`;

      contents = [{ parts: [{ text: prompt }] }];
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents,
          generationConfig: { temperature: 0.2, maxOutputTokens: 3000 }
        })
      }
    );

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    let extractedData;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      extractedData = jsonMatch ? JSON.parse(jsonMatch[0]) : { error: "Parse failed", raw: text };
    } catch {
      extractedData = { error: "Parse failed", raw: text };
    }

    // Adaugă sugestii de acțiuni
    const suggestions: any[] = [];

    if (extractedData.items && Array.isArray(extractedData.items)) {
      // Sugerează actualizare stoc
      suggestions.push({
        action: "UPDATE_STOCK",
        description: `Actualizează stocul pentru ${extractedData.items.length} produse`,
        items: extractedData.items.map((item: any) => ({
          description: item.description,
          quantity: item.quantity
        }))
      });

      // Sugerează actualizare prețuri de achiziție
      suggestions.push({
        action: "UPDATE_PURCHASE_PRICES",
        description: "Actualizează prețurile de achiziție",
        items: extractedData.items.map((item: any) => ({
          description: item.description,
          unitPrice: item.unitPrice
        }))
      });
    }

    if (extractedData.supplier?.name) {
      suggestions.push({
        action: "SAVE_SUPPLIER",
        description: "Salvează/actualizează datele furnizorului",
        supplier: extractedData.supplier
      });
    }

    if (extractedData.invoice?.dueDate) {
      suggestions.push({
        action: "CREATE_PAYMENT_REMINDER",
        description: `Creează reminder plată pentru ${extractedData.invoice.dueDate}`,
        dueDate: extractedData.invoice.dueDate,
        amount: extractedData.totals?.amountDue
      });
    }

    return NextResponse.json({
      extracted: extractedData,
      suggestions,
      processingInfo: {
        method: invoiceBase64 ? "IMAGE_ANALYSIS" : "TEXT_ANALYSIS",
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET - Info despre funcționalitate
export async function GET() {
  return NextResponse.json({
    name: "AI Invoice Analyzer",
    description: "Extrage automat date din facturi folosind AI",
    supportedFormats: ["text", "image/jpeg", "image/png"],
    capabilities: [
      "Extragere date furnizor",
      "Extragere linii factură (produse, cantități, prețuri)",
      "Calculare totaluri",
      "Sugestii de acțiuni (update stoc, prețuri, remindere)"
    ],
    usage: {
      method: "POST",
      body: {
        invoiceText: "text factură (opțional)",
        invoiceBase64: "imagine în base64 (opțional)"
      }
    }
  });
}
