import { NextRequest } from 'next/server';
import { ZodError } from 'zod';
import prisma from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { updateUserSchema } from '@/lib/validations';
import {
    successResponse,
    errorResponse,
    unauthorizedResponse,
    notFoundResponse,
    forbiddenResponse,
    handleValidationError,
} from '@/lib/api-response';

/**
 * GET /api/users/[id]
 * Get user profile by ID
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const currentUser = getUserFromRequest(request);

        if (!currentUser) {
            return unauthorizedResponse();
        }

        // Users can only view their own profile unless they're admin
        if (params.id !== currentUser.userId && currentUser.role !== 'ADMIN') {
            return forbiddenResponse('You do not have permission to view this profile');
        }

        const user = await prisma.user.findUnique({
            where: { id: params.id },
            select: {
                id: true,
                email: true,
                name: true,
                phone: true,
                role: true,
                createdAt: true,
                updatedAt: true,
                _count: {
                    select: {
                        bookings: true,
                        conversations: true,
                    },
                },
            },
        });

        if (!user) {
            return notFoundResponse('User not found');
        }

        return successResponse(user);
    } catch (error) {
        return errorResponse('Failed to fetch user', null, 500);
    }
}

/**
 * PUT /api/users/[id]
 * Update user profile
 */
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const currentUser = getUserFromRequest(request);

        if (!currentUser) {
            return unauthorizedResponse();
        }

        // Users can only update their own profile unless they're admin
        if (params.id !== currentUser.userId && currentUser.role !== 'ADMIN') {
            return forbiddenResponse('You do not have permission to update this profile');
        }

        const body = await request.json();

        // Validate input
        const validatedData = updateUserSchema.parse(body);

        // Check if email is being changed and is unique
        if (validatedData.email) {
            const existingUser = await prisma.user.findUnique({
                where: { email: validatedData.email },
            });

            if (existingUser && existingUser.id !== params.id) {
                return errorResponse('Email is already in use', null, 409);
            }
        }

        // Update user
        const updatedUser = await prisma.user.update({
            where: { id: params.id },
            data: validatedData,
            select: {
                id: true,
                email: true,
                name: true,
                phone: true,
                role: true,
                updatedAt: true,
            },
        });

        return successResponse(updatedUser, 'Profile updated successfully');
    } catch (error) {
        if (error instanceof ZodError) {
            return handleValidationError(error);
        }

        return errorResponse('Failed to update profile', null, 500);
    }
}
