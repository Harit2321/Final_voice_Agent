import { z } from 'zod';

// Auth schemas
export const registerSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    name: z.string().min(2, 'Name must be at least 2 characters').optional(),
    phone: z.string().optional(),
});

export const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
});

// Booking schemas
export const createBookingSchema = z.object({
    serviceId: z.string().uuid('Invalid service ID'),
    scheduledAt: z.string().datetime('Invalid date format'),
    duration: z.number().int().positive('Duration must be positive'),
    notes: z.string().optional(),
});

export const updateBookingSchema = z.object({
    scheduledAt: z.string().datetime('Invalid date format').optional(),
    status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED']).optional(),
    notes: z.string().optional(),
});

// Service schemas
export const createServiceSchema = z.object({
    name: z.string().min(2, 'Service name must be at least 2 characters'),
    description: z.string().optional(),
    duration: z.number().int().positive('Duration must be positive'),
    price: z.number().nonnegative('Price must be non-negative').optional(),
    isActive: z.boolean().default(true),
});

// User update schema
export const updateUserSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').optional(),
    phone: z.string().optional(),
    email: z.string().email('Invalid email address').optional(),
});

// Conversation schema
export const createConversationSchema = z.object({
    transcript: z.record(z.string(), z.any()), // JSON object
    summary: z.string().optional(),
    metadata: z.record(z.string(), z.any()).optional(),
});

// Project schema
export const createProjectSchema = z.object({
    agentName: z.string().min(1, 'Agent name is required'),
    language: z.string().min(1, 'Language is required'),
    greeting: z.string().optional(),
    voiceId: z.string().min(1, 'Voice is required'),
    businessName: z.string().min(1, 'Business name is required'),
    industry: z.string().min(1, 'Industry is required'),
    phone: z.string().min(1, 'Phone number is required'),
    website: z.string().url('Invalid website URL').optional().or(z.literal('')),
    schedule: z.array(z.object({
        day: z.string(),
        enabled: z.boolean(),
        start: z.string(),
        end: z.string(),
    })),
    services: z.array(z.object({
        name: z.string().min(1, 'Service name is required'),
        duration: z.string().or(z.number()),
        price: z.string().or(z.number()).optional(),
    })),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type UpdateBookingInput = z.infer<typeof updateBookingSchema>;
export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type CreateConversationInput = z.infer<typeof createConversationSchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
