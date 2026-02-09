import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { adminAuthMiddleware } from "@/lib/auth-middleware";

const PROMOS_FILE = path.join(process.cwd(), "data", "promotii.json");

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

async function ensureDataDir() {
  const dataDir = path.join(process.cwd(), "data");
  try {
    await fs.mkdir(dataDir, { recursive: true });
  } catch (err) {
    // ignore if exists
  }
}

async function loadPromos() {
  await ensureDataDir();
  try {
    const data = await fs.readFile(PROMOS_FILE, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    // File doesn't exist, return defaults
    return defaultPromos;
  }
}

async function savePromos(promos: any[]) {
  await ensureDataDir();
  await fs.writeFile(PROMOS_FILE, JSON.stringify(promos, null, 2), "utf-8");
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
