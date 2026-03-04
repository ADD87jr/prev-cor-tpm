import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendSupplierOrderEmail, shouldSendAutoEmail } from "@/lib/dropship-supplier-email";

interface OrderItem {
  id?: number;
  productId?: number;
  name?: string;
  price?: number;
  qty?: number;
  quantity?: number;
  variant?: string;
}

// GET - Lista comenzi dropship (inclusiv cele neconfirmate din Order)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const supplierId = searchParams.get("supplierId");
    const includePending = searchParams.get("includePending") !== "false";

    // 1. Obtine toate produsele dropship cu productId
    const dropshipProducts = await prisma.dropshipProduct.findMany({
      where: { productId: { not: null } },
      select: { id: true, productId: true, name: true, supplierPrice: true, yourPrice: true, supplierId: true },
    });
    
    const productIdToDropship = new Map(
      dropshipProducts.map(dp => [dp.productId, dp])
    );

    // 2. Obtine comenzi dropship existente
    const where: Record<string, unknown> = {};
    if (status && status !== "all" && status !== "new") {
      where.status = status;
    }
    if (supplierId) {
      where.supplierId = parseInt(supplierId);
    }

    const existingOrders = await prisma.dropshipOrder.findMany({
      where,
      include: { product: true },
      orderBy: { createdAt: "desc" },
    });

    // 3. Daca includePending, cauta comenzi noi care contin produse dropship
    let pendingOrders: Array<{
      id: number;
      orderId: number;
      dropshipProductId: number;
      supplierId: number;
      quantity: number;
      status: string;
      supplierPrice: number;
      clientPrice: number;
      profit: number;
      createdAt: Date;
      product: { id: number; name: string; supplierPrice: number; yourPrice: number };
      orderNumber: string | null;
      isPending: boolean;
    }> = [];

    if (includePending && (!status || status === "all" || status === "new")) {
      // Obtine ID-uri comenzi deja procesate
      const processedOrderIds = new Set(existingOrders.map(o => o.orderId));
      
      // Obtine comenzi recente (indiferent de status pentru a detecta toate comenzile dropship)
      const recentOrders = await prisma.order.findMany({
        orderBy: { id: "desc" },
        take: 200,
      });

      for (const order of recentOrders) {
        if (processedOrderIds.has(order.id)) continue;
        
        const items = order.items as OrderItem[] | null;
        if (!items || !Array.isArray(items)) continue;

        for (const item of items) {
          const itemProductId = item.id || item.productId || null;
          if (itemProductId === null) continue;
          const dropshipProduct = productIdToDropship.get(itemProductId);
          
          if (dropshipProduct) {
            const qty = item.qty || item.quantity || 1;
            const supplierPrice = dropshipProduct.supplierPrice * qty;
            const clientPrice = (item.price || dropshipProduct.yourPrice) * qty;
            
            pendingOrders.push({
              id: -order.id * 1000 - (itemProductId || 0), // ID temporar negativ
              orderId: order.id,
              dropshipProductId: dropshipProduct.id,
              supplierId: dropshipProduct.supplierId,
              quantity: qty,
              status: "new", // Stare noua - neprocesat
              supplierPrice,
              clientPrice,
              profit: clientPrice - supplierPrice,
              createdAt: order.date || new Date(),
              product: {
                id: dropshipProduct.id,
                name: dropshipProduct.name,
                supplierPrice: dropshipProduct.supplierPrice,
                yourPrice: dropshipProduct.yourPrice,
              },
              orderNumber: order.number,
              isPending: true,
            });
          }
        }
      }
    }

    // Combina rezultatele
    const allOrders = [
      ...pendingOrders,
      ...existingOrders.map(o => ({ ...o, isPending: false, orderNumber: null })),
    ];

    return NextResponse.json(allOrders);
  } catch (error) {
    console.error("Error fetching dropship orders:", error);
    return NextResponse.json({ error: "Eroare la incarcarea comenzilor" }, { status: 500 });
  }
}

// POST - Creaza comanda dropship (plasare la furnizor)
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Obtine produsul pentru a calcula profitul
    const product = await prisma.dropshipProduct.findUnique({
      where: { id: data.dropshipProductId },
    });

    if (!product) {
      return NextResponse.json({ error: "Produs negasit" }, { status: 404 });
    }

    const supplierPrice = product.supplierPrice * data.quantity;
    const clientPrice = product.yourPrice * data.quantity;
    const profit = clientPrice - supplierPrice;

    // Determină statusul: dacă avem supplierOrderId, e "ordered", altfel "pending"
    const status = data.status || (data.supplierOrderId ? "ordered" : "pending");
    const orderedAt = status === "ordered" ? new Date() : null;

    const order = await prisma.dropshipOrder.create({
      data: {
        orderId: data.orderId,
        dropshipProductId: data.dropshipProductId,
        supplierId: product.supplierId,
        quantity: data.quantity,
        supplierOrderId: data.supplierOrderId || null,
        supplierAwb: data.supplierAwb || null,
        courierName: data.courierName || null,
        status,
        supplierPrice,
        clientPrice,
        profit,
        notes: data.notes || null,
        orderedAt,
      },
    });

    // Trimite email către furnizor DOAR dacă bifa "Plasare automată comenzi" e activă
    let emailResult = null;
    const shouldEmail = await shouldSendAutoEmail(product.supplierId);
    
    if (shouldEmail && status === "ordered") {
      // Obține datele clientului din comanda originală
      let clientData = data.clientData || null;
      if (!clientData && data.orderId) {
        const originalOrder = await prisma.order.findUnique({
          where: { id: data.orderId },
        });
        if (originalOrder?.clientData) {
          clientData = originalOrder.clientData as Record<string, unknown>;
        }
      }

      emailResult = await sendSupplierOrderEmail({
        orderId: data.orderId,
        dropshipOrderId: order.id,
        dropshipProductId: data.dropshipProductId,
        quantity: data.quantity,
        notes: data.notes,
        clientData,
      });
    }

    return NextResponse.json({ 
      ...order, 
      emailSent: emailResult?.success || false,
      emailError: emailResult?.error || null 
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating dropship order:", error);
    return NextResponse.json({ error: "Eroare la crearea comenzii" }, { status: 500 });
  }
}

// PUT - Actualizeaza comanda dropship (status, AWB, etc)
export async function PUT(request: NextRequest) {
  try {
    const data = await request.json();
    const { id, ...updateData } = data;

    if (!id) {
      return NextResponse.json({ error: "ID-ul comenzii este necesar" }, { status: 400 });
    }

    // Adauga timestamps in functie de status
    if (updateData.status === "ordered" && !updateData.orderedAt) {
      updateData.orderedAt = new Date();
    }
    if (updateData.status === "shipped" && !updateData.shippedAt) {
      updateData.shippedAt = new Date();
    }
    if (updateData.status === "delivered" && !updateData.deliveredAt) {
      updateData.deliveredAt = new Date();
    }

    const order = await prisma.dropshipOrder.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(order);
  } catch (error) {
    console.error("Error updating dropship order:", error);
    return NextResponse.json({ error: "Eroare la actualizarea comenzii" }, { status: 500 });
  }
}
