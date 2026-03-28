import { create } from 'zustand';

interface Player {
  socketId: string;
  userId?: string;
  username: string;
  avatar?: string;
  score: number;
  isHost: boolean;
  isConnected: boolean;
}

interface RoomSettings {
  maxPlayers: number;
  rounds: number;
  drawTime: number;
  difficulty: 'easy' | 'medium' | 'hard';
  wordPackIds: string[];
  familySafeMode: boolean;
  allowSpectators: boolean;
  isPublic: boolean;
}

interface GameState {
  mode: 'classic' | 'blitz';
  currentRound: number;
  totalRounds: number;
  drawerSocketId: string | null;
  currentWord: string | null;
  hint: string;
  roundStartTime: Date | null;
  roundEndTime: Date | null;
  timeRemaining: number;
}

interface Room {
  code: string;
  hostSocketId: string;
  players: Player[];
  spectators: string[];
  settings: RoomSettings;
  state: 'lobby' | 'in-game' | 'ending';
  gameState: GameState | null;
}

interface GameStoreState {
  room: Room | null;
  mySocketId: string | null;
  isSpectator: boolean;
  
  setRoom: (room: Room) => void;
  updateRoom: (updates: Partial<Room>) => void;
  setMySocketId: (socketId: string) => void;
  addPlayer: (player: Player) => void;
  removePlayer: (socketId: string) => void;
  updatePlayer: (socketId: string, updates: Partial<Player>) => void;
  updateGameState: (gameState: Partial<GameState>) => void;
  setSpectator: (isSpectator: boolean) => void;
  clearRoom: () => void;
}

export const useGameStore = create<GameStoreState>((set) => ({
  room: null,
  mySocketId: null,
  isSpectator: false,

  setRoom: (room) => set({ room }),

  updateRoom: (updates) =>
    set((state) => ({
      room: state.room ? { ...state.room, ...updates } : null,
    })),

  setMySocketId: (socketId) => set({ mySocketId: socketId }),

  addPlayer: (player) =>
    set((state) => ({
      room: state.room
        ? { ...state.room, players: [...state.room.players, player] }
        : null,
    })),

  removePlayer: (socketId) =>
    set((state) => ({
      room: state.room
        ? {
            ...state.room,
            players: state.room.players.filter((p) => p.socketId !== socketId),
          }
        : null,
    })),

  updatePlayer: (socketId, updates) =>
    set((state) => ({
      room: state.room
        ? {
            ...state.room,
            players: state.room.players.map((p) =>
              p.socketId === socketId ? { ...p, ...updates } : p
            ),
          }
        : null,
    })),

  updateGameState: (gameState) =>
    set((state) => ({
      room: state.room
        ? {
            ...state.room,
            gameState: state.room.gameState
              ? { ...state.room.gameState, ...gameState }
              : null,
          }
        : null,
    })),

  setSpectator: (isSpectator) => set({ isSpectator }),

  clearRoom: () => set({ room: null, mySocketId: null, isSpectator: false }),
}));
