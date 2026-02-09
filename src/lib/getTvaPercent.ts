import { promises as fs } from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const FILE_PATH = path.join(DATA_DIR, 'pagini.json');

// Returnează TVA% configurat din admin (default 19)
export async function getTvaPercent(): Promise<number> {
  try {
    const raw = await fs.readFile(FILE_PATH, 'utf-8');
    const data = JSON.parse(raw);
    if (data?.cos?.tva !== undefined) {
      return Number(data.cos.tva);
    }
  } catch {
    // Fișier inexistent sau eroare JSON
  }
  return 19; // default
}

// Versiune sincronă pentru locuri unde async nu e posibil
export function getTvaPercentSync(): number {
  try {
    const fsSync = require('fs');
    const raw = fsSync.readFileSync(FILE_PATH, 'utf-8');
    const data = JSON.parse(raw);
    if (data?.cos?.tva !== undefined) {
      return Number(data.cos.tva);
    }
  } catch {
    // Fișier inexistent sau eroare JSON
  }
  return 19;
}
