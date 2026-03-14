const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

// Definim culori și iconuri per tip de produs
const productStyles = {
  "Senzori inductivi":     { bg: "#1e40af", accent: "#3b82f6", icon: "⚡", color: "#dbeafe" },
  "Senzori fotoelectrici": { bg: "#7c3aed", accent: "#a78bfa", icon: "📡", color: "#ede9fe" },
  "Senzori capacitivi":    { bg: "#0891b2", accent: "#22d3ee", icon: "🔍", color: "#cffafe" },
  "Alimentatoare":         { bg: "#b45309", accent: "#f59e0b", icon: "🔋", color: "#fef3c7" },
  "Relee":                 { bg: "#dc2626", accent: "#f87171", icon: "🔌", color: "#fee2e2" },
  "Accesorii relee":       { bg: "#e11d48", accent: "#fb7185", icon: "🔧", color: "#ffe4e6" },
  "Contactori":            { bg: "#9333ea", accent: "#c084fc", icon: "⚙️", color: "#f3e8ff" },
  "Conectori":             { bg: "#059669", accent: "#34d399", icon: "🔗", color: "#d1fae5" },
  "Cabluri":               { bg: "#0d9488", accent: "#2dd4bf", icon: "〰️", color: "#ccfbf1" },
  "Butoane":               { bg: "#16a34a", accent: "#4ade80", icon: "🟢", color: "#dcfce7" },
  "Indicatoare":           { bg: "#ca8a04", accent: "#facc15", icon: "💡", color: "#fef9c3" },
  "Butoane urgență":       { bg: "#b91c1c", accent: "#ef4444", icon: "🔴", color: "#fee2e2" },
};

const defaultStyle = { bg: "#475569", accent: "#94a3b8", icon: "📦", color: "#f1f5f9" };

function generateSVG(product) {
  const style = productStyles[product.type] || defaultStyle;
  
  // Truncate long names for display
  const name = product.name.length > 35 ? product.name.substring(0, 32) + "..." : product.name;
  const nameLine1 = name.length > 22 ? name.substring(0, 22) : name;
  const nameLine2 = name.length > 22 ? name.substring(22) : "";
  
  const brand = product.brand || product.manufacturer || "";
  const type = product.type || "Produs";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${style.bg};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${style.accent};stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="400" height="300" rx="16" fill="url(#grad)"/>
  <rect x="20" y="20" width="360" height="260" rx="12" fill="white" fill-opacity="0.12"/>
  <text x="200" y="110" font-family="Arial,sans-serif" font-size="64" fill="white" text-anchor="middle" dominant-baseline="middle">${style.icon}</text>
  <text x="200" y="175" font-family="Arial,sans-serif" font-size="17" fill="white" text-anchor="middle" font-weight="bold">${escapeXml(nameLine1)}</text>
  ${nameLine2 ? `<text x="200" y="198" font-family="Arial,sans-serif" font-size="17" fill="white" text-anchor="middle" font-weight="bold">${escapeXml(nameLine2)}</text>` : ""}
  <text x="200" y="${nameLine2 ? 228 : 210}" font-family="Arial,sans-serif" font-size="13" fill="${style.color}" text-anchor="middle">${escapeXml(type)}</text>
  ${brand ? `<text x="200" y="${nameLine2 ? 250 : 235}" font-family="Arial,sans-serif" font-size="12" fill="${style.color}" text-anchor="middle" font-style="italic">${escapeXml(brand)}</text>` : ""}
  <rect x="0" y="0" width="400" height="4" rx="2" fill="white" fill-opacity="0.4"/>
</svg>`;
}

function escapeXml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function slugify(name) {
  return name
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 60);
}

async function main() {
  const products = await p.product.findMany({
    select: { id: true, name: true, type: true, brand: true, manufacturer: true, image: true },
  });

  const outDir = path.join(process.cwd(), "public", "products");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  let updated = 0;
  for (const prod of products) {
    // Skip products that already have a real uploaded image (not a placeholder/category image)
    if (prod.image && prod.image.startsWith("/uploads/") && !prod.image.includes("default")) {
      console.log(`SKIP id=${prod.id} "${prod.name}" — has real image: ${prod.image}`);
      continue;
    }

    const slug = slugify(prod.name);
    const fileName = `product-${prod.id}-${slug}.svg`;
    const filePath = path.join(outDir, fileName);
    const svgContent = generateSVG(prod);

    fs.writeFileSync(filePath, svgContent, "utf-8");

    const imageUrl = `/products/${fileName}`;
    await p.product.update({ where: { id: prod.id }, data: { image: imageUrl } });
    console.log(`OK id=${prod.id} "${prod.name}" -> ${imageUrl}`);
    updated++;
  }

  console.log(`\nDONE! ${updated} products updated with unique SVG images.`);
  await p.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
