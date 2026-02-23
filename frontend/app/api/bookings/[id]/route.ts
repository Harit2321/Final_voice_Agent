import { NextRequest } from 'next/server';
import { ZodError } from 'zod';
import prisma from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { updateBookingSchema } from '@/lib/validations';
import {
    successResponse,
    errorResponse,
    unauthorizedResponse,
    notFoundResponse,
    forbiddenResponse,
    handleValidationError,
} from '@/lib/api-response';

/**
 * GET /api/bookings/[id]
 * Get a single booking by ID
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const user = getUserFromRequest(request);

        if (!user) {
            return unauthorizedResponse();
        }

        const booking = await prisma.booking.findUnique({
            where: { id: params.id },
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
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                    },
                },
            },
        });

        if (!booking) {
            return notFoundResponse('Booking not found');
        }

        // Check if user owns this booking or is admin
        if (booking.userId !== user.userId && user.role !== 'ADMIN') {
            return forbiddenResponse('You do not have permission to view this booking');
        }

        return successResponse(booking);
    } catch (error) {
        return errorResponse('Failed to fetch booking', null, 500);
    }
}

/**
 * PUT /api/bookings/[id]
 * Update a booking (reschedule or change status)
 */
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const user = getUserFromRequest(request);

        if (!user) {
            return unauthorizedResponse();
        }

        // Check if booking exists and user owns it
        const existingBooking = await prisma.booking.findUnique({
            where: { id: params.id },
        });

        if (!existingBooking) {
            return notFoundResponse('Booking not found');
        }

        if (existingBooking.userId !== user.userId && user.role !== 'ADMIN') {
            return forbiddenResponse('You do not have permission to update this booking');
        }

        const body = await request.json();

        // Validate input
        const validatedData = updateBookingSchema.parse(body);

        // Update booking
        const updatedBooking = await prisma.booking.update({
            where: { id: params.id },
            data: {
                ...validatedData,
                scheduledAt: validatedData.scheduledAt ? new Date(validatedData.scheduledAt) : undefined,
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

        return successResponse(updatedBooking, 'Booking updated successfully');
    } catch (error) {
        if (error instanceof ZodError) {
            return handleValidationError(error);
        }

        return errorResponse('Failed to update booking', null, 500);
    }
}

/**
 * DELETE /api/bookings/[id]
 * Cancel/delete a booking
 */
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const user = getUserFromRequest(request);

        if (!user) {
            return unauthorizedResponse();
        }

        // Check if booking exists and user owns it
        const existingBooking = await prisma.booking.findUnique({
            where: { id: params.id },
        });

        if (!existingBooking) {
            return notFoundResponse('Booking not found');
        }

        if (existingBooking.userId !== user.userId && user.role !== 'ADMIN') {
            return forbiddenResponse('You do not have permission to cancel this booking');
        }

        // Soft delete by updating status to CANCELLED
        const cancelledBooking = await prisma.booking.update({
            where: { id: params.id },
            data: { status: 'CANCELLED' },
        });

        return successResponse(cancelledBooking, 'Booking cancelled successfully');
    } catch (error) {
        return errorResponse('Failed to cancel booking', null, 500);
    }
}
