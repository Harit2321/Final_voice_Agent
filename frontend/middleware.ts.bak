import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Public routes that don't require authentication
    const publicRoutes = [
        '/api/auth/login',
        '/api/auth/register',
        '/api/services', // Services are public (read-only)
    ];

    // Check if the route is public
    const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));

    if (isPublicRoute) {
        return NextResponse.next();
    }

    // Check for authentication token
    const token = request.cookies.get('token')?.value || request.headers.get('authorization')?.replace('Bearer ', '');

    if (!token && pathname.startsWith('/api/')) {
        // API routes require authentication (except public ones)
        return NextResponse.json(
            {
                success: false,
                error: 'Authentication required',
            },
            { status: 401 }
        );
    }

    // Protected pages (non-API routes)
    const protectedPages = ['/dashboard', '/profile', '/bookings'];

    if (!token && protectedPages.some((page) => pathname.startsWith(page))) {
        // Redirect to login page
        const url = request.nextUrl.clone();
        url.pathname = '/login';
        url.searchParams.set('redirect', pathname);
        return NextResponse.redirect(url);
    }

    // Guest-only pages (redirect to dashboard if already logged in)
    const guestOnlyPages = ['/login', '/register'];

    if (token && guestOnlyPages.some((page) => pathname.startsWith(page))) {
        const url = request.nextUrl.clone();
        url.pathname = '/dashboard';
        return NextResponse.redirect(url);
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder
         */
        '/((?!_next/static|_next/image|favicon.ico|public).*)',
    ],
};
