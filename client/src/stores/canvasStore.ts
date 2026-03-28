import { create } from 'zustand';

interface Point {
  x: number;
  y: number;
}

interface Stroke {
  id: string;
  points: Point[];
  color: string;
  size: number;
  tool: 'brush' | 'eraser' | 'fill';
}

interface CanvasState {
  strokes: Stroke[];
  currentStroke: Stroke | null;
  selectedTool: 'brush' | 'eraser' | 'fill';
  selectedColor: string;
  selectedSize: number;
  undoStack: Stroke[];
  redoStack: Stroke[];
  isDrawing: boolean;
  
  startStroke: (point: Point) => void;
  addPoint: (point: Point) => void;
  endStroke: () => void;
  addStroke: (stroke: Stroke) => void;
  removeLastStroke: () => void;
  clearCanvas: () => void;
  undo: () => void;
  redo: () => void;
  setTool: (tool: 'brush' | 'eraser' | 'fill') => void;
  setColor: (color: string) => void;
  setSize: (size: number) => void;
  replayStrokes: (strokes: Stroke[]) => void;
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
  strokes: [],
  currentStroke: null,
  selectedTool: 'brush',
  selectedColor: '#000000',
  selectedSize: 5,
  undoStack: [],
  redoStack: [],
  isDrawing: false,

  startStroke: (point) => {
    const { selectedColor, selectedSize, selectedTool } = get();
    set({
      currentStroke: {
        id: Date.now().toString(),
        points: [point],
        color: selectedTool === 'eraser' ? '#FFFFFF' : selectedColor,
        size: selectedSize,
        tool: selectedTool === 'fill' ? 'brush' : selectedTool,
      },
      isDrawing: true,
      redoStack: [], // Clear redo stack on new action
    });
  },

  addPoint: (point) => {
    const { currentStroke } = get();
    if (currentStroke) {
      set({
        currentStroke: {
          ...currentStroke,
          points: [...currentStroke.points, point],
        },
      });
    }
  },

  endStroke: () => {
    const { currentStroke, strokes } = get();
    if (currentStroke) {
      set({
        strokes: [...strokes, currentStroke],
        currentStroke: null,
        isDrawing: false,
      });
    }
  },

  addStroke: (stroke) => {
    set((state) => ({
      strokes: [...state.strokes, stroke],
    }));
  },

  removeLastStroke: () => {
    set((state) => ({
      strokes: state.strokes.slice(0, -1),
    }));
  },

  clearCanvas: () => {
    set({
      strokes: [],
      currentStroke: null,
      undoStack: [],
      redoStack: [],
    });
  },

  undo: () => {
    const { strokes, undoStack } = get();
    if (strokes.length > 0) {
      const lastStroke = strokes[strokes.length - 1];
      set({
        strokes: strokes.slice(0, -1),
        undoStack: [...undoStack, lastStroke],
      });
    }
  },

  redo: () => {
    const { strokes, undoStack } = get();
    if (undoStack.length > 0) {
      const strokeToRedo = undoStack[undoStack.length - 1];
      set({
        strokes: [...strokes, strokeToRedo],
        undoStack: undoStack.slice(0, -1),
      });
    }
  },

  setTool: (tool) => set({ selectedTool: tool }),

  setColor: (color) => set({ selectedColor: color }),

  setSize: (size) => set({ selectedSize: size }),

  replayStrokes: (strokes) => set({ strokes, undoStack: [], redoStack: [] }),
}));
