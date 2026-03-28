import { Room } from '@scribbly/shared';
import { RoomManager } from './room-manager.js';

export class SpectatorManager {
  private static readonly MAX_SPECTATORS = 50;

  /**
   * Add spectator to room
   */
  static async addSpectator(
    room: Room,
    socketId: string
  ): Promise<{ success: boolean; reason?: string }> {
    // Check if spectators are allowed
    if (!room.settings.allowSpectators) {
      return { success: false, reason: 'Spectators not allowed in this room' };
    }

    // Check spectator limit
    if (room.spectators.size >= this.MAX_SPECTATORS) {
      return { success: false, reason: 'Spectator limit reached' };
    }

    // Add spectator
    room.spectators.add(socketId);
    await RoomManager.updateActivity(room);

    return { success: true };
  }

  /**
   * Remove spectator from room
   */
  static async removeSpectator(room: Room, socketId: string): Promise<void> {
    room.spectators.delete(socketId);
    await RoomManager.updateActivity(room);
  }

  /**
   * Check if socket is a spectator
   */
  static isSpectator(room: Room, socketId: string): boolean {
    return room.spectators.has(socketId);
  }

  /**
   * Get spectator count
   */
  static getSpectatorCount(room: Room): number {
    return room.spectators.size;
  }

  /**
   * Get current word for spectators (revealed)
   */
  static getCurrentWordForSpectator(room: Room): string | null {
    return room.gameState?.currentWord || null;
  }

  /**
   * Check if spectator can submit guesses (they cannot)
   */
  static canSpectatorGuess(): boolean {
    return false;
  }

  /**
   * Get spectator view data
   */
  static getSpectatorViewData(room: Room) {
    return {
      roomCode: room.code,
      state: room.state,
      players: Array.from(room.players.values()).map(p => ({
        username: p.username,
        avatar: p.avatar,
        score: room.gameState?.scores.get(p.socketId) || 0,
        isDrawer: p.socketId === room.gameState?.drawerSocketId,
      })),
      spectatorCount: room.spectators.size,
      currentWord: room.gameState?.currentWord || null, // Revealed to spectators
      currentRound: room.gameState?.currentRound || 0,
      totalRounds: room.gameState?.totalRounds || 0,
    };
  }

  /**
   * Broadcast to all spectators
   */
  static getSpectatorSocketIds(room: Room): string[] {
    return Array.from(room.spectators);
  }

  /**
   * Check if room accepts spectators
   */
  static canJoinAsSpectator(room: Room): boolean {
    return (
      room.settings.allowSpectators &&
      room.spectators.size < this.MAX_SPECTATORS
    );
  }
}
