import { NextResponse } from "next/server";
// import { prisma } from "@/lib/prisma";

// GET - Obține un produs configurabil cu toate opțiunile
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const productId = parseInt(id);

    if (isNaN(productId)) {
      return NextResponse.json(
        { error: "Invalid product ID" },
        { status: 400 }
      );
    }

    // TODO: Implementare cu Prisma
    // const product = await prisma.configuratorProduct.findUnique({
    //   where: { id: productId },
    //   include: {
    //     brand: true,
    //     options: {
    //       include: {
    //         option: {
    //           include: {
    //             category: true,
    //             compatWith: true,
    //             incompatWith: true
    //           }
    //         }
    //       }
    //     }
    //   }
    // });

    // Date demo - returnăm structura completă
    const demoData: Record<number, object> = {
      1: {
        id: 1,
        brandName: "Unitronics",
        name: "Vision V130-33-TR34",
        sku: "V130-33-TR34",
        description: "PLC + HMI All-in-One cu ecran 3.5\" tactil color",
        basePrice: 350,
        currency: "EUR",
        categories: [
          {
            id: 1,
            name: "PLC",
            options: [
              {
                id: 101,
                name: "Auto-tune PID (2 bucle)",
                price: 0,
                isDefault: true,
              },
              {
                id: 102,
                name: "Auto-tune PID extins (64 bucle)",
                sku: "V130-PID64",
                price: 85,
              },
            ],
          },
          {
            id: 2,
            name: "Comunicație",
            options: [
              {
                id: 201,
                name: "RS-232 + RS-485",
                price: 0,
                isDefault: true,
              },
              {
                id: 202,
                name: "Ethernet Module",
                sku: "V200-19-ET2",
                price: 145,
              },
            ],
          },
        ],
      },
      2: {
        id: 2,
        brandName: "Delta Electronics",
        name: "DVP14SS211R",
        sku: "DVP14SS211R",
        description: "PLC Compact DVP-SS2",
        basePrice: 85,
        currency: "EUR",
        categories: [
          {
            id: 1,
            name: "PLC",
            options: [
              {
                id: 101,
                name: "CPU DVP14SS2 (8DI + 6DO)",
                price: 0,
                isDefault: true,
              },
            ],
          },
          {
            id: 2,
            name: "I/O",
            options: [
              {
                id: 201,
                name: "Modul 8 DI",
                sku: "DVP08SN11R",
                price: 45,
                maxQuantity: 8,
              },
              {
                id: 202,
                name: "Modul 8 DO",
                sku: "DVP08SP11R",
                price: 55,
                maxQuantity: 8,
              },
            ],
          },
        ],
      },
    };

    const product = demoData[productId];

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error("Error fetching configurator product:", error);
    return NextResponse.json(
      { error: "Failed to fetch product" },
      { status: 500 }
    );
  }
}
