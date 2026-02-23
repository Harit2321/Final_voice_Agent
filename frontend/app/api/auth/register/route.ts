import { NextRequest } from 'next/server';
import { ZodError } from 'zod';
import prisma from '@/lib/db';
import { hashPassword, generateToken } from '@/lib/auth';
import { registerSchema } from '@/lib/validations';
import { successResponse, errorResponse, handleValidationError, handleDatabaseError } from '@/lib/api-response';

/**
 * POST /api/auth/register
 * Register a new user
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Validate input
        const validatedData = registerSchema.parse(body);

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email: validatedData.email },
        });

        if (existingUser) {
            return errorResponse('User with this email already exists', null, 409);
        }

        // Hash password
        const passwordHash = await hashPassword(validatedData.password);

        // Create user
        const user = await prisma.user.create({
            data: {
                email: validatedData.email,
                passwordHash,
                name: validatedData.name || null,
                phone: validatedData.phone || null,
            },
            select: {
                id: true,
                email: true,
                name: true,
                phone: true,
                role: true,
                createdAt: true,
            },
        });

        // Generate JWT token
        const token = generateToken({
            userId: user.id,
            email: user.email,
            role: user.role,
        });

        // Set token in HTTP-only cookie
        const response = successResponse(
            {
                user,
                token,
            },
            'User registered successfully',
            201
        );

        response.cookies.set('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7, // 7 days
            path: '/',
        });

        return response;
    } catch (error) {
        if (error instanceof ZodError) {
            return handleValidationError(error);
        }

        return handleDatabaseError(error);
    }
}
