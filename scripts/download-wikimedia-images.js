const https = require("https");
const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Mapare produs -> termen de căutare pe Wikimedia Commons
const productSearchTerms = {
  3:  "inductive proximity sensor M12",
  4:  "photoelectric sensor industrial",
  5:  "capacitive proximity sensor",
  6:  "DIN rail power supply",
  7:  "DIN rail power supply MEAN WELL",
  8:  "industrial relay finder",
  9:  "relay socket DIN rail",
  10: "contactor electrical",
  11: "M12 connector industrial",
  12: "M12 cable connector sensor",
  13: "industrial push button green",
  14: "LED indicator light panel",
  15: "emergency stop button mushroom",
};

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { "User-Agent": "ProductImageBot/1.0 (industrial catalog)" } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        httpsGet(res.headers.location).then(resolve).catch(reject);
        return;
      }
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve({ statusCode: res.statusCode, data, headers: res.headers }));
    }).on("error", reject);
  });
}

function downloadBinary(url, dest) {
  return new Promise((resolve, reject) => {
    const doDownload = (downloadUrl) => {
      https.get(downloadUrl, { headers: { "User-Agent": "ProductImageBot/1.0" } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          doDownload(res.headers.location);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        const file = fs.createWriteStream(dest);
        res.pipe(file);
        file.on("finish", () => { file.close(); resolve(); });
      }).on("error", reject);
    };
    doDownload(url);
  });
}

async function searchWikimediaImage(query) {
  const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srnamespace=6&srlimit=5&format=json`;
  const result = await httpsGet(searchUrl);
  const data = JSON.parse(result.data);
  
  if (!data.query?.search?.length) return null;
  
  // Filtrează doar imagini (nu SVG sau alte tipuri)
  for (const item of data.query.search) {
    const title = item.title;
    if (title.match(/\.(jpg|jpeg|png)$/i)) {
      // Obține URL-ul thumbnail-ului (400px)
      const infoUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=imageinfo&iiprop=url|size&iiurlwidth=400&format=json`;
      const infoResult = await httpsGet(infoUrl);
      const infoData = JSON.parse(infoResult.data);
      const pages = infoData.query?.pages;
      if (pages) {
        const page = Object.values(pages)[0];
        const imageInfo = page?.imageinfo?.[0];
        if (imageInfo?.thumburl) {
          return { url: imageInfo.thumburl, title };
        }
      }
    }
  }
  return null;
}

async function main() {
  const outDir = path.join(process.cwd(), "public", "products");
  let success = 0;
  let failed = 0;

  for (const [id, searchTerm] of Object.entries(productSearchTerms)) {
    try {
      console.log(`\n[${id}] Searching: "${searchTerm}"...`);
      const image = await searchWikimediaImage(searchTerm);
      
      if (!image) {
        console.log(`  No image found`);
        failed++;
        continue;
      }
      
      console.log(`  Found: ${image.title}`);
      const ext = path.extname(image.title).toLowerCase() || ".jpg";
      const fileName = `product-${id}-real${ext}`;
      const filePath = path.join(outDir, fileName);
      
      await downloadBinary(image.url, filePath);
      
      const stats = fs.statSync(filePath);
      if (stats.size < 1000) {
        console.log(`  Too small (${stats.size}B), skipping`);
        fs.unlinkSync(filePath);
        failed++;
        continue;
      }
      
      const imageUrl = `/products/${fileName}`;
      await prisma.product.update({ where: { id: parseInt(id) }, data: { image: imageUrl } });
      console.log(`  OK -> ${imageUrl} (${Math.round(stats.size / 1024)}KB)`);
      success++;
    } catch (err) {
      console.log(`  ERROR: ${err.message}`);
      failed++;
    }
  }

  console.log(`\n=== Done! Success: ${success}, Failed: ${failed} ===`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
