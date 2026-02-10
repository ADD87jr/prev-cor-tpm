import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const PROMOS_KEY = "promotii_data";

const defaultPromos = [
  {
    id: 1,
    title: "Magazin Online",
    titleEn: "Online Shop",
    text: "Cele mai bune produse pentru tine!",
    textEn: "The best products for you!",
    image: "",
    active: true,
  },
];

async function loadPromos() {
  try {
    const setting = await prisma.siteSettings.findUnique({ where: { key: PROMOS_KEY } });
    if (setting?.value) {
      const promos = JSON.parse(setting.value);
      // Returnează doar promoțiile active
      return promos.filter((p: any) => p.active !== false);
    }
  } catch (err) {
    console.error("Error loading promos:", err);
  }
  return defaultPromos;
}

// Rută publică pentru promoții (doar GET)
export async function GET() {
  const promos = await loadPromos();
  return NextResponse.json(promos);
}
