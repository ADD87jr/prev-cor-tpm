import { NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Exclude admin routes, API routes, static files, and maintenance page
  const excludedPaths = [
    '/admin',
    '/api',
    '/maintenance',
    '/_next',
    '/favicon.ico',
    '/logo.png',
    '/fonts',
    '/uploads',
    '/products',
    '/banners',
    '/maintenance-status.json'
  ];
  
  const isExcluded = excludedPaths.some(path => pathname.startsWith(path));
  
  if (isExcluded) {
    return NextResponse.next();
  }
  
  // Check maintenance mode from a static JSON file in public folder
  try {
    const statusUrl = new URL('/maintenance-status.json', request.url);
    const res = await fetch(statusUrl, { cache: 'no-store' });
    
    if (res.ok) {
      const data = await res.json();
      if (data.enabled === true) {
        const maintenanceUrl = new URL('/maintenance', request.url);
        return NextResponse.rewrite(maintenanceUrl);
      }
    }
  } catch {
    // If file doesn't exist or can't be read, continue normally
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
