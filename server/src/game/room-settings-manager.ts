import { Room, RoomSettings } from '@scribbly/shared';
import { RoomManager } from './room-manager.js';

export class RoomSettingsManager {
  /**
   * Update room settings (host only)
   */
  static async updateSettings(
    room: Room,
    hostSocketId: string,
    updates: Partial<RoomSettings>
  ): Promise<{ success: boolean; reason?: string }> {
    // Verify requester is host
    if (room.hostSocketId !== hostSocketId) {
      return { success: false, reason: 'Only host can update settings' };
    }

    // Prevent settings changes after game starts
    if (room.state !== 'lobby') {
      return { success: false, reason: 'Cannot change settings during game' };
    }

    // Validate settings
    const validation = this.validateSettings(updates);
    if (!validation.valid) {
      return { success: false, reason: validation.reason };
    }

    // Apply updates
    room.settings = {
      ...room.settings,
      ...updates,
    };

    await RoomManager.saveRoom(room);

    return { success: true };
  }

  /**
   * Validate room settings
   */
  static validateSettings(settings: Partial<RoomSettings>): { valid: boolean; reason?: string } {
    // Validate max players (2-12)
    if (settings.maxPlayers !== undefined) {
      if (settings.maxPlayers < 2 || settings.maxPlayers > 12) {
        return { valid: false, reason: 'Max players must be between 2 and 12' };
      }
    }

    // Validate rounds (1-10)
    if (settings.rounds !== undefined) {
      if (settings.rounds < 1 || settings.rounds > 10) {
        return { valid: false, reason: 'Rounds must be between 1 and 10' };
      }
    }

    // Validate draw time (30, 60, 80, or 120 seconds)
    if (settings.drawTime !== undefined) {
      const validDrawTimes = [30, 60, 80, 120];
      if (!validDrawTimes.includes(settings.drawTime)) {
        return { valid: false, reason: 'Draw time must be 30, 60, 80, or 120 seconds' };
      }
    }

    // Validate difficulty
    if (settings.difficulty !== undefined) {
      const validDifficulties = ['easy', 'medium', 'hard', 'mixed'];
      if (!validDifficulties.includes(settings.difficulty)) {
        return { valid: false, reason: 'Invalid difficulty level' };
      }
    }

    // Validate word pack IDs
    if (settings.wordPackIds !== undefined) {
      if (!Array.isArray(settings.wordPackIds) || settings.wordPackIds.length === 0) {
        return { valid: false, reason: 'At least one word pack must be selected' };
      }
    }

    return { valid: true };
  }

  /**
   * Get default room settings
   */
  static getDefaultSettings(): RoomSettings {
    return {
      maxPlayers: 8,
      rounds: 3,
      drawTime: 80,
      difficulty: 'mixed',
      wordPackIds: [], // Will be populated with default packs
      familySafeMode: false,
      allowSpectators: true,
      isPublic: true,
    };
  }

  /**
   * Update max players
   */
  static async updateMaxPlayers(
    room: Room,
    hostSocketId: string,
    maxPlayers: number
  ): Promise<{ success: boolean; reason?: string }> {
    return await this.updateSettings(room, hostSocketId, { maxPlayers });
  }

  /**
   * Update rounds
   */
  static async updateRounds(
    room: Room,
    hostSocketId: string,
    rounds: number
  ): Promise<{ success: boolean; reason?: string }> {
    return await this.updateSettings(room, hostSocketId, { rounds });
  }

  /**
   * Update draw time
   */
  static async updateDrawTime(
    room: Room,
    hostSocketId: string,
    drawTime: number
  ): Promise<{ success: boolean; reason?: string }> {
    return await this.updateSettings(room, hostSocketId, { drawTime });
  }

  /**
   * Update difficulty
   */
  static async updateDifficulty(
    room: Room,
    hostSocketId: string,
    difficulty: 'easy' | 'medium' | 'hard' | 'mixed'
  ): Promise<{ success: boolean; reason?: string }> {
    return await this.updateSettings(room, hostSocketId, { difficulty });
  }

  /**
   * Update word packs
   */
  static async updateWordPacks(
    room: Room,
    hostSocketId: string,
    wordPackIds: string[]
  ): Promise<{ success: boolean; reason?: string }> {
    return await this.updateSettings(room, hostSocketId, { wordPackIds });
  }

  /**
   * Toggle family-safe mode
   */
  static async toggleFamilySafeMode(
    room: Room,
    hostSocketId: string,
    enabled: boolean
  ): Promise<{ success: boolean; reason?: string }> {
    return await this.updateSettings(room, hostSocketId, { familySafeMode: enabled });
  }

  /**
   * Toggle spectator access
   */
  static async toggleSpectatorAccess(
    room: Room,
    hostSocketId: string,
    enabled: boolean
  ): Promise<{ success: boolean; reason?: string }> {
    return await this.updateSettings(room, hostSocketId, { allowSpectators: enabled });
  }

  /**
   * Toggle public/private room
   */
  static async togglePublic(
    room: Room,
    hostSocketId: string,
    isPublic: boolean
  ): Promise<{ success: boolean; reason?: string }> {
    return await this.updateSettings(room, hostSocketId, { isPublic });
  }

  /**
   * Get current settings
   */
  static getSettings(room: Room): RoomSettings {
    return room.settings;
  }
}
