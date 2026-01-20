/**
 * Tests for screenAnalyzerService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from './supabase';

// Import types
import type { UIMetadata, UIColors, UITypography, UILayout, UIComponent, UIAccessibility } from './screenAnalyzerService';

// Mock the supabase module before importing the service
vi.mock('./supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
    from: vi.fn(),
    functions: {
      invoke: vi.fn(),
    },
  },
  isSupabaseConfigured: vi.fn().mockReturnValue(true),
}));

describe('screenAnalyzerService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('UIMetadata structure', () => {
    it('should have correct UIColors shape', () => {
      const colors: UIColors = {
        primary: ['#1890ff'],
        secondary: ['#52c41a'],
        background: ['#ffffff'],
        text: ['#000000'],
        accent: ['#faad14'],
      };

      expect(colors.primary).toBeInstanceOf(Array);
      expect(colors.secondary).toBeInstanceOf(Array);
      expect(colors.background).toBeInstanceOf(Array);
      expect(colors.text).toBeInstanceOf(Array);
      expect(colors.accent).toBeInstanceOf(Array);
    });

    it('should have correct UITypography shape', () => {
      const typography: UITypography = {
        fontFamilies: ['Arial', 'Helvetica'],
        fontSizes: ['14px', '16px', '24px'],
        fontWeights: ['400', '600', '700'],
        lineHeights: ['1.5', '1.6'],
      };

      expect(typography.fontFamilies).toBeInstanceOf(Array);
      expect(typography.fontSizes).toBeInstanceOf(Array);
      expect(typography.fontWeights).toBeInstanceOf(Array);
      expect(typography.lineHeights).toBeInstanceOf(Array);
    });

    it('should have correct UILayout shape', () => {
      const layout: UILayout = {
        containerWidths: ['1200px', '960px'],
        gridSystems: ['CSS Grid', 'Flexbox'],
        spacing: ['8px', '16px', '24px'],
        breakpoints: ['768px', '1024px'],
      };

      expect(layout.containerWidths).toBeInstanceOf(Array);
      expect(layout.gridSystems).toBeInstanceOf(Array);
      expect(layout.spacing).toBeInstanceOf(Array);
      expect(layout.breakpoints).toBeInstanceOf(Array);
    });

    it('should have correct UIComponent shape', () => {
      const component: UIComponent = {
        type: 'button',
        count: 5,
        examples: ['<button>Click</button>'],
      };

      expect(component.type).toBe('button');
      expect(component.count).toBe(5);
      expect(component.examples).toBeInstanceOf(Array);
    });

    it('should have correct UIAccessibility shape', () => {
      const accessibility: UIAccessibility = {
        hasAriaLabels: true,
        hasAltText: true,
        semanticElements: ['header', 'main', 'footer'],
        contrastIssues: [],
      };

      expect(accessibility.hasAriaLabels).toBe(true);
      expect(accessibility.hasAltText).toBe(true);
      expect(accessibility.semanticElements).toBeInstanceOf(Array);
      expect(accessibility.contrastIssues).toBeInstanceOf(Array);
    });

    it('should have correct full UIMetadata shape', () => {
      const metadata: UIMetadata = {
        colors: {
          primary: ['#1890ff'],
          secondary: ['#52c41a'],
          background: ['#ffffff'],
          text: ['#000000'],
          accent: ['#faad14'],
        },
        typography: {
          fontFamilies: ['Arial'],
          fontSizes: ['14px'],
          fontWeights: ['400'],
          lineHeights: ['1.5'],
        },
        layout: {
          containerWidths: ['1200px'],
          gridSystems: ['Flexbox'],
          spacing: ['16px'],
          breakpoints: ['768px'],
        },
        components: [{ type: 'button', count: 3, examples: [] }],
        accessibility: {
          hasAriaLabels: true,
          hasAltText: true,
          semanticElements: ['header'],
          contrastIssues: [],
        },
      };

      expect(metadata.colors).toBeDefined();
      expect(metadata.typography).toBeDefined();
      expect(metadata.layout).toBeDefined();
      expect(metadata.components).toBeInstanceOf(Array);
      expect(metadata.accessibility).toBeDefined();
    });
  });

  describe('analyzeScreen', () => {
    it('should throw error when not authenticated', async () => {
      const { analyzeScreen } = await import('./screenAnalyzerService');

      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null,
      });

      await expect(analyzeScreen('screen-1', '<html></html>')).rejects.toThrow('Not authenticated');
    });

    it('should call Edge Function with correct parameters', async () => {
      const { analyzeScreen } = await import('./screenAnalyzerService');

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

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: {
          success: true,
          metadata: {
            colors: { primary: [], secondary: [], background: [], text: [], accent: [] },
            typography: { fontFamilies: [], fontSizes: [], fontWeights: [], lineHeights: [] },
            layout: { containerWidths: [], gridSystems: [], spacing: [], breakpoints: [] },
            components: [],
            accessibility: { hasAriaLabels: false, hasAltText: false, semanticElements: [], contrastIssues: [] },
          },
          screenshotUrl: 'https://screenshot.url',
        },
        error: null,
      });

      const result = await analyzeScreen('screen-1', '<html><body>Test</body></html>');

      expect(supabase.functions.invoke).toHaveBeenCalledWith('analyze-screen', {
        body: {
          screenId: 'screen-1',
          html: '<html><body>Test</body></html>',
        },
        headers: {
          Authorization: 'Bearer test-token',
        },
      });

      expect(result.metadata).toBeDefined();
      expect(result.screenshotUrl).toBe('https://screenshot.url');
    });

    it('should throw error on Edge Function failure', async () => {
      const { analyzeScreen } = await import('./screenAnalyzerService');

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

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: { success: false, error: 'Analysis failed' },
        error: null,
      });

      await expect(analyzeScreen('screen-1', '<html></html>')).rejects.toThrow('Analysis failed');
    });
  });

  describe('getCachedMetadata', () => {
    it('should return null when no metadata found', async () => {
      const { getCachedMetadata } = await import('./screenAnalyzerService');

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116', message: 'No rows found' },
        }),
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom);

      const result = await getCachedMetadata('screen-1');
      expect(result).toBeNull();
    });

    it('should return metadata when found', async () => {
      const { getCachedMetadata } = await import('./screenAnalyzerService');

      const mockMetadata = {
        id: 'meta-1',
        screen_id: 'screen-1',
        colors: {},
        typography: {},
        layout: {},
        components: [],
        accessibility: {},
        screenshot_url: 'https://screenshot.url',
        analyzed_at: '2024-01-01T00:00:00Z',
        analysis_model: null,
        html_size_bytes: 1024,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockMetadata,
          error: null,
        }),
      });

      vi.mocked(supabase.from).mockImplementation(mockFrom);

      const result = await getCachedMetadata('screen-1');
      expect(result).toEqual(mockMetadata);
    });
  });
});
