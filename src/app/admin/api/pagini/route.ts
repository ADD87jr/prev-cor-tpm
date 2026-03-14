import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { COMPANY_CONFIG } from "@/lib/companyConfig";
import { adminAuthMiddleware } from "@/lib/auth-middleware";

// Structura implicită pentru paginile site-ului
const defaultData: Record<string, any> = {
  acasa: {
    titlu: "Bine ați venit la PREV-COR TPM",
    subtitlu: "Solutii Inteligente de Automatizare Industriala",
    descriere: "Oferim servicii profesionale de proiectare, instalare și mentenanță pentru sisteme electrice și automatizări.",
  },
  despre: {
    titlu: "Despre Noi",
    descriere: "PREV-COR TPM este o companie specializată în domeniul instalațiilor electrice și automatizărilor industriale.",
    experienta: "15+ ani experiență",
    proiecte: "500+ proiecte finalizate",
    clienti: "200+ clienți mulțumiți",
  },
  servicii: {
    titlu: "Serviciile Noastre",
    descriere: "Oferim o gamă completă de servicii în domeniul electric și automatizări.",
    lista: [
      { nume: "Instalații electrice", descriere: "Proiectare și execuție instalații electrice industriale și rezidențiale" },
      { nume: "Automatizări industriale", descriere: "Sisteme de automatizare pentru procese industriale" },
      { nume: "Mentenanță", descriere: "Servicii de mentenanță preventivă și corectivă" },
      { nume: "Tablouri electrice", descriere: "Proiectare și asamblare tablouri electrice" },
    ],
  },
  magazin: {
    titlu: "Magazin Online",
    descriere: "Echipamente electrice și componente de calitate pentru proiectele dumneavoastră.",
    banner: "Livrare rapidă în toată țara!",
  },
  contact: {
    titlu: "Informații de Contact",
    telefon: COMPANY_CONFIG.phone,
    email: COMPANY_CONFIG.email,
    adresa: `Strada ${COMPANY_CONFIG.address.street}, nr.${COMPANY_CONFIG.address.number}, ${COMPANY_CONFIG.address.city}, ${COMPANY_CONFIG.address.county}, România`,
    codPostal: COMPANY_CONFIG.address.postalCode,
    program: "Luni - Vineri: 08:00 - 17:00",
  },
  cos: {
    tva: 21,
    moneda: "RON",
    livrareGratuita: 500,
    textLivrare: "Livrare gratuită pentru comenzi peste 500 RON",
    termenLivrare: "2-5 zile lucrătoare",
    costCurierStandard: 25,
    costCurierExpress: 40,
    costPerKg: 1,
  },
};

const PAGES_KEY = "site_pages";

async function readData(): Promise<Record<string, any>> {
  try {
    const setting = await prisma.siteSettings.findUnique({
      where: { key: PAGES_KEY }
    });
    
    if (setting?.value) {
      return JSON.parse(setting.value);
    }
  } catch (error) {
    console.error("Error reading pages from DB:", error);
  }
  
  // Return default data if not found
  return { ...defaultData };
}

async function writeData(data: Record<string, any>): Promise<void> {
  await prisma.siteSettings.upsert({
    where: { key: PAGES_KEY },
    update: { 
      value: JSON.stringify(data),
      updatedAt: new Date()
    },
    create: {
      key: PAGES_KEY,
      value: JSON.stringify(data)
    }
  });
}

export async function GET(req: NextRequest) {
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;
  try {
    const { searchParams } = new URL(req.url);
    const pagina = searchParams.get("pagina");
    
    const data = await readData();
    
    if (pagina && data[pagina]) {
      return NextResponse.json(data[pagina]);
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error("Eroare la citire date pagini:", error);
    return NextResponse.json({ error: "Eroare la citire date" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;
  try {
    const body = await req.json();
    const { pagina, date } = body;
    
    if (!pagina || !date) {
      return NextResponse.json({ error: "Pagina și datele sunt obligatorii" }, { status: 400 });
    }
    
    const data = await readData();
    data[pagina] = date;
    await writeData(data);
    
    return NextResponse.json({ success: true, message: "Date salvate cu succes" });
  } catch (error) {
    console.error("Eroare la salvare date pagini:", error);
    return NextResponse.json({ error: "Eroare la salvare date" }, { status: 500 });
  }
}
