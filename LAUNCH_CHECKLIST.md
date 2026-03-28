# 🚀 Launch Checklist - Complete Before Tomorrow

## ⏱️ Step 1: Supabase Setup (3 min)
1. Open https://supabase.com/dashboard
2. Click "New Project"
3. Settings:
   - Name: `scribbly-game`
   - Password: (SAVE THIS!) `[create strong password]`
   - Region: `Southeast Asia (Singapore)` or closest
4. Wait for project creation (~2 min)
5. Go to: Settings → Database → Connection String
6. Copy the **Connection Pooling** string (starts with `postgresql://`)
7. Replace `[YOUR-PASSWORD]` in the string with your password
8. Paste into `server/.env` as `DATABASE_URL`

## ⏱️ Step 2: Upstash Redis Setup (2 min)
1. Open https://console.upstash.com/
2. Click "Create Database"
3. Settings:
   - Name: `scribbly-redis`
   - Type: `Regional`
   - Region: Same as Supabase
4. Click "Create"
5. Copy the **Connection String** (starts with `redis://`)
6. Paste into `server/.env` as `REDIS_URL`

## ⏱️ Step 3: Update Environment Variables (1 min)
Edit `server/.env`:
```env
DATABASE_URL=postgresql://postgres.xxx:password@xxx.pooler.supabase.com:6543/postgres
REDIS_URL=redis://default:password@xxx.upstash.io:6379
JWT_SECRET=your-super-secret-jwt-key-change-this-now-12345678
NODE_ENV=production
CORS_ORIGIN=https://your-app.vercel.app
```

## ⏱️ Step 4: Run Database Migrations (2 min)
```bash
cd server
npx prisma migrate deploy
npx prisma db seed
```

## ⏱️ Step 5: Deploy Backend (5 min)
**Option A: Railway (Recommended)**
1. Go to https://railway.app/
2. Sign in with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your repo → Select `server` folder
5. Add environment variables from `.env`
6. Deploy!

**Option B: Render**
1. Go to https://render.com/
2. Sign in with GitHub
3. New → Web Service
4. Connect your repo
5. Root Directory: `server`
6. Build: `npm install && npx prisma generate`
7. Start: `npm start`
8. Add environment variables
9. Deploy!

## ⏱️ Step 6: Deploy Frontend (3 min)
1. Go to https://vercel.com/
2. Sign in with GitHub
3. Import your repository
4. Settings:
   - Root Directory: `client`
   - Framework: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
5. Environment Variables:
   - `VITE_API_URL`: Your backend URL from Railway/Render
   - `VITE_WS_URL`: Your backend WebSocket URL
6. Deploy!

## ⏱️ Step 7: Final Configuration (2 min)
1. Update `server/.env` → `CORS_ORIGIN` with your Vercel URL
2. Redeploy backend
3. Test the app!

## 🎯 Total Time: ~20 minutes

## ✅ Pre-Launch Testing
- [ ] Can create account
- [ ] Can create room
- [ ] Can join room
- [ ] Drawing works
- [ ] Chat works
- [ ] Game rounds work
- [ ] Scoring works

## 📝 Important URLs to Save
- Frontend: https://your-app.vercel.app
- Backend: https://your-app.railway.app
- Supabase Dashboard: https://supabase.com/dashboard/project/[your-project]
- Upstash Dashboard: https://console.upstash.com/

## 🆘 If Something Breaks
1. Check Railway/Render logs
2. Check browser console
3. Verify environment variables
4. Check CORS settings
