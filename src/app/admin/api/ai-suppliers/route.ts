import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminAuthMiddleware } from "@/lib/auth-middleware";

const db = prisma as any;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

// POST — caută furnizori cu AI și opțional îi adaugă automat
export async function POST(req: NextRequest) {
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;

  try {
    const { action } = await req.json();

    if (action === "search") {
      return await searchSuppliers();
    }

    if (action === "add-all") {
      return await addSuggestedSuppliers();
    }

    return NextResponse.json({ error: "Acțiune necunoscută" }, { status: 400 });
  } catch (error) {
    console.error("[AI-SUPPLIERS] Error:", error);
    return NextResponse.json({ error: "Eroare server" }, { status: 500 });
  }
}

// Furnizori predefiniți — fallback când Gemini nu este disponibil
function getFallbackSuppliers(existingNames: string[]) {
  const allFallback = [
    {
      name: "TME Electronic Components",
      contactPerson: "Departament Vânzări",
      email: "sales@tme.eu",
      phone: "+48 42 645 55 55",
      website: "https://www.tme.eu",
      address: "Łódź, Polonia",
      notes: "Unul dintre cei mai mari distribuitori de componente electronice din Europa. Livrare rapidă în România.",
      rating: 9,
    },
    {
      name: "RS Components",
      contactPerson: "Departament Vânzări",
      email: null,
      phone: null,
      website: "https://ro.rs-online.com",
      address: "Londra, Marea Britanie",
      notes: "Distribuitor global de componente industriale, automatizări, senzori, conectori. Stoc mare, livrare rapidă.",
      rating: 9,
    },
    {
      name: "Farnell / element14",
      contactPerson: "Departament Vânzări",
      email: null,
      phone: null,
      website: "https://ro.farnell.com",
      address: "Leeds, Marea Britanie",
      notes: "Distribuitor global de componente electronice și echipamente de automatizare. Prețuri competitive.",
      rating: 8,
    },
    {
      name: "Automation24",
      contactPerson: "Departament Vânzări",
      email: "info@automation24.com",
      phone: "+49 201 523 968 0",
      website: "https://www.automation24.com",
      address: "Essen, Germania",
      notes: "Specializat pe automatizări industriale: senzori, PLC-uri, alimentatoare, conectori industriali.",
      rating: 9,
    },
    {
      name: "Elmark Automatyka",
      contactPerson: "Departament Vânzări",
      email: "info@elmark.com.pl",
      phone: "+48 22 541 84 65",
      website: "https://www.elmark.com.pl",
      address: "Varșovia, Polonia",
      notes: "Distribuitor componente de automatizare, senzori, PLC, HMI. Prezență în Europa de Est.",
      rating: 7,
    },
    {
      name: "Mouser Electronics",
      contactPerson: "Departament Vânzări",
      email: null,
      phone: null,
      website: "https://www.mouser.com",
      address: "Mansfield, Texas, SUA",
      notes: "Distribuitor global semiconductoare și componente electronice. Livrare în România prin DHL.",
      rating: 8,
    },
    {
      name: "Conrad Electronic",
      contactPerson: "Departament Vânzări",
      email: null,
      phone: null,
      website: "https://www.conrad.com",
      address: "Hirschau, Germania",
      notes: "Componente electronice, automatizări, unelte, echipamente de testare. Magazin online cu livrare în RO.",
      rating: 7,
    },
    {
      name: "Vikiwat",
      contactPerson: "Departament Vânzări",
      email: "sales@vikiwat.com",
      phone: "+359 32 625 727",
      website: "https://www.vikiwat.com",
      address: "Plovdiv, Bulgaria",
      notes: "Distribuitor regional componente electronice, conectori, cabluri, surse alimentare. Prețuri bune pentru Europa de Est.",
      rating: 6,
    },
    {
      name: "Klinkmann",
      contactPerson: "Departament Vânzări",
      email: "romania@klinkmann.com",
      phone: null,
      website: "https://www.klinkmann.com",
      address: "Helsinki, Finlanda",
      notes: "Distribuitor automatizări industriale (Mitsubishi, Weintek, Autonics). Birou în România.",
      rating: 8,
    },
    {
      name: "Aurocon COMPEC",
      contactPerson: "Departament Vânzări",
      email: "compec@compec.ro",
      phone: "+40 21 311 13 81",
      website: "https://www.compec.ro",
      address: "București, România",
      notes: "Distribuitor român componente electronice și automatizări. Reprezentant autorizat pentru multiple branduri.",
      rating: 8,
    },
  ];

  // Filtrare inteligentă: exclude dacă numele existent CONȚINE sau E CONȚINUT în sugestie
  return allFallback.filter((s) => {
    const suggestedLower = s.name.toLowerCase();
    return !existingNames.some((existing) => 
      existing.includes(suggestedLower) || suggestedLower.includes(existing)
    );
  });
}

async function searchSuppliers() {
  // Analizează produsele existente
  const products = await prisma.product.findMany({
    select: { domain: true, type: true, brand: true, manufacturer: true, name: true },
  });

  // Extrage categorii unice
  const domains = [...new Set(products.map(p => p.domain).filter(Boolean))];
  const types = [...new Set(products.map(p => p.type).filter(Boolean))];
  const brands = [...new Set(products.map(p => p.brand).filter(Boolean))];
  const manufacturers = [...new Set(products.map(p => p.manufacturer).filter(Boolean))];

  // Furnizori existenți
  const existingSuppliers = await db.supplier.findMany({ select: { name: true } });
  const existingNames = existingSuppliers.map((s: any) => s.name.toLowerCase());

  if (!GEMINI_API_KEY) {
    return NextResponse.json({
      error: "GEMINI_API_KEY nu este configurat",
      suggestions: [],
    }, { status: 400 });
  }

  const prompt = `Ești un expert în achiziții industriale pentru o firmă din România.
Firma vinde echipamente de automatizare industrială cu aceste categorii:
- Domenii: ${domains.join(", ")}
- Tipuri produse: ${types.join(", ")}
- Branduri/Producători: ${[...brands, ...manufacturers].filter(Boolean).join(", ") || "diverse"}

Furnizori deja existenți (NU-i repeta): ${existingNames.join(", ") || "niciunul"}

Găsește EXACT 8 furnizori/distribuitori reali din România sau Europa care vând aceste tipuri de produse.
Pentru fiecare furnizor returnează STRICT acest format JSON (fără alte texte):
[
  {
    "name": "Nume firmă",
    "contactPerson": "Departament vânzări",
    "email": "email real sau null",
    "phone": "telefon real sau null",
    "website": "website real",
    "address": "Oraș, Țară",
    "notes": "Descriere scurtă: ce vând, de ce sunt relevanți, avantaje",
    "rating": 7
  }
]

IMPORTANT:
- Doar furnizori REALI cu website-uri funcționale
- Include mix: distribuitori mari (Farnell, RS Components, TME, Automation24) și furnizori locali din România
- Rating 1-10 bazat pe relevanță pentru produsele noastre
- Email și telefon reale dacă sunt publice, altfel null
- Răspunde DOAR cu array-ul JSON, fără alte texte`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 2000, temperature: 0.3 },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[AI-SUPPLIERS] Gemini error:", response.status, errorText);
    // Fallback — furnizori predefiniți din industria automatizărilor
    const fallbackSuppliers = getFallbackSuppliers(existingNames);
    if (fallbackSuppliers.length > 0) {
      return NextResponse.json({
        suggestions: fallbackSuppliers,
        productStats: { totalProducts: products.length, domains, types: types.slice(0, 10), brands: brands.slice(0, 10) },
        note: "Sugestii din baza de date locală (limita AI depășită, reîncearcă mai târziu)",
      });
    }
    return NextResponse.json({ error: `Limita API Gemini depășită. Reîncearcă peste câteva minute.`, suggestions: [] }, { status: 429 });
  }

  const data = await response.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

  // Parsează JSON din răspuns
  let suggestions: any[] = [];
  try {
    // Elimină markdown code blocks dacă există
    const cleaned = rawText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    suggestions = JSON.parse(cleaned);
  } catch {
    // Încearcă să extragă JSON-ul din text
    const match = rawText.match(/\[[\s\S]*\]/);
    if (match) {
      try {
        suggestions = JSON.parse(match[0]);
      } catch {
        return NextResponse.json({
          error: "Nu am putut parsa sugestiile AI",
          rawText,
          suggestions: [],
        });
      }
    }
  }

  // Filtrează duplicatele cu furnizorii existenți (match inteligent)
  suggestions = suggestions.filter((s: any) => {
    if (!s.name) return false;
    const suggestedLower = s.name.toLowerCase();
    return !existingNames.some((existing: string) => 
      existing.includes(suggestedLower) || suggestedLower.includes(existing)
    );
  });

  // Adaugă status și validare
  suggestions = suggestions.map((s: any) => ({
    name: s.name || "Necunoscut",
    contactPerson: s.contactPerson || null,
    email: s.email || null,
    phone: s.phone || null,
    website: s.website || null,
    address: s.address || null,
    notes: s.notes || null,
    rating: Math.min(10, Math.max(1, parseInt(s.rating) || 5)),
  }));

  // Dacă nu avem sugestii după filtrare, folosește fallback
  if (suggestions.length === 0) {
    const fallbackSuppliers = getFallbackSuppliers(existingNames);
    if (fallbackSuppliers.length > 0) {
      return NextResponse.json({
        suggestions: fallbackSuppliers,
        productStats: { totalProducts: products.length, domains, types: types.slice(0, 10), brands: brands.slice(0, 10) },
        note: "Furnizorii sugerați de AI erau deja în baza ta. Iată alternative din lista noastră.",
      });
    }
    return NextResponse.json({
      suggestions: [],
      note: "Toți furnizorii cunoscuți sunt deja adăugați în sistem!",
      productStats: { totalProducts: products.length, domains, types: types.slice(0, 10), brands: brands.slice(0, 10) },
    });
  }

  return NextResponse.json({
    suggestions,
    productStats: {
      totalProducts: products.length,
      domains,
      types: types.slice(0, 10),
      brands: brands.slice(0, 10),
    },
  });
}

async function addSuggestedSuppliers() {
  // Rulează din nou căutarea și adaugă automat
  const searchResponse = await searchSuppliers();
  const searchData = await searchResponse.json();

  if (!searchData.suggestions || searchData.suggestions.length === 0) {
    return NextResponse.json({ error: "Nu s-au găsit furnizori noi", added: 0 });
  }

  let added = 0;
  const results: any[] = [];

  for (const s of searchData.suggestions) {
    try {
      // Verifică dacă nu există deja (double check)
      const existing = await db.supplier.findFirst({
        where: { name: { equals: s.name } },
      });

      if (existing) continue;

      const supplier = await db.supplier.create({
        data: {
          name: s.name,
          contactPerson: s.contactPerson,
          email: s.email,
          phone: s.phone,
          website: s.website,
          address: s.address,
          notes: `[AI] ${s.notes || "Adăugat automat de AI"}`,
          rating: s.rating,
          active: true,
        },
      });
      added++;
      results.push({ id: supplier.id, name: supplier.name });
    } catch (err) {
      console.error(`[AI-SUPPLIERS] Error adding ${s.name}:`, err);
    }
  }

  return NextResponse.json({ added, results, total: searchData.suggestions.length });
}
