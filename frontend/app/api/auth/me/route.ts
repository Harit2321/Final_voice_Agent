import { NextRequest } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import prisma from '@/lib/db';
import { successResponse, unauthorizedResponse, errorResponse } from '@/lib/api-response';

/**
 * GET /api/auth/me
 * Get current authenticated user
 */
export async function GET(request: NextRequest) {
    try {
        // Get user from JWT token
        const tokenPayload = getUserFromRequest(request);

        if (!tokenPayload) {
            return unauthorizedResponse('Not authenticated');
        }

        // Fetch full user data from database
        const user = await prisma.user.findUnique({
            where: { id: tokenPayload.userId },
            select: {
                id: true,
                email: true,
                name: true,
                phone: true,
                role: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        if (!user) {
            return unauthorizedResponse('User not found');
        }

        return successResponse(user);
    } catch (error) {
        return errorResponse('Failed to fetch user data', null, 500);
    }
}
