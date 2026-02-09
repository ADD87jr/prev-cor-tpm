import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { adminAuthMiddleware } from "@/lib/auth-middleware";

const DATA_FILE = path.join(process.cwd(), "data", "companie.json");

// Structura implicită pentru datele companiei
const defaultData = {
  name: "S.C. PREV-COR TPM S.R.L.",
  shortName: "PREV-COR TPM",
  cui: "RO43434739",
  regCom: "J25/582/2020",
  phone: "0732 935 623",
  phoneClean: "40732935623",
  email: "office.prevcortpm@gmail.com",
  whatsapp: "https://wa.me/40732935623",
  address: {
    street: "Principala",
    number: "70",
    city: "Stroesti",
    county: "Mehedinti",
    postalCode: "227208",
    country: "Romania",
  },
  iban: "RO23BRDE360SV67547173600",
  bank: "BANCA ROMANA DE DEZVOLTARE",
  bankEn: "ROMANIAN DEVELOPMENT BANK (BRD)",
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

export async function GET(req: NextRequest) {
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;
  ensureDataFile();
  try {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(defaultData);
  }
}

export async function POST(req: NextRequest) {
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;
  ensureDataFile();
  try {
    const body = await req.json();
    
    // Validare minimală
    if (!body.name || !body.phone || !body.email) {
      return NextResponse.json({ error: "Nume, telefon și email sunt obligatorii" }, { status: 400 });
    }
    
    // Actualizează phoneClean automat din phone
    const phoneClean = body.phone.replace(/\s+/g, "").replace(/^0/, "40");
    body.phoneClean = phoneClean;
    
    // Actualizează whatsapp automat
    body.whatsapp = `https://wa.me/${phoneClean}`;
    
    // Salvează datele
    fs.writeFileSync(DATA_FILE, JSON.stringify(body, null, 2), "utf-8");
    
    return NextResponse.json({ success: true, data: body });
  } catch (error) {
    console.error("Error saving company data:", error);
    return NextResponse.json({ error: "Eroare la salvarea datelor" }, { status: 500 });
  }
}
