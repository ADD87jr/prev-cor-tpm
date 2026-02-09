// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { Product, addProduct, getProducts, addAdminLog } from "../../index";
import { User, addUser, getAllUsers } from "../../../account/index";
import { adminAuthMiddleware } from "@/lib/auth-middleware";
import { auditDataChange } from "@/lib/audit-logger";
import { getClientIp } from "@/lib/rate-limit";
import { decryptBackupData, isEncryptedBackup } from "@/lib/backup-encryption";
import { alertBackupOperation } from "@/lib/security-alerts";

export async function POST(req: NextRequest) {
  // Protejare autentificare
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;

  const ip = getClientIp(req);

  try {
    let backupData: any;
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      backupData = await req.json();
    } else {
      // Try to read as text (might be encrypted)
      const text = await req.text();
      
      if (isEncryptedBackup(text)) {
        try {
          backupData = decryptBackupData(text);
        } catch (decryptError) {
          return NextResponse.json({ error: "Nu s-a putut decripta backup-ul. Cheie greșită?" }, { status: 400 });
        }
      } else {
        // Try to parse as JSON
        try {
          backupData = JSON.parse(text);
        } catch {
          return NextResponse.json({ error: "Format backup invalid" }, { status: 400 });
        }
      }
    }

    const { products, users, adminLog } = backupData;

    // Send security alert
    await alertBackupOperation("restore", ip, 
      `Restore from backup: ${products?.length || 0} products, ${users?.length || 0} users`);

    // Log acțiunea critică
    await auditDataChange("admin", "create", "restore_data", "backup",
      `Restore triggered: ${products?.length || 0} products, ${users?.length || 0} users`,
      ip
    );

    // Restaurează produse
    if (Array.isArray(products)) {
      products.forEach((p: Product) => addProduct({ ...p, id: undefined }));
    }
    // Restaurează utilizatori
    if (Array.isArray(users)) {
      users.forEach((u: User) => addUser({ ...u, id: undefined, orders: undefined }));
    }
    // Restaurează log admin
    if (Array.isArray(adminLog)) {
      adminLog.forEach((log: any) => addAdminLog(log.action, log.details));
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[RESTORE] Error:", e);
    return NextResponse.json({ error: "Date backup invalide" }, { status: 400 });
  }
}
