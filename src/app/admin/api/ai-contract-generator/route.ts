import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyDPMtQTjaruCtql9qAFqcavAzKwXRdjsnA";

// GET - Listează clienți pentru contracte
export async function GET() {
  try {
    // Clienți cu comenzi mari
    const orders = await prisma.order.findMany({
      where: { status: { not: "cancelled" } },
      select: {
        id: true,
        clientData: true,
        total: true,
        date: true
      },
      orderBy: { total: "desc" },
      take: 100
    });

    // Grupează pe client
    const clientMap = new Map<string, any>();
    
    for (const order of orders) {
      let client: any = {};
      try {
        client = typeof order.clientData === "string" ? JSON.parse(order.clientData) : order.clientData || {};
      } catch {}

      const key = client.email || client.company || "unknown";
      if (!clientMap.has(key)) {
        clientMap.set(key, {
          name: client.name || "N/A",
          company: client.company || "",
          email: client.email || "",
          cui: client.cui || "",
          totalOrders: 0,
          totalValue: 0
        });
      }
      const c = clientMap.get(key);
      c.totalOrders++;
      c.totalValue += order.total;
    }

    const clients = Array.from(clientMap.values())
      .filter(c => c.totalValue > 1000)
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 50);

    return NextResponse.json({
      clients,
      stats: {
        totalClients: clients.length,
        avgValue: clients.length > 0 ? (clients.reduce((s, c) => s + c.totalValue, 0) / clients.length).toFixed(0) : 0
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Generează contract B2B
export async function POST(req: NextRequest) {
  try {
    const { clientName, clientCompany, clientCui, contractType, products, discountPercent, paymentTerms, duration } = await req.json();

    const prompt = `Ești expert juridic pentru contracte B2B în domeniul automatizărilor industriale din România.

Generează un contract ${contractType || "de furnizare"} profesional în limba română.

DATE CLIENT:
- Nume contact: ${clientName || "N/A"}
- Companie: ${clientCompany || "N/A"}
- CUI: ${clientCui || "N/A"}

DATE FURNIZOR:
- Companie: PREV-COR TPM S.R.L.
- CUI: RO12345678
- Adresă: București, România

TERMENI:
- Produse: ${products || "Echipamente automatizări industriale"}
- Discount acordat: ${discountPercent || 0}%
- Termeni plată: ${paymentTerms || "30 zile"}
- Durată contract: ${duration || "12 luni"}

Returnează JSON:
{
  "title": "TITLU CONTRACT",
  "contractNumber": "CTR-2026-XXXX",
  "parties": {
    "supplier": { "name": "...", "cui": "...", "address": "..." },
    "client": { "name": "...", "cui": "...", "address": "..." }
  },
  "clauses": [
    { "number": "1", "title": "OBIECTUL CONTRACTULUI", "content": "..." },
    { "number": "2", "title": "PREȚURI ȘI PLATĂ", "content": "..." },
    { "number": "3", "title": "LIVRARE", "content": "..." },
    { "number": "4", "title": "GARANȚIE", "content": "..." },
    { "number": "5", "title": "RĂSPUNDERE", "content": "..." },
    { "number": "6", "title": "FORȚĂ MAJORĂ", "content": "..." },
    { "number": "7", "title": "DISPOZIȚII FINALE", "content": "..." }
  ],
  "duration": "...",
  "signatureDate": "...",
  "fullText": "text complet contract formatat"
}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.5, maxOutputTokens: 4000 }
        })
      }
    );

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    let contract;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      contract = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch {
      contract = {
        title: "CONTRACT DE FURNIZARE",
        contractNumber: `CTR-2026-${Date.now().toString().slice(-4)}`,
        fullText: text
      };
    }

    return NextResponse.json(contract);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
