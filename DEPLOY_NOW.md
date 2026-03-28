# 🚀 Deploy in 15 Minutes - Step by Step

## Part 1: Setup Cloud Services (5 min)

### A. Supabase (Database)
1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Fill in:
   - Name: `scribbly-game`
   - Password: Create strong password (SAVE IT!)
   - Region: Choose closest to you
4. Wait 2 minutes
5. Go to: **Settings** (gear icon in left sidebar) → **Database**
6. Scroll down to find **"Connection Pooling"** section
7. Look for **"Connection string"** under Transaction or Session mode
8. Copy the string (looks like: `postgresql://postgres.xxx:...`)
9. Replace `[YOUR-PASSWORD]` in the string with the password you created in step 3
10. **SAVE THIS COMPLETE STRING** - you'll need it in step 2

Example: If your password is `MyPass123`, change:
`postgresql://postgres.abc:[YOUR-PASSWORD]@...` 
to:
`postgresql://postgres.abc:MyPass123@...`

### B. Upstash (Redis)
1. Go to https://console.upstash.com/
2. Sign up with GitHub
3. Click "Create Database"
4. Fill in:
   - Name: `scribbly-redis`
   - Type: Regional
   - Region: Same as Supabase
5. Click "Create"
6. Copy the **Connection String** (starts with `redis://`)
7. **SAVE THIS STRING** - you'll need it in step 2

---

## Part 2: Deploy Backend to Railway (5 min)

1. Go to https://railway.app/
2. Sign in with GitHub
3. Click "New Project"
4. Select "Deploy from GitHub repo"
5. Choose your repository
6. Click "Add variables" and add these:

```
DATABASE_URL=<paste your Supabase connection string>
REDIS_URL=<paste your Upstash connection string>
JWT_SECRET=my-super-secret-jwt-key-change-later-12345678
NODE_ENV=production
PORT=3001
CORS_ORIGIN=*
```

7. In Settings:
   - Root Directory: `server`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm run prisma:deploy && npm start`
8. Click "Deploy"
9. Wait 3-4 minutes
10. Copy your Railway URL (looks like: `https://scribbly-production.up.railway.app`)

---

## Part 3: Deploy Frontend to Vercel (5 min)

1. Go to https://vercel.com/
2. Sign in with GitHub
3. Click "Add New" → "Project"
4. Import your repository
5. Configure:
   - Framework Preset: Vite
   - Root Directory: `client`
   - Build Command: `npm run build`
   - Output Directory: `dist`
6. Add Environment Variables:
   - `VITE_API_URL`: Your Railway URL (from Part 2)
   - `VITE_SOCKET_URL`: Your Railway URL (same as above)
7. Click "Deploy"
8. Wait 2-3 minutes
9. Copy your Vercel URL (looks like: `https://scribbly-game.vercel.app`)

---

## Part 4: Update CORS (2 min)

1. Go back to Railway dashboard
2. Click on your project
3. Go to Variables
4. Update `CORS_ORIGIN` from `*` to your Vercel URL
5. Click "Redeploy"

---

## Part 5: Run Database Migrations (3 min)

You need to run this once to set up your database tables:

```bash
# In your terminal
cd server

# Set the DATABASE_URL temporarily
$env:DATABASE_URL="<your-supabase-connection-string>"

# Run migrations
npx prisma migrate deploy

# Seed the database with initial data
npx prisma db seed
```

---

## ✅ You're Live!

Visit your Vercel URL and test:
- Create account
- Create room
- Join room
- Draw something
- Send chat message

---

## 🐛 Troubleshooting

### Backend won't start
- Check Railway logs
- Verify DATABASE_URL and REDIS_URL are correct
- Make sure you ran `prisma migrate deploy`

### Frontend can't connect
- Check browser console for errors
- Verify VITE_API_URL matches your Railway URL
- Check CORS_ORIGIN in Railway matches your Vercel URL

### Database errors
- Make sure you ran migrations: `npx prisma migrate deploy`
- Check Supabase dashboard to see if tables exist
- Verify connection string has correct password

---

## 📝 Save These URLs

- **Frontend**: https://your-app.vercel.app
- **Backend**: https://your-app.railway.app
- **Supabase**: https://supabase.com/dashboard/project/[your-project]
- **Upstash**: https://console.upstash.com/redis/[your-db]
- **Railway**: https://railway.app/project/[your-project]

---

## 🎯 Tomorrow's Launch Checklist

- [ ] Test on mobile
- [ ] Test with friends
- [ ] Check all game features work
- [ ] Prepare social media posts
- [ ] Have fun! 🎉
