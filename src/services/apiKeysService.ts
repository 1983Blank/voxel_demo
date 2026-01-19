/**
 * API Keys Service
 * Securely manages LLM API keys using Supabase Vault
 */

import { supabase, isSupabaseConfigured } from './supabase';

export type LLMProvider = 'anthropic' | 'openai' | 'google';

export interface ApiKeyConfig {
  id: string;
  provider: LLMProvider;
  keyName: string;
  model: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // Note: The actual API key is never returned to the client after storage
  // Only a masked preview is available
  maskedKey?: string;
}

export interface SaveApiKeyParams {
  provider: LLMProvider;
  apiKey: string;
  keyName?: string;
  model?: string;
}

// Provider display info with latest models (2025)
export const PROVIDER_INFO: Record<LLMProvider, { name: string; models: string[]; defaultModel: string; keyPrefix: string; description: string }> = {
  anthropic: {
    name: 'Anthropic',
    models: [
      'claude-sonnet-4-20250514',
      'claude-opus-4-20250514',
      'claude-3-7-sonnet-20250219',
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022',
    ],
    defaultModel: 'claude-sonnet-4-20250514',
    keyPrefix: 'sk-ant-',
    description: 'Best for creative and nuanced responses. Claude 4 Sonnet offers excellent quality-to-speed ratio.',
  },
  openai: {
    name: 'OpenAI',
    models: [
      'gpt-4.1',
      'gpt-4.1-mini',
      'gpt-4.1-nano',
      'gpt-4o',
      'gpt-4o-mini',
      'o1',
      'o1-mini',
      'o3-mini',
    ],
    defaultModel: 'gpt-4.1',
    keyPrefix: 'sk-',
    description: 'Versatile and widely-used. GPT-4.1 provides great performance across various tasks.',
  },
  google: {
    name: 'Google AI',
    models: [
      'gemini-2.0-flash',
      'gemini-2.0-flash-lite',
      'gemini-1.5-pro',
      'gemini-1.5-flash',
      'gemini-1.5-flash-8b',
    ],
    defaultModel: 'gemini-2.0-flash',
    keyPrefix: 'AIza',
    description: 'Google\'s latest models with strong multimodal capabilities and competitive pricing.',
  },
};

/**
 * Get all API keys for the current user (without the actual key values)
 */
export async function getApiKeys(): Promise<ApiKeyConfig[]> {
  if (!isSupabaseConfigured()) {
    // Return from localStorage for development
    const stored = localStorage.getItem('voxel-api-keys');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return [];
      }
    }
    return [];
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('user_api_key_refs')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching API keys:', error);
    throw new Error(`Failed to fetch API keys: ${error.message}`);
  }

  return (data || []).map(row => ({
    id: row.id,
    provider: row.provider as LLMProvider,
    keyName: row.key_name,
    model: row.model,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

/**
 * Save an API key to the vault
 */
export async function saveApiKey(params: SaveApiKeyParams): Promise<void> {
  const { provider, apiKey, keyName = 'Default', model } = params;

  // Validate API key format
  const providerInfo = PROVIDER_INFO[provider];
  if (!apiKey.startsWith(providerInfo.keyPrefix)) {
    throw new Error(`Invalid ${providerInfo.name} API key format. Key should start with "${providerInfo.keyPrefix}"`);
  }

  if (!isSupabaseConfigured()) {
    // Use localStorage for development
    const stored = localStorage.getItem('voxel-api-keys');
    const keys: ApiKeyConfig[] = stored ? JSON.parse(stored) : [];

    // Remove existing key for this provider
    const filtered = keys.filter(k => k.provider !== provider);

    // Add new key
    filtered.push({
      id: `local-${Date.now()}`,
      provider,
      keyName,
      model: model || providerInfo.defaultModel,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      maskedKey: maskApiKey(apiKey),
    });

    localStorage.setItem('voxel-api-keys', JSON.stringify(filtered));

    // Also store the actual key for use (in localStorage for dev only)
    const llmConfig = { provider, apiKey, model: model || providerInfo.defaultModel };
    localStorage.setItem('voxel-llm-config', JSON.stringify(llmConfig));
    return;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('You must be logged in to save API keys');
  }

  // Call the vault function via RPC
  const { error } = await supabase.rpc('store_api_key', {
    p_user_id: user.id,
    p_provider: provider,
    p_api_key: apiKey,
    p_key_name: keyName,
    p_model: model || providerInfo.defaultModel,
  });

  if (error) {
    console.error('Error saving API key:', error);
    throw new Error(`Failed to save API key: ${error.message}`);
  }
}

/**
 * Delete an API key from the vault
 */
export async function deleteApiKey(provider: LLMProvider): Promise<void> {
  if (!isSupabaseConfigured()) {
    // Use localStorage for development
    const stored = localStorage.getItem('voxel-api-keys');
    if (stored) {
      const keys: ApiKeyConfig[] = JSON.parse(stored);
      const filtered = keys.filter(k => k.provider !== provider);
      localStorage.setItem('voxel-api-keys', JSON.stringify(filtered));
    }

    // Also clear the llm config if it matches
    const llmConfig = localStorage.getItem('voxel-llm-config');
    if (llmConfig) {
      const config = JSON.parse(llmConfig);
      if (config.provider === provider) {
        localStorage.removeItem('voxel-llm-config');
      }
    }
    return;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('You must be logged in to delete API keys');
  }

  // Call the vault function via RPC
  const { error } = await supabase.rpc('delete_api_key', {
    p_user_id: user.id,
    p_provider: provider,
  });

  if (error) {
    console.error('Error deleting API key:', error);
    throw new Error(`Failed to delete API key: ${error.message}`);
  }
}

/**
 * Get the decrypted API key for a provider (used internally by LLM service)
 */
export async function getDecryptedApiKey(provider: LLMProvider): Promise<string | null> {
  if (!isSupabaseConfigured()) {
    // Use localStorage for development
    const llmConfig = localStorage.getItem('voxel-llm-config');
    if (llmConfig) {
      const config = JSON.parse(llmConfig);
      if (config.provider === provider) {
        return config.apiKey;
      }
    }
    return null;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase.rpc('get_api_key', {
    p_user_id: user.id,
    p_provider: provider,
  });

  if (error) {
    console.error('Error getting API key:', error);
    return null;
  }

  return data;
}

/**
 * Get the active API key configuration for a provider
 */
export async function getActiveKeyConfig(provider: LLMProvider): Promise<ApiKeyConfig | null> {
  const keys = await getApiKeys();
  return keys.find(k => k.provider === provider && k.isActive) || null;
}

/**
 * Set a provider as the active one for generation
 */
export async function setActiveProvider(provider: LLMProvider): Promise<void> {
  if (!isSupabaseConfigured()) {
    const llmConfig = localStorage.getItem('voxel-llm-config');
    if (llmConfig) {
      const config = JSON.parse(llmConfig);
      config.provider = provider;
      localStorage.setItem('voxel-llm-config', JSON.stringify(config));
    }
    return;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Deactivate all keys first
  await supabase
    .from('user_api_key_refs')
    .update({ is_active: false })
    .eq('user_id', user.id);

  // Activate the selected provider
  await supabase
    .from('user_api_key_refs')
    .update({ is_active: true })
    .eq('user_id', user.id)
    .eq('provider', provider);
}

/**
 * Check if any API key is configured
 */
export async function hasApiKeyConfigured(): Promise<boolean> {
  const keys = await getApiKeys();
  return keys.length > 0;
}

/**
 * Get the first active provider
 */
export async function getActiveProvider(): Promise<LLMProvider | null> {
  const keys = await getApiKeys();
  const active = keys.find(k => k.isActive);
  return active?.provider || (keys.length > 0 ? keys[0].provider : null);
}

/**
 * Mask an API key for display (show first 7 and last 4 chars)
 */
export function maskApiKey(key: string): string {
  if (key.length <= 12) return '••••••••';
  return `${key.slice(0, 7)}••••••••${key.slice(-4)}`;
}

/**
 * Validate API key format for a provider
 */
export function validateApiKeyFormat(provider: LLMProvider, key: string): { valid: boolean; error?: string } {
  const info = PROVIDER_INFO[provider];

  if (!key) {
    return { valid: false, error: 'API key is required' };
  }

  if (!key.startsWith(info.keyPrefix)) {
    return { valid: false, error: `${info.name} keys should start with "${info.keyPrefix}"` };
  }

  if (key.length < 20) {
    return { valid: false, error: 'API key seems too short' };
  }

  return { valid: true };
}
