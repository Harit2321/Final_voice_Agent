# LiveKit Token API - Phase 3

## ✅ Completed

Created the LiveKit token generation API endpoint at `/api/livekit/token`

## 📍 Endpoint Details

**URL:** `POST /api/livekit/token`

**Authentication:** Required (JWT cookie)

**Request Body:**
```json
{
  "projectId": "your-project-id-here"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "LiveKit token generated successfully",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "url": "wss://your-livekit-server.com",
    "room": "project-abc123",
    "identity": "user-xyz789-1234567890",
    "project": {
      "id": "abc123",
      "agentName": "Zara",
      "businessName": "Luxe Hair Studio"
    }
  }
}
```

**Response (Error - Missing Config):**
```json
{
  "success": false,
  "message": "LiveKit is not configured. Please set LIVEKIT_API_KEY, LIVEKIT_API_SECRET, and LIVEKIT_WS_URL in your environment variables.",
  "error": null
}
```

## 🔧 Setup Required

### 1. Install LiveKit SDK

```bash
npm install livekit-server-sdk
```

### 2. Configure Environment Variables

Add to `.env.local`:

```bash
# LiveKit Configuration
LIVEKIT_API_KEY="your-livekit-api-key"
LIVEKIT_API_SECRET="your-livekit-api-secret"
LIVEKIT_WS_URL="wss://your-livekit-server.com"
```

To get these credentials:
1. Sign up at https://cloud.livekit.io
2. Create a new project
3. Copy the API Key, API Secret, and WebSocket URL
4. Paste them into `.env.local`

### 3. Restart Dev Server

```bash
npm run dev
```

## 🧪 Testing the API

### Option 1: Using the Test Script

```bash
# First, get your auth token by logging in at http://localhost:3000
# Then open DevTools → Application → Cookies → Copy "token" value

node test-livekit-token.js <projectId> <authToken>
```

Example:
```bash
node test-livekit-token.js f12faba3-c9fd-4955-a694-1fb77556247 eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Option 2: Using cURL

```bash
curl -X POST http://localhost:3000/api/livekit/token \
  -H "Content-Type: application/json" \
  -H "Cookie: token=YOUR_AUTH_TOKEN" \
  -d '{"projectId":"your-project-id"}'
```

### Option 3: Using Thunder Client / Postman

1. **Method:** POST
2. **URL:** `http://localhost:3000/api/livekit/token`
3. **Headers:**
   - `Content-Type: application/json`
   - `Cookie: token=YOUR_AUTH_TOKEN`
4. **Body (JSON):**
   ```json
   {
     "projectId": "your-project-id"
   }
   ```

## 🔐 Security Features

✅ **User Authentication** - Requires valid JWT token  
✅ **Project Authorization** - Verifies user owns the project  
✅ **Token Metadata** - Includes project and user info  
✅ **Room Isolation** - Each project gets unique room  
✅ **Secure Permissions** - Controls publish/subscribe access

## 📦 What the Token Contains

The generated LiveKit token includes:

- **Identity:** Unique user identifier (`user-{userId}-{timestamp}`)
- **Room Name:** `project-{projectId}`
- **Metadata:**
  - projectId
  - agentName
  - businessName
  - userId
- **Permissions:**
  - Join room: ✅
  - Publish audio/video: ✅
  - Subscribe to streams: ✅
  - Publish data messages: ✅

## 🚀 Next Steps (Phase 4)

- Connect the token API to the UI
- Add LiveKit client components
- Implement voice agent interface

## ⚠️ Important Notes

- **DO NOT** commit real LiveKit credentials to Git
- The token is valid for the duration specified in LiveKit settings
- Each token generates a unique identity to track separate sessions
- Room names are based on projectId for isolation
