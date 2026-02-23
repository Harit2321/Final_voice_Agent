import { NextRequest, NextResponse } from 'next/server';
import { AccessToken } from 'livekit-server-sdk';
import { getUserFromRequest } from '@/lib/auth';
import {
    successResponse,
    errorResponse,
    unauthorizedResponse,
} from '@/lib/api-response';
import prisma from '@/lib/db';

/**
 * POST /api/livekit/token
 * Generate a LiveKit access token for a specific project/agent
 * 
 * Request Body:
 * {
 *   "projectId": "string"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
 *     "url": "wss://your-livekit-server.com",
 *     "room": "project-abc123",
 *     "identity": "user-xyz789"
 *   }
 * }
 */
export async function POST(request: NextRequest) {
    try {
        const user = getUserFromRequest(request);

        if (!user) {
            return unauthorizedResponse();
        }

        // Parse request body
        const body = await request.json();
        const { projectId } = body;

        if (!projectId) {
            return errorResponse('projectId is required', null, 400);
        }

        // Verify the project exists and belongs to the user
        const project = await (prisma as any).project.findFirst({
            where: {
                id: projectId,
                userId: user.userId,
            },
        });

        if (!project) {
            return errorResponse('Project not found', null, 404);
        }

        // Get LiveKit credentials from environment
        const apiKey = process.env.LIVEKIT_API_KEY;
        const apiSecret = process.env.LIVEKIT_API_SECRET;
        const wsUrl = process.env.LIVEKIT_WS_URL;

        if (!apiKey || !apiSecret || !wsUrl) {
            console.error('LiveKit configuration missing:', {
                hasApiKey: !!apiKey,
                hasApiSecret: !!apiSecret,
                hasWsUrl: !!wsUrl,
            });
            return errorResponse(
                'LiveKit is not configured. Please set LIVEKIT_API_KEY, LIVEKIT_API_SECRET, and LIVEKIT_WS_URL in your environment variables.',
                null,
                500
            );
        }

        // Generate unique room name based on projectId
        const roomName = `project-${projectId}`;

        // Generate unique identity for the participant (user)
        const identity = `user-${user.userId}-${Date.now()}`;

        // Create access token
        const token = new AccessToken(apiKey, apiSecret, {
            identity: identity,
            metadata: JSON.stringify({
                projectId: projectId,
                agentName: project.agentName,
                businessName: project.businessName,
                userId: user.userId,
            }),
        });

        // Grant permissions    
        token.addGrant({
            room: roomName,
            roomJoin: true,
            canPublish: true,
            canSubscribe: true,
            canPublishData: true,
        });

        // Generate the JWT token
        const jwt = await token.toJwt();

        return successResponse(
            {
                token: jwt,
                url: wsUrl,
                room: roomName,
                identity: identity,
                project: {
                    id: project.id,
                    agentName: project.agentName,
                    businessName: project.businessName,
                },
            },
            'LiveKit token generated successfully'
        );
    } catch (error: any) {
        console.error('LiveKit token generation error:', error);
        return errorResponse(
            'Failed to generate LiveKit token',
            error.message,
            500
        );
    }
}
