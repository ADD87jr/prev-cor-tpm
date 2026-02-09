import crypto from "crypto";
import { NextRequest } from "next/server";

interface CSRFTokenStore {
  [key: string]: { token: string; expiresAt: number }[];
}

const csrfStore: CSRFTokenStore = {};
const TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 ore

/**
 * Genereaza un CSRF token unic
 * sessionId: ID-ul sesiunii (ex: adminId)
 */
export function generateCSRFToken(sessionId: string): string {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = Date.now() + TOKEN_EXPIRY;

  if (!csrfStore[sessionId]) {
    csrfStore[sessionId] = [];
  }

  csrfStore[sessionId].push({ token, expiresAt });

  // Curăță tokenuri expirате
  csrfStore[sessionId] = csrfStore[sessionId].filter(t => t.expiresAt > Date.now());

  return token;
}

/**
 * Verifică validitatea unui CSRF token
 */
export function verifyCSRFToken(sessionId: string, token: string): boolean {
  if (!csrfStore[sessionId]) {
    return false;
  }

  const found = csrfStore[sessionId].find(t => t.token === token && t.expiresAt > Date.now());

  if (found) {
    // Elimină tokenul după verificare (one-time use)
    csrfStore[sessionId] = csrfStore[sessionId].filter(t => t.token !== token);
    return true;
  }

  return false;
}

/**
 * Middleware pentru verificarea CSRF token
 * Caută token în body (POST/PUT/DELETE)
 */
export async function verifyCsrfMiddleware(
  req: NextRequest,
  sessionId: string
): Promise<{ valid: boolean; error?: string }> {
  // Verifica doar POST, PUT, DELETE, PATCH
  if (!["POST", "PUT", "DELETE", "PATCH"].includes(req.method)) {
    return { valid: true }; // GET și HEAD nu necesită CSRF
  }

  try {
    // Caută CSRF token din body (JSON)
    let token: string | null = null;

    if (req.headers.get("content-type")?.includes("application/json")) {
      const body = await req.json();
      token = body._csrf || body.csrfToken;
    }

    // Sau din headers (X-CSRF-Token)
    token = token || req.headers.get("x-csrf-token");

    if (!token) {
      return { valid: false, error: "CSRF token missing" };
    }

    if (!verifyCSRFToken(sessionId, token)) {
      return { valid: false, error: "CSRF token invalid" };
    }

    return { valid: true };
  } catch (err) {
    return { valid: false, error: `CSRF verification failed: ${(err as Error).message}` };
  }
}
