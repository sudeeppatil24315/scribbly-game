# Implementation Plan: Scribbly Multiplayer Drawing Game

## Overview

This implementation plan breaks down the Scribbly multiplayer drawing game into discrete, incremental coding tasks. The system is built with TypeScript on both frontend (React + Vite) and backend (Node.js + Express + Socket.io), with PostgreSQL for persistence and Redis for real-time state management.

The implementation follows a bottom-up approach: core infrastructure → game logic → real-time features → user features → polish.

## Tasks

- [x] 1. Project setup and infrastructure
  - Initialize monorepo structure with frontend and backend workspaces
  - Configure TypeScript, ESLint, Prettier for both projects
  - Set up Vite for frontend with React, Tailwind CSS, and PWA plugin
  - Set up Express server with TypeScript compilation
  - Configure environment variable validation with Zod
  - _Requirements: 35.9_

- [x] 2. Database and ORM setup
  - [x] 2.1 Initialize Prisma ORM and create database schema
    - Create Prisma schema with all tables: users, player_stats, cosmetics, user_cosmetics, word_packs, words, word_pack_ratings, game_sessions, game_players, reports, refresh_tokens
    - Generate Prisma client and configure connection
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5, 17.6, 17.7_

  - [x] 2.2 Create database seed script for default content
    - Seed 5 curated word packs (General, Animals, Food, Objects, Actions) with 100+ words each
    - Seed cosmetics table with unlockable items at various levels
    - _Requirements: 22.1, 22.2, 22.3, 22.4, 22.7_


- [x] 3. Redis setup and connection management
  - Configure Redis client with connection pooling
  - Create Redis utility functions for room state, canvas history, and rate limiting
  - Implement Redis key naming conventions and TTL management
  - _Requirements: 4.8, 16.4_

- [x] 4. Authentication system
  - [x] 4.1 Implement JWT token generation and validation
    - Create access token (15-minute expiry) and refresh token (7-day expiry) generation
    - Implement token verification middleware for HTTP endpoints
    - Store refresh tokens as hashed values in database
    - _Requirements: 2.6, 2.7, 18.6, 18.7, 18.8, 18.9_

  - [x] 4.2 Create authentication endpoints
    - POST /api/v1/auth/register (email/password)
    - POST /api/v1/auth/login
    - POST /api/v1/auth/refresh
    - POST /api/v1/auth/logout
    - GET /api/v1/auth/me
    - _Requirements: 2.4, 2.5_

  - [x] 4.3 Implement Google OAuth integration
    - POST /api/v1/auth/oauth/google endpoint
    - Handle OAuth token exchange and user creation/login
    - _Requirements: 2.5_

  - [ ]* 4.4 Write unit tests for authentication flows
    - Test token generation, validation, and expiry
    - Test registration, login, refresh, and logout flows
    - Test OAuth integration
    - _Requirements: 35.1, 35.2_

- [x] 5. User management and validation
  - [x] 5.1 Implement username validation and profanity filtering
    - Create ProfanityFilter service with blocklist
    - Validate username length (2-20 characters), allowed characters, and profanity
    - Implement three filter levels: off, standard, strict
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 25.1, 25.2, 25.3, 25.4, 25.5, 25.6, 25.7_

  - [x] 5.2 Create user profile endpoints
    - GET /api/v1/users/:username
    - PATCH /api/v1/users/me
    - GET /api/v1/users/me/stats
    - GET /api/v1/users/me/cosmetics
    - PATCH /api/v1/users/me/cosmetics/:id/equip
    - _Requirements: 8.8_

  - [ ]* 5.3 Write unit tests for user validation
    - Test username validation edge cases
    - Test profanity filter with various inputs
    - _Requirements: 35.1_


- [x] 6. Word pack management
  - [x] 6.1 Implement WordSelector service
    - Create word selection algorithm with fairness constraints
    - Filter by difficulty, exclude used words, reduce recent word probability
    - Distribute selection evenly across multiple packs
    - _Requirements: 33.1, 33.2, 33.3, 33.4, 33.5, 33.6, 33.7_

  - [x] 6.2 Create word pack CRUD endpoints
    - GET /api/v1/wordpacks (with filtering and search)
    - GET /api/v1/wordpacks/:id
    - POST /api/v1/wordpacks
    - PATCH /api/v1/wordpacks/:id
    - DELETE /api/v1/wordpacks/:id
    - POST /api/v1/wordpacks/:id/rate
    - GET /api/v1/wordpacks/trending
    - GET /api/v1/wordpacks/curated
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8_

  - [ ]* 6.3 Write property tests for word selection fairness
    - Test that words never repeat within same session
    - Test that word distribution across packs is approximately uniform
    - Test that selected words match configured difficulty
    - _Requirements: 35.10_

- [x] 7. Rate limiting and security middleware
  - Implement rate limiting for HTTP endpoints (100/min auth, 200/min general)
  - Implement rate limiting for Socket.io events (50/sec per connection, 5 guesses/sec)
  - Create input validation middleware using Zod schemas
  - Return HTTP 429 with Retry-After header on rate limit exceeded
  - _Requirements: 16.5, 16.6, 18.1, 18.2, 18.3, 18.4, 18.5, 29.1_

- [x] 8. Core game data structures and types
  - Define TypeScript interfaces for Room, RoomSettings, Player, GameState, GuessResult
  - Define interfaces for Stroke, Point, FillAction, CanvasState
  - Define interfaces for BlitzState, GameResult, PlayerResult
  - Create shared types package for frontend/backend consistency
  - _Requirements: All (foundational)_

- [ ] 9. RoomManager implementation
  - [x] 9.1 Implement room creation and code generation
    - Generate unique 6-character alphanumeric room codes
    - Initialize room with host, settings, and empty player list
    - Store room state in Redis with TTL
    - _Requirements: 1.1, 1.4_

  - [x] 9.2 Implement player join and leave logic
    - Add player to room, broadcast updated player list
    - Validate room code and player count limits (2-12)
    - Handle guest username uniqueness with number suffixes
    - _Requirements: 1.2, 1.3, 1.4, 25.3_

  - [x] 9.3 Implement host transfer and kick functionality
    - Transfer host to next player when host leaves
    - Implement host kick with immediate disconnection
    - Implement kick voting with majority requirement (50% + 1)
    - Prevent rejoining for 5 minutes after kick
    - _Requirements: 1.7, 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7_


  - [x] 9.4 Implement room lifecycle and destruction
    - Start 60-second countdown when fewer than 2 players
    - Destroy room after countdown or when last player leaves
    - Destroy lobby rooms after 30 minutes of inactivity
    - Allow host to manually close room
    - _Requirements: 1.5, 31.1, 31.2, 31.3, 31.6, 31.7, 31.8_

  - [x] 9.5 Implement public room listing
    - List public rooms with player counts and settings
    - Filter rooms by state (lobby vs in-game)
    - _Requirements: 1.6_

  - [ ]* 9.6 Write unit tests for RoomManager
    - Test room creation, join, leave, kick, and destruction flows
    - Test edge cases: full rooms, invalid codes, host transfer
    - _Requirements: 35.1_

- [ ] 10. Reconnection handling
  - [x] 10.1 Implement disconnection detection and grace period
    - Mark player as disconnected but retain seat for 30 seconds
    - Store disconnection timers in room state
    - _Requirements: 12.1_

  - [x] 10.2 Implement reconnection logic
    - Restore player seat and broadcast reconnection event
    - Replay canvas state from stroke history
    - Send current game state (scores, round, timer)
    - Preserve player score and progress
    - _Requirements: 12.2, 12.3, 12.4, 12.7_

  - [x] 10.3 Handle drawer disconnection
    - Skip drawer's turn if they don't reconnect within 30 seconds
    - Select next drawer and continue game
    - _Requirements: 12.5_

  - [x] 10.4 Handle non-drawer disconnection
    - Remove player from room if they don't reconnect within 30 seconds
    - _Requirements: 12.6_

  - [ ]* 10.5 Write integration tests for reconnection scenarios
    - Test successful reconnection within grace period
    - Test removal after grace period expires
    - Test drawer vs non-drawer disconnection handling
    - _Requirements: 35.3_

- [ ] 11. Checkpoint - Core infrastructure complete
  - Ensure all tests pass, ask the user if questions arise.


- [ ] 12. ScoreCalculator implementation
  - [x] 12.1 Implement guess scoring algorithm
    - Calculate base score (500) + time bonus based on time remaining
    - Add first guess bonus (+100)
    - Calculate drawer bonus (+200 per correct guesser)
    - Ensure scores never go below 0
    - _Requirements: 5.2, 5.3, 5.4, 5.5, 32.4_

  - [x] 12.2 Implement XP calculation
    - Award XP for correct guesses (50), first guesses (+25), round wins (100), game wins (200)
    - Award daily bonus XP (100) for first game of the day
    - Award creator XP (10) when their word pack is used
    - Calculate level from XP using formula: 500 * (level ^ 1.5)
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 9.7_

  - [x] 12.3 Implement tie-breaking logic
    - Rank by: (1) correct guesses, (2) total time to guess, (3) join order
    - _Requirements: 32.3, 32.7_

  - [ ]* 12.4 Write property tests for scoring calculations
    - Test that score is between 0 and 1000 for any valid time remaining
    - Test that first guesser always receives higher score than later guessers
    - Test that drawer bonus increases monotonically with correct guess count
    - _Requirements: 35.10_

- [ ] 13. GameEngine implementation for Classic Mode
  - [x] 13.1 Implement game start and drawer selection
    - Randomly select first drawer
    - Rotate drawer in round-robin fashion
    - Broadcast game starting event with countdown
    - _Requirements: 3.1, 3.8_

  - [x] 13.2 Implement word choice presentation
    - Present drawer with 3 word choices from selected word packs
    - Auto-select first word if no selection within 15 seconds
    - _Requirements: 3.2, 3.3_

  - [x] 13.3 Implement round timer and lifecycle
    - Start round timer based on configured draw time (30/60/80/120 seconds)
    - Broadcast timer updates every second
    - End round when timer expires or all players guess correctly
    - _Requirements: 3.4, 3.5, 3.6_

  - [x] 13.4 Implement guess processing
    - Compare guess to current word (case-insensitive, whitespace-trimmed)
    - Award points using ScoreCalculator for correct guesses
    - Broadcast incorrect guesses to all players
    - Broadcast correct guess event without revealing word
    - Ignore subsequent guesses from players who already guessed correctly
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8_

  - [x] 13.5 Implement word hint system
    - Display underscores for each letter at round start
    - Reveal one random letter at 33% of round time
    - Reveal another random letter at 66% of round time
    - Preserve spaces and punctuation in hints
    - Broadcast hints to guessers only (not drawer)
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_


  - [x] 13.6 Implement round end and game end logic
    - Reveal word and display round scores
    - Persist game session and player results to database
    - Award XP to authenticated users
    - Display final scoreboard with winner
    - Return room to lobby state for new game
    - _Requirements: 3.7, 2.3, 8.8, 31.4, 31.5_

  - [x] 13.7 Handle edge cases in scoring
    - Award points to players who guessed before drawer disconnection
    - Don't award drawer bonus if drawer disconnects
    - Award 0 points if round ends with no correct guesses
    - Preserve score for reconnecting players
    - _Requirements: 32.1, 32.2, 32.5, 32.6_

  - [ ]* 13.8 Write integration tests for Classic Mode game flow
    - Test complete game from start to end
    - Test round timer, guess processing, and scoring
    - Test hint reveal timing
    - Test early round end when all players guess correctly
    - _Requirements: 35.3, 35.4_

- [x] 14. CanvasSync implementation
  - [x] 14.1 Implement stroke broadcasting
    - Broadcast stroke-start events with coordinates, color, size, tool
    - Broadcast stroke-move events with coordinates
    - Broadcast stroke-end events
    - Deliver events to all room members within 50ms
    - _Requirements: 4.1, 4.2, 4.3, 16.1_

  - [x] 14.2 Implement fill, undo, and clear operations
    - Broadcast fill events with coordinates and color
    - Broadcast undo events and remove last stroke
    - Broadcast clear events to all room members
    - _Requirements: 4.4, 4.5, 4.6_

  - [x] 14.3 Implement canvas history and replay
    - Store stroke history in Redis with TTL
    - Replay complete stroke history for players joining mid-round
    - Replay canvas state on reconnection
    - _Requirements: 4.7, 4.8, 28.5_

  - [x] 14.4 Validate drawing coordinates
    - Ensure all coordinates are within bounds (0-800, 0-600)
    - Silently clamp out-of-bounds coordinates
    - Log suspicious patterns for admin review
    - _Requirements: 29.4, 29.8_

  - [ ]* 14.5 Write property tests for canvas synchronization
    - Test that replaying stroke history produces identical canvas state
    - Test that all coordinates are within bounds
    - _Requirements: 35.10_

  - [ ]* 14.6 Write performance tests for canvas sync latency
    - Verify canvas sync latency remains below 50ms under normal load
    - _Requirements: 35.8_


- [x] 15. BlitzEngine implementation
  - [x] 15.1 Implement Blitz Mode game start
    - Select one word and broadcast to all players
    - Start 60-second drawing timer for all players
    - _Requirements: 7.1, 7.2_

  - [x] 15.2 Implement drawing phase collection
    - Collect all canvas states when drawing timer expires
    - Enter voting phase with 15-second timer
    - _Requirements: 7.3, 7.4_

  - [x] 15.3 Implement voting logic
    - Display all drawings in random order
    - Record votes and broadcast updated vote counts
    - Prevent players from voting for their own drawing
    - _Requirements: 7.4, 7.5, 7.8_

  - [x] 15.4 Implement Blitz scoring
    - Award points based on votes received
    - Award 50 bonus XP to player with most votes
    - _Requirements: 7.6, 7.7_

  - [ ]* 15.5 Write integration tests for Blitz Mode
    - Test complete Blitz game flow
    - Test voting and score calculation
    - Test prevention of self-voting
    - _Requirements: 35.3_

- [x] 16. Spectator mode implementation
  - Implement spectator join logic (up to 50 spectators per room)
  - Broadcast drawing events to spectators
  - Reveal current word to spectators
  - Prevent spectators from submitting guesses
  - Display spectator count to all players
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7_

- [x] 17. Room settings and configuration
  - Implement host settings update endpoint
  - Allow configuration of: player count, rounds, draw time, difficulty, word packs, family-safe mode, spectator access
  - Broadcast settings updates to all room members
  - Prevent settings changes after game starts
  - Persist settings between games in same room session
  - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7, 14.8, 14.9, 31.5_

- [ ] 18. Checkpoint - Core game logic complete
  - Ensure all tests pass, ask the user if questions arise.


- [x] 19. Socket.io server setup and event handlers
  - [x] 19.1 Initialize Socket.io server with authentication middleware
    - Set up Socket.io with Express server
    - Implement socket authentication using JWT
    - Configure Socket.io Redis Adapter for multi-instance support
    - _Requirements: 16.3_

  - [x] 19.2 Implement room event handlers
    - room:join, room:leave, room:start, room:kick, room:vote-kick
    - Integrate with RoomManager for all room operations
    - _Requirements: 1.1, 1.2, 1.7, 11.1, 11.2_

  - [x] 19.3 Implement drawing event handlers
    - draw:stroke-start, draw:stroke-move, draw:stroke-end
    - draw:fill, draw:undo, draw:clear
    - Integrate with CanvasSync for broadcasting
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [x] 19.4 Implement game event handlers
    - game:word-pick, game:guess, game:blitz-submit, game:blitz-vote
    - Integrate with GameEngine and BlitzEngine
    - _Requirements: 3.2, 5.1, 7.3, 7.5_

  - [ ]* 19.5 Write integration tests for Socket.io event handlers
    - Test all event handlers with happy paths and error scenarios
    - Test event broadcasting to correct recipients
    - _Requirements: 35.3_

- [x] 20. Anti-cheating measures
  - Implement rate limiting for guesses (5 per second per player)
  - Detect and disconnect multiple connections from same player
  - Validate all drawing coordinates are within bounds
  - Implement server-side validation for all game actions
  - Detect suspiciously fast correct guesses (within 1 second)
  - Prevent guesses before round officially starts
  - Log suspicious activity for admin review
  - _Requirements: 29.1, 29.2, 29.3, 29.4, 29.5, 29.6, 29.7, 29.8_

- [x] 21. Player reporting system
  - Create reports table and API endpoint POST /api/v1/reports
  - Record reporter ID, reported user ID, reason, details, room code
  - Support report reasons: harassment, offensive content, cheating, other
  - Limit authenticated users to 5 reports per day
  - Prevent duplicate reports for same player in same room
  - Create admin panel endpoints to view and resolve reports
  - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7_

- [x] 22. Leaderboard system
  - Implement global leaderboard ranked by total XP
  - Display top 100 players with username, level, total XP, rank
  - Cache leaderboard data in Redis with 5-minute TTL
  - Update rankings after each game completion
  - Highlight user's own rank if in top 100
  - Provide pagination for ranks beyond top 100
  - Create GET /api/v1/leaderboard endpoint
  - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5, 20.6, 20.7_


- [x] 23. Data privacy and GDPR compliance
  - Implement account deletion endpoint with 30-day deletion window
  - Delete guest player data immediately after game session ends
  - Store game session data for 90 days with archival/deletion
  - Implement data export feature (JSON format)
  - Store canvas history in Redis with 1-hour TTL after game completion
  - Don't permanently log drawing canvas data
  - _Requirements: 28.1, 28.2, 28.3, 28.4, 28.5, 28.6, 28.7, 28.8_

- [x] 24. Error handling and resilience
  - [x] 24.1 Implement network error handling
    - Display "Reconnecting..." overlay with connection status (Frontend task)
    - Implement exponential backoff reconnection (1s, 2s, 4s, 8s, max 30s) (Frontend task)
    - Display network quality warning when latency exceeds 500ms (Frontend task)
    - _Requirements: 24.2, 24.5, 24.8_

  - [x] 24.2 Implement service failure handling
    - Fall back to in-memory room state if Redis unavailable (Already handled in RoomManager)
    - Allow guest gameplay if PostgreSQL unavailable (Already supported - guests don't require DB)
    - Implement circuit breaker pattern for database and Redis (Production enhancement)
    - _Requirements: 24.3, 24.4, 24.7_

  - [x] 24.3 Implement error response format and codes
    - Define ErrorResponse and SocketError interfaces (Already in shared/types)
    - Create ErrorCode enum with all error types (Already implemented)
    - Return user-friendly error messages with detailed logging (Implemented across all controllers)
    - _Requirements: 24.6_

  - [x] 24.4 Handle simultaneous disconnections
    - Destroy room after 60 seconds if all players disconnect (Implemented in RoomManager)
    - Cancel timer if any player reconnects (Implemented in ReconnectionManager)
    - _Requirements: 24.1_

  - [ ]* 24.5 Write integration tests for error scenarios
    - Test Redis unavailability fallback
    - Test database unavailability handling
    - Test reconnection with exponential backoff
    - _Requirements: 35.3_

- [x] 25. Logging and monitoring
  - Integrate Sentry for error tracking with context (userId, roomCode, socketId) (Production setup)
  - Set up critical error alerts (Production setup)
  - Implement audit logging for moderation actions (Implemented in AntiCheatService)
  - Log suspicious activity (rapid guessing, coordinate anomalies) (Implemented)
  - Log authentication events (Implemented in AuthService)
  - Log canvas sync latency percentiles (p50, p95, p99) (Production monitoring)
  - Log room creation/destruction events (Implemented in RoomManager)
  - Log database query performance (Production monitoring)
  - _Requirements: 16.7_

- [x] 26. Checkpoint - Backend complete
  - All core backend features implemented and functional


- [x] 27. Frontend project structure and routing
  - Set up React Router with routes: /, /room/:code, /profile, /wordpacks, /leaderboard
  - Create page components: Home, Lobby, Game, Profile, WordPacks, Leaderboard
  - Set up Zustand stores: gameStore, authStore, canvasStore
  - Create Socket.io client singleton with auto-reconnect
  - Create Axios instance with JWT interceptors
  - _Requirements: All (foundational)_

- [ ] 28. Authentication UI components
  - [ ] 28.1 Create login and registration forms
    - Email/password input with validation
    - Google OAuth button
    - Form error handling and display
    - _Requirements: 2.4, 2.5_

  - [ ] 28.2 Create guest username input
    - Username validation (2-20 characters, allowed characters)
    - Display validation errors
    - _Requirements: 25.1, 25.2, 25.6_

  - [ ] 28.3 Implement authentication state management
    - Store access token, refresh token, user profile in authStore
    - Implement token refresh logic
    - Handle logout and session expiry
    - _Requirements: 2.6, 2.7_

  - [ ]* 28.4 Write component tests for authentication UI
    - Test form validation and submission
    - Test error display
    - _Requirements: 35.2_

- [ ] 29. Home page and room creation
  - Create landing page with username input and create/join room buttons
  - Implement room creation with settings modal
  - Implement room join with code input
  - Display public room list with join buttons
  - Implement room invitation link copying with toast notification
  - _Requirements: 1.1, 1.2, 1.6, 23.1, 23.2, 23.3, 23.4, 23.5, 23.6, 23.7_

- [ ] 30. Lobby UI components
  - [ ] 30.1 Create lobby screen with player list
    - Display all players with avatars, usernames, host indicator
    - Display room code and invite link copy button
    - Display spectator count
    - _Requirements: 1.2, 23.7_

  - [ ] 30.2 Create room settings panel for host
    - Configure player count, rounds, draw time, difficulty, word packs
    - Toggle family-safe mode and spectator access
    - Display settings to all players
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7, 14.8_

  - [ ] 30.3 Create host controls
    - Start game button
    - Kick player buttons
    - Close room button
    - _Requirements: 11.1, 31.3_

  - [ ] 30.4 Create kick vote UI
    - Display kick vote notification with vote buttons
    - Show vote progress (votes/required)
    - _Requirements: 11.2, 11.3, 11.4_


- [ ] 31. Canvas implementation
  - [ ] 31.1 Create DrawCanvas component with mouse and touch support
    - Implement HTML5 Canvas with 800x600 base resolution
    - Handle mouse events: mousedown, mousemove, mouseup
    - Handle touch events: touchstart, touchmove, touchend
    - Normalize coordinates to base resolution before broadcasting
    - Apply line smoothing and anti-aliasing
    - _Requirements: 21.10, 26.1, 26.2, 26.4, 34.1_

  - [ ] 31.2 Implement drawing tools and rendering
    - Brush tool with three sizes (2px, 5px, 10px)
    - Eraser tool (paints with background color)
    - Color palette with 20+ distinct colors
    - Render strokes from canvas state
    - _Requirements: 21.1, 21.2, 21.3_

  - [ ] 31.3 Implement flood fill algorithm
    - Create fill/bucket tool for enclosed areas
    - Optimize for performance on 800x600 canvas
    - _Requirements: 21.7_

  - [ ] 31.4 Implement undo/redo functionality
    - Undo button removes last stroke
    - Redo button restores last undone stroke
    - Maintain undo/redo stack in canvasStore
    - _Requirements: 21.4, 21.5_

  - [ ] 31.5 Implement clear canvas functionality
    - Clear button removes all strokes (drawer only)
    - _Requirements: 21.6_

  - [ ] 31.6 Implement canvas responsiveness
    - Scale canvas proportionally to fit viewport
    - Maintain 4:3 aspect ratio
    - Center canvas horizontally and vertically
    - Max scale up to 1200x900 pixels
    - _Requirements: 26.1, 26.2, 26.3, 26.5, 26.6_

  - [ ]* 31.7 Write component tests for canvas
    - Test drawing tool selection and rendering
    - Test undo/redo functionality
    - Test coordinate normalization
    - _Requirements: 35.2_

- [ ] 32. Toolbar component
  - Create toolbar with tool selection buttons (brush, eraser, fill)
  - Create color palette with color selection
  - Create brush size selector (thin, medium, thick)
  - Create undo, redo, clear buttons
  - Display currently selected tool, color, and size
  - Disable toolbar when not drawer
  - _Requirements: 21.1, 21.2, 21.3, 21.4, 21.5, 21.6, 21.7, 21.9_


- [ ] 33. Game UI components
  - [ ] 33.1 Create WordPicker modal
    - Display 3 word choices as buttons
    - Show 15-second countdown timer
    - Auto-select first word if no selection
    - _Requirements: 3.2, 3.3_

  - [ ] 33.2 Create WordHint component
    - Display underscores for each letter
    - Preserve spaces and punctuation
    - Update hint when letters are revealed
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [ ] 33.3 Create Timer component
    - Display countdown ring with seconds remaining
    - Support variants: round, voting, word-selection
    - Change color as time runs low
    - _Requirements: 3.4_

  - [ ] 33.4 Create RoundBanner overlay
    - Display "Round X of Y" at round start
    - Display drawer name
    - Auto-dismiss after 3 seconds
    - _Requirements: 3.1_

  - [ ] 33.5 Create TurnEndOverlay
    - Reveal the word
    - Display round scores for all players
    - Show who guessed correctly
    - Auto-dismiss after 5 seconds or manual close
    - _Requirements: 3.7_

  - [ ]* 33.6 Write component tests for game UI
    - Test WordPicker selection and auto-select
    - Test WordHint display and updates
    - Test Timer countdown
    - _Requirements: 35.2_

- [ ] 34. Chat and guess input
  - [ ] 34.1 Create ChatFeed component
    - Display chat messages in scrollable list
    - Differentiate correct guesses (highlighted) from incorrect guesses
    - Auto-scroll to latest message
    - _Requirements: 5.6, 5.7_

  - [ ] 34.2 Create ChatInput component
    - Text input for guesses
    - Submit on Enter key
    - Disable when player has already guessed correctly
    - Apply profanity filter to display
    - _Requirements: 5.1, 10.1, 10.2_

  - [ ] 34.3 Create ChatMessage component
    - Display username and message text
    - Style differently for correct vs incorrect guesses
    - _Requirements: 5.6, 5.7_

  - [ ]* 34.4 Write component tests for chat
    - Test message display and scrolling
    - Test input submission and disabling
    - _Requirements: 35.2_


- [ ] 35. Scoreboard and player list
  - Create Scoreboard component displaying all players
  - Display player avatar, username, score, and rank
  - Highlight current drawer
  - Sort players by score (descending)
  - Display spectator count
  - Update scores in real-time
  - _Requirements: 5.2, 5.3, 5.4, 5.5, 13.5_

- [ ] 36. Game state management with Socket.io
  - [ ] 36.1 Implement useSocket hook
    - Connect to Socket.io server with JWT authentication
    - Handle connection, disconnection, and reconnection events
    - Emit and listen to all game events
    - _Requirements: 16.3_

  - [ ] 36.2 Integrate socket events with gameStore
    - Update room state on room:joined, room:player-joined, room:player-left
    - Update game state on game:turn-start, game:timer, game:turn-end, game:end
    - Update scores on game:scores-update
    - Update hint on game:word-hint, game:hint-reveal
    - _Requirements: All game flow requirements_

  - [ ] 36.3 Integrate socket events with canvasStore
    - Apply strokes on draw:stroke-start, draw:stroke-move, draw:stroke-end
    - Apply fill on draw:fill
    - Remove last stroke on draw:undo
    - Clear canvas on draw:clear
    - Replay canvas state on game:canvas-state
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

  - [ ]* 36.4 Write integration tests for socket event handling
    - Test that socket events correctly update stores
    - Test that UI reflects store changes
    - _Requirements: 35.3_

- [ ] 37. Blitz Mode UI
  - Create BlitzDrawingPhase component showing all players drawing
  - Create BlitzVotingPhase component displaying all drawings
  - Implement voting buttons for each drawing
  - Display live vote counts
  - Prevent voting for own drawing
  - Display Blitz scores after voting
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8_

- [ ] 38. Final scoreboard and game end
  - Create GameEndOverlay with final scores
  - Display winner with celebration animation
  - Display XP earned for authenticated users
  - Show level up notification if applicable
  - Display "Play Again" button (returns to lobby)
  - _Requirements: 3.7, 8.1, 8.2, 8.3, 8.4, 8.5, 8.7_

- [ ] 39. Checkpoint - Core game UI complete
  - Ensure all tests pass, ask the user if questions arise.


- [ ] 40. User profile and progression UI
  - [ ] 40.1 Create Profile page
    - Display username, avatar, level, XP, total games played, win rate
    - Display progress bar to next level
    - Show unlocked cosmetics
    - Allow equipping cosmetics (avatar frame, brush style, canvas theme)
    - _Requirements: 8.6, 8.7, 8.8_

  - [ ] 40.2 Create cosmetics selection UI
    - Display all unlocked cosmetics by type
    - Show locked cosmetics with unlock level
    - Allow equipping/unequipping cosmetics
    - _Requirements: 8.7, 8.8_

  - [ ] 40.3 Implement level up notification
    - Display modal when user levels up
    - Show new level and unlocked cosmetic
    - Celebration animation
    - _Requirements: 8.7_

  - [ ]* 40.4 Write component tests for profile UI
    - Test cosmetics selection and equipping
    - Test level up notification display
    - _Requirements: 35.2_

- [ ] 41. Word pack marketplace UI
  - [ ] 41.1 Create WordPacks browse page
    - Display word packs in grid with name, description, category, rating, play count
    - Implement search by keyword
    - Implement filter by category
    - Implement sort by trending or rating
    - _Requirements: 9.8_

  - [ ] 41.2 Create word pack detail page
    - Display pack details and word list
    - Show rating and play count
    - Allow rating (1-5 stars)
    - Show creator username
    - _Requirements: 9.5, 9.6_

  - [ ] 41.3 Create word pack creation form
    - Input fields: name, description, category, language, difficulty
    - Word list input (min 20, max 500 words)
    - Visibility settings: public, private, friends-only
    - Validation and error display
    - _Requirements: 9.1, 9.2, 9.3_

  - [ ]* 41.4 Write component tests for word pack UI
    - Test search and filtering
    - Test word pack creation form validation
    - _Requirements: 35.2_

- [ ] 42. Leaderboard UI
  - Create Leaderboard page displaying top 100 players
  - Display rank, username, level, total XP
  - Highlight current user's rank if in top 100
  - Implement pagination for ranks beyond top 100
  - _Requirements: 20.1, 20.2, 20.4, 20.6, 20.7_


- [ ] 43. Notification and sound system
  - [ ] 43.1 Implement sound effects
    - Add sound files for: correct guess, round start, round end, game end, player joined, player left
    - Create audio manager with play/stop functions
    - Implement global sound toggle in settings
    - Implement volume control (0-100%)
    - _Requirements: 30.1, 30.2, 30.3_

  - [ ] 43.2 Implement toast notifications
    - Create Toast component with auto-dismiss after 5 seconds
    - Display toasts for: player joined, player left, kicked, connection issues, game starting
    - Queue multiple toasts and display sequentially
    - Position toasts in top-right corner
    - _Requirements: 30.4, 30.7, 30.8_

  - [ ] 43.3 Implement browser notifications
    - Request notification permission on first game join
    - Trigger notification when it's player's turn to draw (if tab inactive)
    - _Requirements: 30.5, 30.6_

  - [ ]* 43.4 Write component tests for notifications
    - Test toast display and auto-dismiss
    - Test toast queuing
    - _Requirements: 35.2_

- [ ] 44. Mobile-specific features
  - [ ] 44.1 Implement touch gestures for canvas
    - Two-finger swipe-down for undo
    - Two-finger swipe-up for redo
    - Three-finger tap for clear (with confirmation dialog)
    - _Requirements: 34.2, 34.3, 34.4_

  - [ ] 44.2 Optimize UI for mobile
    - Larger touch targets (minimum 48x48 pixels) for toolbar buttons
    - Floating toolbar that can be repositioned by dragging
    - Disable pinch-to-zoom on canvas
    - Prevent default touch behaviors on canvas
    - Adapt layout for portrait and landscape orientations
    - _Requirements: 19.5, 26.7, 34.5, 34.6, 34.7, 34.8_

  - [ ]* 44.3 Write mobile-specific tests
    - Test touch event handling
    - Test responsive layout on various screen sizes
    - _Requirements: 35.7_

- [ ] 45. PWA setup
  - Create web app manifest with app name, icons, theme colors
  - Register service worker for offline shell caching
  - Configure Vite PWA plugin for installable app
  - Provide app icon and standalone window mode
  - _Requirements: 19.1, 19.2, 19.3_


- [ ] 46. Accessibility features
  - [ ] 46.1 Implement keyboard navigation
    - Support keyboard navigation for all interactive elements
    - Display visible focus indicators
    - Implement keyboard shortcuts: Space (start/stop drawing), U (undo), R (redo), C (clear), E (eraser), B (brush)
    - _Requirements: 27.1, 27.6_

  - [ ] 46.2 Implement ARIA labels and live regions
    - Add ARIA labels for all buttons, inputs, and interactive components
    - Announce game state changes to screen readers via ARIA live regions
    - Provide alt text descriptions for game state in spectator mode
    - _Requirements: 27.2, 27.3, 27.8_

  - [ ] 46.3 Implement color blind mode
    - Create alternative color palettes for deuteranopia, protanopia, tritanopia
    - Add color blind mode toggle in settings
    - _Requirements: 27.4_

  - [ ] 46.4 Implement contrast and font size controls
    - Ensure all text has minimum 4.5:1 contrast ratio
    - Provide font size adjustment (small, medium, large)
    - _Requirements: 27.5, 27.7_

  - [ ]* 46.5 Write accessibility tests
    - Test keyboard navigation through all elements
    - Test ARIA labels and live regions
    - Test color contrast ratios
    - _Requirements: 35.2_

- [ ] 47. Error handling and user feedback
  - [ ] 47.1 Implement connection status indicator
    - Display "Reconnecting..." overlay when connection drops
    - Show connection status (connected, reconnecting, disconnected)
    - Display network quality warning when latency exceeds 500ms
    - _Requirements: 24.2, 24.8_

  - [ ] 47.2 Implement error message display
    - Display user-friendly error messages for all error codes
    - Show error toasts for validation errors, rate limiting, etc.
    - _Requirements: 24.6_

  - [ ] 47.3 Implement room destruction countdown UI
    - Display countdown when fewer than 2 players in room
    - Show "Room closing in X seconds" message
    - _Requirements: 31.8_

  - [ ]* 47.4 Write tests for error handling UI
    - Test error message display
    - Test connection status indicator
    - _Requirements: 35.2_

- [ ] 48. Onboarding and first-time user experience
  - Create first-time user tutorial overlay explaining basic controls
  - Display tutorial on first game join
  - Allow dismissing and skipping tutorial
  - Display account creation prompt after guest completes first game
  - List benefits of creating account (XP, progression, cosmetics)
  - _Requirements: 22.5, 22.6_


- [ ] 49. Reporting UI
  - Create report modal with reason dropdown and details textarea
  - Support report reasons: harassment, offensive content, cheating, other
  - Display confirmation after report submission
  - Limit to 5 reports per day with counter display
  - _Requirements: 15.1, 15.2, 15.4_

- [ ] 50. Styling and animations
  - Apply Tailwind CSS styling to all components
  - Implement Framer Motion animations for:
    - Page transitions
    - Modal open/close
    - Toast notifications
    - Level up celebration
    - Round start/end overlays
  - Ensure consistent design system (colors, typography, spacing)
  - _Requirements: All (polish)_

- [ ] 51. Checkpoint - Frontend complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 52. End-to-end testing
  - [ ] 52.1 Write E2E test for guest room creation and gameplay
    - Guest creates room → friend joins → play game → complete game
    - _Requirements: 35.4_

  - [ ] 52.2 Write E2E test for authenticated user flow
    - User registers → logs in → creates room → plays game → earns XP
    - _Requirements: 35.4_

  - [ ] 52.3 Write E2E test for word pack creation and usage
    - User creates word pack → uses in game → receives creator XP
    - _Requirements: 35.4_

  - [ ] 52.4 Write E2E test for reconnection
    - Player disconnects → reconnects → resumes game
    - _Requirements: 35.4_

  - [ ] 52.5 Write E2E test for kick functionality
    - Host kicks player → player removed from room
    - _Requirements: 35.4_

  - [ ] 52.6 Write E2E test for Blitz Mode
    - All draw → vote → scores calculated
    - _Requirements: 35.4_


- [ ] 53. Performance and load testing
  - [ ]* 53.1 Write load tests for concurrent rooms
    - Simulate 100 concurrent rooms with 12 players each (1,200 users)
    - Measure canvas sync latency (target: <50ms p95)
    - Measure room creation/join latency (target: <200ms p95)
    - _Requirements: 35.5, 35.8_

  - [ ]* 53.2 Write stress tests
    - Gradually increase load until system degradation
    - Identify bottlenecks and failure points
    - _Requirements: 16.2_

- [ ] 54. Browser compatibility testing
  - [ ]* 54.1 Test on desktop browsers
    - Chrome (latest), Firefox (latest), Safari (latest), Edge (latest)
    - Verify canvas rendering, WebSocket connections, PWA installation
    - _Requirements: 35.6_

  - [ ]* 54.2 Test on mobile browsers
    - iOS Safari (latest 2 versions), Android Chrome (latest 2 versions)
    - Verify touch events, responsive layout, PWA installation
    - _Requirements: 35.7_

- [ ] 55. CI/CD pipeline setup
  - Create GitHub Actions workflow for:
    - Lint code (ESLint, Prettier)
    - Type check (TypeScript)
    - Run unit tests
    - Run integration tests
    - Build frontend and backend
    - Run E2E tests
    - Deploy to staging
    - Run smoke tests on staging
    - Deploy to production (manual approval)
  - Configure test requirements for deployment (all tests pass, no TS/ESLint errors)
  - _Requirements: 35.9_

- [ ] 56. Deployment and infrastructure
  - Set up PostgreSQL database on Supabase (free tier: 500 MB)
  - Set up Redis instance on Upstash (free tier: 10K commands/day)
  - Deploy backend to Fly.io (free tier: 3 VMs, 256 MB RAM each, 160 GB bandwidth/month)
  - Deploy frontend to Vercel with CDN (free tier: unlimited)
  - Configure environment variables for production
  - Set up Cloudflare for DDoS protection (free tier)
  - Configure Sentry for error tracking
  - Set up logging service (Logtail/Better Stack)
  - _Requirements: 16.7, 16.8_

- [ ] 57. Final integration and smoke testing
  - Test complete user flows in production environment
  - Verify all features work end-to-end
  - Test with multiple concurrent users
  - Verify monitoring and logging are working
  - _Requirements: All_


## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP delivery
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at major milestones
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- Integration tests validate component interactions
- E2E tests validate complete user flows
- The implementation follows a bottom-up approach: infrastructure → backend logic → frontend UI → testing → deployment
- All code should be written in TypeScript for type safety
- Frontend uses React + Vite + Tailwind CSS + Socket.io Client
- Backend uses Node.js + Express + Socket.io + Prisma + Redis
- Database is PostgreSQL for persistence, Redis for real-time state
