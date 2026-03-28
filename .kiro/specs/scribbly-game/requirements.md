# Requirements Document

## Introduction

Scribbly is a real-time multiplayer drawing and guessing web game designed to address the limitations of existing solutions like skribbl.io. The system enables players to join game rooms where they take turns drawing words while others guess, with real-time canvas synchronization, scoring, and progression mechanics. The platform supports both guest and authenticated users, provides moderation tools, and includes an innovative Blitz Mode where all players draw simultaneously.

## Glossary

- **Game_System**: The complete Scribbly application including frontend, backend, and database
- **Room_Manager**: Backend component responsible for creating, managing, and destroying game rooms
- **Game_Engine**: Backend component that orchestrates turn-based gameplay, timing, and scoring
- **Canvas_Sync**: Real-time drawing synchronization system using WebSocket connections
- **Auth_Service**: Authentication and authorization service handling user accounts
- **Word_Selector**: Component that selects and provides words from word packs
- **Score_Calculator**: Component that computes points and XP based on game actions
- **Profanity_Filter**: Text filtering system for chat messages and usernames
- **Drawer**: The player currently drawing in a turn-based round
- **Guesser**: A player attempting to guess the word being drawn
- **Host**: The player who created the room and has administrative controls
- **Spectator**: A user observing the game without participating
- **Word_Pack**: A collection of words with metadata (category, difficulty, language)
- **Stroke**: A continuous drawing action from pen-down to pen-up
- **Round**: A single turn where one player draws and others guess
- **Session**: A complete game from start to finish comprising multiple rounds
- **XP**: Experience points earned through gameplay actions
- **Cosmetic**: Unlockable visual customization (avatar frame, brush style, canvas theme)

## Requirements

### Requirement 1: Real-Time Room Management

**User Story:** As a player, I want to create or join game rooms with unique codes, so that I can play with specific friends or join public games.

#### Acceptance Criteria

1. WHEN a player requests room creation, THE Room_Manager SHALL generate a unique 6-character alphanumeric room code
2. WHEN a player joins with a valid room code, THE Room_Manager SHALL add the player to the room and broadcast the updated player list
3. WHEN a player joins with an invalid room code, THE Room_Manager SHALL return an error message
4. THE Room_Manager SHALL support rooms with 2 to 12 players
5. WHEN a room has fewer than 2 connected players for more than 60 seconds, THE Room_Manager SHALL destroy the room
6. WHERE the host enables public visibility, THE Room_Manager SHALL list the room in the public lobby
7. WHEN the host leaves the room, THE Room_Manager SHALL transfer host privileges to the next player by join order

### Requirement 2: Guest and Authenticated Play

**User Story:** As a casual player, I want to play without creating an account, so that I can quickly join games with minimal friction.

#### Acceptance Criteria

1. THE Game_System SHALL allow guest players to join rooms with only a username
2. WHEN a guest player completes a game, THE Game_System SHALL not persist their statistics or XP
3. WHEN an authenticated user completes a game, THE Game_System SHALL persist their statistics and award XP
4. THE Auth_Service SHALL support email/password registration
5. THE Auth_Service SHALL support Google OAuth authentication
6. WHEN a user registers or logs in, THE Auth_Service SHALL issue a JWT access token (15-minute expiry) and refresh token (7-day expiry)
7. WHEN an access token expires, THE Auth_Service SHALL accept a valid refresh token to issue a new access token

### Requirement 3: Classic Mode Game Flow

**User Story:** As a player, I want to play turn-based drawing and guessing, so that I can enjoy the traditional gameplay experience.

#### Acceptance Criteria

1. WHEN the host starts the game, THE Game_Engine SHALL randomly select a drawer for the first round
2. WHEN a round begins, THE Game_Engine SHALL present the drawer with 3 word choices from the selected word pack
3. IF the drawer does not select a word within 15 seconds, THEN THE Game_Engine SHALL auto-select the first word
4. WHEN the drawer selects a word, THE Game_Engine SHALL start the round timer based on configured draw time (30, 60, 80, or 120 seconds)
5. WHEN the round timer expires, THE Game_Engine SHALL end the round and reveal the word
6. WHEN all non-drawer players have guessed correctly, THE Game_Engine SHALL end the round early
7. WHEN all configured rounds complete, THE Game_Engine SHALL end the session and display final scores
8. THE Game_Engine SHALL rotate the drawer role in round-robin fashion across all players

### Requirement 4: Real-Time Canvas Synchronization

**User Story:** As a drawer, I want my drawing strokes to appear instantly on all players' screens, so that guessers can see what I'm drawing in real-time.

#### Acceptance Criteria

1. WHEN the drawer starts a stroke, THE Canvas_Sync SHALL broadcast the stroke-start event with coordinates, color, size, and tool type to all room members within 50ms
2. WHEN the drawer moves during a stroke, THE Canvas_Sync SHALL broadcast stroke-move events with coordinates to all room members
3. WHEN the drawer ends a stroke, THE Canvas_Sync SHALL broadcast the stroke-end event to all room members
4. WHEN the drawer uses the fill tool, THE Canvas_Sync SHALL broadcast the fill event with coordinates and color to all room members
5. WHEN the drawer uses undo, THE Canvas_Sync SHALL broadcast the undo event and remove the last stroke from all canvases
6. WHEN the drawer clears the canvas, THE Canvas_Sync SHALL broadcast the clear event to all room members
7. WHEN a player joins mid-round, THE Canvas_Sync SHALL replay the complete stroke history to synchronize their canvas state
8. THE Canvas_Sync SHALL maintain stroke history in Redis for reconnection scenarios

### Requirement 5: Guess Processing and Scoring

**User Story:** As a guesser, I want my correct guesses to be recognized immediately and award points based on speed, so that I'm rewarded for quick thinking.

#### Acceptance Criteria

1. WHEN a guesser submits text, THE Game_Engine SHALL compare it to the current word (case-insensitive, whitespace-trimmed)
2. WHEN a guess matches the word exactly, THE Score_Calculator SHALL award base_score of 500 points plus time bonus
3. THE Score_Calculator SHALL calculate time bonus as Math.floor((timeRemaining / roundDuration) * 500)
4. WHEN a player guesses correctly first, THE Score_Calculator SHALL award an additional 100 bonus points
5. WHEN a player guesses correctly, THE Score_Calculator SHALL award the drawer 200 points
6. WHEN a guess is incorrect, THE Game_Engine SHALL broadcast the guess text to all players
7. WHEN a guess is correct, THE Game_Engine SHALL broadcast a correct-guess event without revealing the word to remaining guessers
8. WHEN a player has already guessed correctly, THE Game_Engine SHALL ignore subsequent guesses from that player

### Requirement 6: Word Hint System

**User Story:** As a guesser, I want to see hints about the word length and revealed letters over time, so that I have a fair chance to guess even if the drawing is unclear.

#### Acceptance Criteria

1. WHEN a round starts, THE Game_Engine SHALL broadcast a word hint showing underscores for each letter (e.g., "_ _ _ _ _")
2. WHEN 33% of round time elapses, THE Game_Engine SHALL reveal one random letter in the hint
3. WHEN 66% of round time elapses, THE Game_Engine SHALL reveal one additional random letter in the hint
4. THE Game_Engine SHALL preserve spaces and punctuation in hints (e.g., "_ _ _ _ - _ _ _")
5. THE Game_Engine SHALL broadcast hint updates to all guessers but not to the drawer

### Requirement 7: Blitz Mode Gameplay

**User Story:** As a player, I want everyone to draw simultaneously and vote on the best drawing, so that no one has to wait for their turn.

#### Acceptance Criteria

1. WHEN Blitz Mode starts, THE Game_Engine SHALL select one word and broadcast it to all players
2. WHEN the word is revealed, THE Game_Engine SHALL start a 60-second drawing timer for all players
3. WHEN the drawing timer expires, THE Game_Engine SHALL collect all canvas states and enter voting phase
4. WHEN voting begins, THE Game_Engine SHALL display all drawings in random order with a 15-second voting timer
5. WHEN a player votes, THE Game_Engine SHALL record the vote and broadcast updated vote counts
6. WHEN voting ends, THE Score_Calculator SHALL award points based on votes received
7. THE Score_Calculator SHALL award 50 bonus XP to the player with the most votes
8. THE Game_Engine SHALL prevent players from voting for their own drawing

### Requirement 8: User Progression System

**User Story:** As a regular player, I want to earn XP and level up to unlock cosmetics, so that I have long-term goals and rewards.

#### Acceptance Criteria

1. WHEN an authenticated user guesses correctly, THE Score_Calculator SHALL award 50 XP
2. WHEN an authenticated user guesses correctly first, THE Score_Calculator SHALL award an additional 25 XP
3. WHEN an authenticated user wins a round (highest points), THE Score_Calculator SHALL award 100 XP
4. WHEN an authenticated user wins a game (highest total score), THE Score_Calculator SHALL award 200 XP
5. WHEN an authenticated user plays their first game of the day, THE Score_Calculator SHALL award 100 daily bonus XP
6. THE Game_System SHALL calculate required XP for each level as 500 * (level ^ 1.5)
7. WHEN a user reaches a new level, THE Game_System SHALL unlock the cosmetic associated with that level
8. THE Game_System SHALL persist XP, level, and unlocked cosmetics to the database after each game

### Requirement 9: Word Pack Management

**User Story:** As a content creator, I want to create and publish custom word packs, so that I can share themed word collections with the community.

#### Acceptance Criteria

1. WHEN an authenticated user creates a word pack, THE Game_System SHALL require a minimum of 20 words and maximum of 500 words
2. WHEN a user creates a word pack, THE Game_System SHALL require pack name, description, category, language, and difficulty
3. THE Game_System SHALL support pack visibility settings: public, private, or friends-only
4. WHEN a user publishes a public word pack, THE Game_System SHALL make it discoverable in the word pack marketplace
5. WHEN a user rates a word pack, THE Game_System SHALL accept ratings from 1 to 5 stars and update the pack's average rating
6. WHEN a word pack is used in a game, THE Game_System SHALL increment its play_count
7. WHEN a user's word pack is used by others, THE Score_Calculator SHALL award the creator 10 XP per game played
8. THE Game_System SHALL allow users to search word packs by keyword, filter by category, and sort by trending or rating

### Requirement 10: Profanity Filtering and Moderation

**User Story:** As a teacher, I want to enable family-safe mode to filter inappropriate content, so that I can use the game safely with students.

#### Acceptance Criteria

1. WHERE family-safe mode is enabled, THE Profanity_Filter SHALL filter all chat messages against a profanity blocklist
2. WHERE family-safe mode is enabled, THE Word_Selector SHALL exclude words tagged as mature content
3. WHEN a message contains profanity, THE Profanity_Filter SHALL replace offensive words with asterisks
4. WHEN a user registers with a username containing profanity, THE Auth_Service SHALL reject the registration
5. THE Game_System SHALL support three filter levels: off, standard, and strict
6. WHERE strict filtering is enabled, THE Profanity_Filter SHALL use an expanded blocklist including mild profanity
7. THE Profanity_Filter SHALL apply to usernames, chat messages, and word pack names

### Requirement 11: Host Controls and Kick Voting

**User Story:** As a host, I want to kick disruptive players and allow others to vote-kick, so that I can maintain a positive game environment.

#### Acceptance Criteria

1. WHEN the host kicks a player, THE Room_Manager SHALL immediately disconnect that player and broadcast the removal
2. WHEN any player initiates a kick vote, THE Room_Manager SHALL broadcast the vote to all players except the target
3. WHEN a majority of players vote to kick, THE Room_Manager SHALL disconnect the target player
4. THE Room_Manager SHALL require at least 50% + 1 votes for a successful kick vote
5. WHEN a kick vote fails, THE Room_Manager SHALL clear the vote state after 30 seconds
6. THE Room_Manager SHALL allow only one active kick vote at a time
7. WHEN a player is kicked, THE Room_Manager SHALL prevent them from rejoining with the same session for 5 minutes

### Requirement 12: Player Reconnection Handling

**User Story:** As a player, I want to reconnect if my connection drops, so that I don't lose my progress in an ongoing game.

#### Acceptance Criteria

1. WHEN a player disconnects, THE Room_Manager SHALL mark them as disconnected but retain their seat for 30 seconds
2. WHEN a player reconnects within 30 seconds, THE Room_Manager SHALL restore their seat and broadcast a reconnection event
3. WHEN a player reconnects, THE Canvas_Sync SHALL replay the current canvas state from stroke history
4. WHEN a player reconnects, THE Game_Engine SHALL send the current game state including scores, round number, and timer
5. IF the drawer disconnects and does not reconnect within 30 seconds, THEN THE Game_Engine SHALL skip their turn and select the next drawer
6. IF a non-drawer disconnects and does not reconnect within 30 seconds, THEN THE Room_Manager SHALL remove them from the room
7. WHEN a player reconnects, THE Game_System SHALL preserve their score and game progress

### Requirement 13: Spectator Mode

**User Story:** As a streamer, I want viewers to spectate my game without participating, so that my audience can watch along.

#### Acceptance Criteria

1. WHERE the host enables spectators, THE Room_Manager SHALL allow users to join as spectators
2. WHEN a spectator joins, THE Canvas_Sync SHALL broadcast all drawing events to the spectator
3. WHEN a spectator joins, THE Game_Engine SHALL reveal the current word to the spectator
4. THE Game_System SHALL prevent spectators from submitting guesses
5. THE Game_System SHALL display the spectator count to all players
6. WHEN a spectator leaves, THE Room_Manager SHALL broadcast the updated spectator count
7. THE Room_Manager SHALL support up to 50 spectators per room

### Requirement 14: Room Configuration

**User Story:** As a host, I want to configure game settings before starting, so that I can customize the experience for my group.

#### Acceptance Criteria

1. THE Room_Manager SHALL allow the host to configure player count (2-12)
2. THE Room_Manager SHALL allow the host to configure round count (1-10, default 3)
3. THE Room_Manager SHALL allow the host to configure draw time (30, 60, 80, or 120 seconds)
4. THE Room_Manager SHALL allow the host to configure word difficulty (Easy, Medium, Hard, or Mixed)
5. THE Room_Manager SHALL allow the host to select one or more word packs
6. THE Room_Manager SHALL allow the host to toggle family-safe mode
7. THE Room_Manager SHALL allow the host to toggle spectator access
8. WHEN the host changes settings, THE Room_Manager SHALL broadcast the updated settings to all room members
9. THE Room_Manager SHALL prevent settings changes after the game has started

### Requirement 15: Player Reporting System

**User Story:** As a player, I want to report abusive users, so that moderators can take action against bad actors.

#### Acceptance Criteria

1. WHEN a player submits a report, THE Game_System SHALL record the reporter ID, reported user ID, reason, details, and room code
2. THE Game_System SHALL support report reasons: harassment, offensive content, cheating, and other
3. WHEN a report is submitted, THE Game_System SHALL store it in the database with resolved status set to false
4. THE Game_System SHALL allow authenticated users to submit up to 5 reports per day
5. THE Game_System SHALL prevent users from reporting the same player multiple times in the same room
6. THE Game_System SHALL provide an admin panel to view and resolve reports
7. WHEN an admin resolves a report, THE Game_System SHALL update the resolved status to true

### Requirement 16: Performance and Reliability

**User Story:** As a player, I want the game to be responsive and reliable, so that I have a smooth experience without lag or disconnections.

#### Acceptance Criteria

1. THE Canvas_Sync SHALL deliver drawing events to all clients within 50ms under normal network conditions
2. THE Game_System SHALL support at least 100 concurrent rooms
3. THE Game_System SHALL maintain WebSocket connections with automatic reconnection on transient failures
4. THE Game_System SHALL cache room state in Redis for fast access
5. THE Game_System SHALL implement rate limiting of 100 requests per minute per IP for REST endpoints
6. THE Game_System SHALL implement rate limiting of 50 socket events per second per connection
7. THE Game_System SHALL log all errors to a centralized logging service
8. THE Game_System SHALL achieve 99.5% uptime measured monthly

### Requirement 17: Database Persistence

**User Story:** As a player, I want my profile, stats, and unlocked cosmetics to be saved, so that my progress persists across sessions.

#### Acceptance Criteria

1. WHEN a user registers, THE Auth_Service SHALL create a user record with username, email, password hash, XP (0), and level (1)
2. WHEN a game ends, THE Game_System SHALL create a game_sessions record with room ID, mode, rounds, start time, and end time
3. WHEN a game ends, THE Game_System SHALL create game_players records for each participant with final score, rank, and XP earned
4. WHEN a user levels up, THE Game_System SHALL create user_cosmetics records for newly unlocked cosmetics
5. WHEN a user equips a cosmetic, THE Game_System SHALL update the equipped flag in user_cosmetics
6. WHEN a user creates a word pack, THE Game_System SHALL create a word_packs record and associated words records
7. THE Game_System SHALL update player_stats (games_played, games_won, total_score, correct_guesses, words_drawn) after each game

### Requirement 18: API Rate Limiting and Security

**User Story:** As a system administrator, I want to protect the API from abuse, so that the service remains available for legitimate users.

#### Acceptance Criteria

1. THE Game_System SHALL implement rate limiting of 100 requests per minute per IP for authentication endpoints
2. THE Game_System SHALL implement rate limiting of 200 requests per minute per IP for general API endpoints
3. WHEN rate limits are exceeded, THE Game_System SHALL return HTTP 429 status with retry-after header
4. THE Game_System SHALL validate all incoming request payloads using Zod schemas
5. WHEN validation fails, THE Game_System SHALL return HTTP 400 status with detailed error messages
6. THE Game_System SHALL require JWT authentication for all user-specific endpoints
7. WHEN an invalid or expired JWT is provided, THE Game_System SHALL return HTTP 401 status
8. THE Game_System SHALL hash passwords using bcrypt with a cost factor of 12
9. THE Game_System SHALL store refresh tokens as hashed values in the database

### Requirement 19: Mobile PWA Support

**User Story:** As a mobile user, I want to install the game as a PWA and use touch controls, so that I can play on my phone or tablet.

#### Acceptance Criteria

1. THE Game_System SHALL provide a web app manifest with app name, icons, and theme colors
2. THE Game_System SHALL register a service worker for offline shell caching
3. WHEN a user installs the PWA, THE Game_System SHALL provide an app icon and standalone window mode
4. THE Canvas_Sync SHALL support touch events (touchstart, touchmove, touchend) in addition to mouse events
5. THE Game_System SHALL provide a mobile-optimized UI with larger touch targets (minimum 44x44 pixels)
6. THE Game_System SHALL support pinch-to-zoom disabled on the canvas to prevent accidental zooming
7. THE Game_System SHALL adapt the layout for portrait and landscape orientations

### Requirement 20: Leaderboard System

**User Story:** As a competitive player, I want to see global rankings, so that I can compare my progress with others.

#### Acceptance Criteria

1. THE Game_System SHALL provide a global leaderboard ranked by total XP
2. THE Game_System SHALL display the top 100 players on the leaderboard
3. THE Game_System SHALL update leaderboard rankings after each game completion
4. THE Game_System SHALL display player username, level, total XP, and rank on the leaderboard
5. THE Game_System SHALL cache leaderboard data in Redis with 5-minute TTL
6. WHEN a user views the leaderboard, THE Game_System SHALL highlight their own rank if they are in the top 100
7. THE Game_System SHALL provide pagination for viewing ranks beyond the top 100

### Requirement 21: Drawing Tools and Canvas Configuration

**User Story:** As a drawer, I want access to various drawing tools and controls, so that I can create clear and expressive drawings.

#### Acceptance Criteria

1. THE Game_System SHALL provide a brush tool with three size options: thin (2px), medium (5px), and thick (10px)
2. THE Game_System SHALL provide a color palette with at least 20 distinct colors including black, white, primary colors, and common secondary colors
3. THE Game_System SHALL provide an eraser tool that removes strokes by painting with the background color
4. THE Game_System SHALL provide an undo button that removes the last stroke
5. THE Game_System SHALL provide a redo button that restores the last undone stroke
6. THE Game_System SHALL provide a clear canvas button that removes all strokes (drawer only)
7. THE Game_System SHALL provide a fill/bucket tool for filling enclosed areas with a selected color
8. THE Canvas_Sync SHALL apply line smoothing and anti-aliasing to all brush strokes for visual quality
9. THE Game_System SHALL display the currently selected tool, color, and brush size in the toolbar
10. THE Game_System SHALL use a fixed canvas size of 800x600 pixels that scales responsively to fit the viewport while maintaining aspect ratio

### Requirement 22: Default Content and Onboarding

**User Story:** As a new user, I want to start playing immediately with pre-loaded content, so that I don't have to create word packs before my first game.

#### Acceptance Criteria

1. THE Game_System SHALL include at least 5 curated default word packs covering categories: General, Animals, Food, Objects, and Actions
2. WHEN a user creates a room without selecting word packs, THE Game_System SHALL use the General default word pack
3. THE Game_System SHALL ensure each default word pack contains at least 100 words across easy, medium, and hard difficulty levels
4. THE Game_System SHALL mark default word packs as curated and display them prominently in the word pack selection interface
5. THE Game_System SHALL provide a first-time user tutorial overlay explaining basic controls (draw, guess, tools) on the first game
6. WHEN a guest user completes their first game, THE Game_System SHALL display a prompt encouraging account creation with benefits listed
7. THE Game_System SHALL seed the database with default word packs during initial deployment

### Requirement 23: Room Invitation and Sharing

**User Story:** As a host, I want to easily share my room with friends via links, so that they can join quickly without typing codes.

#### Acceptance Criteria

1. WHEN a room is created, THE Room_Manager SHALL generate a shareable URL in the format `https://scribbly.io/room/{roomCode}`
2. THE Game_System SHALL provide a "Copy Invite Link" button that copies the room URL to the clipboard
3. WHEN a user navigates to a room URL, THE Game_System SHALL automatically attempt to join that room
4. WHEN a user navigates to an invalid or expired room URL, THE Game_System SHALL redirect to the home page with an error message
5. THE Game_System SHALL support deep linking on mobile devices to open the PWA directly to the room
6. THE Game_System SHALL display a visual confirmation (toast notification) when the invite link is copied
7. THE Game_System SHALL include the room code prominently in the lobby UI for manual sharing

### Requirement 24: Error Handling and Network Resilience

**User Story:** As a player, I want the game to handle errors gracefully and inform me of issues, so that I understand what's happening when problems occur.

#### Acceptance Criteria

1. WHEN all players disconnect from a room simultaneously, THE Room_Manager SHALL destroy the room after 60 seconds
2. WHEN a player experiences high latency (>500ms), THE Game_System SHALL display a network quality warning indicator
3. WHEN the Redis cache is unavailable, THE Game_System SHALL fall back to in-memory room state and log the error
4. WHEN the PostgreSQL database is unavailable, THE Game_System SHALL allow guest gameplay to continue but disable account-related features
5. WHEN a WebSocket connection fails, THE Game_System SHALL attempt automatic reconnection with exponential backoff (1s, 2s, 4s, 8s, max 30s)
6. WHEN a critical error occurs, THE Game_System SHALL display a user-friendly error message and log detailed error information to the logging service
7. THE Game_System SHALL implement circuit breaker patterns for external service calls (database, Redis) with 5 failures triggering open circuit for 30 seconds
8. WHEN a player's connection is unstable, THE Game_System SHALL display a "reconnecting" overlay with connection status

### Requirement 25: Guest Username Validation

**User Story:** As a player, I want usernames to be validated and unique within rooms, so that I can identify other players clearly.

#### Acceptance Criteria

1. THE Game_System SHALL enforce username length between 2 and 20 characters
2. THE Game_System SHALL allow only alphanumeric characters, spaces, hyphens, and underscores in usernames
3. WHEN a guest attempts to join a room with a username already in use, THE Room_Manager SHALL append a number suffix (e.g., "Player", "Player2", "Player3")
4. THE Profanity_Filter SHALL validate guest usernames against the profanity blocklist before allowing room entry
5. WHEN a username contains profanity, THE Game_System SHALL reject the username and prompt for a different one
6. THE Game_System SHALL trim leading and trailing whitespace from usernames
7. THE Game_System SHALL prevent usernames consisting only of whitespace or special characters

### Requirement 26: Canvas Responsiveness and Display

**User Story:** As a player on any device, I want the canvas to display properly on my screen, so that I can draw and view drawings clearly.

#### Acceptance Criteria

1. THE Game_System SHALL use a base canvas resolution of 800x600 pixels (4:3 aspect ratio)
2. WHEN the viewport is smaller than the canvas, THE Game_System SHALL scale the canvas down proportionally while maintaining aspect ratio
3. WHEN the viewport is larger than the canvas, THE Game_System SHALL scale the canvas up to a maximum of 1200x900 pixels
4. THE Canvas_Sync SHALL normalize all coordinate data to the base resolution (800x600) before broadcasting
5. THE Game_System SHALL apply CSS transforms for scaling rather than changing canvas internal resolution
6. THE Game_System SHALL center the canvas horizontally and vertically within its container
7. THE Game_System SHALL adjust the UI layout for portrait orientation on mobile devices, stacking canvas above chat and scoreboard

### Requirement 27: Accessibility Features

**User Story:** As a player with accessibility needs, I want the game to be usable with assistive technologies, so that I can participate fully.

#### Acceptance Criteria

1. THE Game_System SHALL support keyboard navigation for all interactive elements with visible focus indicators
2. THE Game_System SHALL provide ARIA labels for all buttons, inputs, and interactive components
3. THE Game_System SHALL announce game state changes (round start, correct guess, game end) to screen readers via ARIA live regions
4. THE Game_System SHALL provide a color blind mode with alternative color palettes optimized for deuteranopia, protanopia, and tritanopia
5. THE Game_System SHALL ensure all text has a minimum contrast ratio of 4.5:1 against backgrounds (WCAG AA standard)
6. THE Game_System SHALL provide keyboard shortcuts: Space (start/stop drawing), U (undo), R (redo), C (clear), E (eraser), B (brush)
7. THE Game_System SHALL allow font size adjustment for chat and UI text (small, medium, large)
8. THE Game_System SHALL provide alt text descriptions for game state in spectator mode

### Requirement 28: Data Privacy and Retention

**User Story:** As a user, I want control over my data and transparency about data retention, so that I can trust the platform with my information.

#### Acceptance Criteria

1. THE Game_System SHALL store completed game session data for 90 days, after which it SHALL be archived or deleted
2. THE Game_System SHALL delete guest player data (username, scores) immediately after the game session ends
3. WHEN a user requests account deletion, THE Game_System SHALL permanently delete all user data within 30 days, including profile, stats, word packs, and game history
4. THE Game_System SHALL anonymize user data in game history records after account deletion (replace user_id with null, keep guest_name as "Deleted User")
5. THE Canvas_Sync SHALL store stroke history in Redis with a TTL of 1 hour after game completion
6. THE Game_System SHALL not store or log drawing canvas data permanently unless explicitly required for moderation
7. THE Game_System SHALL provide a data export feature allowing users to download their profile, stats, and game history in JSON format
8. THE Game_System SHALL comply with GDPR requirements including right to access, right to deletion, and right to data portability

### Requirement 29: Anti-Cheating Measures

**User Story:** As a player, I want the game to prevent cheating, so that competition is fair and enjoyable.

#### Acceptance Criteria

1. THE Game_System SHALL implement rate limiting of 5 guesses per second per player to prevent spam
2. THE Game_System SHALL detect and prevent players from opening multiple browser tabs/windows to view the word as both drawer and guesser
3. WHEN a player attempts to join the same room from multiple connections, THE Room_Manager SHALL disconnect the older connection
4. THE Game_System SHALL validate all drawing coordinates to ensure they are within canvas bounds (0-800, 0-600)
5. THE Game_System SHALL implement server-side validation for all game actions (word selection, guesses, votes) to prevent client-side manipulation
6. THE Game_System SHALL detect suspiciously fast correct guesses (within 1 second of round start) and flag them for review
7. THE Game_System SHALL prevent players from submitting guesses that exactly match the word before the round officially starts
8. THE Game_System SHALL log suspicious activity (rapid guessing, coordinate anomalies, multiple connections) for admin review

### Requirement 30: Notification and Sound System

**User Story:** As a player, I want audio and visual notifications for game events, so that I stay engaged even when not actively focused on the game.

#### Acceptance Criteria

1. THE Game_System SHALL provide sound effects for: correct guess, round start, round end, game end, player joined, and player left
2. THE Game_System SHALL provide a settings toggle to enable/disable sound effects globally
3. THE Game_System SHALL provide individual volume controls for sound effects (0-100%)
4. THE Game_System SHALL display toast notifications for: player joined, player left, kicked, connection issues, and game starting
5. WHEN the browser tab is inactive and it becomes the player's turn to draw, THE Game_System SHALL trigger a browser notification (if permission granted)
6. THE Game_System SHALL request notification permission on first game join with clear explanation of benefits
7. THE Game_System SHALL display toast notifications in the top-right corner with auto-dismiss after 5 seconds
8. THE Game_System SHALL queue multiple toast notifications and display them sequentially to avoid overlap

### Requirement 31: Room Persistence and Lifecycle

**User Story:** As a host, I want control over room lifecycle, so that I can manage waiting periods and game sessions effectively.

#### Acceptance Criteria

1. WHEN a room has fewer than 2 connected players, THE Room_Manager SHALL start a 60-second countdown before destroying the room
2. WHEN a player joins before the countdown expires, THE Room_Manager SHALL cancel the countdown
3. THE Room_Manager SHALL allow the host to manually close the room at any time, disconnecting all players
4. WHEN a game completes, THE Room_Manager SHALL return the room to lobby state, allowing the host to start a new game with the same players
5. THE Room_Manager SHALL persist room settings (rounds, draw time, word packs) between games in the same room session
6. THE Room_Manager SHALL destroy rooms that have been in lobby state (not in-game) for more than 30 minutes
7. THE Room_Manager SHALL destroy rooms immediately when the last player leaves, regardless of countdown
8. THE Game_System SHALL display the room destruction countdown to all players in the lobby

### Requirement 32: Scoring Edge Cases and Tie-Breaking

**User Story:** As a player, I want scoring to be fair and consistent in all scenarios, so that results are predictable and transparent.

#### Acceptance Criteria

1. WHEN the drawer disconnects mid-round, THE Score_Calculator SHALL award points to players who guessed correctly before the disconnection
2. WHEN the drawer disconnects mid-round, THE Score_Calculator SHALL not award drawer bonus points
3. WHEN multiple players have the same final score, THE Score_Calculator SHALL rank them by: (1) number of correct guesses, (2) total time to guess, (3) join order
4. THE Score_Calculator SHALL ensure scores never go below 0 (no negative scores)
5. WHEN a round ends with no correct guesses, THE Score_Calculator SHALL award 0 points to all players for that round
6. WHEN a player reconnects mid-round, THE Score_Calculator SHALL preserve their score from before disconnection
7. THE Game_System SHALL display tie-breaking criteria in the final scoreboard when multiple players share the same rank

### Requirement 33: Word Selection Fairness and Variety

**User Story:** As a player, I want word selection to be fair and varied, so that games remain interesting and unpredictable.

#### Acceptance Criteria

1. WHEN presenting 3 word choices to the drawer, THE Word_Selector SHALL randomly select words matching the configured difficulty level
2. THE Word_Selector SHALL ensure the 3 word choices have different difficulty levels when "Mixed" difficulty is selected
3. THE Word_Selector SHALL prevent the same word from appearing twice in the same game session
4. THE Word_Selector SHALL maintain a history of the last 20 words used across all games and reduce their selection probability by 50%
5. WHEN a word pack has fewer than 3 words remaining (after filtering used words), THE Word_Selector SHALL reset the used words list for that pack
6. THE Word_Selector SHALL distribute word selection evenly across all selected word packs in a room
7. THE Word_Selector SHALL exclude words longer than 25 characters from selection to ensure they fit in the hint display

### Requirement 34: Mobile-Specific Gestures and Interactions

**User Story:** As a mobile user, I want intuitive touch gestures for drawing, so that the mobile experience is smooth and natural.

#### Acceptance Criteria

1. THE Canvas_Sync SHALL support single-finger touch for drawing strokes
2. THE Game_System SHALL provide a two-finger swipe-down gesture to trigger undo
3. THE Game_System SHALL provide a two-finger swipe-up gesture to trigger redo
4. THE Game_System SHALL provide a three-finger tap gesture to clear the canvas (drawer only, with confirmation dialog)
5. THE Game_System SHALL disable pinch-to-zoom on the canvas element to prevent accidental zooming during drawing
6. THE Game_System SHALL provide larger touch targets (minimum 48x48 pixels) for all toolbar buttons on mobile devices
7. THE Game_System SHALL display a floating toolbar on mobile that can be repositioned by dragging
8. THE Game_System SHALL prevent default touch behaviors (scroll, context menu) on the canvas element

### Requirement 35: Testing and Quality Assurance

**User Story:** As a developer, I want comprehensive testing requirements, so that the system is reliable and maintainable.

#### Acceptance Criteria

1. THE Game_System SHALL maintain a minimum of 80% unit test coverage for backend services (RoomManager, GameEngine, ScoreCalculator, WordSelector)
2. THE Game_System SHALL maintain a minimum of 70% unit test coverage for frontend components and hooks
3. THE Game_System SHALL include integration tests for all Socket.io event handlers covering happy paths and error scenarios
4. THE Game_System SHALL include end-to-end tests for critical user flows: create room, join room, play game, complete game
5. THE Game_System SHALL perform load testing to verify support for 100 concurrent rooms with 12 players each (1,200 concurrent users)
6. THE Game_System SHALL verify browser compatibility with the latest versions of Chrome, Firefox, Safari, and Edge
7. THE Game_System SHALL verify mobile compatibility with iOS Safari and Android Chrome
8. THE Game_System SHALL include performance tests ensuring canvas sync latency remains below 50ms under normal load
9. THE Game_System SHALL implement automated CI/CD pipeline that runs all tests before deployment
10. THE Game_System SHALL use property-based testing for scoring calculations to verify correctness across random inputs
