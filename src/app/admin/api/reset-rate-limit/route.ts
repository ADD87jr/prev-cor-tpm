import { NextResponse } from "next/server";
import { clearAllRateLimits, getRateLimitStats } from "@/lib/rate-limit";
import { getBlockedIPs, unblockIP } from "@/lib/ip-blocking";

export async function POST() {
  const statsBefore = getRateLimitStats();
  clearAllRateLimits();
  
  // Also clear blocked IPs
  const blockedIPs = getBlockedIPs();
  for (const ip of blockedIPs) {
    unblockIP(ip.ip);
  }
  
  const statsAfter = getRateLimitStats();
  
  return NextResponse.json({
    success: true,
    message: "Rate limits and IP blocks cleared",
    before: statsBefore,
    after: statsAfter,
    unblockedIPs: blockedIPs.length,
  });
}

export async function GET() {
  const stats = getRateLimitStats();
  const blockedIPs = getBlockedIPs();
  return NextResponse.json({ ...stats, blockedIPs });
}
