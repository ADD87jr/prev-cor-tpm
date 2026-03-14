import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyDPMtQTjaruCtql9qAFqcavAzKwXRdjsnA";

// Simulare inbox - în producție ar trebui integrat cu un serviciu de email real
interface EmailMessage {
  id: string;
  from: string;
  subject: string;
  body: string;
  date: Date;
  isReplied: boolean;
}

// GET - Listează emailuri care necesită răspuns
export async function GET() {
  try {
    // În producție, aici ar fi integrarea cu Gmail/Outlook API
    // Pentru demo, generăm exemple de emailuri tipice

    const sampleEmails: EmailMessage[] = [
      {
        id: "1",
        from: "client@example.com",
        subject: "Disponibilitate PLC Siemens S7-1200",
        body: "Bună ziua, aș dori să știu dacă aveți în stoc PLC Siemens S7-1200 CPU 1214C. Avem nevoie de 3 bucăți pentru un proiect. Care este termenul de livrare? Mulțumesc.",
        date: new Date(),
        isReplied: false
      },
      {
        id: "2",
        from: "achizitii@companie.ro",
        subject: "Cerere ofertă senzori inductivi",
        body: "Bună ziua, vă rog să ne trimiteți o ofertă pentru: - 10 buc senzori inductivi M12, PNP, NO - 5 buc senzori inductivi M18, NPN, NC. Mulțumim, Departament Achiziții",
        date: new Date(Date.now() - 3600000),
        isReplied: false
      },
      {
        id: "3",
        from: "service@fabrica.ro",
        subject: "Probleme invertor",
        body: "Am cumpărat de la voi un invertor Siemens luna trecută. Am probleme la configurarea rampei de accelerație. Puteți să mă ajutați cu setările?",
        date: new Date(Date.now() - 7200000),
        isReplied: false
      }
    ];

    // Categorisire automată
    const categorizedEmails = sampleEmails.map(email => {
      let category: "întrebare" | "reclamație" | "comandă" | "retur" | "altele" = "altele";
      let priority: "low" | "medium" | "high" = "medium";
      const lowerSubject = email.subject.toLowerCase();
      const lowerBody = email.body.toLowerCase();

      if (lowerSubject.includes("ofertă") || lowerSubject.includes("cerere") || lowerBody.includes("preț")) {
        category = "comandă";
        priority = "high";
      } else if (lowerSubject.includes("disponibilitate") || lowerSubject.includes("stoc")) {
        category = "întrebare";
        priority = "medium";
      } else if (lowerSubject.includes("problem") || lowerSubject.includes("ajutor") || lowerBody.includes("nu funcționează")) {
        category = "întrebare";
        priority = "high";
      } else if (lowerSubject.includes("retur")) {
        category = "retur";
        priority = "high";
      } else if (lowerSubject.includes("reclamație")) {
        category = "reclamație";
        priority = "high";
      }

      return { 
        id: email.id,
        from: email.from,
        subject: email.subject,
        preview: email.body.substring(0, 100) + (email.body.length > 100 ? "..." : ""),
        receivedAt: email.date.toISOString(),
        category,
        priority,
        body: email.body,
        isReplied: email.isReplied
      };
    });

    return NextResponse.json({
      pendingEmails: categorizedEmails.filter(e => !e.isReplied),
      totalPending: categorizedEmails.filter(e => !e.isReplied).length,
      emails: categorizedEmails,
      categories: {
        quote_request: "Cereri ofertă",
        stock_inquiry: "Întrebări stoc",
        support: "Suport tehnic",
        complaint: "Reclamații",
        general: "Generale"
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Generează răspuns automat
export async function POST(request: NextRequest) {
  try {
    const { emailId, from, subject, body, category, customContext } = await request.json();

    if (!body) {
      return NextResponse.json({ error: "Conținutul emailului este obligatoriu" }, { status: 400 });
    }

    // Caută produse menționate în email
    const words = body.split(/\s+/).filter((w: string) => w.length > 4);
    const relatedProducts = await prisma.product.findMany({
      where: {
        OR: words.slice(0, 5).map((word: string) => ({
          OR: [
            { name: { contains: word } },
            { type: { contains: word } },
            { manufacturer: { contains: word } }
          ]
        }))
      },
      select: {
        id: true,
        name: true,
        price: true,
        stock: true,
        type: true
      },
      take: 5
    });

    // Obține informații despre companie
    const companyInfo = {
      name: "PREV-COR TPM S.R.L.",
      email: "contact@prev-cor.ro",
      phone: "+40 XXX XXX XXX",
      website: "www.prev-cor.ro"
    };

    const prompt = `Ești reprezentant de vânzări pentru ${companyInfo.name}, furnizor de automatizări industriale (PLC-uri, senzori, HMI-uri, invertoare).

EMAIL PRIMIT:
De la: ${from || "client"}
Subiect: ${subject || "Fără subiect"}
Categorie: ${category || "general"}

Conținut:
${body}

${relatedProducts.length > 0 ? `
PRODUSE RELEVANTE DIN CATALOG:
${relatedProducts.map(p => `- ${p.name}: ${p.price} RON (stoc: ${p.stock || 0})`).join("\n")}
` : ""}

${customContext ? `CONTEXT ADIȚIONAL: ${customContext}` : ""}

Scrie un răspuns profesional, prietenos, în română.
- Adresează-te clientului cu respect
- Răspunde specific la întrebările din email
- Dacă sunt produse în stoc, menționează-le cu prețuri
- Dacă nu ai informații complete, sugerează contactarea telefonică
- Include call-to-action clar
- Semnează ca echipa ${companyInfo.name}

Returnează JSON:
{
  "subject": "Re: subiect original sau nou subiect",
  "greeting": "Salutul",
  "body": "Corpul răspunsului",
  "closing": "Încheierea și semnătura",
  "suggestedProducts": [{"name": "...", "price": 100}],
  "followUpDate": "când să urmărim dacă nu răspunde",
  "priority": "low/medium/high",
  "tone": "identificat din email: formal/casual/urgent"
}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 1500, temperature: 0.6 }
        })
      }
    );

    if (!response.ok) {
      return NextResponse.json({ error: "AI indisponibil" }, { status: 500 });
    }

    const data = await response.json();
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    let result;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      }
    } catch {
      result = {
        subject: `Re: ${subject}`,
        body: responseText,
        error: "Nu s-a putut structura răspunsul"
      };
    }

    // Compune emailul complet
    const fullEmail = `${result.greeting || "Bună ziua,"}\n\n${result.body}\n\n${result.closing || `Cu stimă,\nEchipa ${companyInfo.name}\n${companyInfo.email}\n${companyInfo.phone}`}`;

    return NextResponse.json({
      success: true,
      originalEmail: { from, subject, category },
      generatedReply: {
        ...result,
        fullEmail
      },
      relatedProducts,
      companyInfo
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
