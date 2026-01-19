// Supabase Edge Function for LLM-powered HTML generation
// Deploy with: supabase functions deploy generate-html

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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
- "Style" means only change CSS/styling`

interface GenerateRequest {
  prompt: string
  currentHtml: string
  context?: string
  instruction?: 'modify' | 'add' | 'remove' | 'style'
  provider?: 'anthropic' | 'openai' | 'google'
  model?: string
}

// Clean HTML response from LLM
function cleanHtmlResponse(html: string): string {
  let cleaned = html.trim()
  if (cleaned.startsWith('```html')) {
    cleaned = cleaned.slice(7)
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3)
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3)
  }
  return cleaned.trim()
}

// Build user message
function buildUserMessage(request: GenerateRequest): string {
  let message = `User Request: ${request.prompt}\n\n`
  if (request.context) {
    message += `Product Context:\n${request.context}\n\n`
  }
  message += `Current HTML:\n\`\`\`html\n${request.currentHtml}\n\`\`\`\n\n`
  message += `Please modify the HTML according to the user request. Return ONLY the complete modified HTML document.`
  return message
}

// Generate with Anthropic
async function generateWithAnthropic(apiKey: string, model: string, request: GenerateRequest) {
  console.log('[Edge] Calling Anthropic API with model:', model)

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: model || 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildUserMessage(request) }],
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    console.log('[Edge] Anthropic error:', error)
    throw new Error(error.error?.message || 'Anthropic API error')
  }

  const data = await response.json()
  console.log('[Edge] Anthropic response received, content length:', data.content?.[0]?.text?.length)
  return cleanHtmlResponse(data.content[0]?.text || '')
}

// Generate with OpenAI
async function generateWithOpenAI(apiKey: string, model: string, request: GenerateRequest) {
  console.log('[Edge] Calling OpenAI API with model:', model)

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || 'gpt-4o',
      max_tokens: 8192,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildUserMessage(request) },
      ],
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    console.log('[Edge] OpenAI error:', error)
    throw new Error(error.error?.message || 'OpenAI API error')
  }

  const data = await response.json()
  console.log('[Edge] OpenAI response received')
  return cleanHtmlResponse(data.choices[0]?.message?.content || '')
}

// Generate with Google
async function generateWithGoogle(apiKey: string, model: string, request: GenerateRequest) {
  console.log('[Edge] Calling Google API with model:', model)

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model || 'gemini-1.5-pro'}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: SYSTEM_PROMPT + '\n\n' + buildUserMessage(request) }] }],
        generationConfig: { maxOutputTokens: 8192 },
      }),
    }
  )

  if (!response.ok) {
    const error = await response.json()
    console.log('[Edge] Google error:', error)
    throw new Error(error.error?.message || 'Google AI API error')
  }

  const data = await response.json()
  console.log('[Edge] Google response received')
  return cleanHtmlResponse(data.candidates?.[0]?.content?.parts?.[0]?.text || '')
}

Deno.serve(async (req) => {
  console.log('[Edge] ======== REQUEST RECEIVED ========')
  console.log('[Edge] Method:', req.method)
  console.log('[Edge] URL:', req.url)
  console.log('[Edge] Headers:', Object.fromEntries(req.headers.entries()))

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    console.log('[Edge] Handling OPTIONS preflight')
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('[Edge] ========================================')
    console.log('[Edge] generate-html function called')

    // Check environment variables first
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    console.log('[Edge] Environment check:')
    console.log('[Edge] - SUPABASE_URL:', supabaseUrl ? 'SET' : 'MISSING')
    console.log('[Edge] - SUPABASE_ANON_KEY:', supabaseAnonKey ? 'SET' : 'MISSING')
    console.log('[Edge] - SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'SET' : 'MISSING')

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables')
    }

    // Get JWT from authorization header
    const authHeader = req.headers.get('Authorization')
    console.log('[Edge] Authorization header:', authHeader ? 'present' : 'MISSING')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Missing or invalid authorization header')
    }
    const jwt = authHeader.replace('Bearer ', '')

    // Service client for all operations
    const supabaseService = createClient(supabaseUrl, supabaseServiceKey)

    // Verify user using service client with the JWT
    const { data: { user }, error: userError } = await supabaseService.auth.getUser(jwt)
    if (userError || !user) {
      console.log('[Edge] Auth error:', userError)
      throw new Error(`Unauthorized: ${userError?.message || 'Invalid token'}`)
    }
    console.log('[Edge] User authenticated:', user.id)

    // Parse request body
    const body: GenerateRequest = await req.json()
    console.log('[Edge] Request:', {
      promptLength: body.prompt?.length,
      htmlLength: body.currentHtml?.length,
      hasContext: !!body.context,
      instruction: body.instruction,
    })

    // Get user's active API key configuration
    console.log('[Edge] Querying user_api_key_refs for user_id:', user.id)

    // First, let's see ALL keys for this user (without is_active filter)
    const { data: allKeys, error: allKeysError } = await supabaseService
      .from('user_api_key_refs')
      .select('*')
      .eq('user_id', user.id)

    console.log('[Edge] All keys for user:', { count: allKeys?.length, keys: allKeys, error: allKeysError })

    // Check if a specific provider was requested
    const requestedProvider = body.provider

    let keyQuery = supabaseService
      .from('user_api_key_refs')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)

    // If provider specified, filter by it; otherwise just get the first active one
    if (requestedProvider) {
      keyQuery = keyQuery.eq('provider', requestedProvider)
    }

    const { data: keyConfigs, error: keyError } = await keyQuery.limit(1)
    const keyConfig = keyConfigs?.[0]

    if (keyError || !keyConfig) {
      console.log('[Edge] No API key found:', keyError)
      console.log('[Edge] keyConfig value:', keyConfig)
      throw new Error('No API key configured. Please add your API key in Settings.')
    }
    // Use requested model if provided, otherwise fall back to stored model
    const modelToUse = body.model || keyConfig.model
    console.log('[Edge] Found API key config:', { provider: keyConfig.provider, storedModel: keyConfig.model })
    console.log('[Edge] Using model:', modelToUse, body.model ? '(from request)' : '(from config)')

    // Get decrypted API key using the database function
    const { data: apiKey, error: decryptError } = await supabaseService
      .rpc('get_api_key', { p_user_id: user.id, p_provider: keyConfig.provider })

    if (decryptError || !apiKey) {
      console.log('[Edge] Failed to decrypt API key:', decryptError)
      throw new Error('Failed to retrieve API key')
    }
    console.log('[Edge] API key decrypted successfully, length:', apiKey.length)

    // Generate HTML based on provider
    let generatedHtml: string

    switch (keyConfig.provider) {
      case 'anthropic':
        generatedHtml = await generateWithAnthropic(apiKey, modelToUse, body)
        break
      case 'openai':
        generatedHtml = await generateWithOpenAI(apiKey, modelToUse, body)
        break
      case 'google':
        generatedHtml = await generateWithGoogle(apiKey, modelToUse, body)
        break
      default:
        throw new Error(`Unsupported provider: ${keyConfig.provider}`)
    }

    console.log('[Edge] Generation complete, HTML length:', generatedHtml.length)
    console.log('[Edge] ========================================')

    return new Response(
      JSON.stringify({ success: true, html: generatedHtml }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[Edge] Error:', error.message)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
