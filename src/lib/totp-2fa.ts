/**
 * TOTP (Time-based One-Time Password) 2FA Implementation
 * Compatible with Google Authenticator, Authy, etc.
 * 
 * Uses speakeasy library for standard TOTP
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const speakeasy = require("speakeasy");

const TOTP_CONFIG = {
  issuer: "PREV-COR TPM Admin",
};

/**
 * Generate a random base32 secret for TOTP
 */
export function generateTOTPSecret(): string {
  const secret = speakeasy.generateSecret({ length: 20 });
  return secret.base32;
}

/**
 * Generate TOTP code for a given secret
 */
export function generateTOTPCode(secret: string): string {
  return speakeasy.totp({
    secret: secret,
    encoding: "base32",
  });
}

/**
 * Verify a TOTP code (allows ±1 time window for clock drift)
 */
export function verifyTOTPCode(secret: string, code: string): boolean {
  return speakeasy.totp.verify({
    secret: secret,
    encoding: "base32",
    token: code,
    window: 2, // Allow 2 time steps (60 seconds) of drift
  });
}

/**
 * Generate otpauth:// URI for QR code
 */
export function generateTOTPUri(secret: string, accountName: string): string {
  return speakeasy.otpauthURL({
    secret: secret,
    label: accountName,
    issuer: TOTP_CONFIG.issuer,
    encoding: "base32",
  });
}

/**
 * Check if 2FA is enabled in settings
 */
export async function is2FAEnabled(): Promise<boolean> {
  try {
    const { prisma } = await import("@/lib/prisma");
    const setting = await prisma.siteSettings.findUnique({
      where: { key: "admin2FAEnabled" },
    });
    return setting?.value === "true";
  } catch {
    return false;
  }
}

/**
 * Get 2FA secret from settings
 */
export async function get2FASecret(): Promise<string | null> {
  try {
    const { prisma } = await import("@/lib/prisma");
    const setting = await prisma.siteSettings.findUnique({
      where: { key: "admin2FASecret" },
    });
    return setting?.value || null;
  } catch {
    return null;
  }
}

/**
 * Enable 2FA with a new secret
 */
export async function enable2FA(secret: string): Promise<boolean> {
  try {
    const { prisma } = await import("@/lib/prisma");
    
    await prisma.siteSettings.upsert({
      where: { key: "admin2FASecret" },
      update: { value: secret },
      create: { key: "admin2FASecret", value: secret },
    });
    
    await prisma.siteSettings.upsert({
      where: { key: "admin2FAEnabled" },
      update: { value: "true" },
      create: { key: "admin2FAEnabled", value: "true" },
    });
    
    return true;
  } catch (error) {
    console.error("[2FA] Error enabling 2FA:", error);
    return false;
  }
}

/**
 * Disable 2FA
 */
export async function disable2FA(): Promise<boolean> {
  try {
    const { prisma } = await import("@/lib/prisma");
    
    await prisma.siteSettings.upsert({
      where: { key: "admin2FAEnabled" },
      update: { value: "false" },
      create: { key: "admin2FAEnabled", value: "false" },
    });
    
    return true;
  } catch (error) {
    console.error("[2FA] Error disabling 2FA:", error);
    return false;
  }
}
