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

// Tipuri pentru fișiere 3D (STEP, IGES, STL, OBJ)
const ALLOWED_3D_TYPES = [
  "application/step",
  "application/sla",
  "model/step",
  "model/stl",
  "model/iges",
  "model/obj",
  "application/octet-stream", // Browserele trimit adesea fișiere 3D ca octet-stream
];

// Extensii 3D permise (pentru validare când MIME este octet-stream)
const ALLOWED_3D_EXTENSIONS = [".step", ".stp", ".iges", ".igs", ".stl", ".obj"];

const ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_PDF_TYPES, ...ALLOWED_3D_TYPES];

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

export async function POST(req: NextRequest) {
  // Protejare autentificare
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

  const ext = path.extname(file.name).toLowerCase();
  const is3DFile = ALLOWED_3D_EXTENSIONS.includes(ext);

  // Validare tip MIME (pentru fișiere 3D verificăm și extensia)
  if (!ALLOWED_TYPES.includes(file.type)) {
    console.log("[UPLOAD] Tip fișier respins:", file.type);
    return NextResponse.json({ 
      error: `Tip de fișier nepermis: ${file.type}. Sunt permise imagini, PDF și fișiere 3D (STEP, IGES, STL, OBJ).` 
    }, { status: 400 });
  }

  // Dacă este octet-stream, verificăm că extensia este 3D
  if (file.type === "application/octet-stream" && !is3DFile) {
    return NextResponse.json({ 
      error: `Extensie nepermisă pentru fișiere binare. Extensii 3D permise: ${ALLOWED_3D_EXTENSIONS.join(", ")}` 
    }, { status: 400 });
  }

  // Validare dimensiune
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ 
      error: `Fișierul este prea mare. Maxim ${MAX_FILE_SIZE / 1024 / 1024}MB permis.` 
    }, { status: 400 });
  }

  console.log("[UPLOAD] Nume fișier primit:", file.name, "| Tip:", file.type, "| 3D:", is3DFile);
  const buffer = Buffer.from(await file.arrayBuffer());
  const isPdf = ALLOWED_PDF_TYPES.includes(file.type);
  
  // Determinăm prefixul și folderul în funcție de tip
  let prefix: string;
  let folder: string;
  if (is3DFile) {
    prefix = "model3d";
    folder = "products";
  } else if (isPdf) {
    prefix = "pdf";
    folder = "products";
  } else {
    prefix = "img";
    folder = "uploads";
  }
  
  const fileName = `${prefix}_${Date.now()}${ext}`;
  const filePath = path.join(process.cwd(), "public", folder, fileName);
  await writeFile(filePath, buffer);
  console.log("[UPLOAD] Salvat ca:", filePath);
  return NextResponse.json({ url: `/${folder}/${fileName}` });
}
