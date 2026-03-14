import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyDPMtQTjaruCtql9qAFqcavAzKwXRdjsnA";

// GET - Generare notificări inteligente
export async function GET() {
  try {
    const notifications: any[] = [];
    const now = new Date();

    // 1. Clienți care nu au mai cumpărat de 30+ zile
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const orders = await prisma.order.findMany({
      orderBy: { date: "desc" },
      select: {
        id: true,
        date: true,
        total: true,
        clientData: true
      }
    });

    // Grupează comenzile pe email client
    const clientOrders: Record<string, { lastOrder: Date; total: number; email: string; name: string }> = {};
    
    for (const order of orders) {
      const clientData = order.clientData as any;
      const email = clientData?.email;
      if (!email) continue;

      if (!clientOrders[email]) {
        clientOrders[email] = {
          lastOrder: order.date,
          total: order.total || 0,
          email,
          name: clientData?.name || clientData?.companyName || email
        };
      } else {
        clientOrders[email].total += order.total || 0;
        if (order.date > clientOrders[email].lastOrder) {
          clientOrders[email].lastOrder = order.date;
        }
      }
    }

    // Clienți inactivi cu valoare mare
    for (const [email, data] of Object.entries(clientOrders)) {
      const daysSinceOrder = Math.floor((now.getTime() - new Date(data.lastOrder).getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysSinceOrder >= 30 && data.total > 5000) {
        notifications.push({
          id: `inactive-${email}`,
          type: "CLIENT_INACTIVE",
          priority: data.total > 20000 ? "HIGH" : "MEDIUM",
          title: `Client valoros inactiv`,
          message: `${data.name} nu a mai comandat de ${daysSinceOrder} zile (valoare totală: ${data.total.toLocaleString()} RON)`,
          action: "Trimite email de reactivare",
          data: { email, daysSinceOrder, totalValue: data.total }
        });
      }
    }

    // 2. Produse cu stoc critic
    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        sku: true,
        stock: true,
        price: true
      }
    });

    for (const product of products) {
      if (product.stock !== null && product.stock <= 5 && product.stock > 0) {
        notifications.push({
          id: `lowstock-${product.id}`,
          type: "LOW_STOCK",
          priority: product.stock <= 2 ? "HIGH" : "MEDIUM",
          title: `Stoc scăzut: ${product.name}`,
          message: `Doar ${product.stock} bucăți rămase (SKU: ${product.sku})`,
          action: "Comandă de la furnizor",
          data: { productId: product.id, stock: product.stock }
        });
      } else if (product.stock === 0) {
        notifications.push({
          id: `nostock-${product.id}`,
          type: "OUT_OF_STOCK",
          priority: "CRITICAL",
          title: `Stoc epuizat: ${product.name}`,
          message: `Produs indisponibil (SKU: ${product.sku})`,
          action: "Urgentează comanda",
          data: { productId: product.id }
        });
      }
    }

    // 3. Comenzi vechi nelivrate
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const pendingOrders = await prisma.order.findMany({
      where: {
        status: { in: ["pending", "processing"] },
        date: { lt: sevenDaysAgo }
      },
      select: {
        id: true,
        number: true,
        date: true,
        total: true,
        status: true,
        clientData: true
      }
    });

    for (const order of pendingOrders) {
      const daysPending = Math.floor((now.getTime() - new Date(order.date).getTime()) / (1000 * 60 * 60 * 24));
      const clientData = order.clientData as any;
      
      notifications.push({
        id: `pending-${order.id}`,
        type: "ORDER_DELAYED",
        priority: daysPending > 14 ? "CRITICAL" : "HIGH",
        title: `Comandă întârziată #${order.number}`,
        message: `Comandă în așteptare de ${daysPending} zile (${clientData?.name || "Client"})`,
        action: "Verifică și procesează",
        data: { orderId: order.id, daysPending }
      });
    }

    // 4. Reviews negative recente
    const recentReviews = await prisma.review.findMany({
      where: {
        rating: { lte: 2 }
      },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        rating: true,
        text: true,
        userName: true,
        createdAt: true
      }
    });

    for (const review of recentReviews) {
      const reviewDate = new Date(review.createdAt);
      const daysSinceReview = Math.floor((now.getTime() - reviewDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysSinceReview <= 7) {
        notifications.push({
          id: `review-${review.id}`,
          type: "NEGATIVE_REVIEW",
          priority: review.rating === 1 ? "HIGH" : "MEDIUM",
          title: `Review negativ (${review.rating}⭐)`,
          message: `"${review.text?.substring(0, 100)}..." - ${review.userName}`,
          action: "Răspunde la review",
          data: { reviewId: review.id }
        });
      }
    }

    // Sortează după prioritate
    const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    notifications.sort((a, b) => priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder]);

    const stats = {
      total: notifications.length,
      critical: notifications.filter(n => n.priority === "CRITICAL").length,
      high: notifications.filter(n => n.priority === "HIGH").length,
      medium: notifications.filter(n => n.priority === "MEDIUM").length,
      byType: {
        clientInactive: notifications.filter(n => n.type === "CLIENT_INACTIVE").length,
        lowStock: notifications.filter(n => n.type === "LOW_STOCK").length,
        outOfStock: notifications.filter(n => n.type === "OUT_OF_STOCK").length,
        orderDelayed: notifications.filter(n => n.type === "ORDER_DELAYED").length,
        negativeReview: notifications.filter(n => n.type === "NEGATIVE_REVIEW").length
      }
    };

    return NextResponse.json({
      stats,
      notifications: notifications.slice(0, 50)
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Generare acțiune AI pentru o notificare
export async function POST(req: NextRequest) {
  try {
    const { notificationType, notificationData } = await req.json();

    let prompt = "";
    
    switch (notificationType) {
      case "CLIENT_INACTIVE":
        prompt = `Generează un email de reactivare pentru un client B2B de automatizări industriale.

DATE CLIENT:
- Numele: ${notificationData.name || "Client"}
- Email: ${notificationData.email}
- Ultima comandă: acum ${notificationData.daysSinceOrder} zile
- Valoare totală comenzi: ${notificationData.totalValue?.toLocaleString()} RON

Generează un email personalizat, profesional, care să:
- Reamintească parteneriatul
- Ofere un beneficiu (discount 5% la următoarea comandă)
- Menționeze produse noi sau promoții
- Fie scurt și la obiect

Returnează JSON:
{
  "subject": "subiect email",
  "body": "corpul emailului",
  "callToAction": "acțiunea principală",
  "suggestedDiscount": "discount recomandat %"
}`;
        break;

      case "LOW_STOCK":
      case "OUT_OF_STOCK":
        prompt = `Sugerează acțiuni pentru un produs cu stoc scăzut/epuizat.

PRODUS:
- Stoc curent: ${notificationData.stock || 0}
- ID: ${notificationData.productId}

Returnează JSON:
{
  "urgency": "URGENT" | "NORMAL",
  "recommendedQuantity": number,
  "actions": ["lista acțiuni recomandate"],
  "alternativeStrategy": "ce să faci dacă furnizorul nu are stoc"
}`;
        break;

      case "NEGATIVE_REVIEW":
        prompt = `Generează un răspuns profesional la un review negativ pentru un magazin B2B de automatizări industriale.

REVIEW:
- Rating: ${notificationData.rating} stele
- Text: "${notificationData.text}"
- Autor: ${notificationData.userName}

Generează un răspuns profesional care:
- Mulțumește pentru feedback
- Își cere scuze pentru experiența negativă
- Oferă o soluție concretă
- Invită la contact direct pentru rezolvare

Returnează JSON:
{
  "response": "răspunsul complet",
  "tone": "empatic/profesional/apologetic",
  "followUpAction": "acțiune de follow-up recomandată"
}`;
        break;

      default:
        return NextResponse.json({ error: "Tip notificare necunoscut" }, { status: 400 });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1500
          }
        })
      }
    );

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    let result;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      result = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: text };
    } catch {
      result = { raw: text };
    }

    return NextResponse.json({
      notificationType,
      aiSuggestion: result
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
