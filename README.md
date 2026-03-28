# Scribbly - Multiplayer Drawing & Guessing Game

A real-time multiplayer drawing and guessing web game built with React, Node.js, Socket.io, and PostgreSQL.

## Features

- **Classic Mode**: Turn-based drawing where one player draws while others guess
- **Blitz Mode**: Everyone draws simultaneously and votes on the best drawing
- **Real-time Canvas Sync**: Sub-50ms drawing stroke synchronization
- **User Progression**: XP, leveling, and unlockable cosmetics
- **Word Pack Marketplace**: Community-created word collections
- **Mobile PWA**: Touch-optimized canvas with gesture support
- **Accessibility**: WCAG AA compliant with keyboard navigation

## Tech Stack

### Frontend
- React 18 + TypeScript
- Vite
- Tailwind CSS
- Socket.io Client
- Zustand (state management)
- Framer Motion (animations)

### Backend
- Node.js 20 + TypeScript
- Express.js
- Socket.io
- Prisma ORM
- PostgreSQL (Supabase)
- Redis (Upstash)

### Infrastructure
- Frontend: Vercel
- Backend: Fly.io
- Database: Supabase
- Redis: Upstash
- CDN: Cloudflare

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database (Supabase account)
- Redis instance (Upstash account)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd scribbly
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:

**Server (.env in server/):**
```bash
cp server/.env.example server/.env
# Edit server/.env with your database and Redis credentials
```

**Client (.env in client/):**
```bash
cp client/.env.example client/.env
# Edit client/.env with your API URL
```

4. Set up the database:
```bash
cd server
npm run prisma:migrate
npm run prisma:seed
cd ..
```

5. Start development servers:
```bash
npm run dev
```

This will start:
- Frontend: http://localhost:5173
- Backend: http://localhost:3001

## Project Structure

```
scribbly/
├── client/          # React frontend
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── stores/
│   │   ├── hooks/
│   │   └── lib/
│   └── package.json
├── server/          # Node.js backend
│   ├── src/
│   │   ├── config/
│   │   ├── http/
│   │   ├── socket/
│   │   ├── game/
│   │   └── services/
│   ├── prisma/
│   └── package.json
├── shared/          # Shared TypeScript types
│   └── src/types/
└── package.json     # Root workspace config
```

## Development

### Running Tests
```bash
npm test
```

### Linting
```bash
npm run lint
```

### Building for Production
```bash
npm run build
```

## Deployment

### Frontend (Vercel)
1. Connect your GitHub repository to Vercel
2. Set build command: `npm run build:client`
3. Set output directory: `client/dist`
4. Add environment variables from `client/.env.example`

### Backend (Fly.io)
1. Install Fly CLI: https://fly.io/docs/hands-on/install-flyctl/
2. Login: `flyctl auth login`
3. Deploy: `flyctl deploy`

### Database (Supabase)
1. Create a new project at https://supabase.com
2. Copy the connection string to `server/.env`
3. Run migrations: `npm run prisma:migrate`

### Redis (Upstash)
1. Create a new Redis database at https://upstash.com
2. Copy the connection string to `server/.env`

## License

MIT

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.
