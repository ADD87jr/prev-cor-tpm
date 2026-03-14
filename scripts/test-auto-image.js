// Test: approve 1 product and verify image is auto-downloaded
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function test() {
  // Delete test product if exists
  await prisma.product.deleteMany({ where: { name: { startsWith: "TEST -" } } });

  // Simulate what the API does: create product + fetch image
  const p = {
    name: "TEST - Senzor ultrasonic M30 400mm",
    nameEn: "Ultrasonic Sensor M30 400mm",
    type: "Senzori ultrasonici",
    domain: "Automatizari industriale",
    description: "Senzor ultrasonic M30, distanță 400mm",
    estimatedPrice: 200,
    estimatedPurchasePrice: 100,
    brand: "Autonics",
  };

  const product = await prisma.product.create({
    data: {
      name: p.name,
      nameEn: p.nameEn,
      price: p.estimatedPrice,
      purchasePrice: p.estimatedPurchasePrice,
      description: p.description,
      image: "/products/default.jpg", // temporary
      type: p.type,
      domain: p.domain,
      brand: p.brand,
      manufacturer: p.brand,
      stock: 0,
      onDemand: true,
    },
  });

  console.log(`Created product id=${product.id}`);

  // Now test image fetching (same logic as in the API)
  const https = require("https");
  const fs = require("fs");
  const path = require("path");

  function httpsGetJson(url) {
    return new Promise((resolve, reject) => {
      https.get(url, { headers: { "User-Agent": "PREV-COR-TPM-Catalog/1.0" }, timeout: 10000 }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          httpsGetJson(res.headers.location).then(resolve).catch(reject);
          return;
        }
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => { try { resolve(JSON.parse(data)); } catch { reject(new Error("Invalid JSON")); } });
      }).on("error", reject);
    });
  }

  function downloadBinary(url, dest) {
    return new Promise((resolve, reject) => {
      const doDownload = (downloadUrl, redirects) => {
        if (redirects > 5) { reject(new Error("Too many redirects")); return; }
        https.get(downloadUrl, { headers: { "User-Agent": "PREV-COR-TPM-Catalog/1.0" }, timeout: 15000 }, (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            doDownload(res.headers.location, redirects + 1);
            return;
          }
          if (res.statusCode !== 200) { reject(new Error(`HTTP ${res.statusCode}`)); return; }
          const file = fs.createWriteStream(dest);
          res.pipe(file);
          file.on("finish", () => { file.close(); resolve(); });
        }).on("error", reject);
      };
      doDownload(url, 0);
    });
  }

  const searchTerms = [p.nameEn, p.type, `${p.type} industrial`];
  let imageFound = false;

  for (const query of searchTerms) {
    console.log(`Searching: "${query}"...`);
    try {
      const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srnamespace=6&srlimit=8&format=json`;
      const searchData = await httpsGetJson(searchUrl);
      if (!searchData.query?.search?.length) { console.log("  No results"); continue; }

      for (const item of searchData.query.search) {
        const title = item.title;
        if (!title.match(/\.(jpg|jpeg|png)$/i)) continue;
        if (/mouse|smoke|elevator|streetlight|keyboard|desktop|laptop|phone/i.test(title)) continue;

        console.log(`  Trying: ${title}`);
        const infoUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=imageinfo&iiprop=url|size&iiurlwidth=400&format=json`;
        const infoData = await httpsGetJson(infoUrl);
        const pages = infoData.query?.pages;
        if (!pages) continue;
        const page = Object.values(pages)[0];
        const ii = page?.imageinfo?.[0];
        if (!ii?.thumburl || ii.width < 80) continue;

        const ext = path.extname(title.replace(/\s/g, "_")).toLowerCase() || ".jpg";
        const fileName = `product-${product.id}-real${ext}`;
        const filePath = path.join(process.cwd(), "public", "products", fileName);

        await downloadBinary(ii.thumburl, filePath);
        const stats = fs.statSync(filePath);
        if (stats.size < 1000) { fs.unlinkSync(filePath); continue; }

        const imageUrl = `/products/${fileName}`;
        await prisma.product.update({ where: { id: product.id }, data: { image: imageUrl } });
        console.log(`  SUCCESS! -> ${imageUrl} (${Math.round(stats.size / 1024)}KB)`);
        imageFound = true;
        break;
      }
      if (imageFound) break;
    } catch (err) {
      console.log(`  Error: ${err.message}`);
    }
  }

  if (!imageFound) console.log("No image found, keeping fallback");

  // Show final state
  const final = await prisma.product.findUnique({ where: { id: product.id }, select: { id: true, name: true, image: true } });
  console.log(`\nFinal: id=${final.id} | image=${final.image} | ${final.name}`);

  // Cleanup test product
  await prisma.product.delete({ where: { id: product.id } });
  console.log("Test product deleted.");

  await prisma.$disconnect();
}

test().catch((e) => { console.error(e); process.exit(1); });
