import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const diagnostics: Record<string, unknown> = {
    nodeVersion: process.version,
    tursoUrl: process.env.TURSO_DATABASE_URL ? 'SET' : 'NOT SET',
    tursoToken: process.env.TURSO_AUTH_TOKEN ? 'SET' : 'NOT SET',
    databaseUrl: process.env.DATABASE_URL ? 'SET' : 'NOT SET',
    nodeEnv: process.env.NODE_ENV,
  };

  try {
    // Test libsql client directly
    const { createClient } = await import('@libsql/client');
    const tursoUrl = process.env.TURSO_DATABASE_URL;
    const tursoToken = process.env.TURSO_AUTH_TOKEN;
    
    if (tursoUrl && tursoToken) {
      const client = createClient({
        url: tursoUrl,
        authToken: tursoToken,
      });
      
      const result = await client.execute('SELECT COUNT(*) as count FROM Product');
      diagnostics.libsqlTest = 'SUCCESS';
      diagnostics.productCount = result.rows[0]?.count;
    } else {
      diagnostics.libsqlTest = 'SKIPPED - Missing credentials';
    }
  } catch (error) {
    diagnostics.libsqlTest = 'FAILED';
    diagnostics.libsqlError = error instanceof Error ? error.message : String(error);
  }

  try {
    // Test Prisma
    const { prisma } = await import('@/lib/prisma');
    const count = await prisma.product.count();
    diagnostics.prismaTest = 'SUCCESS';
    diagnostics.prismaProductCount = count;
  } catch (error) {
    diagnostics.prismaTest = 'FAILED';
    diagnostics.prismaError = error instanceof Error ? error.message : String(error);
    diagnostics.prismaStack = error instanceof Error ? error.stack?.split('\n').slice(0, 5) : null;
  }

  return NextResponse.json(diagnostics, { status: 200 });
}
