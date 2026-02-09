import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public endpoint to check maintenance status (no auth required)
export async function GET() {
  try {
    const setting = await prisma.siteSettings.findUnique({
      where: { key: "maintenanceMode" }
    });
    
    return NextResponse.json({
      enabled: setting?.value === "true"
    });
  } catch (error) {
    return NextResponse.json({ enabled: false });
  }
}
