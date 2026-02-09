import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { COMPANY_CONFIG } from "@/lib/companyConfig";
import { adminAuthMiddleware } from "@/lib/auth-middleware";

const DATA_FILE = path.join(process.cwd(), "data", "pagini.json");

// Structura implicită pentru paginile site-ului
const defaultData = {
  acasa: {
    titlu: "Bine ați venit la PREV-COR TPM",
    subtitlu: "Soluții complete pentru instalații electrice și automatizări industriale",
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
    tva: 19,
    moneda: "RON",
    livrareGratuita: 500,
    textLivrare: "Livrare gratuită pentru comenzi peste 500 RON",
    termenLivrare: "2-5 zile lucrătoare",
  },
};

function ensureDataFile() {
  const dataDir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(defaultData, null, 2), "utf-8");
  }
}

function readData() {
  ensureDataFile();
  const raw = fs.readFileSync(DATA_FILE, "utf-8");
  return JSON.parse(raw);
}

function writeData(data: any) {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
}

export async function GET(req: NextRequest) {
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;
  try {
    const { searchParams } = new URL(req.url);
    const pagina = searchParams.get("pagina");
    
    const data = readData();
    
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
    
    const data = readData();
    data[pagina] = date;
    writeData(data);
    
    return NextResponse.json({ success: true, message: "Date salvate cu succes" });
  } catch (error) {
    console.error("Eroare la salvare date pagini:", error);
    return NextResponse.json({ error: "Eroare la salvare date" }, { status: 500 });
  }
}
