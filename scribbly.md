# Scribbly — Product Requirements Document (PRD)

> **Version:** 1.0  
> **Status:** Draft  
> **Last Updated:** March 2026  
> **Document Owner:** Product Team

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Goals & Success Metrics](#3-goals--success-metrics)
4. [Target Users & Personas](#4-target-users--personas)
5. [Competitive Analysis](#5-competitive-analysis)
6. [Product Overview & Feature List](#6-product-overview--feature-list)
7. [Detailed Feature Specifications](#7-detailed-feature-specifications)
8. [Tech Stack](#8-tech-stack)
9. [System Architecture](#9-system-architecture)
10. [Database Schema](#10-database-schema)
11. [API Design](#11-api-design)
12. [Socket.io Event Reference](#12-socketio-event-reference)
13. [Frontend Structure](#13-frontend-structure)
14. [Backend Structure](#14-backend-structure)
15. [Game Logic Specification](#15-game-logic-specification)
16. [Security & Moderation](#16-security--moderation)
17. [Performance Requirements](#17-performance-requirements)
18. [UI/UX Guidelines](#18-uiux-guidelines)
19. [Phased Roadmap & Milestones](#19-phased-roadmap--milestones)
20. [Risks & Mitigations](#20-risks--mitigations)
21. [Open Questions](#21-open-questions)

---

## 1. Executive Summary

**Scribbly** is a real-time multiplayer drawing and guessing web game — a direct competitor to skribbl.io — built to fix every major pain point the original has: poor reliability, no user accounts, toxic chat, passive gameplay, and zero customization.

Scribbly's core differentiators are:
- **Blitz Mode** — everyone draws simultaneously, no one waits
- **User accounts** with XP, levels, and unlockable cosmetics
- **Smart moderation** with profanity filters, reporting, and family-safe rooms
- **Community word packs** — browse, create, and rate custom word sets
- **Rock-solid infrastructure** — zero tolerance for dropped connections

The goal is to become the #1 go-to drawing game for friend groups, classrooms, game nights, and streamers.

---

## 2. Problem Statement

Skribbl.io is the dominant browser-based drawing game but has significant unresolved issues after years in production:

| Pain Point | Evidence |
|---|---|
| Frequent server outages and WebSocket errors | Widespread user reports on Reddit and app stores |
| No user accounts or progression | Feature requested for years, never shipped |
| Toxic chat with slurs and inappropriate content | Reported extensively in community feedback |
| Passive gameplay — only one person draws, everyone else waits | Core structural flaw |
| No mobile optimization | Canvas and touch controls are broken on mobile |
| No customization beyond basic word lists | No theming, no word pack marketplace |
| No moderation tools | No report button, no kick vote, no mute |

These are not edge cases — they are the defining user experience of the current market leader. There is a clear opening for a better product.

---

## 3. Goals & Success Metrics

### Product Goals

- Ship a more reliable, more fun, more social drawing game than skribbl.io
- Reach product-market fit with friend groups and casual gaming communities
- Build a platform that supports long-term retention through progression and community

### Launch KPIs (6 months post-launch)

| Metric | Target |
|---|---|
| Daily Active Users (DAU) | 10,000 |
| Average session length | 25 minutes |
| D7 retention | 30% |
| Average rooms per day | 2,000+ |
| User account creation rate | 60% of visitors |
| Crash / disconnect rate | < 0.5% |
| App store rating (mobile PWA) | 4.5+ |

### North Star Metric

**Weekly Active Rooms** — the number of rooms played per week. This captures both acquisition (new users finding the game) and retention (users coming back to play again).

---

## 4. Target Users & Personas

### Persona 1 — The Friend Group Organizer ("Weekend Priya")
- Age 22–32, urban, uses Discord with their friend group
- Wants a quick, fun game for game night that anyone can join via a link
- Pain point: skribbl.io keeps disconnecting mid-game
- Needs: reliable private rooms, easy invite link, no sign-up friction for guests

### Persona 2 — The Casual Gamer ("Grind-mode Arjun")
- Age 16–24, plays games daily, cares about progression
- Wants XP, unlockables, a profile to show off
- Pain point: skribbl.io has no progression, so he has no reason to return
- Needs: account system, XP/leveling, cosmetics, leaderboard

### Persona 3 — The Teacher ("Ms. Kavitha")
- Age 30–50, uses games in classrooms or family settings
- Pain point: skribbl.io allows offensive words, making it unsafe for kids
- Needs: family-safe mode, custom word packs (curriculum-based), no chat abuse

### Persona 4 — The Streamer ("Content Creator Rohan")
- Age 20–35, streams on YouTube/Twitch with their audience
- Needs: branded rooms, audience participation, spectator mode, clip-worthy moments

---

## 5. Competitive Analysis

| Feature | Skribbl.io | Gartic Phone | Drawasaurus | **Scribbly** |
|---|---|---|---|---|
| Real-time drawing sync | ✅ | ✅ | ✅ | ✅ |
| User accounts | ❌ | ❌ | ❌ | ✅ |
| XP & progression | ❌ | ❌ | ❌ | ✅ |
| Simultaneous draw mode | ❌ | ✅ (chain) | ❌ | ✅ |
| Custom word packs | Basic | ❌ | Basic | ✅ Marketplace |
| Mobile-optimized canvas | ❌ | ✅ | Partial | ✅ |
| Profanity filter | Basic | ✅ | ❌ | ✅ Smart |
| Private rooms | ✅ | ✅ | ✅ | ✅ |
| Reconnection handling | ❌ Poor | ✅ | Partial | ✅ |
| Spectator mode | ❌ | ❌ | ❌ | ✅ |
| Leaderboard | ❌ | ❌ | ❌ | ✅ |
| Report / moderation | ❌ | ❌ | ❌ | ✅ |
| Open source word packs | ❌ | ❌ | ❌ | ✅ |

---

## 6. Product Overview & Feature List

### Core Features (MVP)

- Real-time multiplayer drawing and guessing (Classic Mode)
- Public lobbies and private rooms (invite via code/link)
- Guest play (no account required)
- Drawing canvas with brush, eraser, fill, color palette, undo/redo
- Guess chat with correct-answer detection
- Turn-based game loop with timer, scoring, and round management
- Word selection (choose from 3 options each turn)
- Live scoreboard
- Room host controls (kick, start, settings)

### Core Features (Post-MVP)

- User accounts (email/OAuth)
- XP, leveling, and progression system
- Cosmetics: avatars, brush skins, canvas themes (unlockable)
- Blitz Mode (everyone draws simultaneously)
- Community word pack marketplace
- Family-safe mode with moderation
- Mobile PWA with touch-optimized canvas
- Spectator mode
- Reconnection handling
- Global leaderboard

### Future Features (v2+)

- Team mode (draw as a team)
- Streamer mode with audience participation
- Animated stickers / reactions
- Voice chat integration
- Tournament brackets
- Subscription / creator monetization

---

## 7. Detailed Feature Specifications

---

### 7.1 Classic Mode (MVP)

**Description:** Turn-based drawing and guessing. One player draws per turn, all others guess.

**Flow:**
1. Room host configures settings and starts the game
2. Game randomly selects a drawer each round (round-robin)
3. Drawer is shown 3 word choices and selects one (15-second window, auto-selects if idle)
4. Drawer draws on the canvas. All strokes are broadcast in real-time to all players
5. Other players type guesses in the chat box
6. Server compares guess to the word (case-insensitive, trimmed)
7. Correct guesses: guesser earns points based on time remaining; drawer earns points per correct guesser
8. Round ends when: timer expires OR all non-drawer players have guessed correctly
9. After round ends: reveal the word, show round scores
10. After all rounds: show final scoreboard with XP earned

**Scoring:**
- Correct guess: `base_score = 500`, time bonus: `+Math.floor((timeRemaining / roundDuration) * 500)`
- Drawer bonus: `+200 per player who guessed correctly`
- First correct guess: additional `+100` bonus
- Guess after others: points decrease as more people guess

**Room Settings (configurable by host):**
- Players: 2–12
- Rounds: 1–10 (default 3)
- Draw time: 30, 60, 80, 120 seconds
- Word difficulty: Easy / Medium / Hard / Mixed
- Word language / category
- Custom word list (optional)
- Family-safe mode toggle
- Allow/disallow spectators

---

### 7.2 Blitz Mode

**Description:** All players draw the same word simultaneously. At the end of the round, everyone votes on the best drawing. No waiting. Everyone is active all the time.

**Flow:**
1. Server picks a word (from selected category)
2. All players see the word and draw simultaneously (60s timer)
3. After timer: drawing phase ends, voting phase begins (15s)
4. Each player sees all other drawings (randomly shuffled) and votes for their favourite
5. Votes are tallied; most votes = highest score
6. Bonus: +50 XP for the most-voted drawing per round
7. Repeat for N rounds

**Why this wins:** Eliminates the "waiting while someone else draws" dead time that is the #1 complaint about Classic Mode.

---

### 7.3 User Accounts & Progression

**Auth options:**
- Email + password
- Google OAuth
- Guest mode (temporary session, no progression saved)

**Player Profile:**
- Username, avatar (from cosmetics), XP, level, total games played, win rate, favourite word category

**XP Sources:**
| Action | XP Earned |
|---|---|
| Correct guess | 50 XP |
| First correct guess | +25 bonus XP |
| Round won (most points) | 100 XP |
| Game won | 200 XP |
| Daily play bonus | 100 XP |
| Word pack created and used by others | 10 XP per play |

**Leveling:**
- Level 1–100+
- XP formula: `xp_for_level = 500 * level^1.5`
- Each level unlocks cosmetic reward (brush, avatar frame, canvas theme, etc.)

**Cosmetics (unlockables):**
- Avatar frames (borders around profile picture)
- Brush styles (chalk, marker, watercolor stroke effects)
- Canvas background themes (blackboard, paper, whiteboard)
- Cursor skins
- Word reveal animations

---

### 7.4 Word Pack Marketplace

**Description:** Users can create, publish, and discover word packs.

**Pack structure:**
- Pack name, description, category tag, language
- Min 20 words, max 500
- Difficulty rating
- Public / private / friends-only visibility
- Rating system (1–5 stars)
- Play count

**Discovery:**
- Browse by category: Movies, Science, Food, Sports, History, Pop Culture, Memes, etc.
- Search by keyword
- Trending packs (most played this week)
- Curated packs (staff picks)
- User-created packs

**In-room:** Host can select any combination of word packs or use the default curated list.

---

### 7.5 Moderation & Safety

**Profanity filter:**
- Applied to chat guesses and usernames
- Configurable: off, standard, strict (family-safe)
- Uses a maintained open-source filter library + custom blocklist
- Family-safe mode also filters the word list to exclude mature content

**In-room controls:**
- Host can kick any player
- Kick vote: any player can initiate a kick vote; majority vote = kicked
- Mute: any player can mute another player's chat locally
- Report: report a player for abuse (sends report to admin queue)

**Admin panel (internal):**
- View flagged reports
- Ban users by IP or account
- Review and remove inappropriate word packs

---

### 7.6 Reconnection Handling

- If a player disconnects, they have a 30-second reconnection window before being removed
- On reconnect: the server replays the current canvas state (stroke history) and restores their seat
- If the drawer disconnects and does not reconnect: skip their turn, pick the next drawer
- Room persists as long as at least 2 connected players remain

---

### 7.7 Spectator Mode

- Players can join a room as spectators (if host allows)
- Spectators see the canvas and chat in real-time
- Spectators cannot submit guesses
- Spectators can see the word being drawn (for entertainment)
- Spectator count shown to all players

---

## 8. Tech Stack

### Frontend

| Layer | Technology | Reason |
|---|---|---|
| Framework | React 18 + Vite | Fast dev builds, component model, ecosystem |
| Language | TypeScript | Type safety across a complex real-time app |
| Routing | React Router v6 | SPA routing (home → lobby → game) |
| State Management | Zustand | Lightweight, no boilerplate, ideal for game state |
| Real-time Client | Socket.io Client | Matches backend, auto-reconnect built-in |
| Canvas | HTML5 Canvas API | Native, performant, no library overhead |
| Styling | Tailwind CSS | Utility-first, fast iteration |
| Animation | Framer Motion | Smooth UI animations and transitions |
| Auth | Firebase Auth (or Auth.js) | Easy OAuth integration |
| HTTP Client | Axios | REST API calls for lobby, profiles, word packs |
| PWA | Vite PWA Plugin | Installable on mobile, offline shell |

### Backend

| Layer | Technology | Reason |
|---|---|---|
| Runtime | Node.js 20 (LTS) | Non-blocking I/O, same language as frontend |
| Framework | Express.js | Minimal, flexible HTTP server |
| Real-time | Socket.io 4 | Industry standard, room management built-in |
| Language | TypeScript | Shared types with frontend |
| Auth | JWT (access + refresh tokens) | Stateless, scalable auth |
| Validation | Zod | Schema validation for all incoming data |
| Rate Limiting | express-rate-limit | Protect against abuse |

### Database

| Layer | Technology | Reason |
|---|---|---|
| Primary DB | PostgreSQL | Relational, reliable, great for users/scores/packs |
| ORM | Prisma | Type-safe queries, easy migrations |
| Cache / Session | Redis | Room state, socket sessions, rate limiting |
| Real-time Scaling | Socket.io Redis Adapter | Sync sockets across multiple server instances |

### Infrastructure

| Layer | Technology | Reason |
|---|---|---|
| Hosting (API) | Railway or Render | Easy Node.js deployment, free tier to start |
| Hosting (Frontend) | Vercel | CDN-backed, instant deploys |
| Database Hosting | Supabase or Railway Postgres | Managed PostgreSQL |
| Redis Hosting | Upstash | Serverless Redis, free tier |
| CDN | Cloudflare | Static assets, DDoS protection |
| Monitoring | Sentry | Error tracking, crash reports |
| Logging | Logtail / Better Stack | Structured logs |
| CI/CD | GitHub Actions | Automated tests + deploy on push |

---

## 9. System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           CLIENT (Browser / PWA)                    │
│                                                                     │
│   React App (Vite + TypeScript)                                     │
│   ├── HTTP REST calls (Axios) ──────────────────────────────────┐  │
│   └── WebSocket (Socket.io client) ────────────────────────────┐│  │
└────────────────────────────────────────────────────────────────┼┼──┘
                                                                 ││
                              HTTPS / WSS (TLS)                  ││
                                                                 ││
┌────────────────────────────────────────────────────────────────┼┼──┐
│                    LOAD BALANCER (Cloudflare / Nginx)           ││  │
└────────────────────────────────────────────────────────────────┼┼──┘
                                                                 ││
         ┌───────────────────────────────────────────────────────┘│
         │                                                         │
         ▼                                                         ▼
┌─────────────────────┐                              ┌──────────────────────┐
│   REST API Server   │                              │  Socket.io Server    │
│   (Express.js)      │                              │  (Express + ws)      │
│                     │                              │                      │
│  /api/auth          │                              │  RoomManager         │
│  /api/users         │                              │  GameEngine          │
│  /api/rooms         │                              │  CanvasSync          │
│  /api/wordpacks     │                              │  ChatProcessor       │
│  /api/leaderboard   │                              │                      │
└──────────┬──────────┘                              └──────────┬───────────┘
           │                                                    │
           │          ┌─────────────────────┐                  │
           └──────────►     Redis Cache      ◄──────────────────┘
                      │                     │
                      │  - Room state       │
                      │  - Socket sessions  │
                      │  - Rate limits      │
                      │  - Canvas history   │
                      └──────────┬──────────┘
                                 │
                      ┌──────────▼──────────┐
                      │    PostgreSQL DB     │
                      │                     │
                      │  - Users            │
                      │  - Sessions         │
                      │  - Word Packs       │
                      │  - Game History     │
                      │  - Scores           │
                      │  - Reports          │
                      └─────────────────────┘
```

### Scaling Strategy

- **Phase 1 (MVP):** Single server instance, in-memory room state, no Redis
- **Phase 2:** Add Redis, Socket.io Redis Adapter for multi-instance socket sync
- **Phase 3:** Horizontal scaling behind load balancer, sticky sessions for WebSockets

---

## 10. Database Schema

```sql
-- USERS
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username      VARCHAR(32) UNIQUE NOT NULL,
  email         VARCHAR(255) UNIQUE,
  password_hash TEXT,
  oauth_provider VARCHAR(32),       -- 'google', 'github', null
  oauth_id      TEXT,
  avatar_url    TEXT,
  xp            INTEGER DEFAULT 0,
  level         INTEGER DEFAULT 1,
  is_banned     BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- PLAYER STATS
CREATE TABLE player_stats (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  games_played    INTEGER DEFAULT 0,
  games_won       INTEGER DEFAULT 0,
  total_score     BIGINT DEFAULT 0,
  correct_guesses INTEGER DEFAULT 0,
  words_drawn     INTEGER DEFAULT 0,
  UNIQUE(user_id)
);

-- COSMETICS
CREATE TABLE cosmetics (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(64) NOT NULL,
  type        VARCHAR(32) NOT NULL,   -- 'avatar_frame', 'brush', 'canvas_theme', 'cursor'
  unlock_level INTEGER NOT NULL,
  asset_url   TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_cosmetics (
  user_id      UUID REFERENCES users(id) ON DELETE CASCADE,
  cosmetic_id  UUID REFERENCES cosmetics(id),
  equipped     BOOLEAN DEFAULT false,
  unlocked_at  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, cosmetic_id)
);

-- WORD PACKS
CREATE TABLE word_packs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id  UUID REFERENCES users(id) ON DELETE SET NULL,
  name        VARCHAR(128) NOT NULL,
  description TEXT,
  category    VARCHAR(64),
  language    VARCHAR(16) DEFAULT 'en',
  difficulty  VARCHAR(16) DEFAULT 'medium',   -- 'easy', 'medium', 'hard'
  is_public   BOOLEAN DEFAULT true,
  is_curated  BOOLEAN DEFAULT false,
  play_count  INTEGER DEFAULT 0,
  rating_sum  INTEGER DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE words (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id     UUID REFERENCES word_packs(id) ON DELETE CASCADE,
  word        VARCHAR(128) NOT NULL,
  difficulty  VARCHAR(16)
);

CREATE TABLE word_pack_ratings (
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  pack_id     UUID REFERENCES word_packs(id) ON DELETE CASCADE,
  rating      SMALLINT CHECK (rating BETWEEN 1 AND 5),
  rated_at    TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, pack_id)
);

-- GAME HISTORY
CREATE TABLE game_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id     VARCHAR(16) NOT NULL,
  mode        VARCHAR(32) DEFAULT 'classic',
  rounds      SMALLINT,
  started_at  TIMESTAMPTZ,
  ended_at    TIMESTAMPTZ,
  word_pack_id UUID REFERENCES word_packs(id) ON DELETE SET NULL
);

CREATE TABLE game_players (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID REFERENCES game_sessions(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
  guest_name      VARCHAR(32),
  final_score     INTEGER DEFAULT 0,
  final_rank      SMALLINT,
  xp_earned       INTEGER DEFAULT 0
);

-- REPORTS
CREATE TABLE reports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES users(id) ON DELETE SET NULL,
  reported_id UUID REFERENCES users(id) ON DELETE CASCADE,
  reason      VARCHAR(128),
  details     TEXT,
  room_id     VARCHAR(16),
  resolved    BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- REFRESH TOKENS
CREATE TABLE refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 11. API Design

Base URL: `https://api.scribbly.io/v1`

All authenticated endpoints require: `Authorization: Bearer <access_token>`

### Auth

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/register` | Register with email + password |
| POST | `/auth/login` | Login, returns access + refresh tokens |
| POST | `/auth/refresh` | Refresh access token |
| POST | `/auth/logout` | Invalidate refresh token |
| GET | `/auth/me` | Get current user profile |
| POST | `/auth/oauth/google` | Google OAuth login/register |

### Users

| Method | Endpoint | Description |
|---|---|---|
| GET | `/users/:username` | Get public profile |
| PATCH | `/users/me` | Update username, avatar |
| GET | `/users/me/stats` | Get personal stats |
| GET | `/users/me/cosmetics` | Get owned cosmetics |
| PATCH | `/users/me/cosmetics/:id/equip` | Equip a cosmetic |
| GET | `/leaderboard` | Global top players by XP |

### Rooms

| Method | Endpoint | Description |
|---|---|---|
| POST | `/rooms` | Create a new private room |
| GET | `/rooms/:code` | Get room info (pre-join) |
| GET | `/rooms/public` | List public rooms |

### Word Packs

| Method | Endpoint | Description |
|---|---|---|
| GET | `/wordpacks` | List packs (filter by category, language, search) |
| GET | `/wordpacks/:id` | Get pack details + word list |
| POST | `/wordpacks` | Create a new word pack |
| PATCH | `/wordpacks/:id` | Update your word pack |
| DELETE | `/wordpacks/:id` | Delete your word pack |
| POST | `/wordpacks/:id/rate` | Rate a word pack |
| GET | `/wordpacks/trending` | Trending packs this week |
| GET | `/wordpacks/curated` | Staff-curated packs |

### Moderation

| Method | Endpoint | Description |
|---|---|---|
| POST | `/reports` | Submit a report |

---

## 12. Socket.io Event Reference

### Client → Server

| Event | Payload | Description |
|---|---|---|
| `room:join` | `{ roomCode, username, userId? }` | Join or create a room |
| `room:leave` | — | Leave current room |
| `room:start` | `{ settings }` | Host starts the game |
| `room:kick` | `{ targetSocketId }` | Host kicks a player |
| `room:vote-kick` | `{ targetSocketId }` | Player initiates kick vote |
| `draw:stroke-start` | `{ x, y, color, size, tool }` | Begin a new stroke |
| `draw:stroke-move` | `{ x, y }` | Continue stroke |
| `draw:stroke-end` | — | End stroke |
| `draw:fill` | `{ x, y, color }` | Bucket fill action |
| `draw:undo` | — | Undo last stroke |
| `draw:clear` | — | Clear canvas (drawer only) |
| `game:word-pick` | `{ word }` | Drawer selects word from 3 choices |
| `game:guess` | `{ text }` | Player submits a guess |
| `game:blitz-submit` | — | Blitz mode: player done drawing |
| `game:blitz-vote` | `{ targetSocketId }` | Blitz mode: vote for a drawing |

### Server → Client

| Event | Payload | Description |
|---|---|---|
| `room:joined` | `{ room, players, settings }` | Confirmation of join + full state |
| `room:player-joined` | `{ player }` | Another player joined |
| `room:player-left` | `{ socketId }` | Player left |
| `room:player-reconnected` | `{ socketId }` | Player came back |
| `room:kicked` | — | You were kicked |
| `room:kick-vote` | `{ targetSocketId, votes, required }` | Kick vote in progress |
| `game:starting` | `{ countdown }` | Game about to start (3s countdown) |
| `game:turn-start` | `{ drawer, round, totalRounds, timeLimit }` | New turn begins |
| `game:word-choices` | `{ words: [w1, w2, w3] }` | Sent only to drawer |
| `game:word-hint` | `{ hint, length }` | Word hint (e.g. "_ _ _ _ _") |
| `game:hint-reveal` | `{ hint }` | Reveal a letter mid-round |
| `game:canvas-state` | `{ strokes: [] }` | Full canvas history (on join/reconnect) |
| `draw:stroke-start` | `{ socketId, x, y, color, size, tool }` | Broadcast stroke start |
| `draw:stroke-move` | `{ socketId, x, y }` | Broadcast stroke move |
| `draw:stroke-end` | `{ socketId }` | Broadcast stroke end |
| `draw:fill` | `{ socketId, x, y, color }` | Broadcast fill |
| `draw:undo` | `{ socketId }` | Broadcast undo |
| `draw:clear` | — | Broadcast clear |
| `game:guess` | `{ socketId, username, text }` | Broadcast a guess (non-correct) |
| `game:correct-guess` | `{ socketId, username, score, timeBonus }` | A player guessed correctly |
| `game:scores-update` | `{ scores: { socketId: score } }` | Live score update |
| `game:timer` | `{ seconds }` | Timer tick (every second) |
| `game:turn-end` | `{ word, scores, reason }` | Turn over, reveal word |
| `game:end` | `{ finalScores, winner, xpEarned }` | Game over |
| `game:blitz-reveal` | `{ drawings }` | Blitz: show all drawings for voting |
| `game:blitz-votes` | `{ votes }` | Blitz: live vote counts |
| `error` | `{ code, message }` | Error message to client |

---

## 13. Frontend Structure

```
client/
├── public/
│   └── icons/, manifest.json (PWA)
│
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   │
│   ├── pages/
│   │   ├── Home.tsx          # Landing: name, create/join room
│   │   ├── Lobby.tsx         # Room waiting screen
│   │   ├── Game.tsx          # Main game screen
│   │   ├── Profile.tsx       # User profile + stats + cosmetics
│   │   ├── WordPacks.tsx     # Browse / create word packs
│   │   └── Leaderboard.tsx
│   │
│   ├── components/
│   │   ├── canvas/
│   │   │   ├── DrawCanvas.tsx       # Main canvas element
│   │   │   ├── Toolbar.tsx          # Tools, colors, size
│   │   │   ├── useDrawing.ts        # Drawing logic hook
│   │   │   └── useFill.ts           # Flood fill algorithm
│   │   │
│   │   ├── game/
│   │   │   ├── WordPicker.tsx       # 3-word choice modal
│   │   │   ├── WordHint.tsx         # Blanks + revealed letters
│   │   │   ├── Timer.tsx            # Countdown ring
│   │   │   ├── RoundBanner.tsx      # "Round 2 of 3" overlay
│   │   │   └── TurnEndOverlay.tsx   # Word reveal + mini scores
│   │   │
│   │   ├── chat/
│   │   │   ├── ChatFeed.tsx         # Messages list
│   │   │   ├── ChatInput.tsx        # Guess input
│   │   │   └── ChatMessage.tsx      # Individual message (correct/wrong)
│   │   │
│   │   ├── room/
│   │   │   ├── Scoreboard.tsx       # Live scores sidebar
│   │   │   ├── PlayerCard.tsx       # Player avatar + name + score
│   │   │   └── RoomSettings.tsx     # Host settings panel
│   │   │
│   │   └── ui/
│   │       ├── Button.tsx
│   │       ├── Modal.tsx
│   │       ├── Toast.tsx
│   │       ├── Avatar.tsx
│   │       └── Spinner.tsx
│   │
│   ├── stores/
│   │   ├── gameStore.ts      # Game state (room, players, scores, round)
│   │   ├── authStore.ts      # User auth state
│   │   └── canvasStore.ts    # Canvas history, tool state
│   │
│   ├── hooks/
│   │   ├── useSocket.ts      # Socket.io connection + events
│   │   ├── useAuth.ts        # Auth helpers
│   │   └── useWordPacks.ts   # Word pack API calls
│   │
│   ├── lib/
│   │   ├── socket.ts         # Socket.io client singleton
│   │   ├── api.ts            # Axios instance + interceptors
│   │   └── floodFill.ts      # Canvas flood fill algorithm
│   │
│   └── types/
│       ├── game.types.ts
│       ├── user.types.ts
│       └── socket.types.ts
```

---

## 14. Backend Structure

```
server/
├── src/
│   ├── index.ts              # Entry point: Express + Socket.io setup
│   │
│   ├── config/
│   │   ├── env.ts            # Environment variable validation (Zod)
│   │   ├── db.ts             # Prisma client
│   │   └── redis.ts          # Redis client
│   │
│   ├── http/
│   │   ├── routes/
│   │   │   ├── auth.routes.ts
│   │   │   ├── user.routes.ts
│   │   │   ├── room.routes.ts
│   │   │   ├── wordpack.routes.ts
│   │   │   └── report.routes.ts
│   │   │
│   │   ├── controllers/
│   │   │   ├── auth.controller.ts
│   │   │   ├── user.controller.ts
│   │   │   ├── room.controller.ts
│   │   │   └── wordpack.controller.ts
│   │   │
│   │   └── middleware/
│   │       ├── authenticate.ts     # JWT verification
│   │       ├── rateLimiter.ts
│   │       ├── errorHandler.ts
│   │       └── validate.ts         # Zod schema validation
│   │
│   ├── socket/
│   │   ├── index.ts              # Socket.io server init + namespace
│   │   ├── handlers/
│   │   │   ├── room.handler.ts    # Join, leave, kick, settings
│   │   │   ├── draw.handler.ts    # All drawing events
│   │   │   ├── game.handler.ts    # Word pick, guess, turn flow
│   │   │   └── chat.handler.ts    # Chat filtering + broadcast
│   │   └── middleware/
│   │       └── socketAuth.ts      # Authenticate socket connection
│   │
│   ├── game/
│   │   ├── RoomManager.ts         # Create, find, destroy rooms
│   │   ├── GameEngine.ts          # Turn loop, timer, scoring logic
│   │   ├── BlitzEngine.ts         # Blitz mode logic
│   │   ├── WordSelector.ts        # Pick words from packs
│   │   └── ScoreCalculator.ts     # Points + XP calculation
│   │
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── user.service.ts
│   │   ├── wordpack.service.ts
│   │   └── moderation.service.ts  # Profanity filter, report handling
│   │
│   └── types/
│       ├── room.types.ts
│       ├── game.types.ts
│       └── socket.types.ts
│
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│
└── tests/
    ├── game/
    └── http/
```

---

## 15. Game Logic Specification

### Room State (in Redis)

```typescript
interface Room {
  id: string;                      // 6-char alphanumeric code
  hostSocketId: string;
  players: Player[];
  settings: RoomSettings;
  game: GameState | null;
  spectators: Spectator[];
  createdAt: number;
}

interface Player {
  socketId: string;
  userId: string | null;           // null for guests
  username: string;
  avatar: string;
  score: number;
  isConnected: boolean;
  disconnectedAt: number | null;
}

interface GameState {
  mode: 'classic' | 'blitz';
  round: number;
  maxRounds: number;
  currentDrawerSocketId: string;
  currentWord: string;
  wordChoices: string[];
  wordHint: string;                // e.g. "_ _ e _ _ _ _ _"
  turnStartTime: number;
  turnDuration: number;            // seconds
  guessedPlayers: string[];        // socket IDs
  strokeHistory: Stroke[];         // for canvas replay
  phase: 'waiting' | 'choosing' | 'drawing' | 'reveal' | 'ended';
}
```

### Turn Flow (Classic Mode)

```
START_TURN
  ↓ emit game:turn-start to all players
  ↓ emit game:word-choices (3 words) to drawer only
  ↓ start 15s word-choice timer
    → if drawer picks: start drawing phase
    → if timer expires: auto-pick first word

DRAWING_PHASE
  ↓ emit game:word-hint (blanks) to non-drawers
  ↓ start round timer (e.g. 80s)
  ↓ every 30% of time elapsed: reveal one random letter in hint
  ↓ on each stroke: append to strokeHistory in Redis + broadcast

GUESS_PROCESSING
  ↓ on game:guess event:
    → strip and lowercase input
    → if within 1 Levenshtein distance of word: send "close!" hint to guesser only (no broadcast)
    → if exact match:
        → add to guessedPlayers
        → calculate score (time-based)
        → emit game:correct-guess to all
        → update drawer score (+200)
        → if all players guessed: end turn early

TURN_END trigger conditions:
  → timer reaches 0
  → all non-drawers have guessed
  → drawer disconnects (skip turn)

TURN_END
  ↓ clear timer
  ↓ emit game:turn-end to all (with word + scores)
  ↓ 5-second break
  ↓ if more turns remain: START_TURN with next drawer
  ↓ else: GAME_END

GAME_END
  ↓ calculate final rankings
  ↓ calculate XP earned per player
  ↓ emit game:end to all
  ↓ persist game session to PostgreSQL (async)
  ↓ update user XP and stats in DB
  ↓ schedule room cleanup after 2 minutes
```

### Scoring Formula

```typescript
function calculateGuessScore(
  timeRemaining: number,
  turnDuration: number,
  guessOrder: number         // 1st correct = 1, 2nd = 2, etc.
): number {
  const timeRatio = timeRemaining / turnDuration;
  const baseScore = Math.floor(500 * timeRatio);
  const orderBonus = guessOrder === 1 ? 100 : 0;
  const orderPenalty = (guessOrder - 1) * 30;
  return Math.max(50, baseScore + orderBonus - orderPenalty);
}

function calculateDrawerScore(correctGuessCount: number): number {
  return correctGuessCount * 200;
}

function calculateXP(score: number, won: boolean): number {
  return Math.floor(score / 10) + (won ? 200 : 0);
}
```

---

## 16. Security & Moderation

### Input Validation
- All socket payloads validated with Zod schemas on server
- Reject strokes outside canvas bounds (0–1 normalized coordinates)
- Max chat message length: 100 characters
- Max username length: 32 characters, alphanumeric + underscore only

### Rate Limiting
- REST API: 100 req/min per IP (general), 10 req/min for auth endpoints
- Socket events: 60 `draw:stroke-move` events/second per socket
- Guess submissions: 5 guesses/second per player

### Authentication
- Access tokens: JWT, 15-minute expiry
- Refresh tokens: opaque, stored hashed in DB, 30-day expiry
- Socket auth: token sent on connection handshake, verified before any events processed
- Guests: assigned a temporary UUID, stored in localStorage

### Profanity Filter
- Library: `bad-words` (npm) with extended custom wordlist
- Applied to: usernames, chat guesses, word pack names and words
- Family-safe mode enables stricter wordlist
- Server-side only (never trust client)

### Anti-cheat
- Word is never sent to non-drawer clients (only the hint)
- Server validates all guess comparisons — client cannot self-report a correct guess
- Drawing events are broadcast by server — client cannot fake another player's drawing

### CORS & Transport Security
- CORS restricted to known frontend origins
- All traffic over HTTPS/WSS
- HTTP security headers: Helmet.js
- WebSocket connections authenticated before accepting any game events

---

## 17. Performance Requirements

| Metric | Target |
|---|---|
| Canvas stroke latency (P95) | < 80ms round-trip |
| Room join time | < 500ms |
| API response time (P95) | < 200ms |
| Concurrent rooms per server | 500 |
| Concurrent players per server | 5,000 |
| Canvas stroke history max (per turn) | 2,000 strokes |
| Redis key TTL (inactive room) | 2 hours |

### Canvas Optimization
- Strokes are normalized to 0–1 coordinates, scaled on client (resolution-independent)
- `stroke-move` events are throttled to 60/sec on client before emitting
- Server does not process stroke data — it broadcasts as-is (no validation of coordinates in hot path, only bounds check)
- Canvas state for reconnecting players: replay stroke history from Redis on reconnect

---

## 18. UI/UX Guidelines

### Design Principles
- **Playful but not childish** — bright, energetic, but readable and clean
- **Speed-first** — every interaction should feel instant; use optimistic updates
- **Mobile-first canvas** — touch drawing must feel as good as mouse drawing

### Canvas UX
- Pressure simulation on desktop (stroke width varies with speed)
- Palm rejection on touch devices (ignore large contact points)
- Pinch-to-zoom disabled (prevents accidental zoom in-game)
- Undo limited to 10 actions
- Color picker: fixed 24-color palette + custom hex input

### Accessibility
- All interactive elements keyboard-navigable
- Color palette labeled with color names (for screen readers)
- Chat timestamps on hover
- High-contrast mode support via CSS variables

### Key Screens

1. **Home** — Enter name → Create Room / Join Room / Browse Public Rooms
2. **Lobby** — Player list, room settings (host), invite link, Start button
3. **Game (drawing)** — Canvas takes 70% of screen; word shown top-center; toolbar below canvas
4. **Game (guessing)** — Canvas (no toolbar); guess input pinned to bottom; scoreboard in sidebar
5. **Turn End** — Animated overlay reveals word, shows point breakdown, 5s countdown
6. **Game End** — Podium animation, final scores, XP earned, "Play Again" / "New Room"
7. **Profile** — Avatar, level, stats, cosmetics grid, recent games
8. **Word Pack Editor** — Add/remove/edit words, pack metadata, publish toggle

---

## 19. Phased Roadmap & Milestones

### Phase 1 — MVP (Weeks 1–6)
**Goal:** Playable core game with no accounts

- [ ] Project setup (monorepo, Vite, Express, Socket.io, TypeScript)
- [ ] Canvas drawing + real-time sync across clients
- [ ] Classic game loop (turns, timer, word selection)
- [ ] Guess detection with scoring
- [ ] Public and private rooms (code-based)
- [ ] Live scoreboard
- [ ] Game end screen
- [ ] Basic profanity filter on chat
- [ ] Deploy to staging

### Phase 2 — Accounts & Progression (Weeks 7–10)
**Goal:** Reason to return

- [ ] User registration + login (email + Google OAuth)
- [ ] JWT auth + refresh token flow
- [ ] XP and leveling system
- [ ] Player profiles with stats
- [ ] Cosmetics system (avatars, frames)
- [ ] Daily login bonus

### Phase 3 — Blitz Mode & Word Packs (Weeks 11–14)
**Goal:** Differentiators live

- [ ] Blitz Mode (simultaneous drawing + voting)
- [ ] Word pack creation UI
- [ ] Word pack browser with categories
- [ ] Pack rating system
- [ ] Custom pack selection in room settings

### Phase 4 — Polish & Safety (Weeks 15–17)
**Goal:** Safe for all audiences, production-ready

- [ ] Reconnection handling (30-second grace period)
- [ ] Kick vote system
- [ ] Report system
- [ ] Family-safe mode (strict filter + kid-friendly word list)
- [ ] Spectator mode
- [ ] Mobile canvas optimization (touch input, PWA)

### Phase 5 — Scale & Growth (Weeks 18+)
**Goal:** Handle real traffic

- [ ] Redis integration for multi-server socket sync
- [ ] Global leaderboard
- [ ] Performance profiling + optimization
- [ ] Sentry error monitoring
- [ ] Marketing site + SEO

---

## 20. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| WebSocket instability under load | Medium | High | Load test early; Redis adapter; proper reconnection |
| Canvas sync latency spikes | Medium | High | Throttle events client-side; delta compression |
| Inappropriate content in user word packs | High | Medium | Community flagging + review queue; profanity scan on submit |
| Low retention without progression | High | High | Ship account system in Phase 2 before marketing push |
| Scaling beyond single server | Low (MVP) | High | Architecture designed for Redis adapter from day 1 |
| Mobile canvas feel poor | Medium | Medium | Dedicate a full sprint to touch optimization |
| Abuse / botting | Low | Medium | Rate limiting + IP banning from day 1 |

---

## 21. Open Questions

- [ ] **Monetization model:** Free-to-play with cosmetic purchases? Subscription for premium packs? No monetization initially?
- [ ] **Word pack IP:** How do we handle copyrighted content in community word packs (e.g. Disney characters)?
- [ ] **Streamer mode:** Is this in scope for v1 or a later phase?
- [ ] **Mobile app:** PWA only, or eventually native iOS/Android via React Native?
- [ ] **Languages:** English-first, or multi-language word packs from launch?
- [ ] **Room persistence:** Should private rooms survive a server restart (Redis TTL)?
- [ ] **AI integration:** Hint generation, auto-word difficulty rating, or AI-generated word packs as a future feature?

---

*End of PRD — Scribbly v1.0*
