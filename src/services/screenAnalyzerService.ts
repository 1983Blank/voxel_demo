/**
 * Screen Analyzer Service
 * Analyzes screens to extract UI metadata (colors, typography, layout, components, accessibility)
 */

import { supabase, isSupabaseConfigured } from './supabase';

// Types
export interface UIColors {
  primary: string[];
  secondary: string[];
  background: string[];
  text: string[];
  accent: string[];
}

export interface UITypography {
  fontFamilies: string[];
  fontSizes: string[];
  fontWeights: string[];
  lineHeights: string[];
}

export interface UILayout {
  containerWidths: string[];
  gridSystems: string[];
  spacing: string[];
  breakpoints: string[];
}

export interface UIComponent {
  type: string;
  count: number;
  examples: string[];
}

export interface UIAccessibility {
  hasAriaLabels: boolean;
  hasAltText: boolean;
  semanticElements: string[];
  contrastIssues: string[];
}

export interface UIMetadata {
  colors: UIColors;
  typography: UITypography;
  layout: UILayout;
  components: UIComponent[];
  accessibility: UIAccessibility;
}

export interface ScreenUIMetadata {
  id: string;
  screen_id: string;
  colors: UIColors;
  typography: UITypography;
  layout: UILayout;
  components: UIComponent[];
  accessibility: UIAccessibility;
  screenshot_url: string | null;
  analyzed_at: string;
  analysis_model: string | null;
  html_size_bytes: number | null;
  created_at: string;
  updated_at: string;
}

export interface AnalysisProgress {
  stage: 'preparing' | 'rendering' | 'extracting' | 'saving' | 'complete';
  message: string;
  percent: number;
}

type ProgressCallback = (progress: AnalysisProgress) => void;

/**
 * Analyze a screen and extract UI metadata
 */
export async function analyzeScreen(
  screenId: string,
  html: string,
  onProgress?: ProgressCallback
): Promise<{ metadata: UIMetadata; screenshotUrl: string | null }> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase not configured');
  }

  // Get session for auth token
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Not authenticated');
  }

  // Progress: Preparing
  onProgress?.({
    stage: 'preparing',
    message: 'Preparing HTML for analysis...',
    percent: 10,
  });

  // Progress: Rendering
  onProgress?.({
    stage: 'rendering',
    message: 'Rendering screenshot...',
    percent: 30,
  });

  // Call Edge Function
  const { data, error } = await supabase.functions.invoke('analyze-screen', {
    body: {
      screenId,
      html,
    },
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (error) {
    throw new Error(error.message || 'Failed to analyze screen');
  }

  if (!data.success) {
    throw new Error(data.error || 'Analysis failed');
  }

  // Progress: Extracting
  onProgress?.({
    stage: 'extracting',
    message: 'Extracting colors and typography...',
    percent: 70,
  });

  // Progress: Saving
  onProgress?.({
    stage: 'saving',
    message: 'Saving analysis results...',
    percent: 90,
  });

  // Progress: Complete
  onProgress?.({
    stage: 'complete',
    message: 'Analysis complete!',
    percent: 100,
  });

  return {
    metadata: data.metadata,
    screenshotUrl: data.screenshotUrl,
  };
}

/**
 * Get cached UI metadata for a screen
 */
export async function getCachedMetadata(screenId: string): Promise<ScreenUIMetadata | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const { data, error } = await supabase
    .from('screen_ui_metadata')
    .select('*')
    .eq('screen_id', screenId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows found
      return null;
    }
    console.error('Error fetching cached metadata:', error);
    return null;
  }

  return data as ScreenUIMetadata;
}

/**
 * Check if a screen has cached metadata
 */
export async function hasMetadata(screenId: string): Promise<boolean> {
  const metadata = await getCachedMetadata(screenId);
  return metadata !== null;
}

/**
 * Delete cached metadata for a screen (to force re-analysis)
 */
export async function clearMetadata(screenId: string): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    return false;
  }

  const { error } = await supabase
    .from('screen_ui_metadata')
    .delete()
    .eq('screen_id', screenId);

  if (error) {
    console.error('Error clearing metadata:', error);
    return false;
  }

  return true;
}
