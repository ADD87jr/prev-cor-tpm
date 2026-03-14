import { NextRequest, NextResponse } from "next/server";
import { adminAuthMiddleware } from "@/lib/auth-middleware";
import fs from "fs";
import path from "path";

const BACKUP_DIR = path.join(process.cwd(), "backups");
const DB_PATH = path.join(process.cwd(), "prisma", "dev.db");

// GET /admin/api/backup-db — listare backup-uri existente
export async function GET(req: NextRequest) {
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;

  if (!fs.existsSync(BACKUP_DIR)) {
    return NextResponse.json({ backups: [] });
  }

  const files = fs.readdirSync(BACKUP_DIR)
    .filter((f) => f.endsWith(".db"))
    .map((f) => {
      const stat = fs.statSync(path.join(BACKUP_DIR, f));
      return {
        name: f,
        size: stat.size,
        sizeFormatted: formatBytes(stat.size),
        date: stat.mtime.toISOString(),
      };
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return NextResponse.json({ backups: files });
}

// POST /admin/api/backup-db — creează backup nou
export async function POST(req: NextRequest) {
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;

  const body = await req.json().catch(() => ({}));
  
  if (body.action === "download") {
    // Descarcă un backup specific
    const filename = body.filename;
    if (!filename || !/^backup-db-[\d-]+\.db$/.test(filename)) {
      return NextResponse.json({ error: "Nume fișier invalid" }, { status: 400 });
    }
    const filePath = path.join(BACKUP_DIR, filename);
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "Fișierul nu există" }, { status: 404 });
    }
    const buffer = fs.readFileSync(filePath);
    return new Response(buffer, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }

  if (body.action === "delete") {
    const filename = body.filename;
    if (!filename || !/^backup-db-[\d-]+\.db$/.test(filename)) {
      return NextResponse.json({ error: "Nume fișier invalid" }, { status: 400 });
    }
    const filePath = path.join(BACKUP_DIR, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    return NextResponse.json({ success: true });
  }

  // Default: creează backup
  if (!fs.existsSync(DB_PATH)) {
    return NextResponse.json({ error: "Baza de date nu a fost găsită" }, { status: 404 });
  }

  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const now = new Date();
  // Generează timestamp în fusul orar al României
  const roTime = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Bucharest" }));
  const timestamp = `${roTime.getFullYear()}-${pad(roTime.getMonth() + 1)}-${pad(roTime.getDate())}-${pad(roTime.getHours())}${pad(roTime.getMinutes())}${pad(roTime.getSeconds())}`;
  const backupFilename = `backup-db-${timestamp}.db`;
  const backupPath = path.join(BACKUP_DIR, backupFilename);

  fs.copyFileSync(DB_PATH, backupPath);
  
  // Setează mtime la momentul actual pentru a reflecta data corectă a backup-ului
  const backupTime = new Date();
  fs.utimesSync(backupPath, backupTime, backupTime);

  // Păstrează doar ultimele 30 de backup-uri (automat cleanup)
  const existing = fs.readdirSync(BACKUP_DIR)
    .filter((f) => f.startsWith("backup-db-") && f.endsWith(".db"))
    .sort();
  if (existing.length > 30) {
    const toDelete = existing.slice(0, existing.length - 30);
    for (const f of toDelete) {
      fs.unlinkSync(path.join(BACKUP_DIR, f));
    }
  }

  const stat = fs.statSync(backupPath);

  return NextResponse.json({
    success: true,
    backup: {
      name: backupFilename,
      size: stat.size,
      sizeFormatted: formatBytes(stat.size),
      date: stat.mtime.toISOString(),
    },
  });
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
