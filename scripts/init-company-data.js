const { PrismaClient } = require("@prisma/client");

const defaultCompanyData = {
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

async function main() {
  const prisma = new PrismaClient();
  
  try {
    // Verifică dacă există deja
    const existing = await prisma.siteSettings.findUnique({
      where: { key: "company_data" }
    });
    
    if (existing) {
      console.log("✅ Datele companiei există deja în DB:");
      console.log(JSON.stringify(JSON.parse(existing.value), null, 2));
    } else {
      // Creează datele companiei
      await prisma.siteSettings.create({
        data: {
          key: "company_data",
          value: JSON.stringify(defaultCompanyData)
        }
      });
      console.log("✅ Datele companiei au fost create în DB!");
      console.log(JSON.stringify(defaultCompanyData, null, 2));
    }
  } catch (error) {
    console.error("❌ Eroare:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
