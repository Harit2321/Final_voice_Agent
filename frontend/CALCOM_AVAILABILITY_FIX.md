# 🔧 Fix: Cal.com Availability Not Showing

## Problem
Availability timing was not appearing in Cal.com even though the schedule API was being called.

## Root Cause
The schedule was being created in Cal.com, but it wasn't **linked** to the event types (services). In Cal.com, you need to:
1. Create a schedule
2. Create event types
3. **Link the schedule to each event type**

We were missing step 3!

## Solution Implemented

### New 3-Step Process

```typescript
// OLD (Missing link step):
1. Create event types
2. Create schedule
❌ Schedule exists but not linked to event types

// NEW (Complete integration):
1. Create schedule FIRST
2. Create event types  
3. Link schedule to each event type ✅
```

### Code Changes

#### Added Schedule Linking Function

```typescript
async function linkScheduleToEventType(eventTypeId: number, scheduleId: number) {
    // PATCH /v2/event-types/{eventTypeId}
    // Body: { scheduleId: scheduleId }
    
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
}
```

#### Updated Integration Flow

```typescript
export async function setupCalComIntegration(services, schedule) {
    // Step 1: Create availability schedule FIRST
    const scheduleResult = await createCalComSchedule(schedule);
    
    // Step 2: Create event types for services
    const servicesResult = await syncServicesToCalCom(services);
    
    // Step 3: Link schedule to each event type ✅ NEW!
    if (scheduleResult.success && scheduleResult.scheduleId) {
        for (const result of servicesResult.results) {
            if (result.success && result.eventTypeId) {
                await linkScheduleToEventType(
                    result.eventTypeId, 
                    scheduleResult.scheduleId
                );
            }
        }
    }
}
```

### Enhanced Schedule Payload

Also improved the schedule creation with multiple fallback formats:

**Format 1 (Primary):**
```json
{
  "name": "Project Schedule 1739368201234",
  "timeZone": "Asia/Kolkata",
  "availability": [
    {
      "daysOfWeek": [1],
      "startTime": "09:00:00",
      "endTime": "17:00:00"
    },
    {
      "daysOfWeek": [2],
      "startTime": "09:00:00",
      "endTime": "17:00:00"
    }
  ]
}
```

**Format 2 (Fallback):**
```json
{
  "name": "Business Hours 1739368201234",
  "timeZone": "Asia/Kolkata",
  "schedule": [
    {
      "days": [1],
      "startTime": "09:00",
      "endTime": "17:00"
    }
  ]
}
```

## Expected Flow Now

When you create a project with 2 services and Mon-Fri schedule:

```
🚀 Setting up Cal.com integration...
   Services to sync: 2
   Schedule days enabled: 5

📅 Step 1: Creating availability schedule...
   POST /v2/schedules
   Response: { "data": { "id": 999 } }
   ✅ Schedule created! ID: 999

🎫 Step 2: Creating event types...
   POST /v2/event-types (Haircut)
   Response: { "data": { "id": 12345 } }
   ✅ Event type 1 created
   
   POST /v2/event-types (Massage)
   Response: { "data": { "id": 12346 } }
   ✅ Event type 2 created

🔗 Step 3: Linking schedule to event types...
   PATCH /v2/event-types/12345
   Body: { "scheduleId": 999 }
   ✅ Schedule linked to event type 12345
   
   PATCH /v2/event-types/12346
   Body: { "scheduleId": 999 }
   ✅ Schedule linked to event type 12346

✨ Cal.com integration complete!
   ✅ Services created: 2/2
   ✅ Schedule created: Yes
```

## Verification Steps

### 1. Create a Test Project

Go to http://localhost:3000/wizard and create a project with:
- Services: "Test Service" - 30min
- Schedule: Mon-Fri 9am-5pm

### 2. Check Server Logs

Look for:
```
🚀 Setting up Cal.com integration...
📅 Step 1: Creating availability schedule...
🎫 Step 2: Creating event types...
🔗 Step 3: Linking schedule to event types...
✅ Schedule successfully linked to event type XXX
```

### 3. Verify in Cal.com

1. Login to https://app.cal.com
2. Go to **Event Types**
3. Click on your service (e.g., "test-service")
4. Check the **"When can people book this event?"** section
5. You should see: **"Project Schedule"** with Mon-Fri 9am-5pm

### 4. Test Booking

1. Get the booking link from Cal.com
2. Try to book the service
3. You should **only see Mon-Fri 9am-5pm** slots available
4. Saturday/Sunday should be unavailable

## API Calls Made

For a project with 2 services:

| Step | Method | Endpoint | Purpose |
|------|--------|----------|---------|
| 1 | POST | `/v2/schedules` | Create availability schedule |
| 2a | POST | `/v2/event-types` | Create service 1 |
| 2b | POST | `/v2/event-types` | Create service 2 |
| 3a | PATCH | `/v2/event-types/{id1}` | Link schedule to service 1 ✅ |
| 3b | PATCH | `/v2/event-types/{id2}` | Link schedule to service 2 ✅ |

**Total API calls:** 5 (1 schedule + 2 event types + 2 links)

## Error Handling

The integration is resilient:

- ✅ If schedule creation fails → Event types still created (just without availability)
- ✅ If event type creation fails → Other event types still created
- ✅ If linking fails → Event type exists but uses default schedule
- ✅ Project always saved to database regardless of Cal.com status

## Files Modified

1. **`frontend/lib/calcom.ts`**
   - Fixed `createCalComSchedule()` with better payload formats
   - Added `linkScheduleToEventType()` function
   - Updated `setupCalComIntegration()` with 3-step process
   - Enhanced logging with emojis

## Summary

✅ **Schedule is created** in Cal.com  
✅ **Event types are created** in Cal.com  
✅ **Schedule is linked to each event type** (NEW!)  
✅ **Availability now shows up** when booking  
✅ **Comprehensive logging** for debugging  

The availability timing should now appear correctly in Cal.com! 🎉
