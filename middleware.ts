import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const token = request.cookies.get('adminToken')?.value;
    const { pathname } = request.nextUrl;

    // Define public paths
    const publicPaths = ['/login'];
    const isPublicPath = publicPaths.includes(pathname);

    // If user is logged in and tries to access login, redirect to dashboard
    if (token && isPublicPath) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // If user is NOT logged in and tries to access any non-public path (except static files), redirect to login
    if (!token && !isPublicPath) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    return NextResponse.next();
}

// Match all request paths except for the ones starting with:
// - api (API routes)
// - _next/static (static files)
// - _next/image (image optimization files)
// - favicon.ico (favicon file)
export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
