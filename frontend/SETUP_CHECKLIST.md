# 🎯 Backend Setup Checklist

Use this checklist to get your backend up and running!

## ✅ Installation Complete

- [x] Installed Prisma & @prisma/client
- [x] Installed JWT & bcryptjs
- [x] Installed Zod for validation
- [x] Installed TypeScript dependencies
- [x] Generated Prisma Client
- [x] Created database schema
- [x] Created API routes (15 endpoints)
- [x] Created authentication system
- [x] Created middleware protection
- [x] Created frontend API client

## 📋 Your Next Steps

### Step 1: Set Up Database ⏳

**Choose ONE option:**

#### Option A: Supabase (Recommended - Free & Easy)
1. Go to [https://supabase.com](https://supabase.com)
2. Create a new project
3. Wait for database to provision (~2 minutes)
4. Go to Project Settings → Database
5. Copy the connection string (PostgreSQL)
6. Paste into `.env.local` as `DATABASE_URL`

#### Option B: Neon (Serverless PostgreSQL)
1. Go to [https://neon.tech](https://neon.tech)
2. Create a new project
3. Copy the connection string
4. Paste into `.env.local` as `DATABASE_URL`

#### Option C: Local PostgreSQL
1. Download PostgreSQL from [https://www.postgresql.org/download/](https://www.postgresql.org/download/)
2. Install and run PostgreSQL
3. Create database: `createdb voiceagent`
4. Update `.env.local`:
   ```
   DATABASE_URL="postgresql://postgres:password@localhost:5432/voiceagent?schema=public"
   ```

- [ ] Database created
- [ ] Connection string added to `.env.local`

### Step 2: Generate JWT Secret ⏳

**On Windows PowerShell:**
```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object {Get-Random -Minimum 0 -Maximum 256}))
```

**On Linux/Mac:**
```bash
openssl rand -base64 32
```

1. Run the command above
2. Copy the output
3. Update `.env.local`:
   ```
   JWT_SECRET="paste-your-generated-secret-here"
   ```

- [ ] JWT secret generated
- [ ] JWT secret added to `.env.local`

### Step 3: Run Migrations ⏳

This creates all database tables.

```bash
npx prisma migrate dev --name init
```

Expected output:
```
✔ Your database is now in sync with your schema.
✔ Generated Prisma Client
```

- [ ] Migrations run successfully

### Step 4: Seed Database (Optional) ⏳

This adds sample data for testing.

```bash
npx prisma db seed
```

Creates:
- 4 services (Haircut, Hair Coloring, Consultation, Meeting)
- 2 users (admin@example.com, user@example.com - both password: password123)
- 2 sample bookings

- [ ] Database seeded

### Step 5: Start Development Server ⏳

```bash
npm run dev
```

- [ ] Server running at http://localhost:3000

### Step 6: Test the API ⏳

#### Test 1: Get Services (No Auth Required)

```bash
curl http://localhost:3000/api/services
```

Expected: List of services

#### Test 2: Register User

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"test@test.com\",\"password\":\"password123\",\"name\":\"Test User\"}"
```

Expected: User object + JWT token

#### Test 3: Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"user@example.com\",\"password\":\"password123\"}"
```

Expected: User object + JWT token

- [ ] Services endpoint working
- [ ] Registration working
- [ ] Login working

### Step 7: Test with Prisma Studio (Optional) ⏳

View your database in a GUI:

```bash
npx prisma studio
```

Opens at http://localhost:5555

- [ ] Can view database tables
- [ ] Can see seeded data

## 🎊 You're Done!

When all steps are complete, your backend is fully operational!

## 📚 Documentation Reference

- **BACKEND_README.md** - Complete setup guide
- **API_REFERENCE.md** - All API endpoints with examples
- **IMPLEMENTATION_SUMMARY.md** - What was implemented

## 🆘 Troubleshooting

### Database Connection Error

**Problem:** `Can't reach database server`

**Solution:**
1. Check `.env.local` has correct `DATABASE_URL`
2. Verify database is running (if local)
3. Check firewall settings
4. Try: `npx prisma db push` to test connection

### Migration Error

**Problem:** `Schema validation error`

**Solution:**
```bash
npx prisma format
npx prisma generate
npx prisma migrate dev --name init
```

### Port Already in Use

**Problem:** `Port 3000 is already in use`

**Solution (Windows):**
```powershell
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Prisma Client Not Found

**Problem:** `Cannot find module '@prisma/client'`

**Solution:**
```bash
npx prisma generate
```

## ✨ Quick Commands Reference

```bash
# Database
npx prisma studio              # Open database GUI
npx prisma migrate dev         # Create new migration
npx prisma db seed            # Seed database
npx prisma generate           # Regenerate Prisma Client
npx prisma migrate reset      # Reset database (DELETES ALL DATA)

# Development
npm run dev                   # Start dev server
npm run build                 # Build for production
npm start                     # Start production server

# Testing
curl http://localhost:3000/api/services    # Test API
```

## 🚀 After Setup

Once everything is working:

1. Integrate with your existing frontend pages
2. Add Cal.com API integration
3. Customize the database schema as needed
4. Add more API endpoints
5. Deploy to Vercel or Railway

## 📞 Help

If you get stuck:
1. Check BACKEND_README.md troubleshooting section
2. Verify all environment variables are set
3. Check terminal for error messages
4. Make sure database is accessible

---

**Current Status:**
- Installation: ✅ Complete
- Database Setup: ⏳ Waiting for you
- Migrations: ⏳ Waiting for you  
- Testing: ⏳ Waiting for you

**Next Action:** Set up your PostgreSQL database and update `.env.local`!
