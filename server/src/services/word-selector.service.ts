import prisma from '../config/db.js';

interface WordSelectionOptions {
  wordPackIds: string[];
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
  excludeWords: Set<string>;
  recentWords: string[];
  recentWordPenalty?: number;
}

interface SelectedWord {
  word: string;
  difficulty: 'easy' | 'medium' | 'hard';
  packId: string;
}

export class WordSelectorService {
  private static readonly RECENT_WORD_PENALTY = 0.5; // Reduce probability by 50% for recent words
  private static readonly MAX_SELECTION_ATTEMPTS = 10;

  /**
   * Select a word from the specified word packs with fairness constraints
   */
  static async selectWord(options: WordSelectionOptions): Promise<SelectedWord | null> {
    const {
      wordPackIds,
      difficulty,
      excludeWords,
      recentWords,
      recentWordPenalty = this.RECENT_WORD_PENALTY,
    } = options;

    if (wordPackIds.length === 0) {
      return null;
    }

    // Fetch all words from selected packs
    const words = await prisma.word.findMany({
      where: {
        packId: { in: wordPackIds },
        ...(difficulty !== 'mixed' && { difficulty }),
      },
      include: {
        pack: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (words.length === 0) {
      return null;
    }

    // Filter out excluded words
    const availableWords = words.filter((w: any) => !excludeWords.has(w.word.toLowerCase()));

    if (availableWords.length === 0) {
      return null;
    }

    // Group words by pack for fair distribution
    const wordsByPack = new Map<string, typeof availableWords>();
    for (const word of availableWords) {
      const packWords = wordsByPack.get(word.packId) || [];
      packWords.push(word);
      wordsByPack.set(word.packId, packWords);
    }

    // Calculate selection weights
    const recentWordsSet = new Set(recentWords.map((w: string) => w.toLowerCase()));
    const weightedWords = availableWords.map((word: any) => {
      let weight = 1.0;

      // Apply penalty for recent words
      if (recentWordsSet.has(word.word.toLowerCase())) {
        weight *= recentWordPenalty;
      }

      return { word, weight };
    });

    // Normalize weights
    const totalWeight = weightedWords.reduce((sum: number, w: any) => sum + w.weight, 0);
    const normalizedWords = weightedWords.map((w: any) => ({
      ...w,
      probability: w.weight / totalWeight,
    }));

    // Select word using weighted random selection
    const random = Math.random();
    let cumulativeProbability = 0;

    for (const item of normalizedWords) {
      cumulativeProbability += item.probability;
      if (random <= cumulativeProbability) {
        return {
          word: item.word.word,
          difficulty: item.word.difficulty,
          packId: item.word.packId,
        };
      }
    }

    // Fallback: return last word (should rarely happen)
    const lastWord = normalizedWords[normalizedWords.length - 1].word;
    return {
      word: lastWord.word,
      difficulty: lastWord.difficulty,
      packId: lastWord.packId,
    };
  }

  /**
   * Select multiple unique words for word choices
   */
  static async selectMultipleWords(
    count: number,
    options: WordSelectionOptions
  ): Promise<SelectedWord[]> {
    const selectedWords: SelectedWord[] = [];
    const usedWords = new Set(options.excludeWords);

    for (let i = 0; i < count && i < this.MAX_SELECTION_ATTEMPTS * count; i++) {
      const word = await this.selectWord({
        ...options,
        excludeWords: usedWords,
      });

      if (word) {
        selectedWords.push(word);
        usedWords.add(word.word.toLowerCase());

        if (selectedWords.length === count) {
          break;
        }
      }
    }

    return selectedWords;
  }

  /**
   * Validate that word packs have sufficient words
   */
  static async validateWordPacks(
    wordPackIds: string[],
    minWordsRequired: number
  ): Promise<{ valid: boolean; reason?: string }> {
    const wordCount = await prisma.word.count({
      where: {
        packId: { in: wordPackIds },
      },
    });

    if (wordCount < minWordsRequired) {
      return {
        valid: false,
        reason: `Selected word packs contain only ${wordCount} words, but ${minWordsRequired} are required`,
      };
    }

    return { valid: true };
  }

  /**
   * Get word pack statistics
   */
  static async getPackStatistics(packId: string) {
    const [totalWords, easyWords, mediumWords, hardWords] = await Promise.all([
      prisma.word.count({ where: { packId } }),
      prisma.word.count({ where: { packId, difficulty: 'easy' } }),
      prisma.word.count({ where: { packId, difficulty: 'medium' } }),
      prisma.word.count({ where: { packId, difficulty: 'hard' } }),
    ]);

    return {
      totalWords,
      byDifficulty: {
        easy: easyWords,
        medium: mediumWords,
        hard: hardWords,
      },
    };
  }
}
