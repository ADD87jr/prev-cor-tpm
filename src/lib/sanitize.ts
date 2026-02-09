/**
 * Input sanitization utilities for XSS prevention
 */

/**
 * Escape HTML special characters to prevent XSS
 */
export function escapeHtml(str: string): string {
  if (!str || typeof str !== "string") return "";
  
  const htmlEntities: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#x27;",
    "/": "&#x2F;",
    "`": "&#x60;",
    "=": "&#x3D;",
  };

  return str.replace(/[&<>"'`=/]/g, (char) => htmlEntities[char] || char);
}

/**
 * Strip HTML tags from string
 */
export function stripHtmlTags(str: string): string {
  if (!str || typeof str !== "string") return "";
  return str.replace(/<[^>]*>/g, "");
}

/**
 * Sanitize user input - removes dangerous patterns
 * Use for user-submitted content (reviews, comments, messages)
 */
export function sanitizeInput(str: string): string {
  if (!str || typeof str !== "string") return "";
  
  let clean = str;
  
  // Remove script tags and content
  clean = clean.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  
  // Remove onclick, onerror, onload, etc. event handlers
  clean = clean.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, "");
  clean = clean.replace(/\s*on\w+\s*=\s*[^\s>]*/gi, "");
  
  // Remove javascript: URLs
  clean = clean.replace(/javascript\s*:/gi, "");
  
  // Remove data: URLs (can contain malicious content)
  clean = clean.replace(/data\s*:/gi, "");
  
  // Remove vbscript: URLs
  clean = clean.replace(/vbscript\s*:/gi, "");
  
  // Escape remaining HTML entities
  clean = escapeHtml(clean);
  
  return clean.trim();
}

/**
 * Sanitize for safe display in HTML (allows basic formatting)
 */
export function sanitizeForDisplay(str: string): string {
  if (!str || typeof str !== "string") return "";
  
  // First strip dangerous patterns
  let clean = str;
  clean = clean.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  clean = clean.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, "");
  clean = clean.replace(/javascript\s*:/gi, "");
  
  return clean;
}

/**
 * Validate and sanitize email
 */
export function sanitizeEmail(email: string): string {
  if (!email || typeof email !== "string") return "";
  return email.toLowerCase().trim().slice(0, 255);
}

/**
 * Validate and sanitize name (remove special characters except basic punctuation)
 */
export function sanitizeName(name: string): string {
  if (!name || typeof name !== "string") return "";
  // Allow letters, numbers, spaces, hyphens, dots, apostrophes
  return name.replace(/[^a-zA-ZăîșțâĂÎȘȚÂ0-9\s\-.']/g, "").trim().slice(0, 100);
}
