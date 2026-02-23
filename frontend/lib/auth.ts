import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export interface JWTPayload {
    userId: string;
    email: string;
    role: string;
}

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(12);
    return bcrypt.hash(password, salt);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
}

/**
 * Generate a JWT token
 */
export function generateToken(payload: JWTPayload): string {
    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN,
    });
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): JWTPayload | null {
    try {
        return jwt.verify(token, JWT_SECRET) as JWTPayload;
    } catch (error) {
        console.error('JWT verification failed:', error);
        return null;
    }
}

/**
 * Extract token from Authorization header or cookies
 */
export function extractToken(request: NextRequest): string | null {
    // Check Authorization header (Bearer token)
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
        return authHeader.substring(7);
    }

    // Check cookies
    const tokenFromCookie = request.cookies.get('token')?.value;
    if (tokenFromCookie) {
        return tokenFromCookie;
    }

    return null;
}

/**
 * Get user from request (verify token and return payload)
 */
export function getUserFromRequest(request: NextRequest): JWTPayload | null {
    const token = extractToken(request);
    if (!token) return null;

    return verifyToken(token);
}
