import { prisma } from "./prisma";

export interface AuditLogEntry {
  adminId: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: string;
  ipAddress: string;
  userAgent?: string;
  success: boolean;
}

/**
 * Logheza o acțiune admin în baza de date
 * User: administratorului care a efectuat acțiunea
 * Action: login, logout, create, update, delete, etc.
 * Resource: users, products, orders, settings, etc.
 */
export async function auditLog(entry: AuditLogEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        adminId: entry.adminId,
        action: entry.action,
        resource: entry.resource,
        resourceId: entry.resourceId,
        details: entry.details,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
        success: entry.success,
        timestamp: new Date(),
      },
    });
  } catch (err) {
    console.error("[AUDIT] Failed to log action:", err);
    // Nu renunța la operație dacă logging eșuează
  }
}

/**
 * Helper pentru a loga eșecuri de login
 */
export async function auditLoginFailure(
  reason: string,
  ipAddress: string,
  userAgent?: string
): Promise<void> {
  await auditLog({
    adminId: "unknown",
    action: "login_failed",
    resource: "admin_auth",
    details: reason,
    ipAddress,
    userAgent,
    success: false,
  });
}

/**
 * Helper pentru a loga succese de login
 */
export async function auditLoginSuccess(
  adminId: string,
  ipAddress: string,
  userAgent?: string
): Promise<void> {
  await auditLog({
    adminId,
    action: "login",
    resource: "admin_auth",
    ipAddress,
    userAgent,
    success: true,
  });
}

/**
 * Helper pentru a loga modificări de date
 */
export async function auditDataChange(
  adminId: string,
  action: "create" | "update" | "delete" | "enable" | "disable" | "backup" | "restore",
  resource: string,
  resourceId: string,
  details?: string,
  ipAddress?: string
): Promise<void> {
  await auditLog({
    adminId,
    action,
    resource,
    resourceId,
    details,
    ipAddress: ipAddress || "unknown",
    success: true,
  });
}
