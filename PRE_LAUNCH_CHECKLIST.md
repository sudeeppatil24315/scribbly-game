# ✅ Pre-Launch Checklist - Do This NOW

## 🔥 Critical Path (Must Do Before Launch)

### 1. Cloud Services Setup (5 min)
- [ ] Create Supabase account and project
- [ ] Copy Supabase DATABASE_URL
- [ ] Create Upstash account and Redis database
- [ ] Copy Upstash REDIS_URL

### 2. Deploy Backend (5 min)
- [ ] Sign up for Railway.app
- [ ] Deploy from GitHub
- [ ] Add all environment variables
- [ ] Wait for deployment to complete
- [ ] Copy Railway URL

### 3. Run Database Setup (3 min)
```bash
cd server
$env:DATABASE_URL="your-supabase-url"
npx prisma migrate deploy
npx prisma db seed
```
- [ ] Migrations completed successfully
- [ ] Seed data added

### 4. Deploy Frontend (5 min)
- [ ] Sign up for Vercel
- [ ] Import GitHub repository
- [ ] Set root directory to `client`
- [ ] Add VITE_API_URL (Railway URL)
- [ ] Add VITE_SOCKET_URL (Railway URL)
- [ ] Deploy
- [ ] Copy Vercel URL

### 5. Update CORS (2 min)
- [ ] Go to Railway dashboard
- [ ] Update CORS_ORIGIN to Vercel URL
- [ ] Redeploy

### 6. Test Everything (10 min)
- [ ] Open Vercel URL in browser
- [ ] Create a test account
- [ ] Create a room
- [ ] Open in incognito/another browser
- [ ] Join the room
- [ ] Test drawing
- [ ] Test chat
- [ ] Test game round
- [ ] Test scoring

---

## 🎯 Nice to Have (If Time Permits)

### Security
- [ ] Change JWT_SECRET to random 32+ character string
- [ ] Set up Google OAuth (optional)
- [ ] Review rate limits

### Performance
- [ ] Test with 4+ players
- [ ] Check Railway logs for errors
- [ ] Monitor Supabase connection count

### Polish
- [ ] Test on mobile device
- [ ] Check responsive design
- [ ] Test different browsers

---

## 📋 Environment Variables Reference

### Railway (Backend)
```
DATABASE_URL=postgresql://postgres.xxx:[PASSWORD]@xxx.pooler.supabase.com:6543/postgres
REDIS_URL=redis://default:[PASSWORD]@xxx.upstash.io:6379
JWT_SECRET=change-this-to-random-string-32-chars-minimum
NODE_ENV=production
PORT=3001
CORS_ORIGIN=https://your-app.vercel.app
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

### Vercel (Frontend)
```
VITE_API_URL=https://your-backend.railway.app
VITE_SOCKET_URL=https://your-backend.railway.app
```

---

## 🆘 Quick Fixes

### "Cannot connect to server"
1. Check Railway logs
2. Verify VITE_API_URL is correct
3. Check CORS_ORIGIN matches Vercel URL
4. Redeploy Railway

### "Database connection failed"
1. Check DATABASE_URL is correct
2. Verify password in connection string
3. Check Supabase project is running
4. Run migrations again

### "Redis connection failed"
1. Check REDIS_URL is correct
2. Verify Upstash database is active
3. Check password in connection string

### "WebSocket not connecting"
1. Verify VITE_SOCKET_URL matches backend
2. Check Railway supports WebSockets (it does)
3. Check browser console for errors

---

## 📞 Support Resources

- Railway Docs: https://docs.railway.app/
- Vercel Docs: https://vercel.com/docs
- Supabase Docs: https://supabase.com/docs
- Upstash Docs: https://docs.upstash.com/

---

## 🎉 Launch Day Tomorrow!

Once everything is checked:
1. Share the Vercel URL with friends
2. Monitor Railway logs
3. Be ready to fix issues quickly
4. Have fun!

**Your app will be live 24/7 without your laptop!**
