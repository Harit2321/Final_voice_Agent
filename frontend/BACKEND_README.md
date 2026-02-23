# Next.js Backend with PostgreSQL, Prisma & JWT Authentication

Complete backend implementation for the Voice Agent booking system with database integration.

## 🏗️ Technology Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: PostgreSQL
- **ORM**: Prisma 7
- **Authentication**: JWT with HTTP-only cookies
- **Validation**: Zod
- **Password Hashing**: bcryptjs

## 📁 Project Structure

```
frontend/
├── app/
│   ├── api/                    # Backend API routes
│   │   ├── auth/              # Authentication endpoints
│   │   │   ├── login/         # POST /api/auth/login
│   │   │   ├── register/      # POST /api/auth/register
│   │   │   ├── logout/        # POST /api/auth/logout
│   │   │   └── me/            # GET /api/auth/me
│   │   ├── bookings/          # Booking management
│   │   │   ├── route.ts       # GET, POST /api/bookings
│   │   │   └── [id]/          # GET, PUT, DELETE /api/bookings/:id
│   │   ├── services/          # Services catalog
│   │   │   └── route.ts       # GET, POST /api/services
│   │   ├── users/             # User profiles
│   │   │   └── [id]/          # GET, PUT /api/users/:id
│   │   └── conversations/     # Conversation logs
│   │       └── route.ts       # GET, POST /api/conversations
│   └── (frontend pages)
├── lib/
│   ├── db.ts                  # Prisma client singleton
│   ├── auth.ts                # JWT & password utilities
│   ├── validations.ts         # Zod schemas
│   ├── api-response.ts        # Response helpers
│   └── api-client.ts          # Frontend API client
├── prisma/
│   ├── schema.prisma          # Database schema
│   ├── seed.ts                # Seed data script
│   └── migrations/            # Migration files
├── middleware.ts              # Route protection
├── .env.local                 # Environment variables
└── prisma.config.ts           # Prisma 7 configuration
```

## 🚀 Setup Instructions

### 1. Install PostgreSQL

You need a PostgreSQL database. Choose one option:

**Option A: Local PostgreSQL**
- Download from [https://www.postgresql.org/download/](https://www.postgresql.org/download/)
- Install and create a database named `voiceagent`

**Option B: Cloud PostgreSQL (Recommended)**
- **Supabase**: [https://supabase.com](https://supabase.com) (Free tier)
- **Neon**: [https://neon.tech](https://neon.tech) (Free tier)
- **Railway**: [https://railway.app](https://railway.app)
- **Vercel Postgres**: [https://vercel.com/storage/postgres](https://vercel.com/storage/postgres)

### 2. Configure Environment Variables

Update `.env.local` with your database connection string:

```env
# Example for local PostgreSQL
DATABASE_URL="postgresql://postgres:password@localhost:5432/voiceagent?schema=public"

# Example for Supabase
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"

# Example for Neon
DATABASE_URL="postgresql://[user]:[password]@[host]/[database]?sslmode=require"

# JWT Secret (generate a secure one)
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_EXPIRES_IN="7d"

NEXT_PUBLIC_API_URL="http://localhost:3000"
```

**Generate a secure JWT secret:**
```bash
# On Linux/Mac
openssl rand -base64 32

# On Windows (PowerShell)
[Convert]::ToBase64String((1..32 | ForEach-Object {Get-Random -Minimum 0 -Maximum 256}))
```

### 3. Run Database Migrations

Create the database tables:

```bash
npx prisma migrate dev --name init
```

This will:
- Create all tables defined in `prisma/schema.prisma`
- Generate Prisma Client
- Apply migrations to your database

### 4. Seed the Database (Optional)

Populate with sample data:

```bash
npx prisma db seed
```

This creates:
- **Services**: Haircut, Hair Coloring, Consultation, Meeting
- **Users**: 
  - Admin: `admin@example.com` / `password123`
  - User: `user@example.com` / `password123`
- **Sample Bookings**: 2 test bookings

### 5. Start the Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## 📊 Database Schema

### User
- `id` (UUID) - Primary key
- `email` (String, unique) - User email
- `passwordHash` (String) - Hashed password
- `name` (String, optional) - User name
- `phone` (String, optional) - Phone number
- `role` (Enum: USER, ADMIN) - User role
- `createdAt`, `updatedAt` (DateTime)

### Service
- `id` (UUID) - Primary key
- `name` (String, unique) - Service name
- `description` (String, optional)
- `duration` (Int) - Duration in minutes
- `price` (Float, optional) - Price
- `isActive` (Boolean) - Active status

### Booking
- `id` (UUID) - Primary key
- `userId` (UUID, FK → User)
- `serviceId` (UUID, FK → Service)
- `scheduledAt` (DateTime) - Appointment time
- `duration` (Int) - Duration in minutes
- `status` (Enum: PENDING, CONFIRMED, CANCELLED, COMPLETED)
- `calComEventId` (String, optional) - Cal.com integration
- `notes` (String, optional)

### Conversation
- `id` (UUID) - Primary key
- `userId` (UUID, FK → User, nullable) - For anonymous conversations
- `transcript` (JSON) - Full conversation data
- `summary` (String, optional)
- `metadata` (JSON, optional)

## 🔐 API Endpoints

### Authentication

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/register` | Register new user | No |
| POST | `/api/auth/login` | Login user | No |
| POST | `/api/auth/logout` | Logout user | No |
| GET | `/api/auth/me` | Get current user | Yes |

### Bookings

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/bookings` | List user bookings | Yes |
| POST | `/api/bookings` | Create booking | Yes |
| GET | `/api/bookings/:id` | Get single booking | Yes |
| PUT | `/api/bookings/:id` | Update booking | Yes |
| DELETE | `/api/bookings/:id` | Cancel booking | Yes |

### Services

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/services` | List active services | No |
| POST | `/api/services` | Create service (admin) | Yes (Admin) |

### Users

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/users/:id` | Get user profile | Yes (Own/Admin) |
| PUT | `/api/users/:id` | Update profile | Yes (Own/Admin) |

### Conversations

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/conversations` | List conversations | Yes |
| POST | `/api/conversations` | Save conversation | No (optional) |

## 📝 API Usage Examples

### Register User

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "secure123",
    "name": "John Doe",
    "phone": "+1234567890"
  }'
```

### Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "secure123"
  }'
```

### Create Booking

```bash
curl -X POST http://localhost:3000/api/bookings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "serviceId": "service-uuid-here",
    "scheduledAt": "2026-02-15T10:00:00Z",
    "duration": 30,
    "notes": "Please call before arrival"
  }'
```

### Get Services

```bash
curl http://localhost:3000/api/services
```

## 🔒 Security Features

1. **Password Security**
   - Passwords hashed with bcryptjs (12 rounds)
   - Never stored in plain text

2. **JWT Authentication**
   - HTTP-only cookies (prevents XSS)
   - Secure flag in production
   - 7-day expiration (configurable)

3. **Input Validation**
   - Zod schemas for all inputs
   - Type-safe validation

4. **Route Protection**
   - Middleware guards protected routes
   - Role-based access control (RBAC)

5. **Database Security**
   - Parameterized queries via Prisma
   - SQL injection prevention
   - Row-level permissions

## 🛠️ Development Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Generate Prisma Client
npx prisma generate

# Create migration
npx prisma migrate dev --name migration_name

# Apply migrations
npx prisma migrate deploy

# Seed database
npx prisma db seed

# Open Prisma Studio (DB GUI)
npx prisma studio

# Reset database (WARNING: deletes all data)
npx prisma migrate reset
```

## 📦 Frontend Integration

Use the provided API client:

```typescript
import { authApi, bookingsApi, servicesApi } from '@/lib/api-client';

// Register
const result = await authApi.register({
  email: 'user@example.com',
  password: 'secure123',
  name: 'John Doe',
});

// Login
const loginResult = await authApi.login({
  email: 'user@example.com',
  password: 'secure123',
});

// Get bookings
const bookings = await bookingsApi.getAll();

// Create booking
const newBooking = await bookingsApi.create({
  serviceId: 'uuid',
  scheduledAt: '2026-02-15T10:00:00Z',
  duration: 30,
});
```

## 🔍 Troubleshooting

### Database Connection Issues

1. Check `.env.local` has correct DATABASE_URL
2. Ensure PostgreSQL is running
3. Test connection: `npx prisma db push`

### Migration Errors

```bash
# Reset and reapply
npx prisma migrate reset
npx prisma migrate dev
```

### Prisma Client Not Found

```bash
npx prisma generate
```

### Port Already in Use

```bash
# Kill process on port 3000 (Windows)
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

## 📚 Next Steps

1. ✅ Set up PostgreSQL database
2. ✅ Configure `.env.local`
3. ✅ Run migrations
4. ✅ Seed database
5. 🔲 Test API endpoints with Postman/Thunder Client
6. 🔲 Integrate with existing frontend pages
7. 🔲 Add Cal.com integration
8. 🔲 Deploy to Vercel/Railway

## 🌐 Deployment

### Vercel

1. Push to GitHub
2. Import to Vercel
3. Add environment variables in Vercel dashboard
4. Use Vercel Postgres or external DB
5. Deploy

### Environment Variables for Production

```env
DATABASE_URL=your-production-db-url
JWT_SECRET=your-secure-production-secret
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://yourdomain.com
```

## 📄 License

MIT License
