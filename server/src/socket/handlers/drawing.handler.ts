import { Socket } from 'socket.io';
import { CanvasSync } from '../../game/canvas-sync.js';
import { RoomManager } from '../../game/room-manager.js';
import { SocketServer } from '../socket-server.js';
import { ErrorCode, StrokeStart, Point, FillAction } from '@scribbly/shared';

export class DrawingHandler {
  constructor(private socketServer: SocketServer) {}

  /**
   * Handle draw:stroke-start event
   */
  async handleStrokeStart(socket: Socket, data: any): Promise<void> {
    try {
      const { roomCode, x, y, color, size, tool } = data;

      const room = await RoomManager.getRoom(roomCode);
      if (!room) {
        this.socketServer.emitError(socket.id, ErrorCode.ROOM_NOT_FOUND, 'Room not found');
        return;
      }

      // Verify player is drawer (or in Blitz mode)
      if (room.gameState?.mode === 'classic' && room.gameState.drawerSocketId !== socket.id) {
        this.socketServer.emitError(socket.id, ErrorCode.NOT_YOUR_TURN, 'Not your turn to draw');
        return;
      }

      // Anti-cheat: Validate coordinates and detect anomalies
      const { AntiCheatService } = await import('../../services/anti-cheat.service.js');
      const validation = AntiCheatService.validateDrawingCoordinates(x, y);
      
      if (validation.isAnomalous) {
        const player = room.players.get(socket.id);
        await AntiCheatService.logSuspiciousActivity({
          socketId: socket.id,
          userId: player?.userId || null,
          username: player?.username || 'Unknown',
          roomCode,
          activityType: 'coordinate_anomaly',
          details: {
            x,
            y,
            message: 'Drawing coordinates significantly out of bounds',
          },
          timestamp: new Date(),
        });
      }

      const strokeStart: StrokeStart = {
        socketId: socket.id,
        x,
        y,
        color,
        size,
        tool,
        timestamp: Date.now(),
      };

      await CanvasSync.startStroke(roomCode, strokeStart);

      // Broadcast to room
      this.socketServer.emitToRoom(roomCode, 'draw:stroke-start', strokeStart);
    } catch (error) {
      console.error('Stroke start error:', error);
    }
  }

  /**
   * Handle draw:stroke-move event
   */
  async handleStrokeMove(socket: Socket, data: any): Promise<void> {
    try {
      const { roomCode, x, y } = data;

      const point: Point = { x, y };
      const result = await CanvasSync.addStrokePoint(roomCode, socket.id, point);

      if (result.success && result.point) {
        // Broadcast to room
        this.socketServer.emitToRoom(roomCode, 'draw:stroke-move', {
          socketId: socket.id,
          ...result.point,
        });
      }
    } catch (error) {
      console.error('Stroke move error:', error);
    }
  }

  /**
   * Handle draw:stroke-end event
   */
  async handleStrokeEnd(socket: Socket, data: any): Promise<void> {
    try {
      const { roomCode, points } = data;

      const result = await CanvasSync.endStroke(roomCode, socket.id, points);

      if (result.success) {
        // Broadcast to room
        this.socketServer.emitToRoom(roomCode, 'draw:stroke-end', {
          socketId: socket.id,
          strokeId: result.strokeId,
        });
      }
    } catch (error) {
      console.error('Stroke end error:', error);
    }
  }

  /**
   * Handle draw:fill event
   */
  async handleFill(socket: Socket, data: any): Promise<void> {
    try {
      const { roomCode, x, y, color } = data;

      const room = await RoomManager.getRoom(roomCode);
      if (!room) {
        this.socketServer.emitError(socket.id, ErrorCode.ROOM_NOT_FOUND, 'Room not found');
        return;
      }

      // Verify player is drawer (or in Blitz mode)
      if (room.gameState?.mode === 'classic' && room.gameState.drawerSocketId !== socket.id) {
        this.socketServer.emitError(socket.id, ErrorCode.NOT_YOUR_TURN, 'Not your turn to draw');
        return;
      }

      // Anti-cheat: Validate coordinates and detect anomalies
      const { AntiCheatService } = await import('../../services/anti-cheat.service.js');
      const validation = AntiCheatService.validateDrawingCoordinates(x, y);
      
      if (validation.isAnomalous) {
        const player = room.players.get(socket.id);
        await AntiCheatService.logSuspiciousActivity({
          socketId: socket.id,
          userId: player?.userId || null,
          username: player?.username || 'Unknown',
          roomCode,
          activityType: 'coordinate_anomaly',
          details: {
            x,
            y,
            message: 'Fill coordinates significantly out of bounds',
          },
          timestamp: new Date(),
        });
      }

      const fillAction: FillAction = {
        socketId: socket.id,
        x,
        y,
        color,
        timestamp: Date.now(),
      };

      await CanvasSync.addFill(roomCode, fillAction);

      // Broadcast to room
      this.socketServer.emitToRoom(roomCode, 'draw:fill', fillAction);
    } catch (error) {
      console.error('Fill error:', error);
    }
  }

  /**
   * Handle draw:undo event
   */
  async handleUndo(socket: Socket, data: any): Promise<void> {
    try {
      const { roomCode } = data;

      const room = await RoomManager.getRoom(roomCode);
      if (!room) {
        this.socketServer.emitError(socket.id, ErrorCode.ROOM_NOT_FOUND, 'Room not found');
        return;
      }

      // Verify player is drawer (or in Blitz mode)
      if (room.gameState?.mode === 'classic' && room.gameState.drawerSocketId !== socket.id) {
        this.socketServer.emitError(socket.id, ErrorCode.NOT_YOUR_TURN, 'Not your turn to draw');
        return;
      }

      const result = await CanvasSync.undo(roomCode);

      if (result.success) {
        // Broadcast to room
        this.socketServer.emitToRoom(roomCode, 'draw:undo', {
          socketId: socket.id,
        });
      }
    } catch (error) {
      console.error('Undo error:', error);
    }
  }

  /**
   * Handle draw:clear event
   */
  async handleClear(socket: Socket, data: any): Promise<void> {
    try {
      const { roomCode } = data;

      const room = await RoomManager.getRoom(roomCode);
      if (!room) {
        this.socketServer.emitError(socket.id, ErrorCode.ROOM_NOT_FOUND, 'Room not found');
        return;
      }

      // Verify player is drawer (or in Blitz mode)
      if (room.gameState?.mode === 'classic' && room.gameState.drawerSocketId !== socket.id) {
        this.socketServer.emitError(socket.id, ErrorCode.NOT_YOUR_TURN, 'Not your turn to draw');
        return;
      }

      await CanvasSync.clear(roomCode);

      // Broadcast to room
      this.socketServer.emitToRoom(roomCode, 'draw:clear', {
        socketId: socket.id,
      });
    } catch (error) {
      console.error('Clear error:', error);
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
    };
  }

  /**
   * Serialize player for transmission
   */
  private serializePlayer(player: any) {
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
