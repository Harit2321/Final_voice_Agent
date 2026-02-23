# 🎉 Schedule API Fixed - Testing Guide

## What Was Fixed

The schedule/availability was not being saved to Cal.com because the code was using **Cal.com V2 API endpoints that don't exist**. 

### Changes Made
- **Before**: Using `/v2/schedules` (returns 404 ❌)
- **After**: Using `/v1/schedules` (returns 200 ✅)

## How to Test

### 1. Start the Development Server

```bash
cd d:\TSC\Agent_Cal_Com_Delay\frontend
npm run dev
```

### 2. Open the Wizard

Navigate to: `http://localhost:3000/wizard`

### 3. Create a Project

Fill in all 5 steps:
1. **Identity** - Set agent name, language, greeting, voice
2. **Business** - Set business name, industry, phone, website
3. **Services** - Add one or more services (e.g., "Haircut", 30 min, $50)
4. **Schedule** - Enable days and set hours (e.g., Mon-Fri 9:00 AM - 5:00 PM)
5. **Review** - Click "🚀 Launch Agent"

### 4. Check the Terminal Logs

You should see logs like this:

```
🚀 Setting up Cal.com integration...
   Services to sync: 1
   Schedule days enabled: 5

📅 Step 1: Creating availability schedule...
📅 Creating Cal.com schedule via V1 /schedules: {
  "name": "Business Hours 1770904842140",
  "timeZone": "Asia/Kolkata",
  "availability": [
    {
      "days": [1, 2, 3, 4, 5],
      "startTime": "09:00:00",
      "endTime": "17:00:00"
    }
  ]
}
📅 Cal.com V1 /schedules response [200]: {"schedule":{"id":1241532,...}}
✅ Cal.com schedule created successfully! ID: 1241532

🎫 Step 2: Creating event types...
Creating Cal.com event type: {...}
Cal.com create event type response: 200 {...}
✅ Services created: 1/1

✨ Cal.com integration complete!
```

### 5. Verify in Cal.com Dashboard

1. Go to https://app.cal.com
2. Click **Settings** → **Schedules**
3. You should see a new schedule named "Business Hours [timestamp]"
4. Verify the days and times match what you set in the wizard

### 6. Check Event Types

1. In Cal.com, go to **Event Types**
2. You should see the service(s) you created
3. They should be linked to the schedule you created

## Expected Results

✅ Schedule is created in Cal.com  
✅ Event types (services) are created in Cal.com  
✅ Schedule is properly linked to event types  
✅ You can book appointments through Cal.com  
✅ API response shows `"scheduleCreated": true`

## If Something Goes Wrong

### Check Console Logs
Look for error messages in the terminal where you ran `npm run dev`

### Common Issues

1. **API Key Missing**
   - Check `.env.local` has `CAL_COM_API_KEY` set
   
2. **401 Unauthorized**
   - Your API key might be invalid
   - Generate a new key from https://app.cal.com/settings/developer/api-keys

3. **404 Not Found** (should not happen now)
   - Verify the code is using V1 API, not V2

## Test Commands

Run these to verify the API works:

```bash
# Test V1 schedules endpoint
node test-schedule.js

# Test V1 endpoints discovery
node test-endpoints.js
```

## Summary

The fix ensures that schedules are now properly created in Cal.com using the correct V1 API. The integration is fully functional and ready to use! 🚀
