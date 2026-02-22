import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminAuthMiddleware } from "@/lib/auth-middleware";

const DOMAINS_KEY = "product_domains";
const TYPES_KEY = "product_types";
const MANUFACTURERS_KEY = "product_manufacturers";

interface Subcategory {
  id: number;
  name: string;
}

interface CategoryWithSubs {
  id: number;
  name: string;
  subcategories?: Subcategory[];
}

// Default values
const DEFAULT_DOMAINS: CategoryWithSubs[] = [
  { id: 1, name: "Automatizari industriale" },
  { id: 2, name: "Industrial" },
  { id: 3, name: "Altele" }
];

const DEFAULT_TYPES: CategoryWithSubs[] = [
  { 
    id: 1, 
    name: "Senzori Industriali",
    subcategories: [
      { id: 1, name: "Senzor inductiv" },
      { id: 2, name: "Senzor optic" },
      { id: 3, name: "Senzor capacitiv" },
      { id: 4, name: "Senzor de presiune" }
    ]
  },
  { id: 2, name: "Electric", subcategories: [] },
  { id: 3, name: "Altele", subcategories: [] }
];

const DEFAULT_MANUFACTURERS: CategoryWithSubs[] = [];

async function loadData(key: string, defaultValue: any[]): Promise<any[]> {
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

export async function GET(req: NextRequest) {
  // Public endpoint - no auth required for reading categories
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  
  if (type === "domains") {
    return NextResponse.json(await loadData(DOMAINS_KEY, DEFAULT_DOMAINS));
  }
  
  if (type === "types") {
    return NextResponse.json(await loadData(TYPES_KEY, DEFAULT_TYPES));
  }
  
  if (type === "manufacturers") {
    return NextResponse.json(await loadData(MANUFACTURERS_KEY, DEFAULT_MANUFACTURERS));
  }
  
  // Return all
  const [domains, types, manufacturers] = await Promise.all([
    loadData(DOMAINS_KEY, DEFAULT_DOMAINS),
    loadData(TYPES_KEY, DEFAULT_TYPES),
    loadData(MANUFACTURERS_KEY, DEFAULT_MANUFACTURERS)
  ]);
  
  return NextResponse.json({ domains, types, manufacturers });
}

export async function POST(req: NextRequest) {
  // Require auth for modifications
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;

  const body = await req.json();
  const { action, category, id, name, parentId, subId } = body;
  
  // Determine which key to use
  let key = "";
  let defaultValue: CategoryWithSubs[] = [];
  
  switch (category) {
    case "domains":
      key = DOMAINS_KEY;
      defaultValue = DEFAULT_DOMAINS;
      break;
    case "types":
      key = TYPES_KEY;
      defaultValue = DEFAULT_TYPES;
      break;
    case "manufacturers":
      key = MANUFACTURERS_KEY;
      defaultValue = DEFAULT_MANUFACTURERS;
      break;
    default:
      return NextResponse.json({ error: "Categorie invalidă" }, { status: 400 });
  }
  
  const data = await loadData(key, defaultValue);
  
  // Add main category
  if (action === "add") {
    if (!name?.trim()) {
      return NextResponse.json({ error: "Numele este obligatoriu" }, { status: 400 });
    }
    // Check for duplicates
    if (data.some((item: CategoryWithSubs) => item.name.toLowerCase() === name.trim().toLowerCase())) {
      return NextResponse.json({ error: "Această categorie există deja" }, { status: 400 });
    }
    const maxId = data.reduce((max: number, item: CategoryWithSubs) => Math.max(max, item.id || 0), 0);
    data.push({ id: maxId + 1, name: name.trim(), subcategories: [] });
    await saveData(key, data);
    return NextResponse.json({ success: true, data });
  }
  
  // Update main category
  if (action === "update") {
    if (!name?.trim()) {
      return NextResponse.json({ error: "Numele este obligatoriu" }, { status: 400 });
    }
    const idx = data.findIndex((item: CategoryWithSubs) => item.id === id);
    if (idx === -1) {
      return NextResponse.json({ error: "Elementul nu a fost găsit" }, { status: 404 });
    }
    // Check for duplicates (excluding current item)
    if (data.some((item: CategoryWithSubs, i: number) => i !== idx && item.name.toLowerCase() === name.trim().toLowerCase())) {
      return NextResponse.json({ error: "Această categorie există deja" }, { status: 400 });
    }
    data[idx].name = name.trim();
    await saveData(key, data);
    return NextResponse.json({ success: true, data });
  }
  
  // Delete main category
  if (action === "delete") {
    const filtered = data.filter((item: CategoryWithSubs) => item.id !== id);
    await saveData(key, filtered);
    return NextResponse.json({ success: true, data: filtered });
  }
  
  // Add subcategory
  if (action === "addSub") {
    if (!name?.trim()) {
      return NextResponse.json({ error: "Numele este obligatoriu" }, { status: 400 });
    }
    const parentIdx = data.findIndex((item: CategoryWithSubs) => item.id === parentId);
    if (parentIdx === -1) {
      return NextResponse.json({ error: "Categoria părinte nu a fost găsită" }, { status: 404 });
    }
    const parent = data[parentIdx];
    if (!parent.subcategories) parent.subcategories = [];
    
    // Check for duplicates in subcategories
    if (parent.subcategories.some((sub: Subcategory) => sub.name.toLowerCase() === name.trim().toLowerCase())) {
      return NextResponse.json({ error: "Această subcategorie există deja" }, { status: 400 });
    }
    
    const maxSubId = parent.subcategories.reduce((max: number, sub: Subcategory) => Math.max(max, sub.id || 0), 0);
    parent.subcategories.push({ id: maxSubId + 1, name: name.trim() });
    await saveData(key, data);
    return NextResponse.json({ success: true, data });
  }
  
  // Update subcategory
  if (action === "updateSub") {
    if (!name?.trim()) {
      return NextResponse.json({ error: "Numele este obligatoriu" }, { status: 400 });
    }
    const parentIdx = data.findIndex((item: CategoryWithSubs) => item.id === parentId);
    if (parentIdx === -1) {
      return NextResponse.json({ error: "Categoria părinte nu a fost găsită" }, { status: 404 });
    }
    const parent = data[parentIdx];
    if (!parent.subcategories) {
      return NextResponse.json({ error: "Nu există subcategorii" }, { status: 404 });
    }
    const subIdx = parent.subcategories.findIndex((sub: Subcategory) => sub.id === subId);
    if (subIdx === -1) {
      return NextResponse.json({ error: "Subcategoria nu a fost găsită" }, { status: 404 });
    }
    // Check for duplicates (excluding current)
    if (parent.subcategories.some((sub: Subcategory, i: number) => i !== subIdx && sub.name.toLowerCase() === name.trim().toLowerCase())) {
      return NextResponse.json({ error: "Această subcategorie există deja" }, { status: 400 });
    }
    parent.subcategories[subIdx].name = name.trim();
    await saveData(key, data);
    return NextResponse.json({ success: true, data });
  }
  
  // Delete subcategory
  if (action === "deleteSub") {
    const parentIdx = data.findIndex((item: CategoryWithSubs) => item.id === parentId);
    if (parentIdx === -1) {
      return NextResponse.json({ error: "Categoria părinte nu a fost găsită" }, { status: 404 });
    }
    const parent = data[parentIdx];
    if (!parent.subcategories) {
      return NextResponse.json({ error: "Nu există subcategorii" }, { status: 404 });
    }
    parent.subcategories = parent.subcategories.filter((sub: Subcategory) => sub.id !== subId);
    await saveData(key, data);
    return NextResponse.json({ success: true, data });
  }
  
  return NextResponse.json({ error: "Acțiune invalidă" }, { status: 400 });
}
