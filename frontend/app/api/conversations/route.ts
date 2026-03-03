import { NextRequest } from 'next/server';
import { ZodError } from 'zod';
import prisma from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { createConversationSchema } from '@/lib/validations';
import {
    successResponse,
    errorResponse,
    unauthorizedResponse,
    handleValidationError,
} from '@/lib/api-response';

/**
 * GET /api/conversations
 * Get all conversations for the authenticated user
 */
export async function GET(request: NextRequest) {
    try {
        const user = getUserFromRequest(request);

        if (!user) {
            return unauthorizedResponse();
        }

        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = parseInt(searchParams.get('offset') || '0');

        const conversations = await prisma.conversation.findMany({
            where: {
                userId: user.userId,
            },
            orderBy: {
                createdAt: 'desc',
            },
            take: limit,
            skip: offset,
            select: {
                id: true,
                phone: true,
                service: true,
                bookedDate: true,
                bookedTime: true,
                callType: true,
                upsellStatus: true,
                upsellSuggestion: true,
                amount: true,
                outcome: true,
                direction: true,
                durationSeconds: true,
                callStartedAt: true,
                summary: true,
                transcript: true,
                createdAt: true,
                metadata: true,
            },
        });

        const total = await prisma.conversation.count({
            where: {
                userId: user.userId,
            },
        });

        return successResponse({
            conversations,
            pagination: {
                total,
                limit,
                offset,
                hasMore: offset + limit < total,
            },
        });
    } catch (error) {
        return errorResponse('Failed to fetch conversations', null, 500);
    }
}

/**
 * POST /api/conversations
 * Create a new conversation record.
 *
 * Accepts two authentication modes:
 *  1. User JWT cookie  — standard browser client (userId is linked).
 *  2. Bearer <VOICE_AGENT_SECRET> — Python voice agent logging a finished call
 *     (userId stored as null; projectId is captured in metadata instead).
 */
export async function POST(request: NextRequest) {
    try {
        // ── Auth: agent server-to-server (takes priority) ──────────────────
        const authHeader = request.headers.get('authorization') ?? '';
        const agentSecret = process.env.VOICE_AGENT_SECRET ?? '';
        const isAgentRequest =
            agentSecret.length > 0 &&
            authHeader === `Bearer ${agentSecret}`;

        // ── Auth: user JWT cookie ───────────────────────────────────────────
        const user = isAgentRequest ? null : getUserFromRequest(request);

        // Reject browser requests with no valid auth
        if (!isAgentRequest && !user) {
            return unauthorizedResponse();
        }

        const body = await request.json();

        // Validate input (schema is the same for both callers)
        const validatedData = createConversationSchema.parse(body);

        // Create conversation — agent requests store null userId and rely on
        // metadata.projectId to associate the record with a project.
        const conversation = await prisma.conversation.create({
            data: {
                userId: user?.userId ?? null,
                transcript: validatedData.transcript,
                summary: validatedData.summary,
                phone: validatedData.phone ?? null,
                service: validatedData.service ?? null,
                bookedDate: validatedData.bookedDate ?? null,
                bookedTime: validatedData.bookedTime ?? null,
                callType: validatedData.callType ?? null,
                upsellStatus: validatedData.upsellStatus ?? null,
                upsellSuggestion: validatedData.upsellSuggestion ?? null,
                amount: validatedData.amount ?? null,
                outcome: validatedData.outcome ?? null,
                direction: validatedData.direction ?? null,
                durationSeconds: validatedData.durationSeconds ?? null,
                callStartedAt: validatedData.callStartedAt ?? null,
                metadata: validatedData.metadata,
            },
        });

        return successResponse(conversation, 'Conversation saved successfully', 201);
    } catch (error) {
        if (error instanceof ZodError) {
            return handleValidationError(error);
        }

        return errorResponse('Failed to save conversation', null, 500);
    }
}
