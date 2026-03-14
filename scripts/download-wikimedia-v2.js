const https = require("https");
const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Wikimedia Commons file names known to exist and be relevant
const knownImages = {
  3:  [ "Inductive sensor", "inductive sensor proximity", "proximity sensor cylindrical" ],
  4:  [ "Photoelectric sensor", "SICK WL12G-3B2531 Photoelectric reflex switch", "optical sensor industrial" ],
  5:  [ "Capacitiv Proximity Switch", "capacitive sensor" ], // already found
  6:  [ "24V DC power supply din mount", "DIN rail power supply" ], // already found
  7:  [ "switching power supply", "mean well power supply" ],
  8:  [ "relay electromagnetic", "industrial relay", "Slim Relequick relays" ],
  9:  [ "relay socket", "DIN rail relay" ],
  10: [ "contactor", "magnetic contactor", "AC contactor" ],
  11: [ "M12 connector", "circular connector", "sensor connector" ],
  12: [ "sensor cable", "M12 cable", "industrial cable connector" ],
  13: [ "push button switch green", "industrial push button", "pushbutton" ],
  14: [ "indicator light LED panel", "pilot light indicator", "signal lamp" ],
  15: [ "emergency stop button", "emergency push button", "Not-Aus" ],
};

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; ProductCatalog/1.0)" }, timeout: 15000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        httpsGet(res.headers.location).then(resolve).catch(reject);
        return;
      }
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve({ statusCode: res.statusCode, data }));
    });
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("timeout")); });
  });
}

function downloadBinary(url, dest) {
  return new Promise((resolve, reject) => {
    const doDownload = (downloadUrl, redirectCount) => {
      if (redirectCount > 5) { reject(new Error("Too many redirects")); return; }
      https.get(downloadUrl, { headers: { "User-Agent": "Mozilla/5.0 (compatible; ProductCatalog/1.0)" }, timeout: 20000 }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          doDownload(res.headers.location, redirectCount + 1);
          return;
        }
        if (res.statusCode !== 200) { reject(new Error(`HTTP ${res.statusCode}`)); return; }
        const file = fs.createWriteStream(dest);
        res.pipe(file);
        file.on("finish", () => { file.close(); resolve(); });
        file.on("error", (err) => { fs.unlinkSync(dest); reject(err); });
      }).on("error", reject);
    };
    doDownload(url, 0);
  });
}

async function searchAndDownload(searchTerms) {
  for (const query of searchTerms) {
    try {
      const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srnamespace=6&srlimit=10&format=json`;
      const result = await httpsGet(searchUrl);
      if (result.statusCode === 429) { await sleep(5000); continue; }
      const data = JSON.parse(result.data);
      if (!data.query?.search?.length) continue;

      for (const item of data.query.search) {
        const title = item.title;
        if (!title.match(/\.(jpg|jpeg|png)$/i)) continue;
        // Skip very generic/non-product images
        if (title.includes("Mouse") || title.includes("smoke") || title.includes("Elevator") || title.includes("streetlight")) continue;

        await sleep(500); // Rate limit
        const infoUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=imageinfo&iiprop=url|size&iiurlwidth=400&format=json`;
        const infoResult = await httpsGet(infoUrl);
        if (infoResult.statusCode === 429) { await sleep(5000); continue; }
        const infoData = JSON.parse(infoResult.data);
        const pages = infoData.query?.pages;
        if (!pages) continue;
        const page = Object.values(pages)[0];
        const ii = page?.imageinfo?.[0];
        if (ii?.thumburl && ii.width > 100) {
          return { url: ii.thumburl, title };
        }
      }
    } catch (e) {
      console.log(`    Search error for "${query}": ${e.message}`);
    }
    await sleep(1000);
  }
  return null;
}

async function main() {
  const outDir = path.join(process.cwd(), "public", "products");
  let success = 0;
  let failed = 0;

  // Check which products already have real images
  const products = await prisma.product.findMany({ select: { id: true, name: true, image: true } });
  const needsImage = {};
  for (const p of products) {
    if (p.id === 2) continue; // Skip manually uploaded
    if (p.image && p.image.includes("-real.")) continue; // Already has real image
    if (knownImages[p.id]) needsImage[p.id] = p;
  }

  console.log(`Products needing images: ${Object.keys(needsImage).join(", ")}\n`);

  for (const [id, product] of Object.entries(needsImage)) {
    const terms = knownImages[id];
    if (!terms) continue;

    console.log(`[${id}] "${product.name}" - searching...`);
    const image = await searchAndDownload(terms);

    if (!image) {
      console.log(`  No suitable image found`);
      failed++;
      continue;
    }

    console.log(`  Found: ${image.title}`);
    const ext = path.extname(image.title.replace(/\s/g, "_")).toLowerCase() || ".jpg";
    const fileName = `product-${id}-real${ext}`;
    const filePath = path.join(outDir, fileName);

    try {
      await sleep(1000); // Be respectful
      await downloadBinary(image.url, filePath);
      const stats = fs.statSync(filePath);
      if (stats.size < 1000) {
        console.log(`  Too small (${stats.size}B)`);
        fs.unlinkSync(filePath);
        failed++;
        continue;
      }
      const imageUrl = `/products/${fileName}`;
      await prisma.product.update({ where: { id: parseInt(id) }, data: { image: imageUrl } });
      console.log(`  OK -> ${imageUrl} (${Math.round(stats.size / 1024)}KB)`);
      success++;
    } catch (err) {
      console.log(`  Download error: ${err.message}`);
      failed++;
    }

    await sleep(2000); // Rate limit between products
  }

  console.log(`\n=== Done! Success: ${success}, Failed: ${failed} ===`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
