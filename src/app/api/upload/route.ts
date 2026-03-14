import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File;
  if (!file) {
    return NextResponse.json({ success: false, error: "No file uploaded" }, { status: 400 });
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
