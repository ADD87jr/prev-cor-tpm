import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyDPMtQTjaruCtql9qAFqcavAzKwXRdjsnA";

// GET - Lista vizitatori/lead-uri
export async function GET() {
  try {
    // Obține comenzi pentru calc lead scoring
    const orders = await prisma.order.findMany({
      select: { clientData: true, total: true, items: true, status: true, date: true }
    });

    // Map clienți cu date agregate
    const leadsMap = new Map<string, any>();
    
    for (const order of orders) {
      const data = typeof order.clientData === "string" 
        ? JSON.parse(order.clientData) 
        : order.clientData;
      
      const email = data?.email || "";
      if (!email) continue;

      const existing = leadsMap.get(email) || {
        email,
        name: data?.name || "",
        company: data?.companyName || "",
        phone: data?.phone || "",
        orders: [],
        totalValue: 0,
        firstOrder: order.date,
        lastOrder: order.date
      };

      existing.orders.push({
        total: order.total,
        status: order.status,
        date: order.date,
        itemsCount: Array.isArray(order.items) ? order.items.length : 0
      });
      existing.totalValue += order.total;
      
      if (new Date(order.date) < new Date(existing.firstOrder)) {
        existing.firstOrder = order.date;
      }
      if (new Date(order.date) > new Date(existing.lastOrder)) {
        existing.lastOrder = order.date;
      }

      leadsMap.set(email, existing);
    }

    const leads = Array.from(leadsMap.values()).map(lead => {
      // Calculează scor lead
      let score = 0;
      
      // Număr comenzi
      score += Math.min(lead.orders.length * 15, 30);
      
      // Valoare totală
      if (lead.totalValue > 10000) score += 25;
      else if (lead.totalValue > 5000) score += 20;
      else if (lead.totalValue > 1000) score += 10;
      
      // Recență
      const daysSinceLast = Math.floor((Date.now() - new Date(lead.lastOrder).getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceLast < 30) score += 20;
      else if (daysSinceLast < 90) score += 10;
      else if (daysSinceLast > 180) score -= 10;
      
      // Are companie (B2B)
      if (lead.company) score += 15;
      
      // Frecvență
      const monthsActive = Math.max(1, Math.ceil((new Date(lead.lastOrder).getTime() - new Date(lead.firstOrder).getTime()) / (1000 * 60 * 60 * 24 * 30)));
      const ordersPerMonth = lead.orders.length / monthsActive;
      if (ordersPerMonth > 2) score += 15;
      else if (ordersPerMonth > 0.5) score += 10;

      score = Math.max(0, Math.min(100, score));

      return {
        ...lead,
        score,
        tier: score >= 80 ? "A" : score >= 60 ? "B" : score >= 40 ? "C" : "D",
        daysSinceLast,
        ordersCount: lead.orders.length
      };
    }).sort((a, b) => b.score - a.score);

    const stats = {
      totalLeads: leads.length,
      tierA: leads.filter(l => l.tier === "A").length,
      tierB: leads.filter(l => l.tier === "B").length,
      tierC: leads.filter(l => l.tier === "C").length,
      tierD: leads.filter(l => l.tier === "D").length,
      avgScore: Math.round(leads.reduce((sum, l) => sum + l.score, 0) / (leads.length || 1))
    };

    return NextResponse.json({ leads: leads.slice(0, 50), stats });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Analiză detaliată lead
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email obligatoriu" }, { status: 400 });
    }

    const orders = await prisma.order.findMany({
      select: { clientData: true, total: true, items: true, status: true, date: true }
    });

    let leadData: any = null;
    const leadOrders: any[] = [];
    const productsPurchased: Record<string, number> = {};

    for (const order of orders) {
      const data = typeof order.clientData === "string" 
        ? JSON.parse(order.clientData) 
        : order.clientData;
      
      if (data?.email === email) {
        if (!leadData) leadData = data;
        leadOrders.push(order);
        
        const items = typeof order.items === "string" ? JSON.parse(order.items) : order.items;
        if (Array.isArray(items)) {
          for (const item of items) {
            const name = item.name || item.productName || "Necunoscut";
            productsPurchased[name] = (productsPurchased[name] || 0) + (item.quantity || 1);
          }
        }
      }
    }

    if (!leadData) {
      return NextResponse.json({ error: "Lead negăsit" }, { status: 404 });
    }

    const topProducts = Object.entries(productsPurchased)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([name, qty]) => ({ name, quantity: qty }));

    const prompt = `Ești specialist în lead scoring și segmentare clienți pentru un magazin B2B de automatizări.

DATELE LEAD-ULUI:
- Email: ${email}
- Nume: ${leadData.name || "N/A"}
- Companie: ${leadData.companyName || "N/A"}
- Telefon: ${leadData.phone || "N/A"}
- Total comenzi: ${leadOrders.length}
- Valoare totală: ${leadOrders.reduce((sum, o) => sum + o.total, 0)} RON

ISTORICUL ACHIZIȚIILOR:
${leadOrders.slice(0, 10).map(o => `- ${new Date(o.date).toLocaleDateString("ro-RO")}: ${o.total} RON (${o.status})`).join("\n")}

TOP PRODUSE CUMPĂRATE:
${topProducts.map(p => `- ${p.name}: ${p.quantity} buc`).join("\n")}

Analizează și returnează JSON:
{
  "leadProfile": {
    "segment": "Enterprise/SMB/Startup/Individual",
    "buyerPersona": "descriere scurtă a tipului de cumpărător",
    "industry": "industria estimată",
    "purchasingPattern": "regulat/sporadic/one-time/growing"
  },
  "behavior": {
    "loyaltyLevel": "high/medium/low",
    "pricesSensitivity": "high/medium/low",
    "productFocus": "ce fel de produse preferă",
    "seasonality": "când cumpără mai mult"
  },
  "potential": {
    "lifetimeValue": "valoare estimată pe termen lung în RON",
    "growthPotential": "high/medium/low",
    "upsellOpportunity": "high/medium/low",
    "crossSellProducts": ["categorii de produse pentru cross-sell"]
  },
  "engagement": {
    "riskOfChurn": "high/medium/low",
    "recommendedActions": [
      { "action": "ce să facem", "priority": "high/medium/low", "expectedImpact": "impactul așteptat" }
    ],
    "personalizedOffers": ["tipuri de oferte care ar funcționa"]
  },
  "nextBestAction": {
    "action": "acțiunea principală recomandată",
    "timing": "când să o facem",
    "channel": "email/telefon/în persoană"
  }
}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 1200, temperature: 0.7 }
        })
      }
    );

    let aiAnalysis = null;
    if (response.ok) {
      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const cleaned = rawText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      aiAnalysis = JSON.parse(cleaned);
    }

    return NextResponse.json({
      lead: leadData,
      orders: leadOrders,
      topProducts,
      totalValue: leadOrders.reduce((sum, o) => sum + o.total, 0),
      aiAnalysis
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
