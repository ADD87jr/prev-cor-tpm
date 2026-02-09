import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { adminAuthMiddleware } from "@/lib/auth-middleware";

const CHELTUIELI_FILE = path.join(process.cwd(), "data", "cheltuieli.json");
const PROIECTE_FILE = path.join(process.cwd(), "data", "proiecte.json");
const CATEGORII_FILE = path.join(process.cwd(), "data", "categorii.json");

function loadCheltuieli() {
  try {
    if (fs.existsSync(CHELTUIELI_FILE)) {
      return JSON.parse(fs.readFileSync(CHELTUIELI_FILE, "utf-8"));
    }
  } catch (err) {}
  return [];
}

function saveCheltuieli(data: any[]) {
  fs.writeFileSync(CHELTUIELI_FILE, JSON.stringify(data, null, 2), "utf-8");
}

function loadProiecte() {
  try {
    if (fs.existsSync(PROIECTE_FILE)) {
      return JSON.parse(fs.readFileSync(PROIECTE_FILE, "utf-8"));
    }
  } catch (err) {}
  return [{ id: 1, name: "Proiect General" }];
}

function saveProiecte(data: any[]) {
  fs.writeFileSync(PROIECTE_FILE, JSON.stringify(data, null, 2), "utf-8");
}

function loadCategorii() {
  try {
    if (fs.existsSync(CATEGORII_FILE)) {
      return JSON.parse(fs.readFileSync(CATEGORII_FILE, "utf-8"));
    }
  } catch (err) {}
  return [{ id: 1, name: "Diverse" }];
}

function saveCategorii(data: any[]) {
  fs.writeFileSync(CATEGORII_FILE, JSON.stringify(data, null, 2), "utf-8");
}

export async function GET(req: NextRequest) {
  // Protejare autentificare
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  
  if (type === "proiecte") {
    return NextResponse.json(loadProiecte());
  }
  
  if (type === "categorii") {
    return NextResponse.json(loadCategorii());
  }
  
  return NextResponse.json(loadCheltuieli());
}

export async function POST(req: NextRequest) {
  // Protejare autentificare
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;

  const body = await req.json();
  const { action, type } = body;
  
  // Gestionare proiecte
  if (type === "proiecte") {
    const proiecte = loadProiecte();
    
    if (action === "add") {
      const maxId = proiecte.reduce((max: number, p: any) => Math.max(max, p.id || 0), 0);
      const newProiect = {
        id: maxId + 1,
        name: body.name,
      };
      proiecte.push(newProiect);
      saveProiecte(proiecte);
      return NextResponse.json({ success: true, data: proiecte });
    }
    
    if (action === "update") {
      const idx = proiecte.findIndex((p: any) => p.id === body.id);
      if (idx !== -1) {
        proiecte[idx].name = body.name;
        saveProiecte(proiecte);
      }
      return NextResponse.json({ success: true, data: proiecte });
    }
    
    if (action === "delete") {
      const filtered = proiecte.filter((p: any) => p.id !== body.id);
      saveProiecte(filtered);
      return NextResponse.json({ success: true, data: filtered });
    }
    
    return NextResponse.json({ error: "Acțiune invalidă" }, { status: 400 });
  }
  
  // Gestionare categorii
  if (type === "categorii") {
    const categorii = loadCategorii();
    
    if (action === "add") {
      const maxId = categorii.reduce((max: number, c: any) => Math.max(max, c.id || 0), 0);
      const newCategorie = {
        id: maxId + 1,
        name: body.name,
      };
      categorii.push(newCategorie);
      saveCategorii(categorii);
      return NextResponse.json({ success: true, data: categorii });
    }
    
    if (action === "update") {
      const idx = categorii.findIndex((c: any) => c.id === body.id);
      if (idx !== -1) {
        categorii[idx].name = body.name;
        saveCategorii(categorii);
      }
      return NextResponse.json({ success: true, data: categorii });
    }
    
    if (action === "delete") {
      const filtered = categorii.filter((c: any) => c.id !== body.id);
      saveCategorii(filtered);
      return NextResponse.json({ success: true, data: filtered });
    }
    
    return NextResponse.json({ error: "Acțiune invalidă" }, { status: 400 });
  }
  
  // Gestionare cheltuieli
  const cheltuieli = loadCheltuieli();
  
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
    saveCheltuieli(cheltuieli);
    return NextResponse.json({ success: true, cheltuieli });
  }
  
  if (action === "update") {
    const idx = cheltuieli.findIndex((c: any) => c.id === body.id);
    if (idx !== -1) {
      cheltuieli[idx] = { ...cheltuieli[idx], ...body };
      saveCheltuieli(cheltuieli);
    }
    return NextResponse.json({ success: true, cheltuieli });
  }
  
  if (action === "delete") {
    const filtered = cheltuieli.filter((c: any) => c.id !== body.id);
    saveCheltuieli(filtered);
    return NextResponse.json({ success: true, cheltuieli: filtered });
  }
  
  return NextResponse.json({ error: "Acțiune invalidă" }, { status: 400 });
}
