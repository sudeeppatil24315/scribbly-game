import { Room, GameState, Player } from '@scribbly/shared';
import { RoomManager } from './room-manager.js';
import { WordSelectorService } from '../services/word-selector.service.js';
import { ScoreCalculator } from './score-calculator.js';
import prisma from '../config/db.js';

export class GameEngine {
  /**
   * Start a new game
   */
  static async startGame(room: Room): Promise<{ success: boolean; reason?: string }> {
    if (room.state !== 'lobby') {
      return { success: false, reason: 'Game already in progress' };
    }

    if (room.players.size < 2) {
      return { success: false, reason: 'Need at least 2 players to start' };
    }

    // Initialize game state
    room.gameState = {
      mode: 'classic',
      currentRound: 0,
      totalRounds: room.settings.rounds,
      drawerSocketId: null,
      currentWord: null,
      wordChoices: null,
      roundStartTime: null,
      roundEndTime: null,
      hint: '',
      correctGuessers: new Set(),
      usedWords: new Set(),
      scores: new Map(Array.from(room.players.keys()).map(id => [id, 0])),
      guessOrder: [],
    };

    room.state = 'in-game';
    await RoomManager.saveRoom(room);

    return { success: true };
  }

  /**
   * Select the drawer for the current round
   */
  static selectDrawer(room: Room): string {
    if (!room.gameState) {
      throw new Error('Game state not initialized');
    }

    const playerIds = Array.from(room.players.keys());
    
    if (room.gameState.currentRound === 0) {
      // First round: random selection
      const randomIndex = Math.floor(Math.random() * playerIds.length);
      return playerIds[randomIndex];
    }

    // Subsequent rounds: round-robin
    const currentDrawerIndex = playerIds.indexOf(room.gameState.drawerSocketId || '');
    const nextIndex = (currentDrawerIndex + 1) % playerIds.length;
    return playerIds[nextIndex];
  }

  /**
   * Start a new round
   */
  static async startRound(
    room: Room,
    onRoundStart?: (drawerSocketId: string, round: number) => void
  ): Promise<{ success: boolean; reason?: string }> {
    if (!room.gameState) {
      return { success: false, reason: 'Game not started' };
    }

    // Increment round
    room.gameState.currentRound++;

    if (room.gameState.currentRound > room.gameState.totalRounds) {
      return { success: false, reason: 'Game already completed' };
    }

    // Select drawer
    const drawerSocketId = this.selectDrawer(room);
    room.gameState.drawerSocketId = drawerSocketId;

    // Reset round state
    room.gameState.currentWord = null;
    room.gameState.wordChoices = null;
    room.gameState.roundStartTime = null;
    room.gameState.roundEndTime = null;
    room.gameState.hint = '';
    room.gameState.correctGuessers.clear();
    room.gameState.guessOrder = [];

    await RoomManager.saveRoom(room);

    // Trigger callback
    if (onRoundStart) {
      onRoundStart(drawerSocketId, room.gameState.currentRound);
    }

    return { success: true };
  }

  /**
   * Get player list in round-robin order starting from current drawer
   */
  static getDrawerRotation(room: Room): string[] {
    const playerIds = Array.from(room.players.keys());
    
    if (!room.gameState?.drawerSocketId) {
      return playerIds;
    }

    const currentIndex = playerIds.indexOf(room.gameState.drawerSocketId);
    if (currentIndex === -1) {
      return playerIds;
    }

    // Rotate array so current drawer is first
    return [...playerIds.slice(currentIndex), ...playerIds.slice(0, currentIndex)];
  }

  /**
   * Check if game is complete
   */
  static isGameComplete(room: Room): boolean {
    if (!room.gameState) return false;
    return room.gameState.currentRound >= room.gameState.totalRounds;
  }

  /**
   * Get current drawer
   */
  static getCurrentDrawer(room: Room): Player | null {
    if (!room.gameState?.drawerSocketId) return null;
    return room.players.get(room.gameState.drawerSocketId) || null;
  }

  /**
   * Get guessers (all players except drawer)
   */
  static getGuessers(room: Room): Player[] {
    if (!room.gameState?.drawerSocketId) {
      return Array.from(room.players.values());
    }

    return Array.from(room.players.values()).filter(
      player => player.socketId !== room.gameState!.drawerSocketId
    );
  }

  /**
   * Present word choices to drawer
   */
  static async presentWordChoices(room: Room): Promise<{ success: boolean; words?: string[]; reason?: string }> {
    if (!room.gameState) {
      return { success: false, reason: 'Game not started' };
    }

    if (!room.gameState.drawerSocketId) {
      return { success: false, reason: 'No drawer selected' };
    }

    // Select 3 words
    const selectedWords = await WordSelectorService.selectMultipleWords(3, {
      wordPackIds: room.settings.wordPackIds,
      difficulty: room.settings.difficulty,
      excludeWords: room.gameState.usedWords,
      recentWords: Array.from(room.gameState.usedWords).slice(-10), // Last 10 words
    });

    if (selectedWords.length < 3) {
      return { success: false, reason: 'Not enough words available' };
    }

    const words = selectedWords.map(w => w.word);
    room.gameState.wordChoices = words;

    await RoomManager.saveRoom(room);

    return { success: true, words };
  }

  /**
   * Select a word from the choices
   */
  static async selectWord(
    room: Room,
    drawerSocketId: string,
    wordIndex: number
  ): Promise<{ success: boolean; reason?: string }> {
    if (!room.gameState) {
      return { success: false, reason: 'Game not started' };
    }

    if (room.gameState.drawerSocketId !== drawerSocketId) {
      return { success: false, reason: 'Not the drawer' };
    }

    if (!room.gameState.wordChoices || room.gameState.wordChoices.length === 0) {
      return { success: false, reason: 'No word choices available' };
    }

    if (wordIndex < 0 || wordIndex >= room.gameState.wordChoices.length) {
      return { success: false, reason: 'Invalid word choice' };
    }

    const selectedWord = room.gameState.wordChoices[wordIndex];
    room.gameState.currentWord = selectedWord;
    room.gameState.usedWords.add(selectedWord.toLowerCase());
    room.gameState.wordChoices = null; // Clear choices after selection

    // Initialize hint (underscores for each letter)
    room.gameState.hint = this.createInitialHint(selectedWord);

    // Start round timer
    room.gameState.roundStartTime = new Date();
    const drawTimeMs = room.settings.drawTime * 1000;
    room.gameState.roundEndTime = new Date(Date.now() + drawTimeMs);

    await RoomManager.saveRoom(room);

    return { success: true };
  }

  /**
   * Auto-select first word if no selection within time limit
   */
  static async autoSelectWord(room: Room): Promise<{ success: boolean; reason?: string }> {
    if (!room.gameState?.wordChoices || room.gameState.wordChoices.length === 0) {
      return { success: false, reason: 'No word choices available' };
    }

    if (room.gameState.currentWord) {
      return { success: false, reason: 'Word already selected' };
    }

    // Select first word
    return await this.selectWord(room, room.gameState.drawerSocketId!, 0);
  }

  /**
   * Create initial hint with underscores
   */
  private static createInitialHint(word: string): string {
    return word
      .split('')
      .map(char => {
        // Preserve spaces and punctuation
        if (char === ' ' || /[^\w]/.test(char)) {
          return char;
        }
        return '_';
      })
      .join(' '); // Add spaces between characters for readability
  }

  /**
   * Get remaining time in round (milliseconds)
   */
  static getRemainingTime(room: Room): number {
    if (!room.gameState?.roundEndTime) return 0;

    const remaining = room.gameState.roundEndTime.getTime() - Date.now();
    return Math.max(0, remaining);
  }

  /**
   * Get remaining time in seconds
   */
  static getRemainingSeconds(room: Room): number {
    return Math.ceil(this.getRemainingTime(room) / 1000);
  }

  /**
   * Check if round time has expired
   */
  static isRoundTimeExpired(room: Room): boolean {
    return this.getRemainingTime(room) === 0;
  }

  /**
   * Check if all players have guessed correctly
   */
  static haveAllPlayersGuessed(room: Room): boolean {
    if (!room.gameState) return false;

    const guessers = this.getGuessers(room);
    return guessers.every(player => 
      room.gameState!.correctGuessers.has(player.socketId)
    );
  }

  /**
   * Check if round should end
   */
  static shouldEndRound(room: Room): boolean {
    if (!room.gameState?.currentWord) return false;

    // End if time expired
    if (this.isRoundTimeExpired(room)) return true;

    // End if all players guessed correctly
    if (this.haveAllPlayersGuessed(room)) return true;

    return false;
  }

  /**
   * End the current round
   */
  static async endRound(
    room: Room,
    onRoundEnd?: (word: string, scores: Map<string, number>) => void
  ): Promise<{ success: boolean; reason?: string }> {
    if (!room.gameState) {
      return { success: false, reason: 'Game not started' };
    }

    if (!room.gameState.currentWord) {
      return { success: false, reason: 'No active round' };
    }

    const word = room.gameState.currentWord;
    const scores = new Map(room.gameState.scores);

    // Trigger callback
    if (onRoundEnd) {
      onRoundEnd(word, scores);
    }

    // Check if game is complete
    if (this.isGameComplete(room)) {
      room.state = 'ending';
      await RoomManager.saveRoom(room);
      return { success: true };
    }

    // Prepare for next round
    room.gameState.currentWord = null;
    room.gameState.roundStartTime = null;
    room.gameState.roundEndTime = null;

    await RoomManager.saveRoom(room);

    return { success: true };
  }

  /**
   * Get elapsed time in round (milliseconds)
   */
  static getElapsedTime(room: Room): number {
    if (!room.gameState?.roundStartTime) return 0;

    return Date.now() - room.gameState.roundStartTime.getTime();
  }

  /**
   * Get total round time (milliseconds)
   */
  static getTotalRoundTime(room: Room): number {
    return room.settings.drawTime * 1000;
  }

  /**
   * Process a player's guess
   */
  static async processGuess(
    room: Room,
    playerSocketId: string,
    guess: string
  ): Promise<{
    correct: boolean;
    score: number;
    alreadyGuessed: boolean;
    isDrawer: boolean;
    reason?: string;
  }> {
    if (!room.gameState?.currentWord) {
      return {
        correct: false,
        score: 0,
        alreadyGuessed: false,
        isDrawer: false,
        reason: 'No active round',
      };
    }

    // Check if player is the drawer
    if (playerSocketId === room.gameState.drawerSocketId) {
      return {
        correct: false,
        score: 0,
        alreadyGuessed: false,
        isDrawer: true,
        reason: 'Drawer cannot guess',
      };
    }

    // Check if player already guessed correctly
    if (room.gameState.correctGuessers.has(playerSocketId)) {
      return {
        correct: false,
        score: 0,
        alreadyGuessed: true,
        isDrawer: false,
        reason: 'Already guessed correctly',
      };
    }

    // Normalize guess and word for comparison
    const normalizedGuess = guess.trim().toLowerCase();
    const normalizedWord = room.gameState.currentWord.trim().toLowerCase();

    // Check if guess is correct
    const isCorrect = normalizedGuess === normalizedWord;

    if (!isCorrect) {
      return {
        correct: false,
        score: 0,
        alreadyGuessed: false,
        isDrawer: false,
      };
    }

    // Calculate score
    const timeRemaining = this.getRemainingTime(room);
    const totalTime = this.getTotalRoundTime(room);
    const isFirstGuess = room.gameState.correctGuessers.size === 0;

    const guessScore = ScoreCalculator.calculateGuessScore(
      timeRemaining,
      totalTime,
      isFirstGuess
    );

    // Update player score
    const currentScore = room.gameState.scores.get(playerSocketId) || 0;
    room.gameState.scores.set(playerSocketId, currentScore + guessScore.totalScore);

    // Mark player as correct guesser
    room.gameState.correctGuessers.add(playerSocketId);
    room.gameState.guessOrder.push(playerSocketId);

    // Update drawer score (bonus for each correct guesser)
    if (room.gameState.drawerSocketId) {
      const drawerBonus = ScoreCalculator.calculateDrawerBonus(
        room.gameState.correctGuessers.size
      );
      const drawerCurrentScore = room.gameState.scores.get(room.gameState.drawerSocketId) || 0;
      
      // Calculate incremental drawer bonus (only for this new guesser)
      const incrementalBonus = ScoreCalculator.DRAWER_BONUS_PER_GUESSER;
      room.gameState.scores.set(
        room.gameState.drawerSocketId,
        drawerCurrentScore + incrementalBonus
      );
    }

    await RoomManager.saveRoom(room);

    return {
      correct: true,
      score: guessScore.totalScore,
      alreadyGuessed: false,
      isDrawer: false,
    };
  }

  /**
   * Validate guess format
   */
  static validateGuess(guess: string): { valid: boolean; reason?: string } {
    if (!guess || guess.trim().length === 0) {
      return { valid: false, reason: 'Guess cannot be empty' };
    }

    if (guess.length > 100) {
      return { valid: false, reason: 'Guess too long' };
    }

    return { valid: true };
  }

  /**
   * Check if it's time to reveal a hint
   */
  static shouldRevealHint(room: Room): { shouldReveal: boolean; hintNumber: number } {
    if (!room.gameState?.roundStartTime || !room.gameState.roundEndTime) {
      return { shouldReveal: false, hintNumber: 0 };
    }

    const totalTime = this.getTotalRoundTime(room);
    const elapsed = this.getElapsedTime(room);
    const progress = elapsed / totalTime;

    // Reveal first hint at 33% of round time
    if (progress >= 0.33 && progress < 0.66) {
      const currentHintLetters = (room.gameState.hint.match(/[a-zA-Z]/g) || []).length;
      const wordLetters = (room.gameState.currentWord?.match(/[a-zA-Z]/g) || []).length;
      
      // Check if first hint already revealed
      if (currentHintLetters === 0) {
        return { shouldReveal: true, hintNumber: 1 };
      }
    }

    // Reveal second hint at 66% of round time
    if (progress >= 0.66) {
      const currentHintLetters = (room.gameState.hint.match(/[a-zA-Z]/g) || []).length;
      
      // Check if only first hint revealed (need to reveal second)
      if (currentHintLetters === 1) {
        return { shouldReveal: true, hintNumber: 2 };
      }
    }

    return { shouldReveal: false, hintNumber: 0 };
  }

  /**
   * Reveal a random letter in the hint
   */
  static async revealHintLetter(room: Room): Promise<{ success: boolean; hint?: string; reason?: string }> {
    if (!room.gameState?.currentWord) {
      return { success: false, reason: 'No active round' };
    }

    const word = room.gameState.currentWord;
    const currentHint = room.gameState.hint;

    // Get letter positions (excluding spaces and punctuation)
    const letterPositions: number[] = [];
    const hintChars = currentHint.split(' '); // Hint has spaces between chars
    
    for (let i = 0; i < word.length; i++) {
      const char = word[i];
      if (/[a-zA-Z]/.test(char)) {
        // Check if this position is still hidden (underscore)
        if (hintChars[i] === '_') {
          letterPositions.push(i);
        }
      }
    }

    if (letterPositions.length === 0) {
      return { success: false, reason: 'All letters already revealed' };
    }

    // Select random position to reveal
    const randomIndex = Math.floor(Math.random() * letterPositions.length);
    const positionToReveal = letterPositions[randomIndex];

    // Update hint
    const newHintChars = hintChars.slice();
    newHintChars[positionToReveal] = word[positionToReveal];
    const newHint = newHintChars.join(' ');

    room.gameState.hint = newHint;
    await RoomManager.saveRoom(room);

    return { success: true, hint: newHint };
  }

  /**
   * Get current hint for display
   */
  static getCurrentHint(room: Room): string {
    return room.gameState?.hint || '';
  }

  /**
   * Check if hint should be shown to player (not drawer)
   */
  static shouldShowHint(room: Room, playerSocketId: string): boolean {
    return playerSocketId !== room.gameState?.drawerSocketId;
  }

  /**
   * Finalize round and persist results to database
   */
  static async finalizeRound(room: Room): Promise<void> {
    if (!room.gameState) return;

    // Round is finalized, scores are already updated
    // Game session will be persisted at game end
  }

  /**
   * End the game and persist results
   */
  static async endGame(room: Room): Promise<{ success: boolean; results?: any; reason?: string }> {
    if (!room.gameState) {
      return { success: false, reason: 'Game not started' };
    }

    // Calculate final rankings
    const playerResults = Array.from(room.players.values()).map(player => ({
      socketId: player.socketId,
      userId: player.userId,
      username: player.username,
      score: room.gameState!.scores.get(player.socketId) || 0,
      correctGuesses: room.gameState!.guessOrder.filter(id => id === player.socketId).length,
      totalGuessTime: 0, // Will be tracked in full implementation
      joinedAt: player.joinedAt,
    }));

    const ranked = ScoreCalculator.rankPlayers(playerResults);

    // Prepare results
    const results = playerResults.map(player => {
      const rankInfo = ranked.find(r => r.socketId === player.socketId);
      return {
        userId: player.userId,
        username: player.username,
        finalScore: player.score,
        rank: rankInfo?.rank || 0,
        correctGuesses: player.correctGuesses,
      };
    });

    // Persist game session to database (for authenticated users)
    try {
      const authenticatedPlayers = results.filter(p => p.userId);
      
      if (authenticatedPlayers.length > 0) {
        const session = await prisma.gameSession.create({
          data: {
            roomId: room.code,
            mode: room.gameState.mode,
            rounds: room.gameState.totalRounds,
            startedAt: room.createdAt,
            endedAt: new Date(),
          },
        });

        // Create player results
        for (const player of authenticatedPlayers) {
          await prisma.gamePlayer.create({
            data: {
              sessionId: session.id,
              userId: player.userId!,
              finalScore: player.finalScore,
              finalRank: player.rank,
              xpEarned: 0, // Will calculate below
            },
          });

          // Award XP
          const gameWon = player.rank === 1;
          const xpEarned = ScoreCalculator.calculateXP(
            player.correctGuesses,
            0, // firstGuesses
            0, // roundsWon
            gameWon,
            false, // dailyBonus - will check in full implementation
            0 // creatorPacksUsed
          );

          // Update user XP and level
          const user = await prisma.user.findUnique({
            where: { id: player.userId! },
            select: { xp: true },
          });

          if (user) {
            const newXP = user.xp + xpEarned;
            const newLevel = ScoreCalculator.calculateLevel(newXP);

            await prisma.user.update({
              where: { id: player.userId! },
              data: {
                xp: newXP,
                level: newLevel,
              },
            });
          }

          // Update player stats
          await prisma.playerStats.upsert({
            where: { userId: player.userId! },
            create: {
              userId: player.userId!,
              gamesPlayed: 1,
              gamesWon: gameWon ? 1 : 0,
              totalScore: BigInt(player.finalScore),
              correctGuesses: player.correctGuesses,
              wordsDrawn: 0,
            },
            update: {
              gamesPlayed: { increment: 1 },
              gamesWon: { increment: gameWon ? 1 : 0 },
              totalScore: { increment: BigInt(player.finalScore) },
              correctGuesses: { increment: player.correctGuesses },
            },
          });
        }
      }
    } catch (error) {
      console.error('Failed to persist game results:', error);
    }

    // Invalidate leaderboard cache after game completion
    try {
      const { LeaderboardController } = await import('../http/controllers/leaderboard.controller.js');
      await LeaderboardController.invalidateCache();
    } catch (error) {
      console.error('Failed to invalidate leaderboard cache:', error);
    }

    // Return room to lobby
    room.state = 'lobby';
    room.gameState = null;
    await RoomManager.saveRoom(room);

    return { success: true, results };
  }

  /**
   * Get game winner
   */
  static getGameWinner(room: Room): Player | null {
    if (!room.gameState) return null;

    const playerResults = Array.from(room.players.values()).map(player => ({
      socketId: player.socketId,
      score: room.gameState!.scores.get(player.socketId) || 0,
      correctGuesses: 0,
      totalGuessTime: 0,
      joinedAt: player.joinedAt,
    }));

    const winnerId = ScoreCalculator.getRoundWinner(playerResults);
    return winnerId ? room.players.get(winnerId) || null : null;
  }

  /**
   * Handle drawer disconnection during round
   * Awards points to players who guessed before disconnection
   * Does not award drawer bonus
   */
  static async handleDrawerDisconnectDuringRound(room: Room): Promise<void> {
    if (!room.gameState) return;

    // Points already awarded to correct guessers are preserved
    // Remove drawer bonus that was incrementally added
    if (room.gameState.drawerSocketId) {
      const drawerScore = room.gameState.scores.get(room.gameState.drawerSocketId) || 0;
      const correctGuessersCount = room.gameState.correctGuessers.size;
      const drawerBonusToRemove = correctGuessersCount * ScoreCalculator.DRAWER_BONUS_PER_GUESSER;
      
      room.gameState.scores.set(
        room.gameState.drawerSocketId,
        Math.max(0, drawerScore - drawerBonusToRemove)
      );
    }

    await RoomManager.saveRoom(room);
  }

  /**
   * Handle round end with no correct guesses
   * Awards 0 points to all players
   */
  static async handleNoCorrectGuesses(room: Room): Promise<void> {
    if (!room.gameState) return;

    // No score changes needed - players who didn't guess correctly already have 0 points for this round
    // Drawer gets 0 bonus since no one guessed correctly
  }

  /**
   * Preserve score for reconnecting player
   */
  static preservePlayerScore(room: Room, socketId: string): number {
    if (!room.gameState) return 0;
    return room.gameState.scores.get(socketId) || 0;
  }

  /**
   * Restore player score after reconnection
   */
  static async restorePlayerScore(
    room: Room,
    oldSocketId: string,
    newSocketId: string
  ): Promise<void> {
    if (!room.gameState) return;

    const score = room.gameState.scores.get(oldSocketId) || 0;
    room.gameState.scores.delete(oldSocketId);
    room.gameState.scores.set(newSocketId, score);

    // Update correct guessers if applicable
    if (room.gameState.correctGuessers.has(oldSocketId)) {
      room.gameState.correctGuessers.delete(oldSocketId);
      room.gameState.correctGuessers.add(newSocketId);
    }

    // Update guess order
    room.gameState.guessOrder = room.gameState.guessOrder.map(id =>
      id === oldSocketId ? newSocketId : id
    );

    await RoomManager.saveRoom(room);
  }
}

