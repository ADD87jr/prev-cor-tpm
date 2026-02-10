/**
 * Configurație centralizată pentru datele companiei
 * Datele se pot edita din Admin → Editare → COMPANIE
 * Datele sunt stocate în baza de date (SiteSettings)
 */

// Valori default (folosite ca fallback)
const defaultConfig = {
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
  vapidEmail: "mailto:office@prevcortpm.ro",
};

// Export configurația default (pentru compatibilitate)
// Datele actualizate se încarcă din API când e nevoie
export const COMPANY_CONFIG = defaultConfig;

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
