import { Server as HTTPServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { ErrorCode } from '@scribbly/shared';

interface SocketData {
  userId: string | null;
  username: string;
}

export class SocketServer {
  private io: Server;

  constructor(httpServer: HTTPServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: env.CORS_ORIGIN,
        credentials: true,
      },
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    this.setupMiddleware();
  }

  /**
   * Setup authentication middleware
   */
  private setupMiddleware(): void {
    this.io.use(async (socket: Socket, next) => {
      try {
        const token = socket.handshake.auth.token;

        if (token) {
          // Authenticated user
          try {
            const decoded = jwt.verify(token, env.JWT_SECRET) as any;
            (socket.data as SocketData).userId = decoded.userId;
            (socket.data as SocketData).username = decoded.username;
          } catch (error) {
            // Invalid token - treat as guest
            const guestUsername = socket.handshake.auth.username || 'Guest';
            (socket.data as SocketData).userId = null;
            (socket.data as SocketData).username = guestUsername;
          }
        } else {
          // Guest user
          const guestUsername = socket.handshake.auth.username || 'Guest';
          (socket.data as SocketData).userId = null;
          (socket.data as SocketData).username = guestUsername;
        }

        next();
      } catch (error) {
        next(new Error('Authentication failed'));
      }
    });
  }

  /**
   * Get Socket.io server instance
   */
  getIO(): Server {
    return this.io;
  }

  /**
   * Emit to specific socket
   */
  emitToSocket(socketId: string, event: string, data: any): void {
    this.io.to(socketId).emit(event, data);
  }

  /**
   * Emit to room
   */
  emitToRoom(roomCode: string, event: string, data: any): void {
    this.io.to(roomCode).emit(event, data);
  }

  /**
   * Emit to room except sender
   */
  emitToRoomExcept(roomCode: string, senderSocketId: string, event: string, data: any): void {
    this.io.to(roomCode).except(senderSocketId).emit(event, data);
  }

  /**
   * Join socket to room
   */
  async joinRoom(socket: Socket, roomCode: string): Promise<void> {
    await socket.join(roomCode);
  }

  /**
   * Leave socket from room
   */
  async leaveRoom(socket: Socket, roomCode: string): Promise<void> {
    await socket.leave(roomCode);
  }

  /**
   * Get socket by ID
   */
  getSocket(socketId: string): Socket | undefined {
    return this.io.sockets.sockets.get(socketId);
  }

  /**
   * Disconnect socket
   */
  disconnectSocket(socketId: string): void {
    const socket = this.getSocket(socketId);
    if (socket) {
      socket.disconnect(true);
    }
  }

  /**
   * Emit error to socket
   */
  emitError(socketId: string, code: ErrorCode, message: string): void {
    this.emitToSocket(socketId, 'error', {
      code,
      message,
      timestamp: new Date().toISOString(),
    });
  }
}
