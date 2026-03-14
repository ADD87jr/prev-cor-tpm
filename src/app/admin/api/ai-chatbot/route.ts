import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyDPMtQTjaruCtql9qAFqcavAzKwXRdjsnA";

// GET - Statistici chatbot
export async function GET() {
  try {
    // Simulare statistici (în producție ar fi date reale din logs)
    const stats = {
      totalConversations: 1247,
      todayConversations: 34,
      avgResponseTime: "2.3s",
      satisfactionRate: 94.5,
      topQuestions: [
        { question: "Disponibilitate stoc", count: 156 },
        { question: "Specificații tehnice", count: 134 },
        { question: "Termen livrare", count: 98 },
        { question: "Preț și reduceri", count: 87 },
        { question: "Garanție produs", count: 65 }
      ],
      escalatedToHuman: 8.2
    };

    return NextResponse.json(stats);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Răspuns chatbot
export async function POST(req: NextRequest) {
  try {
    const { message, conversationHistory, clientInfo } = await req.json();

    if (!message) {
      return NextResponse.json({ error: "Mesajul este obligatoriu" }, { status: 400 });
    }

    // Obține produse relevante pentru context
    const products = await prisma.product.findMany({
      take: 50,
      select: {
        id: true,
        name: true,
        sku: true,
        price: true,
        stock: true,
        type: true,
        manufacturer: true,
        description: true
      }
    });

    const productContext = products.map(p => 
      `- ${p.name} (SKU: ${p.sku || 'N/A'}) | Preț: ${p.price} RON | Stoc: ${p.stock || 0} | Producător: ${p.manufacturer || 'N/A'}`
    ).join("\n");

    const historyContext = (conversationHistory || [])
      .slice(-5)
      .map((h: any) => `${h.role === "user" ? "Client" : "Asistent"}: ${h.content}`)
      .join("\n");

    const prompt = `Ești asistentul virtual al unui magazin B2B de automatizări industriale (senzori, PLC-uri, invertoare, etc.).

CONTEXT CONVERSAȚIE:
${historyContext || "Prima interacțiune"}

MESAJ CLIENT:
"${message}"

INFORMAȚII CLIENT:
${clientInfo ? JSON.stringify(clientInfo) : "Client nou"}

PRODUSE DISPONIBILE (selecție):
${productContext.substring(0, 3000)}

INSTRUCȚIUNI:
1. Răspunde profesional dar prietenos, în română
2. Dacă întreabă despre un produs specific, oferă detalii din catalog
3. Dacă cere ofertă sau prețuri speciale, recomandă contactarea departamentului vânzări
4. Dacă e o problemă tehnică complexă, escaladează la suport
5. Sugerează produse complementare când e cazul
6. Dacă nu știi răspunsul, fii sincer și oferă alternativă

Returnează JSON:
{
  "response": "răspunsul pentru client",
  "suggestedProducts": [{"id": 1, "name": "...", "reason": "de ce e relevant"}],
  "needsHumanEscalation": false,
  "escalationReason": null,
  "sentiment": "positive/neutral/negative",
  "intent": "info/buy/support/complaint/other",
  "suggestedActions": ["acțiune pentru operator dacă e cazul"]
}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 1000, temperature: 0.7 }
        })
      }
    );

    if (!response.ok) {
      return NextResponse.json({
        response: "Vă mulțumesc pentru mesaj. Un coleg vă va răspunde în curând. Pentru urgențe, sunați-ne la telefon.",
        needsHumanEscalation: true,
        escalationReason: "AI indisponibil"
      });
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const cleaned = rawText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    try {
      const result = JSON.parse(cleaned);
      return NextResponse.json({
        success: true,
        ...result
      });
    } catch {
      // Dacă nu poate parsa JSON, returnează textul ca răspuns
      return NextResponse.json({
        success: true,
        response: rawText,
        needsHumanEscalation: false
      });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
