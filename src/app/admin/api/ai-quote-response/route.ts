import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminAuthMiddleware } from "@/lib/auth-middleware";

const db = prisma as any;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

// POST — generează răspuns automat la cerere de ofertă
export async function POST(req: NextRequest) {
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;

  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: "Cheia Gemini API nu este configurată" }, { status: 400 });
  }

  try {
    const { customerName, customerEmail, customerCompany, requestedProducts, additionalNotes, urgency } = await req.json();

    // Obțin informații despre produsele cerute
    const products = await prisma.product.findMany({
      where: {
        OR: requestedProducts.map((name: string) => ({
          name: { contains: name }
        }))
      },
      select: {
        id: true,
        name: true,
        price: true,
        listPrice: true,
        stock: true,
        deliveryTime: true,
        manufacturer: true,
        sku: true,
        description: true
      }
    });

    // Obțin setările companiei
    const companySettings = await db.siteSettings.findUnique({ where: { key: "company_info" } });
    const companyInfo = companySettings?.value ? JSON.parse(companySettings.value) : {
      name: "PREV-COR TPM S.R.L.",
      email: "contact@prevcor.ro",
      phone: "+40 123 456 789"
    };

    const prompt = `Ești reprezentant vânzări la firma ${companyInfo.name}, specializată în automatizări industriale.

CERERE DE OFERTĂ:
- Client: ${customerName}${customerCompany ? ` (${customerCompany})` : ""}
- Email: ${customerEmail}
- Produse solicitate: ${requestedProducts.join(", ")}
- Note suplimentare: ${additionalNotes || "Niciuna"}
- Urgență: ${urgency || "Normală"}

PRODUSE DISPONIBILE ÎN CATALOG:
${products.map(p => `- ${p.name} | SKU: ${p.sku || "N/A"} | Preț: ${p.price} RON | Stoc: ${p.stock > 0 ? p.stock + " buc" : "La comandă"} | Livrare: ${p.deliveryTime || "2-5 zile"}`).join("\n")}

Generează un EMAIL PROFESIONAL de răspuns la cererea de ofertă care include:

1. SUBIECT EMAIL - scurt și relevant
2. SALUT - personalizat pentru client
3. MULȚUMIRE - pentru cererea de ofertă
4. OFERTA DETALIATĂ:
   - Tabel cu produse, cantități, prețuri unitare, prețuri totale
   - Disponibilitate stoc
   - Termen livrare estimat
5. CONDIȚII COMERCIALE:
   - Valabilitate ofertă: 15 zile
   - Termen plată: 30 zile pentru companii / plata la comandă pentru persoane fizice
   - Livrare inclusă pentru comenzi > 500 RON
6. CALL-TO-ACTION - invitație la plasare comandă
7. ÎNCHEIERE PROFESIONALĂ cu date contact

Formatează răspunsul în JSON:
{
  "subject": "Subiectul emailului",
  "greeting": "Salutul",
  "body": "Corpul emailului (HTML simplu cu tabele)",
  "signature": "Semnătura",
  "totalValue": 1234.56,
  "productsFound": ["lista produse găsite"],
  "productsNotFound": ["lista produse negăsite"]
}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 2000, temperature: 0.7 },
        }),
      }
    );

    if (!response.ok) {
      console.error("[AI-QUOTE] Gemini error:", response.status);
      return NextResponse.json({ error: "Eroare Gemini API" }, { status: 500 });
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const cleaned = rawText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    try {
      const result = JSON.parse(cleaned);
      return NextResponse.json({
        quote: result,
        products: products,
        companyInfo: companyInfo
      });
    } catch {
      // Fallback - returnăm textul raw
      return NextResponse.json({
        quote: {
          subject: `Ofertă ${companyInfo.name} - ${requestedProducts.slice(0, 2).join(", ")}`,
          body: rawText,
          totalValue: products.reduce((s, p) => s + p.price, 0)
        },
        products: products
      });
    }
  } catch (error) {
    console.error("[AI-QUOTE] Error:", error);
    return NextResponse.json({ error: "Eroare server" }, { status: 500 });
  }
}
