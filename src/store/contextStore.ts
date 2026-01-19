import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ContextType = 'text' | 'pdf' | 'video' | 'url' | 'image';

export interface ProductContext {
  id: string;
  type: ContextType;
  name: string;
  content: string; // For text, this is the actual content. For files, it's a data URL or path
  description?: string;
  createdAt: string;
  updatedAt: string;
  metadata?: {
    fileSize?: number;
    mimeType?: string;
    duration?: number; // For videos
    pageCount?: number; // For PDFs
    url?: string; // Original URL for url type
  };
  tags?: string[];
}

interface ContextState {
  contexts: ProductContext[];
  selectedContextIds: string[]; // Which contexts are active for AI

  // Actions
  addContext: (context: Omit<ProductContext, 'id' | 'createdAt' | 'updatedAt'>) => ProductContext;
  updateContext: (id: string, updates: Partial<ProductContext>) => void;
  deleteContext: (id: string) => void;

  toggleContextSelection: (id: string) => void;
  selectAllContexts: () => void;
  deselectAllContexts: () => void;

  getSelectedContexts: () => ProductContext[];
  getContextsByType: (type: ContextType) => ProductContext[];

  // Get combined context for AI prompt
  getAIContextPrompt: () => string;
}

export const useContextStore = create<ContextState>()(
  persist(
    (set, get) => ({
      contexts: [],
      selectedContextIds: [],

      addContext: (contextData) => {
        const now = new Date().toISOString();
        const context: ProductContext = {
          ...contextData,
          id: `ctx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          contexts: [...state.contexts, context],
          selectedContextIds: [...state.selectedContextIds, context.id],
        }));

        return context;
      },

      updateContext: (id, updates) => {
        set((state) => ({
          contexts: state.contexts.map((ctx) =>
            ctx.id === id
              ? { ...ctx, ...updates, updatedAt: new Date().toISOString() }
              : ctx
          ),
        }));
      },

      deleteContext: (id) => {
        set((state) => ({
          contexts: state.contexts.filter((ctx) => ctx.id !== id),
          selectedContextIds: state.selectedContextIds.filter((cid) => cid !== id),
        }));
      },

      toggleContextSelection: (id) => {
        set((state) => ({
          selectedContextIds: state.selectedContextIds.includes(id)
            ? state.selectedContextIds.filter((cid) => cid !== id)
            : [...state.selectedContextIds, id],
        }));
      },

      selectAllContexts: () => {
        set((state) => ({
          selectedContextIds: state.contexts.map((ctx) => ctx.id),
        }));
      },

      deselectAllContexts: () => {
        set({ selectedContextIds: [] });
      },

      getSelectedContexts: () => {
        const state = get();
        return state.contexts.filter((ctx) =>
          state.selectedContextIds.includes(ctx.id)
        );
      },

      getContextsByType: (type) => {
        return get().contexts.filter((ctx) => ctx.type === type);
      },

      getAIContextPrompt: () => {
        const selectedContexts = get().getSelectedContexts();
        if (selectedContexts.length === 0) return '';

        const contextParts = selectedContexts.map((ctx) => {
          switch (ctx.type) {
            case 'text':
              return `### ${ctx.name}\n${ctx.content}`;
            case 'url':
              return `### Reference: ${ctx.name}\nURL: ${ctx.metadata?.url}\n${ctx.content}`;
            case 'pdf':
              return `### Document: ${ctx.name}\n${ctx.content}`;
            case 'video':
              return `### Video Notes: ${ctx.name}\n${ctx.content}`;
            case 'image':
              return `### Image Reference: ${ctx.name}\n${ctx.description || 'Visual reference'}`;
            default:
              return `### ${ctx.name}\n${ctx.content}`;
          }
        });

        return `## Product Context\n\n${contextParts.join('\n\n---\n\n')}`;
      },
    }),
    {
      name: 'voxel-context-storage',
      partialize: (state) => ({
        contexts: state.contexts,
        selectedContextIds: state.selectedContextIds,
      }),
    }
  )
);

// Helper function to get icon for context type
export const getContextTypeIcon = (type: ContextType): string => {
  switch (type) {
    case 'text': return 'file-text';
    case 'pdf': return 'file-pdf';
    case 'video': return 'video-camera';
    case 'url': return 'link';
    case 'image': return 'picture';
    default: return 'file';
  }
};

// Helper function to get color for context type
export const getContextTypeColor = (type: ContextType): string => {
  switch (type) {
    case 'text': return '#1890ff';
    case 'pdf': return '#f5222d';
    case 'video': return '#722ed1';
    case 'url': return '#13c2c2';
    case 'image': return '#52c41a';
    default: return '#999';
  }
};
