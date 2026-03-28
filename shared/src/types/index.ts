// Core game types shared between frontend and backend

export interface Player {
  socketId: string;
  userId: string | null;
  username: string;
  avatar: string;
  score: number;
  isHost: boolean;
  isConnected: boolean;
  joinedAt: Date;
}

export interface RoomSettings {
  maxPlayers: number; // 2-12
  rounds: number; // 1-10
  drawTime: number; // 30, 60, 80, or 120 seconds
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
  wordPackIds: string[];
  familySafeMode: boolean;
  allowSpectators: boolean;
  isPublic: boolean;
}

export interface Room {
  code: string;
  hostSocketId: string;
  players: Map<string, Player>;
  spectators: Set<string>;
  settings: RoomSettings;
  state: 'lobby' | 'in-game' | 'ending';
  gameState: GameState | null;
  createdAt: Date;
  lastActivityAt: Date;
}

export interface GameState {
  mode: 'classic' | 'blitz';
  currentRound: number;
  totalRounds: number;
  drawerSocketId: string | null;
  currentWord: string | null;
  wordChoices: string[] | null;
  roundStartTime: Date | null;
  roundEndTime: Date | null;
  hint: string;
  correctGuessers: Set<string>;
  usedWords: Set<string>;
  scores: Map<string, number>;
  guessOrder: string[];
}

export interface GuessResult {
  correct: boolean;
  score: number;
  timeBonus: number;
  firstGuessBonus: number;
  drawerBonus: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface StrokeStart {
  socketId: string;
  x: number;
  y: number;
  color: string;
  size: number;
  tool: 'brush' | 'eraser';
  timestamp: number;
}

export interface Stroke {
  id: string;
  socketId: string;
  points: Point[];
  color: string;
  size: number;
  tool: 'brush' | 'eraser';
  startTime: number;
  endTime: number;
}

export interface FillAction {
  socketId: string;
  x: number;
  y: number;
  color: string;
  timestamp: number;
}

export interface CanvasState {
  strokes: Stroke[];
  fills: FillAction[];
  version: number;
}

export interface WordPack {
  id: string;
  name: string;
  description: string;
  category: string;
  language: string;
  difficulty: string;
  words: Word[];
  isPublic: boolean;
  isCurated: boolean;
  creatorId: string | null;
}

export interface Word {
  id: string;
  packId: string;
  word: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface GuessScore {
  baseScore: number;
  timeBonus: number;
  firstGuessBonus: number;
  totalScore: number;
}

export interface XPBreakdown {
  correctGuesses: number;
  firstGuesses: number;
  roundsWon: number;
  gameWon: number;
  dailyBonus: number;
  totalXP: number;
}

export interface GameResult {
  sessionId: string;
  mode: 'classic' | 'blitz';
  players: PlayerResult[];
  rounds: number;
  startedAt: Date;
  endedAt: Date;
}

export interface PlayerResult {
  userId: string | null;
  username: string;
  finalScore: number;
  rank: number;
  correctGuesses: number;
  firstGuesses: number;
  roundsWon: number;
  totalGuessTime: number;
}

export interface BlitzState {
  currentWord: string;
  drawingPhaseEndTime: Date;
  votingPhaseEndTime: Date;
  drawings: Map<string, CanvasState>;
  votes: Map<string, string>; // voterSocketId -> targetSocketId
  voteCount: Map<string, number>; // targetSocketId -> count
}

export enum ErrorCode {
  // Room errors
  ROOM_NOT_FOUND = 'ROOM_NOT_FOUND',
  ROOM_FULL = 'ROOM_FULL',
  ROOM_IN_GAME = 'ROOM_IN_GAME',
  INVALID_ROOM_CODE = 'INVALID_ROOM_CODE',

  // Auth errors
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  UNAUTHORIZED = 'UNAUTHORIZED',
  USERNAME_TAKEN = 'USERNAME_TAKEN',
  INVALID_USERNAME = 'INVALID_USERNAME',

  // Game errors
  NOT_YOUR_TURN = 'NOT_YOUR_TURN',
  INVALID_WORD_CHOICE = 'INVALID_WORD_CHOICE',
  ALREADY_GUESSED = 'ALREADY_GUESSED',
  GAME_NOT_STARTED = 'GAME_NOT_STARTED',

  // Validation errors
  INVALID_INPUT = 'INVALID_INPUT',
  PROFANITY_DETECTED = 'PROFANITY_DETECTED',

  // Rate limiting
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',

  // System errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
    timestamp: string;
  };
}

export interface SocketError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

export type ReportReason = 'harassment' | 'offensive_content' | 'cheating' | 'other';

export interface Report {
  id: string;
  reporterId: string | null;
  reportedId: string;
  reason: ReportReason;
  details?: string;
  roomId?: string;
  resolved: boolean;
  createdAt: Date;
}

export interface CreateReportRequest {
  reportedId: string;
  reason: ReportReason;
  details?: string;
  roomId?: string;
}

export interface ReportResponse {
  report: {
    id: string;
    reporter: {
      id: string;
      username: string;
    } | null;
    reported: {
      id: string;
      username: string;
    };
    reason: string;
    details?: string;
    roomId?: string;
    resolved: boolean;
    createdAt: Date;
  };
}

export interface ReportsListResponse {
  reports: Array<{
    id: string;
    reporter: {
      id: string;
      username: string;
    } | null;
    reported: {
      id: string;
      username: string;
    };
    reason: string;
    details?: string;
    roomId?: string;
    resolved: boolean;
    createdAt: Date;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ReportStatsResponse {
  stats: {
    total: number;
    unresolved: number;
    resolved: number;
    byReason: Record<string, number>;
  };
}
