/**
 * Tests for variantPlanService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from './supabase';

// Mock the supabase module
vi.mock('./supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
      getSession: vi.fn(),
    },
    from: vi.fn(),
    functions: {
      invoke: vi.fn(),
    },
  },
  isSupabaseConfigured: vi.fn().mockReturnValue(true),
}));

// Mock the htmlCompactor module
vi.mock('./htmlCompactor', () => ({
  compactHtml: vi.fn().mockImplementation((html) => html),
}));

describe('variantPlanService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createVibeSession', () => {
    it('should create a new session correctly', async () => {
      const { createVibeSession } = await import('./variantPlanService');

      const mockUser = { id: 'user-1', email: 'test@test.com' };
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser as any },
        error: null,
      });

      const mockSession = {
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

      const mockFrom = vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockSession, error: null }),
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom);

      const result = await createVibeSession('screen-1', 'Test Session', 'Make it modern');

      expect(result).toEqual(mockSession);
      expect(mockFrom).toHaveBeenCalledWith('vibe_sessions');
    });

    it('should throw error when not authenticated', async () => {
      const { createVibeSession } = await import('./variantPlanService');

      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null,
      } as any);

      await expect(createVibeSession('screen-1', 'Test', 'Prompt')).rejects.toThrow('Not authenticated');
    });
  });

  describe('getVibeSession', () => {
    it('should return session by ID', async () => {
      const { getVibeSession } = await import('./variantPlanService');

      const mockSession = {
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

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockSession, error: null }),
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom);

      const result = await getVibeSession('session-1');
      expect(result).toEqual(mockSession);
    });

    it('should return null when session not found', async () => {
      const { getVibeSession } = await import('./variantPlanService');

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116', message: 'Not found' },
        }),
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom);

      const result = await getVibeSession('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('getVariantPlans', () => {
    it('should return plans for a session', async () => {
      const { getVariantPlans } = await import('./variantPlanService');

      const mockPlans = [
        { id: 'plan-1', session_id: 'session-1', variant_index: 1, title: 'Conservative', description: 'Desc', key_changes: [], style_notes: null, created_at: '' },
        { id: 'plan-2', session_id: 'session-1', variant_index: 2, title: 'Modern', description: 'Desc', key_changes: [], style_notes: null, created_at: '' },
        { id: 'plan-3', session_id: 'session-1', variant_index: 3, title: 'Bold', description: 'Desc', key_changes: [], style_notes: null, created_at: '' },
        { id: 'plan-4', session_id: 'session-1', variant_index: 4, title: 'Alternative', description: 'Desc', key_changes: [], style_notes: null, created_at: '' },
      ];

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockPlans, error: null }),
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom);

      const result = await getVariantPlans('session-1');

      expect(result).toEqual(mockPlans);
      expect(result.length).toBe(4);
    });

    it('should return empty array when no plans found', async () => {
      const { getVariantPlans } = await import('./variantPlanService');

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom);

      const result = await getVariantPlans('session-1');
      expect(result).toEqual([]);
    });
  });

  describe('generateVariantPlan', () => {
    it('should call Edge Function and return plans', async () => {
      // Reset modules to ensure clean mocks
      vi.resetModules();

      const { generateVariantPlan } = await import('./variantPlanService');

      const mockSession = {
        access_token: 'test-token',
        refresh_token: 'refresh-token',
        expires_in: 3600,
        token_type: 'bearer' as const,
        user: { id: 'user-1', email: 'test@test.com', aud: 'authenticated', created_at: '' },
      };

      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: mockSession as any },
        error: null,
      });

      const mockPlans = [
        { id: 'plan-1', session_id: 'session-1', variant_index: 1, title: 'Conservative', description: 'Desc', key_changes: [], style_notes: null, created_at: '' },
        { id: 'plan-2', session_id: 'session-1', variant_index: 2, title: 'Modern', description: 'Desc', key_changes: [], style_notes: null, created_at: '' },
        { id: 'plan-3', session_id: 'session-1', variant_index: 3, title: 'Bold', description: 'Desc', key_changes: [], style_notes: null, created_at: '' },
        { id: 'plan-4', session_id: 'session-1', variant_index: 4, title: 'Alternative', description: 'Desc', key_changes: [], style_notes: null, created_at: '' },
      ];

      const mockVibeSession = {
        id: 'session-1',
        user_id: 'user-1',
        screen_id: 'screen-1',
        name: 'Test',
        prompt: 'Make it modern',
        status: 'plan_ready',
        plan_approved: false,
        selected_variant_index: null,
        error_message: null,
        created_at: '',
        updated_at: '',
      };

      // Mock supabase.from for update and select calls
      vi.mocked(supabase.from).mockImplementation(() => {
        return {
          update: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockVibeSession, error: null }),
        } as any;
      });

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: {
          success: true,
          plans: mockPlans,
          model: 'claude-sonnet',
          provider: 'anthropic',
        },
        error: null,
      });

      const result = await generateVariantPlan(
        'session-1',
        'Make it modern',
        '<html></html>'
      );

      expect(result.plans).toEqual(mockPlans);
      expect(result.model).toBe('claude-sonnet');
      expect(result.provider).toBe('anthropic');
    });

    it('should throw error when not authenticated', async () => {
      const { generateVariantPlan } = await import('./variantPlanService');

      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null,
      });

      await expect(
        generateVariantPlan('session-1', 'Prompt', '<html></html>')
      ).rejects.toThrow('Not authenticated');
    });
  });

  describe('approvePlan', () => {
    it('should approve plan and return updated session', async () => {
      const { approvePlan } = await import('./variantPlanService');

      const mockSession = {
        id: 'session-1',
        user_id: 'user-1',
        screen_id: 'screen-1',
        name: 'Test',
        prompt: 'Prompt',
        status: 'generating',
        plan_approved: true,
        selected_variant_index: null,
        error_message: null,
        created_at: '',
        updated_at: '',
      };

      const mockFrom = vi.fn().mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockSession, error: null }),
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom);

      const result = await approvePlan('session-1');

      expect(result?.plan_approved).toBe(true);
      expect(result?.status).toBe('generating');
    });
  });

  describe('updateVariantPlan', () => {
    it('should update plan correctly', async () => {
      const { updateVariantPlan } = await import('./variantPlanService');

      const updatedPlan = {
        id: 'plan-1',
        session_id: 'session-1',
        variant_index: 1,
        title: 'Updated Title',
        description: 'Updated description',
        key_changes: ['New change'],
        style_notes: 'New style notes',
        created_at: '',
      };

      const mockFrom = vi.fn().mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: updatedPlan, error: null }),
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom);

      const result = await updateVariantPlan('plan-1', {
        title: 'Updated Title',
        description: 'Updated description',
      });

      expect(result?.title).toBe('Updated Title');
    });
  });

  describe('deleteVibeSession', () => {
    it('should delete session correctly', async () => {
      const { deleteVibeSession } = await import('./variantPlanService');

      const mockFrom = vi.fn().mockReturnValue({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom);

      const result = await deleteVibeSession('session-1');
      expect(result).toBe(true);
    });
  });
});
