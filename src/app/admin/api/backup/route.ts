// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { getProducts, getAdminLog } from "../../index";
import { getAllUsers } from "../../../account/index";
import { adminAuthMiddleware } from "@/lib/auth-middleware";
import { encryptBackupData } from "@/lib/backup-encryption";
import { alertBackupOperation } from "@/lib/security-alerts";
import { getClientIp } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  // Protejare autentificare
  const authError = await adminAuthMiddleware(req);
  if (authError) return authError;

  const ip = getClientIp(req);
  const encrypt = req.nextUrl.searchParams.get("encrypt") === "true";

  const backupData = {
    products: getProducts(),
    users: getAllUsers(),
    adminLog: getAdminLog(),
    createdAt: new Date().toISOString(),
    version: "1.0",
  };

  // Send security alert
  await alertBackupOperation("backup", ip, `Backup created${encrypt ? " (encrypted)" : ""}`);

  if (encrypt) {
    // Return encrypted backup
    const encryptedData = encryptBackupData(backupData);
    return new NextResponse(encryptedData, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename=backup-encrypted-${new Date().toISOString().slice(0, 10)}.enc`,
      },
    });
  }

  // Return plain JSON backup
  return NextResponse.json(backupData);
}
