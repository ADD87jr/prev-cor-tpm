/**
 * IP auto-blocking for security
 * Automatically blocks IPs that have too many failed attempts
 */

import { NextRequest, NextResponse } from "next/server";

interface BlockedIP {
  ip: string;
  reason: string;
  blockedAt: number;
  expiresAt: number;
  attempts: number;
}

interface FailedAttempt {
  count: number;
  firstAttempt: number;
  lastAttempt: number;
}

// In-memory storage (for production, use Redis or database)
const blockedIPs: Map<string, BlockedIP> = new Map();
const failedAttempts: Map<string, FailedAttempt> = new Map();

// Configuration
const CONFIG = {
  maxFailedAttempts: 10, // Block after this many failed attempts
  failedAttemptsWindow: 30 * 60 * 1000, // 30 minutes window
  blockDuration: 60 * 60 * 1000, // 1 hour block
  permanentBlockThreshold: 50, // After this many total attempts, block for longer
  permanentBlockDuration: 24 * 60 * 60 * 1000, // 24 hours
};

/**
 * Record a failed attempt for an IP
 * Returns true if IP should be blocked
 */
export function recordFailedAttempt(ip: string, reason: string = "failed_attempt"): boolean {
  const now = Date.now();
  const existing = failedAttempts.get(ip);

  if (existing) {
    // Reset if outside window
    if (now - existing.firstAttempt > CONFIG.failedAttemptsWindow) {
      failedAttempts.set(ip, { count: 1, firstAttempt: now, lastAttempt: now });
      return false;
    }

    existing.count++;
    existing.lastAttempt = now;
    failedAttempts.set(ip, existing);

    // Check if should block
    if (existing.count >= CONFIG.maxFailedAttempts) {
      blockIP(ip, reason, existing.count);
      return true;
    }
  } else {
    failedAttempts.set(ip, { count: 1, firstAttempt: now, lastAttempt: now });
  }

  return false;
}

/**
 * Block an IP address
 */
export function blockIP(ip: string, reason: string, attempts: number = 0): void {
  const now = Date.now();
  const duration = attempts >= CONFIG.permanentBlockThreshold 
    ? CONFIG.permanentBlockDuration 
    : CONFIG.blockDuration;

  blockedIPs.set(ip, {
    ip,
    reason,
    blockedAt: now,
    expiresAt: now + duration,
    attempts,
  });

  console.log(`[IP BLOCK] Blocked IP: ${ip}, Reason: ${reason}, Duration: ${duration / 60000} min`);
}

/**
 * Check if an IP is blocked
 */
export function isIPBlocked(ip: string): { blocked: boolean; reason?: string; expiresAt?: number } {
  const blocked = blockedIPs.get(ip);
  
  if (!blocked) {
    return { blocked: false };
  }

  // Check if block expired
  if (Date.now() > blocked.expiresAt) {
    blockedIPs.delete(ip);
    failedAttempts.delete(ip); // Reset failed attempts too
    return { blocked: false };
  }

  return { 
    blocked: true, 
    reason: blocked.reason,
    expiresAt: blocked.expiresAt,
  };
}

/**
 * Unblock an IP manually
 */
export function unblockIP(ip: string): boolean {
  const existed = blockedIPs.has(ip);
  blockedIPs.delete(ip);
  failedAttempts.delete(ip);
  return existed;
}

/**
 * Get all blocked IPs
 */
export function getBlockedIPs(): BlockedIP[] {
  const now = Date.now();
  const result: BlockedIP[] = [];
  
  for (const [ip, data] of blockedIPs.entries()) {
    if (data.expiresAt > now) {
      result.push(data);
    } else {
      blockedIPs.delete(ip);
    }
  }
  
  return result;
}

/**
 * Clear a successful attempt (reset count for IP)
 */
export function clearFailedAttempts(ip: string): void {
  failedAttempts.delete(ip);
}

/**
 * Middleware to check if IP is blocked
 * Returns 403 response if blocked, null if OK
 */
export function checkIPBlockMiddleware(req: NextRequest): NextResponse | null {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  const blockStatus = isIPBlocked(ip);

  if (blockStatus.blocked) {
    const retryAfter = blockStatus.expiresAt 
      ? Math.ceil((blockStatus.expiresAt - Date.now()) / 1000)
      : 3600;

    return NextResponse.json(
      { 
        error: "IP address temporarily blocked due to suspicious activity",
        reason: blockStatus.reason,
        retryAfter,
      },
      { 
        status: 403,
        headers: {
          "Retry-After": String(retryAfter),
        },
      }
    );
  }

  return null;
}

/**
 * Get failed attempts count for an IP
 */
export function getFailedAttemptsCount(ip: string): number {
  const attempts = failedAttempts.get(ip);
  if (!attempts) return 0;
  
  // Check if within window
  if (Date.now() - attempts.firstAttempt > CONFIG.failedAttemptsWindow) {
    failedAttempts.delete(ip);
    return 0;
  }
  
  return attempts.count;
}
