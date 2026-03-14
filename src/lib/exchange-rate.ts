import { prisma } from "@/lib/prisma";

const DEFAULT_EUR_TO_RON = 4.97;

// Cache în memorie cu TTL de 5 minute
let cachedRate: { rate: number; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minute

/**
 * Obține cursul EUR→RON din baza de date
 * Cu cache în memorie pentru performanță
 */
export async function getEurToRonRate(): Promise<number> {
  // Verifică cache-ul în memorie
  if (cachedRate && Date.now() - cachedRate.timestamp < CACHE_TTL) {
    return cachedRate.rate;
  }
  
  try {
    const savedRate = await prisma.siteSettings.findUnique({
      where: { key: "eur_to_ron_rate" },
    });
    
    if (savedRate && savedRate.value) {
      const rate = parseFloat(savedRate.value as string);
      if (!isNaN(rate) && rate > 0) {
        // Actualizează cache-ul
        cachedRate = { rate, timestamp: Date.now() };
        return rate;
      }
    }
  } catch (error) {
    console.error("Error fetching EUR rate from DB:", error);
  }
  
  return DEFAULT_EUR_TO_RON;
}

/**
 * Convertește un preț din EUR în RON la cursul zilei
 */
export async function convertEurToRon(priceEur: number): Promise<number> {
  const rate = await getEurToRonRate();
  return Math.round(priceEur * rate * 100) / 100;
}

/**
 * Convertește un preț în RON (din orice monedă)
 */
export async function convertToRon(price: number, currency: string): Promise<number> {
  if (currency === "EUR") {
    return await convertEurToRon(price);
  }
  return price;
}

/**
 * Invalidează cache-ul (de apelat după actualizarea cursului)
 */
export function invalidateRateCache() {
  cachedRate = null;
}
