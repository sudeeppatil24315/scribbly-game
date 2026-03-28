/**
 * Profanity Filter Service
 * Filters inappropriate content from chat messages and usernames
 */

// Basic profanity word list (expand this in production)
const PROFANITY_LIST_STANDARD = [
  'damn', 'hell', 'crap', 'stupid', 'idiot', 'dumb',
  // Add more words as needed
];

const PROFANITY_LIST_STRICT = [
  ...PROFANITY_LIST_STANDARD,
  'butt', 'poop', 'fart', 'ugly',
  // Add more mild words for strict mode
];

export type FilterLevel = 'off' | 'standard' | 'strict';

export class ProfanityFilterService {
  /**
   * Get the appropriate word list based on filter level
   */
  private static getWordList(level: FilterLevel): string[] {
    switch (level) {
      case 'strict':
        return PROFANITY_LIST_STRICT;
      case 'standard':
        return PROFANITY_LIST_STANDARD;
      case 'off':
      default:
        return [];
    }
  }

  /**
   * Create regex pattern from word list
   */
  private static createPattern(words: string[]): RegExp {
    if (words.length === 0) return /(?!)/; // Never matches
    
    const pattern = words
      .map(word => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) // Escape special chars
      .join('|');
    
    return new RegExp(`\\b(${pattern})\\b`, 'gi');
  }

  /**
   * Check if text contains profanity
   */
  static containsProfanity(text: string, level: FilterLevel = 'standard'): boolean {
    if (level === 'off') return false;
    
    const wordList = this.getWordList(level);
    const pattern = this.createPattern(wordList);
    
    return pattern.test(text);
  }

  /**
   * Filter text by replacing profanity with asterisks
   */
  static filterText(text: string, level: FilterLevel = 'standard'): string {
    if (level === 'off') return text;
    
    const wordList = this.getWordList(level);
    const pattern = this.createPattern(wordList);
    
    return text.replace(pattern, (match) => '*'.repeat(match.length));
  }

  /**
   * Validate username
   * Returns { valid: boolean, reason?: string, sanitized?: string }
   */
  static validateUsername(username: string, level: FilterLevel = 'standard'): {
    valid: boolean;
    reason?: string;
    sanitized?: string;
  } {
    // Trim whitespace
    const trimmed = username.trim();

    // Check length
    if (trimmed.length < 2) {
      return {
        valid: false,
        reason: 'Username must be at least 2 characters long',
      };
    }

    if (trimmed.length > 20) {
      return {
        valid: false,
        reason: 'Username must be at most 20 characters long',
      };
    }

    // Check allowed characters (alphanumeric, spaces, hyphens, underscores)
    const allowedPattern = /^[a-zA-Z0-9 _-]+$/;
    if (!allowedPattern.test(trimmed)) {
      return {
        valid: false,
        reason: 'Username can only contain letters, numbers, spaces, hyphens, and underscores',
      };
    }

    // Check if it's only whitespace or special characters
    if (/^[\s_-]+$/.test(trimmed)) {
      return {
        valid: false,
        reason: 'Username must contain at least one letter or number',
      };
    }

    // Check for profanity
    if (this.containsProfanity(trimmed, level)) {
      return {
        valid: false,
        reason: 'Username contains inappropriate content',
      };
    }

    return {
      valid: true,
      sanitized: trimmed,
    };
  }

  /**
   * Generate unique guest username with number suffix if needed
   */
  static generateUniqueUsername(baseUsername: string, existingUsernames: string[]): string {
    let username = baseUsername;
    let counter = 2;

    while (existingUsernames.includes(username)) {
      username = `${baseUsername}${counter}`;
      counter++;
    }

    return username;
  }
}
