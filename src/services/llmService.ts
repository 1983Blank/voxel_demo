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
  provider?: LLMProvider; // Selected provider for generation
  model?: string; // Selected model for generation
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
  console.log('[LLM] 🔍 getLLMConfigAsync: Starting to fetch LLM configuration...');

  // Check environment variables first (for production/testing)
  const envApiKey = import.meta.env.VITE_ANTHROPIC_API_KEY || import.meta.env.VITE_OPENAI_API_KEY;
  const envProvider: LLMProvider = import.meta.env.VITE_ANTHROPIC_API_KEY ? 'anthropic' : 'openai';

  if (envApiKey) {
    console.log('[LLM] ✅ Found API key in environment variables:', { provider: envProvider, keyLength: envApiKey.length });
    return {
      provider: envProvider,
      apiKey: envApiKey,
      model: DEFAULT_MODELS[envProvider],
    };
  }

  console.log('[LLM] 📡 No env vars, checking Supabase for active provider...');

  // Get active provider from Supabase
  const activeProvider = await getActiveProvider();
  console.log('[LLM] 📡 getActiveProvider result:', activeProvider);

  if (!activeProvider) {
    console.log('[LLM] ❌ No active provider found in Supabase');
    return null;
  }

  // Get the decrypted API key from Supabase Vault
  console.log('[LLM] 🔐 Fetching decrypted API key for provider:', activeProvider);
  const apiKey = await getDecryptedApiKey(activeProvider);
  console.log('[LLM] 🔐 getDecryptedApiKey result:', apiKey ? `Key found (${apiKey.length} chars, starts with ${apiKey.substring(0, 10)}...)` : 'null');

  if (!apiKey) {
    console.log('[LLM] ❌ No API key found for provider:', activeProvider);
    return null;
  }

  // Get the model configuration
  const keyConfig = await getActiveKeyConfig(activeProvider);
  console.log('[LLM] ⚙️ getActiveKeyConfig result:', keyConfig);

  const config = {
    provider: activeProvider,
    apiKey,
    model: keyConfig?.model || DEFAULT_MODELS[activeProvider],
  };

  console.log('[LLM] ✅ Final LLM config:', { provider: config.provider, model: config.model, keyLength: config.apiKey.length });
  return config;
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
  console.log('[LLM] 🤖 generateWithAnthropic: Starting Anthropic API call...');
  console.log('[LLM] 🤖 Model:', config.model || DEFAULT_MODELS.anthropic);
  console.log('[LLM] 🤖 System prompt:', SYSTEM_PROMPT);

  const userMessage = buildUserMessage(request);

  const requestBody = {
    model: config.model || DEFAULT_MODELS.anthropic,
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: userMessage,
      },
    ],
  };

  console.log('[LLM] 🚀 Sending request to Anthropic API...');
  console.log('[LLM] 🚀 Request body (truncated):', JSON.stringify({ ...requestBody, messages: [{ role: 'user', content: userMessage.substring(0, 200) + '...' }] }, null, 2));

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify(requestBody),
    });

    console.log('[LLM] 📥 Response status:', response.status, response.statusText);

    if (!response.ok) {
      const error = await response.json();
      console.log('[LLM] ❌ API Error response:', error);
      throw new Error(error.error?.message || 'Anthropic API error');
    }

    const data = await response.json();
    console.log('[LLM] ✅ API Success! Response structure:', Object.keys(data));
    console.log('[LLM] ✅ Content type:', data.content?.[0]?.type);
    console.log('[LLM] ✅ Response text length:', data.content?.[0]?.text?.length || 0);
    console.log('[LLM] ✅ Response preview:', (data.content?.[0]?.text || '').substring(0, 500) + '...');

    const html = data.content[0]?.text || '';
    const cleanedHtml = cleanHtmlResponse(html);
    console.log('[LLM] ✅ Cleaned HTML length:', cleanedHtml.length);

    return {
      html: cleanedHtml,
      success: true,
    };
  } catch (error) {
    console.log('[LLM] ❌ Exception caught:', error);
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
  console.log('[LLM] 🤖 generateWithOpenAI: Starting OpenAI API call...');
  console.log('[LLM] 🤖 Model:', config.model || DEFAULT_MODELS.openai);
  console.log('[LLM] 🤖 System prompt:', SYSTEM_PROMPT);

  const userMessage = buildUserMessage(request);

  console.log('[LLM] 🚀 Sending request to OpenAI API...');

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

    console.log('[LLM] 📥 Response status:', response.status, response.statusText);

    if (!response.ok) {
      const error = await response.json();
      console.log('[LLM] ❌ API Error response:', error);
      throw new Error(error.error?.message || 'OpenAI API error');
    }

    const data = await response.json();
    console.log('[LLM] ✅ API Success! Response structure:', Object.keys(data));
    console.log('[LLM] ✅ Response text length:', data.choices?.[0]?.message?.content?.length || 0);
    console.log('[LLM] ✅ Response preview:', (data.choices?.[0]?.message?.content || '').substring(0, 500) + '...');

    const html = data.choices[0]?.message?.content || '';
    const cleanedHtml = cleanHtmlResponse(html);
    console.log('[LLM] ✅ Cleaned HTML length:', cleanedHtml.length);

    return {
      html: cleanedHtml,
      success: true,
    };
  } catch (error) {
    console.log('[LLM] ❌ Exception caught:', error);
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
  console.log('[LLM] 📝 Building user message...');
  console.log('[LLM] 📝 User prompt:', request.prompt);
  console.log('[LLM] 📝 Has context:', !!request.context);
  console.log('[LLM] 📝 Current HTML length:', request.currentHtml.length, 'chars');
  console.log('[LLM] 📝 Current HTML preview:', request.currentHtml.substring(0, 500) + '...');

  let message = `User Request: ${request.prompt}\n\n`;

  if (request.context) {
    message += `Product Context:\n${request.context}\n\n`;
  }

  message += `Current HTML:\n\`\`\`html\n${request.currentHtml}\n\`\`\`\n\n`;
  message += `Please modify the HTML according to the user request. Return ONLY the complete modified HTML document.`;

  console.log('[LLM] 📝 Final message length:', message.length, 'chars');
  return message;
}

/**
 * Generate HTML using Google Gemini API
 */
async function generateWithGoogle(
  config: LLMConfig,
  request: GenerationRequest
): Promise<GenerationResponse> {
  console.log('[LLM] 🤖 generateWithGoogle: Starting Google Gemini API call...');
  console.log('[LLM] 🤖 Model:', config.model || DEFAULT_MODELS.google);

  const userMessage = buildUserMessage(request);

  console.log('[LLM] 🚀 Sending request to Google AI API...');

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

    console.log('[LLM] 📥 Response status:', response.status, response.statusText);

    if (!response.ok) {
      const error = await response.json();
      console.log('[LLM] ❌ API Error response:', error);
      throw new Error(error.error?.message || 'Google AI API error');
    }

    const data = await response.json();
    console.log('[LLM] ✅ API Success! Response structure:', Object.keys(data));
    console.log('[LLM] ✅ Response text length:', data.candidates?.[0]?.content?.parts?.[0]?.text?.length || 0);
    console.log('[LLM] ✅ Response preview:', (data.candidates?.[0]?.content?.parts?.[0]?.text || '').substring(0, 500) + '...');

    const html = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const cleanedHtml = cleanHtmlResponse(html);
    console.log('[LLM] ✅ Cleaned HTML length:', cleanedHtml.length);

    return {
      html: cleanedHtml,
      success: true,
    };
  } catch (error) {
    console.log('[LLM] ❌ Exception caught:', error);
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
 * Main generation function - calls Supabase Edge Function
 */
export async function generateHtml(
  request: GenerationRequest
): Promise<GenerationResponse> {
  console.log('[LLM] ========================================');
  console.log('[LLM] 🎯 generateHtml: Starting generation...');
  console.log('[LLM] 🎯 Request prompt:', request.prompt);
  console.log('[LLM] 🎯 Request instruction:', request.instruction);
  console.log('[LLM] 🎯 Has context:', !!request.context);
  console.log('[LLM] 🎯 Current HTML length:', request.currentHtml.length);
  console.log('[LLM] ========================================');

  console.log('[LLM] 📦 Step 1: Importing supabase client...');

  // Import supabase client
  let supabase, isSupabaseConfigured;
  try {
    const supabaseModule = await import('./supabase');
    supabase = supabaseModule.supabase;
    isSupabaseConfigured = supabaseModule.isSupabaseConfigured;
    console.log('[LLM] ✅ Step 1: Supabase client imported successfully');
  } catch (importError) {
    console.log('[LLM] ❌ Step 1: Failed to import supabase:', importError);
    throw importError;
  }

  // Check if Supabase is configured
  console.log('[LLM] 📦 Step 2: Checking Supabase configuration...');
  const supabaseConfigured = isSupabaseConfigured();
  console.log('[LLM] 📦 Step 2: isSupabaseConfigured =', supabaseConfigured);

  if (!supabaseConfigured) {
    console.log('[LLM] ❌ Supabase not configured');
    return {
      html: request.currentHtml,
      success: false,
      error: 'Supabase is not configured. Please check your environment variables.',
    };
  }

  // Get user session for authentication
  console.log('[LLM] 📦 Step 3: Getting user session...');
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  console.log('[LLM] 📦 Step 3: Session result:', { hasSession: !!session, error: sessionError });

  if (sessionError || !session) {
    console.log('[LLM] ❌ No session found:', sessionError);
    return {
      html: request.currentHtml,
      success: false,
      error: 'Please log in to use AI generation.',
    };
  }

  console.log('[LLM] ✅ Step 3: User authenticated');
  console.log('[LLM] 📦 Step 3b: Access token present:', !!session.access_token);
  console.log('[LLM] 📦 Step 3b: Token starts with:', session.access_token?.substring(0, 20) + '...');

  // Pre-check: verify user has an API key configured
  console.log('[LLM] 📦 Step 3c: Checking if API key is configured...');
  try {
    const { hasApiKeyConfigured } = await import('./apiKeysService');
    const hasKey = await hasApiKeyConfigured();
    console.log('[LLM] 📦 Step 3c: Has API key configured:', hasKey);
    if (!hasKey) {
      console.log('[LLM] ❌ No API key configured');
      return {
        html: request.currentHtml,
        success: false,
        error: 'No API key configured. Please add your API key in Settings.',
      };
    }
  } catch (keyCheckError) {
    console.log('[LLM] ⚠️ Could not check API key status:', keyCheckError);
    // Continue anyway, let the Edge Function handle it
  }

  console.log('[LLM] 📦 Step 4: Calling Edge Function...');

  try {
    // Call the Edge Function directly with fetch
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    console.log('[LLM] 📤 Invoking Edge Function generate-html...');
    console.log('[LLM] 📤 Supabase URL:', supabaseUrl);

    const response = await fetch(`${supabaseUrl}/functions/v1/generate-html`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': supabaseAnonKey,
      },
      body: JSON.stringify(request),
    });

    const data = await response.json();
    console.log('[LLM] 📥 Edge Function response:', data);

    if (!response.ok) {
      console.log('[LLM] ❌ Edge Function error:', data);
      return {
        html: request.currentHtml,
        success: false,
        error: data.error || `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    if (!data.success) {
      console.log('[LLM] ❌ Generation failed:', data.error);
      return {
        html: request.currentHtml,
        success: false,
        error: data.error || 'Generation failed',
      };
    }

    console.log('[LLM] ✅ Generation successful, HTML length:', data.html?.length);

    return {
      html: data.html,
      success: true,
    };

  } catch (error) {
    console.log('[LLM] ❌ Exception:', error);
    return {
      html: request.currentHtml,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Direct API call fallback for local development without Edge Functions
 * Exported for potential future use in development mode
 */
export async function generateHtmlDirect(
  request: GenerationRequest
): Promise<GenerationResponse> {
  console.log('[LLM] 🔄 Using direct API call (development mode)...');

  const config = await getLLMConfigAsync();

  if (!config) {
    console.log('[LLM] ❌ No LLM config found');
    return {
      html: request.currentHtml,
      success: false,
      error: 'LLM not configured. Please add your API key in Settings → API Keys.',
    };
  }

  console.log('[LLM] 🔀 Routing to provider:', config.provider);

  let result: GenerationResponse;

  switch (config.provider) {
    case 'anthropic':
      result = await generateWithAnthropic(config, request);
      break;
    case 'openai':
      result = await generateWithOpenAI(config, request);
      break;
    case 'google':
      result = await generateWithGoogle(config, request);
      break;
    default:
      result = {
        html: request.currentHtml,
        success: false,
        error: `Unsupported provider: ${config.provider}`,
      };
  }

  console.log('[LLM] 🏁 Direct generation complete, success:', result.success);
  return result;
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
