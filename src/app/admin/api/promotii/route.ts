import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminAuthMiddleware } from "@/lib/auth-middleware";

const PROMOS_KEY = "promotii_data";

const defaultPromos = [
  {
    id: 1,
    title: "Promoție 1",
    titleEn: "Promotion 1",
    text: "Reduceri de până la 50%!",
    textEn: "Discounts up to 50%!",
    image: "/banners/promo1.jpg",
    active: true,
  },
  {
    id: 2,
    title: "Promoție 2",
    titleEn: "Promotion 2",
    text: "Transport gratuit la comenzi peste 200 RON!",
    textEn: "Free shipping on orders over 200 RON!",
    image: "/banners/promo2.jpg",
    active: true,
  },
];

async function loadPromos() {
  try {
    const setting = await prisma.siteSettings.findUnique({ where: { key: PROMOS_KEY } });
    if (setting?.value) {
      return JSON.parse(setting.value);
    }
  } catch (err) {
    console.error("Error loading promos:", err);
  }
  return defaultPromos;
}

async function savePromos(promos: any[]) {
  await prisma.siteSettings.upsert({
    where: { key: PROMOS_KEY },
    update: { value: JSON.stringify(promos), updatedAt: new Date() },
    create: { key: PROMOS_KEY, value: JSON.stringify(promos) }
  });
}

export async function GET(req: NextRequest) {
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;
  const promos = await loadPromos();
  return NextResponse.json(promos);
}

export async function POST(req: NextRequest) {
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;
  const promos = await req.json();
  await savePromos(promos);
  return NextResponse.json({ success: true });
}
