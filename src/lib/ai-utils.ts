// AI Utilities: Cache, Rate Limiter, Logging

import fs from "fs";
import path from "path";

// ============ CACHE SYSTEM ============
interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
}

const CACHE_DIR = path.join(process.cwd(), ".ai-cache");
const CACHE_FILE = path.join(CACHE_DIR, "cache.json");

function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

function loadCache(): Record<string, CacheEntry> {
  try {
    ensureCacheDir();
    if (fs.existsSync(CACHE_FILE)) {
      return JSON.parse(fs.readFileSync(CACHE_FILE, "utf-8"));
    }
  } catch (e) {}
  return {};
}

function saveCache(cache: Record<string, CacheEntry>) {
  try {
    ensureCacheDir();
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
  } catch (e) {}
}

export function getCachedResponse(key: string): any | null {
  const cache = loadCache();
  const entry = cache[key];
  
  if (entry && Date.now() - entry.timestamp < entry.ttl) {
    return entry.data;
  }
  
  // Cleanup expired entry
  if (entry) {
    delete cache[key];
    saveCache(cache);
  }
  
  return null;
}

export function setCachedResponse(key: string, data: any, ttlMinutes: number = 60) {
  const cache = loadCache();
  cache[key] = {
    data,
    timestamp: Date.now(),
    ttl: ttlMinutes * 60 * 1000
  };
  saveCache(cache);
}

export function generateCacheKey(prefix: string, params: any): string {
  const hash = JSON.stringify(params);
  return `${prefix}_${Buffer.from(hash).toString("base64").substring(0, 40)}`;
}

export function clearExpiredCache() {
  const cache = loadCache();
  let changed = false;
  
  for (const key of Object.keys(cache)) {
    const entry = cache[key];
    if (Date.now() - entry.timestamp >= entry.ttl) {
      delete cache[key];
      changed = true;
    }
  }
  
  if (changed) saveCache(cache);
}

// ============ RATE LIMITER ============
interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const RATE_LIMIT_FILE = path.join(CACHE_DIR, "rate-limits.json");

// Gemini Free Tier: 15 requests/minute
const MAX_REQUESTS_PER_MINUTE = 14; // Lăsăm 1 buffer
const MAX_REQUESTS_PER_DAY = 1400; // 1500 - buffer

function loadRateLimits(): { minute: RateLimitEntry; day: RateLimitEntry } {
  try {
    ensureCacheDir();
    if (fs.existsSync(RATE_LIMIT_FILE)) {
      return JSON.parse(fs.readFileSync(RATE_LIMIT_FILE, "utf-8"));
    }
  } catch (e) {}
  return {
    minute: { count: 0, windowStart: Date.now() },
    day: { count: 0, windowStart: Date.now() }
  };
}

function saveRateLimits(limits: { minute: RateLimitEntry; day: RateLimitEntry }) {
  try {
    ensureCacheDir();
    fs.writeFileSync(RATE_LIMIT_FILE, JSON.stringify(limits, null, 2));
  } catch (e) {}
}

export function checkRateLimit(): { allowed: boolean; waitMs: number; reason?: string } {
  const limits = loadRateLimits();
  const now = Date.now();
  
  // Reset minute window
  if (now - limits.minute.windowStart >= 60000) {
    limits.minute = { count: 0, windowStart: now };
  }
  
  // Reset day window
  if (now - limits.day.windowStart >= 86400000) {
    limits.day = { count: 0, windowStart: now };
  }
  
  // Check minute limit
  if (limits.minute.count >= MAX_REQUESTS_PER_MINUTE) {
    const waitMs = 60000 - (now - limits.minute.windowStart);
    return { 
      allowed: false, 
      waitMs, 
      reason: `Limită minut atinsă (${MAX_REQUESTS_PER_MINUTE}/min). Așteaptă ${Math.ceil(waitMs/1000)}s` 
    };
  }
  
  // Check day limit
  if (limits.day.count >= MAX_REQUESTS_PER_DAY) {
    const waitMs = 86400000 - (now - limits.day.windowStart);
    return { 
      allowed: false, 
      waitMs, 
      reason: `Limită zilnică atinsă (${MAX_REQUESTS_PER_DAY}/zi)` 
    };
  }
  
  // Increment counters
  limits.minute.count++;
  limits.day.count++;
  saveRateLimits(limits);
  
  return { allowed: true, waitMs: 0 };
}

export function getRateLimitStatus(): { 
  minuteRemaining: number; 
  dayRemaining: number;
  resetMinute: number;
  resetDay: number;
} {
  const limits = loadRateLimits();
  const now = Date.now();
  
  return {
    minuteRemaining: Math.max(0, MAX_REQUESTS_PER_MINUTE - limits.minute.count),
    dayRemaining: Math.max(0, MAX_REQUESTS_PER_DAY - limits.day.count),
    resetMinute: Math.max(0, 60 - Math.floor((now - limits.minute.windowStart) / 1000)),
    resetDay: Math.max(0, Math.floor((86400000 - (now - limits.day.windowStart)) / 3600000))
  };
}

// ============ AI LOGGING ============
interface AILogEntry {
  timestamp: string;
  endpoint: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs: number;
  cached: boolean;
  success: boolean;
  error?: string;
}

const LOG_FILE = path.join(CACHE_DIR, "ai-usage.log");
const MAX_LOG_ENTRIES = 1000;

export function logAIUsage(entry: Omit<AILogEntry, "timestamp">) {
  try {
    ensureCacheDir();
    
    let logs: AILogEntry[] = [];
    if (fs.existsSync(LOG_FILE)) {
      try {
        logs = JSON.parse(fs.readFileSync(LOG_FILE, "utf-8"));
      } catch (e) {}
    }
    
    logs.push({
      ...entry,
      timestamp: new Date().toISOString()
    });
    
    // Keep only last N entries
    if (logs.length > MAX_LOG_ENTRIES) {
      logs = logs.slice(-MAX_LOG_ENTRIES);
    }
    
    fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2));
  } catch (e) {}
}

export function getAIUsageStats(days: number = 7): {
  totalRequests: number;
  cachedRequests: number;
  failedRequests: number;
  avgLatencyMs: number;
  topEndpoints: { endpoint: string; count: number }[];
  dailyUsage: { date: string; count: number }[];
} {
  try {
    if (!fs.existsSync(LOG_FILE)) {
      return {
        totalRequests: 0,
        cachedRequests: 0,
        failedRequests: 0,
        avgLatencyMs: 0,
        topEndpoints: [],
        dailyUsage: []
      };
    }
    
    const logs: AILogEntry[] = JSON.parse(fs.readFileSync(LOG_FILE, "utf-8"));
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    
    const recentLogs = logs.filter(l => new Date(l.timestamp) >= cutoff);
    
    const endpointCounts: Record<string, number> = {};
    const dailyCounts: Record<string, number> = {};
    let totalLatency = 0;
    
    for (const log of recentLogs) {
      endpointCounts[log.endpoint] = (endpointCounts[log.endpoint] || 0) + 1;
      
      const date = log.timestamp.split("T")[0];
      dailyCounts[date] = (dailyCounts[date] || 0) + 1;
      
      if (!log.cached) {
        totalLatency += log.latencyMs;
      }
    }
    
    const nonCachedCount = recentLogs.filter(l => !l.cached).length;
    
    return {
      totalRequests: recentLogs.length,
      cachedRequests: recentLogs.filter(l => l.cached).length,
      failedRequests: recentLogs.filter(l => !l.success).length,
      avgLatencyMs: nonCachedCount > 0 ? Math.round(totalLatency / nonCachedCount) : 0,
      topEndpoints: Object.entries(endpointCounts)
        .map(([endpoint, count]) => ({ endpoint, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      dailyUsage: Object.entries(dailyCounts)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date))
    };
  } catch (e) {
    return {
      totalRequests: 0,
      cachedRequests: 0,
      failedRequests: 0,
      avgLatencyMs: 0,
      topEndpoints: [],
      dailyUsage: []
    };
  }
}

// ============ GEMINI WRAPPER WITH ALL FEATURES ============
export async function callGeminiWithCache(params: {
  prompt: string;
  endpoint: string;
  temperature?: number;
  maxTokens?: number;
  cacheTtlMinutes?: number;
  skipCache?: boolean;
}): Promise<{ data: any; cached: boolean; error?: string }> {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyDPMtQTjaruCtql9qAFqcavAzKwXRdjsnA";
  const startTime = Date.now();
  
  // Generate cache key
  const cacheKey = generateCacheKey(params.endpoint, {
    prompt: params.prompt,
    temp: params.temperature
  });
  
  // Check cache first
  if (!params.skipCache) {
    const cached = getCachedResponse(cacheKey);
    if (cached) {
      logAIUsage({
        endpoint: params.endpoint,
        model: "gemini-2.5-flash",
        latencyMs: Date.now() - startTime,
        cached: true,
        success: true
      });
      return { data: cached, cached: true };
    }
  }
  
  // Check rate limit
  const rateCheck = checkRateLimit();
  if (!rateCheck.allowed) {
    logAIUsage({
      endpoint: params.endpoint,
      model: "gemini-2.5-flash",
      latencyMs: Date.now() - startTime,
      cached: false,
      success: false,
      error: rateCheck.reason
    });
    return { data: null, cached: false, error: rateCheck.reason };
  }
  
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: params.prompt }] }],
          generationConfig: {
            temperature: params.temperature ?? 0.7,
            maxOutputTokens: params.maxTokens ?? 2000
          }
        })
      }
    );

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    
    // Try to parse JSON
    let result;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      result = jsonMatch ? JSON.parse(jsonMatch[0]) : text;
    } catch {
      result = text;
    }
    
    // Cache the result
    if (params.cacheTtlMinutes !== 0) {
      setCachedResponse(cacheKey, result, params.cacheTtlMinutes || 60);
    }
    
    logAIUsage({
      endpoint: params.endpoint,
      model: "gemini-2.5-flash",
      latencyMs: Date.now() - startTime,
      cached: false,
      success: true
    });
    
    return { data: result, cached: false };
  } catch (error: any) {
    logAIUsage({
      endpoint: params.endpoint,
      model: "gemini-2.5-flash",
      latencyMs: Date.now() - startTime,
      cached: false,
      success: false,
      error: error.message
    });
    
    return { data: null, cached: false, error: error.message };
  }
}
