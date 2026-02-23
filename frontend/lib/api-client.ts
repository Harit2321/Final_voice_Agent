/**
 * Frontend API Client
 * Utility functions to interact with backend API endpoints
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    details?: any;
    message?: string;
}

/**
 * Generic fetch wrapper with error handling
 */
async function fetcher<T = any>(
    endpoint: string,
    options?: RequestInit
): Promise<ApiResponse<T>> {
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options?.headers,
            },
            credentials: 'include', // Include cookies
        });

        const data = await response.json();

        if (!response.ok) {
            return {
                success: false,
                error: data.error || 'An error occurred',
                details: data.details,
            };
        }

        return data;
    } catch (error) {
        console.error('API Error:', error);
        return {
            success: false,
            error: 'Network error occurred',
        };
    }
}

// ==================== AUTH API ====================

export const authApi = {
    /**
     * Register a new user
     */
    register: async (data: {
        email: string;
        password: string;
        name?: string;
        phone?: string;
    }) => {
        return fetcher('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    /**
     * Login user
     */
    login: async (data: { email: string; password: string }) => {
        return fetcher('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    /**
     * Logout user
     */
    logout: async () => {
        return fetcher('/api/auth/logout', {
            method: 'POST',
        });
    },

    /**
     * Get current user
     */
    me: async () => {
        return fetcher('/api/auth/me');
    },
};

// ==================== BOOKINGS API ====================

export const bookingsApi = {
    /**
     * Get all bookings
     */
    getAll: async (filters?: {
        status?: string;
        startDate?: string;
        endDate?: string;
    }) => {
        const params = new URLSearchParams();
        if (filters?.status) params.append('status', filters.status);
        if (filters?.startDate) params.append('startDate', filters.startDate);
        if (filters?.endDate) params.append('endDate', filters.endDate);

        const query = params.toString() ? `?${params.toString()}` : '';
        return fetcher(`/api/bookings${query}`);
    },

    /**
     * Get single booking
     */
    getById: async (id: string) => {
        return fetcher(`/api/bookings/${id}`);
    },

    /**
     * Create new booking
     */
    create: async (data: {
        serviceId: string;
        scheduledAt: string;
        duration: number;
        notes?: string;
    }) => {
        return fetcher('/api/bookings', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    /**
     * Update booking
     */
    update: async (
        id: string,
        data: {
            scheduledAt?: string;
            status?: string;
            notes?: string;
        }
    ) => {
        return fetcher(`/api/bookings/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    },

    /**
     * Cancel booking
     */
    cancel: async (id: string) => {
        return fetcher(`/api/bookings/${id}`, {
            method: 'DELETE',
        });
    },
};

// ==================== SERVICES API ====================

export const servicesApi = {
    /**
     * Get all services
     */
    getAll: async (includeInactive = false) => {
        const query = includeInactive ? '?includeInactive=true' : '';
        return fetcher(`/api/services${query}`);
    },

    /**
     * Create service (admin only)
     */
    create: async (data: {
        name: string;
        description?: string;
        duration: number;
        price?: number;
        isActive?: boolean;
    }) => {
        return fetcher('/api/services', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },
};

// ==================== USERS API ====================

export const usersApi = {
    /**
     * Get user profile
     */
    getProfile: async (userId: string) => {
        return fetcher(`/api/users/${userId}`);
    },

    /**
     * Update user profile
     */
    updateProfile: async (
        userId: string,
        data: {
            name?: string;
            phone?: string;
            email?: string;
        }
    ) => {
        return fetcher(`/api/users/${userId}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    },
};

// ==================== CONVERSATIONS API ====================

export const conversationsApi = {
    /**
     * Get all conversations
     */
    getAll: async (pagination?: { limit?: number; offset?: number }) => {
        const params = new URLSearchParams();
        if (pagination?.limit) params.append('limit', pagination.limit.toString());
        if (pagination?.offset) params.append('offset', pagination.offset.toString());

        const query = params.toString() ? `?${params.toString()}` : '';
        return fetcher(`/api/conversations${query}`);
    },

    /**
     * Save conversation
     */
    save: async (data: {
        transcript: Record<string, any>;
        summary?: string;
        metadata?: Record<string, any>;
    }) => {
        return fetcher('/api/conversations', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },
};
