import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File;
  if (!file) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = path.extname(file.name) || ".jpg";
  const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`;
  const uploadPath = path.join(process.cwd(), "public", "uploads", fileName);
  fs.writeFileSync(uploadPath, buffer);
  return NextResponse.json({ url: `/uploads/${fileName}` });
}
