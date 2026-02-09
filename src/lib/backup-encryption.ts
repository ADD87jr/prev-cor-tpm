/**
 * Backup encryption utilities
 * Uses AES-256-GCM for secure encryption of backup data
 */

import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits
const SALT_LENGTH = 32;
const KEY_LENGTH = 32; // 256 bits

/**
 * Get encryption key from environment or generate one
 */
function getEncryptionKey(): Buffer {
  const envKey = process.env.BACKUP_ENCRYPTION_KEY;
  
  if (envKey) {
    // If key is provided, use it (should be 64 hex chars = 32 bytes)
    if (envKey.length === 64) {
      return Buffer.from(envKey, "hex");
    }
    // Otherwise derive from it
    return crypto.scryptSync(envKey, "backup-salt", KEY_LENGTH);
  }
  
  // Generate a key from NEXTAUTH_SECRET if available
  const secret = process.env.NEXTAUTH_SECRET || "default-backup-key-change-this";
  return crypto.scryptSync(secret, "backup-encryption-salt", KEY_LENGTH);
}

/**
 * Encrypt data using AES-256-GCM
 */
export function encryptBackup(data: string | Buffer): { encrypted: string; iv: string; authTag: string } {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  const inputBuffer = typeof data === "string" ? Buffer.from(data, "utf-8") : data;
  const encrypted = Buffer.concat([cipher.update(inputBuffer), cipher.final()]);
  const authTag = cipher.getAuthTag();
  
  return {
    encrypted: encrypted.toString("base64"),
    iv: iv.toString("hex"),
    authTag: authTag.toString("hex"),
  };
}

/**
 * Decrypt data using AES-256-GCM
 */
export function decryptBackup(encryptedData: string, iv: string, authTag: string): string {
  const key = getEncryptionKey();
  const ivBuffer = Buffer.from(iv, "hex");
  const authTagBuffer = Buffer.from(authTag, "hex");
  const encryptedBuffer = Buffer.from(encryptedData, "base64");
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, ivBuffer);
  decipher.setAuthTag(authTagBuffer);
  
  const decrypted = Buffer.concat([decipher.update(encryptedBuffer), decipher.final()]);
  
  return decrypted.toString("utf-8");
}

/**
 * Encrypt a backup object and return a single encrypted string
 * Format: VERSION|IV|AUTHTAG|ENCRYPTED_DATA
 */
export function encryptBackupData(data: object): string {
  const jsonData = JSON.stringify(data);
  const { encrypted, iv, authTag } = encryptBackup(jsonData);
  
  // Version 1 format
  return `v1|${iv}|${authTag}|${encrypted}`;
}

/**
 * Decrypt an encrypted backup string
 */
export function decryptBackupData(encryptedString: string): object {
  const parts = encryptedString.split("|");
  
  if (parts.length !== 4 || parts[0] !== "v1") {
    throw new Error("Invalid encrypted backup format");
  }
  
  const [, iv, authTag, encrypted] = parts;
  const decrypted = decryptBackup(encrypted, iv, authTag);
  
  return JSON.parse(decrypted);
}

/**
 * Check if a string appears to be encrypted backup data
 */
export function isEncryptedBackup(data: string): boolean {
  return data.startsWith("v1|") && data.split("|").length === 4;
}

/**
 * Encrypt file contents for secure storage
 */
export function encryptFile(content: Buffer): Buffer {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(content), cipher.final()]);
  const authTag = cipher.getAuthTag();
  
  // Return: IV (16) + AuthTag (16) + Encrypted data
  return Buffer.concat([iv, authTag, encrypted]);
}

/**
 * Decrypt file contents
 */
export function decryptFile(encryptedContent: Buffer): Buffer {
  const key = getEncryptionKey();
  
  // Extract IV, AuthTag, and encrypted data
  const iv = encryptedContent.subarray(0, IV_LENGTH);
  const authTag = encryptedContent.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = encryptedContent.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}

/**
 * Generate a new encryption key (for setup/rotation)
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(KEY_LENGTH).toString("hex");
}
