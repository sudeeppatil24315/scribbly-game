import { Stroke, StrokeStart, Point, FillAction, CanvasState } from '@scribbly/shared';
import redis from '../config/redis.js';
import { RoomManager } from './room-manager.js';

export class CanvasSync {
  private static readonly CANVAS_TTL = 3600; // 1 hour
  private static readonly MAX_CANVAS_WIDTH = 800;
  private static readonly MAX_CANVAS_HEIGHT = 600;

  /**
   * Start a new stroke
   */
  static async startStroke(
    roomCode: string,
    strokeStart: StrokeStart
  ): Promise<{ success: boolean; reason?: string }> {
    // Validate coordinates
    const clamped = this.clampCoordinates(strokeStart.x, strokeStart.y);
    strokeStart.x = clamped.x;
    strokeStart.y = clamped.y;

    // Store stroke start in Redis (temporary)
    const strokeKey = `stroke:${roomCode}:${strokeStart.socketId}`;
    await redis.setex(strokeKey, 300, JSON.stringify(strokeStart)); // 5 minutes

    return { success: true };
  }

  /**
   * Add point to active stroke
   */
  static async addStrokePoint(
    roomCode: string,
    socketId: string,
    point: Point
  ): Promise<{ success: boolean; point?: Point; reason?: string }> {
    // Validate and clamp coordinates
    const clamped = this.clampCoordinates(point.x, point.y);

    return { success: true, point: clamped };
  }

  /**
   * End a stroke and add to canvas history
   */
  static async endStroke(
    roomCode: string,
    socketId: string,
    points: Point[]
  ): Promise<{ success: boolean; strokeId?: string; reason?: string }> {
    // Get stroke start data
    const strokeKey = `stroke:${roomCode}:${socketId}`;
    const strokeStartData = await redis.get(strokeKey);

    if (!strokeStartData) {
      return { success: false, reason: 'Stroke start not found' };
    }

    const strokeStart: StrokeStart = JSON.parse(strokeStartData);

    // Create complete stroke
    const stroke: Stroke = {
      id: `${socketId}-${Date.now()}`,
      socketId,
      points: points.map(p => this.clampCoordinates(p.x, p.y)),
      color: strokeStart.color,
      size: strokeStart.size,
      tool: strokeStart.tool,
      startTime: strokeStart.timestamp,
      endTime: Date.now(),
    };

    // Add to canvas history
    await this.addToHistory(roomCode, 'stroke', stroke);

    // Clean up stroke start
    await redis.del(strokeKey);

    return { success: true, strokeId: stroke.id };
  }

  /**
   * Add fill action to canvas
   */
  static async addFill(
    roomCode: string,
    fill: FillAction
  ): Promise<{ success: boolean; reason?: string }> {
    // Validate and clamp coordinates
    const clamped = this.clampCoordinates(fill.x, fill.y);
    fill.x = clamped.x;
    fill.y = clamped.y;

    // Add to canvas history
    await this.addToHistory(roomCode, 'fill', fill);

    return { success: true };
  }

  /**
   * Undo last action
   */
  static async undo(roomCode: string): Promise<{ success: boolean; reason?: string }> {
    const canvasState = await this.getCanvasState(roomCode);
    if (!canvasState) {
      return { success: false, reason: 'No canvas state found' };
    }

    // Remove last stroke or fill
    if (canvasState.strokes.length > 0) {
      canvasState.strokes.pop();
    } else if (canvasState.fills.length > 0) {
      canvasState.fills.pop();
    } else {
      return { success: false, reason: 'Nothing to undo' };
    }

    canvasState.version++;
    await this.saveCanvasState(roomCode, canvasState);

    return { success: true };
  }

  /**
   * Clear canvas
   */
  static async clear(roomCode: string): Promise<{ success: boolean }> {
    const canvasState: CanvasState = {
      strokes: [],
      fills: [],
      version: 0,
    };

    await this.saveCanvasState(roomCode, canvasState);

    return { success: true };
  }

  /**
   * Get canvas state for replay
   */
  static async getCanvasState(roomCode: string): Promise<CanvasState | null> {
    const canvasKey = `canvas:${roomCode}`;
    const data = await redis.get(canvasKey);

    if (!data) {
      return {
        strokes: [],
        fills: [],
        version: 0,
      };
    }

    return JSON.parse(data);
  }

  /**
   * Save canvas state
   */
  private static async saveCanvasState(roomCode: string, state: CanvasState): Promise<void> {
    const canvasKey = `canvas:${roomCode}`;
    await redis.setex(canvasKey, this.CANVAS_TTL, JSON.stringify(state));
  }

  /**
   * Add action to canvas history
   */
  private static async addToHistory(
    roomCode: string,
    type: 'stroke' | 'fill',
    action: Stroke | FillAction
  ): Promise<void> {
    const canvasState = await this.getCanvasState(roomCode);
    if (!canvasState) return;

    if (type === 'stroke') {
      canvasState.strokes.push(action as Stroke);
    } else {
      canvasState.fills.push(action as FillAction);
    }

    canvasState.version++;
    await this.saveCanvasState(roomCode, canvasState);
  }

  /**
   * Clamp coordinates to canvas bounds
   */
  static clampCoordinates(x: number, y: number): Point {
    return {
      x: Math.max(0, Math.min(this.MAX_CANVAS_WIDTH, x)),
      y: Math.max(0, Math.min(this.MAX_CANVAS_HEIGHT, y)),
    };
  }

  /**
   * Validate coordinates are within bounds
   */
  static validateCoordinates(x: number, y: number): boolean {
    return (
      x >= 0 &&
      x <= this.MAX_CANVAS_WIDTH &&
      y >= 0 &&
      y <= this.MAX_CANVAS_HEIGHT
    );
  }

  /**
   * Check for suspicious drawing patterns
   */
  static isSuspiciousPattern(points: Point[]): boolean {
    if (points.length < 2) return false;

    // Check for impossibly fast drawing (teleportation)
    for (let i = 1; i < points.length; i++) {
      const dx = points[i].x - points[i - 1].x;
      const dy = points[i].y - points[i - 1].y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // If distance is more than half the canvas width in one move, suspicious
      if (distance > this.MAX_CANVAS_WIDTH / 2) {
        return true;
      }
    }

    return false;
  }

  /**
   * Clear canvas history for a room
   */
  static async clearHistory(roomCode: string): Promise<void> {
    const canvasKey = `canvas:${roomCode}`;
    await redis.del(canvasKey);
  }
}
