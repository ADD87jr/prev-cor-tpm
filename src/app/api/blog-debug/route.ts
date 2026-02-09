import { NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET() {
  const diagnostics: Record<string, unknown> = {};

  try {
    // Test BlogPost model
    const count = await prisma.blogPost.count();
    diagnostics.blogPostCount = count;
    diagnostics.success = true;
  } catch (error) {
    diagnostics.success = false;
    diagnostics.error = error instanceof Error ? error.message : String(error);
    diagnostics.stack = error instanceof Error ? error.stack?.split('\n').slice(0, 5) : null;
  }

  return NextResponse.json(diagnostics, { status: 200 });
}
