import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminAuthMiddleware } from "@/lib/auth-middleware";

const COMPANY_KEY = "company_data";

// Structura implicită pentru datele companiei
const defaultData = {
  name: "S.C. PREV-COR TPM S.R.L.",
  shortName: "PREV-COR TPM",
  cui: "RO43434739",
  regCom: "J25/582/2020",
  phone: "0732 935 623",
  phoneClean: "40732935623",
  email: "office@prevcortpm.ro",
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

async function loadCompanyData() {
  try {
    const setting = await prisma.siteSettings.findUnique({
      where: { key: COMPANY_KEY }
    });
    if (setting?.value) {
      return JSON.parse(setting.value);
    }
  } catch (error) {
    console.error("Error loading company data:", error);
  }
  return { ...defaultData };
}

async function saveCompanyData(data: any) {
  await prisma.siteSettings.upsert({
    where: { key: COMPANY_KEY },
    update: { 
      value: JSON.stringify(data),
      updatedAt: new Date()
    },
    create: {
      key: COMPANY_KEY,
      value: JSON.stringify(data)
    }
  });
}

export async function GET(req: NextRequest) {
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;
  try {
    const data = await loadCompanyData();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(defaultData);
  }
}

export async function POST(req: NextRequest) {
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;
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
    await saveCompanyData(body);
    
    return NextResponse.json({ success: true, data: body });
  } catch (error) {
    console.error("Error saving company data:", error);
    return NextResponse.json({ error: "Eroare la salvarea datelor" }, { status: 500 });
  }
}
