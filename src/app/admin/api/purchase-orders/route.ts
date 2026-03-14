import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminAuthMiddleware } from "@/lib/auth-middleware";

const db = prisma as any;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

// GET — listează comenzi de achiziție
export async function GET(req: NextRequest) {
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;

  try {
    const orders = await db.purchaseOrder.findMany({
      include: { supplier: { select: { id: true, name: true, email: true, phone: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ orders });
  } catch (error) {
    console.error("[PURCHASE-ORDERS] GET Error:", error);
    return NextResponse.json({ error: "Eroare server" }, { status: 500 });
  }
}

// POST — generează automat comenzi de achiziție pe baza stocului
export async function POST(req: NextRequest) {
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;

  try {
    const body = await req.json();
    const action = body.action || "auto-generate";

    if (action === "auto-generate") {
      return await autoGenerateOrders();
    }

    if (action === "manual") {
      // Creare comandă manuală
      const { supplierId, items, notes } = body;
      if (!supplierId || !items || items.length === 0) {
        return NextResponse.json({ error: "Furnizor și produse obligatorii" }, { status: 400 });
      }
      const totalAmount = items.reduce((s: number, i: any) => s + (Number(i.unitPrice) || 0) * (Number(i.quantity) || 0), 0);
      const order = await db.purchaseOrder.create({
        data: {
          supplierId: parseInt(supplierId),
          items,
          totalAmount,
          notes,
          generatedBy: "manual",
        },
      });
      return NextResponse.json(order);
    }

    if (action === "send") {
      // Marchează comanda ca trimisă
      const { orderId } = body;
      const order = await db.purchaseOrder.update({
        where: { id: parseInt(orderId) },
        data: { status: "sent", sentAt: new Date(), updatedAt: new Date() },
      });
      return NextResponse.json(order);
    }

    if (action === "receive") {
      // Marchează comanda ca primită + actualizează stocul
      const { orderId } = body;
      const order = await db.purchaseOrder.findUnique({ where: { id: parseInt(orderId) } });
      if (!order) return NextResponse.json({ error: "Comanda nu există" }, { status: 404 });

      // Actualizează stocul produselor
      const items = Array.isArray(order.items) ? order.items : [];
      for (const item of items) {
        if (item.productId) {
          await prisma.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity || 0 } },
          });
        }
      }

      const updated = await db.purchaseOrder.update({
        where: { id: parseInt(orderId) },
        data: { status: "received", receivedAt: new Date(), updatedAt: new Date() },
      });
      return NextResponse.json({ ...updated, stockUpdated: true });
    }

    if (action === "cancel") {
      const { orderId } = body;
      const updated = await db.purchaseOrder.update({
        where: { id: parseInt(orderId) },
        data: { status: "cancelled", updatedAt: new Date() },
      });
      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: "Acțiune necunoscută" }, { status: 400 });
  } catch (error) {
    console.error("[PURCHASE-ORDERS] POST Error:", error);
    return NextResponse.json({ error: "Eroare server" }, { status: 500 });
  }
}

// DELETE — șterge comandă draft
export async function DELETE(req: NextRequest) {
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID lipsă" }, { status: 400 });

    const order = await db.purchaseOrder.findUnique({ where: { id: parseInt(id) } });
    if (order?.status !== "draft") {
      return NextResponse.json({ error: "Doar comenzile draft pot fi șterse" }, { status: 400 });
    }

    await db.purchaseOrder.delete({ where: { id: parseInt(id) } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[PURCHASE-ORDERS] DELETE Error:", error);
    return NextResponse.json({ error: "Eroare server" }, { status: 500 });
  }
}

async function autoGenerateOrders() {
  // 1. Găsește TOATE produsele cu stoc mic (<=3) sau fără stoc (inclusiv onDemand)
  const products = await prisma.product.findMany({
    select: { id: true, name: true, price: true, purchasePrice: true, stock: true, domain: true, onDemand: true },
  });

  const lowStockProducts = products.filter((p) => p.stock <= 3);
  if (lowStockProducts.length === 0) {
    return NextResponse.json({ message: "Toate produsele au stoc suficient!", orders: [] });
  }

  // 2. Verifică furnizorii existenți pentru aceste produse
  const supplierProducts = await db.supplierProduct.findMany({
    where: { productId: { in: lowStockProducts.map((p) => p.id) } },
    include: { supplier: { select: { id: true, name: true, email: true, active: true } } },
    orderBy: { supplierPrice: "asc" },
  });

  // 3. Grupează pe furnizor — alege cel mai ieftin pentru fiecare produs
  const ordersBySupplier: Record<number, {
    supplier: { id: number; name: string; email: string | null };
    items: { productId: number; name: string; quantity: number; unitPrice: number; total: number; currentStock: number }[];
    totalAmount: number;
  }> = {};

  for (const product of lowStockProducts) {
    const bestPrice = supplierProducts.find(
      (sp: any) => sp.productId === product.id && sp.supplier.active
    );

    if (bestPrice) {
      const suppId = bestPrice.supplier.id;
      if (!ordersBySupplier[suppId]) {
        ordersBySupplier[suppId] = {
          supplier: bestPrice.supplier,
          items: [],
          totalAmount: 0,
        };
      }
      // Comandă cantitate pentru a ajunge la stoc 10
      const qtyNeeded = Math.max(10 - product.stock, bestPrice.minQuantity || 1);
      const item = {
        productId: product.id,
        name: product.name,
        quantity: qtyNeeded,
        unitPrice: bestPrice.supplierPrice,
        total: qtyNeeded * bestPrice.supplierPrice,
        currentStock: product.stock,
      };
      ordersBySupplier[suppId].items.push(item);
      ordersBySupplier[suppId].totalAmount += item.total;
    }
  }

  // 4. Creează comenzile în DB
  const createdOrders = [];
  for (const [supplierId, orderData] of Object.entries(ordersBySupplier)) {
    const order = await db.purchaseOrder.create({
      data: {
        supplierId: parseInt(supplierId),
        items: orderData.items,
        totalAmount: orderData.totalAmount,
        notes: `Auto-generat de AI: ${orderData.items.length} produse cu stoc mic`,
        generatedBy: "ai",
      },
    });
    createdOrders.push({ ...order, supplierName: orderData.supplier.name });
  }

  // 5. Produse fără furnizor
  const productsWithSupplier = new Set(supplierProducts.map((sp: any) => sp.productId));
  const noSupplier = lowStockProducts.filter((p) => !productsWithSupplier.has(p.id));

  // 6. AI sugestie pentru produsele fără furnizor
  let aiSuggestion = null;
  if (GEMINI_API_KEY && noSupplier.length > 0) {
    aiSuggestion = await getSupplierSuggestions(noSupplier);
  }

  return NextResponse.json({
    message: `${createdOrders.length} comenzi generate automat`,
    orders: createdOrders,
    noSupplier: noSupplier.map((p) => ({ id: p.id, name: p.name, stock: p.stock, domain: p.domain })),
    aiSuggestion,
  });
}

async function getSupplierSuggestions(products: any[]): Promise<string | null> {
  try {
    const productList = products.map((p) => `- ${p.name} (domeniu: ${p.domain}, stoc: ${p.stock})`).join("\n");

    const prompt = `Ești un expert în achiziții industriale din România. 
Aceste produse de automatizare industrială au stoc mic și NU au furnizor setat:

${productList}

Sugerează:
1. Tipuri de furnizori/distribuitori din România unde pot fi achiziționate (nume generice de tipuri de furnizori, NU nume specifice de firme)
2. Ce platforme B2B pot fi verificate (ex: directindustry.com, automation24.com, etc.)
3. Strategii de negociere a prețului mai bun (cantitate, contract, termene plată)
4. Tipul de preț de referință pentru echipamentele din aceste domenii

Răspunde concis, în română, cu sfaturi acționabile.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 1000, temperature: 0.7 },
        }),
      }
    );

    if (!response.ok) return null;
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch {
    return null;
  }
}
