import { Room, Player } from '@scribbly/shared';
import redis from '../config/redis.js';
import { RoomManager } from './room-manager.js';

interface DisconnectionTimer {
  socketId: string;
  roomCode: string;
  disconnectedAt: number;
  timeoutId: NodeJS.Timeout;
}

export class ReconnectionManager {
  private static readonly GRACE_PERIOD_MS = 30000; // 30 seconds
  private static disconnectionTimers: Map<string, DisconnectionTimer> = new Map();

  /**
   * Mark a player as disconnected and start grace period timer
   */
  static async markDisconnected(
    room: Room,
    socketId: string,
    onGracePeriodExpired: (socketId: string, roomCode: string) => void
  ): Promise<void> {
    const player = room.players.get(socketId);
    if (!player) return;

    // Mark player as disconnected
    player.isConnected = false;
    await RoomManager.saveRoom(room);

    // Store disconnection info in Redis
    const disconnectionKey = `disconnection:${room.code}:${socketId}`;
    await redis.setex(
      disconnectionKey,
      Math.ceil(this.GRACE_PERIOD_MS / 1000),
      JSON.stringify({
        socketId,
        roomCode: room.code,
        disconnectedAt: Date.now(),
        playerData: player,
      })
    );

    // Start grace period timer
    const timeoutId = setTimeout(() => {
      this.handleGracePeriodExpired(socketId, room.code, onGracePeriodExpired);
    }, this.GRACE_PERIOD_MS);

    this.disconnectionTimers.set(socketId, {
      socketId,
      roomCode: room.code,
      disconnectedAt: Date.now(),
      timeoutId,
    });
  }

  /**
   * Handle grace period expiration
   */
  private static async handleGracePeriodExpired(
    socketId: string,
    roomCode: string,
    callback: (socketId: string, roomCode: string) => void
  ): Promise<void> {
    // Clean up timer
    this.disconnectionTimers.delete(socketId);

    // Clean up Redis key
    const disconnectionKey = `disconnection:${roomCode}:${socketId}`;
    await redis.del(disconnectionKey);

    // Execute callback (will handle player removal)
    callback(socketId, roomCode);
  }

  /**
   * Cancel disconnection timer (player reconnected)
   */
  static async cancelDisconnection(socketId: string, roomCode: string): Promise<void> {
    const timer = this.disconnectionTimers.get(socketId);
    if (timer) {
      clearTimeout(timer.timeoutId);
      this.disconnectionTimers.delete(socketId);
    }

    // Clean up Redis key
    const disconnectionKey = `disconnection:${roomCode}:${socketId}`;
    await redis.del(disconnectionKey);
  }

  /**
   * Check if a player has an active disconnection timer
   */
  static hasDisconnectionTimer(socketId: string): boolean {
    return this.disconnectionTimers.has(socketId);
  }

  /**
   * Get remaining time on disconnection timer
   */
  static getRemainingTime(socketId: string): number {
    const timer = this.disconnectionTimers.get(socketId);
    if (!timer) return 0;

    const elapsed = Date.now() - timer.disconnectedAt;
    const remaining = this.GRACE_PERIOD_MS - elapsed;
    return Math.max(0, remaining);
  }

  /**
   * Get disconnection info from Redis
   */
  static async getDisconnectionInfo(
    roomCode: string,
    socketId: string
  ): Promise<any | null> {
    const disconnectionKey = `disconnection:${roomCode}:${socketId}`;
    const data = await redis.get(disconnectionKey);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Clean up all timers for a room
   */
  static async cleanupRoom(roomCode: string): Promise<void> {
    const timersToRemove: string[] = [];

    for (const [socketId, timer] of this.disconnectionTimers.entries()) {
      if (timer.roomCode === roomCode) {
        clearTimeout(timer.timeoutId);
        timersToRemove.push(socketId);

        // Clean up Redis key
        const disconnectionKey = `disconnection:${roomCode}:${socketId}`;
        await redis.del(disconnectionKey);
      }
    }

    timersToRemove.forEach(socketId => this.disconnectionTimers.delete(socketId));
  }

  /**
   * Get all disconnected players in a room
   */
  static getDisconnectedPlayers(room: Room): Player[] {
    return Array.from(room.players.values()).filter(player => !player.isConnected);
  }

  /**
   * Check if player is drawer
   */
  static isDrawer(room: Room, socketId: string): boolean {
    return room.gameState?.drawerSocketId === socketId;
  }

  /**
   * Restore player connection
   */
  static async reconnectPlayer(
    room: Room,
    oldSocketId: string,
    newSocketId: string
  ): Promise<{ success: boolean; reason?: string }> {
    const player = room.players.get(oldSocketId);
    if (!player) {
      return { success: false, reason: 'Player not found in room' };
    }

    // Cancel disconnection timer
    await this.cancelDisconnection(oldSocketId, room.code);

    // Update player socket ID and connection status
    room.players.delete(oldSocketId);
    player.socketId = newSocketId;
    player.isConnected = true;
    room.players.set(newSocketId, player);

    // Update host socket ID if this was the host
    if (room.hostSocketId === oldSocketId) {
      room.hostSocketId = newSocketId;
    }

    // Update drawer socket ID if this was the drawer
    if (room.gameState?.drawerSocketId === oldSocketId) {
      room.gameState.drawerSocketId = newSocketId;
    }

    await RoomManager.saveRoom(room);

    return { success: true };
  }

  /**
   * Get canvas state for reconnecting player
   */
  static async getCanvasState(roomCode: string): Promise<any | null> {
    const canvasKey = `canvas:${roomCode}`;
    const data = await redis.get(canvasKey);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Get current game state for reconnecting player
   */
  static getReconnectionData(room: Room) {
    return {
      room: {
        code: room.code,
        state: room.state,
        settings: room.settings,
        players: Array.from(room.players.values()),
        spectators: Array.from(room.spectators),
      },
      gameState: room.gameState ? {
        mode: room.gameState.mode,
        currentRound: room.gameState.currentRound,
        totalRounds: room.gameState.totalRounds,
        drawerSocketId: room.gameState.drawerSocketId,
        hint: room.gameState.hint,
        scores: Object.fromEntries(room.gameState.scores),
        roundStartTime: room.gameState.roundStartTime,
        roundEndTime: room.gameState.roundEndTime,
      } : null,
    };
  }

  /**
   * Check if player can reconnect to room
   */
  static async canReconnect(
    roomCode: string,
    userId: string | null,
    username: string
  ): Promise<{ canReconnect: boolean; oldSocketId?: string; reason?: string }> {
    const room = await RoomManager.getRoom(roomCode);
    if (!room) {
      return { canReconnect: false, reason: 'Room not found' };
    }

    // Find player by userId (for authenticated users) or username (for guests)
    for (const [socketId, player] of room.players.entries()) {
      if (userId && player.userId === userId) {
        // Authenticated user match
        if (!player.isConnected) {
          return { canReconnect: true, oldSocketId: socketId };
        }
      } else if (!userId && player.username === username && !player.isConnected) {
        // Guest user match (by username)
        return { canReconnect: true, oldSocketId: socketId };
      }
    }

    return { canReconnect: false, reason: 'No disconnected player found' };
  }

  /**
   * Handle drawer disconnection after grace period expires
   * Returns true if turn should be skipped
   */
  static async handleDrawerDisconnection(
    room: Room,
    socketId: string
  ): Promise<boolean> {
    if (!this.isDrawer(room, socketId)) {
      return false;
    }

    // If drawer doesn't reconnect within grace period, skip their turn
    if (room.gameState) {
      // Mark that drawer disconnected (game engine will handle turn skip)
      return true;
    }

    return false;
  }

  /**
   * Handle non-drawer disconnection after grace period expires
   * Returns true if player should be removed
   */
  static async handleNonDrawerDisconnection(
    room: Room,
    socketId: string
  ): Promise<boolean> {
    if (this.isDrawer(room, socketId)) {
      return false;
    }

    // Remove non-drawer players who don't reconnect within grace period
    await RoomManager.removePlayer(room, socketId);
    return true;
  }

  /**
   * Handle any player disconnection after grace period
   */
  static async handleDisconnectionExpired(
    room: Room,
    socketId: string,
    onDrawerDisconnect?: () => void,
    onPlayerRemoved?: () => void
  ): Promise<void> {
    const isDrawer = this.isDrawer(room, socketId);

    if (isDrawer) {
      const shouldSkipTurn = await this.handleDrawerDisconnection(room, socketId);
      if (shouldSkipTurn && onDrawerDisconnect) {
        onDrawerDisconnect();
      }
    } else {
      const wasRemoved = await this.handleNonDrawerDisconnection(room, socketId);
      if (wasRemoved && onPlayerRemoved) {
        onPlayerRemoved();
      }
    }
  }
}
