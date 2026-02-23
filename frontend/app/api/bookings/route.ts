import { NextRequest } from 'next/server';
import { ZodError } from 'zod';
import prisma from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { createBookingSchema } from '@/lib/validations';
import {
    successResponse,
    errorResponse,
    unauthorizedResponse,
    handleValidationError,
    handleDatabaseError,
} from '@/lib/api-response';

/**
 * GET /api/bookings
 * Get all bookings for the authenticated user
 */
export async function GET(request: NextRequest) {
    try {
        const user = getUserFromRequest(request);

        if (!user) {
            return unauthorizedResponse();
        }

        // Get query parameters for filtering
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        // Build filter object
        const where: any = { userId: user.userId };

        if (status) {
            where.status = status;
        }

        if (startDate || endDate) {
            where.scheduledAt = {};
            if (startDate) {
                where.scheduledAt.gte = new Date(startDate);
            }
            if (endDate) {
                where.scheduledAt.lte = new Date(endDate);
            }
        }

        // Fetch bookings with service details
        const bookings = await prisma.booking.findMany({
            where,
            include: {
                service: {
                    select: {
                        id: true,
                        name: true,
                        description: true,
                        duration: true,
                        price: true,
                    },
                },
            },
            orderBy: {
                scheduledAt: 'desc',
            },
        });

        return successResponse(bookings);
    } catch (error) {
        return errorResponse('Failed to fetch bookings', null, 500);
    }
}

/**
 * POST /api/bookings
 * Create a new booking
 */
export async function POST(request: NextRequest) {
    try {
        const user = getUserFromRequest(request);

        if (!user) {
            return unauthorizedResponse();
        }

        const body = await request.json();

        // Validate input
        const validatedData = createBookingSchema.parse(body);

        // Check if service exists
        const service = await prisma.service.findUnique({
            where: { id: validatedData.serviceId },
        });

        if (!service) {
            return errorResponse('Service not found', null, 404);
        }

        if (!service.isActive) {
            return errorResponse('Service is not available', null, 400);
        }

        // Check for scheduling conflicts (optional: same user, overlapping time)
        const scheduledAt = new Date(validatedData.scheduledAt);
        const endTime = new Date(scheduledAt.getTime() + validatedData.duration * 60000);

        const conflictingBooking = await prisma.booking.findFirst({
            where: {
                userId: user.userId,
                status: {
                    in: ['PENDING', 'CONFIRMED'],
                },
                OR: [
                    {
                        // New booking starts during existing booking
                        AND: [
                            { scheduledAt: { lte: scheduledAt } },
                            {
                                scheduledAt: {
                                    gte: new Date(scheduledAt.getTime() - service.duration * 60000),
                                },
                            },
                        ],
                    },
                    {
                        // New booking ends during existing booking
                        AND: [
                            { scheduledAt: { lte: endTime } },
                            {
                                scheduledAt: {
                                    gte: new Date(endTime.getTime() - service.duration * 60000),
                                },
                            },
                        ],
                    },
                ],
            },
        });

        if (conflictingBooking) {
            return errorResponse('You already have a booking at this time', null, 409);
        }

        // Create booking
        const booking = await prisma.booking.create({
            data: {
                userId: user.userId,
                serviceId: validatedData.serviceId,
                scheduledAt,
                duration: validatedData.duration,
                notes: validatedData.notes,
                status: 'PENDING',
            },
            include: {
                service: {
                    select: {
                        id: true,
                        name: true,
                        description: true,
                        duration: true,
                        price: true,
                    },
                },
            },
        });

        return successResponse(booking, 'Booking created successfully', 201);
    } catch (error) {
        if (error instanceof ZodError) {
            return handleValidationError(error);
        }

        return handleDatabaseError(error);
    }
}
