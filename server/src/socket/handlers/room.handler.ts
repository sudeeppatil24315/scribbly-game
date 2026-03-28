import { Socket } from 'socket.io';
import { RoomManager } from '../../game/room-manager.js';
import { RoomSettingsManager } from '../../game/room-settings-manager.js';
import { SpectatorManager } from '../../game/spectator-manager.js';
import { SocketServer } from '../socket-server.js';
import { Player, ErrorCode } from '@scribbly/shared';

export class RoomHandler {
  constructor(
    private socketServer: SocketServer
  ) {}

  /**
   * Handle room:create event
   */
  async handleCreateRoom(socket: Socket, data: any): Promise<void> {
    try {
      const { settings } = data;
      const socketData = socket.data as any;

      // Create player object
      const player: Player = {
        socketId: socket.id,
        userId: socketData.userId,
        username: socketData.username,
        avatar: '', // Will be set from user profile
        score: 0,
        isHost: true,
        isConnected: true,
        joinedAt: new Date(),
      };

      // Create room
      const room = await RoomManager.createRoom(
        socket.id,
        player,
        settings || RoomSettingsManager.getDefaultSettings()
      );

      // Join socket to room
      await this.socketServer.joinRoom(socket, room.code);

      // Send room created event
      socket.emit('room:created', {
        code: room.code,
        room: this.serializeRoom(room),
      });
    } catch (error) {
      console.error('Create room error:', error);
      this.socketServer.emitError(socket.id, ErrorCode.INTERNAL_ERROR, 'Failed to create room');
    }
  }

  /**
   * Handle room:join event
   */
  async handleJoinRoom(socket: Socket, data: any): Promise<void> {
    try {
      const { roomCode } = data;
      const socketData = socket.data as any;

      // Get room
      const room = await RoomManager.getRoom(roomCode);
      if (!room) {
        this.socketServer.emitError(socket.id, ErrorCode.ROOM_NOT_FOUND, 'Room not found');
        return;
      }

      // Check if kick-banned
      const isBanned = await RoomManager.isKickBanned(roomCode, socket.id);
      if (isBanned) {
        this.socketServer.emitError(socket.id, ErrorCode.UNAUTHORIZED, 'You are temporarily banned from this room');
        return;
      }

      // Anti-cheat: Detect multiple connections from same player
      const { AntiCheatService } = await import('../../services/anti-cheat.service.js');
      const connectionCheck = await AntiCheatService.trackConnection(
        roomCode,
        socket.id,
        socketData.userId,
        socketData.username
      );

      if (connectionCheck.isMultipleConnection && connectionCheck.existingSocketId) {
        // Disconnect the older connection
        this.socketServer.disconnectSocket(connectionCheck.existingSocketId);
        
        // Log suspicious activity
        await AntiCheatService.logSuspiciousActivity({
          socketId: socket.id,
          userId: socketData.userId,
          username: socketData.username,
          roomCode,
          activityType: 'multiple_connections',
          details: {
            oldSocketId: connectionCheck.existingSocketId,
            newSocketId: socket.id,
            message: 'Player attempted to join same room from multiple connections',
          },
          timestamp: new Date(),
        });

        // Broadcast that old connection was replaced
        this.socketServer.emitToRoom(roomCode, 'room:player-reconnected', {
          socketId: socket.id,
          username: socketData.username,
        });
      }

      // Create player object
      const player: Player = {
        socketId: socket.id,
        userId: socketData.userId,
        username: socketData.username,
        avatar: '',
        score: 0,
        isHost: false,
        isConnected: true,
        joinedAt: new Date(),
      };

      // Add player to room
      const result = await RoomManager.addPlayer(room, player);
      if (!result.success) {
        this.socketServer.emitError(socket.id, ErrorCode.ROOM_FULL, result.reason || 'Cannot join room');
        return;
      }

      // Join socket to room
      await this.socketServer.joinRoom(socket, roomCode);

      // Send joined event to player
      socket.emit('room:joined', {
        room: this.serializeRoom(room),
      });

      // Broadcast player joined to others (if not a reconnection)
      if (!connectionCheck.isMultipleConnection) {
        this.socketServer.emitToRoomExcept(roomCode, socket.id, 'room:player-joined', {
          player: this.serializePlayer(player),
        });
      }
    } catch (error) {
      console.error('Join room error:', error);
      this.socketServer.emitError(socket.id, ErrorCode.INTERNAL_ERROR, 'Failed to join room');
    }
  }

  /**
   * Handle room:leave event
   */
  async handleLeaveRoom(socket: Socket, data: any): Promise<void> {
    try {
      const { roomCode } = data;

      const room = await RoomManager.getRoom(roomCode);
      if (!room) return;

      // Anti-cheat: Remove connection tracking
      const { AntiCheatService } = await import('../../services/anti-cheat.service.js');
      await AntiCheatService.removeConnection(roomCode, socket.id);

      await RoomManager.removePlayer(room, socket.id);
      await this.socketServer.leaveRoom(socket, roomCode);

      // Broadcast player left
      this.socketServer.emitToRoom(roomCode, 'room:player-left', {
        socketId: socket.id,
      });

      // Check if room should start destruction countdown
      if (RoomManager.shouldStartCountdown(room)) {
        await RoomManager.startDestructionCountdown(roomCode);
        this.socketServer.emitToRoom(roomCode, 'room:countdown-started', {
          seconds: 60,
        });
      }
    } catch (error) {
      console.error('Leave room error:', error);
    }
  }

  /**
   * Handle room:kick event
   */
  async handleKickPlayer(socket: Socket, data: any): Promise<void> {
    try {
      const { roomCode, targetSocketId } = data;

      const room = await RoomManager.getRoom(roomCode);
      if (!room) {
        this.socketServer.emitError(socket.id, ErrorCode.ROOM_NOT_FOUND, 'Room not found');
        return;
      }

      const result = await RoomManager.kickPlayer(room, socket.id, targetSocketId);
      if (!result.success) {
        this.socketServer.emitError(socket.id, ErrorCode.UNAUTHORIZED, result.reason || 'Cannot kick player');
        return;
      }

      // Disconnect kicked player
      this.socketServer.disconnectSocket(targetSocketId);

      // Broadcast kick event
      this.socketServer.emitToRoom(roomCode, 'room:player-kicked', {
        socketId: targetSocketId,
      });
    } catch (error) {
      console.error('Kick player error:', error);
      this.socketServer.emitError(socket.id, ErrorCode.INTERNAL_ERROR, 'Failed to kick player');
    }
  }

  /**
   * Handle room:vote-kick event
   */
  async handleVoteKick(socket: Socket, data: any): Promise<void> {
    try {
      const { roomCode, targetSocketId } = data;

      const room = await RoomManager.getRoom(roomCode);
      if (!room) {
        this.socketServer.emitError(socket.id, ErrorCode.ROOM_NOT_FOUND, 'Room not found');
        return;
      }

      // Check if there's an active vote
      const existingVote = await RoomManager.getKickVote(roomCode);
      
      if (!existingVote) {
        // Start new vote
        const result = await RoomManager.startKickVote(room, socket.id, targetSocketId);
        if (!result.success) {
          this.socketServer.emitError(socket.id, ErrorCode.INVALID_INPUT, result.reason || 'Cannot start vote');
          return;
        }

        // Broadcast vote started
        this.socketServer.emitToRoom(roomCode, 'room:kick-vote-started', {
          targetSocketId,
          initiatorSocketId: socket.id,
          votesNeeded: Math.floor(room.players.size / 2) + 1,
        });
      } else {
        // Add vote to existing
        const result = await RoomManager.addKickVote(room, socket.id);
        if (!result.success) {
          this.socketServer.emitError(socket.id, ErrorCode.INVALID_INPUT, result.reason || 'Cannot vote');
          return;
        }

        if (result.kicked) {
          // Vote passed - kick player
          this.socketServer.disconnectSocket(existingVote.targetSocketId);
          this.socketServer.emitToRoom(roomCode, 'room:player-kicked', {
            socketId: existingVote.targetSocketId,
            reason: 'Voted out',
          });
        } else {
          // Broadcast vote update
          const updatedVote = await RoomManager.getKickVote(roomCode);
          this.socketServer.emitToRoom(roomCode, 'room:kick-vote-updated', {
            votes: updatedVote?.votes.length || 0,
            votesNeeded: Math.floor(room.players.size / 2) + 1,
          });
        }
      }
    } catch (error) {
      console.error('Vote kick error:', error);
      this.socketServer.emitError(socket.id, ErrorCode.INTERNAL_ERROR, 'Failed to process vote');
    }
  }

  /**
   * Serialize room for transmission
   */
  private serializeRoom(room: any) {
    return {
      code: room.code,
      hostSocketId: room.hostSocketId,
      players: Array.from(room.players.values()),
      spectators: Array.from(room.spectators),
      settings: room.settings,
      state: room.state,
      gameState: room.gameState ? {
        ...room.gameState,
        correctGuessers: Array.from(room.gameState.correctGuessers),
        usedWords: Array.from(room.gameState.usedWords),
        scores: Object.fromEntries(room.gameState.scores),
      } : null,
    };
  }

  /**
   * Serialize player for transmission
   */
  private serializePlayer(player: Player) {
    return {
      socketId: player.socketId,
      userId: player.userId,
      username: player.username,
      avatar: player.avatar,
      score: player.score,
      isHost: player.isHost,
      isConnected: player.isConnected,
    };
  }
}
