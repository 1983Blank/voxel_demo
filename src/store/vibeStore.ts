/**
 * Vibe Prototyping Store
 * State management for the vibe prototyping workflow
 */

import { create } from 'zustand';
import type { UIMetadata } from '../services/screenAnalyzerService';
import type { VibeSession, VariantPlan } from '../services/variantPlanService';
import type { VibeVariant } from '../services/variantCodeService';

// Chat message for the vibe coding interface
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  status?: 'pending' | 'complete' | 'error';
  metadata?: {
    variantIndex?: number;
    stage?: string;
  };
}

// Progress state
export interface VibeProgress {
  stage: 'analyzing' | 'planning' | 'generating' | 'complete';
  message: string;
  percent: number;
  variantIndex?: number;
  variantTitle?: string;
}

// Generated plan with all 4 variants
export interface GeneratedPlan {
  plans: VariantPlan[];
  model: string;
  provider: string;
}

// Status types
export type VibeStatus = 'idle' | 'analyzing' | 'planning' | 'plan_ready' | 'generating' | 'complete' | 'failed';
export type ComparisonMode = 'grid' | 'split' | 'overlay';

interface VibeState {
  // Current session data
  currentSession: VibeSession | null;
  sourceHtml: string | null;
  sourceMetadata: UIMetadata | null;
  plan: GeneratedPlan | null;
  variants: VibeVariant[];

  // Chat messages for vibe coding interface
  messages: ChatMessage[];

  // Status tracking
  status: VibeStatus;
  progress: VibeProgress | null;
  error: string | null;

  // UI state
  selectedVariantIndex: number | null;
  comparisonMode: ComparisonMode;
  previewVariantIndex: number | null;
  previewTab: 'source' | 1 | 2 | 3 | 4;

  // Actions - Session management
  initSession: (session: VibeSession, sourceHtml: string) => void;
  setSession: (session: VibeSession) => void;
  clearSession: () => void;

  // Actions - Analysis
  setSourceMetadata: (metadata: UIMetadata) => void;
  setAnalyzing: (analyzing: boolean, message?: string) => void;

  // Actions - Plan management
  setPlan: (plan: GeneratedPlan) => void;
  updatePlanItem: (variantIndex: number, updates: Partial<VariantPlan>) => void;
  approvePlan: () => void;

  // Actions - Variant management
  setVariants: (variants: VibeVariant[]) => void;
  updateVariant: (variantIndex: number, updates: Partial<VibeVariant>) => void;
  addVariant: (variant: VibeVariant) => void;

  // Actions - Status & progress
  setStatus: (status: VibeStatus) => void;
  setProgress: (progress: VibeProgress | null) => void;
  setError: (error: string | null) => void;

  // Actions - UI state
  selectVariant: (index: number | null) => void;
  setComparisonMode: (mode: ComparisonMode) => void;
  setPreviewVariant: (index: number | null) => void;
  setPreviewTab: (tab: 'source' | 1 | 2 | 3 | 4) => void;

  // Actions - Messages
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => string;
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
  clearMessages: () => void;

  // Computed getters
  getVariantByIndex: (index: number) => VibeVariant | undefined;
  getPlanByIndex: (index: number) => VariantPlan | undefined;
  isAllVariantsComplete: () => boolean;
  getCompletedVariantsCount: () => number;
}

export const useVibeStore = create<VibeState>((set, get) => ({
  // Initial state
  currentSession: null,
  sourceHtml: null,
  sourceMetadata: null,
  plan: null,
  variants: [],
  messages: [],

  status: 'idle',
  progress: null,
  error: null,

  selectedVariantIndex: null,
  comparisonMode: 'grid',
  previewVariantIndex: null,
  previewTab: 'source',

  // Session management
  initSession: (session, sourceHtml) => {
    set({
      currentSession: session,
      sourceHtml,
      sourceMetadata: null,
      plan: null,
      variants: [],
      messages: [],
      status: session.status as VibeStatus,
      progress: null,
      error: null,
      selectedVariantIndex: session.selected_variant_index,
      previewVariantIndex: null,
      previewTab: 'source',
    });
  },

  setSession: (session) => {
    set({
      currentSession: session,
      status: session.status as VibeStatus,
      selectedVariantIndex: session.selected_variant_index,
      error: session.error_message,
    });
  },

  clearSession: () => {
    set({
      currentSession: null,
      sourceHtml: null,
      sourceMetadata: null,
      plan: null,
      variants: [],
      messages: [],
      status: 'idle',
      progress: null,
      error: null,
      selectedVariantIndex: null,
      previewVariantIndex: null,
      previewTab: 'source',
    });
  },

  // Analysis
  setSourceMetadata: (metadata) => {
    set({ sourceMetadata: metadata });
  },

  setAnalyzing: (analyzing, message) => {
    if (analyzing) {
      set({
        status: 'analyzing',
        progress: {
          stage: 'analyzing',
          message: message || 'Analyzing screen...',
          percent: 20,
        },
      });
    } else {
      set({
        progress: null,
      });
    }
  },

  // Plan management
  setPlan: (plan) => {
    set({
      plan,
      status: 'plan_ready',
      progress: null,
    });
  },

  updatePlanItem: (variantIndex, updates) => {
    const { plan } = get();
    if (!plan) return;

    const updatedPlans = plan.plans.map((p) =>
      p.variant_index === variantIndex ? { ...p, ...updates } : p
    );

    set({
      plan: { ...plan, plans: updatedPlans },
    });
  },

  approvePlan: () => {
    const { currentSession } = get();
    if (currentSession) {
      set({
        currentSession: {
          ...currentSession,
          plan_approved: true,
          status: 'generating',
        },
        status: 'generating',
      });
    }
  },

  // Variant management
  setVariants: (variants) => {
    set({ variants });

    // Check if all complete or if we have any completed variants (for existing sessions)
    const completedCount = variants.filter((v) => v.status === 'complete').length;
    const allComplete = variants.length === 4 && completedCount === 4;

    // If all 4 are complete, or if we're loading an existing session with some completed variants,
    // set status to 'complete' (this allows tabs to be clickable)
    if (allComplete || (completedCount > 0 && get().status !== 'generating')) {
      set({ status: 'complete' });
    }
  },

  updateVariant: (variantIndex, updates) => {
    const { variants } = get();
    const updatedVariants = variants.map((v) =>
      v.variant_index === variantIndex ? { ...v, ...updates } : v
    );
    set({ variants: updatedVariants });

    // Check if all complete
    const allComplete = updatedVariants.length === 4 && updatedVariants.every((v) => v.status === 'complete');
    if (allComplete) {
      set({ status: 'complete', progress: null });
    }
  },

  addVariant: (variant) => {
    const { variants } = get();
    const existingIndex = variants.findIndex((v) => v.variant_index === variant.variant_index);

    if (existingIndex >= 0) {
      // Replace existing
      const updatedVariants = [...variants];
      updatedVariants[existingIndex] = variant;
      set({ variants: updatedVariants });
    } else {
      // Add new
      set({ variants: [...variants, variant].sort((a, b) => a.variant_index - b.variant_index) });
    }

    // Check if all complete
    const allVariants = get().variants;
    const allComplete = allVariants.length === 4 && allVariants.every((v) => v.status === 'complete');
    if (allComplete) {
      set({ status: 'complete', progress: null });
    }
  },

  // Status & progress
  setStatus: (status) => {
    set({ status });
  },

  setProgress: (progress) => {
    set({ progress });
  },

  setError: (error) => {
    set({
      error,
      status: error ? 'failed' : get().status,
      progress: null,
    });
  },

  // UI state
  selectVariant: (index) => {
    set({ selectedVariantIndex: index });
  },

  setComparisonMode: (mode) => {
    set({ comparisonMode: mode });
  },

  setPreviewVariant: (index) => {
    set({ previewVariantIndex: index });
  },

  setPreviewTab: (tab) => {
    set({ previewTab: tab });
  },

  // Messages
  addMessage: (message) => {
    const id = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const newMessage: ChatMessage = {
      ...message,
      id,
      timestamp: new Date(),
    };
    set((state) => ({
      messages: [...state.messages, newMessage],
    }));
    return id;
  },

  updateMessage: (id, updates) => {
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === id ? { ...msg, ...updates } : msg
      ),
    }));
  },

  clearMessages: () => {
    set({ messages: [] });
  },

  // Computed getters
  getVariantByIndex: (index) => {
    return get().variants.find((v) => v.variant_index === index);
  },

  getPlanByIndex: (index) => {
    return get().plan?.plans.find((p) => p.variant_index === index);
  },

  isAllVariantsComplete: () => {
    const { variants } = get();
    return variants.length === 4 && variants.every((v) => v.status === 'complete');
  },

  getCompletedVariantsCount: () => {
    return get().variants.filter((v) => v.status === 'complete').length;
  },
}));

// Variant label colors
export const VIBE_VARIANT_COLORS: Record<number, string> = {
  1: '#1890ff', // Blue - Conservative
  2: '#52c41a', // Green - Modern
  3: '#faad14', // Gold - Bold
  4: '#eb2f96', // Pink - Alternative
};

export const getVibeVariantColor = (index: number): string =>
  VIBE_VARIANT_COLORS[index] || '#999';

// Variant label names
export const VIBE_VARIANT_LABELS: Record<number, string> = {
  1: 'Conservative',
  2: 'Modern',
  3: 'Bold',
  4: 'Alternative',
};

export const getVibeVariantLabel = (index: number): string =>
  VIBE_VARIANT_LABELS[index] || `Variant ${index}`;
