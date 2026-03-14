const https = require("https");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Imagini reale de produse industriale din surse publice (catalog/datasheet images)
const productImages = {
  3: { // Senzor inductiv M12 PNP NO 4mm
    url: "https://www.autonics.com/upload/product/product_image/pr12_main_new_1.png",
    ext: ".png",
  },
  4: { // Senzor fotoelectric difuz M18
    url: "https://www.autonics.com/upload/product/product_image/brq_main_new.png",
    ext: ".png",
  },
  5: { // Senzor capacitiv M18 PNP 8mm
    url: "https://www.autonics.com/upload/product/product_image/cr_main_new.png",
    ext: ".png",
  },
  6: { // Alimentator sina DIN 24V 5A 120W
    url: "https://www.meanwell.com/Upload/PDF/NDR-120/NDR-120-SPEC.jpg",
    ext: ".jpg",
  },
  7: { // Alimentator sina DIN 12V 2.5A 30W
    url: "https://www.meanwell.com/Upload/PDF/HDR-30/HDR-30-SPEC.jpg",
    ext: ".jpg",
  },
  8: { // Releu industrial 24V DC 4 contacte
    url: "https://cdn.findernet.com/app/uploads/2019/04/55.34-1.jpg",
    ext: ".jpg",
  },
  9: { // Soclu releu industrial 14 pini
    url: "https://cdn.findernet.com/app/uploads/2019/04/94.04-1.jpg",
    ext: ".jpg",
  },
  10: { // Contactor 3P 25A 230V AC
    url: "https://download.schneider-electric.com/files?p_Doc_Ref=LC1D25P7_product_image&p_enDocType=image",
    ext: ".jpg",
  },
  11: { // Conector M12 4-pini drept masculin
    url: "https://www.phoenixcontact.com/assets/images_pr/product_photos/large/92449_1000_int_04.jpg",
    ext: ".jpg",
  },
  12: { // Cablu conector M12 feminin 2m PVC
    url: "https://www.phoenixcontact.com/assets/images_pr/product_photos/large/28486_1000_int_04.jpg",
    ext: ".jpg",
  },
  13: { // Buton verde START O22mm
    url: "https://download.schneider-electric.com/files?p_Doc_Ref=ZB5AA331_product_image&p_enDocType=image",
    ext: ".jpg",
  },
  14: { // Lampa semnalizare LED verde O22mm
    url: "https://download.schneider-electric.com/files?p_Doc_Ref=XB5AVB3_product_image&p_enDocType=image",
    ext: ".jpg",
  },
  15: { // Buton de urgenta ciuperca O40mm
    url: "https://download.schneider-electric.com/files?p_Doc_Ref=ZB5AS844_product_image&p_enDocType=image",
    ext: ".jpg",
  },
};

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith("https") ? https : http;
    const options = {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "image/*,*/*",
      },
      timeout: 15000,
    };
    
    const request = protocol.get(url, options, (response) => {
      // Follow redirects
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        downloadFile(response.headers.location, dest).then(resolve).catch(reject);
        return;
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode} for ${url}`));
        return;
      }

      const file = fs.createWriteStream(dest);
      response.pipe(file);
      file.on("finish", () => {
        file.close();
        resolve(dest);
      });
      file.on("error", (err) => {
        fs.unlinkSync(dest);
        reject(err);
      });
    });

    request.on("error", reject);
    request.on("timeout", () => {
      request.destroy();
      reject(new Error("Timeout"));
    });
  });
}

async function main() {
  const outDir = path.join(process.cwd(), "public", "products");
  let success = 0;
  let failed = 0;

  for (const [id, info] of Object.entries(productImages)) {
    const fileName = `product-${id}-real${info.ext}`;
    const filePath = path.join(outDir, fileName);
    const imageUrl = `/products/${fileName}`;

    try {
      console.log(`Downloading id=${id}: ${info.url.substring(0, 80)}...`);
      await downloadFile(info.url, filePath);

      const stats = fs.statSync(filePath);
      if (stats.size < 500) {
        console.log(`  SKIP - file too small (${stats.size} bytes), keeping existing image`);
        fs.unlinkSync(filePath);
        failed++;
        continue;
      }

      await prisma.product.update({ where: { id: parseInt(id) }, data: { image: imageUrl } });
      console.log(`  OK -> ${imageUrl} (${Math.round(stats.size / 1024)}KB)`);
      success++;
    } catch (err) {
      console.log(`  FAILED: ${err.message}`);
      failed++;
    }
  }

  console.log(`\nDone! Success: ${success}, Failed: ${failed}`);
  if (failed > 0) {
    console.log("Failed products will keep their existing SVG images.");
  }
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
