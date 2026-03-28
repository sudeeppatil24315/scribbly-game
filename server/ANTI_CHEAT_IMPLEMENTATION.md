# Anti-Cheating Measures Implementation

This document describes the anti-cheating measures implemented for the Scribbly game as per Task 20 and Requirement 29.

## Overview

The anti-cheating system implements multiple layers of protection to ensure fair gameplay:

1. **Rate Limiting for Guesses** - Prevents spam guessing
2. **Multiple Connection Detection** - Prevents players from viewing the word as both drawer and guesser
3. **Coordinate Validation** - Ensures drawing coordinates are within bounds
4. **Server-Side Validation** - All game actions validated on server
5. **Fast Guess Detection** - Flags suspiciously fast correct guesses
6. **Pre-Round Guess Prevention** - Blocks guesses before round starts
7. **Suspicious Activity Logging** - Logs all suspicious behavior for admin review

## Implementation Details

### 1. AntiCheatService (`server/src/services/anti-cheat.service.ts`)

Core service that provides all anti-cheat functionality:

#### Rate Limiting for Guesses
- **Limit**: 5 guesses per second per player
- **Implementation**: Redis-based counter with 1-second TTL
- **Method**: `checkGuessRateLimit(roomCode, socketId)`
- **Returns**: `{ allowed: boolean, remaining: number }`

#### Multiple Connection Detection
- **Detection**: Tracks connections by userId (authenticated) or username (guests)
- **Action**: Disconnects older connection when duplicate detected
- **Implementation**: Redis hash storing connection data per room
- **Method**: `trackConnection(roomCode, socketId, userId, username)`
- **Returns**: `{ isMultipleConnection: boolean, existingSocketId?: string }`

#### Coordinate Validation
- **Bounds**: 0-800 (width), 0-600 (height)
- **Anomaly Threshold**: ±100 pixels beyond bounds
- **Method**: `validateDrawingCoordinates(x, y, maxWidth, maxHeight)`
- **Returns**: `{ valid: boolean, isAnomalous: boolean }`

#### Fast Guess Detection
- **Threshold**: 1 second from round start
- **Method**: `isFastGuess(roundStartTime)`
- **Returns**: `boolean`

#### Pre-Round Guess Prevention
- **Check**: Ensures roundStartTime is not null
- **Method**: `hasRoundStarted(roundStartTime)`
- **Returns**: `boolean`

#### Suspicious Activity Logging
- **Storage**: Redis with 24-hour TTL
- **Structure**: Individual keys + sorted set for retrieval
- **Method**: `logSuspiciousActivity(activity)`
- **Activity Types**:
  - `fast_guess` - Correct guess within 1 second
  - `multiple_connections` - Same player, multiple connections
  - `coordinate_anomaly` - Drawing coordinates far out of bounds
  - `pre_round_guess` - Guess before round started
  - `rapid_guessing` - Exceeded rate limit

### 2. Game Handler Updates (`server/src/socket/handlers/game.handler.ts`)

Enhanced `handleGuess` method with anti-cheat checks:

```typescript
// 1. Check guess rate limit (5 per second)
const rateCheck = await AntiCheatService.checkGuessRateLimit(roomCode, socket.id);
if (!rateCheck.allowed) {
  // Reject and log
}

// 2. Prevent guesses before round starts
if (!AntiCheatService.hasRoundStarted(room.gameState?.roundStartTime)) {
  // Reject and log
}

// 3. Detect fast correct guesses
if (result.correct && AntiCheatService.isFastGuess(room.gameState?.roundStartTime)) {
  // Log suspicious activity (but allow the guess)
}
```

### 3. Drawing Handler Updates (`server/src/socket/handlers/drawing.handler.ts`)

Enhanced `handleStrokeStart` and `handleFill` methods:

```typescript
// Validate coordinates and detect anomalies
const validation = AntiCheatService.validateDrawingCoordinates(x, y);

if (validation.isAnomalous) {
  // Log suspicious activity
  await AntiCheatService.logSuspiciousActivity({...});
}

// Coordinates are clamped by CanvasSync.startStroke()
```

### 4. Room Handler Updates (`server/src/socket/handlers/room.handler.ts`)

Enhanced `handleJoinRoom` method:

```typescript
// Detect multiple connections
const connectionCheck = await AntiCheatService.trackConnection(
  roomCode, socket.id, userId, username
);

if (connectionCheck.isMultipleConnection) {
  // Disconnect older connection
  this.socketServer.disconnectSocket(connectionCheck.existingSocketId);
  
  // Log suspicious activity
  await AntiCheatService.logSuspiciousActivity({...});
}
```

Enhanced `handleLeaveRoom` method:

```typescript
// Clean up connection tracking
await AntiCheatService.removeConnection(roomCode, socket.id);
```

### 5. Socket Server Updates (`server/src/socket/index.ts`)

Enhanced disconnect handler:

```typescript
socket.on('disconnect', async () => {
  // Reset rate limiters
  globalSocketRateLimiter.reset(socket.id);
  guessRateLimiter.reset(socket.id);
  drawingRateLimiter.reset(socket.id);
});
```

## Server-Side Validation

All game actions are validated on the server:

1. **Word Selection** - Validated in `GameEngine.selectWord()`
   - Checks drawer is correct player
   - Validates word index is within choices
   - Ensures word choices exist

2. **Guesses** - Validated in `GameEngine.processGuess()`
   - Checks player is not drawer
   - Validates player hasn't already guessed
   - Checks round is active

3. **Drawing Actions** - Validated in `DrawingHandler`
   - Checks player is drawer (or Blitz mode)
   - Validates coordinates are within bounds
   - Clamps coordinates to canvas bounds

4. **Votes** - Validated in `BlitzEngine.submitVote()`
   - Checks player is not voting for themselves
   - Validates target player exists

## Redis Data Structures

### Connection Tracking
```
connections:{roomCode} = Hash {
  [socketId]: JSON({
    userId: string | null,
    username: string,
    timestamp: number
  })
}
TTL: 1 hour
```

### Guess Rate Limiting
```
guess_rate:{roomCode}:{socketId} = String (count)
TTL: 1 second
```

### Suspicious Activity Logs
```
suspicious:{roomCode}:{socketId}:{timestamp} = JSON(SuspiciousActivity)
TTL: 24 hours

suspicious:list = Sorted Set (score = timestamp, value = key)
```

## Testing

Unit tests provided in `server/src/services/anti-cheat.service.test.ts`:

- ✓ Fast guess detection
- ✓ Guess rate limiting (5 per second)
- ✓ Multiple connection detection (by userId and username)
- ✓ Coordinate validation and anomaly detection
- ✓ Round start checking
- ✓ Suspicious activity logging

## Admin Review

Suspicious activity can be retrieved for admin review:

```typescript
// Get suspicious activity for a specific room
const roomActivity = await AntiCheatService.getSuspiciousActivityForRoom('ROOM123');

// Get all suspicious activity (last 100)
const allActivity = await AntiCheatService.getAllSuspiciousActivity(100);
```

Each log entry includes:
- `socketId` - Player's socket ID
- `userId` - Player's user ID (if authenticated)
- `username` - Player's username
- `roomCode` - Room where activity occurred
- `activityType` - Type of suspicious activity
- `details` - Additional context (coordinates, elapsed time, etc.)
- `timestamp` - When activity occurred

## Future Enhancements

Potential improvements for future iterations:

1. **Pattern Detection** - ML-based detection of drawing patterns that indicate cheating
2. **IP-Based Tracking** - Track multiple connections by IP address
3. **Reputation System** - Track player behavior over time
4. **Automated Actions** - Auto-kick players with repeated violations
5. **Admin Dashboard** - UI for reviewing and managing suspicious activity
6. **Appeal System** - Allow players to appeal false positives

## Requirements Satisfied

✅ **29.1** - Rate limiting of 5 guesses per second per player  
✅ **29.2** - Detect and prevent multiple browser tabs/windows  
✅ **29.3** - Disconnect older connection when multiple detected  
✅ **29.4** - Validate drawing coordinates within bounds (0-800, 0-600)  
✅ **29.5** - Server-side validation for all game actions  
✅ **29.6** - Detect suspiciously fast correct guesses (within 1 second)  
✅ **29.7** - Prevent guesses before round officially starts  
✅ **29.8** - Log suspicious activity for admin review
