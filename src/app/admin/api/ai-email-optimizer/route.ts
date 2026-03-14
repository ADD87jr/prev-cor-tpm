import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const GEMINI_API_KEY = "AIzaSyDPMtQTjaruCtql9qAFqcavAzKwXRdjsnA";

export async function GET() {
  try {
    // Obținem date pentru personalizare email-uri
    const orders = await prisma.order.findMany({
      select: {
        clientData: true,
        total: true,
        items: true,
        date: true
      },
      orderBy: { date: "desc" },
      take: 500
    });

    const products = await prisma.product.findMany({
      select: { id: true, name: true, type: true, domain: true, price: true },
      take: 100
    });

    // Analizăm clienții pentru segmentare
    const clientStats = new Map<string, {
      email: string;
      name: string;
      company: string;
      orderCount: number;
      totalSpent: number;
      lastOrder: Date;
      categories: Set<string>;
    }>();

    orders.forEach(order => {
      const data = order.clientData as any;
      const email = data?.email || "unknown";
      
      if (!clientStats.has(email)) {
        clientStats.set(email, {
          email,
          name: data?.name || data?.nume || "",
          company: data?.company || data?.firma || "",
          orderCount: 0,
          totalSpent: 0,
          lastOrder: order.date,
          categories: new Set()
        });
      }
      
      const client = clientStats.get(email)!;
      client.orderCount++;
      client.totalSpent += order.total;
      if (order.date > client.lastOrder) client.lastOrder = order.date;
      
      const items = (order.items as any[]) || [];
      items.forEach(item => {
        if (item.category) client.categories.add(item.category);
      });
    });

    // Generăm campanii sugerate
    const now = new Date();
    const campaigns = [
      {
        id: "winback",
        name: "Win-back Clienți Inactivi",
        description: "Reactivează clienții care nu au cumpărat de 60+ zile",
        targetAudience: Array.from(clientStats.values()).filter(c => 
          (now.getTime() - c.lastOrder.getTime()) / (1000 * 60 * 60 * 24) > 60
        ).length,
        suggestedSubject: "Ne e dor de tine! -15% pentru revenire",
        type: "WINBACK",
        priority: "HIGH"
      },
      {
        id: "vip",
        name: "Program VIP",
        description: "Recompensează cei mai buni clienți",
        targetAudience: Array.from(clientStats.values()).filter(c => c.totalSpent > 10000).length,
        suggestedSubject: "Ești client VIP! Beneficii exclusive pentru tine",
        type: "LOYALTY",
        priority: "MEDIUM"
      },
      {
        id: "cross-sell",
        name: "Cross-sell Produse Complementare",
        description: "Sugerează produse complementare bazat pe achiziții",
        targetAudience: Array.from(clientStats.values()).filter(c => c.orderCount >= 2).length,
        suggestedSubject: "Produse care completează achizițiile tale",
        type: "CROSS_SELL",
        priority: "HIGH"
      },
      {
        id: "new-products",
        name: "Lansări Noi",
        description: "Anunță produse noi în catalog",
        targetAudience: clientStats.size,
        suggestedSubject: "🆕 Noutăți în catalogul nostru!",
        type: "ANNOUNCEMENT",
        priority: "MEDIUM"
      },
      {
        id: "abandoned-cart",
        name: "Coșuri Abandonate",
        description: "Recuperează comenzi nefinalizate",
        targetAudience: Math.round(clientStats.size * 0.1),
        suggestedSubject: "Ai uitat ceva în coș? Finalizează acum!",
        type: "CART_RECOVERY",
        priority: "HIGH"
      }
    ];

    // Templates sugerate
    const templates = [
      { name: "Promoție", icon: "🏷️", openRate: 22, clickRate: 4 },
      { name: "Newsletter", icon: "📰", openRate: 18, clickRate: 2 },
      { name: "Produs Nou", icon: "🆕", openRate: 25, clickRate: 5 },
      { name: "Follow-up", icon: "🔄", openRate: 30, clickRate: 6 },
      { name: "Reminder", icon: "⏰", openRate: 35, clickRate: 8 }
    ];

    // Best practices
    const bestPractices = [
      { tip: "Trimite între 10-11 AM pentru rate maxime de deschidere", impact: "HIGH" },
      { tip: "Subiectele sub 50 caractere au +20% open rate", impact: "HIGH" },
      { tip: "Personalizarea cu numele crește click-rate cu 15%", impact: "MEDIUM" },
      { tip: "Evită marți și joi - concurență mare", impact: "LOW" },
      { tip: "Include CTA clar în primele 3 secunde", impact: "HIGH" }
    ];

    const stats = {
      totalContacts: clientStats.size,
      activeContacts: Array.from(clientStats.values()).filter(c => 
        (now.getTime() - c.lastOrder.getTime()) / (1000 * 60 * 60 * 24) < 90
      ).length,
      inactiveContacts: Array.from(clientStats.values()).filter(c => 
        (now.getTime() - c.lastOrder.getTime()) / (1000 * 60 * 60 * 24) >= 90
      ).length,
      avgOpenRate: 24,
      avgClickRate: 4.5
    };

    return NextResponse.json({
      campaigns,
      templates,
      bestPractices,
      stats
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { campaignType, targetDescription, product, tone } = await req.json();

    const prompt = `Generează conținut optimizat pentru o campanie email B2B:

TIP CAMPANIE: ${campaignType || "PROMOTIONAL"}
PUBLIC ȚINTĂ: ${targetDescription || "Clienți B2B industriali"}
PRODUS/SERVICIU: ${product || "Echipamente industriale"}
TON: ${tone || "Profesional dar prietenos"}

Generează variante A/B pentru testare.

Răspunde STRICT în JSON:
{
  "subjectLines": [
    { "text": "...", "predictedOpenRate": 0, "reasoning": "..." }
  ],
  "preheaders": ["..."],
  "emailBody": {
    "greeting": "...",
    "hook": "...",
    "mainContent": "...",
    "benefits": ["..."],
    "cta": { "text": "...", "urgency": "..." },
    "closing": "...",
    "ps": "..."
  },
  "sendTimeRecommendation": {
    "bestDay": "...",
    "bestTime": "...",
    "reasoning": "..."
  },
  "abTestSuggestions": [
    { "element": "...", "variantA": "...", "variantB": "..." }
  ],
  "segmentationTips": ["..."],
  "followUpSequence": [
    { "day": 0, "subject": "...", "goal": "..." }
  ]
}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.8, maxOutputTokens: 2500 }
        })
      }
    );

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const content = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    return NextResponse.json({ content });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
