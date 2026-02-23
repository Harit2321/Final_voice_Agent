import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export interface ApiSuccessResponse<T = any> {
    success: true;
    data: T;
    message?: string;
}

export interface ApiErrorResponse {
    success: false;
    error: string;
    details?: any;
}

export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Create a success response
 */
export function successResponse<T>(data: T, message?: string, status = 200): NextResponse<ApiSuccessResponse<T>> {
    return NextResponse.json(
        {
            success: true,
            data,
            message,
        },
        { status }
    );
}

/**
 * Create an error response
 */
export function errorResponse(error: string, details?: any, status = 400): NextResponse<ApiErrorResponse> {
    return NextResponse.json(
        {
            success: false,
            error,
            details,
        },
        { status }
    );
}

/**
 * Handle Zod validation errors
 */
export function handleValidationError(error: ZodError): NextResponse<ApiErrorResponse> {
    const formattedErrors = error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
    }));

    return errorResponse('Validation failed', formattedErrors, 400);
}

/**
 * Handle database errors
 */
export function handleDatabaseError(error: any): NextResponse<ApiErrorResponse> {
    console.error('Database error:', error);

    // Prisma unique constraint violation
    if (error.code === 'P2002') {
        return errorResponse('A record with this value already exists', { field: error.meta?.target }, 409);
    }

    // Prisma record not found
    if (error.code === 'P2025') {
        return errorResponse('Record not found', null, 404);
    }

    // Generic database error
    return errorResponse('Database error occurred', null, 500);
}

/**
 * Handle authentication errors
 */
export function unauthorizedResponse(message = 'Unauthorized'): NextResponse<ApiErrorResponse> {
    return errorResponse(message, null, 401);
}

/**
 * Handle forbidden errors
 */
export function forbiddenResponse(message = 'Forbidden'): NextResponse<ApiErrorResponse> {
    return errorResponse(message, null, 403);
}

/**
 * Handle not found errors
 */
export function notFoundResponse(message = 'Resource not found'): NextResponse<ApiErrorResponse> {
    return errorResponse(message, null, 404);
}
