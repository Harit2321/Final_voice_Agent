import { NextRequest } from 'next/server';
import { ZodError } from 'zod';
import prisma from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { createServiceSchema } from '@/lib/validations';
import {
    successResponse,
    errorResponse,
    unauthorizedResponse,
    forbiddenResponse,
    handleValidationError,
    handleDatabaseError,
} from '@/lib/api-response';

/**
 * GET /api/services
 * Get all active services (public endpoint)
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const includeInactive = searchParams.get('includeInactive') === 'true';

        const where: any = {};

        // Only admins can see inactive services
        if (!includeInactive) {
            where.isActive = true;
        } else {
            const user = getUserFromRequest(request);
            if (!user || user.role !== 'ADMIN') {
                where.isActive = true; // Non-admins always only see active
            }
        }

        const services = await prisma.service.findMany({
            where,
            orderBy: {
                name: 'asc',
            },
        });

        return successResponse(services);
    } catch (error) {
        return errorResponse('Failed to fetch services', null, 500);
    }
}

/**
 * POST /api/services
 * Create a new service (admin only)
 */
export async function POST(request: NextRequest) {
    try {
        const user = getUserFromRequest(request);

        if (!user) {
            return unauthorizedResponse();
        }


        const body = await request.json();

        // Validate input
        const validatedData = createServiceSchema.parse(body);

        // Create service
        const service = await prisma.service.create({
            data: validatedData,
        });

        return successResponse(service, 'Service created successfully', 201);
    } catch (error) {
        if (error instanceof ZodError) {
            return handleValidationError(error);
        }

        return handleDatabaseError(error);
    }
}
