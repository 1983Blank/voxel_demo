/**
 * Tests for variantCodeService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from './supabase';

// Mock the supabase module
vi.mock('./supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
    from: vi.fn(),
    functions: {
      invoke: vi.fn(),
    },
    storage: {
      from: vi.fn(),
    },
    rpc: vi.fn(),
  },
  isSupabaseConfigured: vi.fn().mockReturnValue(true),
}));

describe('variantCodeService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getVariants', () => {
    it('should return variants for a session', async () => {
      const { getVariants } = await import('./variantCodeService');

      const mockVariants = [
        {
          id: 'var-1',
          session_id: 'session-1',
          plan_id: 'plan-1',
          variant_index: 1,
          html_path: '/path/1.html',
          css_path: null,
          screenshot_path: null,
          html_url: 'https://url/1.html',
          css_url: null,
          screenshot_url: null,
          generation_model: 'claude',
          generation_duration_ms: 5000,
          token_count: null,
          status: 'complete',
          error_message: null,
          created_at: '',
          updated_at: '',
        },
        {
          id: 'var-2',
          session_id: 'session-1',
          plan_id: 'plan-2',
          variant_index: 2,
          html_path: '/path/2.html',
          css_path: null,
          screenshot_path: null,
          html_url: 'https://url/2.html',
          css_url: null,
          screenshot_url: null,
          generation_model: 'claude',
          generation_duration_ms: 4500,
          token_count: null,
          status: 'complete',
          error_message: null,
          created_at: '',
          updated_at: '',
        },
      ];

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockVariants, error: null }),
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom);

      const result = await getVariants('session-1');

      expect(result).toEqual(mockVariants);
      expect(result.length).toBe(2);
    });

    it('should return empty array when no variants found', async () => {
      const { getVariants } = await import('./variantCodeService');

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom);

      const result = await getVariants('session-1');
      expect(result).toEqual([]);
    });
  });

  describe('getVariant', () => {
    it('should return variant by ID', async () => {
      const { getVariant } = await import('./variantCodeService');

      const mockVariant = {
        id: 'var-1',
        session_id: 'session-1',
        plan_id: 'plan-1',
        variant_index: 1,
        html_path: '/path/1.html',
        css_path: null,
        screenshot_path: null,
        html_url: 'https://url/1.html',
        css_url: null,
        screenshot_url: null,
        generation_model: 'claude',
        generation_duration_ms: 5000,
        token_count: null,
        status: 'complete',
        error_message: null,
        created_at: '',
        updated_at: '',
      };

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockVariant, error: null }),
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom);

      const result = await getVariant('var-1');
      expect(result).toEqual(mockVariant);
    });

    it('should return null when variant not found', async () => {
      const { getVariant } = await import('./variantCodeService');

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116', message: 'Not found' },
        }),
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom);

      const result = await getVariant('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('generateVariantCode', () => {
    it('should call Edge Function and return variant', async () => {
      const { generateVariantCode } = await import('./variantCodeService');

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

      const mockVariant = {
        id: 'var-1',
        session_id: 'session-1',
        plan_id: 'plan-1',
        variant_index: 1,
        html_path: '/path/1.html',
        css_path: null,
        screenshot_path: null,
        html_url: 'https://url/1.html',
        css_url: null,
        screenshot_url: null,
        generation_model: 'claude',
        generation_duration_ms: 5000,
        token_count: null,
        status: 'complete',
        error_message: null,
        created_at: '',
        updated_at: '',
      };

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: {
          success: true,
          variant: mockVariant,
          htmlUrl: 'https://url/1.html',
          durationMs: 5000,
        },
        error: null,
      });

      const mockPlan = {
        id: 'plan-1',
        session_id: 'session-1',
        variant_index: 1,
        title: 'Conservative',
        description: 'A conservative approach',
        key_changes: ['Change 1', 'Change 2'],
        style_notes: 'Keep existing colors',
        created_at: '',
      };

      const result = await generateVariantCode(
        'session-1',
        mockPlan,
        '<html></html>'
      );

      expect(result).toEqual(mockVariant);
      expect(supabase.functions.invoke).toHaveBeenCalledWith('generate-variant-code', expect.any(Object));
    });

    it('should throw error when not authenticated', async () => {
      const { generateVariantCode } = await import('./variantCodeService');

      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const mockPlan = {
        id: 'plan-1',
        session_id: 'session-1',
        variant_index: 1,
        title: 'Test',
        description: 'Test',
        key_changes: [],
        style_notes: null,
        created_at: '',
      };

      await expect(
        generateVariantCode('session-1', mockPlan, '<html></html>')
      ).rejects.toThrow('Not authenticated');
    });
  });

  describe('selectVariant', () => {
    it('should update session with selected variant', async () => {
      const { selectVariant } = await import('./variantCodeService');

      const mockFrom = vi.fn().mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom);

      const result = await selectVariant('session-1', 2);

      expect(result).toBe(true);
      expect(mockFrom).toHaveBeenCalledWith('vibe_sessions');
    });

    it('should return false on error', async () => {
      const { selectVariant } = await import('./variantCodeService');

      const mockFrom = vi.fn().mockReturnValue({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Update failed' },
        }),
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom);

      const result = await selectVariant('session-1', 2);
      expect(result).toBe(false);
    });
  });

  describe('deleteVariant', () => {
    it('should delete variant and its files', async () => {
      const { deleteVariant } = await import('./variantCodeService');

      const mockVariant = {
        id: 'var-1',
        session_id: 'session-1',
        plan_id: 'plan-1',
        variant_index: 1,
        html_path: '/path/1.html',
        css_path: '/path/1.css',
        screenshot_path: '/path/1.png',
        html_url: 'https://url/1.html',
        css_url: 'https://url/1.css',
        screenshot_url: 'https://url/1.png',
        generation_model: 'claude',
        generation_duration_ms: 5000,
        token_count: null,
        status: 'complete',
        error_message: null,
        created_at: '',
        updated_at: '',
      };

      // Mock getting variant
      const mockFromSelect = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockVariant, error: null }),
      });

      const mockFromDelete = vi.fn().mockReturnValue({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      });

      vi.mocked(supabase.from)
        .mockImplementationOnce(mockFromSelect)
        .mockImplementationOnce(mockFromDelete);

      vi.mocked(supabase.storage.from).mockReturnValue({
        remove: vi.fn().mockResolvedValue({ data: null, error: null }),
      } as any);

      const result = await deleteVariant('var-1');

      expect(result).toBe(true);
    });

    it('should return false when variant not found', async () => {
      const { deleteVariant } = await import('./variantCodeService');

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116', message: 'Not found' },
        }),
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom);

      const result = await deleteVariant('nonexistent');
      expect(result).toBe(false);
    });
  });

  describe('fetchVariantHtml', () => {
    it('should fetch HTML content from URL', async () => {
      const { fetchVariantHtml } = await import('./variantCodeService');

      const mockHtml = '<!DOCTYPE html><html><body>Test</body></html>';

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: vi.fn().mockResolvedValue(mockHtml),
      });

      const result = await fetchVariantHtml('https://example.com/variant.html');

      expect(result).toBe(mockHtml);
      expect(fetch).toHaveBeenCalledWith('https://example.com/variant.html');
    });

    it('should throw error on fetch failure', async () => {
      const { fetchVariantHtml } = await import('./variantCodeService');

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });

      await expect(fetchVariantHtml('https://example.com/nonexistent.html')).rejects.toThrow(
        'Failed to fetch variant HTML'
      );
    });
  });
});
