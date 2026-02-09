/**
 * Configurație centralizată pentru datele companiei
 * Datele se pot edita din Admin → Editare → COMPANIE
 * Fișierul JSON: data/companie.json
 */

import fs from "fs";
import path from "path";

// Valori default (folosite ca fallback dacă fișierul JSON nu există)
const defaultConfig = {
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
  vapidEmail: "mailto:office@prevcortpm.ro",
};

// Citește configurația din fișierul JSON (doar server-side)
function loadCompanyConfig() {
  try {
    const dataFile = path.join(process.cwd(), "data", "companie.json");
    if (fs.existsSync(dataFile)) {
      const data = JSON.parse(fs.readFileSync(dataFile, "utf-8"));
      return { ...defaultConfig, ...data };
    }
  } catch (e) {
    console.warn("Could not load companie.json, using defaults");
  }
  return defaultConfig;
}

// Export configurația (încarcă din JSON la prima folosire)
export const COMPANY_CONFIG = loadCompanyConfig();

// Helper pentru adresa formatată
export function getFormattedAddress(lang: 'ro' | 'en' = 'ro') {
  const { street, number, city, county, postalCode, country } = COMPANY_CONFIG.address;
  if (lang === 'en') {
    return `Street ${street}, No. ${number}, ${city}, county ${county}, country ${country}`;
  }
  return `Str. ${street}, Nr.${number}, ${city}, jud. ${county}`;
}

// Helper pentru date bancare
export function getBankName(lang: 'ro' | 'en' = 'ro') {
  return lang === 'en' ? COMPANY_CONFIG.bankEn : COMPANY_CONFIG.bank;
}
