import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { COMPANY_CONFIG } from "@/lib/companyConfig";

// Structura implicită pentru paginile site-ului
const defaultData: Record<string, any> = {
  acasa: {
    titlu: "Bine ați venit la PREV-COR TPM",
    subtitlu: "Solutii Inteligente de Automatizare Industriala",
    descriere: "Oferim servicii profesionale de proiectare, instalare și mentenanță pentru sisteme electrice și automatizări.",
    textB2B: "Oferim și servicii B2B pentru companii. Contactează-ne pentru o ofertă personalizată!",
  },
  despre: {
    titlu: "Despre Noi",
    descriere: "PREV-COR TPM este o companie specializată în domeniul instalațiilor electrice și automatizărilor industriale.",
  },
  servicii: {
    titlu: "Serviciile Noastre",
    descriere: "Oferim o gamă completă de servicii în domeniul electric și automatizări.",
  },
  magazin: {
    titlu: "Magazin Online",
    descriere: "Echipamente electrice și componente de calitate pentru proiectele dumneavoastră.",
  },
  contact: {
    titlu: "Informații de Contact",
    telefon: COMPANY_CONFIG.phone,
    email: COMPANY_CONFIG.email,
  },
  cos: {
    tva: 19,
    moneda: "RON",
    livrareGratuita: 500,
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
  
  return { ...defaultData };
}

// Public API - no auth required
export async function GET(req: NextRequest) {
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
