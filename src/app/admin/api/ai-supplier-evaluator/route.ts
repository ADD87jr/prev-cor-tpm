import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyDPMtQTjaruCtql9qAFqcavAzKwXRdjsnA";

const SUPPLIERS_FILE = path.join(process.cwd(), "data", "suppliers.json");

interface Supplier {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  products: string[];
  ratings: {
    quality: number;
    delivery: number;
    price: number;
    communication: number;
  };
  metrics: {
    totalOrders: number;
    onTimeDelivery: number;
    defectRate: number;
    avgDeliveryDays: number;
    lastOrderDate?: string;
  };
  notes: string;
  createdAt: string;
  updatedAt: string;
}

function loadSuppliers(): Supplier[] {
  try {
    if (fs.existsSync(SUPPLIERS_FILE)) {
      return JSON.parse(fs.readFileSync(SUPPLIERS_FILE, "utf-8"));
    }
  } catch (e) {}
  return [];
}

function saveSuppliers(suppliers: Supplier[]) {
  try {
    const dir = path.dirname(SUPPLIERS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(SUPPLIERS_FILE, JSON.stringify(suppliers, null, 2));
  } catch (e) {}
}

// GET - Lista și evaluare furnizori
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");

    let suppliers = loadSuppliers();

    // Dacă nu există furnizori, creează date demo
    if (suppliers.length === 0) {
      suppliers = [
        {
          id: "sup-1",
          name: "Siemens Romania",
          email: "orders@siemens.ro",
          phone: "+40 21 123 4567",
          products: ["PLC", "HMI", "Servo", "Senzori"],
          ratings: { quality: 4.8, delivery: 4.5, price: 3.5, communication: 4.2 },
          metrics: { totalOrders: 45, onTimeDelivery: 92, defectRate: 0.5, avgDeliveryDays: 5 },
          notes: "Furnizor premium, prețuri mari dar calitate excelentă",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: "sup-2",
          name: "Omron Distribution",
          email: "sales@omron.ro",
          phone: "+40 21 987 6543",
          products: ["Senzori", "Releee", "Contoare", "PLC"],
          ratings: { quality: 4.5, delivery: 4.8, price: 4.0, communication: 4.5 },
          metrics: { totalOrders: 62, onTimeDelivery: 98, defectRate: 0.8, avgDeliveryDays: 3 },
          notes: "Foarte rapid la livrare, stoc bun",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: "sup-3",
          name: "ABB Partner",
          email: "contact@abb-partner.ro",
          phone: "+40 31 456 7890",
          products: ["Invertoare", "Motoare", "Switchgear"],
          ratings: { quality: 4.7, delivery: 4.0, price: 3.8, communication: 4.0 },
          metrics: { totalOrders: 28, onTimeDelivery: 85, defectRate: 0.3, avgDeliveryDays: 7 },
          notes: "Bun pentru proiecte mari",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];
      saveSuppliers(suppliers);
    }

    // Calculează scorul total pentru fiecare furnizor
    const evaluatedSuppliers = suppliers.map(supplier => {
      const { quality, delivery, price, communication } = supplier.ratings;
      const { onTimeDelivery, defectRate } = supplier.metrics;

      // Scor total (ponderat)
      const ratingScore = (quality * 0.3 + delivery * 0.25 + price * 0.25 + communication * 0.2) * 20;
      const metricsScore = (onTimeDelivery * 0.5 + (100 - defectRate * 10) * 0.5);
      const totalScore = Math.round((ratingScore + metricsScore) / 2);

      let tier: "GOLD" | "SILVER" | "BRONZE" | "NEW" = "BRONZE";
      if (totalScore >= 90) tier = "GOLD";
      else if (totalScore >= 75) tier = "SILVER";
      else if (supplier.metrics.totalOrders < 5) tier = "NEW";

      return {
        ...supplier,
        totalScore,
        tier
      };
    });

    // Sortează după scor
    evaluatedSuppliers.sort((a, b) => b.totalScore - a.totalScore);

    // Filtrează dacă e cazul
    let filtered = evaluatedSuppliers;
    if (category) {
      filtered = evaluatedSuppliers.filter(s => 
        s.products.some(p => p.toLowerCase().includes(category.toLowerCase()))
      );
    }

    const stats = {
      totalSuppliers: suppliers.length,
      goldTier: evaluatedSuppliers.filter(s => s.tier === "GOLD").length,
      silverTier: evaluatedSuppliers.filter(s => s.tier === "SILVER").length,
      bronzeTier: evaluatedSuppliers.filter(s => s.tier === "BRONZE").length,
      avgOnTimeDelivery: Math.round(
        suppliers.reduce((sum, s) => sum + s.metrics.onTimeDelivery, 0) / suppliers.length
      ),
      totalOrders: suppliers.reduce((sum, s) => sum + s.metrics.totalOrders, 0)
    };

    return NextResponse.json({
      stats,
      suppliers: filtered
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Adaugă/actualizează furnizor sau generează evaluare AI
export async function POST(req: NextRequest) {
  try {
    const { action, supplier, supplierId } = await req.json();

    const suppliers = loadSuppliers();

    switch (action) {
      case "add": {
        const newSupplier: Supplier = {
          id: `sup-${Date.now()}`,
          name: supplier.name,
          email: supplier.email,
          phone: supplier.phone,
          products: supplier.products || [],
          ratings: supplier.ratings || { quality: 3, delivery: 3, price: 3, communication: 3 },
          metrics: supplier.metrics || { totalOrders: 0, onTimeDelivery: 0, defectRate: 0, avgDeliveryDays: 0 },
          notes: supplier.notes || "",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        suppliers.push(newSupplier);
        saveSuppliers(suppliers);
        return NextResponse.json({ message: "Furnizor adăugat", supplier: newSupplier });
      }

      case "update": {
        const index = suppliers.findIndex(s => s.id === supplierId);
        if (index === -1) {
          return NextResponse.json({ error: "Furnizor negăsit" }, { status: 404 });
        }
        suppliers[index] = {
          ...suppliers[index],
          ...supplier,
          updatedAt: new Date().toISOString()
        };
        saveSuppliers(suppliers);
        return NextResponse.json({ message: "Furnizor actualizat", supplier: suppliers[index] });
      }

      case "evaluate": {
        // Generează evaluare AI pentru un furnizor
        const targetSupplier = suppliers.find(s => s.id === supplierId);
        if (!targetSupplier) {
          return NextResponse.json({ error: "Furnizor negăsit" }, { status: 404 });
        }

        const prompt = `Evaluează acest furnizor de automatizări industriale și oferă recomandări.

FURNIZOR:
- Nume: ${targetSupplier.name}
- Produse: ${targetSupplier.products.join(", ")}
- Ratinguri:
  - Calitate: ${targetSupplier.ratings.quality}/5
  - Livrare: ${targetSupplier.ratings.delivery}/5
  - Preț: ${targetSupplier.ratings.price}/5
  - Comunicare: ${targetSupplier.ratings.communication}/5
- Metrici:
  - Total comenzi: ${targetSupplier.metrics.totalOrders}
  - Livrări la timp: ${targetSupplier.metrics.onTimeDelivery}%
  - Rată defecte: ${targetSupplier.metrics.defectRate}%
  - Timp mediu livrare: ${targetSupplier.metrics.avgDeliveryDays} zile
- Note: ${targetSupplier.notes}

Returnează JSON:
{
  "overallAssessment": "evaluare generală",
  "strengths": ["puncte forte"],
  "weaknesses": ["puncte slabe"],
  "recommendations": [
    {
      "area": "zonă de îmbunătățire",
      "suggestion": "sugestie concretă",
      "priority": "HIGH" | "MEDIUM" | "LOW"
    }
  ],
  "riskLevel": "LOW" | "MEDIUM" | "HIGH",
  "riskFactors": ["factori de risc"],
  "negotiationTips": ["sfaturi pentru negociere"],
  "alternativeSuppliers": ["tipuri de furnizori alternativi de căutat"],
  "contractRecommendations": {
    "suggestedTerms": "termeni contract sugerați",
    "paymentTerms": "termeni plată recomandați",
    "warrantyRequirements": "cerințe garanție"
  }
}`;

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.5, maxOutputTokens: 2000 }
            })
          }
        );

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

        let evaluation;
        try {
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          evaluation = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: text };
        } catch {
          evaluation = { raw: text };
        }

        return NextResponse.json({ supplier: targetSupplier, evaluation });
      }

      default:
        return NextResponse.json({ error: "Acțiune necunoscută" }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
