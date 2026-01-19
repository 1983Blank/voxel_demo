/**
 * LLM Service for AI-powered prototype generation
 *
 * Supports Anthropic Claude, OpenAI GPT, and Google Gemini models.
 * API keys are securely stored in Supabase Vault.
 */

import {
  getDecryptedApiKey,
  getActiveProvider,
  getActiveKeyConfig,
  type LLMProvider,
} from './apiKeysService';

export interface LLMConfig {
  provider: LLMProvider;
  apiKey: string;
  model?: string;
}

export interface GenerationRequest {
  prompt: string;
  currentHtml: string;
  context?: string; // Product context
  instruction?: 'modify' | 'add' | 'remove' | 'style';
}

export interface GenerationResponse {
  html: string;
  explanation?: string;
  success: boolean;
  error?: string;
}

// Default models
const DEFAULT_MODELS = {
  anthropic: 'claude-sonnet-4-20250514',
  openai: 'gpt-4o',
  google: 'gemini-1.5-pro',
};

// System prompt for HTML generation
const SYSTEM_PROMPT = `You are an expert UI/UX designer and front-end developer. Your task is to modify HTML/CSS based on user instructions.

Rules:
1. Return ONLY the modified HTML - no explanations, no markdown code blocks
2. Preserve the existing structure and styles unless specifically asked to change them
3. Use inline styles for any new elements
4. Make changes that are visually appealing and follow modern design principles
5. Ensure all HTML is valid and well-formed
6. If adding new elements, place them in logical positions within the document

When modifying:
- "Add" means insert new elements
- "Change" or "modify" means alter existing elements
- "Remove" or "delete" means remove elements
- "Style" means only change CSS/styling`;

/**
 * Get LLM configuration from environment or Supabase Vault
 * This is an async function that fetches the decrypted key from Supabase
 */
export async function getLLMConfigAsync(): Promise<LLMConfig | null> {
  // Check environment variables first (for production/testing)
  const envApiKey = import.meta.env.VITE_ANTHROPIC_API_KEY || import.meta.env.VITE_OPENAI_API_KEY;
  const envProvider: LLMProvider = import.meta.env.VITE_ANTHROPIC_API_KEY ? 'anthropic' : 'openai';

  if (envApiKey) {
    return {
      provider: envProvider,
      apiKey: envApiKey,
      model: DEFAULT_MODELS[envProvider],
    };
  }

  // Get active provider from Supabase
  const activeProvider = await getActiveProvider();
  if (!activeProvider) {
    return null;
  }

  // Get the decrypted API key from Supabase Vault
  const apiKey = await getDecryptedApiKey(activeProvider);
  if (!apiKey) {
    return null;
  }

  // Get the model configuration
  const keyConfig = await getActiveKeyConfig(activeProvider);

  return {
    provider: activeProvider,
    apiKey,
    model: keyConfig?.model || DEFAULT_MODELS[activeProvider],
  };
}

/**
 * Synchronous version - checks localStorage cache for quick UI checks
 * For actual API calls, use getLLMConfigAsync
 */
export function getLLMConfig(): LLMConfig | null {
  // Check environment variables first
  const envApiKey = import.meta.env.VITE_ANTHROPIC_API_KEY || import.meta.env.VITE_OPENAI_API_KEY;
  const envProvider: LLMProvider = import.meta.env.VITE_ANTHROPIC_API_KEY ? 'anthropic' : 'openai';

  if (envApiKey) {
    return {
      provider: envProvider,
      apiKey: envApiKey,
      model: DEFAULT_MODELS[envProvider],
    };
  }

  // Check localStorage cache (for quick UI checks)
  const stored = localStorage.getItem('voxel-llm-config');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Save LLM configuration - now redirects to apiKeysService
 * This is kept for backward compatibility with existing code
 */
export async function saveLLMConfig(config: LLMConfig): Promise<void> {
  // Import dynamically to avoid circular dependency
  const { saveApiKey } = await import('./apiKeysService');
  await saveApiKey({
    provider: config.provider,
    apiKey: config.apiKey,
    model: config.model,
  });
}

/**
 * Clear LLM configuration
 */
export async function clearLLMConfig(): Promise<void> {
  localStorage.removeItem('voxel-llm-config');
}

/**
 * Check if LLM is configured (async version for accurate check)
 */
export async function isLLMConfiguredAsync(): Promise<boolean> {
  const config = await getLLMConfigAsync();
  return config !== null;
}

/**
 * Check if LLM is configured (sync version - may be stale)
 */
export function isLLMConfigured(): boolean {
  return getLLMConfig() !== null;
}

/**
 * Generate HTML using Anthropic Claude API
 */
async function generateWithAnthropic(
  config: LLMConfig,
  request: GenerationRequest
): Promise<GenerationResponse> {
  const userMessage = buildUserMessage(request);

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: config.model || DEFAULT_MODELS.anthropic,
        max_tokens: 8192,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: userMessage,
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Anthropic API error');
    }

    const data = await response.json();
    const html = data.content[0]?.text || '';

    return {
      html: cleanHtmlResponse(html),
      success: true,
    };
  } catch (error) {
    return {
      html: request.currentHtml,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Generate HTML using OpenAI API
 */
async function generateWithOpenAI(
  config: LLMConfig,
  request: GenerationRequest
): Promise<GenerationResponse> {
  const userMessage = buildUserMessage(request);

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model || DEFAULT_MODELS.openai,
        max_tokens: 8192,
        messages: [
          {
            role: 'system',
            content: SYSTEM_PROMPT,
          },
          {
            role: 'user',
            content: userMessage,
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'OpenAI API error');
    }

    const data = await response.json();
    const html = data.choices[0]?.message?.content || '';

    return {
      html: cleanHtmlResponse(html),
      success: true,
    };
  } catch (error) {
    return {
      html: request.currentHtml,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Build user message for LLM
 */
function buildUserMessage(request: GenerationRequest): string {
  let message = `User Request: ${request.prompt}\n\n`;

  if (request.context) {
    message += `Product Context:\n${request.context}\n\n`;
  }

  message += `Current HTML:\n\`\`\`html\n${request.currentHtml}\n\`\`\`\n\n`;
  message += `Please modify the HTML according to the user request. Return ONLY the complete modified HTML document.`;

  return message;
}

/**
 * Generate HTML using Google Gemini API
 */
async function generateWithGoogle(
  config: LLMConfig,
  request: GenerationRequest
): Promise<GenerationResponse> {
  const userMessage = buildUserMessage(request);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${config.model || DEFAULT_MODELS.google}:generateContent?key=${config.apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: SYSTEM_PROMPT + '\n\n' + userMessage },
              ],
            },
          ],
          generationConfig: {
            maxOutputTokens: 8192,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Google AI API error');
    }

    const data = await response.json();
    const html = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return {
      html: cleanHtmlResponse(html),
      success: true,
    };
  } catch (error) {
    return {
      html: request.currentHtml,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Clean HTML response from LLM (remove markdown code blocks if present)
 */
function cleanHtmlResponse(html: string): string {
  // Remove markdown code blocks if present
  let cleaned = html.trim();

  if (cleaned.startsWith('```html')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }

  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }

  return cleaned.trim();
}

/**
 * Main generation function - routes to appropriate provider
 */
export async function generateHtml(
  request: GenerationRequest
): Promise<GenerationResponse> {
  // Use async version to get the latest config from Supabase
  const config = await getLLMConfigAsync();

  if (!config) {
    return {
      html: request.currentHtml,
      success: false,
      error: 'LLM not configured. Please add your API key in Settings → API Keys.',
    };
  }

  switch (config.provider) {
    case 'anthropic':
      return generateWithAnthropic(config, request);
    case 'openai':
      return generateWithOpenAI(config, request);
    case 'google':
      return generateWithGoogle(config, request);
    default:
      return {
        html: request.currentHtml,
        success: false,
        error: `Unsupported provider: ${config.provider}`,
      };
  }
}

/**
 * Test LLM connection
 */
export async function testLLMConnection(): Promise<{ success: boolean; error?: string }> {
  const config = await getLLMConfigAsync();

  if (!config) {
    return { success: false, error: 'No API key configured' };
  }

  try {
    const response = await generateHtml({
      prompt: 'Say "OK" if you can read this',
      currentHtml: '<div>Test</div>',
    });

    return { success: response.success, error: response.error };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Connection failed',
    };
  }
}
