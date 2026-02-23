import { NextRequest } from 'next/server';
import { ZodError } from 'zod';
import prisma from '@/lib/db';
import { verifyPassword, generateToken } from '@/lib/auth';
import { loginSchema } from '@/lib/validations';
import { successResponse, errorResponse, handleValidationError } from '@/lib/api-response';

/**
 * POST /api/auth/login
 * Authenticate a user and return JWT token
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Validate input
        const validatedData = loginSchema.parse(body);

        // Find user by email
        const user = await prisma.user.findUnique({
            where: { email: validatedData.email },
        });

        if (!user) {
            return errorResponse('Invalid email or password', null, 401);
        }

        // Verify password
        const isPasswordValid = await verifyPassword(validatedData.password, user.passwordHash);

        if (!isPasswordValid) {
            return errorResponse('Invalid email or password', null, 401);
        }

        // Generate JWT token
        const token = generateToken({
            userId: user.id,
            email: user.email,
            role: user.role,
        });

        // Return user data without password
        const { passwordHash, ...userWithoutPassword } = user;

        // Set token in HTTP-only cookie
        const response = successResponse(
            {
                user: userWithoutPassword,
                token,
            },
            'Login successful'
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

        return errorResponse('An error occurred during login', null, 500);
    }
}
