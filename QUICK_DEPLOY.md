# ⚡ Quick Deploy Reference

## 🔗 Links You Need

1. **Supabase**: https://supabase.com/dashboard
2. **Upstash**: https://console.upstash.com/
3. **Railway**: https://railway.app/
4. **Vercel**: https://vercel.com/

---

## 📝 Copy-Paste Commands

### Run Migrations (After getting Supabase URL)
```powershell
cd server
$env:DATABASE_URL="your-supabase-connection-string-here"
npx prisma migrate deploy
npx prisma db seed
```

### Test Locally (Optional)
```powershell
# Terminal 1 - Backend
cd server
npm run dev

# Terminal 2 - Frontend
cd client
npm run dev
```

---

## 🎯 Deployment Order

1. **Supabase** → Get DATABASE_URL
2. **Upstash** → Get REDIS_URL
3. **Railway** → Deploy backend with env vars
4. **Run Migrations** → Set up database tables
5. **Vercel** → Deploy frontend with Railway URL
6. **Update CORS** → Set Vercel URL in Railway

---

## 🔑 Environment Variables

### For Railway:
```
DATABASE_URL=<from-supabase>
REDIS_URL=<from-upstash>
JWT_SECRET=my-secret-key-12345678
NODE_ENV=production
PORT=3001
CORS_ORIGIN=<your-vercel-url>
```

### For Vercel:
```
VITE_API_URL=<your-railway-url>
VITE_SOCKET_URL=<your-railway-url>
```

---

## ✅ Success Indicators

- ✅ Railway shows "Deployed"
- ✅ Vercel shows "Ready"
- ✅ Can open Vercel URL
- ✅ Can create account
- ✅ Can create/join room
- ✅ Drawing works
- ✅ Chat works

---

## 🐛 If Something Breaks

1. Check Railway logs (click on deployment)
2. Check browser console (F12)
3. Verify all environment variables
4. Try redeploying

---

## ⏱️ Total Time: ~20 minutes

Good luck with tomorrow's launch! 🚀
