# Setup Guide for Scribbly Game

## Quick Setup (5 minutes)

### Step 1: Create Supabase Database (Free)
1. Go to [supabase.com](https://supabase.com)
2. Sign up with GitHub/Google
3. Click "New Project"
4. Fill in:
   - Name: `scribbly`
   - Database Password: (create a strong password, save it!)
   - Region: Choose closest to you
5. Wait 2 minutes for setup
6. Go to Settings → Database
7. Copy the "Connection string" (URI format)
8. Paste it in `server/.env` as `DATABASE_URL`

### Step 2: Create Upstash Redis (Free)
1. Go to [upstash.com](https://upstash.com)
2. Sign up with GitHub/Google
3. Click "Create Database"
4. Fill in:
   - Name: `scribbly`
   - Type: Regional
   - Region: Choose closest to you
5. Click "Create"
6. Copy the "Redis URL" (starts with `redis://`)
7. Paste it in `server/.env` as `REDIS_URL`

### Step 3: Run Database Migrations
```bash
cd server
npx prisma migrate dev
npx prisma db seed
```

### Step 4: Start Development Server
```bash
npm run dev
```

## Your `.env` file should look like:
```env
DATABASE_URL=postgresql://postgres:your-password@db.abc123xyz.supabase.co:5432/postgres
REDIS_URL=redis://default:your-password@abc-123-xyz.upstash.io:6379
JWT_SECRET=dev-secret-key-change-in-production-12345678
```

## For Production Deployment

### Option 1: Vercel (Recommended for beginners)
- Free tier available
- Automatic deployments from GitHub
- Easy setup

### Option 2: Railway
- Free $5 credit monthly
- Deploy with one click
- Good for full-stack apps

### Option 3: Render
- Free tier available
- Simple deployment
- Good documentation

All these services will keep your app running 24/7 without your laptop!

## Need Help?
- Supabase docs: https://supabase.com/docs
- Upstash docs: https://docs.upstash.com/redis
- Vercel docs: https://vercel.com/docs
