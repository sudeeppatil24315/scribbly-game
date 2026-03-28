# 🔐 Production Credentials - KEEP THIS SAFE!

## Database (Render PostgreSQL)
```
DATABASE_URL=postgresql://scribly:mfSe8zH4Fz5qPMpFeEGrlIDEinuDlXgN@dpg-d741ot7fte5s73b9phog-a.singapore-postgres.render.com/scribly
```

## Redis (Upstash)
```
REDIS_URL=rediss://default:gQAAAAAAAVO9AAIncDE5MWQwZmZlMzM5NDc0NDFiOGRjNGNhNjJlNWM4MzgyZHAxODY5NzM@simple-calf-86973.upstash.io:6379
```

## JWT Secret
```
JWT_SECRET=scribbly-game-jwt-secret-2024-production-key-a8f3k9m2p5x7z1q4w6e8r0t2y5u7i9o1
```

## Other Settings
```
NODE_ENV=production
PORT=3001
CORS_ORIGIN=* (update with frontend URL after deployment)
```

## Important Links
- Render Dashboard: https://dashboard.render.com/
- Upstash Dashboard: https://console.upstash.com/
- GitHub Repo: https://github.com/sudeeppatil24315/scribbly-game

## Notes
- Never commit this file to GitHub
- Keep this file secure and backed up
- Update CORS_ORIGIN after deploying frontend
