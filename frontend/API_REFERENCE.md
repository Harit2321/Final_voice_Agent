# API Quick Reference

## Response Format

All API responses follow this format:

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional success message"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "details": { ... }
}
```

## Authentication Endpoints

### POST /api/auth/register
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe",     // optional
  "phone": "+1234567890"  // optional
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "phone": "+1234567890",
      "role": "USER",
      "createdAt": "2026-02-12T..."
    },
    "token": "eyJhbGc..."
  },
  "message": "User registered successfully"
}
```

---

### POST /api/auth/login
Authenticate user and receive JWT token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "USER"
    },
    "token": "eyJhbGc..."
  },
  "message": "Login successful"
}
```

---

### POST /api/auth/logout
Clear authentication cookie.

**Response:**
```json
{
  "success": true,
  "data": null,
  "message": "Logged out successfully"
}
```

---

### GET /api/auth/me
Get current authenticated user details.

**Headers:** `Authorization: Bearer <token>` or Cookie

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "phone": "+1234567890",
    "role": "USER",
    "createdAt": "2026-02-12T...",
    "updatedAt": "2026-02-12T..."
  }
}
```

---

## Bookings Endpoints

### GET /api/bookings
Get all bookings for authenticated user.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `status` (optional): Filter by status (PENDING, CONFIRMED, CANCELLED, COMPLETED)
- `startDate` (optional): Filter from date (ISO 8601)
- `endDate` (optional): Filter to date (ISO 8601)

**Example:**
```
GET /api/bookings?status=CONFIRMED&startDate=2026-02-01T00:00:00Z
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "userId": "user-uuid",
      "serviceId": "service-uuid",
      "scheduledAt": "2026-02-15T10:00:00Z",
      "duration": 30,
      "status": "CONFIRMED",
      "notes": "Some notes",
      "createdAt": "2026-02-12T...",
      "service": {
        "id": "uuid",
        "name": "Haircut",
        "description": "Professional haircut",
        "duration": 30,
        "price": 25.0
      }
    }
  ]
}
```

---

### POST /api/bookings
Create a new booking.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "serviceId": "service-uuid",
  "scheduledAt": "2026-02-15T10:00:00Z",
  "duration": 30,
  "notes": "Optional notes"  // optional
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "userId": "user-uuid",
    "serviceId": "service-uuid",
    "scheduledAt": "2026-02-15T10:00:00Z",
    "duration": 30,
    "status": "PENDING",
    "notes": "Optional notes",
    "service": { ... }
  },
  "message": "Booking created successfully"
}
```

**Error Cases:**
- `409`: Booking conflict (user has another booking at same time)
- `404`: Service not found
- `400`: Service is not active

---

### GET /api/bookings/:id
Get single booking details.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "scheduledAt": "2026-02-15T10:00:00Z",
    "duration": 30,
    "status": "CONFIRMED",
    "service": { ... },
    "user": {
      "id": "uuid",
      "name": "John Doe",
      "email": "user@example.com",
      "phone": "+1234567890"
    }
  }
}
```

**Error Cases:**
- `404`: Booking not found
- `403`: Not authorized to view this booking

---

### PUT /api/bookings/:id
Update booking (reschedule or change status).

**Headers:** `Authorization: Bearer <token>`

**Request Body (all fields optional):**
```json
{
  "scheduledAt": "2026-02-16T14:00:00Z",
  "status": "CONFIRMED",
  "notes": "Updated notes"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "scheduledAt": "2026-02-16T14:00:00Z",
    "status": "CONFIRMED",
    "notes": "Updated notes",
    "service": { ... }
  },
  "message": "Booking updated successfully"
}
```

---

### DELETE /api/bookings/:id
Cancel booking (soft delete - sets status to CANCELLED).

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "CANCELLED",
    ...
  },
  "message": "Booking cancelled successfully"
}
```

---

## Services Endpoints

### GET /api/services
Get all active services (public endpoint).

**Query Parameters:**
- `includeInactive`: `true` to include inactive services (admin only)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Haircut",
      "description": "Professional haircut service",
      "duration": 30,
      "price": 25.0,
      "isActive": true,
      "createdAt": "2026-02-12T...",
      "updatedAt": "2026-02-12T..."
    },
    {
      "id": "uuid",
      "name": "Hair Coloring",
      "description": "Full hair coloring",
      "duration": 90,
      "price": 80.0,
      "isActive": true
    }
  ]
}
```

---

### POST /api/services
Create new service (admin only).

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "name": "New Service",
  "description": "Service description",  // optional
  "duration": 60,
  "price": 50.0,  // optional
  "isActive": true  // optional, defaults to true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "New Service",
    "description": "Service description",
    "duration": 60,
    "price": 50.0,
    "isActive": true
  },
  "message": "Service created successfully"
}
```

**Error Cases:**
- `403`: Only admins can create services
- `409`: Service with this name already exists

---

## Users Endpoints

### GET /api/users/:id
Get user profile by ID.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "phone": "+1234567890",
    "role": "USER",
    "createdAt": "2026-02-12T...",
    "updatedAt": "2026-02-12T...",
    "_count": {
      "bookings": 5,
      "conversations": 12
    }
  }
}
```

**Error Cases:**
- `403`: Can only view own profile (unless admin)
- `404`: User not found

---

### PUT /api/users/:id
Update user profile.

**Headers:** `Authorization: Bearer <token>`

**Request Body (all fields optional):**
```json
{
  "name": "Updated Name",
  "phone": "+9876543210",
  "email": "newemail@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "newemail@example.com",
    "name": "Updated Name",
    "phone": "+9876543210",
    "role": "USER",
    "updatedAt": "2026-02-12T..."
  },
  "message": "Profile updated successfully"
}
```

**Error Cases:**
- `403`: Can only update own profile (unless admin)
- `409`: Email already in use by another user

---

## Conversations Endpoints

### GET /api/conversations
Get all conversations for authenticated user (paginated).

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `limit` (optional): Number of records per page (default: 50)
- `offset` (optional): Number of records to skip (default: 0)

**Example:**
```
GET /api/conversations?limit=10&offset=20
```

**Response:**
```json
{
  "success": true,
  "data": {
    "conversations": [
      {
        "id": "uuid",
        "summary": "Conversation about booking haircut",
        "createdAt": "2026-02-12T...",
        "metadata": {
          "language": "en",
          "duration": 120
        }
      }
    ],
    "pagination": {
      "total": 45,
      "limit": 10,
      "offset": 20,
      "hasMore": true
    }
  }
}
```

---

### POST /api/conversations
Save a conversation (can be authenticated or anonymous).

**Headers:** `Authorization: Bearer <token>` (optional)

**Request Body:**
```json
{
  "transcript": {
    "messages": [
      {
        "role": "user",
        "content": "I want to book a haircut"
      },
      {
        "role": "assistant",
        "content": "Sure! When would you like to book?"
      }
    ]
  },
  "summary": "User booked a haircut appointment",  // optional
  "metadata": {  // optional
    "language": "en",
    "duration": 120,
    "sentiment": "positive"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "userId": "user-uuid-or-null",
    "transcript": { ... },
    "summary": "User booked a haircut appointment",
    "metadata": { ... },
    "createdAt": "2026-02-12T..."
  },
  "message": "Conversation saved successfully"
}
```

---

## Error Codes

| Status | Meaning | Common Causes |
|--------|---------|---------------|
| 400 | Bad Request | Invalid input, validation failed |
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate entry, booking conflict |
| 500 | Internal Server Error | Unexpected server error |

---

## Validation Errors

When validation fails, the response includes detailed errors:

```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "email",
      "message": "Invalid email address"
    },
    {
      "field": "password",
      "message": "Password must be at least 8 characters"
    }
  ]
}
```

---

## Authentication Methods

### Option 1: HTTP-Only Cookie (Recommended)
Token is automatically set in cookie after login/register. No additional headers needed.

### Option 2: Bearer Token
Include in Authorization header:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Testing with cURL

### Register and Login
```bash
# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email":"test@example.com","password":"password123"}'

# Use cookie for authenticated requests
curl http://localhost:3000/api/auth/me \
  -b cookies.txt
```

### Create Booking
```bash
# Get services first
curl http://localhost:3000/api/services

# Create booking (use service ID from above)
curl -X POST http://localhost:3000/api/bookings \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "serviceId":"service-uuid-here",
    "scheduledAt":"2026-02-15T10:00:00Z",
    "duration":30,
    "notes":"First booking"
  }'
```
