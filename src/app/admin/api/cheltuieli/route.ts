import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminAuthMiddleware } from "@/lib/auth-middleware";

const CHELTUIELI_KEY = "cheltuieli_data";
const PROIECTE_KEY = "proiecte_data";
const CATEGORII_KEY = "categorii_data";

async function loadData(key: string, defaultValue: any[] = []) {
  try {
    const setting = await prisma.siteSettings.findUnique({ where: { key } });
    if (setting?.value) {
      return JSON.parse(setting.value);
    }
  } catch (error) {
    console.error(`Error loading ${key}:`, error);
  }
  return defaultValue;
}

async function saveData(key: string, data: any[]) {
  await prisma.siteSettings.upsert({
    where: { key },
    update: { value: JSON.stringify(data), updatedAt: new Date() },
    create: { key, value: JSON.stringify(data) }
  });
}

async function loadCheltuieli() {
  return loadData(CHELTUIELI_KEY, []);
}

async function saveCheltuieli(data: any[]) {
  await saveData(CHELTUIELI_KEY, data);
}

async function loadProiecte() {
  return loadData(PROIECTE_KEY, [{ id: 1, name: "Proiect General" }]);
}

async function saveProiecte(data: any[]) {
  await saveData(PROIECTE_KEY, data);
}

async function loadCategorii() {
  return loadData(CATEGORII_KEY, [{ id: 1, name: "Diverse" }]);
}

async function saveCategorii(data: any[]) {
  await saveData(CATEGORII_KEY, data);
}

export async function GET(req: NextRequest) {
  // Protejare autentificare
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  
  if (type === "proiecte") {
    return NextResponse.json(await loadProiecte());
  }
  
  if (type === "categorii") {
    return NextResponse.json(await loadCategorii());
  }
  
  return NextResponse.json(await loadCheltuieli());
}

export async function POST(req: NextRequest) {
  // Protejare autentificare
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;

  const body = await req.json();
  const { action, type } = body;
  
  // Gestionare proiecte
  if (type === "proiecte") {
    const proiecte = await loadProiecte();
    
    if (action === "add") {
      const maxId = proiecte.reduce((max: number, p: any) => Math.max(max, p.id || 0), 0);
      const newProiect = {
        id: maxId + 1,
        name: body.name,
      };
      proiecte.push(newProiect);
      await saveProiecte(proiecte);
      return NextResponse.json({ success: true, data: proiecte });
    }
    
    if (action === "update") {
      const idx = proiecte.findIndex((p: any) => p.id === body.id);
      if (idx !== -1) {
        proiecte[idx].name = body.name;
        await saveProiecte(proiecte);
      }
      return NextResponse.json({ success: true, data: proiecte });
    }
    
    if (action === "delete") {
      const filtered = proiecte.filter((p: any) => p.id !== body.id);
      await saveProiecte(filtered);
      return NextResponse.json({ success: true, data: filtered });
    }
    
    return NextResponse.json({ error: "Acțiune invalidă" }, { status: 400 });
  }
  
  // Gestionare categorii
  if (type === "categorii") {
    const categorii = await loadCategorii();
    
    if (action === "add") {
      const maxId = categorii.reduce((max: number, c: any) => Math.max(max, c.id || 0), 0);
      const newCategorie = {
        id: maxId + 1,
        name: body.name,
      };
      categorii.push(newCategorie);
      await saveCategorii(categorii);
      return NextResponse.json({ success: true, data: categorii });
    }
    
    if (action === "update") {
      const idx = categorii.findIndex((c: any) => c.id === body.id);
      if (idx !== -1) {
        categorii[idx].name = body.name;
        await saveCategorii(categorii);
      }
      return NextResponse.json({ success: true, data: categorii });
    }
    
    if (action === "delete") {
      const filtered = categorii.filter((c: any) => c.id !== body.id);
      await saveCategorii(filtered);
      return NextResponse.json({ success: true, data: filtered });
    }
    
    return NextResponse.json({ error: "Acțiune invalidă" }, { status: 400 });
  }
  
  // Gestionare cheltuieli
  const cheltuieli = await loadCheltuieli();
  
  if (action === "add") {
    const maxId = cheltuieli.reduce((max: number, c: any) => Math.max(max, c.id || 0), 0);
    const newCheltuiala = {
      id: maxId + 1,
      furnizor: body.furnizor,
      data: body.data,
      suma: body.suma,
      tip: body.tip,
      proiect: body.proiect || "Proiect General",
    };
    cheltuieli.push(newCheltuiala);
    await saveCheltuieli(cheltuieli);
    return NextResponse.json({ success: true, cheltuieli });
  }
  
  if (action === "update") {
    const idx = cheltuieli.findIndex((c: any) => c.id === body.id);
    if (idx !== -1) {
      cheltuieli[idx] = { ...cheltuieli[idx], ...body };
      await saveCheltuieli(cheltuieli);
    }
    return NextResponse.json({ success: true, cheltuieli });
  }
  
  if (action === "delete") {
    const filtered = cheltuieli.filter((c: any) => c.id !== body.id);
    await saveCheltuieli(filtered);
    return NextResponse.json({ success: true, cheltuieli: filtered });
  }
  
  return NextResponse.json({ error: "Acțiune invalidă" }, { status: 400 });
}
