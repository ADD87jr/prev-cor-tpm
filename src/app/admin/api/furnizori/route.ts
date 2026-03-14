import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const suppliers = await prisma.supplier.findMany({
      where: { active: true },
      select: {
        id: true,
        name: true,
        contactPerson: true,
        email: true,
        phone: true,
      },
      orderBy: { name: "asc" },
    });
    
    return NextResponse.json(suppliers);
  } catch (error) {
    console.error("Error fetching suppliers:", error);
    return NextResponse.json(
      { error: "Failed to fetch suppliers" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    const supplier = await prisma.supplier.create({
      data: {
        name: data.name,
        contactPerson: data.contactPerson || null,
        email: data.email || null,
        phone: data.phone || null,
        website: data.website || null,
        cui: data.cui || null,
        address: data.address || null,
        notes: data.notes || null,
        active: true,
      },
    });
    
    return NextResponse.json(supplier);
  } catch (error) {
    console.error("Error creating supplier:", error);
    return NextResponse.json(
      { error: "Failed to create supplier" },
      { status: 500 }
    );
  }
}
