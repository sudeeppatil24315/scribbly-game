import { Server as HTTPServer } from 'http';
import { SocketServer } from './socket-server.js';
import { RoomHandler } from './handlers/room.handler.js';
import { DrawingHandler } from './handlers/drawing.handler.js';
import { GameHandler } from './handlers/game.handler.js';
import { globalSocketRateLimiter, guessRateLimiter, drawingRateLimiter } from './rate-limiter.js';

export function initializeSocketServer(httpServer: HTTPServer): SocketServer {
  const socketServer = new SocketServer(httpServer);
  const io = socketServer.getIO();

  // Initialize handlers
  const roomHandler = new RoomHandler(socketServer);
  const drawingHandler = new DrawingHandler(socketServer);
  const gameHandler = new GameHandler(socketServer);

  // Setup event listeners
  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Room events
    socket.on('room:create', (data) => roomHandler.handleCreateRoom(socket, data));
    socket.on('room:join', (data) => roomHandler.handleJoinRoom(socket, data));
    socket.on('room:leave', (data) => roomHandler.handleLeaveRoom(socket, data));
    socket.on('room:kick', (data) => roomHandler.handleKickPlayer(socket, data));
    socket.on('room:vote-kick', (data) => roomHandler.handleVoteKick(socket, data));

    // Drawing events with rate limiting
    socket.on('draw:stroke-start', (data) => {
      if (!drawingRateLimiter.check(socket.id)) {
        socketServer.emitError(socket.id, 'RATE_LIMIT_EXCEEDED' as any, 'Drawing too fast');
        return;
      }
      drawingHandler.handleStrokeStart(socket, data);
    });

    socket.on('draw:stroke-move', (data) => {
      if (!drawingRateLimiter.check(socket.id)) {
        return; // Silently drop excessive move events
      }
      drawingHandler.handleStrokeMove(socket, data);
    });

    socket.on('draw:stroke-end', (data) => drawingHandler.handleStrokeEnd(socket, data));
    socket.on('draw:fill', (data) => drawingHandler.handleFill(socket, data));
    socket.on('draw:undo', (data) => drawingHandler.handleUndo(socket, data));
    socket.on('draw:clear', (data) => drawingHandler.handleClear(socket, data));

    // Game events
    socket.on('game:start', (data) => gameHandler.handleStartGame(socket, data));
    socket.on('game:word-pick', (data) => gameHandler.handleWordPick(socket, data));
    
    socket.on('game:guess', (data) => {
      if (!guessRateLimiter.check(socket.id)) {
        socketServer.emitError(socket.id, 'RATE_LIMIT_EXCEEDED' as any, 'Guessing too fast');
        return;
      }
      gameHandler.handleGuess(socket, data);
    });

    socket.on('game:blitz-submit', (data) => gameHandler.handleBlitzSubmit(socket, data));
    socket.on('game:blitz-vote', (data) => gameHandler.handleBlitzVote(socket, data));

    // Disconnection handling
    socket.on('disconnect', async () => {
      console.log(`Socket disconnected: ${socket.id}`);
      
      // Clean up anti-cheat connection tracking
      try {
        const { AntiCheatService } = await import('../services/anti-cheat.service.js');
        const { RoomManager } = await import('../game/room-manager.js');
        
        // Find which room this socket was in (if any)
        // Note: In production, we'd track socket-to-room mapping in Redis
        // For now, we'll clean up on room leave events
        
        // Reset rate limiters for this socket
        globalSocketRateLimiter.reset(socket.id);
        guessRateLimiter.reset(socket.id);
        drawingRateLimiter.reset(socket.id);
      } catch (error) {
        console.error('Disconnect cleanup error:', error);
      }
      
      // Disconnection logic will be handled by reconnection manager
    });
  });

  return socketServer;
}
