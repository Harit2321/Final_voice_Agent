import { NextRequest } from 'next/server';
import { successResponse } from '@/lib/api-response';

/**
 * POST /api/auth/logout
 * Clear authentication token
 */
export async function POST(request: NextRequest) {
    const response = successResponse(null, 'Logged out successfully');

    // Clear the token cookie
    response.cookies.set('token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0, // Expire immediately
        path: '/',
    });

    return response;
}
