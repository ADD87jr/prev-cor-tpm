import { prisma } from '@/lib/prisma';

const PAGES_KEY = 'site_pages';
const DEFAULT_TVA = 21; // TVA default România 2026

// Returnează TVA% configurat din admin (default 21)
export async function getTvaPercent(): Promise<number> {
  try {
    const setting = await prisma.siteSettings.findUnique({ where: { key: PAGES_KEY } });
    if (setting?.value) {
      const data = JSON.parse(setting.value);
      if (data?.cos?.tva !== undefined) {
        return Number(data.cos.tva);
      }
    }
  } catch {
    // Eroare la citire din baza de date
  }
  return DEFAULT_TVA;
}

// Versiune sincronă pentru locuri unde async nu e posibil
// Returnează valoarea default
export function getTvaPercentSync(): number {
  return DEFAULT_TVA;
}
