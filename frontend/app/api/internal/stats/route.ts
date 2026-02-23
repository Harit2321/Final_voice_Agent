import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/api-response';

/**
 * GET /api/internal/stats?projectId=<id>
 *
 * Returns call + booking statistics for a project by reading the Conversation
 * table, where each row's JSON metadata field contains { projectId, outcome }.
 *
 * Accepts two auth modes:
 *   1. User JWT cookie (dashboard fetching its own project stats)
 *   2. Bearer <VOICE_AGENT_SECRET> (internal / agent-side)
 */
export async function GET(request: NextRequest) {
    try {
        // ── Auth ─────────────────────────────────────────────────────────────
        const authHeader = request.headers.get('authorization') ?? '';
        const agentSecret = process.env.VOICE_AGENT_SECRET ?? '';
        const isAgentRequest =
            agentSecret.length > 0 && authHeader === `Bearer ${agentSecret}`;

        const user = isAgentRequest ? null : getUserFromRequest(request);

        if (!isAgentRequest && !user) {
            return unauthorizedResponse();
        }

        // ── Params ────────────────────────────────────────────────────────────
        const { searchParams } = new URL(request.url);
        const projectId = searchParams.get('projectId');

        if (!projectId) {
            return errorResponse('projectId query parameter is required', null, 400);
        }

        // ── Query all conversations for this project ───────────────────────────
        // metadata is stored as JSON; we fetch all rows and filter in JS because
        // Prisma's JSON path filtering syntax differs between SQLite and Postgres.
        const conversations = await prisma.conversation.findMany({
            select: {
                id: true,
                metadata: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
        });

        // Filter to this project
        const projectConvs = conversations.filter((c) => {
            const meta = c.metadata as Record<string, any> | null;
            return meta?.projectId === projectId;
        });

        // Count calls (each conversation = one call)
        const totalCalls = projectConvs.length;

        // Count bookings — outcome starts with "booked:"
        const totalBookings = projectConvs.filter((c) => {
            const meta = c.metadata as Record<string, any> | null;
            return typeof meta?.outcome === 'string' && meta.outcome.startsWith('booked:');
        }).length;

        // Booking conversion rate (percentage, 0–100)
        const bookingRate =
            totalCalls > 0 ? Math.round((totalBookings / totalCalls) * 100) : 0;

        return successResponse({
            projectId,
            calls: totalCalls,
            bookings: totalBookings,
            bookingRate,
        });
    } catch (error) {
        console.error('[api/internal/stats] error:', error);
        return errorResponse('Failed to fetch stats', null, 500);
    }
}
