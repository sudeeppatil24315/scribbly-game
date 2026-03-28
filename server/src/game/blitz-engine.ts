import { Room, BlitzState, CanvasState } from '@scribbly/shared';
import { RoomManager } from './room-manager.js';
import { WordSelectorService } from '../services/word-selector.service.js';
import { ScoreCalculator } from './score-calculator.js';
import prisma from '../config/db.js';
import redis from '../config/redis.js';

export class BlitzEngine {
  private static readonly DRAWING_PHASE_TIME = 60000; // 60 seconds
  private static readonly VOTING_PHASE_TIME = 15000; // 15 seconds

  /**
   * Start Blitz Mode game
   */
  static async startBlitzGame(room: Room): Promise<{ success: boolean; word?: string; reason?: string }> {
    if (room.state !== 'lobby') {
      return { success: false, reason: 'Game already in progress' };
    }

    if (room.players.size < 2) {
      return { success: false, reason: 'Need at least 2 players to start' };
    }

    // Select one word for all players
    const selectedWords = await WordSelectorService.selectMultipleWords(1, {
      wordPackIds: room.settings.wordPackIds,
      difficulty: room.settings.difficulty,
      excludeWords: new Set(),
      recentWords: [],
    });

    if (selectedWords.length === 0) {
      return { success: false, reason: 'No words available' };
    }

    const word = selectedWords[0].word;

    // Initialize Blitz game state
    const blitzState: BlitzState = {
      currentWord: word,
      drawingPhaseEndTime: new Date(Date.now() + this.DRAWING_PHASE_TIME),
      votingPhaseEndTime: new Date(Date.now() + this.DRAWING_PHASE_TIME + this.VOTING_PHASE_TIME),
      drawings: new Map(),
      votes: new Map(),
      voteCount: new Map(),
    };

    room.gameState = {
      mode: 'blitz',
      currentRound: 1,
      totalRounds: 1,
      drawerSocketId: null, // Everyone draws in Blitz
      currentWord: word,
      wordChoices: null,
      roundStartTime: new Date(),
      roundEndTime: blitzState.drawingPhaseEndTime,
      hint: '',
      correctGuessers: new Set(),
      usedWords: new Set([word.toLowerCase()]),
      scores: new Map(Array.from(room.players.keys()).map(id => [id, 0])),
      guessOrder: [],
    };

    room.state = 'in-game';
    await RoomManager.saveRoom(room);

    // Store Blitz state separately
    await this.saveBlitzState(room.code, blitzState);

    return { success: true, word };
  }

  /**
   * Submit drawing for Blitz Mode
   */
  static async submitDrawing(
    roomCode: string,
    socketId: string,
    canvasState: CanvasState
  ): Promise<{ success: boolean; reason?: string }> {
    const blitzState = await this.getBlitzState(roomCode);
    if (!blitzState) {
      return { success: false, reason: 'Blitz game not found' };
    }

    // Check if drawing phase is still active
    if (Date.now() > blitzState.drawingPhaseEndTime.getTime()) {
      return { success: false, reason: 'Drawing phase has ended' };
    }

    // Store drawing
    blitzState.drawings.set(socketId, canvasState);
    await this.saveBlitzState(roomCode, blitzState);

    return { success: true };
  }

  /**
   * Enter voting phase
   */
  static async enterVotingPhase(roomCode: string): Promise<{ success: boolean; drawings?: any[]; reason?: string }> {
    const blitzState = await this.getBlitzState(roomCode);
    if (!blitzState) {
      return { success: false, reason: 'Blitz game not found' };
    }

    // Get all drawings in random order
    const drawingEntries = Array.from(blitzState.drawings.entries());
    const shuffled = this.shuffleArray(drawingEntries);

    const drawings = shuffled.map(([socketId, canvasState]) => ({
      socketId,
      canvasState,
    }));

    return { success: true, drawings };
  }

  /**
   * Submit a vote
   */
  static async submitVote(
    roomCode: string,
    voterSocketId: string,
    targetSocketId: string
  ): Promise<{ success: boolean; reason?: string }> {
    const blitzState = await this.getBlitzState(roomCode);
    if (!blitzState) {
      return { success: false, reason: 'Blitz game not found' };
    }

    // Check if voting phase is active
    const now = Date.now();
    if (now < blitzState.drawingPhaseEndTime.getTime()) {
      return { success: false, reason: 'Voting phase not started' };
    }

    if (now > blitzState.votingPhaseEndTime.getTime()) {
      return { success: false, reason: 'Voting phase has ended' };
    }

    // Prevent voting for own drawing
    if (voterSocketId === targetSocketId) {
      return { success: false, reason: 'Cannot vote for your own drawing' };
    }

    // Check if target has a drawing
    if (!blitzState.drawings.has(targetSocketId)) {
      return { success: false, reason: 'Target player has no drawing' };
    }

    // Remove previous vote if exists
    const previousVote = blitzState.votes.get(voterSocketId);
    if (previousVote) {
      const previousCount = blitzState.voteCount.get(previousVote) || 0;
      blitzState.voteCount.set(previousVote, Math.max(0, previousCount - 1));
    }

    // Add new vote
    blitzState.votes.set(voterSocketId, targetSocketId);
    const currentCount = blitzState.voteCount.get(targetSocketId) || 0;
    blitzState.voteCount.set(targetSocketId, currentCount + 1);

    await this.saveBlitzState(roomCode, blitzState);

    return { success: true };
  }

  /**
   * Calculate Blitz scores based on votes
   */
  static async calculateBlitzScores(room: Room): Promise<{ success: boolean; results?: any; reason?: string }> {
    const blitzState = await this.getBlitzState(room.code);
    if (!blitzState) {
      return { success: false, reason: 'Blitz game not found' };
    }

    // Calculate scores based on votes
    const scores = new Map<string, number>();
    let maxVotes = 0;
    let topVotedPlayer: string | null = null;

    for (const [socketId, voteCount] of blitzState.voteCount.entries()) {
      const score = voteCount * 100; // 100 points per vote
      scores.set(socketId, score);

      if (voteCount > maxVotes) {
        maxVotes = voteCount;
        topVotedPlayer = socketId;
      }
    }

    // Award 50 bonus XP to player with most votes
    const results = Array.from(room.players.values()).map(player => ({
      userId: player.userId,
      username: player.username,
      socketId: player.socketId,
      score: scores.get(player.socketId) || 0,
      votes: blitzState.voteCount.get(player.socketId) || 0,
      bonusXP: player.socketId === topVotedPlayer ? 50 : 0,
    }));

    // Update room scores
    if (room.gameState) {
      for (const result of results) {
        room.gameState.scores.set(result.socketId, result.score);
      }
    }

    await RoomManager.saveRoom(room);

    return { success: true, results };
  }

  /**
   * End Blitz game
   */
  static async endBlitzGame(room: Room): Promise<{ success: boolean; results?: any; reason?: string }> {
    const scoreResults = await this.calculateBlitzScores(room);
    if (!scoreResults.success) {
      return scoreResults;
    }

    // Persist to database (similar to Classic Mode)
    try {
      const authenticatedPlayers = scoreResults.results!.filter((p: any) => p.userId);

      if (authenticatedPlayers.length > 0) {
        const session = await prisma.gameSession.create({
          data: {
            roomId: room.code,
            mode: 'blitz',
            rounds: 1,
            startedAt: room.createdAt,
            endedAt: new Date(),
          },
        });

        for (const player of authenticatedPlayers) {
          await prisma.gamePlayer.create({
            data: {
              sessionId: session.id,
              userId: player.userId,
              finalScore: player.score,
              xpEarned: player.bonusXP,
            },
          });

          // Award XP
          if (player.bonusXP > 0) {
            const user = await prisma.user.findUnique({
              where: { id: player.userId },
              select: { xp: true },
            });

            if (user) {
              const newXP = user.xp + player.bonusXP;
              const newLevel = ScoreCalculator.calculateLevel(newXP);

              await prisma.user.update({
                where: { id: player.userId },
                data: {
                  xp: newXP,
                  level: newLevel,
                },
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to persist Blitz results:', error);
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

    // Clean up Blitz state
    await this.deleteBlitzState(room.code);

    return { success: true, results: scoreResults.results };
  }

  /**
   * Get Blitz state
   */
  private static async getBlitzState(roomCode: string): Promise<BlitzState | null> {
    const blitzKey = `blitz:${roomCode}`;
    const data = await redis.get(blitzKey);

    if (!data) return null;

    const parsed = JSON.parse(data);
    return {
      ...parsed,
      drawingPhaseEndTime: new Date(parsed.drawingPhaseEndTime),
      votingPhaseEndTime: new Date(parsed.votingPhaseEndTime),
      drawings: new Map(Object.entries(parsed.drawings)),
      votes: new Map(Object.entries(parsed.votes)),
      voteCount: new Map(Object.entries(parsed.voteCount)),
    };
  }

  /**
   * Save Blitz state
   */
  private static async saveBlitzState(roomCode: string, state: BlitzState): Promise<void> {
    const blitzKey = `blitz:${roomCode}`;
    const serializable = {
      ...state,
      drawings: Object.fromEntries(state.drawings),
      votes: Object.fromEntries(state.votes),
      voteCount: Object.fromEntries(state.voteCount),
    };

    await redis.setex(blitzKey, 3600, JSON.stringify(serializable));
  }

  /**
   * Delete Blitz state
   */
  private static async deleteBlitzState(roomCode: string): Promise<void> {
    const blitzKey = `blitz:${roomCode}`;
    await redis.del(blitzKey);
  }

  /**
   * Shuffle array (Fisher-Yates algorithm)
   */
  private static shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Get remaining time in drawing phase
   */
  static getRemainingDrawingTime(blitzState: BlitzState): number {
    const remaining = blitzState.drawingPhaseEndTime.getTime() - Date.now();
    return Math.max(0, remaining);
  }

  /**
   * Get remaining time in voting phase
   */
  static getRemainingVotingTime(blitzState: BlitzState): number {
    const remaining = blitzState.votingPhaseEndTime.getTime() - Date.now();
    return Math.max(0, remaining);
  }

  /**
   * Check if drawing phase is complete
   */
  static isDrawingPhaseComplete(blitzState: BlitzState): boolean {
    return Date.now() >= blitzState.drawingPhaseEndTime.getTime();
  }

  /**
   * Check if voting phase is complete
   */
  static isVotingPhaseComplete(blitzState: BlitzState): boolean {
    return Date.now() >= blitzState.votingPhaseEndTime.getTime();
  }
}
