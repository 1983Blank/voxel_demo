/**
 * Variant Code Service
 * Generates HTML/CSS code for variants and manages storage
 */

import { supabase, isSupabaseConfigured } from './supabase';
import type { UIMetadata } from './screenAnalyzerService';
import type { VariantPlan } from './variantPlanService';

// Types
export interface VibeVariant {
  id: string;
  session_id: string;
  plan_id: string;
  variant_index: number;
  html_path: string;
  css_path: string | null;
  screenshot_path: string | null;
  html_url: string;
  css_url: string | null;
  screenshot_url: string | null;
  generation_model: string | null;
  generation_duration_ms: number | null;
  token_count: number | null;
  status: 'pending' | 'generating' | 'capturing' | 'complete' | 'failed';
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface GenerationProgress {
  stage: 'queued' | 'generating' | 'uploading' | 'complete' | 'failed';
  message: string;
  percent: number;
  variantIndex: number;
  title?: string;
}

type ProgressCallback = (progress: GenerationProgress) => void;

/**
 * Get all variants for a session
 */
export async function getVariants(sessionId: string): Promise<VibeVariant[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const { data, error } = await supabase
    .from('vibe_variants')
    .select('*')
    .eq('session_id', sessionId)
    .order('variant_index', { ascending: true });

  if (error) {
    console.error('Error fetching variants:', error);
    return [];
  }

  return (data as VibeVariant[]) || [];
}

/**
 * Get a single variant by ID
 */
export async function getVariant(variantId: string): Promise<VibeVariant | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const { data, error } = await supabase
    .from('vibe_variants')
    .select('*')
    .eq('id', variantId)
    .single();

  if (error) {
    console.error('Error fetching variant:', error);
    return null;
  }

  return data as VibeVariant;
}

/**
 * Generate code for a single variant
 */
export async function generateVariantCode(
  sessionId: string,
  plan: VariantPlan,
  sourceHtml: string,
  uiMetadata?: UIMetadata,
  productContext?: string,
  onProgress?: ProgressCallback
): Promise<VibeVariant> {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase not configured');
  }

  // Get session for auth token
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Not authenticated');
  }

  // Progress: Generating
  onProgress?.({
    stage: 'generating',
    message: `Generating "${plan.title}"...`,
    percent: 30,
    variantIndex: plan.variant_index,
    title: plan.title,
  });

  // Call Edge Function
  const { data, error } = await supabase.functions.invoke('generate-variant-code', {
    body: {
      sessionId,
      planId: plan.id,
      variantIndex: plan.variant_index,
      plan: {
        title: plan.title,
        description: plan.description,
        keyChanges: plan.key_changes,
        styleNotes: plan.style_notes,
      },
      sourceHtml,
      uiMetadata,
      productContext,
    },
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (error) {
    onProgress?.({
      stage: 'failed',
      message: `Failed: ${error.message}`,
      percent: 100,
      variantIndex: plan.variant_index,
      title: plan.title,
    });
    throw new Error(error.message || 'Failed to generate variant code');
  }

  if (!data.success) {
    onProgress?.({
      stage: 'failed',
      message: `Failed: ${data.error}`,
      percent: 100,
      variantIndex: plan.variant_index,
      title: plan.title,
    });
    throw new Error(data.error || 'Code generation failed');
  }

  // Progress: Complete
  onProgress?.({
    stage: 'complete',
    message: `Variant ${plan.variant_index} complete!`,
    percent: 100,
    variantIndex: plan.variant_index,
    title: plan.title,
  });

  return data.variant;
}

/**
 * Generate code for all variants sequentially
 * Shows progress as each variant completes
 */
export async function generateAllVariants(
  sessionId: string,
  plans: VariantPlan[],
  sourceHtml: string,
  uiMetadata?: UIMetadata,
  productContext?: string,
  onProgress?: ProgressCallback
): Promise<VibeVariant[]> {
  const variants: VibeVariant[] = [];
  const totalPlans = plans.length;

  for (let i = 0; i < totalPlans; i++) {
    const plan = plans[i];

    // Progress: Starting this variant
    onProgress?.({
      stage: 'generating',
      message: `Generating "${plan.title}" (${i + 1}/${totalPlans})...`,
      percent: Math.round((i / totalPlans) * 100),
      variantIndex: plan.variant_index,
      title: plan.title,
    });

    try {
      const variant = await generateVariantCode(
        sessionId,
        plan,
        sourceHtml,
        uiMetadata,
        productContext,
        (progress) => {
          // Adjust percent for overall progress
          const basePercent = (i / totalPlans) * 100;
          const variantProgress = (progress.percent / 100) * (100 / totalPlans);
          onProgress?.({
            ...progress,
            percent: Math.round(basePercent + variantProgress),
          });
        }
      );
      variants.push(variant);
    } catch (error) {
      console.error(`Failed to generate variant ${plan.variant_index}:`, error);
      // Continue with other variants
      onProgress?.({
        stage: 'failed',
        message: `Variant ${plan.variant_index} failed, continuing...`,
        percent: Math.round(((i + 1) / totalPlans) * 100),
        variantIndex: plan.variant_index,
        title: plan.title,
      });
    }
  }

  return variants;
}

/**
 * Get variant HTML content from URL
 */
export async function fetchVariantHtml(htmlUrl: string): Promise<string> {
  const response = await fetch(htmlUrl);
  if (!response.ok) {
    throw new Error('Failed to fetch variant HTML');
  }
  return response.text();
}

/**
 * Select a variant as the winner
 */
export async function selectVariant(sessionId: string, variantIndex: number): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    return false;
  }

  const { error } = await supabase
    .from('vibe_sessions')
    .update({ selected_variant_index: variantIndex })
    .eq('id', sessionId);

  if (error) {
    console.error('Error selecting variant:', error);
    return false;
  }

  return true;
}

/**
 * Delete a variant (and its files from storage)
 */
export async function deleteVariant(variantId: string): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    return false;
  }

  // Get variant to find file paths
  const variant = await getVariant(variantId);
  if (!variant) {
    return false;
  }

  // Delete files from storage
  const filesToDelete = [variant.html_path, variant.css_path, variant.screenshot_path].filter(Boolean) as string[];

  if (filesToDelete.length > 0) {
    const { error: storageError } = await supabase.storage
      .from('vibe-files')
      .remove(filesToDelete);

    if (storageError) {
      console.error('Error deleting variant files:', storageError);
    }
  }

  // Delete database record
  const { error } = await supabase
    .from('vibe_variants')
    .delete()
    .eq('id', variantId);

  if (error) {
    console.error('Error deleting variant:', error);
    return false;
  }

  return true;
}

/**
 * Get full session data with plans and variants
 */
export async function getFullSession(sessionId: string): Promise<{
  session: import('./variantPlanService').VibeSession;
  plans: VariantPlan[];
  variants: VibeVariant[];
  metadata: import('./screenAnalyzerService').ScreenUIMetadata | null;
} | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  // Use the database function for efficient fetching
  const { data, error } = await supabase.rpc('get_vibe_session_full', {
    p_session_id: sessionId,
  });

  if (error) {
    console.error('Error fetching full session:', error);
    return null;
  }

  if (!data || !data.session) {
    return null;
  }

  return {
    session: data.session,
    plans: data.plans || [],
    variants: data.variants || [],
    metadata: data.screen_metadata || null,
  };
}
