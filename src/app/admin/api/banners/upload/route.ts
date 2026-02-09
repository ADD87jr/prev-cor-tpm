import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { adminAuthMiddleware } from "@/lib/auth-middleware";

export const runtime = "nodejs";

// Tipuri de fișiere permise pentru bannere
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB pentru bannere

export async function POST(req: NextRequest) {
  // Protejare autentificare
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Validare tip MIME
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return NextResponse.json({ 
        error: `Tip de fișier nepermis: ${file.type}. Sunt permise doar imagini.` 
      }, { status: 400 });
    }

    // Validare dimensiune
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ 
        error: `Fișierul este prea mare. Maxim ${MAX_FILE_SIZE / 1024 / 1024}MB permis.` 
      }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    // Nume banner: promoX.jpg (sau păstrează numele original)
    const filename = formData.get("filename") as string || file.name || `banner_${Date.now()}.jpg`;
    const bannersDir = path.join(process.cwd(), "public", "banners");
    await fs.mkdir(bannersDir, { recursive: true });
    const filePath = path.join(bannersDir, filename);
    await fs.writeFile(filePath, buffer);
    return NextResponse.json({ success: true, path: `/banners/${filename}`, filename });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
