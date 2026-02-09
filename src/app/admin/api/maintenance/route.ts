import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeFileSync } from "fs";
import { join } from "path";
import { adminAuthMiddleware } from "@/lib/auth-middleware";

const statusFile = join(process.cwd(), 'public', 'maintenance-status.json');

// GET: Check maintenance mode status
export async function GET(req: NextRequest) {
  // Protejare autentificare
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;

  try {
    const setting = await prisma.siteSettings.findUnique({
      where: { key: "maintenanceMode" }
    });
    
    return NextResponse.json({
      maintenanceMode: setting?.value === "true",
      updatedAt: setting?.updatedAt || null
    });
  } catch (error) {
    return NextResponse.json({ maintenanceMode: false });
  }
}

// POST: Toggle maintenance mode
export async function POST(req: NextRequest) {
  // Protejare autentificare
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;

  try {
    const { enabled } = await req.json();
    
    // Update database
    await prisma.siteSettings.upsert({
      where: { key: "maintenanceMode" },
      update: { value: enabled ? "true" : "false", updatedAt: new Date() },
      create: { key: "maintenanceMode", value: enabled ? "true" : "false" }
    });
    
    // Update static JSON file for middleware to read
    writeFileSync(statusFile, JSON.stringify({ enabled }, null, 2), 'utf-8');
    
    return NextResponse.json({ 
      success: true, 
      maintenanceMode: enabled 
    });
  } catch (error) {
    console.error("Error toggling maintenance mode:", error);
    return NextResponse.json(
      { error: "Eroare la modificare" }, 
      { status: 500 }
    );
  }
}
