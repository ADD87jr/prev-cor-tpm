/**
 * Configurație companiei pentru componente client-side
 * Pentru componente "use client" care nu pot accesa filesystem
 * Datele se încarcă via API la /admin/api/companie
 */

// Valori default pentru client (fallback)
export const COMPANY_CONFIG_CLIENT = {
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

// Helper pentru încărcare config din API
export async function fetchCompanyConfig() {
  try {
    const res = await fetch("/admin/api/companie");
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn("Could not fetch company config, using defaults");
  }
  return COMPANY_CONFIG_CLIENT;
}
