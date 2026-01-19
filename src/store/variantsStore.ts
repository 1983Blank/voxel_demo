import { create } from 'zustand';

export interface Variant {
  id: string;
  screenId: string;
  label: 'A' | 'B' | 'C' | 'D';
  name: string;
  html: string;
  createdAt: string;
  updatedAt: string;
  isOriginal: boolean;
  prompt?: string; // AI prompt used to generate this variant
  stats?: {
    views: number;
    clicks: number;
    avgTimeSpent: number;
  };
}

interface VariantsState {
  variants: Variant[];
  activeVariantId: string | null;
  comparisonMode: 'grid' | 'side-by-side' | 'overlay';
  selectedForComparison: string[];
  isGenerating: boolean;

  // Actions
  getVariantsForScreen: (screenId: string) => Variant[];
  getVariant: (id: string) => Variant | undefined;
  createVariant: (screenId: string, label: 'A' | 'B' | 'C' | 'D', name: string, html: string, prompt?: string) => Variant;
  updateVariant: (id: string, updates: Partial<Variant>) => void;
  deleteVariant: (id: string) => void;
  duplicateVariant: (id: string, newLabel: 'A' | 'B' | 'C' | 'D') => Variant | null;

  setActiveVariant: (id: string | null) => void;
  setComparisonMode: (mode: 'grid' | 'side-by-side' | 'overlay') => void;
  toggleComparisonSelection: (id: string) => void;
  clearComparisonSelection: () => void;

  setGenerating: (generating: boolean) => void;

  // Initialize original variant from screen
  initializeFromScreen: (screenId: string, screenName: string, html: string) => Variant;
}

const VARIANT_COLORS: Record<string, string> = {
  A: '#1890ff',
  B: '#52c41a',
  C: '#faad14',
  D: '#eb2f96',
};

export const getVariantColor = (label: string): string => VARIANT_COLORS[label] || '#999';

export const useVariantsStore = create<VariantsState>((set, get) => ({
  variants: [],
  activeVariantId: null,
  comparisonMode: 'grid',
  selectedForComparison: [],
  isGenerating: false,

  getVariantsForScreen: (screenId) => {
    return get().variants.filter((v) => v.screenId === screenId);
  },

  getVariant: (id) => {
    return get().variants.find((v) => v.id === id);
  },

  createVariant: (screenId, label, name, html, prompt) => {
    const now = new Date().toISOString();
    const variant: Variant = {
      id: `variant-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      screenId,
      label,
      name,
      html,
      createdAt: now,
      updatedAt: now,
      isOriginal: false,
      prompt,
      stats: { views: 0, clicks: 0, avgTimeSpent: 0 },
    };

    set((state) => ({
      variants: [...state.variants, variant],
    }));

    return variant;
  },

  updateVariant: (id, updates) => {
    set((state) => ({
      variants: state.variants.map((v) =>
        v.id === id
          ? { ...v, ...updates, updatedAt: new Date().toISOString() }
          : v
      ),
    }));
  },

  deleteVariant: (id) => {
    const variant = get().getVariant(id);
    if (variant?.isOriginal) return; // Can't delete original

    set((state) => ({
      variants: state.variants.filter((v) => v.id !== id),
      selectedForComparison: state.selectedForComparison.filter((vid) => vid !== id),
      activeVariantId: state.activeVariantId === id ? null : state.activeVariantId,
    }));
  },

  duplicateVariant: (id, newLabel) => {
    const variant = get().getVariant(id);
    if (!variant) return null;

    // Check if label already exists for this screen
    const existing = get().getVariantsForScreen(variant.screenId);
    if (existing.some((v) => v.label === newLabel)) return null;

    return get().createVariant(
      variant.screenId,
      newLabel,
      `Variant ${newLabel}`,
      variant.html
    );
  },

  setActiveVariant: (id) => set({ activeVariantId: id }),

  setComparisonMode: (mode) => set({ comparisonMode: mode }),

  toggleComparisonSelection: (id) => {
    set((state) => {
      const isSelected = state.selectedForComparison.includes(id);
      if (isSelected) {
        return {
          selectedForComparison: state.selectedForComparison.filter((vid) => vid !== id),
        };
      } else if (state.selectedForComparison.length < 4) {
        return {
          selectedForComparison: [...state.selectedForComparison, id],
        };
      }
      return state;
    });
  },

  clearComparisonSelection: () => set({ selectedForComparison: [] }),

  setGenerating: (generating) => set({ isGenerating: generating }),

  initializeFromScreen: (screenId, _screenName, html) => {
    const existing = get().getVariantsForScreen(screenId);
    const originalVariant = existing.find((v) => v.isOriginal);

    if (originalVariant) {
      return originalVariant;
    }

    const now = new Date().toISOString();
    const variant: Variant = {
      id: `variant-original-${screenId}`,
      screenId,
      label: 'A',
      name: 'Original',
      html,
      createdAt: now,
      updatedAt: now,
      isOriginal: true,
      stats: { views: 0, clicks: 0, avgTimeSpent: 0 },
    };

    set((state) => ({
      variants: [...state.variants, variant],
    }));

    return variant;
  },
}));
