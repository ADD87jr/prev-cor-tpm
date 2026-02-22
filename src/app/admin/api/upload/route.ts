import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";
import { adminAuthMiddleware } from "@/lib/auth-middleware";

export const runtime = "nodejs";

// Tipuri de fișiere permise pentru upload
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
];

const ALLOWED_PDF_TYPES = [
  "application/pdf",
];

const ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_PDF_TYPES];

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

export async function POST(req: NextRequest) {
  // Protejare autentificare
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

  // Validare tip MIME
  if (!ALLOWED_TYPES.includes(file.type)) {
    console.log("[UPLOAD] Tip fișier respins:", file.type);
    return NextResponse.json({ 
      error: `Tip de fișier nepermis: ${file.type}. Sunt permise doar imagini și PDF.` 
    }, { status: 400 });
  }

  // Validare dimensiune
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ 
      error: `Fișierul este prea mare. Maxim ${MAX_FILE_SIZE / 1024 / 1024}MB permis.` 
    }, { status: 400 });
  }

  console.log("[UPLOAD] Nume fișier primit:", file.name, "| Tip:", file.type);
  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = path.extname(file.name) || ".jpg";
  const isPdf = ALLOWED_PDF_TYPES.includes(file.type);
  const prefix = isPdf ? "pdf" : "img";
  const folder = isPdf ? "products" : "uploads";
  const fileName = `${prefix}_${Date.now()}${ext}`;
  const filePath = path.join(process.cwd(), "public", folder, fileName);
  await writeFile(filePath, buffer);
  console.log("[UPLOAD] Salvat ca:", filePath);
  return NextResponse.json({ url: `/${folder}/${fileName}` });
}
