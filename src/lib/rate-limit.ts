import { NextRequest, NextResponse } from "next/server";

interface RateLimitStore {
  [key: string]: { count: number; resetTime: number }[];
}

const rateLimitStore: RateLimitStore = {};

/**
 * Clear all rate limits (pentru admin/debugging)
 */
export function clearAllRateLimits(): void {
  for (const key in rateLimitStore) {
    delete rateLimitStore[key];
  }
}

/**
 * Clear rate limit for specific key
 */
export function clearRateLimit(key: string): void {
  delete rateLimitStore[key];
}

/**
 * Cleanup expired entries and empty keys
 * Returns number of cleaned keys
 */
export function cleanupRateLimitStore(): number {
  const now = Date.now();
  let cleaned = 0;

  for (const key in rateLimitStore) {
    // Remove expired entries
    rateLimitStore[key] = rateLimitStore[key].filter(r => r.resetTime > now);
    
    // Remove empty keys
    if (rateLimitStore[key].length === 0) {
      delete rateLimitStore[key];
      cleaned++;
    }
  }
  
  return cleaned;
}

/**
 * Get stats about rate limit store
 */
export function getRateLimitStats(): { totalKeys: number; totalEntries: number } {
  let totalEntries = 0;
  const totalKeys = Object.keys(rateLimitStore).length;
  
  for (const key in rateLimitStore) {
    totalEntries += rateLimitStore[key].length;
  }
  
  return { totalKeys, totalEntries };
}

/**
 * Simple in-memory rate limiter
 * key: string unic (ex: "login:192.168.1.1")
 * maxRequests: numărul maxim de requesturi
 * windowMs: fereastra de timp în milisecunde
 */
export function rateLimitMiddleware(
  key: string,
  maxRequests: number = 10,
  windowMs: number = 60 * 1000 // 1 minut by default
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();

  // Inițializează cheia dacă nu există
  if (!rateLimitStore[key]) {
    rateLimitStore[key] = [];
  }

  // Curăță requesturile vechi (expirате)
  rateLimitStore[key] = rateLimitStore[key].filter(request => request.resetTime > now);

  // Verifică dacă a depășit limita
  const currentCount = rateLimitStore[key].length;
  const allowed = currentCount < maxRequests;

  if (allowed) {
    // Adaugă un request nou
    rateLimitStore[key].push({
      count: currentCount + 1,
      resetTime: now + windowMs,
    });
  }

  const resetTime = rateLimitStore[key][0]?.resetTime || now + windowMs;

  return {
    allowed,
    remaining: Math.max(0, maxRequests - currentCount - 1),
    resetTime,
  };
}

/**
 * Middleware convenience pentru rate limit checks
 * Returnează 429 (Too Many Requests) dacă depășit
 */
export function checkRateLimit(
  req: NextRequest,
  key: string,
  maxRequests: number = 10,
  windowMs: number = 60 * 1000
): NextResponse | null {
  const { allowed, remaining, resetTime } = rateLimitMiddleware(key, maxRequests, windowMs);

  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((resetTime - Date.now()) / 1000)),
          "X-RateLimit-Remaining": String(remaining),
        },
      }
    );
  }

  return null; // OK, continuă
}

/**
 * Extrage IP-ul clientului din request
 */
export function getClientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
}
