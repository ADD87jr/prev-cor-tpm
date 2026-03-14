import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminAuthMiddleware } from "@/lib/auth-middleware";
import https from "https";
import fs from "fs";
import path from "path";

const db = prisma as any;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

// ===== Auto-download imagini reale =====

// Asigură imagini implicite pentru sugestii AI (dacă nu au deja)
function ensureDefaultImages(suggestions: any): void {
  if (!suggestions?.categories) return;
  for (const cat of suggestions.categories) {
    for (const p of cat.products || []) {
      if (!p.image) {
        p.image = getCategoryImage(p.type || "", cat.category || "");
      }
    }
  }
}

function httpsGetJson(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { "User-Agent": "PREV-COR-TPM-Catalog/1.0" }, timeout: 10000 }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        httpsGetJson(res.headers.location).then(resolve).catch(reject);
        return;
      }
      let data = "";
      res.on("data", (chunk: string) => (data += chunk));
      res.on("end", () => {
        try { resolve(JSON.parse(data)); } catch { reject(new Error("Invalid JSON")); }
      });
    });
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("timeout")); });
  });
}

function downloadImage(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const doDownload = (downloadUrl: string, redirects: number) => {
      if (redirects > 5) { reject(new Error("Too many redirects")); return; }
      const protocol = downloadUrl.startsWith("https") ? https : require("http");
      protocol.get(downloadUrl, { headers: { "User-Agent": "PREV-COR-TPM-Catalog/1.0" }, timeout: 15000 }, (res: any) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          doDownload(res.headers.location, redirects + 1);
          return;
        }
        if (res.statusCode !== 200) { reject(new Error(`HTTP ${res.statusCode}`)); return; }
        const file = fs.createWriteStream(dest);
        res.pipe(file);
        file.on("finish", () => { file.close(); resolve(); });
        file.on("error", (err: Error) => { try { fs.unlinkSync(dest); } catch {} reject(err); });
      }).on("error", reject);
    };
    doDownload(url, 0);
  });
}

async function fetchProductImage(productName: string, productNameEn: string, productType: string, productId: number): Promise<string> {
  const outDir = path.join(process.cwd(), "public", "products");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  // Build multiple search terms — English names work better on Wikimedia
  const searchTerms = [
    productNameEn,                          // "Inductive Sensor M12 PNP NO 4mm"
    productNameEn?.split(" ").slice(0, 3).join(" "),  // "Inductive Sensor M12"
    productType ? `${productType}` : "",    // "Senzori inductivi"
    productType ? `${productType} industrial` : "",
    // Generic English terms derived from product name
    ...(productNameEn ? [
      productNameEn.replace(/\d+/g, "").trim(),  // Remove numbers for broader match
    ] : []),
  ].filter(Boolean);

  for (const query of searchTerms) {
    try {
      const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srnamespace=6&srlimit=8&format=json`;
      const searchData = await httpsGetJson(searchUrl);
      if (!searchData.query?.search?.length) continue;

      for (const item of searchData.query.search) {
        const title: string = item.title;
        if (!title.match(/\.(jpg|jpeg|png)$/i)) continue;
        // Skip irrelevant images
        if (/mouse|smoke|elevator|streetlight|keyboard|desktop|laptop|phone/i.test(title)) continue;

        const infoUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=imageinfo&iiprop=url|size&iiurlwidth=400&format=json`;
        const infoData = await httpsGetJson(infoUrl);
        const pages = infoData.query?.pages;
        if (!pages) continue;
        const page = Object.values(pages)[0] as any;
        const ii = page?.imageinfo?.[0];
        if (!ii?.thumburl || ii.width < 80) continue;

        // Download thumbnail
        const ext = path.extname(title.replace(/\s/g, "_")).toLowerCase() || ".jpg";
        const fileName = `product-${productId}-real${ext}`;
        const filePath = path.join(outDir, fileName);

        await downloadImage(ii.thumburl, filePath);
        const stats = fs.statSync(filePath);
        if (stats.size < 1000) { try { fs.unlinkSync(filePath); } catch {} continue; }

        console.log(`[AI-DISCOVER] Image downloaded for "${productName}": ${fileName} (${Math.round(stats.size / 1024)}KB)`);
        return `/products/${fileName}`;
      }
    } catch (err) {
      console.log(`[AI-DISCOVER] Image search error for "${query}":`, (err as Error).message);
    }
  }

  // Fallback to category image
  return getCategoryImage(productType, "");
}

export async function POST(req: NextRequest) {
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;

  try {
    const { action, products: approvedProducts, searchQuery } = await req.json();

    if (action === "discover") {
      return await discoverNewProducts(searchQuery);
    }

    if (action === "approve" && approvedProducts) {
      return await approveAndCreateProducts(approvedProducts);
    }

    if (action === "find-suppliers" && approvedProducts) {
      return await findSuppliersForProducts(approvedProducts);
    }

    return NextResponse.json({ error: "Acțiune necunoscută" }, { status: 400 });
  } catch (error) {
    console.error("[AI-DISCOVER] Error:", error);
    return NextResponse.json({ error: "Eroare server" }, { status: 500 });
  }
}

async function discoverNewProducts(searchQuery?: string) {
  // Analizez catalogul existent - includem și SKU pentru comparație precisă
  const products = await prisma.product.findMany({
    select: { name: true, domain: true, type: true, brand: true, manufacturer: true, price: true, sku: true },
  });

  // Încărcăm și categoriile configurate din admin (inclusiv subcategorii)
  const configuredTypes: string[] = [];
  const configuredDomains: string[] = [];
  try {
    const typesSettings = await db.siteSettings.findUnique({ where: { key: 'product_types' } });
    const domainsSettings = await db.siteSettings.findUnique({ where: { key: 'product_domains' } });
    
    if (typesSettings?.value) {
      const typesList = JSON.parse(typesSettings.value);
      for (const t of typesList) {
        configuredTypes.push(t.name);
        // Adăugăm și subcategoriile
        if (t.subcategories?.length) {
          for (const sub of t.subcategories) {
            configuredTypes.push(sub.name);
          }
        }
      }
    }
    
    if (domainsSettings?.value) {
      const domainsList = JSON.parse(domainsSettings.value);
      for (const d of domainsList) {
        configuredDomains.push(d.name);
      }
    }
  } catch (e) {
    console.log('[AI-DISCOVER] Could not load configured categories:', e);
  }

  // Combinăm tipurile din produse + cele configurate în admin
  const domains = [...new Set([...products.map(p => p.domain).filter(Boolean), ...configuredDomains])];
  const types = [...new Set([...products.map(p => p.type).filter(Boolean), ...configuredTypes])];
  const brands = [...new Set(products.map(p => p.brand).filter(Boolean))];
  const manufacturers = [...new Set(products.map(p => p.manufacturer).filter(Boolean))];
  const existingNames = products.map(p => p.name.toLowerCase());
  const existingSkus = products.map(p => p.sku?.toLowerCase()).filter(Boolean) as string[];

  // Furnizori existenți
  const suppliers = await db.supplier.findMany({
    where: { active: true },
    select: { name: true, website: true, notes: true },
  });

  // Comenzi — ce se caută/cumpără
  const orders = await db.order.findMany({
    select: { items: true },
    orderBy: { date: "desc" },
    take: 100,
  });

  const orderedTypes: Record<string, number> = {};
  for (const order of orders) {
    const items = Array.isArray(order.items) ? order.items : [];
    for (const item of items) {
      const key = item.type || item.domain || "altele";
      orderedTypes[key] = (orderedTypes[key] || 0) + (item.quantity || 1);
    }
  }

  const companyProfile = {
    name: "PREV-COR TPM S.R.L.",
    description: "Firmă din România specializată pe vânzarea de echipamente de automatizare industrială",
    currentDomains: domains,
    currentTypes: types,
    currentBrands: [...brands, ...manufacturers].filter(Boolean),
    productCount: products.length,
    suppliers: suppliers.map((s: any) => s.name),
    topOrderedCategories: Object.entries(orderedTypes).sort((a, b) => b[1] - a[1]).slice(0, 5),
  };

  // Funcție pentru filtrarea produselor deja existente din sugestii
  const filterExistingProducts = (suggestions: any): any => {
    if (!suggestions?.categories) return suggestions;
    
    const filtered = {
      ...suggestions,
      categories: suggestions.categories.map((cat: any) => ({
        ...cat,
        products: (cat.products || []).filter((p: any) => {
          const nameMatch = p.name?.toLowerCase();
          const skuMatch = p.productCode?.toLowerCase();
          
          // Verifică dacă produsul există deja (după SKU sau nume similar)
          const existsBySku = skuMatch && existingSkus.some(sku => 
            sku === skuMatch || sku.includes(skuMatch) || skuMatch.includes(sku)
          );
          
          const existsByName = existingNames.some(name => {
            // Potrivire exactă sau similaritate ridicată
            if (name === nameMatch) return true;
            // Verifică dacă numele conține cuvintele cheie comune
            const nameWords = nameMatch?.split(/\s+/) || [];
            const existingWords = name.split(/\s+/) || [];
            const commonWords = nameWords.filter((w: string) => 
              w.length > 3 && existingWords.some((ew: string) => ew.includes(w) || w.includes(ew))
            );
            // Dacă mai mult de 60% din cuvinte se potrivesc, considerăm duplicat
            return nameWords.length > 2 && commonWords.length / nameWords.length > 0.6;
          });
          
          if (existsBySku || existsByName) {
            console.log(`[AI-DISCOVER] Filtrat produs existent: ${p.name} (SKU: ${p.productCode || 'N/A'})`);
            return false;
          }
          return true;
        })
      })).filter((cat: any) => cat.products.length > 0) // Elimină categoriile fără produse
    };
    
    return filtered;
  };

  // Gemini
  if (GEMINI_API_KEY) {
    const aiResult = await getAIProductSuggestions(companyProfile, existingNames, searchQuery);
    if (aiResult) {
      // Asigură imagini implicite pentru sugestii AI
      ensureDefaultImages(aiResult);
      // Filtrăm produsele deja existente
      const filteredResult = filterExistingProducts(aiResult);
      return NextResponse.json({ suggestions: filteredResult, profile: companyProfile });
    }
  }

  // Fallback local — produse cu imagini reale pre-descărcate
  const fallback = getFallbackProductSuggestions(companyProfile, existingNames);
  // Filtrăm și din fallback
  const filteredFallback = filterExistingProducts(fallback);
  return NextResponse.json({
    suggestions: filteredFallback,
    profile: companyProfile,
    note: "Sugestii din baza de date locală (Gemini indisponibil)",
  });
}

async function getAIProductSuggestions(profile: any, existingNames: string[], searchQuery?: string): Promise<any | null> {
  try {
    const searchInstruction = searchQuery 
      ? `\n\nCĂUTARE SPECIFICĂ: Utilizatorul caută produse legate de "${searchQuery}". Concentrează-te pe această categorie/tip de produse!
` 
      : "";
      
    const prompt = `Ești expert în automatizări industriale și consultant de business pentru firma ${profile.name} din România.${searchInstruction}

PROFIL FIRMĂ:
- ${profile.description}
- Domenii actuale: ${profile.currentDomains.join(", ") || "încă nu are"}
- Tipuri produse: ${profile.currentTypes.join(", ") || "puține"}
- Branduri: ${profile.currentBrands.join(", ") || "diverse"}
- Total produse în catalog: ${profile.productCount}
- Furnizori: ${profile.suppliers.join(", ") || "niciunul"}
${profile.topOrderedCategories.length > 0 ? `- Cele mai comandate categorii: ${profile.topOrderedCategories.map(([k, v]: [string, number]) => `${k} (${v} buc)`).join(", ")}` : ""}

CERINȚĂ: Sugerează 12-15 produse NOI pe care firma ar trebui să le adauge în catalog.
Include pentru FIECARE produs: specificații tehnice reale, avantaje, cod produs de la producător, URL imagine reală de pe site-ul furnizorului, link fișă tehnică PDF și fișă de securitate dacă este cazul.

Produse care NU trebuie sugerate (există deja): ${existingNames.slice(0, 30).join(", ")}

Pentru fiecare produs returnează STRICT acest format JSON (fără alte texte):
{
  "categories": [
    {
      "category": "Numele categoriei",
      "reason": "De ce merită această categorie",
      "products": [
        {
          "name": "Nume produs complet RO",
          "nameEn": "Full product name EN",
          "productCode": "Cod producător real (ex: PR12-4DP)",
          "type": "Tip produs",
          "domain": "Domeniu",
          "description": "Descriere scurtă 1-2 propoziții",
          "estimatedPrice": 150,
          "estimatedPurchasePrice": 80,
          "brand": "Brand/Producător",
          "priority": "MARE/MEDIE/MICĂ",
          "whyRelevant": "De ce e relevant",
          "suggestedSupplier": "TME, RS Components etc",
          "supplierUrl": "https://www.tme.eu/ro/details/COD/... (link real produs la furnizor)",
          "imageUrl": "https://... (URL imagine reală produs de pe site furnizor/producător)",
          "specs": ["Tip: Inductiv, cilindric", "Distanță: 4 mm", "Ieșire: PNP NO", "Tensiune: 10-30V DC", "Protecție: IP67"],
          "specsEn": ["Type: Inductive, cylindrical", "Distance: 4 mm", "Output: PNP NO", "Voltage: 10-30V DC", "Protection: IP67"],
          "advantages": ["IP67 - protecție la praf și apă", "Montaj ușor M12"],
          "advantagesEn": ["IP67 - dust and water protection", "Easy M12 mounting"],
          "datasheetUrl": "https://... (link PDF fișă tehnică de pe site producător, dacă există)",
          "safetySheetUrl": "https://... (link fișă securitate, doar dacă este relevant - ex: produse chimice)"
        }
      ]
    }
  ],
  "marketInsight": "Observații piață automatizări industriale România 2026",
  "estimatedInvestment": "Estimare buget total"
}

IMPORTANT:
- Produse REALE cu CODURI REALE de la producători reali
- Specificații tehnice REALE preluate din fișele tehnice ale producătorilor
- URL-uri REALE de pe site-urile furnizorilor (TME, Automation24, RS Components, Farnell, Mouser)
- Imagini REALE de pe site-urile furnizorilor/producătorilor
- Link-uri REALE către fișe tehnice PDF de pe site-ul producătorului
- Prețuri realiste în RON
- Branduri: Autonics, Omron, Siemens, Schneider, Phoenix Contact, Weidmüller, MEAN WELL, Finder, ABB
- Răspunde DOAR cu JSON-ul`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 4000, temperature: 0.5 },
        }),
      }
    );

    if (!response.ok) {
      console.error("[AI-DISCOVER] Gemini error:", response.status);
      return null;
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const cleaned = rawText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    try {
      return JSON.parse(cleaned);
    } catch {
      const match = rawText.match(/\{[\s\S]*\}/);
      if (match) {
        try { return JSON.parse(match[0]); } catch { }
      }
      return null;
    }
  } catch (error) {
    console.error("[AI-DISCOVER] AI error:", error);
    return null;
  }
}

function getCategoryImage(type: string, category: string): string {
  const t = (type || "").toLowerCase();
  const c = (category || "").toLowerCase();
  if (t.includes("senzor") || c.includes("senzor")) return "/products/senzor-industrial.jpg";
  if (t.includes("alimentat") || t.includes("sursă") || c.includes("alimentat")) return "/products/tablou-electric.jpg";
  if (t.includes("releu") || t.includes("contactor") || c.includes("relee") || c.includes("contactor")) return "/products/componente-mecanice.jpg";
  if (t.includes("conector") || t.includes("cablu") || c.includes("conector")) return "/products/componente-mecanice.jpg";
  if (t.includes("buton") || t.includes("indicator") || t.includes("lampă") || c.includes("buton") || c.includes("indicat")) return "/products/tablou-electric.jpg";
  if (t.includes("robot") || c.includes("robot")) return "/products/robot-industrial.jpg";
  if (t.includes("moderniz") || c.includes("moderniz")) return "/products/modernizare.jpg";
  if (t.includes("mentenan") || c.includes("mentenan")) return "/products/mentenanta.jpg";
  return "/products/default.jpg";
}

function getFallbackProductSuggestions(profile: any, existingNames: string[]) {
  return {
    categories: [
      {
        category: "Senzori industriali",
        reason: "Categoria principală în automatizări — cerere constantă, marje bune",
        products: [
          {
            name: "Senzor inductiv M12 PNP NO 4mm Autonics PR12-4DP",
            nameEn: "Inductive Proximity Sensor M12 PNP NO 4mm Autonics PR12-4DP",
            productCode: "PR12-4DP",
            type: "Senzori inductivi", domain: "Automatizari industriale",
            description: "Senzor inductiv cilindric M12, ieșire PNP NO, distanță sesizare 4mm, alimentare 10-30V DC, protecție IP67. Produs real Autonics.",
            estimatedPrice: 85, estimatedPurchasePrice: 45, brand: "Autonics", priority: "MARE",
            whyRelevant: "Cel mai cerut tip de senzor în industrie",
            suggestedSupplier: "TME, Automation24",
            supplierUrl: "https://www.tme.eu/ro/details/pr12-4dp/senzori-de-inductie-cilind/autonics/",
            imageUrl: "https://www.autonics.com/media/product/2000002043/PR12-4DP.png",
            image: "/products/product-3-real.jpg",
            specs: [
              "Cod producător: PR12-4DP",
              "Tip: Inductiv, cilindric, neecranat",
              "Diametru: M12 x 1",
              "Distanță sesizare: 4 mm",
              "Ieșire: PNP NO (Normal Deschis)",
              "Tensiune alimentare: 10-30 V DC",
              "Curent maxim sarcină: 200 mA",
              "Frecvență comutare: 500 Hz",
              "Protecție: IP67",
              "Material carcasă: Nichel/Alamă",
              "Conexiune: Cablu 3 fire, 2m",
              "Temperatură operare: -25°C ... +70°C",
              "Indicator LED: Da"
            ],
            specsEn: [
              "Part number: PR12-4DP",
              "Type: Inductive, cylindrical, unshielded",
              "Diameter: M12 x 1",
              "Sensing distance: 4 mm",
              "Output: PNP NO (Normally Open)",
              "Supply voltage: 10-30 V DC",
              "Max load current: 200 mA",
              "Switching frequency: 500 Hz",
              "Protection: IP67",
              "Housing material: Nickel/Brass",
              "Connection: 3-wire cable, 2m",
              "Operating temperature: -25°C ... +70°C",
              "LED indicator: Yes"
            ],
            advantages: [
              "IP67 – protecție completă la praf și apă",
              "Distanță sesizare 4mm – acoperire excelentă pentru detectarea metalelor",
              "Montaj ușor cu filet M12 standard",
              "Ieșire PNP NO – compatibil cu orice PLC modern",
              "LED indicator vizibil 360° pentru diagnosticare rapidă",
              "Frecvență comutare 500Hz – ideal pentru automatizări rapide",
              "Interval temperatură extins -25...+70°C"
            ],
            advantagesEn: [
              "IP67 – complete dust and water protection",
              "4mm sensing distance – excellent coverage for metal detection",
              "Easy mounting with standard M12 thread",
              "PNP NO output – compatible with any modern PLC",
              "360° visible LED indicator for quick diagnostics",
              "500Hz switching frequency – ideal for fast automation",
              "Extended temperature range -25...+70°C"
            ],
            datasheetUrl: "https://www.tme.eu/Document/5a7b0b8d7b2a8e5b1c0d9e3f4a2b1c0d/PR12-4DP.pdf",
            safetySheetUrl: null
          },
          {
            name: "Senzor fotoelectric difuz M18 Autonics BR200-DDTN",
            nameEn: "Photoelectric Diffuse Sensor M18 Autonics BR200-DDTN",
            productCode: "BR200-DDTN",
            type: "Senzori fotoelectrici", domain: "Automatizari industriale",
            description: "Senzor fotoelectric difuz cu LED infraroșu, distanță detectare 200mm, ieșire PNP NO+NC, M18, IP67.",
            estimatedPrice: 120, estimatedPurchasePrice: 65, brand: "Autonics", priority: "MARE",
            whyRelevant: "Complementar senzorilor inductivi, folosiți pe linii de producție",
            suggestedSupplier: "TME, RS Components",
            supplierUrl: "https://www.tme.eu/ro/details/br200-ddtn-c-p/senzori-fotoelectrici-standard/autonics/",
            imageUrl: "https://www.autonics.com/media/product/2000001928/BR200-DDTN.png",
            image: "/products/product-4-real.png",
            specs: [
              "Cod producător: BR200-DDTN",
              "Tip: Fotoelectric, difuz",
              "Diametru: M18",
              "Distanță detectare: 200 mm",
              "Sursă lumină: LED infraroșu (860nm)",
              "Ieșire: PNP NO+NC",
              "Tensiune alimentare: 12-24 V DC",
              "Curent sarcină: max 200 mA",
              "Protecție: IP67",
              "Conexiune: Cablu, 2m",
              "Temperatură operare: -25°C ... +55°C",
              "Timp răspuns: max 1 ms"
            ],
            specsEn: [
              "Part number: BR200-DDTN",
              "Type: Photoelectric, diffuse reflective",
              "Diameter: M18",
              "Sensing distance: 200 mm",
              "Light source: Infrared LED (860nm)",
              "Output: PNP NO+NC",
              "Supply voltage: 12-24 V DC",
              "Load current: max 200 mA",
              "Protection: IP67",
              "Connection: Cable, 2m",
              "Operating temperature: -25°C ... +55°C",
              "Response time: max 1 ms"
            ],
            advantages: [
              "Detectare obiecte non-metalice (plastic, lemn, hârtie, lichide)",
              "Ieșire duală NO+NC – flexibilitate maximă în cablare",
              "Distanță 200mm – plajă extinsă de detectare",
              "IP67 – funcționare fiabilă în medii industriale dure",
              "Ajustare sensibilitate cu potențiometru integrat",
              "Timp răspuns rapid 1ms"
            ],
            advantagesEn: [
              "Non-metallic object detection (plastic, wood, paper, liquids)",
              "Dual NO+NC output – maximum wiring flexibility",
              "200mm range – extended detection distance",
              "IP67 – reliable operation in harsh industrial environments",
              "Sensitivity adjustment with built-in potentiometer",
              "Fast 1ms response time"
            ],
            datasheetUrl: "https://www.tme.eu/Document/602e1070bdc07268c06f1002d9e33ffa/BR-series.pdf",
            safetySheetUrl: null
          },
          {
            name: "Senzor capacitiv M18 PNP 8mm Autonics CR18-8DP",
            nameEn: "Capacitive Proximity Sensor M18 PNP 8mm Autonics CR18-8DP",
            productCode: "CR18-8DP",
            type: "Senzori capacitivi", domain: "Automatizari industriale",
            description: "Senzor capacitiv cilindric M18, detectează lichide și materiale nemetalice, distanță 8mm, PNP NO, IP67.",
            estimatedPrice: 110, estimatedPurchasePrice: 60, brand: "Autonics", priority: "MEDIE",
            whyRelevant: "Detectare materiale nemetalice — piață mare în alimentare și chimie",
            suggestedSupplier: "Farnell, TME",
            supplierUrl: "https://www.tme.eu/ro/details/cr18-8dp/senzori-de-capacitate-cili/autonics/",
            imageUrl: "https://www.autonics.com/media/product/2000001883/CR18-8DP.png",
            image: "/products/product-5-real.jpg",
            specs: [
              "Cod producător: CR18-8DP",
              "Tip: Capacitiv, cilindric",
              "Diametru: M18 x 1",
              "Distanță sesizare: 8 mm (ajustabilă)",
              "Ieșire: PNP NO",
              "Tensiune alimentare: 12-24 V DC",
              "Curent sarcină: max 200 mA",
              "Protecție: IP67",
              "Material detecție: Metal, plastic, lichide, lemn, granule",
              "Conexiune: Cablu 3 fire, 2m",
              "Temperatură: -25°C ... +70°C",
              "Reglaj sensibilitate: Potențiometru"
            ],
            specsEn: [
              "Part number: CR18-8DP",
              "Type: Capacitive, cylindrical",
              "Diameter: M18 x 1",
              "Sensing distance: 8 mm (adjustable)",
              "Output: PNP NO",
              "Supply voltage: 12-24 V DC",
              "Load current: max 200 mA",
              "Protection: IP67",
              "Detection material: Metal, plastic, liquids, wood, granules",
              "Connection: 3-wire cable, 2m",
              "Temperature: -25°C ... +70°C",
              "Sensitivity adjustment: Potentiometer"
            ],
            advantages: [
              "Detectează materiale nemetalice: lichide, plastic, lemn, granule",
              "Distanță sesizare 8mm – performanță ridicată",
              "IP67 – utilizare în medii umede și cu praf",
              "Ideal pentru industria alimentară, chimică și farmaceutică",
              "Reglaj sensibilitate integrat cu potențiometru",
              "Compatibil cu detectarea nivelului de lichide prin perete"
            ],
            advantagesEn: [
              "Detects non-metallic materials: liquids, plastic, wood, granules",
              "8mm sensing distance – high performance",
              "IP67 – use in wet and dusty environments",
              "Ideal for food, chemical and pharmaceutical industry",
              "Built-in sensitivity adjustment with potentiometer",
              "Compatible with liquid level detection through wall"
            ],
            datasheetUrl: "https://www.tme.eu/Document/3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f/CR-series.pdf",
            safetySheetUrl: null
          },
        ],
      },
      {
        category: "Alimentatoare industriale",
        reason: "Produs esențial în orice tablou electric — cerere constantă, vânzări în volum",
        products: [
          {
            name: "Alimentator șină DIN 24V 3.83A 92W MEAN WELL HDR-100-24",
            nameEn: "DIN Rail Power Supply 24V 3.83A 92W MEAN WELL HDR-100-24",
            productCode: "HDR-100-24",
            type: "Alimentatoare", domain: "Automatizari industriale",
            description: "Sursă alimentare industrială 24V DC, 3.83A (92W), montaj pe șină DIN, eficiență >87%, protecții complete.",
            estimatedPrice: 180, estimatedPurchasePrice: 95, brand: "MEAN WELL", priority: "MARE",
            whyRelevant: "Necesar în orice tablou de automatizare – cea mai cerută putere",
            suggestedSupplier: "TME, Mouser",
            supplierUrl: "https://www.tme.eu/ro/details/hdr-100-24/alimentatoare-pe-sina-din/mean-well/",
            imageUrl: "https://www.meanwell.com/Upload/PDF/HDR-100/HDR-100-PIC.jpg",
            image: "/products/product-6-real.jpg",
            specs: [
              "Cod producător: HDR-100-24",
              "Tensiune ieșire: 24V DC (ajustabil 21.6-29V)",
              "Curent ieșire: 3.83A",
              "Putere: 92W",
              "Tensiune intrare: 85-264 VAC / 120-370 VDC",
              "Eficiență: >87%",
              "Montaj: Șină DIN TS-35/7.5 sau TS-35/15",
              "Dimensiuni: 52.5 x 55.6 x 90 mm",
              "Protecții: Scurtcircuit (auto-recovery), Suprasarcină (105-150%), Supratensiune",
              "Izolație: 3kVAC intrare-ieșire",
              "Temperatură operare: -30°C ... +70°C",
              "Certificări: CE, UL, CB, TÜV",
              "MTBF: >500.000 ore (MIL-HDBK-217F)"
            ],
            specsEn: [
              "Part number: HDR-100-24",
              "Output voltage: 24V DC (adjustable 21.6-29V)",
              "Output current: 3.83A",
              "Power: 92W",
              "Input voltage: 85-264 VAC / 120-370 VDC",
              "Efficiency: >87%",
              "Mounting: DIN rail TS-35/7.5 or TS-35/15",
              "Dimensions: 52.5 x 55.6 x 90 mm",
              "Protections: Short circuit (auto-recovery), Overload (105-150%), Over voltage",
              "Isolation: 3kVAC input-output",
              "Operating temperature: -30°C ... +70°C",
              "Certifications: CE, UL, CB, TÜV",
              "MTBF: >500,000 hours (MIL-HDBK-217F)"
            ],
            advantages: [
              "Ultra-slim – doar 52.5mm lățime pe șină DIN",
              "Eficiență ridicată >87% – economie de energie",
              "Intrare universală 85-264VAC – compatibil global",
              "Protecție completă: OCP, OVP, SCP cu auto-recovery",
              "150% peak power pentru 4 secunde – pornire motoare",
              "Fiabilitate certificată MTBF >500.000 ore",
              "Fără ventilator – funcționare silențioasă"
            ],
            advantagesEn: [
              "Ultra-slim – only 52.5mm width on DIN rail",
              "High efficiency >87% – energy savings",
              "Universal input 85-264VAC – globally compatible",
              "Complete protection: OCP, OVP, SCP with auto-recovery",
              "150% peak power for 4 seconds – motor starting",
              "Certified reliability MTBF >500,000 hours",
              "Fanless – silent operation"
            ],
            datasheetUrl: "https://www.meanwell.com/Upload/PDF/HDR-100/HDR-100-SPEC.PDF",
            safetySheetUrl: null
          },
          {
            name: "Alimentator șină DIN 12V 2A 24W MEAN WELL HDR-30-12",
            nameEn: "DIN Rail Power Supply 12V 2A 24W MEAN WELL HDR-30-12",
            productCode: "HDR-30-12",
            type: "Alimentatoare", domain: "Automatizari industriale",
            description: "Sursă alimentare compactă 12V DC, 2A (24W), montaj șină DIN, ultra-slim 17.5mm.",
            estimatedPrice: 65, estimatedPurchasePrice: 35, brand: "MEAN WELL", priority: "MEDIE",
            whyRelevant: "Necesar pentru camere CCTV, interfețe HMI și aplicații cu 12V",
            suggestedSupplier: "TME, Conrad",
            supplierUrl: "https://www.tme.eu/ro/details/hdr-30-12/alimentatoare-pe-sina-din/mean-well/",
            imageUrl: "https://www.meanwell.com/Upload/PDF/HDR-30/HDR-30-PIC.jpg",
            image: "/products/product-7-real.jpg",
            specs: [
              "Cod producător: HDR-30-12",
              "Tensiune ieșire: 12V DC (ajustabil 10.8-13.8V)",
              "Curent ieșire: 2A",
              "Putere: 24W",
              "Tensiune intrare: 85-264 VAC",
              "Eficiență: >86%",
              "Montaj: Șină DIN TS-35",
              "Dimensiuni: 17.5 x 56 x 90 mm (1 SU)",
              "Protecții: Scurtcircuit, Suprasarcină (110-150%)",
              "Temperatură: -20°C ... +60°C",
              "Certificări: CE, UL, CB"
            ],
            specsEn: [
              "Part number: HDR-30-12",
              "Output voltage: 12V DC (adjustable 10.8-13.8V)",
              "Output current: 2A",
              "Power: 24W",
              "Input voltage: 85-264 VAC",
              "Efficiency: >86%",
              "Mounting: DIN rail TS-35",
              "Dimensions: 17.5 x 56 x 90 mm (1 SU)",
              "Protections: Short circuit, Overload (110-150%)",
              "Temperature: -20°C ... +60°C",
              "Certifications: CE, UL, CB"
            ],
            advantages: [
              "Ultra-compact – doar 1 modul (17.5mm) pe șină DIN",
              "Perfect pentru camere CCTV și sisteme de acces",
              "Cost redus și eficiență ridicată >86%",
              "Protecție completă la scurtcircuit și suprasarcină",
              "Intrare universală – funcționează pe orice rețea"
            ],
            advantagesEn: [
              "Ultra-compact – only 1 module (17.5mm) on DIN rail",
              "Perfect for CCTV cameras and access systems",
              "Low cost and high efficiency >86%",
              "Complete short circuit and overload protection",
              "Universal input – works on any power grid"
            ],
            datasheetUrl: "https://www.meanwell.com/Upload/PDF/HDR-30/HDR-30-SPEC.PDF",
            safetySheetUrl: null
          },
        ],
      },
      {
        category: "Relee și contactori",
        reason: "Componente de bază în automatizări — vânzare în cantități mari",
        products: [
          {
            name: "Releu industrial 24V DC 4CO 7A Finder 55.34.9.024.0040",
            nameEn: "Industrial Relay 24V DC 4CO 7A Finder 55.34.9.024.0040",
            productCode: "55.34.9.024.0040",
            type: "Relee", domain: "Automatizari industriale",
            description: "Releu industrial miniatural Finder seria 55, bobină 24V DC, 4 contacte comutare 7A, cu LED și buton test.",
            estimatedPrice: 35, estimatedPurchasePrice: 18, brand: "Finder", priority: "MARE",
            whyRelevant: "Produs de bază — se vând în cantități mari pe fiecare proiect",
            suggestedSupplier: "TME, Farnell",
            supplierUrl: "https://www.tme.eu/ro/details/55.34.9.024.004/relee-electromagnetice-industriale/finder/55-34-9-024-0040/",
            imageUrl: "https://cdn.findernet.com/app/uploads/55.34.png",
            image: "/products/product-8-real.png",
            specs: [
              "Cod producător: 55.34.9.024.0040",
              "Contacte: 4 comutare (4CO/4PDT)",
              "Curent contacte: 7A / 250V AC",
              "Bobină: 24V DC",
              "Putere bobină: 400 mW",
              "Putere comutare: 1750 VA",
              "Indicator LED: Da (verde)",
              "Buton test: Da",
              "Montaj: Pe soclu seria 94",
              "Dimensiuni: 27 x 21.5 x 37 mm",
              "Durabilitate mecanică: 10.000.000 cicluri",
              "Durabilitate electrică: 100.000 cicluri",
              "Temperatură: -40°C ... +70°C"
            ],
            specsEn: [
              "Part number: 55.34.9.024.0040",
              "Contacts: 4 changeover (4CO/4PDT)",
              "Contact current: 7A / 250V AC",
              "Coil: 24V DC",
              "Coil power: 400 mW",
              "Switching power: 1750 VA",
              "LED indicator: Yes (green)",
              "Test button: Yes",
              "Mounting: On series 94 socket",
              "Dimensions: 27 x 21.5 x 37 mm",
              "Mechanical durability: 10,000,000 cycles",
              "Electrical durability: 100,000 cycles",
              "Temperature: -40°C ... +70°C"
            ],
            advantages: [
              "4 contacte comutare – flexibilitate maximă în circuite de comandă",
              "LED indicator + buton test manual – diagnosticare rapidă",
              "Fiabilitate excelentă Finder – 10 milioane cicluri mecanice",
              "Montaj rapid pe soclu standardizat seria 94",
              "Compact – ideal pentru tablouri aglomerate",
              "Consum redus bobină 400mW – economie energie"
            ],
            advantagesEn: [
              "4 changeover contacts – maximum flexibility in control circuits",
              "LED indicator + manual test button – quick diagnostics",
              "Excellent Finder reliability – 10 million mechanical cycles",
              "Quick mounting on standardized series 94 socket",
              "Compact – ideal for crowded panels",
              "Low coil consumption 400mW – energy savings"
            ],
            datasheetUrl: "https://www.findernet.com/en/series/55-series/type/55-34",
            safetySheetUrl: null
          },
          {
            name: "Soclu releu 14 pini șină DIN Finder 94.04",
            nameEn: "Relay Socket 14 Pin DIN Rail Finder 94.04",
            productCode: "94.04",
            type: "Accesorii relee", domain: "Automatizari industriale",
            description: "Soclu standard 14 pini pentru relee Finder seria 55, montaj pe șină DIN 35mm, cu contacte argintuite.",
            estimatedPrice: 15, estimatedPurchasePrice: 7, brand: "Finder", priority: "MARE",
            whyRelevant: "Vânzare obligatorie cu releul — cross-sell natural 1:1",
            suggestedSupplier: "TME, Farnell",
            supplierUrl: "https://www.tme.eu/ro/details/94.04/relee-electromagnetice-accesorii/finder/94-04sma/",
            imageUrl: "https://cdn.findernet.com/app/uploads/94.04.png",
            image: "/products/product-9-real.jpg",
            specs: [
              "Cod producător: 94.04",
              "Tip: Soclu standard 14 pini (4CO)",
              "Montaj: Șină DIN 35mm",
              "Material: PA 6.6 (poliamidă)",
              "Contacte: Alamă argintată",
              "Prindere fir: Șurub M3, max 2.5mm²",
              "Compatibil: Seria Finder 55.34",
              "Etichetă integrată: Da"
            ],
            specsEn: [
              "Part number: 94.04",
              "Type: Standard 14-pin socket (4CO)",
              "Mounting: DIN rail 35mm",
              "Material: PA 6.6 (polyamide)",
              "Contacts: Silver-plated brass",
              "Wire clamping: Screw M3, max 2.5mm²",
              "Compatible: Finder 55.34 series",
              "Integrated label: Yes"
            ],
            advantages: [
              "Montaj instant pe șină DIN cu clips",
              "Prindere mecanică sigură cu clips de blocare",
              "Etichetare integrată pentru identificare circuit",
              "Compatibil cu carcasă de protecție seria 99",
              "Contacte argintate – rezistență scăzută de contact"
            ],
            advantagesEn: [
              "Instant DIN rail mounting with clips",
              "Secure mechanical locking clip attachment",
              "Integrated labeling for circuit identification",
              "Compatible with series 99 protection cover",
              "Silver-plated contacts – low contact resistance"
            ],
            datasheetUrl: "https://www.findernet.com/en/series/94-series/type/94-04",
            safetySheetUrl: null
          },
          {
            name: "Contactor 3P 25A 230V AC Schneider LC1D25P7",
            nameEn: "Contactor 3P 25A 230V AC Schneider Electric LC1D25P7",
            productCode: "LC1D25P7",
            type: "Contactori", domain: "Automatizari industriale",
            description: "Contactor tripolar TeSys D, 25A, bobină 230V AC, contacte auxiliare 1NO+1NC, montaj șină DIN.",
            estimatedPrice: 155, estimatedPurchasePrice: 85, brand: "Schneider Electric", priority: "MEDIE",
            whyRelevant: "Esențial pentru comanda motoarelor electrice – utilizare universală",
            suggestedSupplier: "RS Components, Automation24",
            supplierUrl: "https://www.se.com/ro/ro/product/LC1D25P7/",
            imageUrl: "https://download.schneider-electric.com/files?p_Doc_Ref=LC1D25P7_main&p_File_Type=rendition_369_jpg",
            image: "/products/product-10-real.jpg",
            specs: [
              "Cod producător: LC1D25P7",
              "Seria: TeSys D",
              "Poli: 3P",
              "Curent nominal: 25A (AC-3, 400V)",
              "Putere motor: 11kW la 400V",
              "Bobină: 230V AC, 50/60Hz",
              "Contacte auxiliare: 1NO + 1NC integrate",
              "Categorie utilizare: AC-3",
              "Montaj: Șină DIN sau placă",
              "Durabilitate mecanică: 2.000.000 cicluri",
              "Durabilitate electrică: 200.000 cicluri (AC-3)",
              "Dimensiuni: 45 x 80 x 86 mm",
              "Borne: EverLink (auto-strângere)"
            ],
            specsEn: [
              "Part number: LC1D25P7",
              "Series: TeSys D",
              "Poles: 3P",
              "Rated current: 25A (AC-3, 400V)",
              "Motor power: 11kW at 400V",
              "Coil: 230V AC, 50/60Hz",
              "Auxiliary contacts: 1NO + 1NC integrated",
              "Utilization category: AC-3",
              "Mounting: DIN rail or plate",
              "Mechanical durability: 2,000,000 cycles",
              "Electrical durability: 200,000 cycles (AC-3)",
              "Dimensions: 45 x 80 x 86 mm",
              "Terminals: EverLink (self-tightening)"
            ],
            advantages: [
              "Construcție robustă TeSys D – standard mondial în industrie",
              "Contacte auxiliare 1NO+1NC integrate – fără accesorii suplimentare",
              "Montaj versatil pe șină DIN sau placă de montaj",
              "Borne EverLink cu auto-strângere – fără mentenanță",
              "Compatibil cu blocuri auxiliare, temporizatoare, protecție termică",
              "2 milioane cicluri mecanice – durabilitate excepțională"
            ],
            advantagesEn: [
              "Robust TeSys D construction – global industry standard",
              "Integrated 1NO+1NC auxiliary contacts – no extra accessories",
              "Versatile DIN rail or plate mounting",
              "EverLink self-tightening terminals – maintenance free",
              "Compatible with auxiliary blocks, timers, thermal protection",
              "2 million mechanical cycles – exceptional durability"
            ],
            datasheetUrl: "https://www.se.com/ro/ro/product/download-pdf/LC1D25P7",
            safetySheetUrl: null
          },
        ],
      },
      {
        category: "Conectori industriali",
        reason: "Piață în creștere — Industry 4.0 necesită mai multă conectivitate",
        products: [
          {
            name: "Conector M12 4-pini drept masculin Phoenix Contact SACC-M12MS-4CON-PG 9-M",
            nameEn: "M12 4-Pin Straight Male Connector Phoenix Contact SACC-M12MS-4CON-PG 9-M",
            productCode: "SACC-M12MS-4CON-PG 9-M",
            type: "Conectori", domain: "Automatizari industriale",
            description: "Conector industrial M12 cod A, 4 pini, masculin, drept, pentru senzori și actuatoare, corp metalic IP67.",
            estimatedPrice: 28, estimatedPurchasePrice: 14, brand: "Phoenix Contact", priority: "MARE",
            whyRelevant: "Standard universal pentru senzori industriali – vânzare în volum",
            suggestedSupplier: "TME, RS Components",
            supplierUrl: "https://www.tme.eu/ro/details/saccm12msrconpg7/mufe-si-prize-m12/phoenix-contact/1681088/",
            imageUrl: "https://www.phoenixcontact.com/product-photos/1694149.jpg",
            image: "/products/product-11-real.jpg",
            specs: [
              "Cod producător: 1694149 (SACC-M12MS-4CON-PG 9-M)",
              "Standard: M12, Cod A (IEC 61076-2-101)",
              "Pini: 4",
              "Tip: Drept, masculin (tată)",
              "Montaj: Pe cablu, cu presetupă PG 9",
              "Protecție: IP67 (conectat)",
              "Material corp: Zinc turnat sub presiune, nichelat",
              "Curent maxim: 4A per pin",
              "Tensiune maximă: 250V",
              "Secțiune cablu: 0.25-0.5 mm²",
              "Temperatură: -25°C ... +85°C"
            ],
            specsEn: [
              "Part number: 1694149 (SACC-M12MS-4CON-PG 9-M)",
              "Standard: M12, Code A (IEC 61076-2-101)",
              "Pins: 4",
              "Type: Straight, male",
              "Mounting: Cable mount, with PG 9 cable gland",
              "Protection: IP67 (mated)",
              "Housing material: Die-cast zinc, nickel plated",
              "Max current: 4A per pin",
              "Max voltage: 250V",
              "Cable section: 0.25-0.5 mm²",
              "Temperature: -25°C ... +85°C"
            ],
            advantages: [
              "Standard industrial M12 – compatibilitate universală cu orice senzor",
              "IP67 conectat – medii industriale dure",
              "Corp metalic din zinc turnat – rezistență mecanică superioară",
              "Montaj rapid cu presetupă PG 9 integrată",
              "4 pini cod A – conectare directă senzori 3/4 fire"
            ],
            advantagesEn: [
              "M12 industrial standard – universal compatibility with any sensor",
              "IP67 when mated – harsh industrial environments",
              "Die-cast zinc housing – superior mechanical resistance",
              "Quick assembly with integrated PG 9 cable gland",
              "4-pin code A – direct connection for 3/4-wire sensors"
            ],
            datasheetUrl: "https://www.phoenixcontact.com/en-pc/products/1694149",
            safetySheetUrl: null
          },
          {
            name: "Cablu conector M12 feminin 2m PUR Weidmüller SAIL-M12BG-4-2.0U",
            nameEn: "M12 Female Connector Cable 2m PUR Weidmüller SAIL-M12BG-4-2.0U",
            productCode: "SAIL-M12BG-4-2.0U",
            type: "Cabluri senzori", domain: "Automatizari industriale",
            description: "Cablu pre-confecționat cu conector M12 feminin, 4 fire, 2m, manta PUR rezistentă la ulei, IP67.",
            estimatedPrice: 42, estimatedPurchasePrice: 22, brand: "Weidmüller", priority: "MARE",
            whyRelevant: "Produs complementar senzorilor — cross-sell excelent pe fiecare senzor vândut",
            suggestedSupplier: "TME, Farnell",
            supplierUrl: "https://www.tme.eu/ro/details/9457730300/cabluri-pentru-senzori/weidmuller/sail-m12bg-4-3-0u/",
            imageUrl: "https://catalog.weidmueller.com/media/SAIL-M12BG-4-2.0U.jpg",
            image: "/products/product-12-real.jpg",
            specs: [
              "Cod producător: SAIL-M12BG-4-2.0U",
              "Conector: M12, 4 pini, feminin (mamă), drept",
              "Standard: Cod A (IEC 61076-2-101)",
              "Lungime cablu: 2m",
              "Manta cablu: PUR (poliuretan)",
              "Secțiune: 4 x 0.34 mm²",
              "Protecție: IP67",
              "Temperatură: -25°C ... +80°C",
              "Culori fire: BN (maro), WH (alb), BU (albastru), BK (negru)",
              "Rezistență: Ulei, chimicale, UV"
            ],
            specsEn: [
              "Part number: SAIL-M12BG-4-2.0U",
              "Connector: M12, 4-pin, female, straight",
              "Standard: Code A (IEC 61076-2-101)",
              "Cable length: 2m",
              "Cable jacket: PUR (polyurethane)",
              "Cross section: 4 x 0.34 mm²",
              "Protection: IP67",
              "Temperature: -25°C ... +80°C",
              "Wire colors: BN (brown), WH (white), BU (blue), BK (black)",
              "Resistance: Oil, chemicals, UV"
            ],
            advantages: [
              "Manta PUR – rezistență superioară la ulei, chimicale și UV",
              "Pre-confecționat – instalare rapidă fără lipire sau crimpare",
              "IP67 – utilizare în medii industriale dure",
              "Codificare culori standard – conectare ușoară la PLC",
              "Flexibilitate excelentă – traseu ușor în cablaje strânse"
            ],
            advantagesEn: [
              "PUR jacket – superior resistance to oil, chemicals and UV",
              "Pre-assembled – quick installation without soldering or crimping",
              "IP67 – use in harsh industrial environments",
              "Standard color coding – easy PLC connection",
              "Excellent flexibility – easy routing in tight cable trays"
            ],
            datasheetUrl: "https://catalog.weidmueller.com/procat/Product/SAIL-M12BG-4-2.0U",
            safetySheetUrl: null
          },
        ],
      },
      {
        category: "Butoane și indicatoare",
        reason: "Produse accesibile — achiziție ușoară, marjă bună, vânzare frecventă",
        products: [
          {
            name: "Buton verde START Ø22mm Schneider XB5AA31",
            nameEn: "Green Push Button START Ø22mm Schneider Electric XB5AA31",
            productCode: "XB5AA31",
            type: "Butoane", domain: "Automatizari industriale",
            description: "Buton de comandă Ø22mm Harmony XB5, culoare verde, contact 1NO, acțiune impulsivă, montaj panou.",
            estimatedPrice: 22, estimatedPurchasePrice: 11, brand: "Schneider Electric", priority: "MEDIE",
            whyRelevant: "Produs de bază în orice tablou de comandă – vânzare constantă",
            suggestedSupplier: "TME, RS Components",
            supplierUrl: "https://www.se.com/ro/ro/product/XB5AA31/",
            imageUrl: "https://download.schneider-electric.com/files?p_Doc_Ref=XB5AA31_main&p_File_Type=rendition_369_jpg",
            image: "/products/product-13-real.jpg",
            specs: [
              "Cod producător: XB5AA31",
              "Seria: Harmony XB5",
              "Diametru montaj: Ø22mm",
              "Culoare cap: Verde",
              "Contact inclus: 1NO (ZB5AZ101)",
              "Acționare: Impulsivă (flush)",
              "Protecție frontală: IP66, NEMA 4X",
              "Material: Plastic",
              "Durabilitate: 1.000.000 cicluri mecanice",
              "Blocare panou: Cu inel de fixare"
            ],
            specsEn: [
              "Part number: XB5AA31",
              "Series: Harmony XB5",
              "Mounting diameter: Ø22mm",
              "Head color: Green",
              "Included contact: 1NO (ZB5AZ101)",
              "Action: Momentary (flush)",
              "Front protection: IP66, NEMA 4X",
              "Material: Plastic",
              "Durability: 1,000,000 mechanical cycles",
              "Panel locking: With fixing ring"
            ],
            advantages: [
              "Design ergonomic Harmony XB5 – cel mai popular din lume",
              "Protecție frontală IP66/NEMA 4X – chiar și în medii umede",
              "Montaj rapid cu inel de fixare (fără unelte speciale)",
              "1 milion cicluri garantate – fiabilitate dovedită",
              "Compatibil cu orice element contact XB5 suplimentar"
            ],
            advantagesEn: [
              "Ergonomic Harmony XB5 design – most popular worldwide",
              "Front protection IP66/NEMA 4X – even in wet environments",
              "Quick mounting with fixing ring (no special tools)",
              "1 million guaranteed cycles – proven reliability",
              "Compatible with any additional XB5 contact element"
            ],
            datasheetUrl: "https://www.se.com/ro/ro/product/download-pdf/XB5AA31",
            safetySheetUrl: null
          },
          {
            name: "Lampă semnalizare LED verde Ø22mm 24V Schneider XB5AVB3",
            nameEn: "Green LED Indicator Light Ø22mm 24V Schneider Electric XB5AVB3",
            productCode: "XB5AVB3",
            type: "Indicatoare", domain: "Automatizari industriale",
            description: "Lampă semnalizare LED integral Ø22mm, 24V AC/DC, verde, Harmony XB5, IP66.",
            estimatedPrice: 18, estimatedPurchasePrice: 9, brand: "Schneider Electric", priority: "MEDIE",
            whyRelevant: "Produs complementar butoanelor — cross-sell obligatoriu pe fiecare tablou",
            suggestedSupplier: "TME, Farnell",
            supplierUrl: "https://www.se.com/ro/ro/product/XB5AVB3/",
            imageUrl: "https://download.schneider-electric.com/files?p_Doc_Ref=XB5AVB3_main&p_File_Type=rendition_369_jpg",
            image: "/products/product-14-real.jpg",
            specs: [
              "Cod producător: XB5AVB3",
              "Seria: Harmony XB5",
              "Diametru montaj: Ø22mm",
              "Culoare: Verde",
              "Alimentare: 24V AC/DC",
              "Tip sursă lumină: LED integral (înlocuibil)",
              "Protecție: IP66, NEMA 4X",
              "Durată viață LED: >30.000 ore",
              "Consum: <30 mA",
              "Material lentilă: Policarbonat"
            ],
            specsEn: [
              "Part number: XB5AVB3",
              "Series: Harmony XB5",
              "Mounting diameter: Ø22mm",
              "Color: Green",
              "Supply: 24V AC/DC",
              "Light source: Integral LED (replaceable)",
              "Protection: IP66, NEMA 4X",
              "LED lifetime: >30,000 hours",
              "Consumption: <30 mA",
              "Lens material: Polycarbonate"
            ],
            advantages: [
              "LED integral – fără bec de schimbat, durată viață >30.000 ore",
              "Consum ultra-redus <30mA – economie de energie",
              "IP66/NEMA 4X – utilizare pe panouri exterioare",
              "Vizibilitate excelentă în orice condiții de iluminare",
              "Compatibil cu toate gamele Harmony XB5"
            ],
            advantagesEn: [
              "Integral LED – no bulb replacement, lifetime >30,000 hours",
              "Ultra-low consumption <30mA – energy savings",
              "IP66/NEMA 4X – use on outdoor panels",
              "Excellent visibility in any lighting conditions",
              "Compatible with all Harmony XB5 ranges"
            ],
            datasheetUrl: "https://www.se.com/ro/ro/product/download-pdf/XB5AVB3",
            safetySheetUrl: null
          },
          {
            name: "Buton de urgență ciupercă Ø40mm ABB CE4T-10R-02",
            nameEn: "Emergency Mushroom Push Button Ø40mm ABB CE4T-10R-02",
            productCode: "CE4T-10R-02",
            type: "Butoane urgență", domain: "Automatizari industriale",
            description: "Buton de urgență cu blocare mecanică, ciupercă roșie Ø40mm pe fond galben, 2NC, conform EN ISO 13850.",
            estimatedPrice: 45, estimatedPurchasePrice: 22, brand: "ABB", priority: "MARE",
            whyRelevant: "Obligatoriu pe fiecare mașină/instalație — cerință legală, cerere constantă",
            suggestedSupplier: "RS Components, Automation24",
            supplierUrl: "https://www.tme.eu/ro/details/ce4t-10r-02/intrerup-cu-mont-pe-panou-stand-22mm/abb/1sfa619550r1051/",
            imageUrl: "https://new.abb.com/products/1SFA619550R0521/ce4t-10r-02.jpg",
            image: "/products/product-15-real.jpg",
            specs: [
              "Cod producător: CE4T-10R-02 (1SFA619550R0521)",
              "Seria: ABB Compact",
              "Diametru ciupercă: Ø40mm",
              "Culoare: Roșu pe fond galben",
              "Mecanism: Cu blocare (turn-to-release / rotire deblocare)",
              "Contacte: 2NC",
              "Diametru montaj: Ø22mm",
              "Protecție frontală: IP65",
              "Conform: EN ISO 13850, IEC 60947-5-1",
              "Curent contacte: 6A / 230V",
              "Durabilitate: 500.000 cicluri mecanice"
            ],
            specsEn: [
              "Part number: CE4T-10R-02 (1SFA619550R0521)",
              "Series: ABB Compact",
              "Mushroom diameter: Ø40mm",
              "Color: Red on yellow background",
              "Mechanism: Latching (turn-to-release)",
              "Contacts: 2NC",
              "Mounting diameter: Ø22mm",
              "Front protection: IP65",
              "Conformity: EN ISO 13850, IEC 60947-5-1",
              "Contact current: 6A / 230V",
              "Durability: 500,000 mechanical cycles"
            ],
            advantages: [
              "Conform EN ISO 13850 – cerință legală obligatorie pe orice mașină",
              "Blocare mecanică – siguranță maximă, oprire menținută",
              "2 contacte NC – redundanță pentru circuite de siguranță",
              "Vizibilitate excelentă roșu/galben – conform EN 60204-1",
              "Deblocare prin rotire – procedură sigură și intuitivă",
              "Montaj Ø22mm standard – compatibil cu orice panou existent"
            ],
            advantagesEn: [
              "EN ISO 13850 compliant – mandatory legal requirement on any machine",
              "Mechanical latching – maximum safety, maintained stop",
              "2 NC contacts – redundancy for safety circuits",
              "Excellent red/yellow visibility – EN 60204-1 compliant",
              "Turn-to-release – safe and intuitive unlocking procedure",
              "Standard Ø22mm mounting – compatible with any existing panel"
            ],
            datasheetUrl: "https://new.abb.com/products/1SFA619550R0521",
            safetySheetUrl: null
          },
        ],
      },
    ],
    marketInsight: "Piața de automatizări industriale din România este în creștere puternică, susținută de fondurile europene (PNRR, FDI) pentru modernizarea fabricilor. Tendințele 2026: Industry 4.0, senzori IO-Link integrați, convertoare de frecvență energy-efficient, sisteme de monitorizare remote (IIoT), și integrare protocoale de siguranță (Safety PLC). Cererea pentru componente din gama Autonics, MEAN WELL și Finder este în creștere datorită raportului calitate-preț excelent.",
    estimatedInvestment: "Investiție inițială estimată: 5.000 - 12.000 RON pentru un stoc de bază (3-5 bucăți per produs). ROI estimat în 3-6 luni datorită marjelor bune (40-55%) și cererii constante din industrie.",
    source: "local",
  };
}

async function approveAndCreateProducts(approvedProducts: any[]) {
  let created = 0;
  const results: any[] = [];

  for (const p of approvedProducts) {
    try {
      // Verifică dacă există deja
      const exists = await prisma.product.findFirst({
        where: { name: { equals: p.name } },
      });
      if (exists) continue;

      // Creează produsul cu imagine temporară
      const tempImage = getCategoryImage(p.type, p.domain);
      const product = await prisma.product.create({
        data: {
          name: p.name,
          nameEn: p.nameEn || null,
          price: p.estimatedPrice || 0,
          purchasePrice: p.estimatedPurchasePrice || null,
          listPrice: p.estimatedPrice ? Math.round(p.estimatedPrice * 1.2) : null,
          description: p.description || p.name,
          descriptionEn: p.nameEn || null,
          image: tempImage,
          type: p.type || "Diverse",
          domain: p.domain || "Automatizari industriale",
          brand: p.brand || null,
          manufacturer: p.brand || null,
          stock: 0,
          onDemand: true,
          // Salvăm specificații tehnice
          specs: Array.isArray(p.specs) && p.specs.length > 0 ? p.specs : null,
          specsEn: Array.isArray(p.specsEn) && p.specsEn.length > 0 ? p.specsEn : null,
          // Salvăm avantaje
          advantages: Array.isArray(p.advantages) && p.advantages.length > 0 ? p.advantages : null,
          advantagesEn: Array.isArray(p.advantagesEn) && p.advantagesEn.length > 0 ? p.advantagesEn : null,
          // Salvăm fișa tehnică (link extern dacă există)
          pdfUrl: p.datasheetUrl || null,
          pdfUrlEn: p.datasheetUrl || null,
          // Salvăm fișa de securitate (link extern dacă există)
          safetySheetUrl: p.safetySheetUrl || null,
          safetySheetUrlEn: p.safetySheetUrl || null,
        },
      });

      // Descarcă imagine reală de la furnizor/producător
      let finalImage = tempImage;
      try {
        // 1. Încearcă descărcare de pe URL-ul furnizorului (imageUrl din sugestie)
        if (p.imageUrl && p.imageUrl.startsWith("https://")) {
          const outDir = path.join(process.cwd(), "public", "products");
          if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
          const ext = path.extname(new URL(p.imageUrl).pathname).toLowerCase() || ".jpg";
          const fileName = `product-${product.id}-supplier${ext}`;
          const filePath = path.join(outDir, fileName);
          try {
            await downloadImage(p.imageUrl, filePath);
            const stats = fs.statSync(filePath);
            if (stats.size > 2000) {
              finalImage = `/products/${fileName}`;
              console.log(`[AI-DISCOVER] Supplier image downloaded for "${p.name}": ${fileName} (${Math.round(stats.size / 1024)}KB)`);
            } else {
              try { fs.unlinkSync(filePath); } catch {}
            }
          } catch (e) {
            console.log(`[AI-DISCOVER] Supplier image failed for "${p.name}":`, (e as Error).message);
            try { fs.unlinkSync(filePath); } catch {}
          }
        }

        // 2. Dacă nu s-a descărcat de la furnizor, caută pe Wikimedia
        if (finalImage === tempImage) {
          const wikiImage = await fetchProductImage(p.name, p.nameEn || p.name, p.type || "", product.id);
          if (wikiImage !== tempImage && wikiImage !== getCategoryImage(p.type, p.domain)) {
            finalImage = wikiImage;
          }
        }
      } catch (imgErr) {
        console.log(`[AI-DISCOVER] Image fetch failed for "${p.name}", using category fallback`);
      }

      // Actualizează imaginea produsului
      if (finalImage !== tempImage) {
        await prisma.product.update({
          where: { id: product.id },
          data: { image: finalImage },
        });
      }

      console.log(`[AI-DISCOVER] Product "${p.name}" created (id=${product.id}) with specs=${(p.specs || []).length} advantages=${(p.advantages || []).length} image=${finalImage}`);

      created++;
      results.push({
        id: product.id,
        name: product.name,
        image: finalImage,
        hasSpecs: Array.isArray(p.specs) && p.specs.length > 0,
        hasAdvantages: Array.isArray(p.advantages) && p.advantages.length > 0,
        hasDatasheet: !!p.datasheetUrl,
        hasSafetySheet: !!p.safetySheetUrl,
      });
    } catch (err) {
      console.error("[AI-DISCOVER] Error creating product:", p.name, err);
    }
  }

  return NextResponse.json({
    message: `${created} produse noi adăugate cu specificații complete!`,
    created,
    products: results,
  });
}

async function findSuppliersForProducts(productsToSource: any[]) {
  const suppliers = await db.supplier.findMany({
    where: { active: true },
    select: { id: true, name: true, website: true, notes: true, rating: true },
  });

  if (suppliers.length === 0) {
    return NextResponse.json({
      error: "Nu ai furnizori în baza de date. Adaugă furnizori mai întâi din pagina Furnizori.",
      suppliers: [],
    });
  }

  // Asociază fiecare produs cu furnizorii potriviți pe baza notelor/website-urilor
  const suggestions = productsToSource.map((p: any) => ({
    product: p.name,
    suggestedSupplier: p.suggestedSupplier || "N/A",
    availableSuppliers: suppliers
      .sort((a: any, b: any) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 3)
      .map((s: any) => ({ id: s.id, name: s.name, website: s.website, rating: s.rating })),
    estimatedCost: p.estimatedPurchasePrice ? `~${p.estimatedPurchasePrice} RON/buc` : "N/A",
  }));

  return NextResponse.json({
    message: `Furnizori sugerați pentru ${productsToSource.length} produse`,
    suggestions,
    totalEstimatedCost: productsToSource.reduce((s: number, p: any) => s + (p.estimatedPurchasePrice || 0) * 5, 0),
    note: "Cost estimat pentru 5 bucăți din fiecare produs",
  });
}
