/**
 * Tests for vibeStore
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useVibeStore, getVibeVariantColor, getVibeVariantLabel, VIBE_VARIANT_COLORS } from './vibeStore';
import type { VibeSession, VariantPlan } from '../services/variantPlanService';
import type { VibeVariant } from '../services/variantCodeService';

describe('vibeStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useVibeStore.setState({
      currentSession: null,
      sourceHtml: null,
      sourceMetadata: null,
      plan: null,
      variants: [],
      status: 'idle',
      progress: null,
      error: null,
      selectedVariantIndex: null,
      comparisonMode: 'grid',
      previewVariantIndex: null,
    });
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = useVibeStore.getState();

      expect(state.currentSession).toBeNull();
      expect(state.sourceHtml).toBeNull();
      expect(state.sourceMetadata).toBeNull();
      expect(state.plan).toBeNull();
      expect(state.variants).toEqual([]);
      expect(state.status).toBe('idle');
      expect(state.progress).toBeNull();
      expect(state.error).toBeNull();
      expect(state.selectedVariantIndex).toBeNull();
      expect(state.comparisonMode).toBe('grid');
      expect(state.previewVariantIndex).toBeNull();
    });
  });

  describe('session management', () => {
    const mockSession: VibeSession = {
      id: 'session-1',
      user_id: 'user-1',
      screen_id: 'screen-1',
      name: 'Test Session',
      prompt: 'Make it modern',
      status: 'pending',
      plan_approved: false,
      selected_variant_index: null,
      error_message: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    it('should initialize session correctly', () => {
      const { initSession } = useVibeStore.getState();
      const sourceHtml = '<html><body>Test</body></html>';

      initSession(mockSession, sourceHtml);

      const state = useVibeStore.getState();
      expect(state.currentSession).toEqual(mockSession);
      expect(state.sourceHtml).toBe(sourceHtml);
      expect(state.status).toBe('pending');
      expect(state.plan).toBeNull();
      expect(state.variants).toEqual([]);
    });

    it('should update session correctly', () => {
      const { initSession, setSession } = useVibeStore.getState();
      initSession(mockSession, '<html></html>');

      const updatedSession = { ...mockSession, status: 'planning' as const };
      setSession(updatedSession);

      const state = useVibeStore.getState();
      expect(state.currentSession?.status).toBe('planning');
      expect(state.status).toBe('planning');
    });

    it('should clear session correctly', () => {
      const { initSession, clearSession } = useVibeStore.getState();
      initSession(mockSession, '<html></html>');
      clearSession();

      const state = useVibeStore.getState();
      expect(state.currentSession).toBeNull();
      expect(state.sourceHtml).toBeNull();
      expect(state.status).toBe('idle');
    });
  });

  describe('plan management', () => {
    const mockPlans: VariantPlan[] = [
      { id: 'plan-1', session_id: 'session-1', variant_index: 1, title: 'Conservative', description: 'Desc 1', key_changes: ['Change 1'], style_notes: null, created_at: '' },
      { id: 'plan-2', session_id: 'session-1', variant_index: 2, title: 'Modern', description: 'Desc 2', key_changes: ['Change 2'], style_notes: null, created_at: '' },
      { id: 'plan-3', session_id: 'session-1', variant_index: 3, title: 'Bold', description: 'Desc 3', key_changes: ['Change 3'], style_notes: null, created_at: '' },
      { id: 'plan-4', session_id: 'session-1', variant_index: 4, title: 'Alternative', description: 'Desc 4', key_changes: ['Change 4'], style_notes: null, created_at: '' },
    ];

    it('should set plan correctly', () => {
      const { setPlan } = useVibeStore.getState();

      setPlan({ plans: mockPlans, model: 'claude-sonnet', provider: 'anthropic' });

      const state = useVibeStore.getState();
      expect(state.plan?.plans).toEqual(mockPlans);
      expect(state.plan?.model).toBe('claude-sonnet');
      expect(state.plan?.provider).toBe('anthropic');
      expect(state.status).toBe('plan_ready');
    });

    it('should update plan item correctly', () => {
      const { setPlan, updatePlanItem } = useVibeStore.getState();
      setPlan({ plans: mockPlans, model: 'claude-sonnet', provider: 'anthropic' });

      updatePlanItem(1, { title: 'Updated Conservative' });

      const updatedPlan = useVibeStore.getState().getPlanByIndex(1);
      expect(updatedPlan?.title).toBe('Updated Conservative');
    });

    it('should approve plan correctly', () => {
      const mockSession: VibeSession = {
        id: 'session-1',
        user_id: 'user-1',
        screen_id: 'screen-1',
        name: 'Test',
        prompt: 'Test',
        status: 'plan_ready',
        plan_approved: false,
        selected_variant_index: null,
        error_message: null,
        created_at: '',
        updated_at: '',
      };

      const { initSession, setPlan, approvePlan } = useVibeStore.getState();
      initSession(mockSession, '<html></html>');
      setPlan({ plans: mockPlans, model: 'claude-sonnet', provider: 'anthropic' });

      approvePlan();

      const state = useVibeStore.getState();
      expect(state.currentSession?.plan_approved).toBe(true);
      expect(state.status).toBe('generating');
    });

    it('should get plan by index correctly', () => {
      const { setPlan } = useVibeStore.getState();
      setPlan({ plans: mockPlans, model: 'claude-sonnet', provider: 'anthropic' });

      const plan = useVibeStore.getState().getPlanByIndex(2);
      expect(plan?.title).toBe('Modern');
      expect(plan?.variant_index).toBe(2);
    });
  });

  describe('variant management', () => {
    const mockVariants: VibeVariant[] = [
      { id: 'var-1', session_id: 'session-1', plan_id: 'plan-1', variant_index: 1, html_path: '/path/1.html', css_path: null, screenshot_path: null, html_url: 'https://url/1.html', css_url: null, screenshot_url: null, generation_model: 'claude', generation_duration_ms: 5000, token_count: null, status: 'complete', error_message: null, created_at: '', updated_at: '' },
      { id: 'var-2', session_id: 'session-1', plan_id: 'plan-2', variant_index: 2, html_path: '/path/2.html', css_path: null, screenshot_path: null, html_url: 'https://url/2.html', css_url: null, screenshot_url: null, generation_model: 'claude', generation_duration_ms: 4500, token_count: null, status: 'complete', error_message: null, created_at: '', updated_at: '' },
    ];

    it('should set variants correctly', () => {
      const { setVariants } = useVibeStore.getState();

      setVariants(mockVariants);

      const state = useVibeStore.getState();
      expect(state.variants).toEqual(mockVariants);
    });

    it('should add variant correctly', () => {
      const { addVariant } = useVibeStore.getState();
      const newVariant: VibeVariant = {
        id: 'var-3',
        session_id: 'session-1',
        plan_id: 'plan-3',
        variant_index: 3,
        html_path: '/path/3.html',
        css_path: null,
        screenshot_path: null,
        html_url: 'https://url/3.html',
        css_url: null,
        screenshot_url: null,
        generation_model: 'claude',
        generation_duration_ms: 5500,
        token_count: null,
        status: 'complete',
        error_message: null,
        created_at: '',
        updated_at: '',
      };

      addVariant(newVariant);

      const state = useVibeStore.getState();
      expect(state.variants).toContainEqual(newVariant);
    });

    it('should replace existing variant with same index', () => {
      const { setVariants, addVariant } = useVibeStore.getState();
      setVariants(mockVariants);

      const updatedVariant: VibeVariant = {
        ...mockVariants[0],
        html_url: 'https://url/updated.html',
      };

      addVariant(updatedVariant);

      const state = useVibeStore.getState();
      expect(state.variants.find((v) => v.variant_index === 1)?.html_url).toBe('https://url/updated.html');
      expect(state.variants.length).toBe(2);
    });

    it('should update variant correctly', () => {
      const { setVariants, updateVariant } = useVibeStore.getState();
      setVariants(mockVariants);

      updateVariant(1, { status: 'failed', error_message: 'Test error' });

      const variant = useVibeStore.getState().getVariantByIndex(1);
      expect(variant?.status).toBe('failed');
      expect(variant?.error_message).toBe('Test error');
    });

    it('should detect all variants complete', () => {
      const allCompleteVariants: VibeVariant[] = [1, 2, 3, 4].map((i) => ({
        id: `var-${i}`,
        session_id: 'session-1',
        plan_id: `plan-${i}`,
        variant_index: i,
        html_path: `/path/${i}.html`,
        css_path: null,
        screenshot_path: null,
        html_url: `https://url/${i}.html`,
        css_url: null,
        screenshot_url: null,
        generation_model: 'claude',
        generation_duration_ms: 5000,
        token_count: null,
        status: 'complete' as const,
        error_message: null,
        created_at: '',
        updated_at: '',
      }));

      const { setVariants } = useVibeStore.getState();
      setVariants(allCompleteVariants);

      expect(useVibeStore.getState().isAllVariantsComplete()).toBe(true);
      expect(useVibeStore.getState().getCompletedVariantsCount()).toBe(4);
      expect(useVibeStore.getState().status).toBe('complete');
    });
  });

  describe('status and progress', () => {
    it('should set status correctly', () => {
      const { setStatus } = useVibeStore.getState();

      setStatus('planning');

      expect(useVibeStore.getState().status).toBe('planning');
    });

    it('should set progress correctly', () => {
      const { setProgress } = useVibeStore.getState();

      setProgress({
        stage: 'generating',
        message: 'Generating variant 1...',
        percent: 25,
        variantIndex: 1,
        variantTitle: 'Conservative',
      });

      const state = useVibeStore.getState();
      expect(state.progress?.stage).toBe('generating');
      expect(state.progress?.percent).toBe(25);
      expect(state.progress?.variantIndex).toBe(1);
    });

    it('should set error correctly', () => {
      const { setError } = useVibeStore.getState();

      setError('Something went wrong');

      const state = useVibeStore.getState();
      expect(state.error).toBe('Something went wrong');
      expect(state.status).toBe('failed');
      expect(state.progress).toBeNull();
    });

    it('should clear error correctly', () => {
      const { setError, setStatus } = useVibeStore.getState();
      setError('Initial error');
      setStatus('idle');
      setError(null);

      const state = useVibeStore.getState();
      expect(state.error).toBeNull();
    });
  });

  describe('UI state', () => {
    it('should select variant correctly', () => {
      const { selectVariant } = useVibeStore.getState();

      selectVariant(2);

      expect(useVibeStore.getState().selectedVariantIndex).toBe(2);
    });

    it('should set comparison mode correctly', () => {
      const { setComparisonMode } = useVibeStore.getState();

      setComparisonMode('split');

      expect(useVibeStore.getState().comparisonMode).toBe('split');
    });

    it('should set preview variant correctly', () => {
      const { setPreviewVariant } = useVibeStore.getState();

      setPreviewVariant(3);

      expect(useVibeStore.getState().previewVariantIndex).toBe(3);
    });
  });

  describe('helper functions', () => {
    it('should return correct variant colors', () => {
      expect(getVibeVariantColor(1)).toBe(VIBE_VARIANT_COLORS[1]);
      expect(getVibeVariantColor(2)).toBe(VIBE_VARIANT_COLORS[2]);
      expect(getVibeVariantColor(3)).toBe(VIBE_VARIANT_COLORS[3]);
      expect(getVibeVariantColor(4)).toBe(VIBE_VARIANT_COLORS[4]);
      expect(getVibeVariantColor(99)).toBe('#999'); // Unknown index
    });

    it('should return correct variant labels', () => {
      expect(getVibeVariantLabel(1)).toBe('Conservative');
      expect(getVibeVariantLabel(2)).toBe('Modern');
      expect(getVibeVariantLabel(3)).toBe('Bold');
      expect(getVibeVariantLabel(4)).toBe('Alternative');
      expect(getVibeVariantLabel(99)).toBe('Variant 99'); // Unknown index
    });
  });
});
