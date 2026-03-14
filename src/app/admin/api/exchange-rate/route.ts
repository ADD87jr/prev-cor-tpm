import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Obține cursul EUR de la BNR (XML feed)
async function fetchBNRRate(): Promise<{ rate: number; date: string } | null> {
  try {
    const response = await fetch("https://www.bnr.ro/nbrfxrates.xml", {
      next: { revalidate: 3600 }, // Cache 1 ora
    });
    
    if (!response.ok) {
      console.error("BNR fetch failed:", response.status);
      return null;
    }
    
    const xml = await response.text();
    
    // Parsare simplă XML pentru EUR
    const dateMatch = xml.match(/<Cube date="(\d{4}-\d{2}-\d{2})">/);
    const eurMatch = xml.match(/<Rate currency="EUR">([0-9.]+)<\/Rate>/);
    
    if (dateMatch && eurMatch) {
      return {
        rate: parseFloat(eurMatch[1]),
        date: dateMatch[1],
      };
    }
    
    return null;
  } catch (error) {
    console.error("Error fetching BNR rate:", error);
    return null;
  }
}

// GET - Obține cursul curent din DB sau de la BNR
export async function GET() {
  try {
    // Verifică dacă avem curs salvat
    const savedRate = await prisma.siteSettings.findUnique({
      where: { key: "eur_to_ron_rate" },
    });
    const savedDate = await prisma.siteSettings.findUnique({
      where: { key: "eur_to_ron_date" },
    });
    
    // Dacă avem curs de azi, îl returnăm
    const today = new Date().toISOString().split("T")[0];
    if (savedRate && savedDate && savedDate.value === today) {
      return NextResponse.json({
        rate: parseFloat(savedRate.value as string),
        date: savedDate.value,
        source: "cache",
      });
    }
    
    // Altfel, obținem de la BNR
    const bnrData = await fetchBNRRate();
    if (bnrData) {
      // Salvăm în DB
      await prisma.siteSettings.upsert({
        where: { key: "eur_to_ron_rate" },
        update: { value: bnrData.rate.toString() },
        create: { key: "eur_to_ron_rate", value: bnrData.rate.toString() },
      });
      await prisma.siteSettings.upsert({
        where: { key: "eur_to_ron_date" },
        update: { value: bnrData.date },
        create: { key: "eur_to_ron_date", value: bnrData.date },
      });
      
      return NextResponse.json({
        rate: bnrData.rate,
        date: bnrData.date,
        source: "bnr",
      });
    }
    
    // Fallback: returnăm cursul salvat sau default
    return NextResponse.json({
      rate: savedRate ? parseFloat(savedRate.value as string) : 4.97,
      date: savedDate?.value || "unknown",
      source: "fallback",
    });
  } catch (error) {
    console.error("Error getting exchange rate:", error);
    return NextResponse.json({ error: "Eroare la obtinerea cursului" }, { status: 500 });
  }
}

// POST - Forțează actualizarea cursului de la BNR
export async function POST() {
  try {
    const bnrData = await fetchBNRRate();
    
    if (!bnrData) {
      return NextResponse.json({ error: "Nu s-a putut obține cursul de la BNR" }, { status: 500 });
    }
    
    // Salvăm în DB
    await prisma.siteSettings.upsert({
      where: { key: "eur_to_ron_rate" },
      update: { value: bnrData.rate.toString() },
      create: { key: "eur_to_ron_rate", value: bnrData.rate.toString() },
    });
    await prisma.siteSettings.upsert({
      where: { key: "eur_to_ron_date" },
      update: { value: bnrData.date },
      create: { key: "eur_to_ron_date", value: bnrData.date },
    });
    
    return NextResponse.json({
      rate: bnrData.rate,
      date: bnrData.date,
      message: "Curs actualizat cu succes",
    });
  } catch (error) {
    console.error("Error updating exchange rate:", error);
    return NextResponse.json({ error: "Eroare la actualizarea cursului" }, { status: 500 });
  }
}
