import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const GEMINI_API_KEY = "AIzaSyDPMtQTjaruCtql9qAFqcavAzKwXRdjsnA";

// Factori de emisii CO2 (kg CO2 per km per tip transport)
const emissionFactors = {
  TRUCK: 0.089, // kg CO2/km/kg produs
  VAN: 0.120,
  CAR: 0.171,
  TRAIN: 0.028,
  AIR: 0.500
};

// Distanțe medii pe județe (km de la București)
const countyDistances: Record<string, number> = {
  "București": 0, "Ilfov": 20, "Giurgiu": 65, "Dâmbovița": 80, "Prahova": 60,
  "Argeș": 120, "Teleorman": 130, "Călărași": 110, "Ialomița": 90, "Buzău": 120,
  "Brăila": 180, "Galați": 230, "Vrancea": 200, "Constanța": 225, "Tulcea": 290,
  "Cluj": 450, "Timiș": 560, "Bihor": 580, "Sibiu": 290, "Brașov": 170,
  "Mureș": 320, "Alba": 370, "Hunedoara": 410, "Caraș-Severin": 480, "Arad": 550
};

export async function GET() {
  try {
    const orders = await prisma.order.findMany({
      select: {
        id: true,
        number: true,
        clientData: true,
        items: true,
        total: true,
        date: true
      },
      where: {
        date: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }
      }
    });

    // Calculăm amprenta de carbon pentru fiecare comandă
    const orderFootprints = orders.map(order => {
      const clientData = order.clientData as any;
      const address = clientData?.address || clientData?.adresa || "";
      const items = (order.items as any[]) || [];
      
      // Estimăm distanța
      let distance = 100; // default
      Object.entries(countyDistances).forEach(([county, dist]) => {
        if (address.toLowerCase().includes(county.toLowerCase())) {
          distance = dist;
        }
      });

      // Estimăm greutatea (simplificat: 0.5-5kg per produs industrial)
      const estimatedWeight = items.reduce((sum, item) => {
        const qty = item.quantity || 1;
        const unitWeight = 2; // kg mediu per produs
        return sum + (qty * unitWeight);
      }, 0);

      // Calculăm emisiile (presupunem transport cu camion)
      const transportEmissions = distance * estimatedWeight * emissionFactors.TRUCK / 1000;
      
      // Ambalaj (estimare: 0.1 kg CO2 per kg produs)
      const packagingEmissions = estimatedWeight * 0.1;
      
      const totalEmissions = transportEmissions + packagingEmissions;

      return {
        orderId: order.id,
        orderNumber: order.number,
        date: order.date,
        client: clientData?.company || clientData?.firma || clientData?.name || "N/A",
        destination: address.slice(0, 50),
        distance,
        estimatedWeight,
        emissions: {
          transport: Math.round(transportEmissions * 100) / 100,
          packaging: Math.round(packagingEmissions * 100) / 100,
          total: Math.round(totalEmissions * 100) / 100
        }
      };
    });

    // Agregări
    const totalEmissions = orderFootprints.reduce((sum, o) => sum + o.emissions.total, 0);
    const avgEmissionsPerOrder = totalEmissions / orderFootprints.length;
    
    // Emisii per categorie destinație
    const emissionsByRegion = new Map<string, number>();
    orderFootprints.forEach(o => {
      const region = o.distance < 100 ? "Local" : o.distance < 300 ? "Regional" : "Național";
      emissionsByRegion.set(region, (emissionsByRegion.get(region) || 0) + o.emissions.total);
    });

    // Top 10 começi cu cele mai mari emisii
    const highestEmitters = [...orderFootprints].sort((a, b) => b.emissions.total - a.emissions.total).slice(0, 10);

    // Obiective de reducere
    const reductionTargets = {
      current: Math.round(totalEmissions),
      target10: Math.round(totalEmissions * 0.9),
      target20: Math.round(totalEmissions * 0.8),
      potentialSavings: Math.round(totalEmissions * 0.15) // 15% potențial de reducere
    };

    const stats = {
      totalEmissionsKg: Math.round(totalEmissions),
      totalOrders: orderFootprints.length,
      avgEmissionsPerOrder: Math.round(avgEmissionsPerOrder * 100) / 100,
      emissionsByRegion: Object.fromEntries(emissionsByRegion),
      equivalentTrees: Math.round(totalEmissions / 21), // Un copac absoarbe ~21kg CO2/an
      equivalentKmCar: Math.round(totalEmissions / 0.171) // km echivalent auto
    };

    return NextResponse.json({
      orders: orderFootprints.slice(0, 50),
      highestEmitters,
      reductionTargets,
      stats
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { stats, highestEmitters } = await req.json();

    const prompt = `Analizează amprenta de carbon a acestui business și generează recomandări de sustenabilitate:

STATISTICI CURENTE:
- Total emisii CO2: ${stats?.totalEmissionsKg} kg (ultimele 90 zile)
- Emisii medii per comandă: ${stats?.avgEmissionsPerOrder} kg CO2
- Total comenzi: ${stats?.totalOrders}
- Echivalent copaci necesari: ${stats?.equivalentTrees}

TOP COMENZI POLUANTE:
${(highestEmitters || []).slice(0, 5).map((o: any) => 
  `- ${o.client}: ${o.emissions.total} kg CO2 (${o.distance} km)`
).join("\n")}

Răspunde STRICT în JSON:
{
  "sustainabilityScore": {
    "current": 0,
    "industry": "BELOW_AVERAGE|AVERAGE|ABOVE_AVERAGE",
    "trend": "IMPROVING|STABLE|DECLINING"
  },
  "reductionStrategies": [
    { "strategy": "...", "potentialReduction": "...", "cost": "LOW|MEDIUM|HIGH", "timeline": "...", "priority": "HIGH|MEDIUM|LOW" }
  ],
  "quickWins": ["..."],
  "logisticsOptimization": {
    "consolidationOpportunities": ["..."],
    "routeOptimization": "...",
    "vehicleRecommendations": ["..."]
  },
  "packagingImprovements": ["..."],
  "supplierRecommendations": ["..."],
  "certifications": [
    { "name": "...", "benefit": "...", "effort": "..." }
  ],
  "customerCommunication": {
    "greenCredentials": ["..."],
    "marketingMessages": ["..."]
  },
  "offsetPrograms": [
    { "program": "...", "costPerTon": "...", "credibility": "..." }
  ]
}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 2500 }
        })
      }
    );

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    return NextResponse.json({ analysis });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
