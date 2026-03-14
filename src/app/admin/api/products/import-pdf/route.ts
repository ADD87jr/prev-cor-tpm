import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
// @ts-ignore - pdfreader nu are tipuri
import { PdfReader } from "pdfreader";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

// Extrage rânduri din PDF păstrând structura tabelară cu coordonate X și Y
async function extractTableFromPDF(buffer: Buffer): Promise<{rows: string[][], rawText: string, products: any[]}> {
  return new Promise((resolve, reject) => {
    const reader = new PdfReader(null);
    // Stocăm TOATE elementele cu coordonatele lor exacte
    const allItems: {page: number, x: number, y: number, text: string}[] = [];
    let currentPage = 0;
    
    reader.parseBuffer(buffer, (err: any, item: any) => {
      if (err) {
        reject(new Error('Eroare la parsarea PDF: ' + err.message));
        return;
      }
      
      if (!item) {
        // Finalizare - parsăm produsele
        const products: any[] = [];
        const foundCodes = new Set<string>();
        let rawText = '';
        const allRows: string[][] = [];
        
        // Pattern-uri
        // MLFB: S55xxx-xxxxx sau BPZ:xxx.xxx
        const mlfbRegex = /^(S\d{4,5}-[A-Z0-9-]+|BPZ:[A-Z0-9.-]+)$/i;
        // Type: include toate codurile Siemens (Desigo PX, DXR, SYNCO, etc.)
        // SYNCO: RLU, RMU, RMK, RMH, RMB, RMS, RMZ, QAW, OCI, OZW, SEZ, SEA, SEM, ARG, BAU, RLE, EM1
        const typeRegex = /^(PXC|DXR|QAX|POL|RDG|RDF|TXS|TXM|TXA|TXN|CTX|PXG|PXM|PXA|QFA|QBM|QMX|QAA|QAC|QAE|QVE|RPI|RPM|RXM|RXZ|DXA|CXG|HLB|RXC|RXB|RVS|RMZ|RMH|RMK|RMU|RMB|RMS|RLU|RLE|ALG|AZL|AVS|LME|LFL|LAL|SSE|OCI|OZW|QAW|AGG|AGA|AGK|SQN|SQM|SQS|SEZ|SEA|SEM|ARG|BAU|EM1)[A-Z0-9./-]+$/i;
        const priceRegex = /^(\d{1,5})[.,](\d{2})$/;
        
        // Sortăm după pagină și Y
        allItems.sort((a, b) => {
          if (a.page !== b.page) return a.page - b.page;
          return a.y - b.y;
        });
        
        // Grupăm pe rânduri (toleranță 0.5)
        const rows: Map<string, typeof allItems> = new Map();
        for (const item of allItems) {
          const rowKey = `${item.page}-${Math.round(item.y * 2) / 2}`;
          if (!rows.has(rowKey)) {
            rows.set(rowKey, []);
          }
          rows.get(rowKey)!.push(item);
        }
        
        // Sortăm cheile și procesăm
        const sortedKeys = Array.from(rows.keys()).sort((a, b) => {
          const [pa, ya] = a.split('-').map(Number);
          const [pb, yb] = b.split('-').map(Number);
          if (pa !== pb) return pa - pb;
          return ya - yb;
        });
        
        // Construim lista de prețuri cu poziția lor X și Y pentru căutare ulterioară
        const pricePositions: {page: number, y: number, x: number, price: string}[] = [];
        for (const item of allItems) {
          const match = item.text.match(priceRegex);
          if (match) {
            const val = parseFloat(match[1] + '.' + match[2]);
            // Prețurile valide: între 5 și 100000
            if (val >= 5 && val < 100000) {
              pricePositions.push({
                page: item.page,
                y: item.y,
                x: item.x,
                price: val.toFixed(2)
              });
            }
          }
        }
        
        for (const rowKey of sortedKeys) {
          const rowItems = rows.get(rowKey)!;
          rowItems.sort((a, b) => a.x - b.x);
          
          const rowText = rowItems.map(i => i.text).join(' ').trim();
          if (rowText) {
            allRows.push([rowText]);
            rawText += rowText + '\n';
          }
          
          // Căutăm MLFB și Type
          // NOTĂ: Unele PDF-uri (SYNCO) au doar Type, fără MLFB
          let mlfb = '';
          let type = '';
          let mlfbItem: typeof allItems[0] | null = null;
          let typeItem: typeof allItems[0] | null = null;
          
          for (const item of rowItems) {
            const text = item.text.trim();
            if (!mlfb && mlfbRegex.test(text)) {
              mlfb = text;
              mlfbItem = item;
            }
            // Căutăm Type indiferent dacă avem MLFB sau nu
            if (!type && typeRegex.test(text)) {
              type = text.toUpperCase();
              typeItem = item;
            }
          }
          
          // Acceptăm produsul dacă avem Type (MLFB e opțional)
          if (!type || foundCodes.has(type)) continue;
          foundCodes.add(type);
          
          // Folosim typeItem dacă nu avem mlfbItem
          if (!mlfbItem && typeItem) {
            mlfbItem = typeItem;
          }
          
          // Căutăm prețul pe același rând sau pe rând foarte apropiat (delta Y < 1)
          let price = '';
          let priceX = -1;
          const [pageNum, rowY] = rowKey.split('-').map(Number);
          
          // Prima încercare: preț pe același rând
          for (const item of rowItems) {
            const match = item.text.match(priceRegex);
            if (match) {
              const val = parseFloat(match[1] + '.' + match[2]);
              if (val >= 5 && val < 100000) {
                price = val.toFixed(2);
                priceX = item.x;
                break;
              }
            }
          }
          
          // A doua încercare: căutăm preț pe rând foarte apropiat (delta Y < 1)
          if (!price && mlfbItem) {
            for (const pp of pricePositions) {
              if (pp.page === mlfbItem.page && Math.abs(pp.y - mlfbItem.y) < 1) {
                price = pp.price;
                priceX = pp.x;
                break;
              }
            }
          }
          
          // Extragem descrierea
          let description = '';
          const descParts: string[] = [];
          let foundType = false;
          
          for (const item of rowItems) {
            const text = item.text.trim();
            
            // Sărim MLFB și Type
            if (mlfbRegex.test(text)) continue;
            if (!foundType && typeRegex.test(text)) {
              foundType = true;
              continue;
            }
            
            // După Type, colectăm descrierea până la preț sau country code
            if (foundType) {
              // Oprim la preț (dacă am găsit unul și e la aceeași poziție X)
              if (priceX > 0 && item.x >= priceX - 1) break;
              // Oprim la country code
              if (/^(CH|CN|DE|US|HU|CZ)$/i.test(text)) break;
              // Oprim la "pcs"
              if (/^(pcs|EA|buc)$/i.test(text)) break;
              // Nu adăugăm numere simple (MOQ)
              if (/^\d{1,2}$/.test(text)) continue;
              
              descParts.push(text);
            }
          }
          
          description = type + (descParts.length > 0 ? ' ' + descParts.join(' ') : '');
          
          // Extragem country și MOQ
          let country = '';
          let moq = '1';
          let weight = '';
          
          for (const item of rowItems) {
            const text = item.text.trim();
            if (/^(CH|CN|DE|US|HU|CZ)$/i.test(text)) {
              country = text.toUpperCase();
            }
            if (price && /^\d{1,2}$/.test(text)) {
              const m = parseInt(text);
              if (m >= 1 && m <= 100) moq = text;
            }
            if (country && /^\d{1,2}[.,]\d{1,3}$/.test(text)) {
              weight = text.replace(',', '.');
            }
          }
          
          products.push({
            productCode: type,
            mlfb: mlfb,
            name: description,
            description: description,
            manufacturer: "Siemens",
            price: price,
            currency: "EUR",
            moq: moq,
            country: country,
            weight: weight,
            type: detectProductType(type),
            domain: "Automatizări clădiri"
          });
        }
        
        console.log(`[PDF] Extrase ${products.length} produse din ${allRows.length} rânduri`);
        resolve({ rows: allRows, rawText, products });
        return;
      }
      
      if (item.page) {
        currentPage = item.page;
      }
      
      if (item.text && item.x !== undefined && item.y !== undefined) {
        allItems.push({
          page: currentPage,
          x: item.x,
          y: item.y,
          text: item.text
        });
      }
    });
  });
}

// Parsare text simplu - fallback
function parseProductsFromText(text: string): any[] {
  const products: any[] = [];
  const foundTypes = new Set<string>();
  
  const siemensPrefixes = [
    'PXC', 'DXR', 'QAX', 'POL', 'RDG', 'RDF', 'TXS', 'TXM', 'TXA', 'TXN', 'CTX', 
    'PXG', 'PXM', 'PXA', 'QFA', 'QBM', 'QMX', 'QAA', 'QAC', 'QAE', 'QVE', 'RPI', 
    'RPM', 'RXM', 'RXZ', 'DXA', 'CXG', 'HLB', 'AGG', 'AZL', 'QAD', 'QAF', 'SQN',
    'SQM', 'SQS', 'SSA', 'SSB', 'SSC'
  ];
  const prefixPattern = siemensPrefixes.join('|');
  const mlfbRegex = /\b(S\d{4,5}-[A-Z0-9]+|BPZ:[A-Z0-9.-]+)\b/gi;
  
  // Parsăm linie cu linie
  const lines = text.split('\n');
  
  for (const line of lines) {
    const mlfbMatch = line.match(mlfbRegex);
    if (!mlfbMatch) continue;
    
    const mlfb = mlfbMatch[0];
    const typeRegex = new RegExp(`\\b((?:${prefixPattern})[A-Z0-9.-]+)\\b`, 'i');
    const typeMatch = line.match(typeRegex);
    if (!typeMatch) continue;
    
    const type = typeMatch[1].toUpperCase();
    if (foundTypes.has(type)) continue;
    
    // Căutăm prețul
    const priceMatch = line.match(/\b(\d{2,5})[.,](\d{2})\b/);
    let price = '';
    if (priceMatch) {
      const val = parseFloat(priceMatch[1] + '.' + priceMatch[2]);
      if (val >= 10 && val < 50000) {
        price = val.toFixed(2);
      }
    }
    
    // Descrierea
    const afterType = line.substring(line.indexOf(type) + type.length);
    const descMatch = afterType.match(/^\s*([A-Z0-9.-]+\s+[A-Za-z][^0-9]{3,50})/i);
    const description = descMatch 
      ? type + ' ' + descMatch[1].replace(/\s+\d.*$/, '').trim()
      : type;
    
    foundTypes.add(type);
    products.push({
      productCode: type,
      mlfb: mlfb,
      name: description,
      description: description,
      manufacturer: "Siemens",
      price: price,
      currency: "EUR",
      moq: "1",
      type: detectProductType(type),
      domain: "Automatizări clădiri"
    });
  }
  
  return products;
}

// Detectează tipul produsului din cod
function detectProductType(code: string): string {
  // Building Automation - Controllers
  if (code.startsWith('PXC')) return 'Controller automatizare clădiri';
  if (code.startsWith('DXR')) return 'Controller cameră';
  if (code.startsWith('PXG')) return 'Web Server BACnet';
  if (code.startsWith('PXM')) return 'Touch Panel BACnet';
  if (code.startsWith('PXA')) return 'Accesoriu montaj';
  if (code.startsWith('POL')) return 'Controller climatizare';
  // Sensors & Transmitters
  if (code.startsWith('QAX') || code.startsWith('QAA') || code.startsWith('QAC')) return 'Termostat';
  if (code.startsWith('QFA') || code.startsWith('QFM')) return 'Senzor umiditate';
  if (code.startsWith('QBM') || code.startsWith('QBE') || code.startsWith('QBF')) return 'Senzor presiune';
  if (code.startsWith('QAE') || code.startsWith('QAF')) return 'Senzor temperatură';
  if (code.startsWith('QPM') || code.startsWith('QPS')) return 'Senzor calitate aer';
  if (code.startsWith('QVE')) return 'Senzor debit';
  if (code.startsWith('QMX')) return 'Panou operare';
  if (code.startsWith('RDG') || code.startsWith('RDF') || code.startsWith('RDT')) return 'Termostat digital';
  if (code.startsWith('RPI') || code.startsWith('RPM')) return 'Monitor cameră';
  // Valves & Actuators
  if (code.startsWith('SQN') || code.startsWith('SQM') || code.startsWith('SQS')) return 'Servomotor';
  if (code.startsWith('SSA') || code.startsWith('SSB') || code.startsWith('SSC')) return 'Actuator';
  if (code.startsWith('DXA')) return 'Senzor / Accesoriu DXR';
  if (code.startsWith('HLB')) return 'VAV Damper';
  // I/O Modules
  if (code.startsWith('TXS') || code.startsWith('TXM') || code.startsWith('TXN')) return 'Modul I/O';
  if (code.startsWith('TXA')) return 'Accesoriu TX';
  if (code.startsWith('TXP')) return 'Modul protocol';
  // Edge / Connect
  if (code.startsWith('CXG')) return 'Edge Controller';
  if (code.startsWith('RXM')) return 'PL-IO Fancoil';
  if (code.startsWith('RXZ')) return 'Accesoriu RX';
  // Flame Detectors
  if (code.startsWith('QRA') || code.startsWith('QRI') || code.startsWith('QRO')) return 'Detector flacără';
  // Field Devices
  if (code.startsWith('AGG') || code.startsWith('AZL')) return 'Accesoriu arzător';
  if (code.startsWith('CTX')) return 'Licență software';
  // Industrial Automation
  if (code.startsWith('6ES7') || code.startsWith('6ES5')) return 'PLC / CPU';
  if (code.startsWith('6AV')) return 'HMI / Panel';
  if (code.startsWith('6ED')) return 'LOGO!';
  if (code.startsWith('6GK')) return 'Comunicații';
  if (code.startsWith('3RV') || code.startsWith('3RT') || code.startsWith('3RU')) return 'Contactori / Întreruptoare';
  if (code.startsWith('6SL')) return 'Drive / Convertizor';
  if (code.startsWith('6EP')) return 'Surse alimentare';
  if (code.startsWith('3VA') || code.startsWith('3VL')) return 'Întreruptoare automate';
  return 'Automatizări clădiri';
}

// POST - Analizează PDF sau importă produse
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";
    
    // Dacă e JSON, importăm produsele
    if (contentType.includes("application/json")) {
      const { products, action } = await request.json();
      
      if (action !== "import" || !products || !Array.isArray(products)) {
        return NextResponse.json({ error: "Produse invalide" }, { status: 400 });
      }
      
      let created = 0;
      const errors: string[] = [];
      
      for (const p of products) {
        try {
          // Verifică dacă există deja un produs cu același SKU
          const sku = p.productCode || p.sku;
          const existing = sku ? await prisma.product.findFirst({
            where: { sku: sku }
          }) : null;
          
          if (existing) {
            errors.push(`Produs cu SKU ${sku} există deja (ID: ${existing.id})`);
            continue;
          }
          
          await prisma.product.create({
            data: {
              name: p.name || "Produs importat",
              sku: sku || `IMP-${Date.now()}-${created}`,
              price: parseFloat(p.price) || 0,
              listPrice: parseFloat(p.listPrice || p.price) || 0,
              purchasePrice: parseFloat(p.purchasePrice) || 0,
              currency: p.currency || "EUR",
              manufacturer: p.manufacturer || "Siemens",
              type: p.type || "Automatizări clădiri",
              domain: p.domain || "Automatizări clădiri",
              description: p.description || "",
              stock: 0,
              onDemand: true,
              image: "",
            }
          });
          created++;
        } catch (e: any) {
          errors.push(`Eroare la ${p.productCode || p.name}: ${e.message}`);
        }
      }
      
      return NextResponse.json({ success: true, created, errors });
    }
    
    // Dacă e FormData, analizăm PDF-ul
    const formData = await request.formData();
    const file = formData.get("file") as File;
    
    if (!file || !file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "Fișier PDF obligatoriu" }, { status: 400 });
    }
    
    // Citește conținutul PDF
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Extrage tabel din PDF folosind pdfreader
    let pdfData: {rows: string[][], rawText: string, products: any[]};
    try {
      pdfData = await extractTableFromPDF(buffer);
      console.log("[IMPORT-PDF] Extracted rows:", pdfData.rows.length);
      console.log("[IMPORT-PDF] Products parsed:", pdfData.products.length);
      console.log("[IMPORT-PDF] First 5 products:");
      pdfData.products.slice(0, 5).forEach((p, i) => console.log(`  ${i}: ${p.mlfb} | ${p.productCode} | ${p.name} | ${p.price} EUR`));
    } catch (extractErr: any) {
      console.error("[IMPORT-PDF] PDF extract error:", extractErr);
      return NextResponse.json({ 
        error: "Nu am putut citi PDF-ul: " + extractErr.message 
      }, { status: 500 });
    }
    
    // Dacă nu avem Gemini key, folosim produsele extrase direct
    if (!GEMINI_API_KEY) {
      console.log("[IMPORT-PDF] No API key, using parsed products");
      
      // Folosim produsele extrase din structura tabelară
      let products = pdfData.products;
      
      // Dacă nu am găsit destule, încercăm și cu textul brut
      if (products.length < 5) {
        console.log("[IMPORT-PDF] Few products from table, trying raw text...");
        const textProducts = parseProductsFromText(pdfData.rawText);
        // Adăugăm doar produsele care nu sunt deja
        const existingCodes = new Set(products.map(p => p.productCode));
        for (const p of textProducts) {
          if (!existingCodes.has(p.productCode)) {
            products.push(p);
            existingCodes.add(p.productCode);
          }
        }
      }
      
      console.log(`[IMPORT-PDF] Total parsed: ${products.length} products`);
      
      if (products.length === 0) {
        return NextResponse.json({ 
          error: "Nu am găsit coduri de produse Siemens în PDF.",
          hint: "Formate acceptate: PXC, DXR, QAX, TXS, etc.",
          textSample: pdfData.rawText.substring(0, 2000),
          rowCount: pdfData.rows.length
        }, { status: 400 });
      }
      
      // Sortăm produsele după MLFB pentru ordine consistentă
      products.sort((a, b) => (a.mlfb || '').localeCompare(b.mlfb || ''));
      
      return NextResponse.json({ 
        success: true, 
        products, 
        method: "pdfreader",
        totalRows: pdfData.rows.length
      });
    }
    
    // Folosește Gemini cu PDF direct (multimodal)
    const base64Pdf = buffer.toString("base64");
    const prompt = `Analizează acest PDF cu liste de prețuri produse industriale (Siemens sau alt producător).
Extrage TOATE produsele găsite și returnează un JSON array cu această structură exactă:

[
  {
    "productCode": "cod produs exact din document (ex: 6ES7214-1AG40-0XB0)",
    "mlfb": "cod MLFB (ex: S55375-C110)",
    "name": "nume/descriere produs",
    "manufacturer": "Siemens",
    "price": "preț numeric fără monedă",
    "currency": "EUR",
    "type": "tip (Controller, Sensor, etc.)"
  }
]

IMPORTANT: 
- Extrage TOATE produsele (incluzând PXC, DXR, QAX, TXS, TXA, PXG, etc.)
- Include codul MLFB (S55xxx-xxx sau BPZ:xxx) 
- Răspunde DOAR cu JSON array valid, fără explicații`;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              role: "user",
              parts: [
                { text: prompt },
                {
                  inline_data: {
                    mime_type: "application/pdf",
                    data: base64Pdf
                  }
                }
              ]
            }],
            generationConfig: { maxOutputTokens: 8000, temperature: 0.2 }
          })
        }
      );
      
      if (!response.ok) {
        const errText = await response.text();
        console.error("[IMPORT-PDF] Gemini error:", response.status, errText);
        
        // Fallback la parsare manuală pentru 429 (rate limit) sau alte erori
        console.log("[IMPORT-PDF] Falling back to table parsing");
        let products = pdfData.products;
        if (products.length < 5) {
          const textProducts = parseProductsFromText(pdfData.rawText);
          const existingCodes = new Set(products.map(p => p.productCode));
          for (const p of textProducts) {
            if (!existingCodes.has(p.productCode)) {
              products.push(p);
            }
          }
        }
        
        if (products.length > 0) {
          return NextResponse.json({ 
            success: true, 
            products, 
            method: "pdfreader",
            warning: "AI temporar indisponibil, s-a folosit parsare automată"
          });
        }
        
        return NextResponse.json({ 
          error: "AI indisponibil și nu am găsit coduri Siemens în PDF", 
          aiStatus: response.status,
          hint: "Formate acceptate: PXC, DXR, QAX, TXS, etc.",
          textSample: pdfData.rawText.substring(0, 1000)
        }, { status: 500 });
      }
      
      const data = await response.json();
      const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      
      // Extrage JSON din răspuns
      let products = [];
      try {
        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          products = JSON.parse(jsonMatch[0]);
        }
      } catch (parseErr) {
        console.error("[IMPORT-PDF] Parse error:", parseErr, "Response:", responseText.substring(0, 500));
        return NextResponse.json({ 
          error: "Nu am putut parsa răspunsul AI", 
          rawResponse: responseText.substring(0, 1000) 
        }, { status: 500 });
      }
      
      if (!products || products.length === 0) {
        return NextResponse.json({ 
          error: "Nu am găsit produse în PDF", 
          rawResponse: responseText.substring(0, 500) 
        }, { status: 400 });
      }
      
      return NextResponse.json({ success: true, products, method: "ai-pdf" });
      
    } catch (fetchErr: any) {
      console.error("[IMPORT-PDF] Fetch error:", fetchErr);
      return NextResponse.json({ error: "Eroare la comunicarea cu AI: " + fetchErr.message }, { status: 500 });
    }
    
  } catch (error: any) {
    console.error("[IMPORT-PDF] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
