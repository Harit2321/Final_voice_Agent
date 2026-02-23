import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import {
    successResponse,
    errorResponse,
    unauthorizedResponse,
} from '@/lib/api-response';

/**
 * GET /api/projects/[projectId]
 * Get a single project by ID for the current user
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string }> }
) {
    try {
        const user = getUserFromRequest(request);

        if (!user) {
            return unauthorizedResponse();
        }

        // Await the params Promise to get the projectId
        const { projectId } = await params;

        const project = await (prisma as any).project.findFirst({
            where: {
                id: projectId,
                userId: user.userId,
            },
            include: {
                services: true,
            },
        });

        if (!project) {
            return errorResponse('Project not found', null, 404);
        }

        return successResponse(project);
    } catch (error) {
        console.error('Error fetching project:', error);
        return errorResponse('Failed to fetch project', null, 500);
    }
}

/**
 * PATCH /api/projects/[projectId]
 * Update a project
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string }> }
) {
    try {
        const user = getUserFromRequest(request);

        if (!user) {
            return unauthorizedResponse();
        }

        const { projectId } = await params;
        const body = await request.json();

        // Check if project exists and belongs to user
        const existingProject = await (prisma as any).project.findFirst({
            where: {
                id: projectId,
                userId: user.userId,
            },
        });

        if (!existingProject) {
            return errorResponse('Project not found', null, 404);
        }

        // Update project
        const updatedProject = await (prisma as any).project.update({
            where: {
                id: projectId,
            },
            data: {
                agentName: body.agentName,
                businessName: body.businessName,
                industry: body.industry,
                language: body.language,
                primaryColor: body.primaryColor,
                greeting: body.greeting,
                voiceId: body.voiceId,
                schedule: body.schedule,
                updatedAt: new Date(),
            },
        });

        return successResponse(updatedProject);
    } catch (error) {
        console.error('Error updating project:', error);
        return errorResponse('Failed to update project', null, 500);
    }
}

/**
 * DELETE /api/projects/[projectId]
 * Delete a project
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ projectId: string }> }
) {
    try {
        const user = getUserFromRequest(request);

        if (!user) {
            return unauthorizedResponse();
        }

        const { projectId } = await params;

        // Check if project exists and belongs to user
        const existingProject = await (prisma as any).project.findFirst({
            where: {
                id: projectId,
                userId: user.userId,
            },
        });

        if (!existingProject) {
            return errorResponse('Project not found', null, 404);
        }

        // Delete project (services will be deleted via cascade if set up, otherwise we should delete manually)
        // For now, assuming basic delete is fine or schema handles cascade
        await (prisma as any).project.delete({
            where: {
                id: projectId,
            },
        });

        return successResponse(null, 'Project deleted successfully');
    } catch (error) {
        console.error('Error deleting project:', error);
        return errorResponse('Failed to delete project', null, 500);
    }
}
