import { Socket } from 'socket.io';
import { GameEngine } from '../../game/game-engine.js';
import { BlitzEngine } from '../../game/blitz-engine.js';
import { RoomManager } from '../../game/room-manager.js';
import { SocketServer } from '../socket-server.js';
import { ErrorCode } from '@scribbly/shared';

export class GameHandler {
  constructor(private socketServer: SocketServer) {}

  /**
   * Handle game:start event
   */
  async handleStartGame(socket: Socket, data: any): Promise<void> {
    try {
      const { roomCode, mode } = data;

      const room = await RoomManager.getRoom(roomCode);
      if (!room) {
        this.socketServer.emitError(socket.id, ErrorCode.ROOM_NOT_FOUND, 'Room not found');
        return;
      }

      // Verify requester is host
      if (room.hostSocketId !== socket.id) {
        this.socketServer.emitError(socket.id, ErrorCode.UNAUTHORIZED, 'Only host can start game');
        return;
      }

      if (mode === 'blitz') {
        // Start Blitz Mode
        const result = await BlitzEngine.startBlitzGame(room);
        if (!result.success) {
          this.socketServer.emitError(socket.id, ErrorCode.GAME_NOT_STARTED, result.reason || 'Failed to start game');
          return;
        }

        // Broadcast game started
        this.socketServer.emitToRoom(roomCode, 'game:started', {
          mode: 'blitz',
          word: result.word,
        });
      } else {
        // Start Classic Mode
        const result = await GameEngine.startGame(room);
        if (!result.success) {
          this.socketServer.emitError(socket.id, ErrorCode.GAME_NOT_STARTED, result.reason || 'Failed to start game');
          return;
        }

        // Start first round
        await GameEngine.startRound(room, (drawerSocketId, round) => {
          this.socketServer.emitToRoom(roomCode, 'game:round-started', {
            round,
            drawerSocketId,
          });
        });

        // Present word choices to drawer
        const wordResult = await GameEngine.presentWordChoices(room);
        if (wordResult.success && wordResult.words) {
          this.socketServer.emitToSocket(room.gameState!.drawerSocketId!, 'game:word-choices', {
            words: wordResult.words,
          });
        }
      }
    } catch (error) {
      console.error('Start game error:', error);
      this.socketServer.emitError(socket.id, ErrorCode.INTERNAL_ERROR, 'Failed to start game');
    }
  }

  /**
   * Handle game:word-pick event
   */
  async handleWordPick(socket: Socket, data: any): Promise<void> {
    try {
      const { roomCode, wordIndex } = data;

      const room = await RoomManager.getRoom(roomCode);
      if (!room) {
        this.socketServer.emitError(socket.id, ErrorCode.ROOM_NOT_FOUND, 'Room not found');
        return;
      }

      const result = await GameEngine.selectWord(room, socket.id, wordIndex);
      if (!result.success) {
        this.socketServer.emitError(socket.id, ErrorCode.INVALID_WORD_CHOICE, result.reason || 'Invalid word choice');
        return;
      }

      // Broadcast round started with hint
      this.socketServer.emitToRoom(roomCode, 'game:round-active', {
        hint: room.gameState!.hint,
        drawTime: room.settings.drawTime,
      });
    } catch (error) {
      console.error('Word pick error:', error);
      this.socketServer.emitError(socket.id, ErrorCode.INTERNAL_ERROR, 'Failed to pick word');
    }
  }

  /**
   * Handle game:guess event
   */
  async handleGuess(socket: Socket, data: any): Promise<void> {
    try {
      const { roomCode, guess } = data;

      const room = await RoomManager.getRoom(roomCode);
      if (!room) {
        this.socketServer.emitError(socket.id, ErrorCode.ROOM_NOT_FOUND, 'Room not found');
        return;
      }

      const player = room.players.get(socket.id);
      if (!player) {
        this.socketServer.emitError(socket.id, ErrorCode.UNAUTHORIZED, 'Player not in room');
        return;
      }

      // Anti-cheat: Check guess rate limit (5 per second per player)
      const { AntiCheatService } = await import('../../services/anti-cheat.service.js');
      const rateCheck = await AntiCheatService.checkGuessRateLimit(roomCode, socket.id);
      if (!rateCheck.allowed) {
        this.socketServer.emitError(socket.id, ErrorCode.RATE_LIMIT_EXCEEDED, 'Too many guesses, slow down');
        
        // Log suspicious rapid guessing
        await AntiCheatService.logSuspiciousActivity({
          socketId: socket.id,
          userId: player.userId,
          username: player.username,
          roomCode,
          activityType: 'rapid_guessing',
          details: {
            message: 'Exceeded guess rate limit (5 per second)',
          },
          timestamp: new Date(),
        });
        return;
      }

      // Anti-cheat: Prevent guesses before round officially starts
      if (!AntiCheatService.hasRoundStarted(room.gameState?.roundStartTime || null)) {
        this.socketServer.emitError(socket.id, ErrorCode.GAME_NOT_STARTED, 'Round has not started yet');
        
        // Log suspicious pre-round guess
        await AntiCheatService.logSuspiciousActivity({
          socketId: socket.id,
          userId: player.userId,
          username: player.username,
          roomCode,
          activityType: 'pre_round_guess',
          details: {
            guess,
            message: 'Attempted to guess before round started',
          },
          timestamp: new Date(),
        });
        return;
      }

      // Validate guess
      const validation = GameEngine.validateGuess(guess);
      if (!validation.valid) {
        this.socketServer.emitError(socket.id, ErrorCode.INVALID_INPUT, validation.reason || 'Invalid guess');
        return;
      }

      // Process guess
      const result = await GameEngine.processGuess(room, socket.id, guess);

      if (result.isDrawer) {
        this.socketServer.emitError(socket.id, ErrorCode.NOT_YOUR_TURN, 'Drawer cannot guess');
        return;
      }

      if (result.alreadyGuessed) {
        this.socketServer.emitError(socket.id, ErrorCode.ALREADY_GUESSED, 'Already guessed correctly');
        return;
      }

      if (result.correct) {
        // Anti-cheat: Detect suspiciously fast correct guesses (within 1 second)
        if (AntiCheatService.isFastGuess(room.gameState?.roundStartTime || null)) {
          await AntiCheatService.logSuspiciousActivity({
            socketId: socket.id,
            userId: player.userId,
            username: player.username,
            roomCode,
            activityType: 'fast_guess',
            details: {
              guess,
              elapsedMs: Date.now() - (room.gameState?.roundStartTime?.getTime() || 0),
              message: 'Correct guess within 1 second of round start',
            },
            timestamp: new Date(),
          });
        }

        // Broadcast correct guess (without revealing word)
        this.socketServer.emitToRoom(roomCode, 'game:correct-guess', {
          socketId: socket.id,
          score: result.score,
        });

        // Send score update to guesser
        socket.emit('game:score-update', {
          score: result.score,
        });

        // Check if round should end
        if (GameEngine.shouldEndRound(room)) {
          await this.endRound(roomCode, room);
        }
      } else {
        // Broadcast incorrect guess to all players
        this.socketServer.emitToRoom(roomCode, 'game:incorrect-guess', {
          socketId: socket.id,
          guess,
        });
      }
    } catch (error) {
      console.error('Guess error:', error);
      this.socketServer.emitError(socket.id, ErrorCode.INTERNAL_ERROR, 'Failed to process guess');
    }
  }

  /**
   * Handle game:blitz-submit event
   */
  async handleBlitzSubmit(socket: Socket, data: any): Promise<void> {
    try {
      const { roomCode, canvasState } = data;

      const result = await BlitzEngine.submitDrawing(roomCode, socket.id, canvasState);

      if (result.success) {
        socket.emit('game:blitz-submitted', {
          success: true,
        });
      } else {
        this.socketServer.emitError(socket.id, ErrorCode.INVALID_INPUT, result.reason || 'Failed to submit drawing');
      }
    } catch (error) {
      console.error('Blitz submit error:', error);
      this.socketServer.emitError(socket.id, ErrorCode.INTERNAL_ERROR, 'Failed to submit drawing');
    }
  }

  /**
   * Handle game:blitz-vote event
   */
  async handleBlitzVote(socket: Socket, data: any): Promise<void> {
    try {
      const { roomCode, targetSocketId } = data;

      const result = await BlitzEngine.submitVote(roomCode, socket.id, targetSocketId);

      if (result.success) {
        // Broadcast vote update
        this.socketServer.emitToRoom(roomCode, 'game:blitz-vote-updated', {
          voterSocketId: socket.id,
          targetSocketId,
        });
      } else {
        this.socketServer.emitError(socket.id, ErrorCode.INVALID_INPUT, result.reason || 'Failed to submit vote');
      }
    } catch (error) {
      console.error('Blitz vote error:', error);
      this.socketServer.emitError(socket.id, ErrorCode.INTERNAL_ERROR, 'Failed to submit vote');
    }
  }

  /**
   * End round helper
   */
  private async endRound(roomCode: string, room: any): Promise<void> {
    const word = room.gameState.currentWord;
    const scores = room.gameState.scores;

    // Broadcast round end
    this.socketServer.emitToRoom(roomCode, 'game:round-end', {
      word,
      scores: Object.fromEntries(scores),
    });

    // End round
    await GameEngine.endRound(room, () => {
      // Round ended callback
    });

    // Check if game is complete
    if (GameEngine.isGameComplete(room)) {
      await this.endGame(roomCode, room);
    } else {
      // Start next round after delay
      setTimeout(async () => {
        await GameEngine.startRound(room, (drawerSocketId, round) => {
          this.socketServer.emitToRoom(roomCode, 'game:round-started', {
            round,
            drawerSocketId,
          });
        });

        // Present word choices
        const wordResult = await GameEngine.presentWordChoices(room);
        if (wordResult.success && wordResult.words) {
          this.socketServer.emitToSocket(room.gameState!.drawerSocketId!, 'game:word-choices', {
            words: wordResult.words,
          });
        }
      }, 5000); // 5 second delay between rounds
    }
  }

  /**
   * End game helper
   */
  private async endGame(roomCode: string, room: any): Promise<void> {
    const result = await GameEngine.endGame(room);

    if (result.success) {
      // Broadcast game end
      this.socketServer.emitToRoom(roomCode, 'game:end', {
        results: result.results,
      });
    }
  }
}
