import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File;
  if (!file) {
    return NextResponse.json({ success: false, error: "No file uploaded" }, { status: 400 });
  }

  const allowedTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "image/jpeg",
    "image/png",
  ];

  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json(
      { success: false, error: "Tip de fișier neacceptat. Folosiți PDF, DOC, DOCX, XLS, XLSX, JPG sau PNG." },
      { status: 400 }
    );
  }

  if (file.size > 50 * 1024 * 1024) {
    return NextResponse.json(
      { success: false, error: "Fișierul este prea mare. Dimensiunea maximă este 50MB." },
      { status: 400 }
    );
  }
  
  // Generate unique filename
  const ext = file.name.split('.').pop() || "jpg";
  const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  const originalName = file.name;
  
  try {
    // Upload to Vercel Blob
    const blob = await put(`uploads/${fileName}`, file, {
      access: "public",
    });
    
    return NextResponse.json({ 
      success: true,
      url: blob.url,
      fileName: originalName,
      path: blob.url
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ success: false, error: "Upload failed" }, { status: 500 });
  }
}
