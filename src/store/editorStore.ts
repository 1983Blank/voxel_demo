import { create } from 'zustand';

export interface EditorState {
  // Current screen being edited
  screenId: string | null;
  screenName: string;
  originalHtml: string;
  currentHtml: string;

  // History for undo/redo
  history: string[];
  historyIndex: number;

  // Selection state
  selectedElementPath: string | null;
  selectedElementHtml: string | null;

  // AI generation state
  isGenerating: boolean;
  lastPrompt: string;
  generationHistory: Array<{
    prompt: string;
    timestamp: string;
    applied: boolean;
  }>;

  // Editor mode
  editorMode: 'select' | 'edit' | 'move';
  showGrid: boolean;
  zoom: number;

  // Dirty state
  isDirty: boolean;

  // Actions
  loadScreen: (id: string, name: string, html: string) => void;
  updateHtml: (html: string) => void;
  setSelectedElement: (path: string | null, html: string | null) => void;
  setEditorMode: (mode: 'select' | 'edit' | 'move') => void;
  setZoom: (zoom: number) => void;
  toggleGrid: () => void;

  // History actions
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // AI actions
  setGenerating: (generating: boolean) => void;
  addGenerationToHistory: (prompt: string, applied: boolean) => void;

  // Save
  saveChanges: () => void;
  discardChanges: () => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  screenId: null,
  screenName: '',
  originalHtml: '',
  currentHtml: '',

  history: [],
  historyIndex: -1,

  selectedElementPath: null,
  selectedElementHtml: null,

  isGenerating: false,
  lastPrompt: '',
  generationHistory: [],

  editorMode: 'select',
  showGrid: false,
  zoom: 100,

  isDirty: false,

  loadScreen: (id, name, html) => {
    set({
      screenId: id,
      screenName: name,
      originalHtml: html,
      currentHtml: html,
      history: [html],
      historyIndex: 0,
      selectedElementPath: null,
      selectedElementHtml: null,
      isDirty: false,
      generationHistory: [],
    });
  },

  updateHtml: (html) => {
    const state = get();
    const newHistory = state.history.slice(0, state.historyIndex + 1);
    newHistory.push(html);

    set({
      currentHtml: html,
      history: newHistory,
      historyIndex: newHistory.length - 1,
      isDirty: html !== state.originalHtml,
    });
  },

  setSelectedElement: (path, html) => {
    set({
      selectedElementPath: path,
      selectedElementHtml: html,
    });
  },

  setEditorMode: (mode) => set({ editorMode: mode }),

  setZoom: (zoom) => set({ zoom: Math.max(25, Math.min(200, zoom)) }),

  toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),

  undo: () => {
    const state = get();
    if (state.historyIndex > 0) {
      const newIndex = state.historyIndex - 1;
      set({
        historyIndex: newIndex,
        currentHtml: state.history[newIndex],
        isDirty: state.history[newIndex] !== state.originalHtml,
      });
    }
  },

  redo: () => {
    const state = get();
    if (state.historyIndex < state.history.length - 1) {
      const newIndex = state.historyIndex + 1;
      set({
        historyIndex: newIndex,
        currentHtml: state.history[newIndex],
        isDirty: state.history[newIndex] !== state.originalHtml,
      });
    }
  },

  canUndo: () => get().historyIndex > 0,
  canRedo: () => get().historyIndex < get().history.length - 1,

  setGenerating: (generating) => set({ isGenerating: generating }),

  addGenerationToHistory: (prompt, applied) => {
    set((state) => ({
      lastPrompt: prompt,
      generationHistory: [
        ...state.generationHistory,
        { prompt, timestamp: new Date().toISOString(), applied },
      ],
    }));
  },

  saveChanges: () => {
    const state = get();
    set({
      originalHtml: state.currentHtml,
      isDirty: false,
    });
  },

  discardChanges: () => {
    const state = get();
    set({
      currentHtml: state.originalHtml,
      history: [state.originalHtml],
      historyIndex: 0,
      isDirty: false,
    });
  },
}));
