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
  domainId?: number; // Pentru legarea tipurilor la domenii
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
    domainId: 1, // Automatizari industriale
    subcategories: [
      { id: 1, name: "Senzor inductiv" },
      { id: 2, name: "Senzor optic" },
      { id: 3, name: "Senzor capacitiv" },
      { id: 4, name: "Senzor de presiune" }
    ]
  },
  { id: 2, name: "Electric", domainId: 1, subcategories: [] },
  { id: 3, name: "Actuatoare", domainId: 2, subcategories: [] }, // Industrial
  { id: 4, name: "Altele", domainId: undefined, subcategories: [] }
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
  
  // Update main category - WITH PRODUCT SYNC
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
    
    const oldName = data[idx].name;
    const newName = name.trim();
    
    // Sync products if name changed
    let productsUpdated = 0;
    if (oldName !== newName) {
      const field = category === "domains" ? "domain" : category === "types" ? "type" : "manufacturer";
      const result = await prisma.product.updateMany({
        where: { [field]: oldName },
        data: { [field]: newName }
      });
      productsUpdated = result.count;
    }
    
    data[idx].name = newName;
    await saveData(key, data);
    return NextResponse.json({ success: true, data, productsUpdated, message: productsUpdated > 0 ? `${productsUpdated} produse actualizate` : undefined });
  }
  
  // Delete main category - WITH PRODUCT SYNC
  if (action === "delete") {
    const itemToDelete = data.find((item: CategoryWithSubs) => item.id === id);
    if (!itemToDelete) {
      return NextResponse.json({ error: "Elementul nu a fost găsit" }, { status: 404 });
    }
    
    // Check how many products use this category
    const field = category === "domains" ? "domain" : category === "types" ? "type" : "manufacturer";
    const productsCount = await prisma.product.count({
      where: { [field]: itemToDelete.name }
    });
    
    // Move products to "Altele" instead of leaving them orphaned
    let productsUpdated = 0;
    if (productsCount > 0) {
      const result = await prisma.product.updateMany({
        where: { [field]: itemToDelete.name },
        data: { [field]: "Altele" }
      });
      productsUpdated = result.count;
    }
    
    const filtered = data.filter((item: CategoryWithSubs) => item.id !== id);
    await saveData(key, filtered);
    return NextResponse.json({ 
      success: true, 
      data: filtered, 
      productsUpdated,
      message: productsUpdated > 0 ? `${productsUpdated} produse mutate la "Altele"` : undefined 
    });
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
    
    const oldSubName = parent.subcategories[subIdx].name;
    const newSubName = name.trim();
    
    // Sync products if subcategory name changed (for types, sync product.type)
    let productsUpdated = 0;
    if (oldSubName !== newSubName && category === "types") {
      const result = await prisma.product.updateMany({
        where: { type: oldSubName },
        data: { type: newSubName }
      });
      productsUpdated = result.count;
    }
    
    parent.subcategories[subIdx].name = newSubName;
    await saveData(key, data);
    return NextResponse.json({ success: true, data, productsUpdated, message: productsUpdated > 0 ? `${productsUpdated} produse actualizate` : undefined });
  }
  
  // Import from existing products
  if (action === "importFromProducts") {
    // Get all unique values from products
    const products = await prisma.product.findMany({
      select: { domain: true, type: true, manufacturer: true }
    });
    
    const uniqueDomains = Array.from(new Set(products.map(p => p.domain).filter(Boolean))) as string[];
    const uniqueTypes = Array.from(new Set(products.map(p => p.type).filter(Boolean))) as string[];
    const uniqueManufacturers = Array.from(new Set(products.map(p => p.manufacturer).filter(Boolean))) as string[];
    
    // Load current data
    const currentDomains = await loadData(DOMAINS_KEY, DEFAULT_DOMAINS);
    const currentTypes = await loadData(TYPES_KEY, DEFAULT_TYPES);
    const currentManufacturers = await loadData(MANUFACTURERS_KEY, DEFAULT_MANUFACTURERS);
    
    let addedDomains = 0, addedTypes = 0, addedManufacturers = 0;
    
    // Add missing domains
    for (const domain of uniqueDomains) {
      if (!currentDomains.some((d: CategoryWithSubs) => d.name.toLowerCase() === domain.toLowerCase())) {
        const maxId = currentDomains.reduce((max: number, item: CategoryWithSubs) => Math.max(max, item.id || 0), 0);
        currentDomains.push({ id: maxId + 1, name: domain, subcategories: [] });
        addedDomains++;
      }
    }
    
    // Add missing types
    for (const type of uniqueTypes) {
      if (!currentTypes.some((t: CategoryWithSubs) => t.name.toLowerCase() === type.toLowerCase())) {
        const maxId = currentTypes.reduce((max: number, item: CategoryWithSubs) => Math.max(max, item.id || 0), 0);
        currentTypes.push({ id: maxId + 1, name: type, subcategories: [] });
        addedTypes++;
      }
    }
    
    // Add missing manufacturers
    for (const mfr of uniqueManufacturers) {
      if (!currentManufacturers.some((m: CategoryWithSubs) => m.name.toLowerCase() === mfr.toLowerCase())) {
        const maxId = currentManufacturers.reduce((max: number, item: CategoryWithSubs) => Math.max(max, item.id || 0), 0);
        currentManufacturers.push({ id: maxId + 1, name: mfr, subcategories: [] });
        addedManufacturers++;
      }
    }
    
    // Save all
    await saveData(DOMAINS_KEY, currentDomains);
    await saveData(TYPES_KEY, currentTypes);
    await saveData(MANUFACTURERS_KEY, currentManufacturers);
    
    return NextResponse.json({ 
      success: true, 
      domains: currentDomains, 
      types: currentTypes, 
      manufacturers: currentManufacturers,
      message: `Importate: ${addedDomains} domenii, ${addedTypes} tipuri, ${addedManufacturers} producători`
    });
  }
  
  // Delete subcategory - WITH PRODUCT SYNC
  if (action === "deleteSub") {
    const parentIdx = data.findIndex((item: CategoryWithSubs) => item.id === parentId);
    if (parentIdx === -1) {
      return NextResponse.json({ error: "Categoria părinte nu a fost găsită" }, { status: 404 });
    }
    const parent = data[parentIdx];
    if (!parent.subcategories) {
      return NextResponse.json({ error: "Nu există subcategorii" }, { status: 404 });
    }
    
    const subToDelete = parent.subcategories.find((sub: Subcategory) => sub.id === subId);
    if (!subToDelete) {
      return NextResponse.json({ error: "Subcategoria nu a fost găsită" }, { status: 404 });
    }
    
    // Sync products - move to parent category name or "Altele"
    let productsUpdated = 0;
    if (category === "types") {
      const result = await prisma.product.updateMany({
        where: { type: subToDelete.name },
        data: { type: parent.name }
      });
      productsUpdated = result.count;
    }
    
    parent.subcategories = parent.subcategories.filter((sub: Subcategory) => sub.id !== subId);
    await saveData(key, data);
    return NextResponse.json({ 
      success: true, 
      data, 
      productsUpdated,
      message: productsUpdated > 0 ? `${productsUpdated} produse mutate la "${parent.name}"` : undefined 
    });
  }
  
  // Set domain for a type (ierarhie domeniu -> tipuri)
  if (action === "setDomain") {
    if (category !== "types") {
      return NextResponse.json({ error: "Această acțiune este disponibilă doar pentru tipuri" }, { status: 400 });
    }
    const idx = data.findIndex((item: CategoryWithSubs) => item.id === id);
    if (idx === -1) {
      return NextResponse.json({ error: "Tipul nu a fost găsit" }, { status: 404 });
    }
    // domainId can be null/undefined to unassign
    data[idx].domainId = body.domainId || undefined;
    await saveData(key, data);
    return NextResponse.json({ success: true, data });
  }
  
  return NextResponse.json({ error: "Acțiune invalidă" }, { status: 400 });
}
