import { NextRequest } from 'next/server';
import { ZodError } from 'zod';
import prisma from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { createProjectSchema } from '@/lib/validations';
import {
    successResponse,
    errorResponse,
    unauthorizedResponse,
    handleValidationError,
    handleDatabaseError,
} from '@/lib/api-response';
import { setupCalComIntegration } from '@/lib/calcom';

/**
 * GET /api/projects
 * Get all projects for the current user
 */
export async function GET(request: NextRequest) {
    try {
        const user = getUserFromRequest(request);

        if (!user) {
            return unauthorizedResponse();
        }

        const projects = await (prisma as any).project.findMany({
            where: {
                userId: user.userId,
            },
            include: {
                services: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        return successResponse(projects);
    } catch (error: any) {
        console.error('❌ GET /api/projects error:', {
            message: error.message,
            code: error.code,
            meta: error.meta,
            stack: error.stack,
        });
        return errorResponse('Failed to fetch projects', null, 500);
    }
}

/**
 * POST /api/projects
 * Create a new project with its services and sync to Cal.com
 */
export async function POST(request: NextRequest) {
    try {
        const user = getUserFromRequest(request);

        if (!user) {
            return unauthorizedResponse();
        }

        const body = await request.json();

        // Validate input
        const validatedData = createProjectSchema.parse(body);

        // Create project and services in a transaction
        const project = await prisma.$transaction(async (tx: any) => {
            const newProject = await tx.project.create({
                data: {
                    userId: user.userId,
                    agentName: validatedData.agentName,
                    language: validatedData.language,
                    greeting: validatedData.greeting,
                    voiceId: validatedData.voiceId,
                    businessName: validatedData.businessName,
                    industry: validatedData.industry,
                    phone: validatedData.phone,
                    website: validatedData.website,
                    schedule: validatedData.schedule as any, // Json type
                },
            });

            // Create services associated with this project
            if (validatedData.services && validatedData.services.length > 0) {
                await Promise.all(
                    validatedData.services.map((service) =>
                        tx.service.create({
                            data: {
                                name: service.name,
                                duration: typeof service.duration === 'string' ? parseInt(service.duration) : service.duration,
                                price: service.price ? (typeof service.price === 'string' ? parseFloat(service.price) : service.price) : null,
                                projectId: newProject.id,
                            },
                        })
                    )
                );
            }

            return tx.project.findUnique({
                where: { id: newProject.id },
                include: { services: true },
            });
        });

        // After successfully saving to database, sync to Cal.com
        // IMPORTANT: This is called immediately after DB save completes
        let calComStatus = {
            synced: false,
            message: 'Cal.com sync not attempted',
            details: null as any
        };

        if (project && validatedData.services && validatedData.services.length > 0) {
            console.log('🔄 Syncing project to Cal.com immediately after DB save...');

            try {
                // Prepare services for Cal.com
                const calComServices = validatedData.services.map(service => ({
                    name: service.name,
                    duration: typeof service.duration === 'string' ? parseInt(service.duration) : service.duration,
                    price: service.price ? (typeof service.price === 'string' ? parseFloat(service.price) : service.price) : null,
                }));

                // Prepare schedule for Cal.com
                const calComSchedule = Array.isArray(validatedData.schedule)
                    ? validatedData.schedule.map((day: any) => ({
                        day: day.day,
                        enabled: day.enabled,
                        start: day.start,
                        end: day.end,
                    }))
                    : [];

                // AWAIT the Cal.com integration to ensure it completes
                const calComResult = await setupCalComIntegration(calComServices, calComSchedule);

                if (calComResult.success) {
                    const servicesCreated = calComResult.servicesResult?.results?.filter((r: any) => r.success).length || 0;

                    console.log('✅ Cal.com integration successful:', {
                        projectId: project.id,
                        servicesCreated,
                        scheduleCreated: calComResult.scheduleResult?.success
                    });

                    calComStatus = {
                        synced: true,
                        message: `Successfully synced ${servicesCreated} service(s) to Cal.com`,
                        details: {
                            servicesCreated,
                            scheduleCreated: calComResult.scheduleResult?.success,
                            results: calComResult.servicesResult?.results
                        }
                    };
                } else {
                    console.error('❌ Cal.com integration failed:', calComResult.error);
                    calComStatus = {
                        synced: false,
                        message: 'Cal.com sync failed, but project was created successfully',
                        details: { error: calComResult.error }
                    };
                }
            } catch (error: any) {
                console.error('❌ Cal.com integration error:', error);
                calComStatus = {
                    synced: false,
                    message: 'Cal.com sync encountered an error',
                    details: { error: error.message }
                };
                // Don't fail the project creation if Cal.com sync fails
            }
        }

        // Return project data with Cal.com sync status
        return successResponse(
            {
                ...project,
                calComSync: calComStatus
            },
            calComStatus.synced
                ? 'Project created and synced to Cal.com successfully'
                : 'Project created successfully (Cal.com sync pending)',
            201
        );
    } catch (error: any) {
        if (error instanceof ZodError) {
            return handleValidationError(error);
        }

        console.error('Project creation error details:', {
            message: error.message,
            code: error.code,
            meta: error.meta,
            stack: error.stack
        });
        return handleDatabaseError(error);
    }
}
