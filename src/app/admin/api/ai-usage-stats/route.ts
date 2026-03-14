import { NextResponse } from "next/server";
import { getRateLimitStatus, getAIUsageStats, clearExpiredCache } from "@/lib/ai-utils";

// GET - Statistici utilizare AI
export async function GET() {
  try {
    // Curăță cache-ul expirat
    clearExpiredCache();
    
    const rateLimits = getRateLimitStatus();
    const usageStats = getAIUsageStats(7); // Ultimele 7 zile
    
    return NextResponse.json({
      rateLimits: {
        ...rateLimits,
        maxPerMinute: 14,
        maxPerDay: 1400
      },
      usage: usageStats,
      health: {
        cacheEnabled: true,
        rateLimitEnabled: true,
        loggingEnabled: true
      },
      recommendations: [
        rateLimits.minuteRemaining < 5 ? 
          "⚠️ Aproape de limita pe minut - reducere activitate recomandată" : null,
        rateLimits.dayRemaining < 100 ? 
          "⚠️ Aproape de limita zilnică - prioritizează request-urile importante" : null,
        usageStats.cachedRequests / Math.max(usageStats.totalRequests, 1) < 0.3 ?
          "💡 Cache hit rate scăzut - verifică dacă cererile sunt repetitive" : null
      ].filter(Boolean)
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
