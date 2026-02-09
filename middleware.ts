import { NextRequest, NextResponse } from "next/server";

// Maintenance mode - set to true to enable
const MAINTENANCE_MODE = false;

export const runtime = 'edge';

export function middleware(request: NextRequest) {
  // Skip if maintenance mode is disabled
  if (!MAINTENANCE_MODE) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  // Exclude admin routes, API routes, static files, and maintenance page
  const excludedPaths = [
    '/admin',
    '/api',
    '/maintenance',
    '/_next',
    '/favicon.ico',
  ];

  const isExcluded = excludedPaths.some(path => pathname.startsWith(path));
  if (isExcluded) {
    return NextResponse.next();
  }

  // Redirect to maintenance page
  const maintenanceUrl = new URL('/maintenance', request.url);
  return NextResponse.rewrite(maintenanceUrl);
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
