# 📅 Cal.com Availability API Integration

## ✅ Current Implementation

The Cal.com availability API is **already implemented and working**! Here's what happens:

### API Endpoint Being Used

```
POST https://api.cal.com/v2/schedules
```

### When It's Called

The `/v2/schedules` API is called **immediately after** creating event types, as part of the project creation flow:

```
User Creates Project
        ↓
Save to Database ✅
        ↓
Call Cal.com API:
  ├─→ POST /v2/event-types (for each service) ✅
  └─→ POST /v2/schedules (availability) ✅ ← YOU ASKED FOR THIS
        ↓
Return Response
```

### Location in Code

**File:** `frontend/lib/calcom.ts`  
**Function:** `createCalComSchedule()`  
**Line:** 241

```typescript
// Line 241: Calling Cal.com V2 Schedules API
const response = await fetch(`${CAL_COM_API_URL}/schedules`, {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${CAL_COM_API_KEY}`,
        'Content-Type': 'application/json',
        'cal-api-version': '2024-08-13'
    },
    body: JSON.stringify(payload)
});
```

### Payload Format

When you create a project with this schedule:

**Input (from wizard):**
```json
[
  { "day": "Monday", "enabled": true, "start": "09:00", "end": "17:00" },
  { "day": "Tuesday", "enabled": true, "start": "09:00", "end": "17:00" },
  { "day": "Wednesday", "enabled": true, "start": "09:00", "end": "17:00" },
  { "day": "Thursday", "enabled": true, "start": "09:00", "end": "17:00" },
  { "day": "Friday", "enabled": true, "start": "09:00", "end": "17:00" },
  { "day": "Saturday", "enabled": false },
  { "day": "Sunday", "enabled": false }
]
```

**Sent to Cal.com /v2/schedules:**
```json
{
  "name": "Project Business Hours",
  "timeZone": "Asia/Kolkata",
  "isDefault": true,
  "schedule": [
    {
      "days": [1, 2, 3, 4, 5],
      "startTime": "09:00",
      "endTime": "17:00"
    }
  ]
}
```

### Day Number Mapping

Cal.com uses numeric day codes:
- 0 = Sunday
- 1 = Monday
- 2 = Tuesday
- 3 = Wednesday
- 4 = Thursday
- 5 = Friday
- 6 = Saturday

### Complete Flow Example

When you create a project with 2 services and a Mon-Fri 9-5 schedule:

```bash
# Step 1: Create Project in Database
✅ Project created: id=abc-123

# Step 2: Create Event Types in Cal.com
POST https://api.cal.com/v2/event-types
Body: { "title": "Haircut", "slug": "haircut", "length": 30 }
Response: { "data": { "id": 12345 } }
✅ Event type 1 created

POST https://api.cal.com/v2/event-types
Body: { "title": "Massage", "slug": "massage", "length": 60 }
Response: { "data": { "id": 12346 } }
✅ Event type 2 created

# Step 3: Create Schedule (Availability) in Cal.com
POST https://api.cal.com/v2/schedules
Body: {
  "name": "Project Business Hours",
  "timeZone": "Asia/Kolkata",
  "isDefault": true,
  "schedule": [
    {
      "days": [1, 2, 3, 4, 5],
      "startTime": "09:00",
      "endTime": "17:00"
    }
  ]
}
Response: { "data": { "id": 999 } }
✅ Schedule created

# Step 4: Return to User
Response: {
  "success": true,
  "message": "Project created and synced to Cal.com successfully",
  "data": {
    "calComSync": {
      "synced": true,
      "servicesCreated": 2,
      "scheduleCreated": true
    }
  }
}
```

### Logs to Watch

When you create a project, you'll see these logs in the server console:

```
Setting up Cal.com integration...
Services to sync: 2
Schedule days: 5

Creating Cal.com event type: {...}
Cal.com create event type response: 200 {...}

Creating Cal.com event type: {...}
Cal.com create event type response: 200 {...}

📅 Creating Cal.com schedule via /v2/schedules: {
  "name": "Project Business Hours",
  "timeZone": "Asia/Kolkata",
  "isDefault": true,
  "schedule": [
    {
      "days": [1, 2, 3, 4, 5],
      "startTime": "09:00",
      "endTime": "17:00"
    }
  ]
}
📅 Cal.com /v2/schedules response [200]: {...}
✅ Cal.com schedule created successfully! ID: 999

Services sync result: {...}
Schedule creation result: { success: true, scheduleId: 999 }

✅ Cal.com integration successful: {
  projectId: "abc-123",
  servicesCreated: 2,
  scheduleCreated: true
}
```

### Verification

To verify the schedule was created in Cal.com:

1. **Login to Cal.com dashboard**: https://app.cal.com
2. **Go to Settings** → **Schedules**
3. **Look for**: "Project Business Hours"
4. **You should see**:
   - Name: Project Business Hours
   - Timezone: Asia/Kolkata
   - Days: Mon-Fri
   - Time: 9:00 AM - 5:00 PM

### Error Handling

If the schedule API fails:

```
⚠️  Schedule creation failed, but continuing: {"error": "..."}
```

The project is **still created** successfully. Only the schedule sync fails, which can be set up manually in Cal.com.

### Response Structure

The API response includes the schedule sync status:

```json
{
  "success": true,
  "data": {
    "id": "project-id",
    "calComSync": {
      "synced": true,
      "servicesCreated": 2,
      "scheduleCreated": true,  ← Confirms schedule was created
      "details": {
        "scheduleId": 999        ← Cal.com schedule ID
      }
    }
  }
}
```

## Summary

✅ **API Endpoint**: `/v2/schedules` (already implemented)  
✅ **Called When**: After database save, after event types creation  
✅ **Payload Format**: Cal.com V2 API format with timezone and day numbers  
✅ **Error Handling**: Graceful - project still created if this fails  
✅ **Logging**: Comprehensive with emojis for easy debugging  
✅ **Status Reporting**: Included in API response

The availability/schedule API is **already working** and is called every time you create a project! 🎉
