import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Executor pentru task-urile aprobate
export async function POST(req: Request) {
  try {
    const { taskId, actionId, data } = await req.json();

    if (!taskId || !actionId) {
      return NextResponse.json({ error: "taskId and actionId required" }, { status: 400 });
    }

    const [taskType, id] = taskId.split("-");
    let result: any = { success: false };

    switch (taskType) {
      // REORDER - Creează comandă de achiziție
      case "reorder":
        if (actionId === "approve") {
          const productId = parseInt(id);
          const product = await prisma.product.findUnique({
            where: { id: productId },
            select: { name: true, manufacturer: true, purchasePrice: true }
          });

          if (product) {
            // Găsim sau creăm furnizorul
            let supplier = await prisma.supplier.findFirst({
              where: { name: { contains: product.manufacturer || "" } }
            });

            if (!supplier) {
              supplier = await prisma.supplier.findFirst();
            }

            if (supplier) {
              // Creăm comanda de achiziție
              const purchaseOrder = await prisma.purchaseOrder.create({
                data: {
                  supplierId: supplier.id,
                  status: "DRAFT",
                  items: [{
                    productId: productId,
                    productName: product.name,
                    quantity: data?.suggestedQuantity || 30,
                    unitPrice: product.purchasePrice || 0
                  }],
                  totalAmount: (product.purchasePrice || 0) * (data?.suggestedQuantity || 30),
                  notes: "Generat automat din Command Center"
                }
              });

              result = {
                success: true,
                message: `Comandă achiziție #${purchaseOrder.id} creată pentru ${product.name}`,
                purchaseOrderId: purchaseOrder.id
              };
            } else {
              result = { success: false, message: "Nu s-a găsit furnizor" };
            }
          }
        }
        break;

      // ORDER_CONFIRM - Confirmă comanda
      case "order":
        if (actionId === "confirm") {
          const orderId = parseInt(id);
          await prisma.order.update({
            where: { id: orderId },
            data: { status: "PROCESSING" }
          });

          result = {
            success: true,
            message: `Comanda #${orderId} confirmată și trecută în procesare`
          };
        }
        break;

      // PRICE_ADJUST - Ajustează prețul
      case "price":
        if (actionId === "approve") {
          const productId = parseInt(id);
          const newPrice = data?.suggestedPrice;

          if (newPrice) {
            await prisma.product.update({
              where: { id: productId },
              data: { price: newPrice }
            });

            result = {
              success: true,
              message: `Preț actualizat la ${newPrice} RON`
            };
          }
        }
        break;

      // REVIEW_MODERATE - Aprobă/Respinge recenzie
      case "review":
        const reviewId = parseInt(id);
        if (actionId === "approve") {
          await prisma.review.update({
            where: { id: reviewId },
            data: { approved: true }
          });
          result = { success: true, message: "Recenzie aprobată" };
        } else if (actionId === "reject") {
          await prisma.review.delete({
            where: { id: reviewId }
          });
          result = { success: true, message: "Recenzie ștearsă" };
        }
        break;

      // QUESTION_ANSWER - Răspuns AI la întrebare
      case "question":
        if (actionId === "ai_answer") {
          const questionId = parseInt(id);
          const question = await prisma.productQuestion.findUnique({
            where: { id: questionId }
          });

          if (question) {
            // Obținem produsul separat (nu există relație în schema)
            const product = await prisma.product.findUnique({
              where: { id: question.productId },
              select: { name: true, description: true, specs: true }
            });

            const productName = product?.name || "Produs";
            const productSpecs = product?.specs || {};
            const productDesc = product?.description?.slice(0, 300) || "";

            // Generăm răspuns cu AI
            const GEMINI_API_KEY = "AIzaSyDPMtQTjaruCtql9qAFqcavAzKwXRdjsnA";
            const prompt = `Răspunde scurt și profesional la această întrebare despre produsul "${productName}":
            
Întrebare: ${question.question}

Specificații produs: ${JSON.stringify(productSpecs)}
Descriere: ${productDesc}

Răspuns (max 2-3 propoziții, în română):`;

            const aiResponse = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  contents: [{ parts: [{ text: prompt }] }],
                  generationConfig: { temperature: 0.5, maxOutputTokens: 200 }
                })
              }
            );

            const aiData = await aiResponse.json();
            const answer = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "Vă rugăm să contactați suportul pentru mai multe detalii.";

            await prisma.productQuestion.update({
              where: { id: questionId },
              data: { 
                answer: answer.trim(),
                answeredAt: new Date()
              }
            });

            result = { success: true, message: "Răspuns AI publicat", answer: answer.trim() };
          }
        }
        break;

      // INVOICE_GENERATE - Generează factură
      case "invoice":
        if (actionId === "generate") {
          const orderId = parseInt(id);
          
          // Generăm număr factură bazat pe ID
          const invoiceNumber = `FACT-${String(orderId).padStart(6, "0")}`;
          const invoiceUrl = `/api/invoice/${orderId}`;

          await prisma.order.update({
            where: { id: orderId },
            data: { invoiceUrl }
          });

          result = {
            success: true,
            message: `Factură ${invoiceNumber} generată`,
            invoiceNumber,
            invoiceUrl
          };
        }
        break;

      default:
        result = { success: false, message: "Tip task necunoscut" };
    }

    // Log acțiunea
    console.log(`[COMMAND CENTER] Task ${taskId} - Action ${actionId}:`, result);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Execute task error:", error);
    return NextResponse.json({ error: error.message, success: false }, { status: 500 });
  }
}
