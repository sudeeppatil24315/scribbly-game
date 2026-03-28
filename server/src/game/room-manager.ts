import { Room, RoomSettings, Player } from '@scribbly/shared';
import redis from '../config/redis.js';

export class RoomManager {
  private static readonly ROOM_CODE_LENGTH = 6;
  private static readonly ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude ambiguous chars
  private static readonly ROOM_TTL = 3600; // 1 hour in seconds
  private static readonly LOBBY_INACTIVITY_TTL = 1800; // 30 minutes in seconds

  /**
   * Generate a unique 6-character alphanumeric room code
   */
  private static generateRoomCode(): string {
    let code = '';
    for (let i = 0; i < this.ROOM_CODE_LENGTH; i++) {
      const randomIndex = Math.floor(Math.random() * this.ROOM_CODE_CHARS.length);
      code += this.ROOM_CODE_CHARS[randomIndex];
    }
    return code;
  }

  /**
   * Create a new room with the specified host and settings
   */
  static async createRoom(
    hostSocketId: string,
    hostPlayer: Player,
    settings: RoomSettings
  ): Promise<Room> {
    // Generate unique room code
    let code: string;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      code = this.generateRoomCode();
      const exists = await this.roomExists(code);
      if (!exists) break;
      attempts++;
    } while (attempts < maxAttempts);

    if (attempts >= maxAttempts) {
      throw new Error('Failed to generate unique room code');
    }

    // Create room object
    const room: Room = {
      code,
      hostSocketId,
      players: new Map([[hostSocketId, hostPlayer]]),
      spectators: new Set(),
      settings,
      state: 'lobby',
      gameState: null,
      createdAt: new Date(),
      lastActivityAt: new Date(),
    };

    // Store room in Redis
    await this.saveRoom(room);

    return room;
  }

  /**
   * Check if a room with the given code exists
   */
  static async roomExists(code: string): Promise<boolean> {
    const exists = await redis.exists(`room:${code}`);
    return exists === 1;
  }

  /**
   * Get a room by code
   */
  static async getRoom(code: string): Promise<Room | null> {
    const data = await redis.get(`room:${code}`);
    if (!data) return null;

    const parsed = JSON.parse(data);
    
    // Reconstruct Map and Set objects
    return {
      ...parsed,
      players: new Map(Object.entries(parsed.players)),
      spectators: new Set(parsed.spectators),
      gameState: parsed.gameState ? {
        ...parsed.gameState,
        correctGuessers: new Set(parsed.gameState.correctGuessers),
        usedWords: new Set(parsed.gameState.usedWords),
        scores: new Map(Object.entries(parsed.gameState.scores)),
      } : null,
      createdAt: new Date(parsed.createdAt),
      lastActivityAt: new Date(parsed.lastActivityAt),
    };
  }

  /**
   * Save room to Redis
   */
  static async saveRoom(room: Room): Promise<void> {
    const ttl = room.state === 'lobby' ? this.LOBBY_INACTIVITY_TTL : this.ROOM_TTL;
    
    // Convert Map and Set to serializable objects
    const serializable = {
      ...room,
      players: Object.fromEntries(room.players),
      spectators: Array.from(room.spectators),
      gameState: room.gameState ? {
        ...room.gameState,
        correctGuessers: Array.from(room.gameState.correctGuessers),
        usedWords: Array.from(room.gameState.usedWords),
        scores: Object.fromEntries(room.gameState.scores),
      } : null,
    };

    await redis.setex(`room:${room.code}`, ttl, JSON.stringify(serializable));
  }

  /**
   * Delete a room
   */
  static async deleteRoom(code: string): Promise<void> {
    await redis.del(`room:${code}`);
  }

  /**
   * Update room's last activity timestamp
   */
  static async updateActivity(room: Room): Promise<void> {
    room.lastActivityAt = new Date();
    await this.saveRoom(room);
  }

  /**
   * Get all public rooms
   */
  static async getPublicRooms(): Promise<Room[]> {
    const keys = await redis.keys('room:*');
    const rooms: Room[] = [];

    for (const key of keys) {
      const data = await redis.get(key);
      if (!data) continue;

      const parsed = JSON.parse(data);
      if (parsed.settings.isPublic) {
        rooms.push({
          ...parsed,
          players: new Map(Object.entries(parsed.players)),
          spectators: new Set(parsed.spectators),
          gameState: parsed.gameState ? {
            ...parsed.gameState,
            correctGuessers: new Set(parsed.gameState.correctGuessers),
            usedWords: new Set(parsed.gameState.usedWords),
            scores: new Map(Object.entries(parsed.gameState.scores)),
          } : null,
          createdAt: new Date(parsed.createdAt),
          lastActivityAt: new Date(parsed.lastActivityAt),
        });
      }
    }

    return rooms;
  }

  /**
   * Get public rooms filtered by state
   */
  static async getPublicRoomsByState(state?: 'lobby' | 'in-game'): Promise<Room[]> {
    const allRooms = await this.getPublicRooms();
    
    if (!state) {
      return allRooms;
    }

    return allRooms.filter(room => room.state === state);
  }

  /**
   * Get public lobby rooms (joinable)
   */
  static async getJoinableRooms(): Promise<Room[]> {
    const lobbyRooms = await this.getPublicRoomsByState('lobby');
    return lobbyRooms.filter(room => room.players.size < room.settings.maxPlayers);
  }

  /**
   * Add a player to a room
   */
  static async addPlayer(room: Room, player: Player): Promise<{ success: boolean; reason?: string }> {
    // Validate room code
    if (!room) {
      return { success: false, reason: 'Room not found' };
    }

    // Check if room is full
    if (room.players.size >= room.settings.maxPlayers) {
      return { success: false, reason: 'Room is full' };
    }

    // Check if room is in game (can't join mid-game)
    if (room.state === 'in-game') {
      return { success: false, reason: 'Game already in progress' };
    }

    // Ensure username is unique within the room
    let username = player.username;
    let suffix = 1;
    const existingUsernames = new Set(
      Array.from(room.players.values()).map(p => p.username.toLowerCase())
    );

    while (existingUsernames.has(username.toLowerCase())) {
      username = `${player.username}${suffix}`;
      suffix++;
    }

    player.username = username;

    // Add player to room
    room.players.set(player.socketId, player);
    await this.updateActivity(room);

    return { success: true };
  }

  /**
   * Remove a player from a room
   */
  static async removePlayer(room: Room, socketId: string): Promise<void> {
    room.players.delete(socketId);

    // If host left, transfer host to next player
    if (room.hostSocketId === socketId && room.players.size > 0) {
      const nextHost = Array.from(room.players.values())[0];
      room.hostSocketId = nextHost.socketId;
      nextHost.isHost = true;
    }

    // If room is empty, delete it
    if (room.players.size === 0) {
      await this.deleteRoom(room.code);
      return;
    }

    await this.updateActivity(room);
  }

  /**
   * Get player from room
   */
  static getPlayer(room: Room, socketId: string): Player | undefined {
    return room.players.get(socketId);
  }

  /**
   * Check if player is in room
   */
  static isPlayerInRoom(room: Room, socketId: string): boolean {
    return room.players.has(socketId);
  }

  /**
   * Get player count
   */
  static getPlayerCount(room: Room): number {
    return room.players.size;
  }

  /**
   * Kick a player from the room (host only)
   */
  static async kickPlayer(
    room: Room,
    hostSocketId: string,
    targetSocketId: string
  ): Promise<{ success: boolean; reason?: string }> {
    // Verify requester is host
    if (room.hostSocketId !== hostSocketId) {
      return { success: false, reason: 'Only host can kick players' };
    }

    // Can't kick yourself
    if (hostSocketId === targetSocketId) {
      return { success: false, reason: 'Cannot kick yourself' };
    }

    // Check if target player exists
    if (!room.players.has(targetSocketId)) {
      return { success: false, reason: 'Player not found' };
    }

    // Add to kick ban list (5 minutes)
    const kickBanKey = `kick-ban:${room.code}:${targetSocketId}`;
    await redis.setex(kickBanKey, 300, '1'); // 5 minutes

    // Remove player
    await this.removePlayer(room, targetSocketId);

    return { success: true };
  }

  /**
   * Check if a player is kick-banned from a room
   */
  static async isKickBanned(roomCode: string, socketId: string): Promise<boolean> {
    const kickBanKey = `kick-ban:${roomCode}:${socketId}`;
    const banned = await redis.exists(kickBanKey);
    return banned === 1;
  }

  /**
   * Start a kick vote
   */
  static async startKickVote(
    room: Room,
    initiatorSocketId: string,
    targetSocketId: string
  ): Promise<{ success: boolean; reason?: string }> {
    // Can't vote to kick yourself
    if (initiatorSocketId === targetSocketId) {
      return { success: false, reason: 'Cannot vote to kick yourself' };
    }

    // Can't vote to kick host
    if (room.hostSocketId === targetSocketId) {
      return { success: false, reason: 'Cannot vote to kick host' };
    }

    // Check if target player exists
    if (!room.players.has(targetSocketId)) {
      return { success: false, reason: 'Player not found' };
    }

    // Check if there's already an active vote
    const voteKey = `kick-vote:${room.code}`;
    const existingVote = await redis.get(voteKey);
    if (existingVote) {
      return { success: false, reason: 'A kick vote is already in progress' };
    }

    // Create vote with 60-second expiry
    const vote = {
      targetSocketId,
      votes: [initiatorSocketId],
      startedAt: new Date().toISOString(),
    };
    await redis.setex(voteKey, 60, JSON.stringify(vote));

    return { success: true };
  }

  /**
   * Add a vote to an active kick vote
   */
  static async addKickVote(
    room: Room,
    voterSocketId: string
  ): Promise<{ success: boolean; kicked: boolean; reason?: string }> {
    const voteKey = `kick-vote:${room.code}`;
    const voteData = await redis.get(voteKey);

    if (!voteData) {
      return { success: false, kicked: false, reason: 'No active kick vote' };
    }

    const vote = JSON.parse(voteData);

    // Check if already voted
    if (vote.votes.includes(voterSocketId)) {
      return { success: false, kicked: false, reason: 'Already voted' };
    }

    // Add vote
    vote.votes.push(voterSocketId);

    // Calculate required votes (50% + 1)
    const requiredVotes = Math.floor(room.players.size / 2) + 1;

    // Check if vote passed
    if (vote.votes.length >= requiredVotes) {
      // Kick the player
      const kickBanKey = `kick-ban:${room.code}:${vote.targetSocketId}`;
      await redis.setex(kickBanKey, 300, '1'); // 5 minutes
      await this.removePlayer(room, vote.targetSocketId);
      await redis.del(voteKey);
      return { success: true, kicked: true };
    }

    // Update vote
    await redis.setex(voteKey, 60, JSON.stringify(vote));
    return { success: true, kicked: false };
  }

  /**
   * Get active kick vote
   */
  static async getKickVote(roomCode: string): Promise<any | null> {
    const voteKey = `kick-vote:${roomCode}`;
    const voteData = await redis.get(voteKey);
    return voteData ? JSON.parse(voteData) : null;
  }

  /**
   * Transfer host to another player
   */
  static async transferHost(
    room: Room,
    currentHostSocketId: string,
    newHostSocketId: string
  ): Promise<{ success: boolean; reason?: string }> {
    // Verify requester is current host
    if (room.hostSocketId !== currentHostSocketId) {
      return { success: false, reason: 'Only host can transfer host role' };
    }

    // Check if new host exists
    const newHost = room.players.get(newHostSocketId);
    if (!newHost) {
      return { success: false, reason: 'Target player not found' };
    }

    // Update host
    const oldHost = room.players.get(currentHostSocketId);
    if (oldHost) {
      oldHost.isHost = false;
    }

    newHost.isHost = true;
    room.hostSocketId = newHostSocketId;

    await this.saveRoom(room);

    return { success: true };
  }

  /**
   * Start room destruction countdown
   */
  static async startDestructionCountdown(roomCode: string): Promise<void> {
    const countdownKey = `room-countdown:${roomCode}`;
    await redis.setex(countdownKey, 60, '1'); // 60 seconds
  }

  /**
   * Cancel room destruction countdown
   */
  static async cancelDestructionCountdown(roomCode: string): Promise<void> {
    const countdownKey = `room-countdown:${roomCode}`;
    await redis.del(countdownKey);
  }

  /**
   * Check if room has active destruction countdown
   */
  static async hasDestructionCountdown(roomCode: string): Promise<boolean> {
    const countdownKey = `room-countdown:${roomCode}`;
    const exists = await redis.exists(countdownKey);
    return exists === 1;
  }

  /**
   * Get remaining time on destruction countdown
   */
  static async getDestructionCountdownTime(roomCode: string): Promise<number> {
    const countdownKey = `room-countdown:${roomCode}`;
    const ttl = await redis.ttl(countdownKey);
    return ttl > 0 ? ttl : 0;
  }

  /**
   * Close room manually (host only)
   */
  static async closeRoom(
    room: Room,
    hostSocketId: string
  ): Promise<{ success: boolean; reason?: string }> {
    // Verify requester is host
    if (room.hostSocketId !== hostSocketId) {
      return { success: false, reason: 'Only host can close the room' };
    }

    await this.deleteRoom(room.code);
    return { success: true };
  }

  /**
   * Check if room should be destroyed due to inactivity
   */
  static shouldDestroyDueToInactivity(room: Room): boolean {
    if (room.state !== 'lobby') return false;

    const inactivityThreshold = 30 * 60 * 1000; // 30 minutes
    const timeSinceActivity = Date.now() - room.lastActivityAt.getTime();

    return timeSinceActivity > inactivityThreshold;
  }

  /**
   * Check if room should start destruction countdown
   */
  static shouldStartCountdown(room: Room): boolean {
    return room.players.size < 2;
  }
}
