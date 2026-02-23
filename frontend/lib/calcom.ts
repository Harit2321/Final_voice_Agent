/**
 * Cal.com API Integration Service
 * 
 * This service handles:
 * - Creating event types (services) in Cal.com
 * - Setting up availability schedules
 * - Syncing project data with Cal.com
 */

const CAL_COM_API_KEY = process.env.CAL_COM_API_KEY;
const CAL_COM_API_URL = process.env.CAL_COM_API_URL || 'https://api.cal.com/v2';
const CAL_USERNAME = process.env.CAL_USERNAME || 'yash-shah-zjopbw';

interface Service {
    name: string;
    duration: number; // in minutes
    price?: number | null;
}

interface DaySchedule {
    day: string;
    enabled: boolean;
    start: string; // HH:MM format
    end: string;   // HH:MM format
}

interface CalComEventType {
    id: number;
    title: string;
    slug: string;
    length: number;
}

interface CalComAvailability {
    id: number;
    days: number[]; // 0=Sunday, 1=Monday, etc.
    startTime: string;
    endTime: string;
}

/**
 * Create an event type (service) in Cal.com
 */
export async function createCalComEventType(service: Service): Promise<{ success: boolean; eventTypeId?: number; error?: string }> {
    try {
        if (!CAL_COM_API_KEY) {
            console.error('Cal.com API key is not configured');
            return { success: false, error: 'Cal.com API key not configured' };
        }

        // Generate a URL-friendly slug from service name
        const slug = service.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
            .substring(0, 50);

        const payload = {
            title: service.name,
            slug,
            length: service.duration,
            description: service.price ? `Price: $${service.price}` : undefined,

            // Phone call location (this auto-creates phone field)
            locations: [
                {
                    type: 'phone'
                }
            ],

            bookingFields: [
                {
                    name: 'name',
                    type: 'name',
                    label: 'Full Name',
                    required: true
                },
                {
                    name: 'email',
                    type: 'email',
                    label: 'Email address',
                    required: false
                }
            ]
        };


        console.log('Creating Cal.com event type:', payload);

        const response = await fetch(`${CAL_COM_API_URL}/event-types`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${CAL_COM_API_KEY}`,
                'Content-Type': 'application/json',
                'cal-api-version': '2024-08-13'
            },
            body: JSON.stringify(payload)
        });

        const responseText = await response.text();
        console.log('Cal.com create event type response:', response.status, responseText);

        if (!response.ok) {
            // Try V1 API as fallback
            console.log('Trying V1 API fallback...');
            return await createCalComEventTypeV1(service);
        }

        const data = JSON.parse(responseText);
        const eventTypeId = data.data?.id || data.id;

        return {
            success: true,
            eventTypeId: eventTypeId
        };
    } catch (error: any) {
        console.error('Error creating Cal.com event type:', error);
        return {
            success: false,
            error: error.message || 'Failed to create event type'
        };
    }
}

/**
 * Fallback to V1 API for event type creation
 */
async function createCalComEventTypeV1(service: Service): Promise<{ success: boolean; eventTypeId?: number; error?: string }> {
    try {
        const slug = service.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
            .substring(0, 50);

        const response = await fetch(`https://api.cal.com/v1/event-types?apiKey=${CAL_COM_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: service.name,
                slug: slug,
                length: service.duration,
                description: service.price ? `Price: $${service.price}` : undefined,
                locations: [
                    {
                        type: 'phone',
                        phone: ''
                    }
                ],
                hidden: false,
                // Booking fields: Name (required), Phone (required), Email (optional)
                bookingFields: [
                    {
                        name: 'name',
                        type: 'name',
                        required: true
                    },
                    {
                        name: 'email',
                        type: 'email',
                        required: false
                    }
                ]

            })
        });

        const data = await response.json();
        console.log('V1 API response:', data);

        if (!response.ok) {
            return {
                success: false,
                error: data.message || 'Failed to create event type via V1 API'
            };
        }

        return {
            success: true,
            eventTypeId: data.event_type?.id
        };
    } catch (error: any) {
        console.error('V1 API error:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Map day names to Cal.com day numbers
 */
function getDayNumber(dayName: string): number {
    const dayMap: Record<string, number> = {
        'Sunday': 0,
        'Monday': 1,
        'Tuesday': 2,
        'Wednesday': 3,
        'Thursday': 4,
        'Friday': 5,
        'Saturday': 6
    };
    return dayMap[dayName] ?? -1;
}

/**
 * Convert HH:MM to minutes since midnight
 */
function timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
}

/**
 * Set up availability schedule in Cal.com using V1 /schedules API
 * Note: V2 /schedules endpoint returns 404, so we use V1 API
 */
export async function createCalComSchedule(schedule: DaySchedule[]): Promise<{ success: boolean; scheduleId?: number; error?: string }> {
    try {
        if (!CAL_COM_API_KEY) {
            console.error('Cal.com API key is not configured');
            return { success: false, error: 'Cal.com API key not configured' };
        }

        // Build availability blocks for each day
        const availabilityBlocks = [];

        for (const day of schedule) {
            if (!day.enabled) continue;

            const dayNum = getDayNumber(day.day);
            if (dayNum === -1) continue;

            // Cal.com V1 expects time in "HH:mm:00" format
            const startTime = `${day.start}:00`;
            const endTime = `${day.end}:00`;

            availabilityBlocks.push({
                days: [dayNum],
                startTime: startTime,
                endTime: endTime
            });
        }

        if (availabilityBlocks.length === 0) {
            console.log('⚠️  No availability to set up (all days disabled)');
            return { success: true }; // Not an error, just no schedule
        }

        // Use V1 /schedules endpoint which supports POST
        const payload = {
            name: `Business Hours ${Date.now()}`,
            timeZone: 'Asia/Kolkata',
            availability: availabilityBlocks
        };

        console.log('📅 Creating Cal.com schedule via V1 /schedules:', JSON.stringify(payload, null, 2));

        // Call Cal.com V1 Schedules API
        const response = await fetch(`https://api.cal.com/v1/schedules?apiKey=${CAL_COM_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const responseText = await response.text();
        console.log(`📅 Cal.com V1 /schedules response [${response.status}]:`, responseText);

        if (!response.ok) {
            console.error('❌ V1 Schedule creation failed');
            return {
                success: false,
                error: `Schedules API failed: ${response.status} - ${responseText}`
            };
        }

        const data = JSON.parse(responseText);
        const scheduleId = data.schedule?.id || data.id;

        console.log('✅ Cal.com schedule created successfully! ID:', scheduleId);

        return {
            success: true,
            scheduleId: scheduleId
        };
    } catch (error: any) {
        console.error('❌ Error creating Cal.com schedule:', error);
        // Don't fail the entire flow
        return {
            success: false,
            error: error.message || 'Failed to create schedule'
        };
    }
}

/**
 * Sync all services to Cal.com
 */
export async function syncServicesToCalCom(services: Service[]): Promise<{
    success: boolean;
    results: Array<{ service: string; success: boolean; eventTypeId?: number; error?: string }>;
    error?: string;
}> {
    try {
        const results = [];

        for (const service of services) {
            const result = await createCalComEventType(service);
            results.push({
                service: service.name,
                ...result
            });
        }

        const allSuccessful = results.every(r => r.success);

        return {
            success: allSuccessful,
            results
        };
    } catch (error: any) {
        console.error('Error syncing services to Cal.com:', error);
        return {
            success: false,
            results: [],
            error: error.message
        };
    }
}

/**
 * Link a schedule to an event type
 */
async function linkScheduleToEventType(eventTypeId: number, scheduleId: number): Promise<boolean> {
    try {
        console.log(`🔗 Linking schedule ${scheduleId} to event type ${eventTypeId}...`);

        const response = await fetch(`${CAL_COM_API_URL}/event-types/${eventTypeId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${CAL_COM_API_KEY}`,
                'Content-Type': 'application/json',
                'cal-api-version': '2024-08-13'
            },
            body: JSON.stringify({
                scheduleId: scheduleId
            })
        });

        const responseText = await response.text();
        console.log(`🔗 Link response [${response.status}]:`, responseText);

        if (!response.ok) {
            console.warn(`⚠️  Failed to link schedule to event type ${eventTypeId}`);
            return false;
        }

        console.log(`✅ Schedule successfully linked to event type ${eventTypeId}`);
        return true;
    } catch (error: any) {
        console.error(`❌ Error linking schedule to event type ${eventTypeId}:`, error);
        return false;
    }
}

/**
 * Complete Cal.com integration for a project
 * Creates schedule first, then event types, then links them together
 */
export async function setupCalComIntegration(
    services: Service[],
    schedule: DaySchedule[]
): Promise<{
    success: boolean;
    servicesResult?: any;
    scheduleResult?: any;
    error?: string;
}> {
    try {
        console.log('🚀 Setting up Cal.com integration...');
        console.log(`   Services to sync: ${services.length}`);
        console.log(`   Schedule days enabled: ${schedule.filter(d => d.enabled).length}`);

        // Step 1: Create availability schedule FIRST
        console.log('\n📅 Step 1: Creating availability schedule...');
        const scheduleResult = await createCalComSchedule(schedule);
        console.log('   Schedule creation result:', scheduleResult);

        // Step 2: Create event types for services
        console.log('\n🎫 Step 2: Creating event types...');
        const servicesResult = await syncServicesToCalCom(services);
        console.log('   Services sync result:', servicesResult);

        // Step 3: Link schedule to each event type
        if (scheduleResult.success && scheduleResult.scheduleId) {
            console.log('\n🔗 Step 3: Linking schedule to event types...');

            for (const result of servicesResult.results) {
                if (result.success && result.eventTypeId) {
                    await linkScheduleToEventType(result.eventTypeId, scheduleResult.scheduleId);
                }
            }
        } else {
            console.warn('⚠️  Skipping schedule linking (schedule creation failed)');
        }

        // Consider it successful if at least one service was created
        const hasAnyService = servicesResult.results.some(r => r.success);

        console.log('\n✨ Cal.com integration complete!');
        console.log(`   ✅ Services created: ${servicesResult.results.filter(r => r.success).length}/${services.length}`);
        console.log(`   ✅ Schedule created: ${scheduleResult.success ? 'Yes' : 'No'}`);

        return {
            success: hasAnyService,
            servicesResult,
            scheduleResult
        };
    } catch (error: any) {
        console.error('❌ Error in Cal.com integration:', error);
        return {
            success: false,
            error: error.message
        };
    }
}
