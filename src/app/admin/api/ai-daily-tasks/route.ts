import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Aggregator pentru toate task-urile care necesită aprobare
export async function GET() {
  try {
    const tasks: any[] = [];
    const now = new Date();

    // 1. PRODUSE DE COMANDAT - bazat pe comenzile active (model la cerere)
    // Obținem comenzile care nu sunt încă livrate
    const activeOrders = await prisma.order.findMany({
      where: { 
        status: { 
          in: ["PENDING", "PROCESSING", "pending", "processing", "awaiting_price", "confirmed"] 
        } 
      },
      select: { id: true, items: true, status: true }
    });

    // Agregăm produsele necesare din toate comenzile active
    const productsNeeded: Map<number, { name: string; totalQty: number; orderIds: number[] }> = new Map();
    
    activeOrders.forEach(order => {
      const items = order.items as any[];
      if (Array.isArray(items)) {
        items.forEach(item => {
          const productId = item.id || item.productId;
          const qty = item.quantity || item.qty || 1;
          const name = item.name || item.productName || `Produs #${productId}`;
          
          if (productId) {
            const existing = productsNeeded.get(productId);
            if (existing) {
              existing.totalQty += qty;
              if (!existing.orderIds.includes(order.id)) {
                existing.orderIds.push(order.id);
              }
            } else {
              productsNeeded.set(productId, { name, totalQty: qty, orderIds: [order.id] });
            }
          }
        });
      }
    });

    // Creăm task-uri pentru produsele care trebuie comandate
    productsNeeded.forEach((data, productId) => {
      const orderCount = data.orderIds.length;
      tasks.push({
        id: `reorder-${productId}`,
        type: "REORDER",
        priority: orderCount >= 3 ? "CRITICAL" : orderCount >= 2 ? "HIGH" : "MEDIUM",
        title: `📦 Comandă: ${data.name}`,
        description: `${data.totalQty} buc. necesare pentru ${orderCount} comandă${orderCount > 1 ? " active" : ""}`,
        data: { 
          productId, 
          productName: data.name, 
          neededQuantity: data.totalQty, 
          orderIds: data.orderIds,
          suggestedQuantity: data.totalQty 
        },
        actions: [
          { id: "approve", label: "✅ Creează comandă furnizor", endpoint: "/admin/api/ai-daily-tasks/execute", color: "green" },
          { id: "skip", label: "⏭️ Amână", endpoint: null, color: "gray" }
        ],
        createdAt: now.toISOString()
      });
    });

    // 2. COMENZI NECONFIRMATE - comenzi noi de procesat
    const pendingOrders = await prisma.order.findMany({
      where: { status: "PENDING" },
      select: { id: true, total: true, clientData: true, date: true },
      take: 10,
      orderBy: { date: "desc" }
    });

    pendingOrders.forEach(order => {
      const client = order.clientData as any;
      tasks.push({
        id: `order-${order.id}`,
        type: "ORDER_CONFIRM",
        priority: order.total > 5000 ? "HIGH" : "MEDIUM",
        title: `Comandă nouă #${order.id}`,
        description: `${client?.name || "Client"} - ${order.total.toFixed(2)} RON`,
        data: { orderId: order.id, total: order.total, clientName: client?.name },
        actions: [
          { id: "confirm", label: "✅ Confirmă", endpoint: "/admin/api/ai-daily-tasks/execute", color: "green" },
          { id: "view", label: "👁️ Vezi detalii", endpoint: null, href: `/admin/orders?id=${order.id}`, color: "blue" }
        ],
        createdAt: order.date.toISOString()
      });
    });

    // 3. PREȚURI DE AJUSTAT - bazat pe competiție (simulat)
    const productsForPricing = await prisma.product.findMany({
      select: { id: true, name: true, price: true, listPrice: true },
      where: { listPrice: { not: null } },
      take: 5
    });

    productsForPricing.forEach(p => {
      if (p.listPrice && p.price < p.listPrice * 0.7) {
        tasks.push({
          id: `price-${p.id}`,
          type: "PRICE_ADJUST",
          priority: "LOW",
          title: `Preț sub margine: ${p.name}`,
          description: `Preț actual: ${p.price} RON, Preț listă: ${p.listPrice} RON. Sugestie: ${Math.round(p.listPrice * 0.85)} RON`,
          data: { productId: p.id, currentPrice: p.price, suggestedPrice: Math.round(p.listPrice * 0.85) },
          actions: [
            { id: "approve", label: "✅ Aplică preț", endpoint: "/admin/api/ai-daily-tasks/execute", color: "green" },
            { id: "skip", label: "⏭️ Păstrează", endpoint: null, color: "gray" }
          ],
          createdAt: now.toISOString()
        });
      }
    });

    // 4. RECENZII DE MODERAT
    const pendingReviews = await prisma.review.findMany({
      where: { approved: false },
      select: { id: true, userName: true, rating: true, text: true, productId: true },
      take: 5
    });

    for (const review of pendingReviews) {
      const product = await prisma.product.findUnique({
        where: { id: review.productId },
        select: { name: true }
      });
      
      tasks.push({
        id: `review-${review.id}`,
        type: "REVIEW_MODERATE",
        priority: review.rating >= 4 ? "LOW" : "MEDIUM",
        title: `Recenzie de aprobat`,
        description: `${review.userName}: "${review.text?.slice(0, 100)}..." - ${review.rating}⭐ pentru ${product?.name || "Produs"}`,
        data: { reviewId: review.id, rating: review.rating },
        actions: [
          { id: "approve", label: "✅ Aprobă", endpoint: "/admin/api/ai-daily-tasks/execute", color: "green" },
          { id: "reject", label: "❌ Respinge", endpoint: "/admin/api/ai-daily-tasks/execute", color: "red" }
        ],
        createdAt: now.toISOString()
      });
    }

    // 5. ÎNTREBĂRI FĂRĂ RĂSPUNS
    const unansweredQuestions = await prisma.productQuestion.findMany({
      where: { answer: null },
      select: { id: true, question: true, userName: true, productId: true },
      take: 5
    });

    for (const q of unansweredQuestions) {
      const product = await prisma.product.findUnique({
        where: { id: q.productId },
        select: { name: true }
      });
      
      tasks.push({
        id: `question-${q.id}`,
        type: "QUESTION_ANSWER",
        priority: "MEDIUM",
        title: `Întrebare fără răspuns`,
        description: `${q.userName}: "${q.question?.slice(0, 100)}" - ${product?.name || "Produs"}`,
        data: { questionId: q.id, question: q.question, productName: product?.name },
        actions: [
          { id: "ai_answer", label: "🤖 Răspuns AI", endpoint: "/admin/api/ai-daily-tasks/execute", color: "purple" },
          { id: "manual", label: "✍️ Răspunde manual", endpoint: null, href: `/admin/intrebari`, color: "blue" }
        ],
        createdAt: now.toISOString()
      });
    }

    // 6. FACTURI DE EMIS - comenzi livrate fără invoiceUrl
    const deliveredWithoutInvoice = await prisma.order.findMany({
      where: { 
        status: "DELIVERED",
        invoiceUrl: null
      },
      select: { id: true, total: true, clientData: true },
      take: 5
    });

    deliveredWithoutInvoice.forEach(order => {
      const client = order.clientData as any;
      tasks.push({
        id: `invoice-${order.id}`,
        type: "INVOICE_GENERATE",
        priority: "HIGH",
        title: `Factură de emis`,
        description: `Comandă #${order.id} - ${client?.name || "Client"}: ${order.total.toFixed(2)} RON`,
        data: { orderId: order.id, total: order.total },
        actions: [
          { id: "generate", label: "🧾 Generează factură", endpoint: "/admin/api/ai-daily-tasks/execute", color: "green" },
          { id: "skip", label: "⏭️ Amână", endpoint: null, color: "gray" }
        ],
        createdAt: now.toISOString()
      });
    });

    // Sortare după prioritate
    const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    tasks.sort((a, b) => priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder]);

    // Statistici
    const stats = {
      total: tasks.length,
      critical: tasks.filter(t => t.priority === "CRITICAL").length,
      high: tasks.filter(t => t.priority === "HIGH").length,
      medium: tasks.filter(t => t.priority === "MEDIUM").length,
      low: tasks.filter(t => t.priority === "LOW").length,
      byType: {
        reorder: tasks.filter(t => t.type === "REORDER").length,
        orders: tasks.filter(t => t.type === "ORDER_CONFIRM").length,
        pricing: tasks.filter(t => t.type === "PRICE_ADJUST").length,
        reviews: tasks.filter(t => t.type === "REVIEW_MODERATE").length,
        questions: tasks.filter(t => t.type === "QUESTION_ANSWER").length,
        invoices: tasks.filter(t => t.type === "INVOICE_GENERATE").length
      }
    };

    return NextResponse.json({ tasks, stats, generatedAt: now.toISOString() });
  } catch (error: any) {
    console.error("Daily tasks error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
