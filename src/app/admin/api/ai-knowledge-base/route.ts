import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyDPMtQTjaruCtql9qAFqcavAzKwXRdjsnA";

const KB_FILE = path.join(process.cwd(), "data", "knowledge-base.json");

interface KBArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  createdAt: string;
  source: string;
  views: number;
}

function loadKnowledgeBase(): KBArticle[] {
  try {
    if (fs.existsSync(KB_FILE)) {
      return JSON.parse(fs.readFileSync(KB_FILE, "utf-8"));
    }
  } catch (e) {}
  return [];
}

function saveKnowledgeBase(articles: KBArticle[]) {
  try {
    const dir = path.dirname(KB_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(KB_FILE, JSON.stringify(articles, null, 2));
  } catch (e) {}
}

// GET - Lista articole și statistici
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const search = searchParams.get("search");

    let articles = loadKnowledgeBase();

    // Filtrează
    if (category) {
      articles = articles.filter(a => a.category === category);
    }
    if (search) {
      const searchLower = search.toLowerCase();
      articles = articles.filter(a => 
        a.title.toLowerCase().includes(searchLower) ||
        a.content.toLowerCase().includes(searchLower) ||
        a.tags.some(t => t.toLowerCase().includes(searchLower))
      );
    }

    // Statistici
    const allArticles = loadKnowledgeBase();
    const categories = [...new Set(allArticles.map(a => a.category))];
    const tags = [...new Set(allArticles.flatMap(a => a.tags))];

    return NextResponse.json({
      stats: {
        totalArticles: allArticles.length,
        totalCategories: categories.length,
        totalViews: allArticles.reduce((sum, a) => sum + (a.views || 0), 0),
        byCategory: categories.map(c => ({
          category: c,
          count: allArticles.filter(a => a.category === c).length
        }))
      },
      categories,
      tags: tags.slice(0, 50),
      articles: articles.sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 50)
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Generare articole AI din diverse surse
export async function POST(req: NextRequest) {
  try {
    const { action, data } = await req.json();

    switch (action) {
      case "generate_faq": {
        // Generează FAQ din descrieri produse
        const products = await prisma.product.findMany({
          take: 30,
          select: {
            name: true,
            type: true,
            description: true,
            specs: true,
            manufacturer: true
          }
        });

        const prompt = `Bazat pe aceste produse de automatizări industriale, generează 10 întrebări frecvente (FAQ) cu răspunsuri detaliate.

PRODUSE:
${JSON.stringify(products.slice(0, 15), null, 2)}

Generează FAQ-uri utile pentru clienți B2B despre:
- Compatibilitate
- Instalare și configurare
- Specificații tehnice
- Alegere între alternative
- Probleme comune

Returnează JSON:
{
  "faqs": [
    {
      "question": "întrebarea",
      "answer": "răspuns detaliat",
      "category": "Compatibilitate" | "Instalare" | "Specificații" | "Alegere" | "Troubleshooting",
      "tags": ["tag1", "tag2"],
      "relatedProducts": ["nume produs relevant"]
    }
  ]
}`;

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.7, maxOutputTokens: 3000 }
            })
          }
        );

        const aiData = await response.json();
        const text = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "";

        let result;
        try {
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          result = jsonMatch ? JSON.parse(jsonMatch[0]) : { faqs: [] };
        } catch {
          result = { faqs: [] };
        }

        // Salvează în knowledge base
        const articles = loadKnowledgeBase();
        const newArticles: KBArticle[] = (result.faqs || []).map((faq: any, i: number) => ({
          id: `faq-${Date.now()}-${i}`,
          title: faq.question,
          content: faq.answer,
          category: faq.category || "General",
          tags: faq.tags || [],
          createdAt: new Date().toISOString(),
          source: "AI Generated FAQ",
          views: 0
        }));

        articles.push(...newArticles);
        saveKnowledgeBase(articles);

        return NextResponse.json({
          message: `${newArticles.length} FAQ-uri generate și salvate`,
          articles: newArticles
        });
      }

      case "generate_guide": {
        // Generează ghid pentru un tip de produs
        const { productType } = data;

        const prompt = `Creează un ghid tehnic complet pentru produse de tip "${productType}" în automatizări industriale.

Ghidul trebuie să includă:
1. Introducere și tipuri de ${productType}
2. Criterii de selecție
3. Instalare și configurare
4. Probleme comune și soluții
5. Întreținere și mentenanță
6. Recomandări de achiziție

Returnează JSON:
{
  "title": "titlu ghid",
  "sections": [
    {
      "heading": "titlu secțiune",
      "content": "conținut detaliat",
      "tips": ["sfaturi practice"]
    }
  ],
  "category": "Ghiduri Tehnice",
  "tags": ["tag1", "tag2", "tag3"],
  "summary": "rezumat scurt"
}`;

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.6, maxOutputTokens: 4000 }
            })
          }
        );

        const aiData = await response.json();
        const text = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "";

        let result;
        try {
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          result = jsonMatch ? JSON.parse(jsonMatch[0]) : { title: "", sections: [] };
        } catch {
          result = { title: "", sections: [] };
        }

        // Formatează conținutul
        const fullContent = (result.sections || [])
          .map((s: any) => `## ${s.heading}\n\n${s.content}\n\n${s.tips ? "**Sfaturi:** " + s.tips.join(", ") : ""}`)
          .join("\n\n");

        const article: KBArticle = {
          id: `guide-${Date.now()}`,
          title: result.title || `Ghid ${productType}`,
          content: fullContent,
          category: "Ghiduri Tehnice",
          tags: result.tags || [productType],
          createdAt: new Date().toISOString(),
          source: "AI Generated Guide",
          views: 0
        };

        const articles = loadKnowledgeBase();
        articles.push(article);
        saveKnowledgeBase(articles);

        return NextResponse.json({
          message: "Ghid generat și salvat",
          article
        });
      }

      case "generate_from_reviews": {
        // Generează articole din patterns în reviews
        const reviews = await prisma.review.findMany({
          take: 100,
          select: {
            text: true,
            rating: true,
            userName: true
          }
        });

        const prompt = `Analizează aceste review-uri de clienți și extrage informații utile pentru Knowledge Base.

REVIEWS:
${JSON.stringify(reviews.slice(0, 30), null, 2)}

Identifică:
- Probleme comune menționate
- Soluții găsite de clienți
- Întrebări frecvente implicite
- Sfaturi de utilizare

Returnează JSON:
{
  "insights": [
    {
      "title": "titlu articol",
      "content": "conținut bazat pe review-uri",
      "category": "Experiență Clienți" | "Troubleshooting" | "Tips & Tricks",
      "tags": ["tag1", "tag2"],
      "basedOn": "ce review-uri au inspirat articolul"
    }
  ]
}`;

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.7, maxOutputTokens: 3000 }
            })
          }
        );

        const aiData = await response.json();
        const text = aiData.candidates?.[0]?.content?.parts?.[0]?.text || "";

        let result;
        try {
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          result = jsonMatch ? JSON.parse(jsonMatch[0]) : { insights: [] };
        } catch {
          result = { insights: [] };
        }

        const articles = loadKnowledgeBase();
        const newArticles: KBArticle[] = (result.insights || []).map((insight: any, i: number) => ({
          id: `review-${Date.now()}-${i}`,
          title: insight.title,
          content: insight.content,
          category: insight.category || "Experiență Clienți",
          tags: insight.tags || [],
          createdAt: new Date().toISOString(),
          source: "Generated from Reviews",
          views: 0
        }));

        articles.push(...newArticles);
        saveKnowledgeBase(articles);

        return NextResponse.json({
          message: `${newArticles.length} articole generate din review-uri`,
          articles: newArticles
        });
      }

      default:
        return NextResponse.json({ error: "Acțiune necunoscută" }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
