import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Date fallback când tabelele nu sunt populate
const fallbackProducts = [
  {
    id: 1,
    brandName: "Unitronics",
    brandLogo: "/products/unitronics-logo.png",
    name: "Vision V570",
    sku: "V570-57-T20B",
    description: "PLC + HMI integrat, 5.7\" color touchscreen, 20 I/O integrate",
    image: "/uploads/img_1773334955989.jpeg",
    basePrice: 2850,
    currency: "RON",
    categories: [
      {
        id: 1, name: "Module I/O", nameEn: "I/O Modules", icon: "🔌",
        options: [
          { id: 101, name: "IO-DI16 (16 intrări digitale)", sku: "IO-DI16", price: 450, isDefault: false, maxQuantity: 4 },
          { id: 102, name: "IO-DO16 (16 ieșiri digitale)", sku: "IO-DO16", price: 520, isDefault: false, maxQuantity: 4 },
          { id: 103, name: "IO-AI8 (8 intrări analogice)", sku: "IO-AI8-H", price: 890, isDefault: false, maxQuantity: 2 },
          { id: 104, name: "IO-AO4 (4 ieșiri analogice)", sku: "IO-AO4-H", price: 750, isDefault: false, maxQuantity: 2 },
          { id: 105, name: "IO-PT8 (8 intrări PT100)", sku: "IO-PT8", price: 1100, isDefault: false, maxQuantity: 2 },
        ],
      },
      {
        id: 2, name: "Comunicație", nameEn: "Communication", icon: "📡",
        options: [
          { id: 201, name: "Modul Ethernet", sku: "EX-A2X", price: 380, isDefault: false, maxQuantity: 1 },
          { id: 202, name: "Modul RS485", sku: "EX-RC1", price: 220, isDefault: false, maxQuantity: 2 },
          { id: 203, name: "Modul CANopen", sku: "EX-CAN", price: 520, isDefault: false, maxQuantity: 1 },
          { id: 204, name: "Modul Profibus", sku: "EX-PB", price: 680, isDefault: false, maxQuantity: 1 },
        ],
      },
      {
        id: 3, name: "Alimentare", nameEn: "Power Supply", icon: "⚡",
        options: [
          { id: 301, name: "Sursă 24VDC 2.5A", sku: "PS-24V-2.5A", price: 180, isDefault: true, maxQuantity: 1 },
          { id: 302, name: "Sursă 24VDC 5A", sku: "PS-24V-5A", price: 290, isDefault: false, maxQuantity: 1 },
          { id: 303, name: "Modul UPS integrat", sku: "UPS-M1", price: 450, isDefault: false, maxQuantity: 1 },
        ],
      },
      {
        id: 4, name: "Accesorii", nameEn: "Accessories", icon: "🔧",
        options: [
          { id: 401, name: "Cablu programare USB", sku: "CB-USB", price: 85, isDefault: false, maxQuantity: 1 },
          { id: 402, name: "Card SD 8GB industrial", sku: "SD-8G-IND", price: 120, isDefault: false, maxQuantity: 1 },
          { id: 403, name: "Panou frontal IP65", sku: "FP-IP65", price: 180, isDefault: false, maxQuantity: 1 },
        ],
      },
    ],
  },
  {
    id: 2,
    brandName: "Siemens",
    brandLogo: "/products/siemens-logo.png",
    name: "S7-1200 CPU 1214C",
    sku: "6ES7214-1AG40-0XB0",
    description: "CPU compactă cu 14 DI/10 DO/2 AI, Ethernet integrat, max 3 module",
    image: "/uploads/img_1773330859844.jpeg",
    basePrice: 1890,
    currency: "RON",
    categories: [
      {
        id: 1, name: "Module extensie", nameEn: "Extension Modules", icon: "🔌",
        options: [
          { id: 101, name: "SM1221 DI 8x24VDC", sku: "6ES7221-1BF32-0XB0", price: 380, isDefault: false, maxQuantity: 3 },
          { id: 102, name: "SM1222 DO 8x24VDC", sku: "6ES7222-1BF32-0XB0", price: 420, isDefault: false, maxQuantity: 3 },
          { id: 103, name: "SM1223 DI8/DO8", sku: "6ES7223-1BH32-0XB0", price: 520, isDefault: false, maxQuantity: 3 },
          { id: 104, name: "SM1231 AI 4x13bit", sku: "6ES7231-4HD32-0XB0", price: 680, isDefault: false, maxQuantity: 2 },
          { id: 105, name: "SM1232 AO 2x14bit", sku: "6ES7232-4HB32-0XB0", price: 720, isDefault: false, maxQuantity: 2 },
        ],
      },
      {
        id: 2, name: "Module comunicație", nameEn: "Communication Modules", icon: "📡",
        options: [
          { id: 201, name: "CM1241 RS232", sku: "6ES7241-1AH32-0XB0", price: 290, isDefault: false, maxQuantity: 1 },
          { id: 202, name: "CM1241 RS485", sku: "6ES7241-1CH32-0XB0", price: 310, isDefault: false, maxQuantity: 1 },
          { id: 203, name: "CB1241 RS485", sku: "6ES7241-1CH30-1XB0", price: 180, isDefault: false, maxQuantity: 1 },
        ],
      },
      {
        id: 3, name: "HMI", nameEn: "HMI Panels", icon: "🖥️",
        options: [
          { id: 301, name: "KTP400 Basic 4\" mono", sku: "6AV2123-2DB03-0AX0", price: 890, isDefault: false, maxQuantity: 1 },
          { id: 302, name: "KTP700 Basic 7\" color", sku: "6AV2123-2GB03-0AX0", price: 1450, isDefault: false, maxQuantity: 1 },
          { id: 303, name: "TP700 Comfort 7\" color", sku: "6AV2124-0GC01-0AX0", price: 2100, isDefault: false, maxQuantity: 1 },
        ],
      },
      {
        id: 4, name: "Accesorii", nameEn: "Accessories", icon: "🔧",
        options: [
          { id: 401, name: "Memory Card 4MB", sku: "6ES7954-8LC03-0AA0", price: 120, isDefault: false, maxQuantity: 1 },
          { id: 402, name: "Memory Card 24MB", sku: "6ES7954-8LE03-0AA0", price: 180, isDefault: false, maxQuantity: 1 },
          { id: 403, name: "Battery Board BB1297", sku: "6ES7297-0AX30-0XA0", price: 85, isDefault: false, maxQuantity: 1 },
        ],
      },
    ],
  },
  {
    id: 3,
    brandName: "Delta",
    brandLogo: "/products/delta-logo.png",
    name: "DVP-SS2 Series",
    sku: "DVP28SS211T",
    description: "PLC economic 28 I/O, RS232/RS485, programare gratuită WPLSoft",
    image: "/uploads/img_1773333280624.jpeg",
    basePrice: 680,
    currency: "RON",
    categories: [
      {
        id: 1, name: "Module I/O", nameEn: "I/O Modules", icon: "🔌",
        options: [
          { id: 101, name: "DVP08SN11T (8 ieșiri NPN)", sku: "DVP08SN11T", price: 180, isDefault: false, maxQuantity: 4 },
          { id: 102, name: "DVP08SP11T (8 ieșiri PNP)", sku: "DVP08SP11T", price: 185, isDefault: false, maxQuantity: 4 },
          { id: 103, name: "DVP16SM11N (16 intrări)", sku: "DVP16SM11N", price: 220, isDefault: false, maxQuantity: 4 },
          { id: 104, name: "DVP04AD-S (4 AI)", sku: "DVP04AD-S", price: 380, isDefault: false, maxQuantity: 2 },
          { id: 105, name: "DVP02DA-S (2 AO)", sku: "DVP02DA-S", price: 320, isDefault: false, maxQuantity: 2 },
        ],
      },
      {
        id: 2, name: "Comunicație", nameEn: "Communication", icon: "📡",
        options: [
          { id: 201, name: "DVP-ES2 Ethernet", sku: "DVPEN01-SL", price: 280, isDefault: false, maxQuantity: 1 },
          { id: 202, name: "Modul CANopen", sku: "DVPCOPM-SL", price: 420, isDefault: false, maxQuantity: 1 },
          { id: 203, name: "Modul DeviceNet", sku: "DVPDNET-SL", price: 480, isDefault: false, maxQuantity: 1 },
        ],
      },
      {
        id: 3, name: "HMI", nameEn: "HMI", icon: "🖥️",
        options: [
          { id: 301, name: "DOP-107CV 7\" color", sku: "DOP-107CV", price: 890, isDefault: false, maxQuantity: 1 },
          { id: 302, name: "DOP-110CS 10\" color", sku: "DOP-110CS", price: 1250, isDefault: false, maxQuantity: 1 },
          { id: 303, name: "DOP-115MX 15\" color", sku: "DOP-115MX", price: 2100, isDefault: false, maxQuantity: 1 },
        ],
      },
    ],
  },
];

// GET - Obține toate produsele configurabile
export async function GET() {
  try {
    // Încearcă să încarce din DB (dacă tabelele există și sunt populate)
    try {
      const dbProducts = await prisma.configuratorProduct.findMany({
        where: { active: true },
        include: {
          brand: true,
          options: {
            include: {
              option: {
                include: {
                  category: true,
                },
              },
            },
          },
        },
        orderBy: { sortOrder: "asc" },
      });

      if (dbProducts && dbProducts.length > 0) {
        // Transformăm în formatul așteptat de PLCConfigurator
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const configuratorProducts = dbProducts.map((p: any) => {
          // Grupăm opțiunile pe categorii
          const categoriesMap = new Map<number, {
            id: number;
            name: string;
            nameEn: string | null;
            icon: string | null;
            options: Array<{
              id: number;
              name: string;
              nameEn: string | null;
              description: string | null;
              sku: string | null;
              price: number;
              image: string | null;
              specs: unknown;
              isDefault: boolean;
              maxQuantity: number;
            }>;
          }>();

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          p.options.forEach((po: any) => {
            const cat = po.option.category;
            if (!categoriesMap.has(cat.id)) {
              categoriesMap.set(cat.id, {
                id: cat.id,
                name: cat.name,
                nameEn: cat.nameEn,
                icon: cat.icon,
                options: [],
              });
            }
            categoriesMap.get(cat.id)!.options.push({
              id: po.option.id,
              name: po.option.name,
              nameEn: po.option.nameEn,
              description: po.option.description,
              sku: po.option.sku,
              price: po.priceOverride ?? po.option.price,
              image: po.option.image,
              specs: po.option.specs,
              isDefault: po.isDefault,
              maxQuantity: po.maxQuantity,
            });
          });

          const categories = Array.from(categoriesMap.values()).sort(
            (a, b) => a.id - b.id
          );

          return {
            id: p.id,
            brandName: p.brand.name,
            brandLogo: p.brand.logo,
            name: p.name,
            sku: p.sku,
            description: p.description,
            image: p.image,
            basePrice: p.basePrice,
            currency: p.currency,
            categories,
          };
        });

        return NextResponse.json(configuratorProducts);
      }
    } catch {
      // Tabelele nu există sau sunt goale - folosim fallback
      console.log("Configurator tables not ready, using fallback data");
    }

    // Returnează datele fallback
    return NextResponse.json(fallbackProducts);
  } catch (error) {
    console.error("Error fetching configurator products:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}
