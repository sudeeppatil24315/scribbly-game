import { GuessResult, GuessScore } from '@scribbly/shared';

export class ScoreCalculator {
  private static readonly BASE_SCORE = 500;
  private static readonly MAX_TIME_BONUS = 500;
  private static readonly FIRST_GUESS_BONUS = 100;
  static readonly DRAWER_BONUS_PER_GUESSER = 200;

  /**
   * Calculate score for a correct guess
   */
  static calculateGuessScore(
    timeRemaining: number,
    totalTime: number,
    isFirstGuess: boolean
  ): GuessScore {
    // Calculate time bonus (0-500 based on time remaining)
    const timeRatio = Math.max(0, Math.min(1, timeRemaining / totalTime));
    const timeBonus = Math.floor(this.MAX_TIME_BONUS * timeRatio);

    // Calculate first guess bonus
    const firstGuessBonus = isFirstGuess ? this.FIRST_GUESS_BONUS : 0;

    // Calculate total score
    const totalScore = this.BASE_SCORE + timeBonus + firstGuessBonus;

    return {
      baseScore: this.BASE_SCORE,
      timeBonus,
      firstGuessBonus,
      totalScore: Math.max(0, totalScore), // Ensure never negative
    };
  }

  /**
   * Calculate drawer bonus based on number of correct guessers
   */
  static calculateDrawerBonus(correctGuessersCount: number): number {
    return correctGuessersCount * this.DRAWER_BONUS_PER_GUESSER;
  }

  /**
   * Calculate complete guess result
   */
  static calculateGuessResult(
    correct: boolean,
    timeRemaining: number,
    totalTime: number,
    isFirstGuess: boolean,
    correctGuessersCount: number
  ): GuessResult {
    if (!correct) {
      return {
        correct: false,
        score: 0,
        timeBonus: 0,
        firstGuessBonus: 0,
        drawerBonus: 0,
      };
    }

    const guessScore = this.calculateGuessScore(timeRemaining, totalTime, isFirstGuess);
    const drawerBonus = this.calculateDrawerBonus(correctGuessersCount);

    return {
      correct: true,
      score: guessScore.totalScore,
      timeBonus: guessScore.timeBonus,
      firstGuessBonus: guessScore.firstGuessBonus,
      drawerBonus,
    };
  }

  /**
   * Ensure score is never below 0
   */
  static clampScore(score: number): number {
    return Math.max(0, score);
  }

  /**
   * Calculate score with time remaining in seconds
   */
  static calculateScoreFromSeconds(
    secondsRemaining: number,
    totalSeconds: number,
    isFirstGuess: boolean
  ): number {
    const guessScore = this.calculateGuessScore(
      secondsRemaining * 1000,
      totalSeconds * 1000,
      isFirstGuess
    );
    return guessScore.totalScore;
  }

  /**
   * XP rewards
   */
  private static readonly XP_CORRECT_GUESS = 50;
  private static readonly XP_FIRST_GUESS = 25;
  private static readonly XP_ROUND_WIN = 100;
  private static readonly XP_GAME_WIN = 200;
  private static readonly XP_DAILY_BONUS = 100;
  private static readonly XP_CREATOR_BONUS = 10;

  /**
   * Calculate XP for a player
   */
  static calculateXP(
    correctGuesses: number,
    firstGuesses: number,
    roundsWon: number,
    gameWon: boolean,
    isDailyBonus: boolean,
    creatorPacksUsed: number = 0
  ): number {
    let totalXP = 0;

    // Correct guesses
    totalXP += correctGuesses * this.XP_CORRECT_GUESS;

    // First guesses
    totalXP += firstGuesses * this.XP_FIRST_GUESS;

    // Round wins
    totalXP += roundsWon * this.XP_ROUND_WIN;

    // Game win
    if (gameWon) {
      totalXP += this.XP_GAME_WIN;
    }

    // Daily bonus
    if (isDailyBonus) {
      totalXP += this.XP_DAILY_BONUS;
    }

    // Creator bonus
    totalXP += creatorPacksUsed * this.XP_CREATOR_BONUS;

    return totalXP;
  }

  /**
   * Calculate level from XP
   * Formula: 500 * (level ^ 1.5)
   */
  static calculateLevel(xp: number): number {
    if (xp < 0) return 1;

    // Solve for level: xp = 500 * (level ^ 1.5)
    // level = (xp / 500) ^ (1 / 1.5)
    const level = Math.floor(Math.pow(xp / 500, 1 / 1.5));
    return Math.max(1, level);
  }

  /**
   * Calculate XP required for a specific level
   */
  static calculateXPForLevel(level: number): number {
    return Math.floor(500 * Math.pow(level, 1.5));
  }

  /**
   * Calculate XP required for next level
   */
  static calculateXPForNextLevel(currentXP: number): number {
    const currentLevel = this.calculateLevel(currentXP);
    return this.calculateXPForLevel(currentLevel + 1);
  }

  /**
   * Calculate XP progress to next level (0-1)
   */
  static calculateLevelProgress(currentXP: number): number {
    const currentLevel = this.calculateLevel(currentXP);
    const currentLevelXP = this.calculateXPForLevel(currentLevel);
    const nextLevelXP = this.calculateXPForLevel(currentLevel + 1);

    const xpIntoLevel = currentXP - currentLevelXP;
    const xpNeededForLevel = nextLevelXP - currentLevelXP;

    return xpIntoLevel / xpNeededForLevel;
  }

  /**
   * Get XP breakdown
   */
  static getXPBreakdown(
    correctGuesses: number,
    firstGuesses: number,
    roundsWon: number,
    gameWon: boolean,
    isDailyBonus: boolean
  ) {
    return {
      correctGuesses: correctGuesses * this.XP_CORRECT_GUESS,
      firstGuesses: firstGuesses * this.XP_FIRST_GUESS,
      roundsWon: roundsWon * this.XP_ROUND_WIN,
      gameWon: gameWon ? this.XP_GAME_WIN : 0,
      dailyBonus: isDailyBonus ? this.XP_DAILY_BONUS : 0,
      totalXP: this.calculateXP(correctGuesses, firstGuesses, roundsWon, gameWon, isDailyBonus),
    };
  }

  /**
   * Rank players with tie-breaking
   * Tie-breaking order: (1) correct guesses, (2) total time to guess, (3) join order
   */
  static rankPlayers(
    players: Array<{
      socketId: string;
      score: number;
      correctGuesses: number;
      totalGuessTime: number;
      joinedAt: Date;
    }>
  ): Array<{ socketId: string; rank: number }> {
    // Sort players
    const sorted = [...players].sort((a, b) => {
      // Primary: score (descending)
      if (a.score !== b.score) {
        return b.score - a.score;
      }

      // Tie-breaker 1: correct guesses (descending)
      if (a.correctGuesses !== b.correctGuesses) {
        return b.correctGuesses - a.correctGuesses;
      }

      // Tie-breaker 2: total time to guess (ascending - faster is better)
      if (a.totalGuessTime !== b.totalGuessTime) {
        return a.totalGuessTime - b.totalGuessTime;
      }

      // Tie-breaker 3: join order (ascending - earlier is better)
      return a.joinedAt.getTime() - b.joinedAt.getTime();
    });

    // Assign ranks
    const ranked: Array<{ socketId: string; rank: number }> = [];
    let currentRank = 1;

    for (let i = 0; i < sorted.length; i++) {
      // If this player has same score as previous, they share the rank
      if (i > 0 && sorted[i].score === sorted[i - 1].score) {
        // Check all tie-breakers
        const prev = sorted[i - 1];
        const curr = sorted[i];
        
        if (
          prev.correctGuesses === curr.correctGuesses &&
          prev.totalGuessTime === curr.totalGuessTime
        ) {
          // True tie - share rank
          ranked.push({ socketId: sorted[i].socketId, rank: ranked[i - 1].rank });
          continue;
        }
      }

      ranked.push({ socketId: sorted[i].socketId, rank: currentRank });
      currentRank++;
    }

    return ranked;
  }

  /**
   * Determine round winner
   */
  static getRoundWinner(
    players: Array<{
      socketId: string;
      score: number;
      correctGuesses: number;
      totalGuessTime: number;
      joinedAt: Date;
    }>
  ): string | null {
    if (players.length === 0) return null;

    const ranked = this.rankPlayers(players);
    return ranked[0].socketId;
  }
}
