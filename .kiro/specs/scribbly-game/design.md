# Design Document: Scribbly Multiplayer Drawing Game

## Overview

Scribbly is a real-time multiplayer drawing and guessing web game that addresses the limitations of existing solutions like skribbl.io. The system enables players to join game rooms where they take turns drawing words while others guess, with real-time canvas synchronization, scoring, and progression mechanics.

### Core Features

- **Classic Mode**: Turn-based drawing where one player draws while others guess
- **Blitz Mode**: Simultaneous drawing where all players draw the same word and vote on the best
- **Real-time Canvas Sync**: Sub-50ms drawing stroke synchronization across all clients
- **User Progression**: XP, leveling, and unlockable cosmetics for authenticated users
- **Guest Play**: Frictionless entry without account creation
- **Word Pack Marketplace**: Community-created and curated word collections
- **Moderation Tools**: Profanity filtering, kick voting, and reporting system
- **Mobile PWA**: Touch-optimized canvas with gesture support
- **Reconnection Handling**: Seamless recovery from network interruptions

### Key Design Goals

1. **Low Latency**: Canvas events delivered within 50ms under normal conditions
2. **Scalability**: Support 100+ concurrent rooms with 12 players each
3. **Reliability**: 99.5% uptime with automatic reconnection
4. **Accessibility**: WCAG AA compliance with keyboard navigation and screen reader support
5. **Security**: Rate limiting, input validation, and anti-cheating measures

## Architecture

### System Architecture

The system follows a client-server architecture with WebSocket-based real-time communication:

```
┌─────────────────────────────────────────────────────────────┐
│                    Client (Browser/PWA)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ React UI     │  │ Canvas       │  │ Socket.io    │     │
│  │ Components   │  │ Renderer     │  │ Client       │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└────────────────────────────┬────────────────────────────────┘
                             │ HTTPS/WSS
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                    Load Balancer (Cloudflare)               │
└────────────────────────────┬────────────────────────────────┘
                             │
              ┌──────────────┴──────────────┐
              ▼                             ▼
┌──────────────────────┐        ┌──────────────────────┐
│   REST API Server    │        │  Socket.io Server    │
│   (Express.js)       │        │  (Express + WS)      │
│                      │        │                      │
│  - Auth endpoints    │        │  - RoomManager       │
│  - User management   │        │  - GameEngine        │
│  - Word packs        │        │  - CanvasSync        │
│  - Leaderboards      │        │  - ChatProcessor     │
└──────────┬───────────┘        └──────────┬───────────┘
           │                               │
           └───────────┬───────────────────┘
                       ▼
           ┌───────────────────────┐
           │    Redis Cache        │
           │  - Room state         │
           │  - Socket sessions    │
           │  - Canvas history     │
           │  - Rate limits        │
           └───────────┬───────────┘
                       │
                       ▼
           ┌───────────────────────┐
           │   PostgreSQL DB       │
           │  - Users              │
           │  - Game sessions      │
           │  - Word packs         │
           │  - Statistics         │
           └───────────────────────┘
```

### Technology Stack

**Frontend:**
- React 18 + TypeScript for UI components
- Vite for fast development and optimized builds
- Zustand for lightweight state management
- Socket.io Client for real-time communication
- HTML5 Canvas API for drawing
- Tailwind CSS for styling
- Framer Motion for animations
- Vite PWA Plugin for mobile app capabilities

**Backend:**
- Node.js 20 (LTS) with TypeScript
- Express.js for HTTP server
- Socket.io 4 for WebSocket communication
- Prisma ORM for database access
- Zod for schema validation
- JWT for authentication
- bcrypt for password hashing

**Infrastructure:**
- PostgreSQL (Supabase) for persistent data
- Redis (Upstash) for caching and real-time state
- Socket.io Redis Adapter for horizontal scaling
- Fly.io for backend hosting (always-on, WebSocket optimized)
- Vercel for frontend hosting (CDN-backed)
- Cloudflare for CDN and DDoS protection
- Sentry for error tracking
- GitHub Actions for CI/CD

### Scaling Strategy

**Phase 1 (MVP):** Single server instance with in-memory room state

**Phase 2:** Redis integration with Socket.io Redis Adapter for multi-instance synchronization

**Phase 3:** Horizontal scaling with load balancer and sticky sessions for WebSockets

## Components and Interfaces

### Backend Components

#### RoomManager

Manages the lifecycle of game rooms including creation, player management, and destruction.

```typescript
interface RoomManager {
  createRoom(hostSocketId: string, settings: RoomSettings): Room;
  joinRoom(roomCode: string, player: Player): JoinResult;
  leaveRoom(roomCode: string, socketId: string): void;
  kickPlayer(roomCode: string, targetSocketId: string, kickerSocketId: string): void;
  initiateKickVote(roomCode: string, targetSocketId: string, initiatorSocketId: string): void;
  voteKick(roomCode: string, targetSocketId: string, voterSocketId: string, vote: boolean): void;
  transferHost(roomCode: string, newHostSocketId: string): void;
  updateSettings(roomCode: string, settings: Partial<RoomSettings>): void;
  markDisconnected(roomCode: string, socketId: string): void;
  handleReconnection(roomCode: string, socketId: string): ReconnectionResult;
  destroyRoom(roomCode: string): void;
  getRoom(roomCode: string): Room | null;
  listPublicRooms(): Room[];
}

interface Room {
  code: string;
  hostSocketId: string;
  players: Map<string, Player>;
  spectators: Set<string>;
  settings: RoomSettings;
  state: 'lobby' | 'in-game' | 'ending';
  gameState: GameState | null;
  createdAt: Date;
  lastActivityAt: Date;
  disconnectionTimers: Map<string, NodeJS.Timeout>;
  destructionTimer: NodeJS.Timeout | null;
}

interface RoomSettings {
  maxPlayers: number; // 2-12
  rounds: number; // 1-10
  drawTime: number; // 30, 60, 80, or 120 seconds
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
  wordPackIds: string[];
  familySafeMode: boolean;
  allowSpectators: boolean;
  isPublic: boolean;
}

interface Player {
  socketId: string;
  userId: string | null;
  username: string;
  avatar: string;
  score: number;
  isHost: boolean;
  isConnected: boolean;
  joinedAt: Date;
}
```

#### GameEngine

Orchestrates turn-based gameplay, timing, and scoring for Classic Mode.

```typescript
interface GameEngine {
  startGame(roomCode: string): void;
  selectDrawer(roomCode: string): string;
  presentWordChoices(roomCode: string, drawerSocketId: string): void;
  handleWordSelection(roomCode: string, word: string): void;
  startRound(roomCode: string): void;
  processGuess(roomCode: string, socketId: string, guess: string): GuessResult;
  revealHintLetter(roomCode: string): void;
  endRound(roomCode: string, reason: 'timer' | 'all-guessed' | 'drawer-disconnect'): void;
  endGame(roomCode: string): void;
  handleDrawerDisconnect(roomCode: string): void;
}

interface GameState {
  mode: 'classic' | 'blitz';
  currentRound: number;
  totalRounds: number;
  drawerSocketId: string | null;
  currentWord: string | null;
  wordChoices: string[] | null;
  roundStartTime: Date | null;
  roundEndTime: Date | null;
  roundTimer: NodeJS.Timeout | null;
  hintTimers: NodeJS.Timeout[];
  hint: string;
  correctGuessers: Set<string>;
  usedWords: Set<string>;
  scores: Map<string, number>;
  guessOrder: string[];
}

interface GuessResult {
  correct: boolean;
  score: number;
  timeBonus: number;
  firstGuessBonus: number;
  drawerBonus: number;
}
```

#### BlitzEngine

Manages simultaneous drawing and voting for Blitz Mode.

```typescript
interface BlitzEngine {
  startBlitzGame(roomCode: string): void;
  startDrawingPhase(roomCode: string, word: string): void;
  collectDrawings(roomCode: string): Map<string, CanvasState>;
  startVotingPhase(roomCode: string): void;
  processVote(roomCode: string, voterSocketId: string, targetSocketId: string): void;
  calculateBlitzScores(roomCode: string): Map<string, number>;
  endBlitzRound(roomCode: string): void;
}

interface BlitzState {
  currentWord: string;
  drawingPhaseEndTime: Date;
  votingPhaseEndTime: Date;
  drawings: Map<string, CanvasState>;
  votes: Map<string, string>; // voterSocketId -> targetSocketId
  voteCount: Map<string, number>; // targetSocketId -> count
}
```

#### CanvasSync

Synchronizes drawing strokes across all clients in real-time.

```typescript
interface CanvasSync {
  broadcastStrokeStart(roomCode: string, stroke: StrokeStart): void;
  broadcastStrokeMove(roomCode: string, point: Point): void;
  broadcastStrokeEnd(roomCode: string, socketId: string): void;
  broadcastFill(roomCode: string, fill: FillAction): void;
  broadcastUndo(roomCode: string, socketId: string): void;
  broadcastClear(roomCode: string): void;
  saveStrokeHistory(roomCode: string, stroke: Stroke): void;
  getCanvasState(roomCode: string): CanvasState;
  replayCanvasState(socketId: string, canvasState: CanvasState): void;
  clearCanvasHistory(roomCode: string): void;
}

interface StrokeStart {
  socketId: string;
  x: number;
  y: number;
  color: string;
  size: number;
  tool: 'brush' | 'eraser';
  timestamp: number;
}

interface Point {
  x: number;
  y: number;
}

interface Stroke {
  id: string;
  socketId: string;
  points: Point[];
  color: string;
  size: number;
  tool: 'brush' | 'eraser';
  startTime: number;
  endTime: number;
}

interface FillAction {
  socketId: string;
  x: number;
  y: number;
  color: string;
  timestamp: number;
}

interface CanvasState {
  strokes: Stroke[];
  fills: FillAction[];
  version: number;
}
```

#### WordSelector

Selects words from word packs with fairness and variety constraints.

```typescript
interface WordSelector {
  selectWordChoices(
    wordPackIds: string[],
    difficulty: string,
    usedWords: Set<string>,
    count: number
  ): string[];
  getWordPack(packId: string): WordPack;
  filterByDifficulty(words: Word[], difficulty: string): Word[];
  excludeUsedWords(words: Word[], usedWords: Set<string>): Word[];
  reduceRecentWordProbability(words: Word[], recentWords: string[]): Word[];
}

interface WordPack {
  id: string;
  name: string;
  description: string;
  category: string;
  language: string;
  difficulty: string;
  words: Word[];
  isPublic: boolean;
  isCurated: boolean;
  creatorId: string | null;
}

interface Word {
  id: string;
  packId: string;
  word: string;
  difficulty: 'easy' | 'medium' | 'hard';
}
```

#### ScoreCalculator

Computes points and XP based on game actions.

```typescript
interface ScoreCalculator {
  calculateGuessScore(
    timeRemaining: number,
    roundDuration: number,
    isFirstGuess: boolean
  ): GuessScore;
  calculateDrawerBonus(correctGuessCount: number): number;
  calculateXP(
    userId: string,
    gameResult: GameResult
  ): XPBreakdown;
  applyTieBreaker(players: Player[], gameState: GameState): Player[];
}

interface GuessScore {
  baseScore: number;
  timeBonus: number;
  firstGuessBonus: number;
  totalScore: number;
}

interface XPBreakdown {
  correctGuesses: number;
  firstGuesses: number;
  roundsWon: number;
  gameWon: number;
  dailyBonus: number;
  totalXP: number;
}

interface GameResult {
  sessionId: string;
  mode: 'classic' | 'blitz';
  players: PlayerResult[];
  rounds: number;
  startedAt: Date;
  endedAt: Date;
}

interface PlayerResult {
  userId: string | null;
  username: string;
  finalScore: number;
  rank: number;
  correctGuesses: number;
  firstGuesses: number;
  roundsWon: number;
  totalGuessTime: number;
}
```

#### ProfanityFilter

Filters inappropriate content from chat and usernames.

```typescript
interface ProfanityFilter {
  filterText(text: string, level: 'off' | 'standard' | 'strict'): string;
  containsProfanity(text: string, level: 'off' | 'standard' | 'strict'): boolean;
  validateUsername(username: string): ValidationResult;
}

interface ValidationResult {
  valid: boolean;
  reason?: string;
  sanitized?: string;
}
```

### Frontend Components

#### Canvas Components

```typescript
// DrawCanvas.tsx
interface DrawCanvasProps {
  isDrawer: boolean;
  canvasState: CanvasState;
  onStrokeStart: (stroke: StrokeStart) => void;
  onStrokeMove: (point: Point) => void;
  onStrokeEnd: () => void;
  onFill: (fill: FillAction) => void;
  onUndo: () => void;
  onClear: () => void;
}

// Toolbar.tsx
interface ToolbarProps {
  selectedTool: 'brush' | 'eraser' | 'fill';
  selectedColor: string;
  selectedSize: number;
  onToolChange: (tool: string) => void;
  onColorChange: (color: string) => void;
  onSizeChange: (size: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  disabled: boolean;
}
```

#### Game Components

```typescript
// WordPicker.tsx
interface WordPickerProps {
  words: string[];
  onSelect: (word: string) => void;
  timeRemaining: number;
}

// WordHint.tsx
interface WordHintProps {
  hint: string;
  wordLength: number;
}

// Timer.tsx
interface TimerProps {
  seconds: number;
  totalSeconds: number;
  variant: 'round' | 'voting' | 'word-selection';
}

// Scoreboard.tsx
interface ScoreboardProps {
  players: Player[];
  currentDrawerSocketId: string | null;
  spectatorCount: number;
}
```

### API Endpoints

#### Authentication

```
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout
GET    /api/v1/auth/me
POST   /api/v1/auth/oauth/google
```

#### Users

```
GET    /api/v1/users/:username
PATCH  /api/v1/users/me
GET    /api/v1/users/me/stats
GET    /api/v1/users/me/cosmetics
PATCH  /api/v1/users/me/cosmetics/:id/equip
GET    /api/v1/leaderboard
```

#### Rooms

```
POST   /api/v1/rooms
GET    /api/v1/rooms/:code
GET    /api/v1/rooms/public
```

#### Word Packs

```
GET    /api/v1/wordpacks
GET    /api/v1/wordpacks/:id
POST   /api/v1/wordpacks
PATCH  /api/v1/wordpacks/:id
DELETE /api/v1/wordpacks/:id
POST   /api/v1/wordpacks/:id/rate
GET    /api/v1/wordpacks/trending
GET    /api/v1/wordpacks/curated
```

### Socket.io Events

#### Client → Server

```
room:join              { roomCode, username, userId? }
room:leave             —
room:start             { settings }
room:kick              { targetSocketId }
room:vote-kick         { targetSocketId }
draw:stroke-start      { x, y, color, size, tool }
draw:stroke-move       { x, y }
draw:stroke-end        —
draw:fill              { x, y, color }
draw:undo              —
draw:clear             —
game:word-pick         { word }
game:guess             { text }
game:blitz-submit      —
game:blitz-vote        { targetSocketId }
```

#### Server → Client

```
room:joined            { room, players, settings }
room:player-joined     { player }
room:player-left       { socketId }
room:player-reconnected { socketId }
room:kicked            —
room:kick-vote         { targetSocketId, votes, required }
game:starting          { countdown }
game:turn-start        { drawer, round, totalRounds, timeLimit }
game:word-choices      { words: [w1, w2, w3] }
game:word-hint         { hint, length }
game:hint-reveal       { hint }
game:canvas-state      { strokes: [] }
draw:stroke-start      { socketId, x, y, color, size, tool }
draw:stroke-move       { socketId, x, y }
draw:stroke-end        { socketId }
draw:fill              { socketId, x, y, color }
draw:undo              { socketId }
draw:clear             —
game:guess             { socketId, username, text }
game:correct-guess     { socketId, username, score, timeBonus }
game:scores-update     { scores: { socketId: score } }
game:timer             { seconds }
game:turn-end          { word, scores, reason }
game:end               { finalScores, winner, xpEarned }
game:blitz-reveal      { drawings }
game:blitz-votes       { votes }
error                  { code, message }
```

## Data Models

### Database Schema

```sql
-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(32) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE,
  password_hash TEXT,
  oauth_provider VARCHAR(32),
  oauth_id TEXT,
  avatar_url TEXT,
  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  is_banned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Player Statistics
CREATE TABLE player_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  games_played INTEGER DEFAULT 0,
  games_won INTEGER DEFAULT 0,
  total_score BIGINT DEFAULT 0,
  correct_guesses INTEGER DEFAULT 0,
  words_drawn INTEGER DEFAULT 0,
  UNIQUE(user_id)
);

-- Cosmetics
CREATE TABLE cosmetics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(64) NOT NULL,
  type VARCHAR(32) NOT NULL,
  unlock_level INTEGER NOT NULL,
  asset_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_cosmetics (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  cosmetic_id UUID REFERENCES cosmetics(id),
  equipped BOOLEAN DEFAULT false,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, cosmetic_id)
);

-- Word Packs
CREATE TABLE word_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES users(id) ON DELETE SET NULL,
  name VARCHAR(128) NOT NULL,
  description TEXT,
  category VARCHAR(64),
  language VARCHAR(16) DEFAULT 'en',
  difficulty VARCHAR(16) DEFAULT 'medium',
  is_public BOOLEAN DEFAULT true,
  is_curated BOOLEAN DEFAULT false,
  play_count INTEGER DEFAULT 0,
  rating_sum INTEGER DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE words (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id UUID REFERENCES word_packs(id) ON DELETE CASCADE,
  word VARCHAR(128) NOT NULL,
  difficulty VARCHAR(16)
);

CREATE TABLE word_pack_ratings (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  pack_id UUID REFERENCES word_packs(id) ON DELETE CASCADE,
  rating SMALLINT CHECK (rating BETWEEN 1 AND 5),
  rated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, pack_id)
);

-- Game History
CREATE TABLE game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id VARCHAR(16) NOT NULL,
  mode VARCHAR(32) DEFAULT 'classic',
  rounds SMALLINT,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  word_pack_id UUID REFERENCES word_packs(id) ON DELETE SET NULL
);

CREATE TABLE game_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES game_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  guest_name VARCHAR(32),
  final_score INTEGER DEFAULT 0,
  final_rank SMALLINT,
  xp_earned INTEGER DEFAULT 0
);

-- Reports
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES users(id) ON DELETE SET NULL,
  reported_id UUID REFERENCES users(id) ON DELETE CASCADE,
  reason VARCHAR(128),
  details TEXT,
  room_id VARCHAR(16),
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Refresh Tokens
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Redis Data Structures

```typescript
// Room state (hash)
room:{roomCode} = {
  hostSocketId: string,
  state: 'lobby' | 'in-game' | 'ending',
  settings: JSON,
  createdAt: timestamp,
  lastActivityAt: timestamp
}

// Room players (hash)
room:{roomCode}:players = {
  [socketId]: JSON(Player)
}

// Room spectators (set)
room:{roomCode}:spectators = Set<socketId>

// Canvas history (list)
room:{roomCode}:canvas = [
  JSON(Stroke),
  JSON(FillAction),
  ...
]

// Game state (hash)
room:{roomCode}:game = {
  mode: string,
  currentRound: number,
  drawerSocketId: string,
  currentWord: string,
  hint: string,
  roundStartTime: timestamp,
  usedWords: JSON(Set),
  scores: JSON(Map),
  correctGuessers: JSON(Set)
}

// Socket to room mapping (string)
socket:{socketId}:room = roomCode

// Rate limiting (string with TTL)
ratelimit:{ip}:{endpoint} = count

// Leaderboard (sorted set)
leaderboard:global = {
  [userId]: xp
}

// Recent words (list with TTL)
words:recent = [word1, word2, ...]
```


## Error Handling

### Error Categories

#### Network Errors

**WebSocket Connection Failures:**
- Implement exponential backoff reconnection: 1s, 2s, 4s, 8s, max 30s
- Display "Reconnecting..." overlay with connection status
- Preserve room state during reconnection window (30 seconds)
- Replay canvas state and game state upon successful reconnection

**High Latency Detection:**
- Monitor round-trip time for socket events
- Display network quality warning when latency exceeds 500ms
- Degrade gracefully by reducing canvas event frequency if needed

**Simultaneous Disconnections:**
- If all players disconnect, start 60-second room destruction timer
- Cancel timer if any player reconnects
- Destroy room immediately if timer expires

#### Service Failures

**Redis Unavailability:**
- Fall back to in-memory room state for current sessions
- Log error to Sentry with high priority
- Display admin alert for manual intervention
- Prevent new room creation until Redis is restored

**PostgreSQL Unavailability:**
- Allow guest gameplay to continue (no database dependency)
- Disable account-related features (login, registration, stats)
- Queue XP/stats updates in Redis for later persistence
- Display user-friendly message: "Account features temporarily unavailable"

**Circuit Breaker Pattern:**
- Implement for database and Redis connections
- Open circuit after 5 consecutive failures
- Half-open after 30 seconds to test recovery
- Close circuit after 3 successful requests

#### Validation Errors

**Invalid Room Codes:**
- Return HTTP 404 with message: "Room not found or expired"
- Redirect to home page with error toast

**Invalid Usernames:**
- Reject usernames with profanity
- Reject usernames outside 2-20 character range
- Reject usernames with invalid characters
- Return specific error message for each case

**Invalid Drawing Coordinates:**
- Validate all coordinates are within bounds (0-800, 0-600)
- Silently clamp out-of-bounds coordinates
- Log suspicious patterns (many out-of-bounds attempts)

**Invalid Game Actions:**
- Validate word selection is from provided choices
- Validate guesses are submitted by non-drawers
- Validate votes are for valid targets
- Return error event with code and message

#### Rate Limiting

**HTTP Endpoints:**
- 100 requests/minute for auth endpoints
- 200 requests/minute for general endpoints
- Return HTTP 429 with Retry-After header
- Display toast: "Too many requests, please wait"

**Socket Events:**
- 50 events/second per connection
- 5 guesses/second per player
- Disconnect client if sustained abuse detected
- Log rate limit violations for analysis

### Error Response Format

**HTTP Errors:**
```typescript
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
    timestamp: string;
  };
}
```

**Socket Errors:**
```typescript
interface SocketError {
  code: string;
  message: string;
  details?: Record<string, any>;
}
```

### Error Codes

```typescript
enum ErrorCode {
  // Room errors
  ROOM_NOT_FOUND = 'ROOM_NOT_FOUND',
  ROOM_FULL = 'ROOM_FULL',
  ROOM_IN_GAME = 'ROOM_IN_GAME',
  INVALID_ROOM_CODE = 'INVALID_ROOM_CODE',
  
  // Auth errors
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  UNAUTHORIZED = 'UNAUTHORIZED',
  USERNAME_TAKEN = 'USERNAME_TAKEN',
  INVALID_USERNAME = 'INVALID_USERNAME',
  
  // Game errors
  NOT_YOUR_TURN = 'NOT_YOUR_TURN',
  INVALID_WORD_CHOICE = 'INVALID_WORD_CHOICE',
  ALREADY_GUESSED = 'ALREADY_GUESSED',
  GAME_NOT_STARTED = 'GAME_NOT_STARTED',
  
  // Validation errors
  INVALID_INPUT = 'INVALID_INPUT',
  PROFANITY_DETECTED = 'PROFANITY_DETECTED',
  
  // Rate limiting
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  
  // System errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
}
```

### Logging Strategy

**Error Logging:**
- All errors logged to Sentry with context (userId, roomCode, socketId)
- Critical errors trigger immediate alerts
- Error aggregation by type for pattern detection

**Audit Logging:**
- Log all moderation actions (kicks, bans, reports)
- Log suspicious activity (rapid guessing, coordinate anomalies)
- Log authentication events (login, logout, token refresh)

**Performance Logging:**
- Log canvas sync latency percentiles (p50, p95, p99)
- Log room creation/destruction events
- Log database query performance

## Testing Strategy

### Unit Testing

**Backend Services (Target: 80% coverage):**
- RoomManager: room lifecycle, player management, kick voting
- GameEngine: turn flow, scoring, word selection, hint reveals
- BlitzEngine: simultaneous drawing, voting, score calculation
- ScoreCalculator: guess scoring, XP calculation, tie-breaking
- WordSelector: word selection fairness, difficulty filtering, variety
- ProfanityFilter: text filtering, username validation
- CanvasSync: stroke broadcasting, history management

**Frontend Components (Target: 70% coverage):**
- Canvas rendering and interaction
- Game state management (Zustand stores)
- Socket event handlers
- Form validation
- UI component behavior

**Testing Tools:**
- Jest for unit tests
- React Testing Library for component tests
- Supertest for HTTP endpoint tests
- Mock Socket.io for socket event tests

### Integration Testing

**Socket.io Event Flows:**
- Room join/leave flow
- Complete game flow (start → rounds → end)
- Drawing synchronization across multiple clients
- Reconnection handling
- Kick voting process
- Blitz mode voting

**Database Operations:**
- User registration and authentication
- Game session persistence
- XP and level updates
- Word pack CRUD operations
- Leaderboard updates

**Redis Operations:**
- Room state caching
- Canvas history storage and retrieval
- Rate limiting
- Socket session management

### End-to-End Testing

**Critical User Flows:**
1. Guest creates room → friend joins → play game → complete game
2. User registers → logs in → creates room → plays game → earns XP
3. User creates word pack → uses in game → receives creator XP
4. Player disconnects → reconnects → resumes game
5. Host kicks player → player removed from room
6. Blitz mode: all draw → vote → scores calculated

**Testing Tools:**
- Playwright for browser automation
- Multiple browser instances for multiplayer simulation
- Mobile device emulation for PWA testing

### Property-Based Testing

**Scoring Calculations:**
- Property: For any valid time remaining and round duration, score should be between 0 and 1000
- Property: First guesser always receives higher score than later guessers (given same time)
- Property: Drawer bonus increases monotonically with correct guess count

**Word Selection:**
- Property: Selected words should never repeat within the same game session
- Property: Word distribution across packs should be approximately uniform
- Property: All selected words should match the configured difficulty level

**Canvas Synchronization:**
- Property: Replaying stroke history should produce identical canvas state
- Property: All coordinates should be within bounds (0-800, 0-600)

**Testing Library:**
- fast-check for JavaScript/TypeScript property-based testing
- Minimum 100 iterations per property test

### Performance Testing

**Load Testing:**
- Simulate 100 concurrent rooms with 12 players each (1,200 concurrent users)
- Measure canvas sync latency under load (target: <50ms p95)
- Measure room creation/join latency (target: <200ms p95)
- Measure database query performance (target: <100ms p95)

**Stress Testing:**
- Gradually increase load until system degradation
- Identify bottlenecks and failure points
- Test recovery after overload

**Testing Tools:**
- Artillery for load testing
- k6 for stress testing
- Custom Socket.io load generator

### Browser Compatibility Testing

**Desktop Browsers:**
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

**Mobile Browsers:**
- iOS Safari (latest 2 versions)
- Android Chrome (latest 2 versions)

**Testing Focus:**
- Canvas rendering and touch events
- WebSocket connection stability
- PWA installation and offline behavior
- Responsive layout across screen sizes

### Accessibility Testing

**Automated Testing:**
- axe-core for WCAG compliance scanning
- Lighthouse accessibility audits

**Manual Testing:**
- Keyboard navigation through all interactive elements
- Screen reader compatibility (NVDA, JAWS, VoiceOver)
- Color blind mode verification
- Focus indicator visibility

### CI/CD Pipeline

**GitHub Actions Workflow:**
1. Lint code (ESLint, Prettier)
2. Type check (TypeScript)
3. Run unit tests
4. Run integration tests
5. Build frontend and backend
6. Run E2E tests
7. Deploy to staging
8. Run smoke tests on staging
9. Deploy to production (manual approval)

**Test Requirements for Deployment:**
- All unit tests must pass
- Integration tests must pass
- E2E tests for critical flows must pass
- No TypeScript errors
- No ESLint errors

### Test Tagging for Property-Based Tests

Each property-based test must include a comment tag referencing the design document:

```typescript
// Feature: scribbly-game, Property 1: Guess scoring is monotonically decreasing with time
test('guess scoring decreases as time decreases', () => {
  fc.assert(
    fc.property(
      fc.integer({ min: 0, max: 120 }),
      fc.integer({ min: 0, max: 120 }),
      (timeRemaining, roundDuration) => {
        fc.pre(timeRemaining <= roundDuration);
        const score1 = calculateGuessScore(timeRemaining, roundDuration, false);
        const score2 = calculateGuessScore(timeRemaining - 1, roundDuration, false);
        return score1.totalScore >= score2.totalScore;
      }
    ),
    { numRuns: 100 }
  );
});
```

