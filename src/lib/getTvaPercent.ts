import { prisma } from '@/lib/prisma';

const PAGES_KEY = 'site_pages';
const DEFAULT_TVA = 21; // TVA default România 2026

// Setări default pentru coș
const DEFAULT_CART_SETTINGS = {
  tva: 21,
  livrareGratuita: 500,
  costCurierStandard: 25,
  costCurierExpress: 40,
  costPerKg: 1,
  termenScadentZile: 30,
};

// Returnează toate setările de coș din admin
export async function getCartSettings(): Promise<typeof DEFAULT_CART_SETTINGS> {
  try {
    const setting = await prisma.siteSettings.findUnique({ where: { key: PAGES_KEY } });
    if (setting?.value) {
      const data = JSON.parse(setting.value);
      if (data?.cos) {
        return {
          tva: Number(data.cos.tva ?? DEFAULT_CART_SETTINGS.tva),
          livrareGratuita: Number(data.cos.livrareGratuita ?? DEFAULT_CART_SETTINGS.livrareGratuita),
          costCurierStandard: Number(data.cos.costCurierStandard ?? DEFAULT_CART_SETTINGS.costCurierStandard),
          costCurierExpress: Number(data.cos.costCurierExpress ?? DEFAULT_CART_SETTINGS.costCurierExpress),
          costPerKg: Number(data.cos.costPerKg ?? DEFAULT_CART_SETTINGS.costPerKg),
          termenScadentZile: Number(data.cos.termenScadentZile ?? DEFAULT_CART_SETTINGS.termenScadentZile),
        };
      }
    }
  } catch {
    // Eroare la citire din baza de date
  }
  return { ...DEFAULT_CART_SETTINGS };
}

// Returnează TVA% configurat din admin (default 21)
export async function getTvaPercent(): Promise<number> {
  const settings = await getCartSettings();
  return settings.tva;
}

// Versiune sincronă pentru locuri unde async nu e posibil
// Returnează valoarea default
export function getTvaPercentSync(): number {
  return DEFAULT_TVA;
}
